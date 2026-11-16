import { FunctionsHttpError } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { nextReview } from "./schedule";
import { supabase } from "./supabase";
import { LimitReachedError, type Card, type Deck, type DeckListItem, type PickedFile, type Usage } from "./types";

export const FREE_UPLOADS_PER_WEEK = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/* eslint-disable @typescript-eslint/no-explicit-any */
const toCard = (r: any): Card => ({
  id: r.id,
  deckId: r.deck_id,
  front: r.front,
  back: r.back,
  position: r.position,
  step: r.step,
  dueAt: r.due_at,
  lastReviewedAt: r.last_reviewed_at,
});

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Please sign in first.");
  return id;
}

// ---- Auth -----------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<void> {
  fail((await supabase.auth.signInWithPassword({ email, password })).error);
}

export async function signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  fail(error);
  return { needsEmailConfirmation: !data.session };
}

/** Opens Google's sign-in page in the system browser and brings the session back into the app. */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  fail(error);
  if (!data.url) throw new Error("Google sign-in isn't available right now.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return; // user closed the browser

  const fragment = result.url.split("#")[1] ?? result.url.split("?")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    throw new Error(params.get("error_description") ?? "Google sign-in didn't complete.");
  }
  fail((await supabase.auth.setSession({ access_token, refresh_token })).error);
}

export async function signOut(): Promise<void> {
  fail((await supabase.auth.signOut()).error);
}

// ---- Decks ----------------------------------------------------------------

export async function listDecks(): Promise<DeckListItem[]> {
  const { data, error } = await supabase
    .from("decks")
    .select("id, title, source_type, created_at, cards(count)")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    sourceType: r.source_type,
    createdAt: r.created_at,
    cardCount: r.cards?.[0]?.count ?? 0,
  }));
}

export async function getDeck(id: string): Promise<{ deck: Deck; cards: Card[] } | null> {
  const { data: d, error } = await supabase.from("decks").select("*").eq("id", id).maybeSingle();
  fail(error);
  if (!d) return null;
  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", id)
    .order("position");
  fail(cardsError);
  return {
    deck: {
      id: d.id,
      title: d.title,
      summary: d.summary,
      keyPoints: d.key_points ?? [],
      quiz: d.quiz ?? [],
      sourceType: d.source_type,
      createdAt: d.created_at,
    },
    cards: (cards ?? []).map(toCard),
  };
}

export async function deleteDeck(id: string): Promise<void> {
  fail((await supabase.from("decks").delete().eq("id", id)).error);
}

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * 1. Upload the PDF/photo to Supabase Storage (into this user's folder).
 * 2. Call the generate-deck Edge Function, which reads it with AI and saves the deck.
 */
export async function createDeck(
  file: PickedFile,
  title: string,
  onStage: (stage: "uploading" | "generating") => void,
): Promise<string> {
  const userId = await requireUserId();
  const ext = EXT_BY_MIME[file.mimeType];
  if (!ext) throw new Error("Unsupported file. Use a PDF or a JPG/PNG photo.");

  onStage("uploading");
  const bytes = await (await fetch(file.uri)).arrayBuffer();
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error("That file is larger than 10 MB.");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(path, bytes, { contentType: file.mimeType });
  fail(uploadError);

  onStage("generating");
  const { data, error } = await supabase.functions.invoke("generate-deck", {
    body: { path, title },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (error.context.status === 429 || body?.code === "limit_reached") throw new LimitReachedError();
      throw new Error(body?.error ?? "The AI couldn't build a deck from this file. Please try again.");
    }
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  return data.deckId as string;
}

// ---- Reviews --------------------------------------------------------------

/** Save a "knew it" / "didn't know" tap and move the card along its schedule. */
export async function reviewCard(card: Card, knewIt: boolean): Promise<Card> {
  const userId = await requireUserId();
  const now = new Date();
  const outcome = nextReview(card.step, knewIt, now);
  fail((await supabase.from("reviews").insert({ card_id: card.id, user_id: userId, knew_it: knewIt })).error);
  fail(
    (
      await supabase
        .from("cards")
        .update({ step: outcome.step, due_at: outcome.dueAt, last_reviewed_at: now.toISOString() })
        .eq("id", card.id)
    ).error,
  );
  return { ...card, step: outcome.step, dueAt: outcome.dueAt, lastReviewedAt: now.toISOString() };
}

export async function getDueCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*, decks(title)")
    .lte("due_at", new Date().toISOString())
    .order("due_at");
  fail(error);
  return (data ?? []).map((r: any) => ({ ...toCard(r), deckTitle: r.decks?.title ?? "Deck" }));
}

export async function getUsage(): Promise<Usage> {
  const userId = await requireUserId();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profile }, { count, error }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    supabase.from("uploads").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  fail(error);
  const plan = profile?.plan === "pro" ? "pro" : "free";
  return { plan, used: count ?? 0, limit: plan === "pro" ? null : FREE_UPLOADS_PER_WEEK };
}
