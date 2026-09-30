import { useEffect, useRef } from "react";
import { TextInput, StyleSheet } from "react-native";
import { formatInputCents, parseCurrencyToCents } from "../utils/currency";
import { useAppColors } from "../theme";

export function CurrencyInput({ value, onChange, autoFocus = false, accessibilityLabel = "Valor" }: { value: number; onChange: (cents: number) => void; autoFocus?: boolean; accessibilityLabel?: string }) {
  const colors = useAppColors();
  const ref = useRef<TextInput>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <TextInput
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      keyboardType="number-pad"
      value={formatInputCents(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, "");
        if (!digits) { onChange(0); return; }
        const parsed = parseCurrencyToCents(digits);
        if (parsed !== null) onChange(parsed);
      }}
      selectTextOnFocus={false}
      placeholder="R$ 0,00"
      placeholderTextColor={colors.textMuted}
      textAlign="center"
      style={[styles.input, { color: colors.text }]}
      maxLength={18}
      returnKeyType="done"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: "stretch",
    minWidth: 0,
    minHeight: 68,
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1.7,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
});
