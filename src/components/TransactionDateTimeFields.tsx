import { StyleSheet, Text, TextInput, View } from "react-native";
import { Label } from "./ui";
import { radius, useAppColors } from "../theme";

export function TransactionDateTimeFields({ date, time, onDateChange, onTimeChange, disabled = false }: { date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void; disabled?: boolean }) {
  const colors = useAppColors();
  return <View style={styles.root}><View style={styles.row}><View style={[styles.field, { flexBasis: 160 }]}><Label>Data</Label><TextInput accessibilityLabel="Data do lançamento" accessibilityHint="Formato dia, mês e ano: DD/MM/AAAA" accessibilityState={{ disabled }} editable={!disabled} value={date} onChangeText={onDateChange} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} maxLength={10} autoCorrect={false} autoCapitalize="none" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]} /></View><View style={styles.field}><Label>Hora</Label><TextInput accessibilityLabel="Hora do lançamento" accessibilityHint="Formato de 24 horas: HH:mm" accessibilityState={{ disabled }} editable={!disabled} value={time} onChangeText={onTimeChange} placeholder="HH:mm" placeholderTextColor={colors.textMuted} maxLength={5} autoCorrect={false} autoCapitalize="none" style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]} /></View></View><Text style={{ color: colors.textMuted, fontSize: 12 }}>DD/MM/AAAA · HH:mm · horário local do aparelho</Text></View>;
}

const styles = StyleSheet.create({ root: { marginTop: 22, gap: 8 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, field: { flexGrow: 1, flexBasis: 100, gap: 8 }, input: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 } });
