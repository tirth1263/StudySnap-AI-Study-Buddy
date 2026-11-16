"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import type { DeckListItem, Usage } from "@/lib/types";
import { UsageMeter } from "@/components/UsageMeter";

const SOURCE_LABEL = { pdf: "PDF", image: "Photo", text: "Text" } as const;

function Decks() {
  const [decks, setDecks] = useState<DeckListItem[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([store.listDecks(), store.getUsage(), store.getDueCards()])
      .then(([d, u, due]) => {
        setDecks(d);
        setUsage(u);
        setDueCount(due.length);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your decks."));
  }, []);

  async function togglePlan() {
    if (!usage || !store.setPlan) return;
    await store.setPlan(usage.plan === "pro" ? "free" : "pro");
    setUsage(await store.getUsage());
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold">My decks</h1>
        <Link href="/upload" className="btn btn-primary">
          + New deck
        </Link>
      </div>

      {error && <p className="mt-6 text-bad">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link
          href="/review"
          className={`panel flex items-center gap-4 py-4 transition hover:border-ink ${dueCount > 0 ? "border-ink bg-marker-soft" : ""}`}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xl font-semibold text-paper">
            {dueCount}
          </span>
          <span>
            <span className="eyebrow block">Review today</span>
            <span className="font-medium">
              {dueCount > 0
                ? `${dueCount} ${dueCount === 1 ? "card is" : "cards are"} ready for review`
                : "Nothing due. You're all caught up."}
            </span>
          </span>
        </Link>
        {usage && <UsageMeter usage={usage} onTogglePlan={store.setPlan ? togglePlan : undefined} />}
      </div>

      {decks === null && !error && <p className="mt-10 text-ink-soft">Loading your decks…</p>}

      {decks?.length === 0 && (
        <div className="panel mt-8 py-12 text-center">
          <h2 className="text-2xl font-semibold">No decks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-soft">
            Upload a lecture PDF or a photo of your notes and your first summary, flashcards and quiz will appear
            here.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/upload" className="btn btn-primary">
              Upload notes
            </Link>
            <Link href="/upload?sample=1" className="btn btn-ghost">
              Try with sample notes
            </Link>
          </div>
        </div>
      )}

      {decks && decks.length > 0 && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/deck?id=${d.id}`}
                className="panel flex h-full flex-col transition hover:-translate-y-0.5 hover:border-ink"
              >
                <span className="eyebrow">{SOURCE_LABEL[d.sourceType]}</span>
                <h2 className="mt-2 text-xl leading-snug font-semibold">{d.title}</h2>
                <p className="mt-auto pt-6 text-sm text-ink-soft">
                  {d.cardCount} cards · {new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DecksPage() {
  return (
    <RequireAuth>
      <Decks />
    </RequireAuth>
  );
}
