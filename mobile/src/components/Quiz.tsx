import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { QuizQuestion } from "../lib/types";
import { Body, Button, colors, Eyebrow, Panel, Title } from "../ui";

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return (
      <Panel>
        <Body soft>These notes were too short to build a quiz.</Body>
      </Panel>
    );
  }

  if (index >= questions.length) {
    return (
      <Panel style={{ alignItems: "center" }}>
        <Eyebrow>Quiz complete</Eyebrow>
        <Title style={{ fontSize: 44, marginTop: 8 }}>
          {score}/{questions.length}
        </Title>
        <Body soft style={{ textAlign: "center", marginTop: 8 }}>
          {score / questions.length >= 0.8
            ? "You've got this material down."
            : "A round of flashcards will close the gaps."}
        </Body>
        <Button
          label="Retake quiz"
          onPress={() => {
            setIndex(0);
            setPicked(null);
            setScore(0);
          }}
          style={{ marginTop: 18, alignSelf: "stretch" }}
        />
      </Panel>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  function choose(i: number) {
    if (answered) return;
    setPicked(i);
    if (i === q.correctIndex) setScore((n) => n + 1);
  }

  return (
    <View>
      <Body soft style={{ fontSize: 14, marginBottom: 10 }}>
        Question {index + 1} of {questions.length} · Score {score}
      </Body>
      <Panel>
        <Text style={s.question}>{q.question}</Text>
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const tone =
            answered && isCorrect
              ? { backgroundColor: colors.goodSoft, borderColor: colors.good }
              : answered && i === picked
                ? { backgroundColor: colors.badSoft, borderColor: colors.bad }
                : { backgroundColor: colors.surface, borderColor: colors.line, opacity: answered ? 0.6 : 1 };
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: i === picked, disabled: answered }}
              disabled={answered}
              onPress={() => choose(i)}
              style={[s.option, tone]}
            >
              <Text style={s.letter}>{String.fromCharCode(65 + i)}</Text>
              <Text style={s.optionText}>{opt}</Text>
              {answered && isCorrect && <Text style={[s.tag, { color: colors.good }]}>Correct</Text>}
              {answered && i === picked && !isCorrect && <Text style={[s.tag, { color: colors.bad }]}>Yours</Text>}
            </Pressable>
          );
        })}
        {answered && (
          <View style={{ marginTop: 14 }}>
            {q.explanation ? <Body soft style={{ fontSize: 14, marginBottom: 12 }}>{q.explanation}</Body> : null}
            <Button
              label={index + 1 === questions.length ? "See score" : "Next question"}
              onPress={() => {
                setPicked(null);
                setIndex((i) => i + 1);
              }}
            />
          </View>
        )}
      </Panel>
    </View>
  );
}

const s = StyleSheet.create({
  question: { fontSize: 19, lineHeight: 26, fontWeight: "700", color: colors.ink, marginBottom: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  letter: { fontWeight: "800", color: colors.ink, width: 18 },
  optionText: { flex: 1, fontSize: 16, color: colors.ink },
  tag: { fontSize: 13, fontWeight: "700" },
});
