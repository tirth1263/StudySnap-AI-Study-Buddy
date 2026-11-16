/**
 * generate-deck: the only place the AI key exists.
 *
 * The app uploads a PDF/photo to Storage, then calls this function with the
 * file's path. The function:
 *   1. checks who is calling (their login token)
 *   2. enforces the weekly upload limit for free accounts
 *   3. downloads the file and sends it to Claude, asking for structured JSON
 *   4. saves the deck + cards under that user and returns the new deck id
 *
 * Secrets (set with `supabase secrets set`):
 *   ANTHROPIC_API_KEY   required
 *   ANTHROPIC_MODEL     optional, defaults to claude-opus-5-5
 * SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */
import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { z } from "npm:zod";

const FREE_UPLOADS_PER_WEEK = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-5-5";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// The shape we ask the model for. Structured outputs guarantee the reply
// matches this schema, so the code below never has to guess at the format.
const DeckSchema = z.object({
  title: z.string().describe("A short, specific title for these notes (max 60 characters)."),
  summary: z.string().describe("A 3-5 sentence plain-language summary of the material."),
  key_points: z.array(z.string()).describe("4-6 of the most important takeaways, one sentence each."),
  cards: z
    .array(
      z.object({
        front: z.string().describe("A question or prompt that tests one idea."),
        back: z.string().describe("The answer, in one or two sentences."),
      }),
    )
    .describe("Between 10 and 20 flashcards covering the material."),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).describe("Exactly 4 answer choices."),
        correct_index: z.number().describe("Index (0-3) of the correct option."),
        explanation: z.string().describe("One sentence explaining why the answer is correct."),
      }),
    )
    .describe("Exactly 10 multiple-choice questions."),
});

const SYSTEM_PROMPT = `You turn a student's study material into a study kit for StudySnap, a flashcard app used by high school and college students.

The student uploads lecture slides, a textbook chapter or a photo of handwritten notes. From it, produce a summary, flashcards and a quiz that help them actually learn the material for an exam.

What makes a good study kit:
- Everything is grounded in the uploaded material. Use the facts, terms and examples that appear there, because the student will be examined on their course's version of the topic.
- Each flashcard tests a single idea, with a question specific enough to have one clear answer. Favor understanding ("Why does X cause Y?") alongside definitions.
- Aim for 15 flashcards; use fewer (minimum 10) for short material and up to 20 for dense material.
- The quiz has exactly 10 multiple-choice questions with 4 options each. Wrong options should be plausible to someone who half-knows the topic. Vary the position of the correct answer.
- Write in the same language as the material.
- If handwriting or a scan is partly unreadable, work from what you can read rather than inventing content.

If the upload contains no study material at all (for example a blank page or an unrelated photo), return an empty cards array and explain what you saw in the summary field.`;

type ContentBlock = Anthropic.ContentBlockParam;

function sourceBlock(mime: string, bytes: Uint8Array): ContentBlock | null {
  if (mime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: encodeBase64(bytes) },
    };
  }
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) {
    return {
      type: "image",
      source: { type: "base64", media_type: mime as ImageType, data: encodeBase64(bytes) },
    };
  }
  if (mime.startsWith("text/")) {
    return { type: "text", text: `<notes>\n${new TextDecoder().decode(bytes)}\n</notes>` };
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // 1. Who is calling?
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return json({ error: "Please sign in again." }, 401);

    const body = await req.json().catch(() => null);
    const path = typeof body?.path === "string" ? body.path : "";
    const requestedTitle = typeof body?.title === "string" ? body.title.trim().slice(0, 80) : "";
    // Users may only process files in their own folder.
    if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
      return json({ error: "Invalid file path." }, 400);
    }

    // The service-role client bypasses Row Level Security. It never leaves this function.
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 2. Weekly limit (protects against runaway AI bills).
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    if (profile?.plan !== "pro") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await admin
        .from("uploads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if (countError) throw countError;
      if ((count ?? 0) >= FREE_UPLOADS_PER_WEEK) {
        return json({ error: "Weekly upload limit reached.", code: "limit_reached" }, 429);
      }
    }

    // 3. Read the file and hand it to the model.
    const { data: file, error: downloadError } = await admin.storage.from("uploads").download(path);
    if (downloadError || !file) return json({ error: "We couldn't find the uploaded file." }, 404);
    if (file.size > MAX_FILE_BYTES) return json({ error: "That file is larger than 10 MB." }, 413);

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXT[ext] ?? file.type;
    const block = sourceBlock(mime, new Uint8Array(await file.arrayBuffer()));
    if (!block) return json({ error: "Unsupported file type. Use a PDF, JPG, PNG or WebP." }, 415);
    const sourceType = mime === "application/pdf" ? "pdf" : mime.startsWith("image/") ? "image" : "text";

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            block,
            {
              type: "text",
              text: `Create the study kit for this material.${requestedTitle ? ` The student named it "${requestedTitle}".` : ""}`,
            },
          ],
        },
      ],
      output_config: { effort: "low", format: zodOutputFormat(DeckSchema) },
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI declined to process this file. Try different study material." }, 422);
    }
    const deck = response.parsed_output;
    if (response.stop_reason === "max_tokens" || !deck) {
      return json({ error: "The AI's answer was cut off. Try a shorter document." }, 502);
    }

    // The schema guarantees the shape; these checks cover what a schema can't express.
    const cards = deck.cards.filter((c) => c.front.trim() && c.back.trim()).slice(0, 20);
    const quiz = deck.quiz
      .filter((q) => q.options.length === 4 && Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < 4)
      .slice(0, 10)
      .map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation,
      }));
    if (cards.length === 0) {
      return json({ error: deck.summary || "We couldn't find any study material in that upload." }, 422);
    }

    // 4. Save under this user.
    const { data: inserted, error: deckError } = await admin
      .from("decks")
      .insert({
        user_id: user.id,
        title: requestedTitle || deck.title.slice(0, 80),
        summary: deck.summary,
        key_points: deck.key_points,
        quiz,
        source_type: sourceType,
        source_path: path,
      })
      .select("id")
      .single();
    if (deckError) throw deckError;

    const { error: cardsError } = await admin.from("cards").insert(
      cards.map((c, i) => ({
        deck_id: inserted.id,
        user_id: user.id,
        front: c.front,
        back: c.back,
        position: i,
      })),
    );
    if (cardsError) {
      await admin.from("decks").delete().eq("id", inserted.id);
      throw cardsError;
    }

    // Only successful generations count against the weekly limit.
    await admin.from("uploads").insert({ user_id: user.id });

    return json({ deckId: inserted.id });
  } catch (error) {
    console.error("generate-deck failed:", error);
    if (error instanceof Anthropic.AuthenticationError) {
      return json({ error: "The server's AI key is missing or invalid." }, 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: "The AI service is busy. Please try again in a minute." }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      return json({ error: "The AI couldn't read this file. Try a clearer photo or a smaller PDF." }, 422);
    }
    if (error instanceof Anthropic.APIError) {
      return json({ error: "The AI service had a problem. Please try again." }, 502);
    }
    return json({ error: "Something went wrong while building your deck." }, 500);
  }
});
