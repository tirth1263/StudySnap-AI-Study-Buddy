"use client";

import type { Usage } from "@/lib/types";

interface Props {
  usage: Usage;
  /** Demo mode only: lets visitors flip plans to see both sides of the paywall. */
  onTogglePlan?: () => void;
}

export function UsageMeter({ usage, onTogglePlan }: Props) {
  const isPro = usage.limit === null;
  const left = isPro ? null : Math.max(0, usage.limit! - usage.used);

  return (
    <div className="panel flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
      <div className="min-w-48 flex-1">
        <p className="eyebrow">{isPro ? "Pro plan" : "Free plan"}</p>
        {isPro ? (
          <p className="mt-1 font-medium">Unlimited uploads</p>
        ) : (
          <>
            <p className="mt-1 font-medium">
              {left} of {usage.limit} uploads left this week
            </p>
            <div
              className="mt-2 flex gap-1.5"
              role="img"
              aria-label={`${usage.used} of ${usage.limit} weekly uploads used`}
            >
              {Array.from({ length: usage.limit! }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${i < usage.used ? "bg-ink" : "bg-paper-deep"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {onTogglePlan && (
        <button onClick={onTogglePlan} className="btn btn-ghost px-4 py-2">
          {isPro ? "Switch back to Free (demo)" : "Try Pro (demo)"}
        </button>
      )}
    </div>
  );
}
