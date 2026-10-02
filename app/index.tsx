import { useCallback, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../src/components/Text";
import { LayoutGrid, Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { BentoGrid, EmptyState, Label, PrimaryButton, QuietButton, Ring, Screen, SectionHeader, SkeletonRows, Tile } from "../src/components/ui";
import { loadHomeSnapshot } from "../src/services/homeService";
import { loadInsightsSnapshot, type CategoryTotal } from "../src/services/insightsService";
import type { Transaction } from "../src/types/transaction";
import { type, useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";
import { formatMonthLabel, formatShortDate } from "../src/utils/dates";
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
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [categoryExpense, setCategoryExpense] = useState(0);
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
      const [next, insights] = await Promise.all([loadHomeSnapshot(db), loadInsightsSnapshot(db)]);
      if (request !== loadSequence.current) return;
      setPeriod(next.period); setTransactions(next.transactions); setUpcoming(next.upcoming); setSummaries(next.summaries);
      setAccounts(next.accounts); setBudgets(next.budgets); setGoals(next.goals); setLoans(next.loans);
      const group = insights.groups.find((item) => item.currency === (next.summaries[0]?.currency ?? "BRL")) ?? insights.groups[0];
      setCategories(group?.categories ?? []); setCategoryExpense(group?.expense ?? 0);
    } catch {
      if (request === loadSequence.current) setLoadError(true);
    } finally {
      if (request === loadSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [db]);

  useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; loadSequence.current += 1; }; }, [load]));

  const primaryCurrency = summaries[0]?.currency ?? "BRL";
  const budgetTotals = budgets.filter((budget) => budget.currency === primaryCurrency).reduce((sum, budget) => ({ spent: sum.spent + budget.spentCents, limit: sum.limit + budget.amountCents }), { spent: 0, limit: 0 });
  const overBudget = budgets.find((budget) => budget.spentCents > budget.amountCents);
  const nextDue = upcoming[0];
  const topCategories = categories.slice(0, 3);
  const otherTotal = categories.slice(3).reduce((sum, item) => sum + item.total, 0);
  const shade = [colors.accent, colors.accentText, colors.inkMuted];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        <Screen scroll={false}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.metaStrong, { color: colors.textMuted }]}>{formatMonthLabel(period.now.getTime(), true).toLocaleLowerCase("pt-BR").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"))}</Text>
              <Text accessibilityRole="header" style={[type.h1, { color: colors.text }]}>Visão geral</Text>
            </View>
            <QuietButton framed accessibilityLabel="Categorias" onPress={() => router.push("/categories")}><LayoutGrid color={colors.text} size={18} strokeWidth={2.2} /></QuietButton>
          </View>

          {loading ? <View accessibilityLiveRegion="polite"><Text style={[type.meta, { color: colors.textMuted, marginBottom: 8 }]}>Carregando visão geral…</Text><SkeletonRows count={5} /></View> : loadError ? <EmptyState title="Visão geral indisponível" description="Não foi possível consultar os dados. Nenhum saldo foi confirmado nesta tentativa." actionLabel="Tentar novamente" onAction={() => void load()} /> : <>
          <BentoGrid>
            {summaries.length > 1 && <Text style={[type.meta, { color: colors.textMuted, width: "100%", paddingHorizontal: 4 }]}>Totais separados por moeda · sem conversão cambial</Text>}
            {summaries.map((summary) => (
              <Tile key={summary.currency} ink span style={styles.heroTile}>
                <View style={styles.rowBetween}>
                  <Label style={{ color: colors.inkMuted }}>Saldo do período · {summary.currency}</Label>
                  <Text style={[type.metaStrong, { color: colors.inkMuted }]}>{transactions.length} recentes</Text>
                </View>
                <Text accessibilityLabel={`Saldo do período ${formatCentsByCurrency(summary.balance, summary.currency)}`} style={[type.hero, { color: summary.balance < 0 ? colors.negative : colors.inkText }]}>{formatCentsByCurrency(summary.balance, summary.currency)}</Text>
                <View style={styles.accountRow}>
                  {accounts.filter((account) => account.currency === summary.currency).slice(0, 3).map((account) => (
                    <Pressable key={account.id} accessibilityRole="button" accessibilityLabel={`${account.name}, saldo ${formatCentsByCurrency(account.balanceCents, account.currency)}`} onPress={() => router.push("/collection/accounts")} style={styles.accountChip}>
                      <View style={[styles.accountDot, { backgroundColor: account.color }]} />
                      <Text numberOfLines={1} style={[type.metaStrong, { color: colors.inkMuted }]}>{account.name} <Text style={{ color: colors.inkText }}>{formatCentsByCurrency(account.balanceCents, account.currency).replace(/^[A-Z$ ]+ /, "")}</Text></Text>
                    </Pressable>
                  ))}
                  {accounts.length === 0 && <Pressable accessibilityRole="button" onPress={() => router.push("/collection/accounts")}><Text style={[type.metaStrong, { color: colors.accentText }]}>Adicionar conta →</Text></Pressable>}
                </View>
              </Tile>
            ))}

            {summaries[0] && <>
              <Tile tone="accent" style={styles.halfTile}>
                <Label style={{ color: colors.accentText }}>Receitas</Label>
                <Text style={[type.stat, { color: colors.text }]}>{formatCentsByCurrency(summaries[0].income, summaries[0].currency)}</Text>
                <Text style={[type.meta, { color: colors.accentText }]}>no período</Text>
              </Tile>
              <Tile style={styles.halfTile}>
                <Label>Despesas</Label>
                <Text style={[type.stat, { color: colors.text }]}>{formatCentsByCurrency(summaries[0].expense, summaries[0].currency)}</Text>
                <Text style={[type.meta, { color: colors.textMuted }]}>{categories.reduce((sum, item) => sum + item.count, 0)} lançamentos pagos</Text>
              </Tile>
            </>}

            <Tile span onPress={() => router.push("/categories")} accessibilityLabel="Gastos por categoria" accessibilityHint="Abre a tela de categorias" style={styles.spanTile}>
              <View style={styles.rowBetween}><Label>Gastos por categoria</Label><Text style={[type.metaStrong, { color: colors.accentText }]}>Ver todas</Text></View>
              {categories.length === 0 ? <Text style={[type.body, { color: colors.textMuted }]}>Nenhuma despesa paga neste mês ainda.</Text> : <>
                <View style={[styles.stack, { backgroundColor: colors.surfaceMuted }]}>
                  {topCategories.map((item, index) => <View key={item.id} style={{ width: `${Math.max(item.total / Math.max(categoryExpense, 1) * 100, 2)}%`, backgroundColor: shade[index] }} />)}
                </View>
                <View style={styles.legend}>
                  {topCategories.map((item, index) => <View key={item.id} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: shade[index] }]} /><Text numberOfLines={1} style={[type.chip, { color: colors.text, flex: 1 }]}>{item.name}</Text><Text style={[type.amount, { color: colors.text, fontSize: 13 }]}>{formatCentsByCurrency(item.total, primaryCurrency).replace(/^[A-Z$ ]+ /, "")}</Text></View>)}
                  {otherTotal > 0 && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.surfaceMuted }]} /><Text numberOfLines={1} style={[type.chip, { color: colors.textMuted, flex: 1 }]}>Outras</Text><Text style={[type.amount, { color: colors.textMuted, fontSize: 13 }]}>{formatCentsByCurrency(otherTotal, primaryCurrency).replace(/^[A-Z$ ]+ /, "")}</Text></View>}
                </View>
              </>}
            </Tile>

            <Tile onPress={() => router.push("/budgets")} accessibilityLabel={budgetTotals.limit > 0 ? `Orçamento: ${Math.round(budgetTotals.spent / budgetTotals.limit * 100)}% usado` : "Orçamentos"} style={styles.halfTile}>
              <Label>Orçamento</Label>
              {budgetTotals.limit > 0 ? <>
                <Ring value={budgetTotals.spent / budgetTotals.limit} label={`${Math.round(budgetTotals.spent / budgetTotals.limit * 100)}%`} />
                <Text style={[type.meta, { color: budgetTotals.spent > budgetTotals.limit ? colors.negative : colors.textMuted }]}>{budgetTotals.spent > budgetTotals.limit ? `${formatCentsByCurrency(budgetTotals.spent - budgetTotals.limit, primaryCurrency)} acima` : `${formatCentsByCurrency(budgetTotals.limit - budgetTotals.spent, primaryCurrency)} restam`}</Text>
              </> : <Text style={[type.body, { color: colors.textMuted }]}>Defina um limite para acompanhar os gastos.</Text>}
            </Tile>
            {overBudget ? (
              <Tile tone="negative" onPress={() => router.push(`/budget/${overBudget.id}`)} accessibilityLabel={`Orçamento ${overBudget.name} estourado`} style={styles.halfTile}>
                <Label style={{ color: colors.negative }}>Estourado</Label>
                <Text numberOfLines={2} style={[type.stat, { color: colors.text }]}>{overBudget.name}</Text>
                <Text style={[type.metaStrong, { color: colors.negative }]}>{formatCentsByCurrency(overBudget.spentCents - overBudget.amountCents, overBudget.currency)} acima · {Math.round(overBudget.spentCents / Math.max(overBudget.amountCents, 1) * 100)}%</Text>
              </Tile>
            ) : (
              <Tile onPress={() => router.push(nextDue ? `/transaction/${nextDue.id}` : "/calendar")} accessibilityLabel={nextDue ? `A vencer: ${nextDue.title || nextDue.categoryName}` : "Calendário"} style={styles.halfTile}>
                <Label>A vencer</Label>
                {nextDue ? <>
                  <Text style={[type.stat, { color: colors.text }]}>{formatCentsByCurrency(nextDue.amountCents, nextDue.accountCurrency)}</Text>
                  <Text numberOfLines={1} style={[type.metaStrong, { color: colors.warning }]}>{nextDue.title || nextDue.categoryName} · {formatShortDate(nextDue.occurredAt)}</Text>
                </> : <Text style={[type.body, { color: colors.textMuted }]}>Nada pendente nos próximos dias.</Text>}
              </Tile>
            )}

            {(goals.length > 0 || loans.length > 0) && <Tile span style={styles.spanTile}>
              <View style={styles.rowBetween}><Label>Metas e empréstimos</Label><Pressable accessibilityRole="button" onPress={() => router.push(goals.length > 0 ? "/collection/goals" : "/collection/loans")}><Text style={[type.metaStrong, { color: colors.accentText }]}>Ver todos</Text></Pressable></View>
              {goals.slice(0, 2).map((goal) => <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`Meta ${goal.name}`} onPress={() => router.push(`/tracker/goals/${goal.id}`)} style={styles.trackerRow}>
                <View style={styles.rowBetween}><Text style={[type.bodyStrong, { color: colors.text }]}>{goal.name}</Text><Text style={[type.amount, { color: colors.text }]}>{Math.round(goal.progressCents / Math.max(goal.targetCents, 1) * 100)}%</Text></View>
                <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.min(goal.progressCents / Math.max(goal.targetCents, 1) * 100, 100)}%`, backgroundColor: colors.accent }]} /></View>
              </Pressable>)}
              {loans.slice(0, 2).map((loan) => <Pressable key={loan.id} accessibilityRole="button" accessibilityLabel={`Empréstimo ${loan.name}`} onPress={() => router.push(`/tracker/loans/${loan.id}`)} style={styles.trackerRow}>
                <View style={styles.rowBetween}><Text style={[type.bodyStrong, { color: colors.text }]}>{loan.name}</Text><Text style={[type.meta, { color: colors.textMuted }]}>{loan.direction === "lent" ? "A receber" : "A pagar"} · {formatCentsByCurrency(loan.remainingCents)}</Text></View>
                <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.max(0, Math.min((1 - loan.remainingCents / Math.max(loan.principalCents, 1)) * 100, 100))}%`, backgroundColor: colors.accent }]} /></View>
              </Pressable>)}
            </Tile>}
          </BentoGrid>

          <SectionHeader title="Recentes" actionLabel="Ver histórico" onAction={() => router.push("/transactions")} />
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {transactions.length === 0 ? (
              <EmptyState embedded title="Comece pelo primeiro lançamento" description="Registre uma receita ou despesa. Leva poucos segundos." actionLabel="Adicionar lançamento" onAction={() => router.push("/quick-entry")} />
            ) : transactions.slice(0, 5).map((transaction, index, list) => (
              <TransactionItem key={transaction.id} transaction={transaction} isLast={index === list.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />
            ))}
          </View>
          <PrimaryButton accessibilityLabel="Criar novo lançamento" onPress={() => router.push("/quick-entry")} style={styles.cta}>
            <Plus color={colors.accentContrast} size={19} strokeWidth={2.6} />
            Novo lançamento
          </PrimaryButton>
          </>}
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, paddingHorizontal: 4 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  heroTile: { padding: 20, gap: 10 },
  halfTile: { width: "48%", flexGrow: 1, gap: 6, justifyContent: "space-between" },
  spanTile: { gap: 12 },
  accountRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 2 },
  accountChip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24, maxWidth: "100%" },
  accountDot: { width: 8, height: 8, borderRadius: 3 },
  stack: { height: 12, borderRadius: 6, overflow: "hidden", flexDirection: "row" },
  legend: { flexDirection: "row", flexWrap: "wrap", rowGap: 6, columnGap: 12 },
  legendItem: { width: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 3 },
  trackerRow: { gap: 8, minHeight: 44, justifyContent: "center" },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  cta: { marginTop: 14 },
});
