import Link from "next/link";
import { REPO_URL } from "@/lib/config";

const STEPS = [
  {
    n: "1",
    title: "Snap or upload",
    body: "Take a photo of your handwritten notes or drop in a lecture PDF. That's the only setup.",
  },
  {
    n: "2",
    title: "Get your study kit",
    body: "StudySnap writes a short summary, 10–20 flashcards and a 10-question quiz from your own material.",
  },
  {
    n: "3",
    title: "Review what you missed",
    body: "Mark each card “knew it” or “didn't know”. Missed cards come back tomorrow, the rest space out.",
  },
];

const LADDER = [
  { label: "Didn't know", when: "Tomorrow", tone: "bg-bad-soft border-bad text-bad" },
  { label: "Knew it once", when: "3 days", tone: "bg-surface border-line" },
  { label: "Twice", when: "7 days", tone: "bg-surface border-line" },
  { label: "Three times", when: "14 days", tone: "bg-good-soft border-good text-good" },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    points: ["3 uploads every week", "Summary, flashcards and quiz", "Review today list"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "per month, or $36 a year",
    points: ["Unlimited uploads", "Everything in Free", "Built for exam season"],
    cta: "Try StudySnap",
    featured: true,
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* Hero */}
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div>
          <p className="eyebrow">AI study buddy for students</p>
          <h1 className="mt-3 text-5xl leading-[1.05] font-semibold sm:text-6xl">
            Turn your notes into <span className="highlight">flashcards</span> before the kettle boils.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Upload a lecture PDF or a photo of your notebook. StudySnap gives you a summary, a deck of flashcards
            and a quiz, then remembers what you got wrong and brings it back at the right time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?mode=signup" className="btn btn-primary px-6 py-3 text-base">
              Make my first deck
            </Link>
            <a href="#how" className="btn btn-ghost px-6 py-3 text-base">
              See how it works
            </a>
          </div>
        </div>

        {/* Illustration: notes becoming a card */}
        <div className="relative mx-auto h-80 w-full max-w-sm" aria-hidden="true">
          <div className="absolute top-2 left-2 h-64 w-52 -rotate-6 rounded-xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 h-3 w-24 rounded bg-ink/80" />
            {[90, 100, 75, 95, 60, 85, 70].map((w, i) => (
              <div key={i} className="mb-2 h-2 rounded bg-line" style={{ width: `${w}%` }} />
            ))}
            <div className="mt-3 h-2 w-3/4 rounded bg-marker" />
          </div>
          <div className="absolute right-0 bottom-0 w-64 rotate-3 rounded-2xl border border-ink bg-marker-soft p-5 shadow-[6px_6px_0_0_var(--color-ink)]">
            <p className="eyebrow">Question</p>
            <p className="mt-2 font-display text-xl leading-snug">What is the powerhouse of the cell?</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs font-semibold">
              <span className="rounded-full border border-bad bg-bad-soft py-1.5 text-bad">Didn&apos;t know</span>
              <span className="rounded-full border border-good bg-good-soft py-1.5 text-good">Knew it</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-6 py-12">
        <h2 className="text-3xl font-semibold sm:text-4xl">From messy notes to exam-ready in three steps</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="panel">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-marker font-display text-lg font-semibold">
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Spaced repetition */}
      <section className="py-12">
        <div className="panel grid gap-8 md:grid-cols-2 md:p-10">
          <div>
            <p className="eyebrow">Spaced repetition</p>
            <h2 className="mt-2 text-3xl font-semibold">It remembers what you forget</h2>
            <p className="mt-3 text-ink-soft">
              Cramming fades fast. Seeing a card again just as you&apos;re about to forget it is what makes it
              stick. StudySnap keeps the schedule for you, so each day you open one short{" "}
              <strong className="text-ink">Review today</strong> list and you&apos;re done.
            </p>
          </div>
          <ol className="grid gap-2 self-center">
            {LADDER.map((r) => (
              <li key={r.label} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${r.tone}`}>
                <span className="font-medium">{r.label}</span>
                <span className="text-sm">see it again: {r.when}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-6 py-12">
        <h2 className="text-3xl font-semibold sm:text-4xl">Student-sized pricing</h2>
        <p className="mt-2 text-ink-soft">Start free. Upgrade when exams get serious.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <div key={p.name} className={`panel flex flex-col ${p.featured ? "border-ink shadow-[6px_6px_0_0_var(--color-marker)]" : ""}`}>
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="mt-2">
                <span className="font-display text-5xl font-semibold">{p.price}</span>{" "}
                <span className="text-ink-soft">{p.period}</span>
              </p>
              <ul className="mt-5 mb-6 grid gap-2 text-ink-soft">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="text-good" aria-hidden="true">✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=signup" className={`btn mt-auto ${p.featured ? "btn-primary" : "btn-ghost"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-ink-soft">
        <span>StudySnap · built with Next.js, Expo and Supabase</span>
        <a href={REPO_URL} className="font-semibold text-ink hover:underline">
          View the code on GitHub
        </a>
      </footer>
    </div>
  );
}
