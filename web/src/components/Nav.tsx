"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { store } from "@/lib/store";

const LINKS = [
  { href: "/decks", label: "My decks" },
  { href: "/review", label: "Review today" },
  { href: "/upload", label: "Upload" },
];

export function Nav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await store.signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={user ? "/decks" : "/"} className="font-display text-2xl font-semibold">
          Study<span className="highlight">Snap</span>
        </Link>

        {user && (
          <ul className="order-3 flex w-full gap-1 text-sm sm:order-none sm:w-auto">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3 py-1.5 font-medium ${
                      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {loading ? null : user ? (
            <>
              <span className="hidden max-w-48 truncate text-ink-soft md:inline">
                {user.isGuest ? "Guest" : user.email}
              </span>
              <button onClick={signOut} className="btn btn-ghost px-4 py-1.5">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-semibold hover:underline">
                Log in
              </Link>
              <Link href="/login?mode=signup" className="btn btn-primary px-4 py-1.5">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
