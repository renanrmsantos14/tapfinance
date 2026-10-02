import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Check, Clock3 } from "lucide-react-native";
import { radius, type, useAppColors } from "../theme";
import type { TransactionType } from "../types/category";
import type { Transaction } from "../types/transaction";

export function TransactionStatusSelector({ type: transactionType, status, onChange, disabled = false }: { type: TransactionType; status: Transaction["status"]; onChange: (status: Transaction["status"]) => void; disabled?: boolean }) {
  const colors = useAppColors();
  return <View style={styles.root}><View style={styles.row}>{(["paid", "pending"] as const).map((value) => {
    const selected = status === value;
    const label = value === "pending" ? transactionType === "income" ? "A receber" : "A pagar" : transactionType === "income" ? "Recebido" : "Pago";
    const Icon = value === "pending" ? Clock3 : Check;
    return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected, disabled }} accessibilityLabel={`Situação: ${label}`} disabled={disabled} onPress={() => onChange(value)}
      style={({ pressed }) => [styles.option, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2 : 1, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
      <Icon color={selected ? colors.accentText : colors.text} size={18} strokeWidth={2.6} />
      <Text style={[selected ? type.bodyStrong : type.body, { color: selected ? colors.accentText : colors.text }]}>{label}</Text>
    </Pressable>;
  })}</View><Text style={[type.meta, { color: colors.textMuted, paddingHorizontal: 4 }]}>{status === "pending" ? "Pendente: não altera o saldo até você marcar como pago ou recebido." : "Confirmado: este valor entra no saldo da conta."}</Text></View>;
}

const styles = StyleSheet.create({ root: { gap: 8 }, row: { flexDirection: "row", gap: 8 }, option: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.md, paddingHorizontal: 10 } });
