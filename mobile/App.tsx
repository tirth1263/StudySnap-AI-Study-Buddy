import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "./src/lib/supabase";
import type { Route } from "./src/lib/types";
import { DeckScreen } from "./src/screens/DeckScreen";
import { DecksScreen } from "./src/screens/DecksScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ReviewScreen } from "./src/screens/ReviewScreen";
import { UploadScreen } from "./src/screens/UploadScreen";
import { Body, colors, Loading, Panel, Title } from "./src/ui";

WebBrowser.maybeCompleteAuthSession();

function Screens() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // StudySnap has five screens, so a single piece of state is all the navigation it needs.
  const [route, setRoute] = useState<Route>({ name: "decks" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setRoute({ name: "decks" });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Android back button: go to the deck list instead of closing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (route.name === "decks") return false;
      setRoute({ name: "decks" });
      return true;
    });
    return () => sub.remove();
  }, [route]);

  if (loading) return <Loading label="Loading…" />;
  if (!session) return <LoginScreen />;

  switch (route.name) {
    case "upload":
      return <UploadScreen go={setRoute} />;
    case "review":
      return <ReviewScreen go={setRoute} />;
    case "deck":
      return <DeckScreen key={route.id} id={route.id} go={setRoute} />;
    default:
      return <DecksScreen go={setRoute} />;
  }
}

function SetupNeeded() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Panel>
        <Title style={{ fontSize: 24 }}>Connect Supabase</Title>
        <Body soft style={{ marginTop: 8 }}>
          Copy mobile/.env.example to mobile/.env, add your Supabase project URL and anon key, then restart
          Expo. The README walks through it step by step.
        </Body>
      </Panel>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        {isConfigured ? <Screens /> : <SetupNeeded />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
});
