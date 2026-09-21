import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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

export default function HomeScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const period = useMemo(() => {
    const now = new Date();
    return {
      now,
      start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextTransactions, nextSummary] = await Promise.all([
        listTransactions(db),
        getMonthSummary(db, period.start, period.end),
      ]);
      setTransactions(nextTransactions.slice(0, 8));
      setSummary({ income: nextSummary?.income ?? 0, expense: nextSummary?.expense ?? 0 });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, period.end, period.start]);

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

          <Reveal delay={85}>
            <PrimaryButton accessibilityLabel="Criar novo lançamento" onPress={() => router.push("/quick-entry")} style={styles.cta}>
              <Plus color={colors.background} size={19} strokeWidth={2.5} />
              Novo lançamento
            </PrimaryButton>
          </Reveal>

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
});
