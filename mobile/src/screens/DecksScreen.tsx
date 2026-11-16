import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getDueCards, getUsage, listDecks, signOut } from "../lib/api";
import type { DeckListItem, Route, Usage } from "../lib/types";
import { Body, Button, colors, ErrorText, Eyebrow, Loading, Panel, Title } from "../ui";

const SOURCE_LABEL = { pdf: "PDF", image: "Photo", text: "Text" } as const;

export function DecksScreen({ go }: { go: (route: Route) => void }) {
  const [decks, setDecks] = useState<DeckListItem[] | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDecks(), getUsage(), getDueCards()])
      .then(([d, u, due]) => {
        setDecks(d);
        setUsage(u);
        setDueCount(due.length);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your decks."));
  }, []);

  if (decks === null && !error) return <Loading label="Loading your decks…" />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.header}>
        <Title>My decks</Title>
        <Text accessibilityRole="button" onPress={() => signOut()} style={s.logout}>
          Log out
        </Text>
      </View>
      <ErrorText>{error}</ErrorText>

      <Pressable accessibilityRole="button" onPress={() => go({ name: "review" })}>
        <Panel style={[s.review, dueCount > 0 && { backgroundColor: colors.markerSoft, borderColor: colors.ink }]}>
          <View style={s.badge}>
            <Text style={s.badgeText}>{dueCount}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow>Review today</Eyebrow>
            <Body>{dueCount > 0 ? `${dueCount} ${dueCount === 1 ? "card is" : "cards are"} ready` : "Nothing due. All caught up."}</Body>
          </View>
        </Panel>
      </Pressable>

      {usage && (
        <Body soft style={{ fontSize: 14, marginTop: 10 }}>
          {usage.limit === null
            ? "Pro plan · unlimited uploads"
            : `Free plan · ${Math.max(0, usage.limit - usage.used)} of ${usage.limit} uploads left this week`}
        </Body>
      )}

      <Button label="+ New deck" onPress={() => go({ name: "upload" })} style={{ marginVertical: 16 }} />

      {decks?.length === 0 && (
        <Panel>
          <Title style={{ fontSize: 22 }}>No decks yet</Title>
          <Body soft style={{ marginTop: 6 }}>
            Upload a lecture PDF or take a photo of your notes to get your first summary, flashcards and quiz.
          </Body>
        </Panel>
      )}

      {decks?.map((d) => (
        <Pressable key={d.id} accessibilityRole="button" onPress={() => go({ name: "deck", id: d.id })}>
          <Panel style={{ marginBottom: 12 }}>
            <Eyebrow>{SOURCE_LABEL[d.sourceType]}</Eyebrow>
            <Text style={s.deckTitle}>{d.title}</Text>
            <Body soft style={{ fontSize: 14 }}>
              {d.cardCount} cards · {new Date(d.createdAt).toLocaleDateString()}
            </Body>
          </Panel>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  logout: { fontWeight: "600", color: colors.inkSoft, padding: 8 },
  review: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  badgeText: { color: colors.paper, fontSize: 18, fontWeight: "700" },
  deckTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, fontFamily: "serif", marginVertical: 6 },
});
