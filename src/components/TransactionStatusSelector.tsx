import { Pressable, StyleSheet, Text, View } from "react-native";
import { Label } from "./ui";
import { radius, useAppColors } from "../theme";
import type { TransactionType } from "../types/category";
import type { Transaction } from "../types/transaction";

export function TransactionStatusSelector({ type, status, onChange, disabled = false }: { type: TransactionType; status: Transaction["status"]; onChange: (status: Transaction["status"]) => void; disabled?: boolean }) {
  const colors = useAppColors();
  return <View style={styles.root}><Label>Situação</Label><View style={styles.row}>{(["paid", "pending"] as const).map((value) => {
    const selected = status === value;
    const label = value === "pending" ? type === "income" ? "A receber" : "A pagar" : type === "income" ? "Recebido" : "Pago";
    return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected, disabled }} accessibilityLabel={`Situação: ${label}`} disabled={disabled} onPress={() => onChange(value)} style={({ pressed }) => [styles.option, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}><Text style={{ color: selected ? colors.accent : colors.textMuted, fontWeight: "700" }}>{label}</Text></Pressable>;
  })}</View><Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{status === "pending" ? "Pendente: não altera o saldo da conta até você marcar como pago ou recebido." : "Confirmado: este valor entra no saldo da conta."}</Text></View>;
}

const styles = StyleSheet.create({ root: { gap: 8, marginTop: 22 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, option: { flexGrow: 1, flexBasis: 110, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 10 } });
