import { useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { EmptyState, PrimaryButton, Reveal, Screen, SectionHeader, SkeletonRows } from "../src/components/ui";
import { loadHomeSnapshot } from "../src/services/homeService";
import type { Transaction } from "../src/types/transaction";
import { radius, useAppColors } from "../src/theme";
import { formatCentsByCurrency, formatCentsToBRL } from "../src/utils/currency";
import { formatMonthLabel } from "../src/utils/dates";
import type { Account, Budget, Goal, Loan } from "../src/types/finance";
import type { CurrencySummary } from "../src/utils/currencyTotals";

function currentPeriod() {
  const now = new Date();
  return { now, start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() };
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaries, setSummaries] = useState<CurrencySummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [upcoming, setUpcoming] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [period, setPeriod] = useState(currentPeriod);
  const loadSequence = useRef(0); const focused = useRef(false);

  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++loadSequence.current;
    setLoading(true);
    setLoadError(false);
    try {
      const next = await loadHomeSnapshot(db);
      if (request !== loadSequence.current) return;
      setPeriod(next.period); setTransactions(next.transactions); setUpcoming(next.upcoming); setSummaries(next.summaries);
      setAccounts(next.accounts); setBudgets(next.budgets); setGoals(next.goals); setLoans(next.loans);
    } catch {
      if (request === loadSequence.current) setLoadError(true);
    } finally {
      if (request === loadSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [db]);

  useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; loadSequence.current += 1; }; }, [load]));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        <Screen scroll={false}>
          <Reveal style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Visão geral</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{formatMonthLabel(period.now.getTime(), true).toLocaleLowerCase("pt-BR")}</Text>
            </View>
          </Reveal>

          {loading ? <View accessibilityLiveRegion="polite"><Text style={{ color: colors.textMuted }}>Carregando visão geral…</Text><SkeletonRows count={5} /></View> : loadError ? <EmptyState title="Visão geral indisponível" description="Não foi possível consultar os dados. Nenhum saldo foi confirmado nesta tentativa." actionLabel="Tentar novamente" onAction={() => void load()} /> : <>
          <Reveal delay={45}>
            {summaries.length > 1 && <Text style={[styles.caption, { color: colors.textMuted, marginBottom: 10 }]}>Totais separados por moeda · sem conversão cambial</Text>}
            {summaries.map((summary) => (
            <View key={summary.currency} style={styles.balanceCard}>
              <View style={styles.balanceTop}>
                <Text style={[styles.period, { color: colors.textMuted }]}>{formatMonthLabel(period.now.getTime())}</Text>
                <Text style={[styles.periodMeta, { color: colors.textMuted }]}>{transactions.length} recentes</Text>
              </View>
              <Text accessibilityLabel={`Saldo do período ${formatCentsByCurrency(summary.balance, summary.currency)}`} style={[styles.balance, { color: summary.balance < 0 ? colors.negative : colors.text }]}>{formatCentsByCurrency(summary.balance, summary.currency)}</Text>
              <Text style={[styles.caption, { color: colors.textMuted }]}>saldo do período · {summary.currency}</Text>

              <View style={[styles.metrics, { borderTopColor: colors.border }]}>
                <Metric icon={<ArrowUpRight color={colors.positive} size={17} />} label="Receitas" value={formatCentsByCurrency(summary.income, summary.currency)} color={colors.positive} />
                <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
                <Metric icon={<ArrowDownLeft color={colors.negative} size={17} />} label="Despesas" value={formatCentsByCurrency(summary.expense, summary.currency)} color={colors.negative} />
              </View>
            </View>
            ))}
          </Reveal>

          <SectionHeader title="Contas" actionLabel="Gerenciar" onAction={() => router.push("/collection/accounts")} />
          <View style={styles.accountRow}>
            {accounts.map((account) => <Pressable key={account.id} accessibilityRole="button" accessibilityLabel={`${account.name}${account.isPrimary ? ", principal" : ""}, saldo ${formatCentsByCurrency(account.balanceCents, account.currency)}`} accessibilityHint="Abre o gerenciamento de contas" onPress={() => router.push("/collection/accounts")} style={({ pressed }) => [styles.accountCard, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border }]}>
              <View style={[styles.accountDot, { backgroundColor: account.color }]} />
              <View style={styles.accountCopy}><Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text><Text style={[styles.accountType, { color: colors.textMuted }]}>{account.isPrimary ? "Principal" : ({ checking: "Conta corrente", cash: "Dinheiro", savings: "Poupança", credit: "Crédito", investment: "Investimento" })[account.type]}</Text></View>
              <Text style={[styles.accountBalance, { color: colors.text }]}>{formatCentsByCurrency(account.balanceCents, account.currency)}</Text>
            </Pressable>)}
            <Pressable accessibilityRole="button" onPress={() => router.push("/collection/accounts")} style={({ pressed }) => [styles.accountAdd, { backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}><Plus color={colors.accent} size={18} /><Text style={{ color: colors.accent, fontSize: 14, fontWeight: "600" }}>Adicionar conta</Text></Pressable>
          </View>

          {budgets.length > 0 && <>
            <SectionHeader title="Orçamento" actionLabel="Ver todos" onAction={() => router.push("/budgets")} />
            {budgets.slice(0, 2).map((budget) => {
              const ratio = Math.min(budget.spentCents / Math.max(budget.amountCents, 1), 1);
              return <Pressable key={budget.id} accessibilityRole="button" accessibilityLabel={`Orçamento ${budget.name}`} onPress={() => router.push(`/budget/${budget.id}`)} style={({ pressed }) => [styles.budgetCard, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border }]}>
                <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{budget.name}</Text><Text style={[styles.budgetPercent, { color: budget.spentCents > budget.amountCents ? colors.negative : colors.text }]}>{Math.round(budget.spentCents / Math.max(budget.amountCents, 1) * 100)}%</Text></View>
                <View style={[styles.budgetTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.budgetFill, { width: `${ratio * 100}%`, backgroundColor: budget.color }]} /></View>
                <Text style={[styles.budgetMeta, { color: colors.textMuted }]}>{formatCentsByCurrency(budget.spentCents, budget.currency)} gastos · {formatCentsByCurrency(budget.amountCents, budget.currency)} limite</Text>
              </Pressable>;
            })}
          </>}

          {goals.length > 0 && <>
            <SectionHeader title="Metas" actionLabel="Ver todas" onAction={() => router.push("/collection/goals")} />
            {goals.slice(0, 2).map((goal) => <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`Meta ${goal.name}`} onPress={() => router.push(`/tracker/goals/${goal.id}`)} style={({ pressed }) => [styles.budgetCard, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border }]}>
              <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{goal.name}</Text><Text style={[styles.budgetPercent, { color: colors.text }]}>{Math.round(goal.progressCents / Math.max(goal.targetCents, 1) * 100)}%</Text></View>
              <View style={[styles.budgetTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.budgetFill, { width: `${Math.min(goal.progressCents / Math.max(goal.targetCents, 1) * 100, 100)}%`, backgroundColor: goal.color }]} /></View>
              <Text style={[styles.budgetMeta, { color: colors.textMuted }]}>{formatCentsToBRL(goal.progressCents)} de {formatCentsToBRL(goal.targetCents)}</Text>
            </Pressable>)}
          </>}

          {loans.length > 0 && <>
            <SectionHeader title="Empréstimos" actionLabel="Ver todos" onAction={() => router.push("/collection/loans")} />
            {loans.slice(0, 2).map((loan) => <Pressable key={loan.id} accessibilityRole="button" accessibilityLabel={`Empréstimo ${loan.name}`} onPress={() => router.push(`/tracker/loans/${loan.id}`)} style={({ pressed }) => [styles.budgetCard, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border }]}>
              <View style={styles.budgetHead}><Text style={[styles.budgetName, { color: colors.text }]}>{loan.name}</Text><Text style={[styles.budgetPercent, { color: loan.remainingCents === 0 ? colors.positive : colors.text }]}>{Math.round((1 - loan.remainingCents / Math.max(loan.principalCents, 1)) * 100)}%</Text></View>
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
            {transactions.length === 0 ? (
              <EmptyState embedded title="Comece pelo primeiro lançamento" description="Registre uma receita ou despesa. Leva poucos segundos." actionLabel="Adicionar lançamento" onAction={() => router.push("/quick-entry")} />
            ) : transactions.map((transaction, index) => (
              <TransactionItem key={transaction.id} transaction={transaction} isLast={index === transactions.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />
            ))}
          </View>
          </>}
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
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { fontSize: 14, marginTop: 5 },
  balanceCard: { paddingVertical: 12, marginBottom: 24 },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  period: { fontSize: 11, fontWeight: "700", letterSpacing: 1.15 },
  periodMeta: { fontSize: 12 },
  balance: { fontSize: 36, fontWeight: "600", fontVariant: ["tabular-nums"], letterSpacing: -1, marginTop: 16 },
  caption: { fontSize: 13, marginTop: 3 },
  metrics: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 18 },
  metric: { flex: 1, gap: 7 },
  metricTop: { flexDirection: "row", gap: 7, alignItems: "center" },
  metricLabel: { flexShrink: 1, fontSize: 13 },
  metricValue: { fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  metricDivider: { width: StyleSheet.hairlineWidth, marginHorizontal: 18 },
  cta: { marginTop: 14, marginBottom: 28 },
  list: { paddingHorizontal: 0 },
  accountRow: { paddingBottom: 20 },
  accountCard: { minHeight: 68, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 8, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm },
  accountCopy: { flex: 1, minWidth: 100, gap: 4 }, accountDot: { width: 8, height: 8, borderRadius: 4 }, accountType: { fontSize: 12 },
  accountName: { fontSize: 15, fontWeight: "600" }, accountBalance: { maxWidth: "100%", flexShrink: 1, fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  accountAdd: { minHeight: 48, borderRadius: radius.sm, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 4 },
  budgetCard: { borderRadius: radius.sm, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, paddingHorizontal: 4, marginBottom: 8 }, budgetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, budgetName: { flex: 1, fontSize: 15, fontWeight: "600" }, budgetPercent: { fontSize: 16, fontWeight: "600", fontVariant: ["tabular-nums"] },
  budgetTrack: { height: 5, borderRadius: 3, marginTop: 12, overflow: "hidden" }, budgetFill: { height: "100%", borderRadius: 3 }, budgetMeta: { fontSize: 12, lineHeight: 18, marginTop: 9 },
});
