import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { createDeck } from "../lib/api";
import { LimitReachedError, type PickedFile, type Route } from "../lib/types";
import { Body, Button, colors, ErrorText, Eyebrow, Loading, Panel, Title } from "../ui";

const STAGE_TEXT = {
  uploading: "Uploading your notes…",
  generating: "Writing your summary, flashcards and quiz…",
};

function titleFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function UploadScreen({ go }: { go: (route: Route) => void }) {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<keyof typeof STAGE_TEXT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  function choose(picked: PickedFile) {
    setError(null);
    setFile(picked);
    if (!title) setTitle(titleFromFile(picked.name));
  }

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return;
    choose({ uri: asset.uri, name: asset.name, mimeType: "application/pdf" });
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("StudySnap needs camera access to photograph your notes. You can allow it in Settings.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return;
    choose({ uri: asset.uri, name: "Photo of notes.jpg", mimeType: asset.mimeType ?? "image/jpeg" });
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = res.assets?.[0];
    if (res.canceled || !asset) return;
    choose({ uri: asset.uri, name: asset.fileName ?? "Photo of notes.jpg", mimeType: asset.mimeType ?? "image/jpeg" });
  }

  async function submit() {
    if (!file) return;
    setError(null);
    try {
      const id = await createDeck(file, title.trim() || "Untitled notes", setStage);
      go({ name: "deck", id });
    } catch (e) {
      setStage(null);
      if (e instanceof LimitReachedError) setLimitHit(true);
      else setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  if (stage) return <Loading label={`${STAGE_TEXT[stage]}\nThis usually takes less than a minute.`} />;

  if (limitHit) {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <Panel style={{ borderColor: colors.ink }}>
          <Eyebrow>Weekly limit reached</Eyebrow>
          <Title style={{ fontSize: 24, marginTop: 8 }}>You&apos;ve used your 3 free uploads this week</Title>
          <Body soft style={{ marginTop: 8 }}>
            Free uploads refill 7 days after each one. Pro (unlimited uploads) is coming soon.
          </Body>
          <Button label="Review my cards instead" onPress={() => go({ name: "review" })} style={{ marginTop: 16 }} />
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Title>New deck</Title>
      <Body soft style={{ marginTop: 6, marginBottom: 16 }}>
        Add a lecture PDF or a photo of your notes.
      </Body>

      {file ? (
        <Panel>
          <Eyebrow>Selected</Eyebrow>
          <Body style={{ marginTop: 6, fontWeight: "600" }}>{file.name}</Body>
          <Text accessibilityRole="button" onPress={() => setFile(null)} style={s.link}>
            Choose something else
          </Text>
        </Panel>
      ) : (
        <>
          <Button label="Take a photo of my notes" variant="marker" onPress={takePhoto} />
          <Button label="Choose a photo" variant="ghost" onPress={pickPhoto} style={{ marginTop: 10 }} />
          <Button label="Upload a PDF" variant="ghost" onPress={pickPdf} style={{ marginTop: 10 }} />
        </>
      )}

      <Text style={s.label}>Deck title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        placeholder="e.g. Biology 101: Energy in Cells"
        placeholderTextColor={colors.inkSoft}
        style={s.input}
      />

      <ErrorText>{error}</ErrorText>
      <Button label="Create my deck" disabled={!file} onPress={submit} style={{ marginTop: 18 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 6, marginTop: 20 },
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
  link: { marginTop: 10, fontWeight: "600", color: colors.ink, textDecorationLine: "underline" },
});
