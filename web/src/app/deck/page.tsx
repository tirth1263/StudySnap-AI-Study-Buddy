"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/lib/auth";
import { isDue } from "@/lib/schedule";
import { store } from "@/lib/store";
import type { Card, Deck } from "@/lib/types";
import { Quiz } from "@/components/Quiz";
import { StudySession } from "@/components/StudySession";

type Tab = "summary" | "cards" | "quiz";
const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "cards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
];

function cardStatus(card: Card): { label: string; tone: string } {
  if (card.dueAt === null) return { label: "New", tone: "bg-paper-deep text-ink-soft" };
  if (isDue(card.dueAt)) return { label: "Due", tone: "bg-marker text-ink" };
  const days = Math.max(1, Math.ceil((new Date(card.dueAt).getTime() - Date.now()) / 86_400_000));
  return { label: `In ${days}d`, tone: "bg-good-soft text-good" };
}

function DeckView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loadState, setState] = useState<"loading" | "ready" | "missing">("loading");
  const state = id ? loadState : "missing";
  const [tab, setTab] = useState<Tab>("summary");
  const [studying, setStudying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    store
      .getDeck(id)
      .then((res) => {
        if (!res) return setState("missing");
        setDeck(res.deck);
        setCards(res.cards);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  if (state === "loading") return <p className="px-4 py-16 text-center text-ink-soft">Loading deck…</p>;
  if (state === "missing" || !deck) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">We couldn&apos;t find that deck</h1>
        <Link href="/decks" className="btn btn-primary mt-5">
          Back to my decks
        </Link>
      </div>
    );
  }

  async function remove() {
    await store.deleteDeck(deck!.id);
    router.push("/decks");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/decks" className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← My decks
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">{deck.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {cards.length} cards · {deck.quiz.length} quiz questions · added{" "}
            {new Date(deck.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </p>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Delete this deck?</span>
            <button onClick={remove} className="btn border-bad bg-bad-soft px-4 py-1.5 text-bad">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost px-4 py-1.5">
              Keep
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="btn btn-ghost px-4 py-1.5">
            Delete deck
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Deck sections" className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setStudying(false);
            }}
            className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 font-semibold ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "summary" && (
          <div className="grid gap-4">
            <section className="panel">
              <p className="eyebrow">In short</p>
              <p className="mt-3 text-lg leading-relaxed">{deck.summary}</p>
            </section>
            {deck.keyPoints.length > 0 && (
              <section className="panel">
                <p className="eyebrow">Key points</p>
                <ul className="mt-3 grid gap-3">
                  {deck.keyPoints.map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-marker ring-1 ring-ink" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <button onClick={() => setTab("cards")} className="btn btn-primary w-fit">
              Study the flashcards
            </button>
          </div>
        )}

        {tab === "cards" &&
          (studying ? (
            <StudySession
              cards={cards}
              onReviewed={(updated) => setCards((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))}
              onFinished={() => setStudying(false)}
              finishLabel="Back to card list"
            />
          ) : (
            <div>
              <button onClick={() => setStudying(true)} className="btn btn-primary">
                Study all {cards.length} cards
              </button>
              <ul className="mt-5 grid gap-3">
                {cards.map((c) => {
                  const s = cardStatus(c);
                  return (
                    <li key={c.id} className="panel grid gap-2 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:gap-6">
                      <p className="font-medium">{c.front}</p>
                      <p className="text-ink-soft">{c.back}</p>
                      <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        {tab === "quiz" && <Quiz questions={deck.quiz} />}
      </div>
    </div>
  );
}

export default function DeckPage() {
  return (
    <RequireAuth>
      <Suspense>
        <DeckView />
      </Suspense>
    </RequireAuth>
  );
}
