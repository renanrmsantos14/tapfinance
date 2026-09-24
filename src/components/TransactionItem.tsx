import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react-native";
import { useAppColors } from "../theme";
import type { Transaction } from "../types/transaction";
import { formatCentsToBRL } from "../utils/currency";
import { formatShortDate, formatTime } from "../utils/dates";

export function TransactionItem({ transaction, onPress, isLast = false }: { transaction: Transaction; onPress: () => void; isLast?: boolean }) {
  const colors = useAppColors();
  const income = transaction.type === "income";
  const Icon = income ? ArrowUpRight : ArrowDownLeft;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${income ? "Receita" : "Despesa"} de ${formatCentsToBRL(transaction.amountCents)} em ${transaction.categoryName}`} accessibilityHint="Abre os detalhes do lançamento" onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={[styles.icon, { backgroundColor: income ? colors.positiveSoft : colors.negativeSoft }]}>
        <Icon color={income ? colors.positive : colors.negative} size={19} strokeWidth={2.4} />
      </View>
      <View style={styles.detail}>
        <Text style={[styles.category, { color: colors.text }]}>{transaction.title || transaction.categoryName}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {transaction.categoryName} · {transaction.accountName} · {formatShortDate(transaction.occurredAt)} · {transaction.description || formatTime(transaction.occurredAt)}{transaction.status === "pending" ? " · Pendente" : ""}
        </Text>
      </View>
      <Text style={[styles.amount, { color: income ? colors.positive : colors.text }]}>{income ? "+" : "−"}{formatCentsToBRL(transaction.amountCents)}</Text>
      <ChevronRight color={colors.textMuted} size={17} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  detail: { flex: 1, gap: 3 },
  category: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12 },
  amount: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
});
