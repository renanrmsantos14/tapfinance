import { useEffect, useRef } from "react";
import { TextInput, StyleSheet } from "react-native";
import { formatInputCents, parseCurrencyToCents } from "../utils/currency";
import { useAppColors } from "../theme";

export function CurrencyInput({ value, onChange, autoFocus = false }: { value: number; onChange: (cents: number) => void; autoFocus?: boolean }) {
  const colors = useAppColors();
  const ref = useRef<TextInput>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <TextInput
      ref={ref}
      accessibilityLabel="Valor"
      autoFocus={autoFocus}
      keyboardType="number-pad"
      value={formatInputCents(value)}
      onChangeText={(text) => {
        const parsed = parseCurrencyToCents(text.replace(/\D/g, ""));
        onChange(parsed ?? 0);
      }}
      selectTextOnFocus={false}
      textAlign="center"
      style={[styles.input, { color: colors.text }]}
      maxLength={18}
      returnKeyType="done"
    />
  );
}

const styles = StyleSheet.create({ input: { fontSize: 42, fontWeight: "700", letterSpacing: -1.5, paddingVertical: 8 } });
