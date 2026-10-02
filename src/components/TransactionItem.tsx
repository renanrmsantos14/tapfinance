import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { ArrowUpRight, Ellipsis } from "lucide-react-native";
import { type, useAppColors } from "../theme";
import type { Transaction } from "../types/transaction";
import { formatCentsByCurrency } from "../utils/currency";
import { formatShortDate, formatTime } from "../utils/dates";
import { categoryIcon } from "./CategorySelector";

export function TransactionItem({ transaction, onPress, isLast = false, showDate = true }: { transaction: Transaction; onPress: () => void; isLast?: boolean; showDate?: boolean }) {
  const colors = useAppColors();
  const income = transaction.type === "income";
  const Icon = income ? ArrowUpRight : categoryIcon(transaction.categoryIcon) ?? Ellipsis;
  const pending = transaction.status === "pending";
  const amount = formatCentsByCurrency(transaction.amountCents, transaction.accountCurrency);
  const meta = [showDate ? formatShortDate(transaction.occurredAt) : null, transaction.accountName, transaction.description || (showDate ? null : formatTime(transaction.occurredAt))].filter(Boolean).join(" · ");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${transaction.title ? `${transaction.title}. ` : ""}${income ? "Receita" : "Despesa"} de ${amount} em ${transaction.categoryName}, conta ${transaction.accountName}, ${formatShortDate(transaction.occurredAt)}, ${pending ? "pendente" : "pago"}`} onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: income ? colors.positiveSoft : colors.accentSoft }]}>
        <Icon color={income ? colors.positive : colors.accentText} size={18} strokeWidth={2.2} />
      </View>
      <View style={styles.detail}>
        <Text numberOfLines={1} style={[type.bodyStrong, { color: colors.text }]}>{transaction.title || transaction.description || transaction.categoryName}</Text>
        <Text numberOfLines={1} style={[type.metaStrong, { color: pending ? colors.warning : colors.accentText }]}>{transaction.categoryName}{pending ? " · Pendente" : ""}<Text style={[type.meta, { color: colors.textMuted }]}>{meta ? ` · ${meta}` : ""}</Text></Text>
      </View>
      <Text style={[type.amount, { color: income ? colors.positive : colors.text }]}>{income ? "+ " : "− "}{amount.replace("R$ ", "")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  detail: { flex: 1, minWidth: 0, gap: 2 },
});
