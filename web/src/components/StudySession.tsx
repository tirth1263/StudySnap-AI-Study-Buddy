"use client";

import { useCallback, useEffect, useState } from "react";
import { describeInterval, nextReview } from "@/lib/schedule";
import { store } from "@/lib/store";
import type { Card } from "@/lib/types";

interface Props {
  cards: (Card & { deckTitle?: string })[];
  /** Called after each answer with the updated card. */
  onReviewed?: (card: Card) => void;
  onFinished?: () => void;
  finishLabel?: string;
}

/** Flip through cards one at a time and mark each "knew it" or "didn't know". */
export function StudySession({ cards, onReviewed, onFinished, finishLabel = "Done" }: Props) {
  // Freeze the queue when the session starts so answered cards don't vanish mid-run.
  const [queue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState(0);

  const card = queue[index];
  const finished = index >= queue.length;

  const answer = useCallback(
    async (knewIt: boolean) => {
      if (!card || saving) return;
      setSaving(true);
      setError(null);
      try {
        const updated = await store.reviewCard(card, knewIt);
        onReviewed?.(updated);
        if (knewIt) setKnown((n) => n + 1);
        setFlipped(false);
        setIndex((i) => i + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that answer. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [card, saving, onReviewed],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (finished || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && e.key === "1") answer(false);
      else if (flipped && e.key === "2") answer(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, flipped, answer]);

  if (queue.length === 0) return null;

  if (finished) {
    const missed = queue.length - known;
    return (
      <div className="panel mx-auto max-w-xl text-center">
        <p className="eyebrow">Session complete</p>
        <h2 className="mt-2 text-3xl font-semibold">
          You knew {known} of {queue.length}
        </h2>
        <p className="mt-3 text-ink-soft">
          {missed > 0
            ? `${missed} ${missed === 1 ? "card comes" : "cards come"} back tomorrow in Review today. The rest are scheduled further out.`
            : "Every card is scheduled further out. Nice work."}
        </p>
        {onFinished && (
          <button onClick={onFinished} className="btn btn-primary mt-6">
            {finishLabel}
          </button>
        )}
      </div>
    );
  }

  const ifRight = nextReview(card.step, true).intervalDays;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-ink-soft">
        <span>
          Card {index + 1} of {queue.length}
          {card.deckTitle ? ` · ${card.deckTitle}` : ""}
        </span>
        <span className="hidden sm:inline">Space to flip · 1 / 2 to answer</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div className="h-full bg-ink transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show question" : "Show answer"}
        className="flip block w-full cursor-pointer text-left"
      >
        <div className={`flip-inner min-h-64 ${flipped ? "is-flipped" : ""}`}>
          <div className="flip-face panel flex min-h-64 flex-col" aria-hidden={flipped}>
            <span className="eyebrow">Question</span>
            <p className="my-auto py-4 font-display text-2xl leading-snug">{card.front}</p>
            <span className="text-sm text-ink-soft">Tap to see the answer</span>
          </div>
          <div
            className="flip-face flip-back panel flex flex-col overflow-y-auto border-ink bg-marker-soft"
            aria-hidden={!flipped}
          >
            <span className="eyebrow">Answer</span>
            <p className="my-auto py-4 text-lg leading-relaxed">{card.back}</p>
          </div>
        </div>
      </button>

      <div aria-live="polite" className="mt-5 min-h-24">
        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => answer(false)}
              disabled={saving}
              className="btn flex-col gap-0 rounded-2xl border-bad bg-bad-soft py-3 text-bad"
            >
              Didn&apos;t know
              <span className="text-xs font-normal">back tomorrow</span>
            </button>
            <button
              onClick={() => answer(true)}
              disabled={saving}
              className="btn flex-col gap-0 rounded-2xl border-good bg-good-soft py-3 text-good"
            >
              Knew it
              <span className="text-xs font-normal">back {describeInterval(ifRight)}</span>
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-ink-soft">Say the answer out loud, then flip the card.</p>
        )}
        {error && <p className="mt-3 text-center text-sm text-bad">{error}</p>}
      </div>
    </div>
  );
}
