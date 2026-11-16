"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isDemo = store.mode === "demo";

  useEffect(() => {
    if (!loading && user) router.replace("/decks");
  }, [loading, user, router]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await store.signUp(email, password);
        if (needsEmailConfirmation) setNotice("Check your inbox and confirm your email, then log in.");
      } else {
        await store.signIn(email, password);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="panel">
        <h1 className="text-3xl font-semibold">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-ink-soft">
          {mode === "signup" ? "Three free uploads every week." : "Your decks are waiting."}
        </p>

        <button
          onClick={() => run(() => store.signInWithProvider())}
          disabled={busy}
          className="btn btn-ghost mt-6 w-full py-3"
        >
          {isDemo ? "Try it instantly as a guest" : "Continue with Google"}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
          <span className="h-px flex-1 bg-line" />
          or use email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@university.edu"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="At least 6 characters"
            />
          </label>
          <div aria-live="polite">
            {error && <p className="text-sm text-bad">{error}</p>}
            {notice && <p className="text-sm text-good">{notice}</p>}
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary py-3">
            {busy ? "One moment…" : mode === "signup" ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          {mode === "signup" ? "Already have an account?" : "New to StudySnap?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
              setNotice(null);
            }}
            className="cursor-pointer font-semibold text-ink underline"
          >
            {mode === "signup" ? "Log in" : "Create an account"}
          </button>
        </p>
        {isDemo && (
          <p className="mt-4 rounded-xl bg-paper-deep p-3 text-xs text-ink-soft">
            Demo mode: accounts are stored only in this browser, so use any email and a throwaway password.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
