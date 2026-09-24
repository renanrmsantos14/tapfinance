import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { Screen } from "../src/components/ui";
import { useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";
import { formatMonthLabel } from "../src/utils/dates";

type CategoryTotal = { id: string; name: string; icon: string; total: number; count: number };

export default function InsightsScreen() {
  const db = useSQLiteContext(); const colors = useAppColors();
  const [summary, setSummary] = useState({ income: 0, expense: 0 }); const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [count, setCount] = useState(0); const [now] = useState(() => new Date());
  const load = useCallback(async () => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const result = await db.getFirstAsync<{ income: number; expense: number; count: number }>(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount_cents ELSE 0 END),0) income, COALESCE(SUM(CASE WHEN type='expense' THEN amount_cents ELSE 0 END),0) expense, COUNT(*) count FROM transactions WHERE occurred_at>=? AND occurred_at<? AND status='paid' AND kind='standard'`, start, end);
    const breakdown = await db.getAllAsync<CategoryTotal>(`SELECT c.id, c.name, c.icon, SUM(t.amount_cents) total, COUNT(*) count FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.type='expense' AND t.status='paid' AND t.kind='standard' AND t.occurred_at>=? AND t.occurred_at<? GROUP BY c.id ORDER BY total DESC LIMIT 8`, start, end);
    setSummary({ income: result?.income ?? 0, expense: result?.expense ?? 0 }); setCount(result?.count ?? 0); setCategories(breakdown);
  }, [db, now]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const net = summary.income - summary.expense; const max = Math.max(...categories.map((item) => item.total), 1);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Text onPress={() => router.back()} style={[styles.back, { color: colors.accent }]}>‹ Mais</Text><Text style={[styles.title, { color: colors.text }]}>Relatórios</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>{formatMonthLabel(now.getTime())} · {count} movimentações pagas</Text>
    <View style={styles.metrics}><Metric label="Despesas" value={summary.expense} color={colors.negative} /><Metric label="Receitas" value={summary.income} color={colors.positive} /></View>
    <View style={[styles.net, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.netLabel, { color: colors.textMuted }]}>Fluxo líquido do mês</Text><Text style={[styles.netValue, { color: net >= 0 ? colors.positive : colors.negative }]}>{formatCentsToBRL(net)}</Text></View>
    <Text style={[styles.section, { color: colors.text }]}>Despesas por categoria</Text>
    <View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>{categories.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>As categorias aparecem aqui conforme você registra despesas.</Text> : categories.map((item) => <View key={item.id} style={styles.row}><View style={styles.rowTop}><Text style={[styles.name, { color: colors.text }]}>{item.name}</Text><Text style={[styles.value, { color: colors.text }]}>{formatCentsToBRL(item.total)}</Text></View><View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${item.total / max * 100}%`, backgroundColor: colors.accent }]} /></View><Text style={[styles.meta, { color: colors.textMuted }]}>{item.count} {item.count === 1 ? "lançamento" : "lançamentos"} · {Math.round(item.total / Math.max(summary.expense, 1) * 100)}% das despesas</Text></View>)}</View>
  </Screen></ScrollView><BottomNav /></View>;
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) { const colors = useAppColors(); return <View style={[styles.metric, { backgroundColor: colors.surface }]}><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.metricValue, { color }]}>{formatCentsToBRL(value)}</Text></View>; }

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 26 }, back: { fontSize: 13, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 5 }, metrics: { flexDirection: "row", gap: 10, marginTop: 22 }, metric: { flex: 1, minHeight: 98, borderRadius: 16, padding: 15, justifyContent: "center" }, metricLabel: { fontSize: 12 }, metricValue: { fontSize: 17, fontWeight: "800", marginTop: 7 }, net: { borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 10 }, netLabel: { fontSize: 12 }, netValue: { fontSize: 25, fontWeight: "800", marginTop: 7 }, section: { fontSize: 18, fontWeight: "700", marginTop: 28, marginBottom: 11 }, breakdown: { borderWidth: 1, borderRadius: 16, padding: 16 }, row: { paddingVertical: 12 }, rowTop: { flexDirection: "row", justifyContent: "space-between" }, name: { fontSize: 14, fontWeight: "700" }, value: { fontSize: 13, fontWeight: "700" }, track: { height: 7, borderRadius: 4, overflow: "hidden", marginTop: 10 }, fill: { height: "100%", borderRadius: 4 }, meta: { fontSize: 11, marginTop: 7 }, empty: { textAlign: "center", fontSize: 13, lineHeight: 19, padding: 20 } });
