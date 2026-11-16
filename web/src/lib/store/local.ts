import { FREE_UPLOADS_PER_WEEK } from "../config";
import { extractText, sourceTypeOf } from "../extract";
import { generateFromText } from "../generate";
import { isDue, nextReview } from "../schedule";
import {
  LimitReachedError,
  type Card,
  type Deck,
  type Plan,
  type SourceType,
  type User,
} from "../types";
import type { Store } from "./types";

interface StoredUser extends User {
  passHash: string;
}

interface UserData {
  plan: Plan;
  decks: Deck[];
  cards: Card[];
  reviews: { cardId: string; knewIt: boolean; reviewedAt: string }[];
  uploads: string[];
}

const USERS_KEY = "studysnap.users";
const SESSION_KEY = "studysnap.session";
const dataKey = (userId: string) => `studysnap.data.${userId}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("This browser is blocking storage, so the demo can't save your decks.");
  }
}

async function hash(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const listeners = new Set<(user: User | null) => void>();

function currentUser(): User | null {
  const id = read<string | null>(SESSION_KEY, null);
  if (!id) return null;
  const u = read<StoredUser[]>(USERS_KEY, []).find((x) => x.id === id);
  return u ? { id: u.id, email: u.email, isGuest: u.isGuest } : null;
}

function setSession(user: User | null) {
  if (user) write(SESSION_KEY, user.id);
  else localStorage.removeItem(SESSION_KEY);
  listeners.forEach((cb) => cb(user));
}

function requireUser(): User {
  const u = currentUser();
  if (!u) throw new Error("Please sign in first.");
  return u;
}

function loadData(userId: string): UserData {
  return read<UserData>(dataKey(userId), { plan: "free", decks: [], cards: [], reviews: [], uploads: [] });
}

function recentUploads(data: UserData): number {
  const cutoff = Date.now() - WEEK_MS;
  return data.uploads.filter((t) => new Date(t).getTime() > cutoff).length;
}

export const localStore: Store = {
  mode: "demo",

  async getUser() {
    return currentUser();
  },

  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  async signUp(email, password) {
    const users = read<StoredUser[]>(USERS_KEY, []);
    const normalized = email.trim().toLowerCase();
    if (users.some((u) => u.email === normalized)) {
      throw new Error("An account with this email already exists. Try logging in.");
    }
    const user: StoredUser = { id: crypto.randomUUID(), email: normalized, passHash: await hash(password) };
    write(USERS_KEY, [...users, user]);
    setSession({ id: user.id, email: user.email });
    return { needsEmailConfirmation: false };
  },

  async signIn(email, password) {
    const normalized = email.trim().toLowerCase();
    const user = read<StoredUser[]>(USERS_KEY, []).find((u) => u.email === normalized);
    if (!user || user.passHash !== (await hash(password))) {
      throw new Error("Wrong email or password.");
    }
    setSession({ id: user.id, email: user.email });
  },

  async signInWithProvider() {
    const users = read<StoredUser[]>(USERS_KEY, []);
    let guest = users.find((u) => u.isGuest);
    if (!guest) {
      guest = { id: crypto.randomUUID(), email: "guest@studysnap.demo", passHash: "", isGuest: true };
      write(USERS_KEY, [...users, guest]);
    }
    setSession({ id: guest.id, email: guest.email, isGuest: true });
  },

  async signOut() {
    setSession(null);
  },

  async listDecks() {
    const data = loadData(requireUser().id);
    return [...data.decks]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((d) => ({
        id: d.id,
        title: d.title,
        sourceType: d.sourceType,
        createdAt: d.createdAt,
        cardCount: data.cards.filter((c) => c.deckId === d.id).length,
      }));
  },

  async getDeck(id) {
    const data = loadData(requireUser().id);
    const deck = data.decks.find((d) => d.id === id);
    if (!deck) return null;
    const cards = data.cards.filter((c) => c.deckId === id).sort((a, b) => a.position - b.position);
    return { deck, cards };
  },

  async createDeck(input, onStage) {
    const user = requireUser();
    const data = loadData(user.id);
    if (data.plan === "free" && recentUploads(data) >= FREE_UPLOADS_PER_WEEK) {
      throw new LimitReachedError();
    }

    onStage("reading");
    let text = input.text ?? "";
    let sourceType: SourceType = "text";
    if (input.file) {
      sourceType = sourceTypeOf(input.file) ?? "text";
      text = await extractText(input.file);
    }

    onStage("generating");
    await pause(600); // let the progress UI breathe; generation itself is instant
    const generated = generateFromText(text, input.title);

    onStage("saving");
    const now = new Date().toISOString();
    const deck: Deck = {
      id: crypto.randomUUID(),
      title: input.title || generated.title,
      summary: generated.summary,
      keyPoints: generated.keyPoints,
      quiz: generated.quiz,
      sourceType,
      createdAt: now,
    };
    const cards: Card[] = generated.cards.map((c, i) => ({
      id: crypto.randomUUID(),
      deckId: deck.id,
      front: c.front,
      back: c.back,
      position: i,
      step: 0,
      dueAt: null,
      lastReviewedAt: null,
    }));
    // Re-read so a deck created in another tab meanwhile isn't overwritten.
    const fresh = loadData(user.id);
    write(dataKey(user.id), {
      ...fresh,
      decks: [...fresh.decks, deck],
      cards: [...fresh.cards, ...cards],
      uploads: [...fresh.uploads, now],
    });
    return deck.id;
  },

  async deleteDeck(id) {
    const user = requireUser();
    const data = loadData(user.id);
    const cardIds = new Set(data.cards.filter((c) => c.deckId === id).map((c) => c.id));
    write(dataKey(user.id), {
      ...data,
      decks: data.decks.filter((d) => d.id !== id),
      cards: data.cards.filter((c) => c.deckId !== id),
      reviews: data.reviews.filter((r) => !cardIds.has(r.cardId)),
    });
  },

  async reviewCard(card, knewIt) {
    const user = requireUser();
    const data = loadData(user.id);
    const now = new Date();
    const outcome = nextReview(card.step, knewIt, now);
    const updated: Card = { ...card, step: outcome.step, dueAt: outcome.dueAt, lastReviewedAt: now.toISOString() };
    write(dataKey(user.id), {
      ...data,
      cards: data.cards.map((c) => (c.id === card.id ? updated : c)),
      reviews: [...data.reviews, { cardId: card.id, knewIt, reviewedAt: now.toISOString() }],
    });
    return updated;
  },

  async getDueCards() {
    const data = loadData(requireUser().id);
    const titles = new Map(data.decks.map((d) => [d.id, d.title]));
    return data.cards
      .filter((c) => isDue(c.dueAt))
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
      .map((c) => ({ ...c, deckTitle: titles.get(c.deckId) ?? "Deck" }));
  },

  async getUsage() {
    const data = loadData(requireUser().id);
    return {
      plan: data.plan,
      used: recentUploads(data),
      limit: data.plan === "pro" ? null : FREE_UPLOADS_PER_WEEK,
    };
  },

  async setPlan(plan) {
    const user = requireUser();
    write(dataKey(user.id), { ...loadData(user.id), plan });
  },
};
