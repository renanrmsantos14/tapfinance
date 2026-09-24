import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Plus } from "lucide-react-native";
import { BottomNav } from "../../../src/components/BottomNav";
import { TransactionItem } from "../../../src/components/TransactionItem";
import { PrimaryButton, Screen } from "../../../src/components/ui";
import { listGoals, listLoans } from "../../../src/repositories/financeRepository";
import { listGoalTransactions, listLoanTransactions } from "../../../src/repositories/transactionRepository";
import type { Goal, Loan } from "../../../src/types/finance";
import type { Transaction } from "../../../src/types/transaction";
import { radius, useAppColors } from "../../../src/theme";
import { formatCentsToBRL } from "../../../src/utils/currency";

export default function TrackerDetailScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const db = useSQLiteContext(); const colors = useAppColors();
  const [goal, setGoal] = useState<Goal | null>(null); const [loan, setLoan] = useState<Loan | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    if (kind === "loans") {
      const [loans, movements] = await Promise.all([listLoans(db), listLoanTransactions(db, id)]);
      setLoan(loans.find((item) => item.id === id) ?? null); setGoal(null); setTransactions(movements);
    } else if (kind === "goals") {
      const [goals, movements] = await Promise.all([listGoals(db), listGoalTransactions(db, id)]);
      setGoal(goals.find((item) => item.id === id) ?? null); setLoan(null); setTransactions(movements);
    }
    setLoading(false);
  }, [db, id, kind]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const item = loan ?? goal;
  if (!item) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><Pressable onPress={() => router.back()}><Text style={{ color: colors.accent }}>‹ Voltar</Text></Pressable><Text style={[styles.title, { color: colors.text, marginTop: 20 }]}>{loading ? "Carregando…" : "Item não encontrado"}</Text></Screen><BottomNav /></View>;

  const target = loan?.principalCents ?? goal?.targetCents ?? 0;
  const progress = loan ? Math.max(0, target - loan.remainingCents) : goal?.progressCents ?? 0;
  const remaining = loan?.remainingCents ?? Math.max(0, target - progress);
  const ratio = Math.min(progress / Math.max(target, 1), 1);
  const primaryColor = remaining === 0 ? colors.positive : item.color;
  const typeLabel = loan ? loan.direction === "lent" ? "A RECEBER" : "A PAGAR" : goal?.type === "income" ? "META DE RECEITA" : "META DE DESPESA";

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, { color: colors.accent }]}>‹ {loan ? "Empréstimos" : "Metas"}</Text></Pressable>
    <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{typeLabel}</Text><Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
    <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{loan ? "Saldo restante" : "Progresso"}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCentsToBRL(loan ? remaining : progress)}</Text>
      <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>{loan ? `de ${formatCentsToBRL(target)} originais` : `de ${formatCentsToBRL(target)} da meta`}</Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: primaryColor }]} /></View>
      <View style={styles.progressFooter}><Text style={[styles.progressCaption, { color: colors.textMuted }]}>{loan ? "Quitado" : "Concluído"}: {Math.round(ratio * 100)}%</Text><Text style={[styles.progressCaption, { color: remaining === 0 ? colors.positive : colors.textMuted }]}>{remaining === 0 ? "Concluído" : `Restam ${formatCentsToBRL(remaining)}`}</Text></View>
    </View>
    {(!loan || remaining > 0) && <PrimaryButton onPress={() => router.push(`/quick-entry?${loan ? "loanId" : "goalId"}=${encodeURIComponent(item.id)}`)} style={styles.add}><Plus color={colors.background} size={18} />{loan ? "Registrar pagamento" : "Adicionar lançamento"}</PrimaryButton>}
    <View style={styles.historyHeader}><Text style={[styles.historyTitle, { color: colors.text }]}>Movimentações</Text><Text style={[styles.historyCount, { color: colors.textMuted }]}>{transactions.length}</Text></View>
    <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{transactions.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum lançamento vinculado ainda.</Text> : transactions.map((transaction, index) => <TransactionItem key={transaction.id} transaction={transaction} isLast={index === transactions.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />)}</View>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 22 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7, marginTop: 5 }, summary: { borderWidth: 1, borderRadius: radius.lg, padding: 22, marginTop: 23 }, summaryLabel: { fontSize: 13 }, summaryValue: { fontSize: 32, fontWeight: "800", marginTop: 7 }, summaryMeta: { fontSize: 13, marginTop: 3 }, progressTrack: { height: 10, borderRadius: 5, overflow: "hidden", marginTop: 24 }, progressFill: { height: "100%", borderRadius: 5 }, progressFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, progressCaption: { fontSize: 12, fontWeight: "700" }, add: { marginTop: 16 }, historyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 27, marginBottom: 10 }, historyTitle: { fontSize: 18, fontWeight: "700" }, historyCount: { fontSize: 12 }, list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14 }, empty: { fontSize: 13, textAlign: "center", padding: 24 },
});
