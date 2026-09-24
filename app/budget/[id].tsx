import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import Svg, { Circle } from "react-native-svg";
import { BottomNav } from "../../src/components/BottomNav";
import { Screen } from "../../src/components/ui";
import { getBudgetCategoryBreakdown, type BudgetCategoryBreakdown } from "../../src/repositories/financeRepository";
import type { Budget } from "../../src/types/finance";
import { radius, useAppColors } from "../../src/theme";
import { formatCentsToBRL } from "../../src/utils/currency";
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
  const load = useCallback(async () => {
    if (!id) return;
    const detail = await getBudgetCategoryBreakdown(db, id, periodOffset);
    setBudget(detail?.budget ?? null); setCategories(detail?.categories ?? []); setHasPrevious(detail?.hasPrevious ?? false); setLoading(false);
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

  if (!budget) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><Pressable onPress={() => router.back()}><Text style={{ color: colors.accent }}>‹ Orçamentos</Text></Pressable><Text style={[styles.title, { color: colors.text, marginTop: 22 }]}>{loading ? "Carregando…" : "Orçamento não encontrado"}</Text></Screen><BottomNav /></View>;
  const remaining = budget.amountCents - budget.spentCents;
  const progress = budget.spentCents / Math.max(budget.amountCents, 1);

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, { color: colors.accent }]}>‹ Orçamentos</Text></Pressable>
    <Text style={[styles.title, { color: colors.text }]}>{budget.name}</Text>
    <View style={styles.periodRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Período anterior" accessibilityState={{ disabled: !hasPrevious }} disabled={!hasPrevious} onPress={() => setPeriodOffset((value) => value + 1)} style={[styles.periodButton, { borderColor: colors.border, opacity: hasPrevious ? 1 : 0.35 }]}><Text style={{ color: colors.text }}>‹</Text></Pressable>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{formatDate(budget.startAt)} — {budget.endAt ? formatDate(budget.endAt - 1) : "sem data final"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Período seguinte" accessibilityState={{ disabled: periodOffset === 0 }} disabled={periodOffset === 0} onPress={() => setPeriodOffset((value) => Math.max(0, value - 1))} style={[styles.periodButton, { borderColor: colors.border, opacity: periodOffset ? 1 : 0.35 }]}><Text style={{ color: colors.text }}>›</Text></Pressable>
    </View>

    <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.chartWrap}>
        <Svg width={190} height={190} viewBox="0 0 190 190">
          <Circle cx="95" cy="95" r="68" fill="none" stroke={colors.surfaceMuted} strokeWidth="18" />
          {segments.map((segment) => <Circle key={segment.id} cx="95" cy="95" r="68" fill="none" stroke={segment.color} strokeWidth="18" strokeDasharray={`${segment.length} ${2 * Math.PI * 68 - segment.length}`} strokeDashoffset={-segment.offset} strokeLinecap="butt" rotation={-90} origin="95, 95" />)}
        </Svg>
        <View pointerEvents="none" style={styles.chartCenter}><Text style={[styles.chartValue, { color: colors.text }]}>{Math.round(progress * 100)}%</Text><Text style={[styles.chartLabel, { color: colors.textMuted }]}>utilizado</Text></View>
      </View>
      <Text style={[styles.spent, { color: colors.text }]}>{formatCentsToBRL(budget.spentCents)}</Text>
      <Text style={[styles.limit, { color: colors.textMuted }]}>de {formatCentsToBRL(budget.amountCents)} disponíveis no período</Text>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress * 100, 100))}%`, backgroundColor: remaining < 0 ? colors.negative : budget.color }]} /></View>
      <Text style={[styles.remaining, { color: remaining < 0 ? colors.negative : colors.textMuted }]}>{remaining < 0 ? "Acima do limite em " : "Restam "}{formatCentsToBRL(Math.abs(remaining))}</Text>
      {periodOffset === 0 && budget.endAt !== null && Date.now() < budget.endAt && Date.now() >= budget.startAt && <Text style={[styles.daily, { color: colors.accent }]}>Disponível por dia: {formatCentsToBRL(dailyBudgetCents(budget.amountCents, budget.spentCents, budget.endAt))}</Text>}
    </View>

    <View style={styles.categoryHeader}><Text style={[styles.section, { color: colors.text }]}>Gastos por categoria</Text><Text style={[styles.count, { color: colors.textMuted }]}>{categories.length}</Text></View>
    <View style={[styles.categoryList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {categories.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Ainda não há despesas neste período.</Text> : segments.map((item, index) => <View key={item.id} style={[styles.categoryRow, { borderBottomColor: colors.border }, index === segments.length - 1 && { borderBottomWidth: 0 }]}>
        <View style={[styles.dot, { backgroundColor: item.color }]} /><View style={styles.categoryCopy}><Text numberOfLines={1} style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.categoryMeta, { color: colors.textMuted }]}>{item.count} {item.count === 1 ? "lançamento" : "lançamentos"} · {Math.round(item.amountCents / Math.max(total, 1) * 100)}%{item.limitCents !== null ? ` · limite ${formatCentsToBRL(item.limitCents)}` : ""}</Text>{item.limitCents !== null && <View style={[styles.categoryTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.categoryFill, { width: `${Math.min(100, item.amountCents / Math.max(1, item.limitCents) * 100)}%`, backgroundColor: item.amountCents > item.limitCents ? colors.negative : item.color }]} /></View>}</View><Text style={[styles.categoryAmount, { color: item.limitCents !== null && item.amountCents > item.limitCents ? colors.negative : colors.text }]}>{formatCentsToBRL(item.amountCents)}</Text>
      </View>)}
    </View>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 13 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 5 }, periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 9 }, periodButton: { width: 36, height: 36, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" }, daily: { fontSize: 12, fontWeight: "700", marginTop: 8 },
  summary: { borderWidth: 1, borderRadius: radius.lg, padding: 20, alignItems: "center", marginTop: 22 }, chartWrap: { width: 190, height: 190, alignItems: "center", justifyContent: "center" }, chartCenter: { position: "absolute", alignItems: "center" }, chartValue: { fontSize: 28, fontWeight: "800" }, chartLabel: { fontSize: 12, marginTop: 2 }, spent: { fontSize: 26, fontWeight: "800", marginTop: 15 }, limit: { fontSize: 12, marginTop: 5 }, progressTrack: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 19 }, progressFill: { height: "100%", borderRadius: 4 }, remaining: { fontSize: 12, fontWeight: "700", marginTop: 10 },
  categoryHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 25, marginBottom: 10 }, section: { fontSize: 18, fontWeight: "700" }, count: { fontSize: 12 }, categoryList: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 15 }, categoryRow: { minHeight: 69, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11 }, dot: { width: 10, height: 10, borderRadius: 5 }, categoryCopy: { flex: 1 }, categoryName: { fontSize: 14, fontWeight: "700" }, categoryMeta: { fontSize: 11, marginTop: 4 }, categoryTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 6 }, categoryFill: { height: 4, borderRadius: 2 }, categoryAmount: { fontSize: 13, fontWeight: "700" }, empty: { textAlign: "center", padding: 25, fontSize: 13, lineHeight: 19 },
});
