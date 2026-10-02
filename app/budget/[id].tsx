import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../src/components/Text";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../../src/components/BottomNav";
import { categoryIcon } from "../../src/components/CategorySelector";
import { BentoGrid, EmptyState, FormHeader, IconBox, Label, QuietButton, Screen, Tile } from "../../src/components/ui";
import { getBudgetCategoryBreakdown, type BudgetCategoryBreakdown } from "../../src/repositories/financeRepository";
import type { Budget } from "../../src/types/finance";
import { type, useAppColors } from "../../src/theme";
import { formatCentsByCurrency } from "../../src/utils/currency";
import { formatDate } from "../../src/utils/dates";
import { dailyBudgetCents } from "../../src/utils/budgetPeriods";

const DAY = 86_400_000;

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

  if (loadError) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><FormHeader title="Orçamento" onBack={() => router.back()} /><EmptyState title="Não foi possível carregar o período" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /></Screen><BottomNav /></View>;
  if (loading || !budget) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><FormHeader title="Orçamento" onBack={() => router.back()} /><Text accessibilityLiveRegion="polite" style={[type.body, { color: colors.textMuted, textAlign: "center" }]}>{loading ? "Carregando…" : "Orçamento não encontrado"}</Text></Screen><BottomNav /></View>;

  const remaining = budget.amountCents - budget.spentCents;
  const over = remaining < 0;
  const money = (cents: number) => formatCentsByCurrency(cents, budget.currency);
  const progress = budget.spentCents / Math.max(budget.amountCents, 1);
  const total = categories.reduce((sum, item) => sum + item.amountCents, 0);
  const now = Date.now();
  const live = periodOffset === 0 && budget.endAt !== null && now < budget.endAt && now >= budget.startAt;
  const elapsedDays = Math.max(1, Math.ceil((Math.min(now, budget.endAt ?? now) - budget.startAt) / DAY));
  const periodDays = budget.endAt ? Math.max(1, Math.round((budget.endAt - budget.startAt) / DAY)) : null;
  const paceCents = Math.round(budget.spentCents / elapsedDays);
  const targetPaceCents = periodDays ? Math.round(budget.amountCents / periodDays) : null;

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <FormHeader title={budget.name} subtitle={budget.cycle === "monthly" ? "Orçamento mensal" : budget.cycle === "weekly" ? "Orçamento semanal" : "Período único"} onBack={() => router.back()} />
    <View style={styles.periodRow}>
      <QuietButton framed accessibilityLabel="Período anterior" disabled={!hasPrevious} onPress={() => setPeriodOffset((value) => value + 1)}><ChevronLeft size={18} strokeWidth={2.4} color={colors.text} /></QuietButton>
      <Text style={[type.metaStrong, styles.periodLabel, { color: colors.textMuted }]}>{formatDate(budget.startAt)} — {budget.endAt ? formatDate(budget.endAt - 1) : "sem data final"}</Text>
      <QuietButton framed accessibilityLabel="Período seguinte" disabled={periodOffset === 0} onPress={() => setPeriodOffset((value) => Math.max(0, value - 1))}><ChevronRight size={18} strokeWidth={2.4} color={colors.text} /></QuietButton>
    </View>

    <BentoGrid>
      <Tile ink span style={styles.heroTile}>
        <View style={styles.rowBetween}>
          <Label style={{ color: colors.inkMuted }}>Gasto no período</Label>
          <View style={[styles.badge, { backgroundColor: over ? colors.negativeSoft : colors.accentSoft }]}><Text style={[type.metaStrong, { color: over ? colors.negative : colors.accentText, fontSize: 11 }]}>{Math.round(progress * 100)}%{over ? " · estourado" : ""}</Text></View>
        </View>
        <Text accessibilityLabel={`${money(budget.spentCents)} gastos de ${money(budget.amountCents)}`} style={[type.hero, { color: colors.inkText }]}>{money(budget.spentCents)}</Text>
        <View style={styles.trackWrap}>
          <View style={[styles.track, { backgroundColor: "rgba(255,255,255,0.12)" }]}><View style={[styles.fill, { width: `${Math.max(0, Math.min(progress * 100, 100))}%`, backgroundColor: over ? colors.negative : colors.accent }]} /></View>
          {over && <View style={[styles.limitMark, { left: `${Math.min(100 / progress, 100)}%`, backgroundColor: colors.inkText }]} />}
        </View>
        <View style={styles.rowBetween}><Text style={[type.metaStrong, { color: colors.inkMuted }]}>Limite {money(budget.amountCents)}</Text><Text style={[type.metaStrong, { color: over ? colors.negative : colors.inkMuted }]}>{over ? `${money(-remaining)} acima` : `${money(remaining)} restam`}</Text></View>
      </Tile>

      <Tile style={styles.halfTile}>
        <Label>Ritmo</Label>
        <Text style={[type.stat, { color: over ? colors.negative : colors.text }]}>{money(paceCents)}<Text style={[type.meta, { color: colors.textMuted }]}>/dia</Text></Text>
        <Text style={[type.meta, { color: colors.textMuted }]}>{targetPaceCents !== null ? `meta de ${money(targetPaceCents)}/dia` : `${elapsedDays} ${elapsedDays === 1 ? "dia" : "dias"} de período`}</Text>
      </Tile>
      <Tile tone="accent" style={styles.halfTile}>
        <Label style={{ color: colors.accentText }}>{live ? "Disponível" : "Período"}</Label>
        {live ? <>
          <Text style={[type.stat, { color: colors.text }]}>{money(dailyBudgetCents(budget.amountCents, budget.spentCents, budget.endAt!))}<Text style={[type.meta, { color: colors.accentText }]}>/dia</Text></Text>
          <Text style={[type.meta, { color: colors.accentText }]}>faltam {Math.max(1, Math.ceil((budget.endAt! - now) / DAY))} dias</Text>
        </> : <>
          <Text style={[type.stat, { color: colors.text }]}>{periodDays ?? "—"}<Text style={[type.meta, { color: colors.accentText }]}> dias</Text></Text>
          <Text style={[type.meta, { color: colors.accentText }]}>{periodOffset === 0 ? "período encerrado" : "período anterior"}</Text>
        </>}
      </Tile>

      <View style={styles.sectionRow}><Text accessibilityRole="header" style={[type.h2, { color: colors.text }]}>Gastos por categoria</Text><Text style={[type.metaStrong, { color: colors.textMuted }]}>{categories.length}</Text></View>
      {categories.length === 0 ? <Tile span><Text style={[type.body, { color: colors.textMuted }]}>Ainda não há despesas neste período.</Text></Tile> : categories.map((item) => {
        const Icon = categoryIcon(item.icon ?? "") ?? Ellipsis;
        const share = Math.round(item.amountCents / Math.max(total, 1) * 100);
        const overLimit = item.limitCents !== null && item.amountCents > item.limitCents;
        return <Tile key={item.id} tone={overLimit ? "negative" : undefined} onPress={() => router.push({ pathname: "/transactions", params: { categoryId: item.id, from: String(budget.startAt), to: String(budget.endAt ?? Date.now()), status: "paid", kind: "standard", type: "expense", accountCurrency: budget.currency } })} accessibilityLabel={`${item.name}: ${money(item.amountCents)}, ${share}% do gasto`} accessibilityHint="Abre o extrato filtrado por esta categoria" style={styles.categoryTile}>
          <IconBox icon={Icon} color={overLimit ? colors.negative : colors.accentText} background={overLimit ? colors.negativeSoft : colors.accentSoft} />
          <Text numberOfLines={1} style={[type.bodyStrong, { color: colors.text }]}>{item.name}</Text>
          <Text style={[type.stat, { color: overLimit ? colors.negative : colors.text, fontSize: 20 }]}>{money(item.amountCents).replace(/^[A-Z$ ]+ /, "")}</Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${item.limitCents !== null ? Math.min(item.amountCents / Math.max(item.limitCents, 1) * 100, 100) : share}%`, backgroundColor: overLimit ? colors.negative : colors.accent }]} /></View>
          <Text style={[type.meta, { color: overLimit ? colors.negative : colors.textMuted }]}>{item.limitCents !== null ? `${overLimit ? `${money(item.amountCents - item.limitCents)} acima` : `${money(item.limitCents - item.amountCents)} restam`} · limite ${money(item.limitCents)}` : `${share}% · ${item.count} ${item.count === 1 ? "lançamento" : "lançamentos"}`}</Text>
        </Tile>;
      })}
    </BentoGrid>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 12 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }, periodLabel: { flex: 1, textAlign: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  heroTile: { padding: 20, gap: 10 }, badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  trackWrap: { position: "relative", paddingVertical: 3 }, track: { height: 10, borderRadius: 5, overflow: "hidden" }, fill: { height: "100%", borderRadius: 5 },
  limitMark: { position: "absolute", top: 0, bottom: 0, width: 2 },
  halfTile: { width: "48%", flexGrow: 1, gap: 4 },
  sectionRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 6 },
  categoryTile: { width: "48%", flexGrow: 1, gap: 8 },
});
