import { useEffect, useRef, useState } from "react";
import { TextInput, StyleSheet } from "react-native";
import { formatInputCents, parseCurrencyToCents } from "../utils/currency";
import { useAppColors } from "../theme";

export function CurrencyInput({ value, onChange, autoFocus = false, accessibilityLabel = "Valor", currency = "BRL", disabled = false }: { value: number; onChange: (cents: number) => void; autoFocus?: boolean; accessibilityLabel?: string; currency?: string; disabled?: boolean }) {
  const colors = useAppColors();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  useEffect(() => {
    if (disabled) ref.current?.blur();
  }, [disabled]);

  return (
    <TextInput
      ref={ref}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      editable={!disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoFocus={autoFocus}
      keyboardType="number-pad"
      value={formatInputCents(value, currency)}
      onChangeText={(text) => {
        if (disabled) return;
        const digits = text.replace(/\D/g, "");
        if (!digits) { onChange(0); return; }
        const parsed = parseCurrencyToCents(digits);
        if (parsed !== null) onChange(parsed);
      }}
      selectTextOnFocus={false}
      placeholder={formatInputCents(0, currency)}
      placeholderTextColor={colors.textMuted}
      textAlign="center"
      style={[styles.input, { color: colors.text, opacity: disabled ? 0.5 : 1, borderBottomColor: focused && !disabled ? colors.accent : colors.border }]}
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
    fontSize: 34,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.7,
    borderBottomWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
});
