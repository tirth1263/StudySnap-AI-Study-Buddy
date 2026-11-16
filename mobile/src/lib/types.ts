export type SourceType = "pdf" | "image" | "text";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Deck {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  quiz: QuizQuestion[];
  sourceType: SourceType;
  createdAt: string;
}

export interface DeckListItem {
  id: string;
  title: string;
  sourceType: SourceType;
  createdAt: string;
  cardCount: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  position: number;
  step: number;
  dueAt: string | null;
  lastReviewedAt: string | null;
  deckTitle?: string;
}

export interface Usage {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export class LimitReachedError extends Error {
  constructor() {
    super("You have used all of your free uploads for this week.");
    this.name = "LimitReachedError";
  }
}

/** The app's tiny navigation stack. */
export type Route =
  | { name: "decks" }
  | { name: "upload" }
  | { name: "review" }
  | { name: "deck"; id: string };
