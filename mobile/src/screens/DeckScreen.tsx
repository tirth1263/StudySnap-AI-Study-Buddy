import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { deleteDeck, getDeck } from "../lib/api";
import { isDue } from "../lib/schedule";
import type { Card, Deck, Route } from "../lib/types";
import { Quiz } from "../components/Quiz";
import { StudySession } from "../components/StudySession";
import { Body, Button, colors, Eyebrow, Loading, Panel, Title } from "../ui";

type Tab = "summary" | "cards" | "quiz";
const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "cards", label: "Cards" },
  { id: "quiz", label: "Quiz" },
];

function statusLabel(card: Card): string {
  if (card.dueAt === null) return "New";
  if (isDue(card.dueAt)) return "Due";
  const days = Math.max(1, Math.ceil((new Date(card.dueAt).getTime() - Date.now()) / 86_400_000));
  return `In ${days}d`;
}

export function DeckScreen({ id, go }: { id: string; go: (route: Route) => void }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [tab, setTab] = useState<Tab>("summary");
  const [studying, setStudying] = useState(false);

  useEffect(() => {
    getDeck(id)
      .then((res) => {
        if (!res) return setState("missing");
        setDeck(res.deck);
        setCards(res.cards);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  if (state === "loading") return <Loading label="Loading deck…" />;
  if (state === "missing" || !deck) {
    return (
      <View style={s.container}>
        <Title style={{ fontSize: 22 }}>We couldn&apos;t find that deck</Title>
        <Button label="Back to my decks" onPress={() => go({ name: "decks" })} style={{ marginTop: 16 }} />
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert("Delete this deck?", "Its flashcards and review history will be removed.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDeck(id);
          go({ name: "decks" });
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text accessibilityRole="button" onPress={() => go({ name: "decks" })} style={s.back}>
        ← My decks
      </Text>
      <Title>{deck.title}</Title>
      <Body soft style={{ fontSize: 14, marginTop: 4 }}>
        {cards.length} cards · {deck.quiz.length} quiz questions
      </Body>

      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            onPress={() => {
              setTab(t.id);
              setStudying(false);
            }}
            style={[s.tab, tab === t.id && s.tabActive]}
          >
            <Text style={[s.tabText, tab === t.id && { color: colors.paper }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "summary" && (
        <>
          <Panel>
            <Eyebrow>In short</Eyebrow>
            <Body style={{ marginTop: 8 }}>{deck.summary}</Body>
          </Panel>
          {deck.keyPoints.length > 0 && (
            <Panel style={{ marginTop: 12 }}>
              <Eyebrow>Key points</Eyebrow>
              {deck.keyPoints.map((p, i) => (
                <Body key={i} style={{ marginTop: 10 }}>
                  • {p}
                </Body>
              ))}
            </Panel>
          )}
          <Button label="Study the flashcards" onPress={() => setTab("cards")} style={{ marginTop: 16 }} />
          <Button label="Delete deck" variant="ghost" onPress={confirmDelete} style={{ marginTop: 10 }} />
        </>
      )}

      {tab === "cards" &&
        (studying ? (
          <StudySession
            cards={cards}
            onReviewed={(updated) => setCards((cs) => cs.map((c) => (c.id === updated.id ? updated : c)))}
            onFinished={() => setStudying(false)}
            finishLabel="Back to card list"
          />
        ) : (
          <>
            <Button label={`Study all ${cards.length} cards`} onPress={() => setStudying(true)} />
            {cards.map((c) => (
              <Panel key={c.id} style={{ marginTop: 12 }}>
                <View style={s.cardRow}>
                  <Body style={{ fontWeight: "600", flex: 1 }}>{c.front}</Body>
                  <Text style={s.status}>{statusLabel(c)}</Text>
                </View>
                <Body soft style={{ marginTop: 6 }}>
                  {c.back}
                </Body>
              </Panel>
            ))}
          </>
        ))}

      {tab === "quiz" && <Quiz questions={deck.quiz} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  back: { fontWeight: "600", color: colors.inkSoft, marginBottom: 10, paddingVertical: 4 },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginVertical: 16,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: "center" },
  tabActive: { backgroundColor: colors.ink },
  tabText: { fontWeight: "700", color: colors.inkSoft },
  cardRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  status: { fontSize: 12, fontWeight: "700", color: colors.inkSoft },
});
