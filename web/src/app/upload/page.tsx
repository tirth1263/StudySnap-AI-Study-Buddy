"use client";

import { Suspense, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/lib/auth";
import { MAX_FILE_BYTES } from "@/lib/config";
import { sourceTypeOf } from "@/lib/extract";
import { SAMPLE_NOTES, SAMPLE_TITLE } from "@/lib/sample";
import { store } from "@/lib/store";
import { LimitReachedError, type GenerationStage, type Usage } from "@/lib/types";

const STAGE_TEXT: Record<GenerationStage, string> = {
  uploading: "Uploading your notes…",
  reading: "Reading your notes…",
  generating: "Writing your summary, flashcards and quiz…",
  saving: "Saving your deck…",
};

function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function Upload() {
  const router = useRouter();
  const params = useSearchParams();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  // "?sample=1" comes from the "Try with sample notes" button on the decks screen.
  const startWithSample = params.get("sample") !== null;
  const [tab, setTab] = useState<"file" | "text">(startWithSample ? "text" : "file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState(startWithSample ? SAMPLE_NOTES : "");
  const [title, setTitle] = useState(startWithSample ? SAMPLE_TITLE : "");
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<GenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    store.getUsage().then(setUsage).catch(() => {});
  }, []);

  function useSample() {
    setTab("text");
    setText(SAMPLE_NOTES);
    setTitle(SAMPLE_TITLE);
    setError(null);
  }

  function pickFile(f: File | undefined | null) {
    if (!f) return;
    setError(null);
    if (!sourceTypeOf(f)) {
      setError("That file type isn't supported. Use a PDF, a photo (JPG, PNG or WebP) or a text file.");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError("That file is larger than 10 MB. Try a smaller PDF or a lower-resolution photo.");
      return;
    }
    setFile(f);
    if (!title) setTitle(titleFromFile(f.name));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }

  const outOfUploads = usage !== null && usage.limit !== null && usage.used >= usage.limit;
  const ready = tab === "file" ? file !== null : text.trim().length >= 200;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || stage) return;
    setError(null);
    try {
      const deckTitle = title.trim() || "Untitled notes";
      const id = await store.createDeck(
        tab === "file" ? { title: deckTitle, file: file! } : { title: deckTitle, text },
        setStage,
      );
      router.push(`/deck?id=${id}`);
    } catch (err) {
      setStage(null);
      if (err instanceof LimitReachedError) setLimitHit(true);
      else setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function upgradeDemo() {
    await store.setPlan?.("pro");
    setUsage(await store.getUsage());
    setLimitHit(false);
  }

  if (limitHit || outOfUploads) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <div className="panel border-ink text-center shadow-[6px_6px_0_0_var(--color-marker)]">
          <p className="eyebrow">Weekly limit reached</p>
          <h1 className="mt-2 text-3xl font-semibold">You&apos;ve used your 3 free uploads this week</h1>
          <p className="mt-3 text-ink-soft">
            Free uploads refill 7 days after each one. Pro gives you unlimited uploads for $5 a month or $36 a
            year.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {store.setPlan ? (
              <button onClick={upgradeDemo} className="btn btn-primary">
                Unlock Pro (demo, no payment)
              </button>
            ) : (
              <span className="btn btn-ghost cursor-default">Pro checkout is coming soon</span>
            )}
            <Link href="/review" className="btn btn-ghost">
              Review my cards instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (stage) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center" role="status">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-ink" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-semibold">{STAGE_TEXT[stage]}</h1>
        <p className="mt-2 text-ink-soft">This usually takes less than a minute. Keep this tab open.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-4xl font-semibold">New deck</h1>
      <p className="mt-2 text-ink-soft">
        Add your notes and get a summary, flashcards and a quiz.{" "}
        <button onClick={useSample} className="cursor-pointer font-semibold text-ink underline">
          No notes handy? Use sample notes.
        </button>
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-5">
        <div role="tablist" aria-label="Source" className="flex w-fit gap-1 rounded-full border border-line bg-surface p-1 text-sm">
          {(["file", "text"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`cursor-pointer rounded-full px-4 py-1.5 font-semibold ${tab === t ? "bg-ink text-paper" : "text-ink-soft"}`}
            >
              {t === "file" ? "PDF or photo" : "Paste text"}
            </button>
          ))}
        </div>

        {tab === "file" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-ink bg-marker-soft" : "border-line bg-surface"}`}
          >
            {file ? (
              <>
                <p className="font-semibold break-all">{file.name}</p>
                <p className="mt-1 text-sm text-ink-soft">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button type="button" onClick={() => setFile(null)} className="mt-3 cursor-pointer text-sm font-semibold underline">
                  Choose a different file
                </button>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-semibold">Drop a PDF or photo here</p>
                <p className="mt-1 text-sm text-ink-soft">PDF, JPG, PNG or WebP · up to 10 MB</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-ghost">
                    Choose a file
                  </button>
                  <button type="button" onClick={() => cameraInput.current?.click()} className="btn btn-marker">
                    Take a photo
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <label className="grid gap-1.5 text-sm font-medium">
            Your notes
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="field font-normal"
              placeholder="Paste a chapter, lecture notes or an article (at least a couple of paragraphs)."
            />
            <span className="font-normal text-ink-soft">
              {text.trim().length < 200 ? `${200 - text.trim().length} more characters needed` : "Looks good."}
            </span>
          </label>
        )}

        <label className="grid gap-1.5 text-sm font-medium">
          Deck title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="field"
            placeholder="e.g. Biology 101: Energy in Cells"
          />
        </label>

        <div aria-live="polite">{error && <p className="text-sm text-bad">{error}</p>}</div>

        <button type="submit" disabled={!ready} className="btn btn-primary w-full py-3 text-base sm:w-fit sm:px-8">
          Create my deck
        </button>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return (
    <RequireAuth>
      <Suspense>
        <Upload />
      </Suspense>
    </RequireAuth>
  );
}
