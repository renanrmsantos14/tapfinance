import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Plus, TrendingDown, TrendingUp, WalletCards } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { Screen, styles as ui } from "../src/components/ui";
import { listTransactions, getMonthSummary } from "../src/repositories/transactionRepository";
import type { Transaction } from "../src/types/transaction";
import { useAppColors } from "../src/theme";
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
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [nextTransactions, nextSummary] = await Promise.all([listTransactions(db), getMonthSummary(db, start, end)]);
      setTransactions(nextTransactions.slice(0, 8));
      setSummary({ income: nextSummary?.income ?? 0, expense: nextSummary?.expense ?? 0 });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, start, end]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const balance = summary.income - summary.expense;

  return (
    <View style={styles.root}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}>
        <Screen scroll={false}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>TAPFINANCE</Text>
              <Text style={[styles.title, { color: colors.text }]}>Seu dinheiro, claro.</Text>
            </View>
            <View style={[styles.logo, { backgroundColor: colors.text }]}><WalletCards color={colors.background} size={20} /></View>
          </View>

          <View style={[styles.balanceBlock, { borderBottomColor: colors.border }]}>
            <Text style={[ui.label, { color: colors.textMuted }]}>{formatMonthLabel(now.getTime())}</Text>
            <Text style={[styles.balance, { color: colors.text }]}>{formatCentsToBRL(balance)}</Text>
            <Text style={[styles.caption, { color: colors.textMuted }]}>saldo do período</Text>
          </View>

          <View style={styles.metrics}>
            <Metric icon={<TrendingUp color={colors.positive} size={18} />} label="Receitas" value={formatCentsToBRL(summary.income)} color={colors.positive} />
            <Metric icon={<TrendingDown color={colors.negative} size={18} />} label="Despesas" value={formatCentsToBRL(summary.expense)} color={colors.negative} />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/quick-entry")} style={({ pressed }) => [styles.cta, { backgroundColor: colors.text, opacity: pressed ? 0.86 : 1 }]}>
            <Plus color={colors.background} size={20} strokeWidth={2.5} />
            <Text style={[styles.ctaText, { color: colors.background }]}>Novo lançamento</Text>
          </Pressable>

          <View style={styles.recentHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Recentes</Text><Pressable onPress={() => router.push("/transactions")}><Text style={[styles.link, { color: colors.accent }]}>Ver tudo</Text></Pressable></View>
          {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : loadError ? <Text style={[styles.empty, { color: colors.negative }]}>Não foi possível carregar seus lançamentos. Puxe para tentar novamente.</Text> : transactions.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Seus lançamentos aparecem aqui.</Text> : transactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} onPress={() => router.push(`/transaction/${transaction.id}`)} />)}
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors = useAppColors();
  return <View style={styles.metric}><View style={styles.metricTop}>{icon}<Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View><Text style={[styles.metricValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 38 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.8, marginBottom: 9 },
  title: { fontSize: 27, fontWeight: "700", letterSpacing: -0.7 },
  logo: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  balanceBlock: { paddingBottom: 26, borderBottomWidth: 1 }, balance: { fontSize: 44, fontWeight: "700", letterSpacing: -1.7, marginTop: 12 }, caption: { fontSize: 13, marginTop: 4 },
  metrics: { flexDirection: "row", gap: 34, paddingVertical: 24 }, metric: { gap: 8 }, metricTop: { flexDirection: "row", gap: 8, alignItems: "center" }, metricLabel: { fontSize: 13 }, metricValue: { fontSize: 16, fontWeight: "700" },
  cta: { minHeight: 54, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 38 }, ctaText: { fontSize: 16, fontWeight: "700" },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, sectionTitle: { fontSize: 18, fontWeight: "700" }, link: { fontSize: 13, fontWeight: "700" }, loader: { marginTop: 24 }, empty: { paddingVertical: 24, fontSize: 15 },
});
