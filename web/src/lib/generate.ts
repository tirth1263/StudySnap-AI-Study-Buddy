/**
 * On-device study material generator used in demo mode (no AI key required).
 *
 * It is deliberately simple: score sentences by how many of the document's
 * frequent words they contain, then turn the best ones into a summary,
 * definition cards, fill-in-the-blank cards and multiple-choice questions.
 * With Supabase connected, the `generate-deck` Edge Function replaces all of this
 * with a real AI model.
 */
import type { GeneratedDeck, QuizQuestion } from "./types";

const STOP = new Set(
  `a about above after again all also although always am an and any are as at be because been before being below between both but by can could did do does doing down during each either else ever every few for from further had has have having he her here hers him his how however i if in into is it its itself just less like made many may me might more most much must my no nor not now of off often on once one only or other our out over own per same she should since so some such than that the their them then there these they this those though through thus to too two under until up upon use used uses using very was we were what when where which while who whom why will with within without would you your called known example examples including include includes form forms make makes takes take place occurs occur first second third new also well way ways part parts different several various number important`.split(
    /\s+/,
  ),
);

const PRONOUN_START = /^(it|this|that|these|those|they|there|he|she|we|you|i|here|what|which|who|one|each|some|many|most|all)\b/i;

function clean(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/-\n(?=[a-z])/g, "")
    .trim();
}

function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const block of text.split(/\n+/)) {
    const line = block.replace(/^[\s•\-*–\d.)]+(?=\S)/, "").trim();
    if (!line) continue;
    // A short line with no closing punctuation is a heading or label, not a fact.
    if (!/[.!?]["”)]?$/.test(line) && line.split(/\s+/).length < 14) continue;
    for (const s of line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)) {
      const t = s.trim();
      const words = t.split(/\s+/).length;
      if (t.length >= 30 && t.length <= 320 && words >= 6) out.push(t);
    }
  }
  return [...new Set(out)];
}

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((w) => !STOP.has(w));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function endWithPeriod(s: string): string {
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Definition {
  term: string;
  /** "the ", "a " or "" - kept so questions read naturally. */
  article: string;
  verb: string;
  sentence: string;
}

function findDefinition(sentence: string): Definition | null {
  const m = sentence.match(
    /^((?:An?|The)\s+)?([A-Za-z][\w'’-]*(?:\s+[\w'’-]+){0,4}?)\s+(is|are|refers to|means|is defined as|describes)\s+(.{20,})$/,
  );
  if (!m) return null;
  const term = m[2].trim();
  if (PRONOUN_START.test(term) || /\band\b/i.test(term) || tokens(term).length === 0) return null;
  return { term, article: (m[1] ?? "").toLowerCase(), verb: m[3], sentence };
}

