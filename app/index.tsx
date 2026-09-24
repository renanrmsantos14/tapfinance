import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Plus, WalletCards } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { EmptyState, PrimaryButton, Reveal, Screen, SectionHeader, SkeletonRows } from "../src/components/ui";
import { getMonthSummary, listTransactions } from "../src/repositories/transactionRepository";
import type { Transaction } from "../src/types/transaction";
import { radius, useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";
import { formatMonthLabel } from "../src/utils/dates";
import { listAccounts, listBudgets, listGoals, listLoans, materializeScheduledTransactions } from "../src/repositories/financeRepository";
import type { Account, Budget, Goal, Loan } from "../src/types/finance";

function currentPeriod() {
  const now = new Date();
  return { now, start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() };
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [upcoming, setUpcoming] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [period, setPeriod] = useState(currentPeriod);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const nextPeriod = currentPeriod();
      await materializeScheduledTransactions(db);
      const [nextTransactions, nextSummary, nextAccounts, nextBudgets, nextGoals, nextLoans] = await Promise.all([
        listTransactions(db),
        getMonthSummary(db, nextPeriod.start, nextPeriod.end),
        listAccounts(db),
        listBudgets(db),
        listGoals(db),
        listLoans(db),
      ]);
      setPeriod(nextPeriod);
      setTransactions(nextTransactions.filter((item) => item.occurredAt <= nextPeriod.now.getTime()).slice(0, 8));
      setUpcoming(nextTransactions.filter((item) => item.status === "pending" && item.occurredAt > nextPeriod.now.getTime()).slice(-3).reverse());
      setSummary({ income: nextSummary?.income ?? 0, expense: nextSummary?.expense ?? 0 });
      setAccounts(nextAccounts);
      setBudgets(nextBudgets);
      setGoals(nextGoals);
      setLoans(nextLoans);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const balance = summary.income - summary.expense;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        <Screen scroll={false}>
          <Reveal style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>TAPFINANCE</Text>
              <Text style={[styles.title, { color: colors.text }]}>Visão geral</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Seu mês, sem ruído.</Text>
            </View>
            <View style={[styles.logo, { backgroundColor: colors.text }]} accessibilityElementsHidden>
              <WalletCards color={colors.background} size={20} />
            </View>
          </Reveal>

          <SectionHeader title="Contas" actionLabel="Gerenciar" onAction={() => router.push("/collection/accounts")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
            {accounts.map((account) => (
              <Pressable key={account.id} onPress={() => router.push("/collection/accounts")} style={({ pressed }) => [styles.accountCard, { backgroundColor: colors.surface, borderColor: account.isPrimary ? colors.accent : colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <View style={styles.accountTop}><View style={[styles.accountDot, { backgroundColor: account.color }]} /><Text style={[styles.accountType, { color: colors.textMuted }]}>{account.isPrimary ? "PRINCIPAL" : account.type.toUpperCase()}</Text></View>
                <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>{account.name}</Text>
                <Text style={[styles.accountBalance, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCentsToBRL(account.balanceCents)}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar conta" onPress={() => router.push("/collection/accounts")} style={[styles.accountAdd, { borderColor: colors.border }]}><Plus color={colors.accent} size={22} /></Pressable>
          </ScrollView>

          <Reveal delay={45}>
            <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.balanceTop}>
                <Text style={[styles.period, { color: colors.textMuted }]}>{formatMonthLabel(period.now.getTime())}</Text>
                <Text style={[styles.periodMeta, { color: colors.textMuted }]}>{transactions.length} recentes</Text>
              </View>
              <Text accessibilityLabel={`Saldo do período ${formatCentsToBRL(balance)}`} style={[styles.balance, { color: colors.text }]}>{formatCentsToBRL(balance)}</Text>
              <Text style={[styles.caption, { color: colors.textMuted }]}>saldo do período</Text>

              <View style={[styles.metrics, { borderTopColor: colors.border }]}>
                <Metric icon={<ArrowUpRight color={colors.positive} size={17} />} label="Receitas" value={formatCentsToBRL(summary.income)} color={colors.positive} />
                <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                <Metric icon={<ArrowDownLeft color={colors.negative} size={17} />} label="Despesas" value={formatCentsToBRL(summary.expense)} color={colors.negative} />
              </View>
            </View>
          </Reveal>

          {budgets.length > 0 && <>
            <SectionHeader title="Orçamento" actionLabel="Ver todos" onAction={() => router.push("/budgets")} />
            {budgets.slice(0, 2).map((budget) => {
              const ratio = Math.min(budget.spentCents / Math.max(budget.amountCents, 1), 1);
              return <Pressable key={budget.id} onPress={() => router.push("/budgets")} style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
                <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{budget.name}</Text><Text style={[styles.budgetPercent, { color: budget.color }]}>{Math.round(budget.spentCents / Math.max(budget.amountCents, 1) * 100)}%</Text></View>
                <View style={[styles.budgetTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.budgetFill, { width: `${Math.max(ratio * 100, 1)}%`, backgroundColor: budget.color }]} /></View>
                <Text style={[styles.budgetMeta, { color: colors.textMuted }]}>{formatCentsToBRL(budget.spentCents)} gastos · {formatCentsToBRL(budget.amountCents)} limite</Text>
              </Pressable>;
            })}
          </>}

          {goals.length > 0 && <>
            <SectionHeader title="Metas" actionLabel="Ver todas" onAction={() => router.push("/collection/goals")} />
            {goals.slice(0, 2).map((goal) => <Pressable key={goal.id} onPress={() => router.push(`/tracker/goals/${goal.id}`)} style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
              <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{goal.name}</Text><Text style={[styles.budgetPercent, { color: goal.color }]}>{Math.round(goal.progressCents / Math.max(goal.targetCents, 1) * 100)}%</Text></View>
              <View style={[styles.budgetTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.budgetFill, { width: `${Math.min(goal.progressCents / Math.max(goal.targetCents, 1) * 100, 100)}%`, backgroundColor: goal.color }]} /></View>
              <Text style={[styles.budgetMeta, { color: colors.textMuted }]}>{formatCentsToBRL(goal.progressCents)} de {formatCentsToBRL(goal.targetCents)}</Text>
            </Pressable>)}
          </>}

          {loans.length > 0 && <>
            <SectionHeader title="Empréstimos" actionLabel="Ver todos" onAction={() => router.push("/collection/loans")} />
            {loans.slice(0, 2).map((loan) => <Pressable key={loan.id} onPress={() => router.push(`/tracker/loans/${loan.id}`)} style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
              <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{loan.name}</Text><Text style={[styles.budgetPercent, { color: loan.remainingCents === 0 ? colors.positive : loan.color }]}>{Math.round((1 - loan.remainingCents / Math.max(loan.principalCents, 1)) * 100)}%</Text></View>
              <View style={[styles.budgetTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.budgetFill, { width: `${Math.max(0, Math.min((1 - loan.remainingCents / Math.max(loan.principalCents, 1)) * 100, 100))}%`, backgroundColor: loan.color }]} /></View>
              <Text style={[styles.budgetMeta, { color: colors.textMuted }]}>{loan.direction === "lent" ? "A receber" : "A pagar"} · {formatCentsToBRL(loan.remainingCents)} restantes</Text>
            </Pressable>)}
          </>}

          <Reveal delay={85}>
            <PrimaryButton accessibilityLabel="Criar novo lançamento" onPress={() => router.push("/quick-entry")} style={styles.cta}>
              <Plus color={colors.background} size={19} strokeWidth={2.5} />
              Novo lançamento
            </PrimaryButton>
          </Reveal>

          {upcoming.length > 0 && <><SectionHeader title="Próximos lançamentos" actionLabel="Calendário" onAction={() => router.push("/calendar")} /><View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{upcoming.map((transaction, index) => <TransactionItem key={transaction.id} transaction={transaction} isLast={index === upcoming.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />)}</View></>}

          <SectionHeader title="Movimentações recentes" actionLabel="Ver histórico" onAction={() => router.push("/transactions")} />
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? <SkeletonRows count={4} /> : loadError ? (
              <EmptyState embedded title="Não foi possível carregar" description="Puxe a tela para baixo e tente novamente." />
            ) : transactions.length === 0 ? (
              <EmptyState embedded title="Comece pelo primeiro lançamento" description="Registre uma receita ou despesa. Leva poucos segundos." actionLabel="Adicionar lançamento" onAction={() => router.push("/quick-entry")} />
            ) : transactions.map((transaction, index) => (
              <TransactionItem key={transaction.id} transaction={transaction} isLast={index === transactions.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />
            ))}
          </View>
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>{icon}<Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.7, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -1.1 },
  subtitle: { fontSize: 14, marginTop: 5 },
  logo: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  balanceCard: { borderWidth: 1, borderRadius: radius.lg, padding: 20 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  period: { fontSize: 11, fontWeight: "700", letterSpacing: 1.15 },
  periodMeta: { fontSize: 12 },
  balance: { fontSize: 40, fontWeight: "700", letterSpacing: -1.8, marginTop: 20 },
  caption: { fontSize: 13, marginTop: 3 },
  metrics: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 18 },
  metric: { flex: 1, gap: 7 },
  metricTop: { flexDirection: "row", gap: 7, alignItems: "center" },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 15, fontWeight: "700" },
  metricDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 18 },
  cta: { marginTop: 14, marginBottom: 28 },
  list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, overflow: "hidden" },
  accountRow: { gap: 10, paddingBottom: 20 },
  accountCard: { width: 190, minHeight: 132, borderWidth: 1.5, borderRadius: radius.lg, padding: 15 },
  accountTop: { flexDirection: "row", alignItems: "center", gap: 7 }, accountDot: { width: 9, height: 9, borderRadius: 5 }, accountType: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  accountName: { fontSize: 15, fontWeight: "700", marginTop: 14 }, accountBalance: { fontSize: 20, fontWeight: "800", marginTop: 5, letterSpacing: -0.5 },
  accountAdd: { width: 54, minHeight: 132, borderWidth: 1, borderRadius: radius.lg, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  budgetCard: { borderRadius: radius.md, padding: 15, marginBottom: 9 }, budgetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, budgetName: { fontSize: 14, fontWeight: "700" }, budgetPercent: { fontSize: 16, fontWeight: "800" },
  budgetTrack: { height: 9, borderRadius: 5, marginTop: 13, overflow: "hidden" }, budgetFill: { height: "100%", borderRadius: 5 }, budgetMeta: { fontSize: 11, marginTop: 9 },
});
