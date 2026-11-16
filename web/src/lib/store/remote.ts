import { createClient, FunctionsHttpError, type SupabaseClient } from "@supabase/supabase-js";
import { BASE_PATH, FREE_UPLOADS_PER_WEEK, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { sourceTypeOf } from "../extract";
import { nextReview } from "../schedule";
import { LimitReachedError, type Card, type Deck, type Plan, type User } from "../types";
import type { Store } from "./types";

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

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

const toDeck = (r: any): Deck => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  keyPoints: r.key_points ?? [],
  quiz: r.quiz ?? [],
  sourceType: r.source_type,
  createdAt: r.created_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const toUser = (u: { id: string; email?: string } | null | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? "" } : null;

async function requireUserId(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Please sign in first.");
  return id;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const remoteStore: Store = {
  mode: "supabase",

  async getUser() {
    const { data } = await supabase().auth.getSession();
    return toUser(data.session?.user);
  },

  onAuthChange(cb) {
    const { data } = supabase().auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  },

  async signUp(email, password) {
    const { data, error } = await supabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}${BASE_PATH}/decks/` },
    });
    fail(error);
    return { needsEmailConfirmation: !data.session };
  },

  async signIn(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    fail(error);
  },

  async signInWithProvider() {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${BASE_PATH}/decks/` },
    });
    fail(error);
  },

  async signOut() {
    fail((await supabase().auth.signOut()).error);
  },

  async listDecks() {
    const { data, error } = await supabase()
      .from("decks")
      .select("id, title, source_type, created_at, cards(count)")
      .order("created_at", { ascending: false });
    fail(error);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      sourceType: r.source_type,
      createdAt: r.created_at,
      cardCount: (r.cards as unknown as { count: number }[])[0]?.count ?? 0,
    }));
  },

  async getDeck(id) {
    const { data: deck, error } = await supabase().from("decks").select("*").eq("id", id).maybeSingle();
    fail(error);
    if (!deck) return null;
    const { data: cards, error: cardsError } = await supabase()
      .from("cards")
      .select("*")
      .eq("deck_id", id)
      .order("position");
    fail(cardsError);
    return { deck: toDeck(deck), cards: (cards ?? []).map(toCard) };
  },

  async createDeck(input, onStage) {
    const userId = await requireUserId();

    // 1. Put the file in Supabase Storage, inside this user's own folder.
    onStage("uploading");
    const file = input.file ?? new File([input.text ?? ""], "notes.txt", { type: "text/plain" });
    const kind = sourceTypeOf(file);
    if (!kind) throw new Error("Unsupported file. Use a PDF, a photo (JPG, PNG or WebP) or a text file.");
    const ext = kind === "pdf" ? "pdf" : kind === "text" ? "txt" : (file.type.split("/")[1] ?? "jpg");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase()
      .storage.from("uploads")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    fail(uploadError);

    // 2. Ask the Edge Function to read it with AI and save the deck.
    //    The AI key lives only on the server, never in this app.
    onStage("generating");
    const { data, error } = await supabase().functions.invoke("generate-deck", {
      body: { path, title: input.title, sourceType: kind },
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (error.context.status === 429 || body?.code === "limit_reached") throw new LimitReachedError();
        throw new Error(body?.error ?? "The AI couldn't build a deck from this file. Please try again.");
      }
      throw new Error("Couldn't reach the server. Check your connection and try again.");
    }
    onStage("saving");
    return data.deckId as string;
  },

  async deleteDeck(id) {
    fail((await supabase().from("decks").delete().eq("id", id)).error);
  },

  async reviewCard(card, knewIt) {
    const userId = await requireUserId();
    const now = new Date();
    const outcome = nextReview(card.step, knewIt, now);
    const { error: reviewError } = await supabase()
      .from("reviews")
      .insert({ card_id: card.id, user_id: userId, knew_it: knewIt });
    fail(reviewError);
    const { error } = await supabase()
      .from("cards")
      .update({ step: outcome.step, due_at: outcome.dueAt, last_reviewed_at: now.toISOString() })
      .eq("id", card.id);
    fail(error);
    return { ...card, step: outcome.step, dueAt: outcome.dueAt, lastReviewedAt: now.toISOString() };
  },

  async getDueCards() {
    const { data, error } = await supabase()
      .from("cards")
      .select("*, decks(title)")
      .lte("due_at", new Date().toISOString())
      .order("due_at");
    fail(error);
    return (data ?? []).map((r) => ({
      ...toCard(r),
      deckTitle: (r.decks as { title: string } | null)?.title ?? "Deck",
    }));
  },

  async getUsage() {
    const userId = await requireUserId();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: profile }, { count, error }] = await Promise.all([
      supabase().from("profiles").select("plan").eq("id", userId).maybeSingle(),
      supabase().from("uploads").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    fail(error);
    const plan: Plan = profile?.plan === "pro" ? "pro" : "free";
    return { plan, used: count ?? 0, limit: plan === "pro" ? null : FREE_UPLOADS_PER_WEEK };
  },
};