export function generateFromText(rawText: string, fallbackTitle: string): GeneratedDeck {
  const text = clean(rawText);
  const sents = splitSentences(text);
  if (sents.length < 4) {
    throw new Error(
      "There isn't enough readable text here to build a deck. Try a longer document or a clearer photo.",
    );
  }

  // Word frequencies across the whole document.
  const freq = new Map<string, number>();
  for (const s of sents) for (const w of tokens(s)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const keywords = [...freq.entries()]
    .filter(([w]) => w.length >= 4)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([w]) => w);

  const score = (s: string) => {
    const uniq = [...new Set(tokens(s))];
    if (uniq.length === 0) return 0;
    return uniq.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.pow(uniq.length, 0.6);
  };
  const ranked = sents.map((s, i) => ({ s, i, score: score(s) })).sort((a, b) => b.score - a.score);

  // Summary: the strongest sentences, back in reading order.
  const summaryCount = Math.min(4, Math.max(2, Math.round(sents.length / 6)));
  const summary = ranked
    .slice(0, summaryCount)
    .sort((a, b) => a.i - b.i)
    .map((x) => endWithPeriod(x.s))
    .join(" ");
  const keyPoints = ranked
    .slice(summaryCount, summaryCount + 5)
    .sort((a, b) => a.i - b.i)
    .map((x) => endWithPeriod(x.s));

  // "Term: definition" lines straight from the notes.
  const cards: { front: string; back: string }[] = [];
  const usedSentences = new Set<string>();
  for (const line of text.split(/\n+/)) {
    const m = line.trim().match(/^[\s•\-*]*([A-Z][^:.]{2,40}):\s+(.{15,})$/);
    if (m && cards.length < 8 && !/\d/.test(m[1]) && m[2].trim().split(/\s+/).length >= 4) {
      cards.push({ front: `Define: ${m[1].trim()}`, back: endWithPeriod(m[2].trim()) });
    }
  }

  // Definition-style sentences: "X is ...".
  const definitions: Definition[] = [];
  for (const s of sents) {
    const d = findDefinition(s);
    if (d) definitions.push(d);
  }
  for (const d of definitions) {
    if (cards.length >= 12) break;
    const plural = d.verb === "are";
    cards.push({
      front: `What ${plural ? "are" : "is"} ${d.article}${d.term}?`,
      back: endWithPeriod(d.sentence),
    });
    usedSentences.add(d.sentence);
  }

  // Fill-in-the-blank from the remaining strong sentences.
  const cloze = (s: string): { blanked: string; answer: string } | null => {
    const candidates = [...new Set(tokens(s))]
      .filter((w) => w.length >= 4)
      .sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || b.length - a.length);
    for (const w of candidates) {
      const re = new RegExp(`\\b${w.replace(/[-']/g, "\\$&")}\\b`, "i");
      const hit = s.match(re);
      if (hit) return { blanked: s.replace(re, "_____"), answer: hit[0] };
    }
    return null;
  };

  const clozePool = ranked.filter((x) => !usedSentences.has(x.s));
  let ci = 0;
  while (cards.length < 15 && ci < clozePool.length) {
    const c = cloze(clozePool[ci].s);
    ci++;
    if (c) cards.push({ front: `Fill in the blank: ${c.blanked}`, back: capitalize(c.answer) });
  }

  // Quiz: definition-matching questions plus fill-in-the-blank multiple choice.
  const quiz: QuizQuestion[] = [];
  if (definitions.length >= 4) {
    for (const d of definitions.slice(0, 4)) {
      const rest = d.sentence.slice(d.sentence.indexOf(` ${d.verb} `) + d.verb.length + 2);
      const distractors = shuffle(definitions.filter((x) => x.term !== d.term))
        .slice(0, 3)
        .map((x) => capitalize(x.term));
      const options = shuffle([capitalize(d.term), ...distractors]);
      quiz.push({
        question: `Which term fits this description? “${endWithPeriod(rest)}”`,
        options,
        correctIndex: options.indexOf(capitalize(d.term)),
        explanation: endWithPeriod(d.sentence),
      });
    }
  }
  // Start from the end of the cloze pool used by the cards so questions feel fresh,
  // then wrap around if the document is short.
  const quizPool = [...clozePool.slice(ci), ...clozePool.slice(0, ci), ...ranked.filter((x) => usedSentences.has(x.s))];
  for (const x of quizPool) {
    if (quiz.length >= 10) break;
    const c = cloze(x.s);
    if (!c) continue;
    const answer = c.answer.toLowerCase();
    const inSentence = new Set(tokens(x.s));
    const distractors = shuffle(keywords.slice(0, 30).filter((w) => w !== answer && !inSentence.has(w))).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([answer, ...distractors]);
    quiz.push({
      question: `Complete the sentence: ${c.blanked}`,
      options,
      correctIndex: options.indexOf(answer),
      explanation: endWithPeriod(x.s),
    });
  }

  if (cards.length === 0) {
    throw new Error("Couldn't find enough key ideas in this text to make flashcards.");
  }

  return { title: fallbackTitle, summary, keyPoints, cards, quiz: shuffle(quiz) };
}
