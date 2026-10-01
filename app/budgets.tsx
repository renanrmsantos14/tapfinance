import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { EmptyState, PrimaryButton, QuietButton, Screen, SectionHeader, useReducedMotion } from "../src/components/ui";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { archiveBudget, createBudget, getBudgetConfiguration, listBudgets, updateBudget, type BudgetConfiguration } from "../src/repositories/financeRepository";
import type { Budget, BudgetCycle } from "../src/types/finance";
import { listCategories } from "../src/repositories/categoryRepository";
import type { Category } from "../src/types/category";
import { radius, useAppColors } from "../src/theme";
import { formatCentsByCurrency, parseCurrencyToCents } from "../src/utils/currency";
import { formatDate, parseDateInput } from "../src/utils/dates";

const cycles: { id: BudgetCycle; label: string }[] = [
  { id: "monthly", label: "Mensal" }, { id: "weekly", label: "Semanal" }, { id: "custom", label: "Período único" },
];

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.title, { color: colors.text }]}>Orçamentos</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Limites e gastos do período</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Criar orçamento" onPress={openCreate} style={({ pressed }) => [styles.add, { backgroundColor: colors.surfaceStrong, transform: [{ scale: pressed && reduceMotion === false ? 0.96 : 1 }] }]}><Plus color={colors.text} size={22} /></Pressable>
        </View>
        {loading ? <Text style={{ color: colors.textMuted, marginTop: 24 }}>Atualizando orçamentos…</Text> : loadError ? <EmptyState title="Não foi possível carregar" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /> : budgets.length === 0 ? (
          <EmptyState embedded title="Seu primeiro orçamento" description="Defina um limite mensal ou semanal para acompanhar os gastos." actionLabel="Criar orçamento" onAction={openCreate} />
        ) : <>
          <SectionHeader title="Período atual" />
          {budgets.map((budget) => {
            const progress = Math.min(budget.spentCents / Math.max(budget.amountCents, 1), 1);
            const remaining = budget.amountCents - budget.spentCents;
            const progressColor = remaining < 0 ? colors.negative : budget.color;
            return <View key={budget.id} style={[styles.card, { borderColor: colors.border }]}><Pressable accessibilityRole="button" accessibilityLabel={`Detalhes do orçamento ${budget.name}`} onPress={() => router.push(`/budget/${budget.id}`)} onLongPress={() => openActions(budget)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <View style={styles.cardTop}><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.cardName, { color: colors.text }]}>{budget.name}</Text><Text style={[styles.cycle, { color: colors.textMuted }]}>{budget.cycle === "monthly" ? "Este mês" : budget.cycle === "weekly" ? "Esta semana" : "Período personalizado"}</Text></View><Text style={[styles.percent, { color: remaining < 0 ? colors.negative : colors.text }]}>{Math.round(budget.spentCents / Math.max(budget.amountCents, 1) * 100)}%</Text></View>
              <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: progressColor }]} /></View>
              <View style={styles.amountRow}><Text style={[styles.amount, { color: colors.text }]}>{formatCentsByCurrency(budget.spentCents, budget.currency)} <Text style={[styles.muted, { color: colors.textMuted }]}>de {formatCentsByCurrency(budget.amountCents, budget.currency)}</Text></Text><Text style={[styles.remaining, { color: remaining < 0 ? colors.negative : colors.textMuted }]}>{remaining < 0 ? "Acima " : "Restam "}{formatCentsByCurrency(Math.abs(remaining), budget.currency)}</Text></View>
            </Pressable><View style={styles.cardActions}><QuietButton accessibilityLabel={`Editar orçamento ${budget.name}`} onPress={() => { void openEdit(budget); }} style={styles.cardAction}><Text style={{ color: colors.accent, fontSize: 14, fontWeight: "600" }}>Editar</Text></QuietButton><QuietButton accessibilityLabel={`Arquivar orçamento ${budget.name}`} onPress={() => confirmArchive(budget)} style={styles.cardAction}><Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "600" }}>Arquivar</Text></QuietButton></View></View>;
          })}
          <Pressable accessibilityRole="button" onPress={openCreate} style={({ pressed }) => [styles.newRow, { backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}><Plus color={colors.accent} size={18} /><Text style={[styles.newText, { color: colors.accent }]}>Adicionar orçamento</Text></Pressable>
        </>}
      </Screen></ScrollView>
      <BottomNav />
      <Modal visible={modalOpen} animationType={reduceMotion === false ? "slide" : "none"} transparent onRequestClose={() => { if (!saving) setModalOpen(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.scrim}><ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>{editing ? "Editar orçamento" : "Novo orçamento"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => setModalOpen(false)} style={({ pressed }) => [styles.close, { opacity: saving ? 0.5 : pressed ? 0.6 : 1 }]}><X color={colors.textMuted} size={20} /></Pressable></View>
          <Text style={[styles.label, { color: colors.textMuted }]}>NOME</Text>
          <TextInput accessibilityLabel="Nome do orçamento" placeholder="Ex.: Gastos do mês" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} maxLength={50} />
          <Text style={[styles.label, { color: colors.textMuted }]}>MOEDA</Text>
          <TextInput accessibilityLabel="Código da moeda do orçamento" accessibilityHint={editing ? "A moeda fica preservada. Crie outro orçamento para usar outra moeda." : "Três letras, como BRL, USD ou EUR. Somente movimentos nessa moeda entram no orçamento."} editable={!editing && !saving} value={currency} onChangeText={(value) => setCurrency(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={3} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>{editing ? "Moeda preservada. Para outra moeda, crie um novo orçamento." : "Use o código da moeda das suas contas. Valores com duas casas decimais; sem conversão cambial."}</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>LIMITE</Text>
          <CurrencyInput currency={currency} value={parseCurrencyToCents(amount) ?? 0} onChange={(cents) => setAmount(formatCentsByCurrency(cents, currency))} disabled={saving} />
          <Text style={[styles.label, { color: colors.textMuted }]}>CICLO</Text>
          <View style={styles.cycleRow}>{cycles.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: cycle === item.id }} onPress={() => setCycle(item.id)} style={[styles.cycleOption, { borderColor: cycle === item.id ? colors.accent : colors.border, backgroundColor: cycle === item.id ? colors.accentSoft : colors.background }]}><Text style={[styles.cycleOptionText, { color: cycle === item.id ? colors.accent : colors.textMuted }]}>{item.label}</Text></Pressable>)}</View>
          {cycle === "custom" && <View style={styles.dateRow}>
            <View style={styles.dateField}><Text style={[styles.label, { color: colors.textMuted }]}>INÍCIO</Text><TextInput accessibilityLabel="Data inicial" value={startText} onChangeText={setStartText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></View>
            <View style={styles.dateField}><Text style={[styles.label, { color: colors.textMuted }]}>FIM</Text><TextInput accessibilityLabel="Data final" value={endText} onChangeText={setEndText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></View>
          </View>}
          <Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIAS <Text style={styles.optionalLabel}>· opcional</Text></Text>
          <View style={styles.categoryRow}>{categories.map((category) => {
            const selected = selectedCategories.includes(category.id);
            return <View key={category.id}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedCategories((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])} style={[styles.categoryOption, { backgroundColor: selected ? colors.accentSoft : colors.background, borderColor: selected ? colors.accent : colors.border }]}><Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "600" }}>{category.name}</Text></Pressable>{selected && <TextInput accessibilityLabel={`Limite de ${category.name}`} value={categoryLimits[category.id] ?? ""} onChangeText={(value) => changeCategoryLimit(category.id, value)} keyboardType="number-pad" placeholder="Sem limite" placeholderTextColor={colors.textMuted} style={[styles.categoryLimit, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />}</View>;
          })}</View>
          {formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.negative, marginTop: 16, lineHeight: 20 }}>{formError}</Text>}
          <PrimaryButton disabled={saving} onPress={() => void save()} style={styles.save}>{saving ? "Salvando…" : editing ? "Salvar alterações" : "Salvar orçamento"}</PrimaryButton>
        </ScrollView></KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 5 },
  add: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  card: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 18, marginTop: 8 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 12 }, cardName: { fontSize: 17, fontWeight: "600" }, cycle: { fontSize: 13, marginTop: 4 }, percent: { fontSize: 18, fontWeight: "600", fontVariant: ["tabular-nums"] }, cardActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginTop: 8 }, cardAction: { paddingHorizontal: 12 },
  track: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 16 }, fill: { height: "100%", borderRadius: 3 }, amountRow: { gap: 6, marginTop: 12 }, amount: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] }, muted: { fontWeight: "400" }, remaining: { fontSize: 13 },
  newRow: { minHeight: 54, borderRadius: radius.sm, marginTop: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, newText: { fontSize: 14, fontWeight: "600" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 22 }, sheetTitle: { flex: 1, fontSize: 20, fontWeight: "600" }, close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginTop: 12, marginBottom: 8 }, input: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, cycleOption: { flexGrow: 1, flexBasis: 90, minHeight: 48, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, paddingVertical: 8 }, cycleOptionText: { fontSize: 13, fontWeight: "600", textAlign: "center" }, save: { marginTop: 24 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, dateField: { flexGrow: 1, flexBasis: 130 }, optionalLabel: { fontWeight: "400", letterSpacing: 0 }, categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, categoryOption: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", justifyContent: "center" }, categoryLimit: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, marginTop: 5, minWidth: 112 },
});
