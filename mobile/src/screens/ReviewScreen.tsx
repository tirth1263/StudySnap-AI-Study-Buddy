import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { getDueCards } from "../lib/api";
import type { Card, Route } from "../lib/types";
import { StudySession } from "../components/StudySession";
import { Body, Button, colors, ErrorText, Loading, Panel, Title } from "../ui";

export function ReviewScreen({ go }: { go: (route: Route) => void }) {
  const [due, setDue] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDueCards()
      .then(setDue)
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your review list."));
  }, []);

  if (due === null && !error) return <Loading label="Loading your review list…" />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text accessibilityRole="button" onPress={() => go({ name: "decks" })} style={s.back}>
        ← My decks
      </Text>
      <Title>Review today</Title>
      <Body soft style={{ marginTop: 6, marginBottom: 16 }}>
        Missed cards come back the next day. Cards you knew return after 3, 7 and then 14 days.
      </Body>
      <ErrorText>{error}</ErrorText>

      {due?.length === 0 && (
        <Panel>
          <Title style={{ fontSize: 22 }}>Nothing to review today</Title>
          <Body soft style={{ marginTop: 6 }}>
            Cards show up here once they&apos;re due. Study a deck&apos;s flashcards to start the schedule.
          </Body>
          <Button label="Go to my decks" onPress={() => go({ name: "decks" })} style={{ marginTop: 16 }} />
        </Panel>
      )}
      {due && due.length > 0 && (
        <StudySession cards={due} onFinished={() => go({ name: "decks" })} finishLabel="Back to my decks" />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  back: { fontWeight: "600", color: colors.inkSoft, marginBottom: 10, paddingVertical: 4 },
});
