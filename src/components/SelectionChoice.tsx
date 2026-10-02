import { Pressable, StyleSheet, Text } from "react-native";
import { radius, useAppColors } from "../theme";

export function SelectionChoice({ label, selected, onPress, disabled = false }: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useAppColors();
  return <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.choice, {
      borderColor: selected ? colors.accent : colors.border,
      backgroundColor: pressed ? colors.surfaceMuted : selected ? colors.accentSoft : "transparent",
      opacity: disabled ? 0.5 : 1,
    }]}
  >
    <Text style={[styles.label, { color: selected ? colors.accent : colors.textMuted }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  choice: { minHeight: 48, minWidth: 48, maxWidth: "100%", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
});
