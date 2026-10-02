import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../src/components/Text";
import { Ellipsis, Plus, X } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { BentoGrid, Chip, EmptyState, Label, PrimaryButton, QuietButton, Ring, Screen, Tile, useReducedMotion } from "../src/components/ui";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { archiveBudget, createBudget, getBudgetConfiguration, listBudgets, updateBudget, type BudgetConfiguration } from "../src/repositories/financeRepository";
import type { Budget, BudgetCycle } from "../src/types/finance";
import { listCategories } from "../src/repositories/categoryRepository";
import type { Category } from "../src/types/category";
import { manrope, radius, type, useAppColors } from "../src/theme";
import { formatCentsByCurrency, parseCurrencyToCents } from "../src/utils/currency";
import { formatDate, parseDateInput } from "../src/utils/dates";

const cycles: { id: BudgetCycle; label: string }[] = [
  { id: "monthly", label: "Mensal" }, { id: "weekly", label: "Semanal" }, { id: "custom", label: "Período único" },
];
const DAY = 86_400_000;

export default function BudgetsScreen() {
  const db = useSQLiteContext(); const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [budgets, setBudgets] = useState<Budget[]>([]); const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [cycle, setCycle] = useState<BudgetCycle>("monthly");
  const [currency, setCurrency] = useState("BRL");
  const [categories, setCategories] = useState<Category[]>([]); const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<BudgetConfiguration | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});
  const [startText, setStartText] = useState(new Date().toLocaleDateString("pt-BR"));
  const [endText, setEndText] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("pt-BR"));
  const [saving, setSaving] = useState(false); const saveInProgress = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { setBudgets(await listBudgets(db)); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Tente novamente."); }
    finally { setLoading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useFocusEffect(useCallback(() => { void listCategories(db, "expense").then(setCategories).catch(() => Alert.alert("Não foi possível carregar as categorias", "Tente abrir esta tela novamente.")); }, [db]));

  function openCreate() {
    setEditing(null); setName(""); setAmount(""); setCurrency("BRL"); setCycle("monthly"); setSelectedCategories([]); setCategoryLimits({});
    setFormError(null); setStartText(formatDate(Date.now())); setEndText(formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime()));
    setModalOpen(true);
  }

  function changeCategoryLimit(categoryId: string, value: string) {
    const cents = parseCurrencyToCents(value);
    const next = !value.replace(/\D/g, "") ? "" : cents === null ? value : formatCentsByCurrency(cents, currency);
    setCategoryLimits((current) => ({ ...current, [categoryId]: next }));
  }

  async function openEdit(budget: Budget) {
    try {
      const config = await getBudgetConfiguration(db, budget.id);
      if (!config) throw new Error("Orçamento não encontrado.");
      setFormError(null);
      setEditing(config); setName(config.name); setCurrency(config.currency ?? "BRL"); setAmount(formatCentsByCurrency(config.amountCents, config.currency)); setCycle(config.cycle);
      setStartText(formatDate(config.startAt)); setEndText(formatDate((config.endAt ?? config.startAt + 86_400_000) - 1));
      setSelectedCategories(config.categoryLimits.map((item) => item.categoryId));
      setCategoryLimits(Object.fromEntries(config.categoryLimits.filter((item) => item.limitCents !== null).map((item) => [item.categoryId, formatCentsByCurrency(item.limitCents!, config.currency)])));
      setModalOpen(true);
    } catch (error) { Alert.alert("Não foi possível editar", error instanceof Error ? error.message : "Tente novamente."); }
  }

  async function save() {
    if (saveInProgress.current) return;
    setFormError(null);
    const cents = parseCurrencyToCents(amount);
    if (!name.trim()) { setFormError("Informe um nome para o orçamento."); return; }
    if (!cents || cents < 1) { setFormError("Informe um limite válido maior que zero."); return; }
    const start = cycle === "custom" ? parseDateInput(startText) : Date.now();
    const endDate = cycle === "custom" ? parseDateInput(endText) : null;
    if (cycle === "custom" && (start === null || endDate === null || endDate < start)) { Alert.alert("Período inválido", "Informe datas válidas e uma data final igual ou posterior à inicial."); return; }
    const end = endDate === null ? null : new Date(endDate);
    if (end) end.setDate(end.getDate() + 1);
    const limits = selectedCategories.map((categoryId) => ({ categoryId, limitCents: categoryLimits[categoryId]?.trim() ? parseCurrencyToCents(categoryLimits[categoryId]) : null }));
    if (limits.some((item) => !!categoryLimits[item.categoryId]?.trim() && (item.limitCents === null || item.limitCents < 1))) { setFormError("Confira o limite de cada categoria selecionada."); return; }
    saveInProgress.current = true; setSaving(true);
    try {
      if (editing) await updateBudget(db, editing.id, { name, currency, amountCents: cents, color: editing.color, cycle, startAt: cycle === "custom" ? start! : editing.startAt, endAt: cycle === "custom" ? end!.getTime() : null, categoryLimits: limits });
      else await createBudget(db, { name, currency, amountCents: cents, color: colors.accent, cycle, startAt: start ?? undefined, endAt: end?.getTime() ?? null, categoryLimits: limits });
      setEditing(null); setName(""); setAmount(""); setCycle("monthly"); setSelectedCategories([]); setCategoryLimits({}); setModalOpen(false); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { saveInProgress.current = false; setSaving(false); }
  }

  function confirmArchive(budget: Budget) {
    Alert.alert("Arquivar orçamento?", `${budget.name} deixa de aparecer nos ativos. O histórico fica preservado.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Arquivar", onPress: () => { void archiveBudget(db, budget.id).then(load).catch(() => Alert.alert("Não foi possível arquivar", "Tente novamente.")); } },
    ]);
  }

  function openActions(budget: Budget) {
    Alert.alert(budget.name, "Gerencie este orçamento.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Editar", onPress: () => { void openEdit(budget); } },
      { text: "Arquivar", style: "destructive", onPress: () => confirmArchive(budget) },
    ]);
  }

  // Budgets may overlap in categories and periods, so the overview never sums spentCents across them.
  const ranked = [...budgets].sort((a, b) => b.spentCents / Math.max(b.amountCents, 1) - a.spentCents / Math.max(a.amountCents, 1));
  const focus = ranked[0];
  const overCount = budgets.filter((budget) => budget.spentCents > budget.amountCents).length;
  const now = Date.now();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={[type.metaStrong, { color: colors.textMuted }]}>{loading ? "Atualizando…" : `${budgets.length} ${budgets.length === 1 ? "ativo" : "ativos"}`}</Text><Text accessibilityRole="header" style={[type.h1, { color: colors.text }]}>Orçamentos</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Criar orçamento" onPress={openCreate} style={({ pressed }) => [styles.add, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed && reduceMotion === false ? 0.96 : 1 }] }]}><Plus color={colors.accentContrast} size={20} strokeWidth={2.6} /></Pressable>
        </View>
        {loading ? <Text style={[type.body, { color: colors.textMuted, marginTop: 24 }]}>Atualizando orçamentos…</Text> : loadError ? <EmptyState title="Não foi possível carregar" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /> : budgets.length === 0 ? (
          <EmptyState title="Seu primeiro orçamento" description="Defina um limite mensal ou semanal para acompanhar os gastos." actionLabel="Criar orçamento" onAction={openCreate} />
        ) : <BentoGrid>
          {focus && (() => {
            const progress = focus.spentCents / Math.max(focus.amountCents, 1);
            const over = progress > 1;
            const daysLeft = focus.endAt && focus.endAt > now && focus.startAt <= now ? Math.max(1, Math.ceil((focus.endAt - now) / DAY)) : null;
            return <Tile ink span onPress={() => router.push(`/budget/${focus.id}`)} accessibilityLabel={`Orçamento mais usado: ${focus.name}, ${Math.round(progress * 100)}%`} style={styles.totalTile}>
              <Ring value={progress} size={104} stroke={10} label={`${Math.round(progress * 100)}%`} track="rgba(255,255,255,0.12)" textColor={colors.inkText} color={over ? colors.negative : colors.accent} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label style={{ color: colors.inkMuted }}>{budgets.length > 1 ? "Mais usado" : "Este período"}</Label>
                <Text numberOfLines={1} style={[type.stat, { color: colors.inkText, fontSize: 22 }]}>{focus.name}</Text>
                <Text style={[type.metaStrong, { color: over ? colors.negative : colors.inkMuted }]}>{formatCentsByCurrency(focus.spentCents, focus.currency)} de {formatCentsByCurrency(focus.amountCents, focus.currency)} · {over ? `${formatCentsByCurrency(focus.spentCents - focus.amountCents, focus.currency)} acima` : `${formatCentsByCurrency(focus.amountCents - focus.spentCents, focus.currency)} restam`}</Text>
                {budgets.length > 1 && <Text style={[type.meta, { color: colors.inkMuted }]}>{budgets.length} orçamentos · {overCount === 0 ? "nenhum estourado" : `${overCount} ${overCount === 1 ? "estourado" : "estourados"}`}</Text>}
                {daysLeft !== null && !over && <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}><Text style={[type.metaStrong, { color: colors.accentText, fontSize: 11 }]}>{formatCentsByCurrency(Math.floor((focus.amountCents - focus.spentCents) / daysLeft), focus.currency)}/dia · faltam {daysLeft} dias</Text></View>}
              </View>
            </Tile>;
          })()}
          {budgets.map((budget) => {
            const progress = budget.spentCents / Math.max(budget.amountCents, 1);
            const remaining = budget.amountCents - budget.spentCents;
            const over = remaining < 0;
            return <Tile key={budget.id} tone={over ? "negative" : undefined} onPress={() => router.push(`/budget/${budget.id}`)} accessibilityLabel={`Detalhes do orçamento ${budget.name}: ${Math.round(progress * 100)}%`} style={styles.budgetTile}>
              <View style={styles.rowBetween}>
                <Text numberOfLines={1} style={[type.bodyStrong, { color: colors.text, flex: 1 }]}>{budget.name}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Opções do orçamento ${budget.name}`} onPress={() => openActions(budget)} hitSlop={10} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}><Ellipsis color={colors.textMuted} size={18} /></Pressable>
              </View>
              <Text style={[type.stat, { color: over ? colors.negative : colors.text }]}>{Math.round(progress * 100)}%</Text>
              <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: over ? colors.negative : colors.accent }]} /></View>
              <Text numberOfLines={1} style={[type.meta, { color: over ? colors.negative : colors.textMuted, fontFamily: over ? manrope.bold : manrope.semibold }]}>{over ? `${formatCentsByCurrency(-remaining, budget.currency)} acima` : `${formatCentsByCurrency(remaining, budget.currency)} restam`}</Text>
              <Text numberOfLines={1} style={[type.meta, { color: colors.textMuted }]}>{budget.cycle === "monthly" ? "Este mês" : budget.cycle === "weekly" ? "Esta semana" : "Período único"} · {formatCentsByCurrency(budget.amountCents, budget.currency)}</Text>
            </Tile>;
          })}
          <Tile onPress={openCreate} accessibilityLabel="Adicionar orçamento" style={[styles.budgetTile, styles.addTile, { borderColor: colors.textMuted }]}>
            <View style={[styles.addIcon, { backgroundColor: colors.surfaceMuted }]}><Plus color={colors.textMuted} size={18} strokeWidth={2.6} /></View>
            <Text style={[type.bodyStrong, { color: colors.textMuted }]}>Adicionar orçamento</Text>
            <Text style={[type.meta, { color: colors.textMuted }]}>Por categoria ou geral.</Text>
          </Tile>
        </BentoGrid>}
      </Screen></ScrollView>
      <BottomNav />
      <Modal visible={modalOpen} animationType={reduceMotion === false ? "slide" : "none"} transparent onRequestClose={() => { if (!saving) setModalOpen(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.scrim}><ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 36 }}>
          <View style={[styles.handle, { backgroundColor: colors.surfaceMuted }]} />
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[type.h1, { color: colors.text, fontSize: 20 }]}>{editing ? "Editar orçamento" : "Novo orçamento"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => setModalOpen(false)} style={({ pressed }) => [styles.close, { backgroundColor: colors.surface, borderColor: colors.border, opacity: saving ? 0.5 : pressed ? 0.6 : 1 }]}><X color={colors.text} size={16} strokeWidth={2.4} /></Pressable></View>
          <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}><Label>Nome</Label>
            <TextInput accessibilityLabel="Nome do orçamento" placeholder="Ex.: Gastos do mês" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={[styles.input, { color: colors.text }]} maxLength={50} /></View>
          <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}><Label>Moeda</Label>
            <TextInput accessibilityLabel="Código da moeda do orçamento" accessibilityHint={editing ? "A moeda fica preservada. Crie outro orçamento para usar outra moeda." : "Três letras, como BRL, USD ou EUR. Somente movimentos nessa moeda entram no orçamento."} editable={!editing && !saving} value={currency} onChangeText={(value) => setCurrency(value.toUpperCase())} autoCapitalize="characters" maxLength={3} style={[styles.input, { color: colors.text, opacity: editing ? 0.6 : 1 }]} />
            <Text style={[type.meta, { color: colors.textMuted }]}>{editing ? "Moeda preservada. Para outra moeda, crie um novo orçamento." : "Use o código da moeda das suas contas. Sem conversão cambial."}</Text></View>
          <View style={[styles.field, { backgroundColor: colors.ink, borderColor: colors.ink }]}><Label style={{ color: colors.inkMuted }}>Limite</Label>
            <CurrencyInput currency={currency} value={parseCurrencyToCents(amount) ?? 0} onChange={(cents) => setAmount(formatCentsByCurrency(cents, currency))} disabled={saving} inverted /></View>
          <Label style={styles.sectionLabel}>Ciclo</Label>
          <View style={styles.chipRow}>{cycles.map((item) => <Chip key={item.id} accessibilityRole="radio" label={item.label} selected={cycle === item.id} onPress={() => setCycle(item.id)} />)}</View>
          {cycle === "custom" && <View style={styles.dateRow}>
            <View style={[styles.field, styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}><Label>Início</Label><TextInput accessibilityLabel="Data inicial" value={startText} onChangeText={setStartText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text }]} /></View>
            <View style={[styles.field, styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}><Label>Fim</Label><TextInput accessibilityLabel="Data final" value={endText} onChangeText={setEndText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text }]} /></View>
          </View>}
          <Label style={styles.sectionLabel}>Categorias <Text style={{ textTransform: "none", letterSpacing: 0, fontFamily: manrope.semibold }}>(opcional)</Text></Label>
          <View style={styles.chipRow}>{categories.map((category) => {
            const selected = selectedCategories.includes(category.id);
            return <Chip key={category.id} accessibilityRole="checkbox" label={category.name} selected={selected} onPress={() => setSelectedCategories((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])} />;
          })}</View>
          {selectedCategories.length > 0 && <View style={styles.limits}>{selectedCategories.map((categoryId) => {
            const category = categories.find((item) => item.id === categoryId);
            if (!category) return null;
            return <View key={categoryId} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}><Label>Limite · {category.name} <Text style={{ textTransform: "none", letterSpacing: 0, fontFamily: manrope.semibold }}>(opcional)</Text></Label><TextInput accessibilityLabel={`Limite da categoria ${category.name}`} value={categoryLimits[categoryId] ?? ""} onChangeText={(value) => changeCategoryLimit(categoryId, value)} placeholder="Sem limite próprio" placeholderTextColor={colors.textMuted} keyboardType="number-pad" style={[styles.input, { color: colors.text }]} /></View>;
          })}</View>}
          {formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[type.body, { color: colors.negative, marginTop: 16, lineHeight: 20 }]}>{formError}</Text>}
          <PrimaryButton disabled={saving} onPress={() => void save()} style={styles.save}>{saving ? "Salvando…" : editing ? "Salvar alterações" : "Salvar orçamento"}</PrimaryButton>
        </ScrollView></KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, paddingHorizontal: 4 },
  add: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  totalTile: { flexDirection: "row", alignItems: "center", gap: 18, padding: 18 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginTop: 4 },
  budgetTile: { width: "48%", flexGrow: 1, gap: 8 }, more: { width: 28, height: 28, alignItems: "center", justifyContent: "center", marginRight: -6, marginTop: -4 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" }, fill: { height: "100%", borderRadius: 3 },
  addTile: { borderStyle: "dashed", backgroundColor: "transparent", justifyContent: "center" }, addIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(8,10,16,0.55)", justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, paddingHorizontal: 4 }, close: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  field: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, gap: 6, marginTop: 10 }, input: { minHeight: 28, padding: 0, fontFamily: manrope.bold, fontSize: 15 },
  sectionLabel: { marginTop: 18, marginBottom: 8, paddingHorizontal: 4 }, chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateRow: { flexDirection: "row", gap: 10 }, dateField: { flex: 1 }, limits: { gap: 0 }, save: { marginTop: 24 },
});
