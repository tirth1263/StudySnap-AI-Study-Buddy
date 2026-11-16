import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const colors = {
  paper: "#faf6ec",
  paperDeep: "#f1ead9",
  surface: "#fffdf8",
  ink: "#1c1a16",
  inkSoft: "#5f594d",
  line: "#ddd4bf",
  marker: "#ffe04a",
  markerSoft: "#fff3b0",
  good: "#1f7a4d",
  goodSoft: "#dcf1e4",
  bad: "#b9432f",
  badSoft: "#f8dfd9",
};

type Variant = "primary" | "ghost" | "marker" | "good" | "bad";

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: colors.paper, border: colors.ink },
  ghost: { bg: colors.surface, fg: colors.ink, border: colors.ink },
  marker: { bg: colors.marker, fg: colors.ink, border: colors.ink },
  good: { bg: colors.goodSoft, fg: colors.good, border: colors.good },
  bad: { bg: colors.badSoft, fg: colors.bad, border: colors.bad },
};

export function Button({
  label,
  hint,
  onPress,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.buttonLabel, { color: v.fg }]}>{label}</Text>
      {hint ? <Text style={[s.buttonHint, { color: v.fg }]}>{hint}</Text> : null}
    </Pressable>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.title, style]}>{children}</Text>;
}

export function Body({ children, soft, style }: { children: ReactNode; soft?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, soft && { color: colors.inkSoft }, style]}>{children}</Text>;
}

export function Loading({ label }: { label: string }) {
  return (
    <View style={s.loading}>
      <ActivityIndicator color={colors.ink} size="large" />
      <Text style={[s.body, { color: colors.inkSoft, marginTop: 12, textAlign: "center" }]}>{label}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <Text style={s.error}>{children}</Text> : null;
}

const s = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: { fontSize: 16, fontWeight: "700" },
  buttonHint: { fontSize: 12, marginTop: 2 },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.inkSoft,
  },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink, fontFamily: "serif" },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  error: { color: colors.bad, fontSize: 14, marginTop: 8 },
});
