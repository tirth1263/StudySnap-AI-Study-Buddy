export type SourceType = "pdf" | "image" | "text";
export type Plan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  isGuest?: boolean;
}

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
  /** How many times in a row the student knew this card (0 = new or just missed). */
  step: number;
  /** When the card should come back. null = never studied yet. */
  dueAt: string | null;
  lastReviewedAt: string | null;
}

export interface DueCard extends Card {
  deckTitle: string;
}

export interface Usage {
  plan: Plan;
  /** Uploads in the last 7 days. */
  used: number;
  /** null = unlimited (Pro). */
  limit: number | null;
}

/** What the AI (or the on-device demo generator) produces from a set of notes. */
export interface GeneratedDeck {
  title: string;
  summary: string;
  keyPoints: string[];
  cards: { front: string; back: string }[];
  quiz: QuizQuestion[];
}

export type GenerationStage = "uploading" | "reading" | "generating" | "saving";

export interface NewDeckInput {
  title: string;
  file?: File;
  text?: string;
}

export class LimitReachedError extends Error {
  constructor() {
    super("You have used all of your free uploads for this week.");
    this.name = "LimitReachedError";
  }
}
