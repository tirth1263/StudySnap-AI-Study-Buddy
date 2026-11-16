"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/types";

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return (
      <div className="panel text-center text-ink-soft">
        These notes were too short to build a quiz. Try a longer document.
      </div>
    );
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
  }

  if (index >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="panel mx-auto max-w-xl text-center">
        <p className="eyebrow">Quiz complete</p>
        <h2 className="mt-2 text-5xl font-semibold">
          {score}/{questions.length}
        </h2>
        <p className="mt-3 text-ink-soft">
          {pct >= 80
            ? "You've got this material down."
            : pct >= 50
              ? "Solid start. A round of flashcards will close the gaps."
              : "Worth another pass through the flashcards before you retry."}
        </p>
        <button onClick={restart} className="btn btn-primary mt-6">
          Retake quiz
        </button>
      </div>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  function choose(i: number) {
    if (answered) return;
    setPicked(i);
    if (i === q.correctIndex) setScore((s) => s + 1);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-3 text-sm text-ink-soft">
        Question {index + 1} of {questions.length} · Score {score}
      </p>
      <div className="panel">
        <h2 className="text-xl leading-snug font-semibold">{q.question}</h2>
        <ul className="mt-5 grid gap-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            let tone = "border-line bg-surface hover:border-ink";
            if (answered && isCorrect) tone = "border-good bg-good-soft";
            else if (answered && i === picked) tone = "border-bad bg-bad-soft";
            else if (answered) tone = "border-line bg-surface opacity-60";
            return (
              <li key={i}>
                <button
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${tone} ${answered ? "" : "cursor-pointer"}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                  {answered && isCorrect && <span className="ml-auto text-sm font-semibold text-good">Correct</span>}
                  {answered && i === picked && !isCorrect && (
                    <span className="ml-auto text-sm font-semibold text-bad">Your answer</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div aria-live="polite">
          {answered && (
            <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center">
              {q.explanation && <p className="text-sm text-ink-soft">{q.explanation}</p>}
              <button onClick={() => { setPicked(null); setIndex((i) => i + 1); }} className="btn btn-primary shrink-0 sm:ml-auto">
                {index + 1 === questions.length ? "See score" : "Next question"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
