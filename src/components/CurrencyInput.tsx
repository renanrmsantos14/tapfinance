import { useEffect, useRef, useState } from "react";
import { TextInput, StyleSheet } from "react-native";
import { formatInputCents, parseCurrencyToCents } from "../utils/currency";
import { manrope, useAppColors } from "../theme";

export function CurrencyInput({ value, onChange, autoFocus = false, accessibilityLabel = "Valor", currency = "BRL", disabled = false, inverted = false }: { value: number; onChange: (cents: number) => void; autoFocus?: boolean; accessibilityLabel?: string; currency?: string; disabled?: boolean; inverted?: boolean }) {
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
      placeholderTextColor={inverted ? colors.inkMuted : colors.textMuted}
      textAlign={inverted ? "left" : "center"}
      style={[styles.input, inverted ? styles.inverted : styles.underlined, { color: inverted ? colors.inkText : colors.text, opacity: disabled ? 0.5 : 1, borderBottomColor: inverted ? "transparent" : focused && !disabled ? colors.accent : colors.border }]}
      maxLength={18}
      returnKeyType="done"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: "stretch",
    minWidth: 0,
    fontFamily: manrope.extrabold,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: 0,
  },
  underlined: { minHeight: 68, fontSize: 34, letterSpacing: -0.7, borderBottomWidth: 1, paddingVertical: 8 },
  inverted: { minHeight: 60, fontSize: 44, letterSpacing: -1.6, paddingVertical: 0 },
});
