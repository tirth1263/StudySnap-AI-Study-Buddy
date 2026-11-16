/**
 * Spaced repetition schedule.
 *
 *   didn't know  -> back tomorrow, ladder resets
 *   knew it      -> 3 days, then 7, then 14 (and stays at 14)
 *
 * `step` is the number of times in a row the student knew the card.
 * This file is the single place that decides "when do I see this card again?".
 */

export const WRONG_INTERVAL_DAYS = 1;
export const RIGHT_INTERVALS_DAYS = [3, 7, 14];

export interface ReviewOutcome {
  step: number;
  dueAt: string;
  intervalDays: number;
}

function startOfDayPlus(now: Date, days: number): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export function nextReview(step: number, knewIt: boolean, now: Date = new Date()): ReviewOutcome {
  if (!knewIt) {
    return {
      step: 0,
      dueAt: startOfDayPlus(now, WRONG_INTERVAL_DAYS).toISOString(),
      intervalDays: WRONG_INTERVAL_DAYS,
    };
  }
  const last = RIGHT_INTERVALS_DAYS.length - 1;
  const intervalDays = RIGHT_INTERVALS_DAYS[Math.min(Math.max(step, 0), last)];
  return {
    step: Math.min(step + 1, RIGHT_INTERVALS_DAYS.length),
    dueAt: startOfDayPlus(now, intervalDays).toISOString(),
    intervalDays,
  };
}

/** A card is due once its due date has arrived. Cards never studied are not "due". */
export function isDue(dueAt: string | null, now: Date = new Date()): boolean {
  return dueAt !== null && new Date(dueAt).getTime() <= now.getTime();
}

export function describeInterval(days: number): string {
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
