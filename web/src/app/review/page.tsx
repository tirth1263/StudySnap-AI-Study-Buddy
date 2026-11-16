"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/lib/auth";
import { store } from "@/lib/store";
import type { DueCard } from "@/lib/types";
import { StudySession } from "@/components/StudySession";

function Review() {
  const router = useRouter();
  const [due, setDue] = useState<DueCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    store
      .getDueCards()
      .then(setDue)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your review list."));
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-semibold">Review today</h1>
      <p className="mt-2 text-ink-soft">
        Cards you missed come back the next day. Cards you knew return after 3, 7 and then 14 days.
      </p>

      <div className="mt-8">
        {error && <p className="text-bad">{error}</p>}
        {due === null && !error && <p className="text-ink-soft">Loading…</p>}
        {due?.length === 0 && (
          <div className="panel py-12 text-center">
            <h2 className="text-2xl font-semibold">Nothing to review today</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              Cards show up here once they&apos;re due. Study a deck&apos;s flashcards to start the schedule.
            </p>
            <Link href="/decks" className="btn btn-primary mt-6">
              Go to my decks
            </Link>
          </div>
        )}
        {due && due.length > 0 && (
          <StudySession cards={due} onFinished={() => router.push("/decks")} finishLabel="Back to my decks" />
        )}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <RequireAuth>
      <Review />
    </RequireAuth>
  );
}
