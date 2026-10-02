import { StyleSheet, TextInput, View } from "react-native";
import { Label } from "./ui";
import { manrope, radius, useAppColors } from "../theme";

export function TransactionDateTimeFields({ date, time, onDateChange, onTimeChange, disabled = false }: { date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void; disabled?: boolean }) {
  const colors = useAppColors();
  const field = { backgroundColor: colors.background, borderColor: colors.border, opacity: disabled ? 0.5 : 1 };
  return <View style={styles.row}>
    <View style={[styles.field, styles.dateField, field]}><Label>Data</Label><TextInput accessibilityLabel="Data do lançamento" accessibilityHint="Formato dia, mês e ano: DD/MM/AAAA" accessibilityState={{ disabled }} editable={!disabled} value={date} onChangeText={onDateChange} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} maxLength={10} keyboardType="number-pad" style={[styles.input, { color: colors.text }]} /></View>
    <View style={[styles.field, field]}><Label>Hora</Label><TextInput accessibilityLabel="Hora do lançamento" accessibilityHint="Formato 24 horas: HH:mm" accessibilityState={{ disabled }} editable={!disabled} value={time} onChangeText={onTimeChange} placeholder="HH:mm" placeholderTextColor={colors.textMuted} maxLength={5} keyboardType="number-pad" style={[styles.input, { color: colors.text }]} /></View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  field: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  dateField: { flex: 1.4 },
  input: { minHeight: 28, padding: 0, fontFamily: manrope.extrabold, fontSize: 15, fontVariant: ["tabular-nums"] },
});
