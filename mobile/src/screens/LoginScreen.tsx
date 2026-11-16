import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { signIn, signInWithGoogle, signUp } from "../lib/api";
import { Body, Button, colors, ErrorText, Panel, Title } from "../ui";

export function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  function submit() {
    if (!email.trim() || password.length < 6) {
      setError("Enter your email and a password of at least 6 characters.");
      return;
    }
    run(async () => {
      if (mode === "signup") {
        const { needsEmailConfirmation } = await signUp(email.trim(), password);
        if (needsEmailConfirmation) setNotice("Check your inbox and confirm your email, then log in.");
      } else {
        await signIn(email.trim(), password);
      }
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>StudySnap</Text>
        <Body soft style={{ textAlign: "center", marginBottom: 24 }}>
          Snap your notes. Get flashcards, a summary and a quiz.
        </Body>

        <Panel>
          <Title style={{ fontSize: 24 }}>{mode === "signup" ? "Create your account" : "Welcome back"}</Title>

          <Button
            label="Continue with Google"
            variant="ghost"
            disabled={busy}
            onPress={() => run(signInWithGoogle)}
            style={{ marginTop: 16 }}
          />
          <Body soft style={{ textAlign: "center", fontSize: 13, marginVertical: 14 }}>
            or use email
          </Body>

          <Text style={s.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@university.edu"
            placeholderTextColor={colors.inkSoft}
            style={s.input}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.inkSoft}
            style={s.input}
          />

          <ErrorText>{error}</ErrorText>
          {notice ? <Text style={s.notice}>{notice}</Text> : null}

          <Button
            label={busy ? "One moment…" : mode === "signup" ? "Sign up" : "Log in"}
            disabled={busy}
            onPress={submit}
            style={{ marginTop: 16 }}
          />
          <Text
            accessibilityRole="button"
            onPress={() => {
              setMode(mode === "signup" ? "login" : "signup");
              setError(null);
              setNotice(null);
            }}
            style={s.switch}
          >
            {mode === "signup" ? "Already have an account? Log in" : "New to StudySnap? Create an account"}
          </Text>
        </Panel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logo: { fontSize: 40, fontWeight: "700", fontFamily: "serif", textAlign: "center", color: colors.ink, marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  notice: { color: colors.good, fontSize: 14, marginTop: 8 },
  switch: { textAlign: "center", marginTop: 16, fontWeight: "600", color: colors.ink, textDecorationLine: "underline" },
});
