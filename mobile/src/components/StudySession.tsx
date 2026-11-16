import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { reviewCard } from "../lib/api";
import { describeInterval, nextReview } from "../lib/schedule";
import type { Card } from "../lib/types";
import { Body, Button, colors, ErrorText, Eyebrow, Panel, Title } from "../ui";

interface Props {
  cards: Card[];
  onReviewed?: (card: Card) => void;
  onFinished: () => void;
  finishLabel: string;
}

/** Flip through cards one at a time and mark each "knew it" or "didn't know". */
export function StudySession({ cards, onReviewed, onFinished, finishLabel }: Props) {
  const [queue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [known, setKnown] = useState(0);

  if (index >= queue.length) {
    const missed = queue.length - known;
    return (
      <Panel style={{ alignItems: "center" }}>
        <Eyebrow>Session complete</Eyebrow>
        <Title style={{ marginTop: 8, textAlign: "center" }}>
          You knew {known} of {queue.length}
        </Title>
        <Body soft style={{ marginTop: 8, textAlign: "center" }}>
          {missed > 0
            ? `${missed} ${missed === 1 ? "card comes" : "cards come"} back tomorrow in Review today.`
            : "Every card is scheduled further out. Nice work."}
        </Body>
        <Button label={finishLabel} onPress={onFinished} style={{ marginTop: 18, alignSelf: "stretch" }} />
      </Panel>
    );
  }

  const card = queue[index];
  const ifRight = nextReview(card.step, true).intervalDays;

  async function answer(knewIt: boolean) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await reviewCard(card, knewIt);
      onReviewed?.(updated);
      if (knewIt) setKnown((n) => n + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that answer. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Body soft style={{ fontSize: 14 }}>
        Card {index + 1} of {queue.length}
        {card.deckTitle ? ` · ${card.deckTitle}` : ""}
      </Body>
      <View style={s.track}>
        <View style={[s.fill, { width: `${(index / queue.length) * 100}%` }]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? "Show question" : "Show answer"}
        onPress={() => setFlipped((f) => !f)}
        style={[s.card, flipped && s.cardBack]}
      >
        <Eyebrow>{flipped ? "Answer" : "Question"}</Eyebrow>
        <Text style={flipped ? s.answer : s.question}>{flipped ? card.back : card.front}</Text>
        {!flipped && <Body soft style={{ fontSize: 14 }}>Tap to see the answer</Body>}
      </Pressable>

      {flipped ? (
        <View style={s.row}>
          <Button
            label="Didn't know"
            hint="back tomorrow"
            variant="bad"
            disabled={saving}
            onPress={() => answer(false)}
            style={s.choice}
          />
          <Button
            label="Knew it"
            hint={`back ${describeInterval(ifRight)}`}
            variant="good"
            disabled={saving}
            onPress={() => answer(true)}
            style={s.choice}
          />
        </View>
      ) : (
        <Body soft style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
          Say the answer out loud, then flip the card.
        </Body>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.paperDeep, marginVertical: 10, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.ink },
  card: {
    minHeight: 260,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    justifyContent: "space-between",
  },
  cardBack: { backgroundColor: colors.markerSoft, borderColor: colors.ink },
  question: { fontSize: 24, lineHeight: 31, fontWeight: "600", color: colors.ink, fontFamily: "serif", marginVertical: 16 },
  answer: { fontSize: 18, lineHeight: 27, color: colors.ink, marginVertical: 16, flex: 1 },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  choice: { flex: 1, borderRadius: 16 },
});
