import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useAppColors } from "../theme";

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const colors = useAppColors();
  const content = <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>;
  return scroll ? <View style={styles.flex}>{content}</View> : content;
}

export function Label({ children }: { children: ReactNode }) {
  const colors = useAppColors();
  return <Text style={[styles.label, { color: colors.textMuted }]}>{children}</Text>;
}

export function PrimaryButton({ children, style, onPress, disabled }: { children: ReactNode; onPress?: PressableProps["onPress"]; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.text, opacity: pressed ? 0.86 : 1 }, style]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.primaryButtonText, { color: colors.background }]}>{children}</Text>
    </Pressable>
  );
}

export function QuietButton({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const colors = useAppColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quietButton, { backgroundColor: pressed ? colors.surfaceMuted : "transparent" }, style]}
    >
      {children}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 22, paddingTop: 20 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 1.1, textTransform: "uppercase" },
  primaryButton: { minHeight: 52, borderRadius: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryButtonText: { fontSize: 16, fontWeight: "700" },
  quietButton: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: 6 },
});
