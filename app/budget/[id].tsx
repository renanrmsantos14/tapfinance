import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import Svg, { Circle } from "react-native-svg";
import { BottomNav } from "../../src/components/BottomNav";
import { EmptyState, FormHeader, QuietButton, Screen } from "../../src/components/ui";
import { getBudgetCategoryBreakdown, type BudgetCategoryBreakdown } from "../../src/repositories/financeRepository";
import type { Budget } from "../../src/types/finance";
import { useAppColors } from "../../src/theme";
import { formatCentsByCurrency } from "../../src/utils/currency";
import { formatDate } from "../../src/utils/dates";
import { dailyBudgetCents } from "../../src/utils/budgetPeriods";

const chartColors = ["#8DB9EA", "#73D092", "#E6BD65", "#F17E88", "#B9A0E8", "#69C5C8", "#D6A17B", "#A7BBCB"];

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext(); const colors = useAppColors();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetCategoryBreakdown[]>([]);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
    if (!id) { setBudget(null); return; }
    const detail = await getBudgetCategoryBreakdown(db, id, periodOffset);
    setBudget(detail?.budget ?? null); setCategories(detail?.categories ?? []); setHasPrevious(detail?.hasPrevious ?? false);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Tente novamente."); }
    finally { setLoading(false); }
  }, [db, id, periodOffset]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const total = categories.reduce((sum, item) => sum + item.amountCents, 0);
  const segments = useMemo(() => {
    const circumference = 2 * Math.PI * 68;
    let offset = 0;
    return categories.map((item, index) => {
      const length = total > 0 ? item.amountCents / total * circumference : 0;
      const segment = { ...item, color: chartColors[index % chartColors.length], length, offset };
      offset += length;
      return segment;
    });
  }, [categories, total]);

  if (loadError) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><FormHeader title="Orçamento" onBack={() => router.back()} /><EmptyState title="Não foi possível carregar o período" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /></Screen><BottomNav /></View>;
  if (loading || !budget) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><FormHeader title="Orçamento" onBack={() => router.back()} /><Text accessibilityLiveRegion="polite" style={[styles.subtitle, { color: colors.textMuted }]}>{loading ? "Carregando…" : "Orçamento não encontrado"}</Text></Screen><BottomNav /></View>;
  const remaining = budget.amountCents - budget.spentCents;
  const formatBudgetAmount = (cents: number) => formatCentsByCurrency(cents, budget.currency);
  const progress = budget.spentCents / Math.max(budget.amountCents, 1);

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <FormHeader title={budget.name} subtitle="Orçamento" onBack={() => router.back()} />
    <View style={styles.periodRow}>
      <QuietButton accessibilityLabel="Período anterior" disabled={!hasPrevious} onPress={() => setPeriodOffset((value) => value + 1)}><ChevronLeft size={22} color={colors.text} /></QuietButton>
      <Text style={[styles.subtitle, styles.periodLabel, { color: colors.textMuted }]}>{formatDate(budget.startAt)} — {budget.endAt ? formatDate(budget.endAt - 1) : "sem data final"}</Text>
      <QuietButton accessibilityLabel="Período seguinte" disabled={periodOffset === 0} onPress={() => setPeriodOffset((value) => Math.max(0, value - 1))}><ChevronRight size={22} color={colors.text} /></QuietButton>
    </View>

    <View style={styles.summary}>
      <View style={styles.chartWrap}>
        <Svg width={156} height={156} viewBox="0 0 190 190" accessible={false}>
          <Circle cx="95" cy="95" r="68" fill="none" stroke={colors.surfaceMuted} strokeWidth="10" />
          {segments.map((segment) => <Circle key={segment.id} cx="95" cy="95" r="68" fill="none" stroke={segment.color} strokeWidth="10" strokeDasharray={`${segment.length} ${2 * Math.PI * 68 - segment.length}`} strokeDashoffset={-segment.offset} strokeLinecap="butt" rotation={-90} origin="95, 95" />)}
        </Svg>
      </View>
      <Text style={[styles.chartValue, { color: colors.text }]}>{Math.round(progress * 100)}% utilizado</Text>
      <Text style={[styles.spent, { color: colors.text }]}>{formatBudgetAmount(budget.spentCents)}</Text>
      <Text style={[styles.limit, { color: colors.textMuted }]}>de {formatBudgetAmount(budget.amountCents)} disponíveis no período</Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress * 100, 100))}%`, backgroundColor: remaining < 0 ? colors.negative : budget.color }]} /></View>
      <Text style={[styles.remaining, { color: remaining < 0 ? colors.negative : colors.textMuted }]}>{remaining < 0 ? "Acima do limite em " : "Restam "}{formatBudgetAmount(Math.abs(remaining))}</Text>
      {periodOffset === 0 && budget.endAt !== null && Date.now() < budget.endAt && Date.now() >= budget.startAt && <Text style={[styles.daily, { color: colors.accent }]}>Disponível por dia: {formatBudgetAmount(dailyBudgetCents(budget.amountCents, budget.spentCents, budget.endAt))}</Text>}
    </View>

    <View style={styles.categoryHeader}><Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>Gastos por categoria</Text><Text style={[styles.count, { color: colors.textMuted }]}>{categories.length}</Text></View>
    <View>
      {categories.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Ainda não há despesas neste período.</Text> : segments.map((item, index) => <View key={item.id} style={[styles.categoryRow, { borderBottomColor: colors.border }, index === segments.length - 1 && { borderBottomWidth: 0 }]}>
        <View style={[styles.dot, { backgroundColor: item.color }]} /><View style={styles.categoryCopy}><Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.categoryMeta, { color: colors.textMuted }]}>{item.count} {item.count === 1 ? "lançamento" : "lançamentos"} · {Math.round(item.amountCents / Math.max(total, 1) * 100)}%{item.limitCents !== null ? ` · limite ${formatBudgetAmount(item.limitCents)}` : ""}</Text><Text style={[styles.categoryAmount, { color: item.limitCents !== null && item.amountCents > item.limitCents ? colors.negative : colors.text }]}>{formatBudgetAmount(item.amountCents)}</Text>{item.limitCents !== null && <View style={[styles.categoryTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.categoryFill, { width: `${Math.min(100, item.amountCents / Math.max(1, item.limitCents) * 100)}%`, backgroundColor: item.amountCents > item.limitCents ? colors.negative : item.color }]} /></View>}</View>
      </View>)}
    </View>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, subtitle: { fontSize: 13, lineHeight: 19, textAlign: "center" }, periodLabel: { flex: 1 }, periodRow: { flexDirection: "row", alignItems: "center", gap: 8 }, daily: { fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: "center" },
  summary: { alignItems: "center", paddingVertical: 24 }, chartWrap: { width: 156, height: 156, alignItems: "center", justifyContent: "center" }, chartValue: { fontSize: 14, fontWeight: "600", textAlign: "center" }, spent: { fontSize: 30, fontWeight: "600", fontVariant: ["tabular-nums"], marginTop: 12, textAlign: "center" }, limit: { fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: "center" }, progressTrack: { width: "100%", height: 5, borderRadius: 3, overflow: "hidden", marginTop: 20 }, progressFill: { height: "100%", borderRadius: 3 }, remaining: { fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: "center" },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 16, marginBottom: 8 }, section: { flex: 1, fontSize: 18, fontWeight: "600" }, count: { fontSize: 13 }, categoryRow: { minHeight: 80, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "flex-start", gap: 12 }, dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 }, categoryCopy: { flex: 1, minWidth: 0 }, categoryName: { fontSize: 15, fontWeight: "600", lineHeight: 21 }, categoryMeta: { fontSize: 13, lineHeight: 19, marginTop: 4 }, categoryTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 8 }, categoryFill: { height: 4, borderRadius: 2 }, categoryAmount: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"], marginTop: 6 }, empty: { paddingVertical: 24, fontSize: 13, lineHeight: 19 },
});
