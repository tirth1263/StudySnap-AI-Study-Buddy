import type {
  Card,
  Deck,
  DeckListItem,
  DueCard,
  GenerationStage,
  NewDeckInput,
  Plan,
  Usage,
  User,
} from "../types";

/**
 * Everything the screens need from a backend. Two implementations exist:
 *  - local.ts  : demo mode, data in this browser only
 *  - remote.ts : Supabase (auth, Postgres with Row Level Security, Storage, Edge Function)
 */
export interface Store {
  mode: "demo" | "supabase";

  getUser(): Promise<User | null>;
  onAuthChange(cb: (user: User | null) => void): () => void;
  signUp(email: string, password: string): Promise<{ needsEmailConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  /** Google in Supabase mode; an instant guest account in demo mode. */
  signInWithProvider(): Promise<void>;
  signOut(): Promise<void>;

  listDecks(): Promise<DeckListItem[]>;
  getDeck(id: string): Promise<{ deck: Deck; cards: Card[] } | null>;
  createDeck(input: NewDeckInput, onStage: (s: GenerationStage) => void): Promise<string>;
  deleteDeck(id: string): Promise<void>;

  reviewCard(card: Card, knewIt: boolean): Promise<Card>;
  getDueCards(): Promise<DueCard[]>;

  getUsage(): Promise<Usage>;
  /** Demo mode only: flip between Free and Pro to try the paywall. */
  setPlan?(plan: Plan): Promise<void>;
}
