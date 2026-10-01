import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { EmptyState, Screen, SkeletonRows } from "../src/components/ui";
import { useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";
import { formatMonthLabel } from "../src/utils/dates";
import { loadInsightsSnapshot } from "../src/services/insightsService";

export default function InsightsScreen() {
  const db = useSQLiteContext(); const colors = useAppColors();
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof loadInsightsSnapshot>> | null>(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0); const focused = useRef(false);
  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++loadSequence.current;
    setLoading(true); setError(null);
    try {
      const next = await loadInsightsSnapshot(db, month.getTime());
      if (request === loadSequence.current) setSnapshot(next);
    } catch (cause) {
      if (request === loadSequence.current) setError(cause instanceof Error && /limite numérico/.test(cause.message) ? cause.message : "Não foi possível consultar os dados. Nenhum total foi confirmado nesta tentativa.");
    } finally { if (request === loadSequence.current) setLoading(false); }
  }, [db, month]);
  useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; loadSequence.current += 1; }; }, [load]));
  function changeMonth(offset: number) { loadSequence.current += 1; setLoading(true); setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={({ pressed }) => [{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 }]}><Text style={{ color: colors.accent }}>‹ Mais</Text></Pressable>
    <Text style={[styles.title, { color: colors.text }]}>Relatórios</Text>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => changeMonth(-1)} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}><ChevronLeft size={21} color={colors.text} /></Pressable>
      <Text style={{ color: colors.text, fontWeight: "700", flex: 1, textAlign: "center" }}>{formatMonthLabel(month.getTime())}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => changeMonth(1)} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}><ChevronRight size={21} color={colors.text} /></Pressable>
    </View>
    {loading ? <View accessibilityLiveRegion="polite"><Text style={{ color: colors.textMuted }}>Carregando relatório…</Text><SkeletonRows count={5} /></View> : error ? <EmptyState title="Relatório indisponível" description={error} actionLabel="Tentar novamente" onAction={() => void load()} /> : snapshot && <>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{snapshot.count} movimentações comuns pagas</Text>
      {snapshot.groups.length > 1 && <Text style={[styles.subtitle, { color: colors.textMuted }]}>Totais e percentuais separados por moeda · sem conversão</Text>}
      {snapshot.groups.map((group) => {
        const max = Math.max(...group.categories.map((item) => item.total), 1);
        return <View key={group.currency}>
          <Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>{group.currency} · {group.count} movimentos pagos</Text>
          <View style={styles.metrics}><Metric label="Despesas" value={group.expense} currency={group.currency} color={colors.negative} /><Metric label="Receitas" value={group.income} currency={group.currency} color={colors.positive} /></View>
          <View style={[styles.net, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.netLabel, { color: colors.textMuted }]}>Fluxo líquido do mês</Text><Text style={[styles.netValue, { color: group.balance >= 0 ? colors.positive : colors.negative }]}>{formatCentsByCurrency(group.balance, group.currency)}</Text></View>
          <Text style={[styles.section, { color: colors.text }]}>Despesas por categoria</Text>
          <View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>{group.categories.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Sem despesas pagas nesta moeda e neste mês.</Text> : group.categories.map((item) => <View key={item.id} style={styles.row}><View style={styles.rowTop}><Text style={[styles.name, { color: colors.text, flex: 1, marginRight: 10 }]}>{item.name}</Text><Text style={[styles.value, { color: colors.text }]}>{formatCentsByCurrency(item.total, group.currency)}</Text></View><View accessibilityElementsHidden style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${item.total / max * 100}%`, backgroundColor: colors.accent }]} /></View><Text style={[styles.meta, { color: colors.textMuted }]}>{item.count} {item.count === 1 ? "lançamento" : "lançamentos"} · {Math.round(item.percentage)}% das despesas em {group.currency}</Text></View>)}</View>
        </View>;
      })}
      {snapshot.groups.length === 0 && <EmptyState title="Sem movimentos neste mês" description="Nenhum total em uma moeda foi encontrado para este período." />}
    </>}
  </Screen></ScrollView><BottomNav /></View>;
}

function Metric({ label, value, currency, color }: { label: string; value: number; currency: string; color: string }) { const colors = useAppColors(); return <View style={[styles.metric, { backgroundColor: colors.surface }]}><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.metricValue, { color }]}>{formatCentsByCurrency(value, currency)}</Text></View>; }

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 26 }, back: { fontSize: 13, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 5 }, metrics: { flexDirection: "row", gap: 10, marginTop: 22 }, metric: { flex: 1, minHeight: 98, borderRadius: 16, padding: 15, justifyContent: "center" }, metricLabel: { fontSize: 12 }, metricValue: { fontSize: 17, fontWeight: "800", marginTop: 7 }, net: { borderWidth: 1, borderRadius: 16, padding: 18, marginTop: 10 }, netLabel: { fontSize: 12 }, netValue: { fontSize: 25, fontWeight: "800", marginTop: 7 }, section: { fontSize: 18, fontWeight: "700", marginTop: 28, marginBottom: 11 }, breakdown: { borderWidth: 1, borderRadius: 16, padding: 16 }, row: { paddingVertical: 12 }, rowTop: { flexDirection: "row", justifyContent: "space-between" }, name: { fontSize: 14, fontWeight: "700" }, value: { fontSize: 13, fontWeight: "700" }, track: { height: 7, borderRadius: 4, overflow: "hidden", marginTop: 10 }, fill: { height: "100%", borderRadius: 4 }, meta: { fontSize: 11, marginTop: 7 }, empty: { textAlign: "center", fontSize: 13, lineHeight: 19, padding: 20 } });
