import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { PrimaryButton, Screen, SectionHeader, useReducedMotion } from "../src/components/ui";
import { archiveBudget, createBudget, getBudgetConfiguration, listBudgets, updateBudget, type BudgetConfiguration } from "../src/repositories/financeRepository";
import type { Budget, BudgetCycle } from "../src/types/finance";
import { listCategories } from "../src/repositories/categoryRepository";
import type { Category } from "../src/types/category";
import { radius, useAppColors } from "../src/theme";
import { formatCentsToBRL, parseCurrencyToCents } from "../src/utils/currency";
import { formatDate, parseDateInput } from "../src/utils/dates";

const cycles: { id: BudgetCycle; label: string }[] = [
  { id: "monthly", label: "Mensal" }, { id: "weekly", label: "Semanal" }, { id: "custom", label: "Período único" },
];

export default function BudgetsScreen() {
  const db = useSQLiteContext(); const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [budgets, setBudgets] = useState<Budget[]>([]); const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [cycle, setCycle] = useState<BudgetCycle>("monthly");
  const [categories, setCategories] = useState<Category[]>([]); const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<BudgetConfiguration | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});
  const [startText, setStartText] = useState(new Date().toLocaleDateString("pt-BR"));
  const [endText, setEndText] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("pt-BR"));
  const load = useCallback(async () => setBudgets(await listBudgets(db)), [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useFocusEffect(useCallback(() => { void listCategories(db, "expense").then(setCategories); }, [db]));

  function openCreate() {
    setEditing(null); setName(""); setAmount(""); setCycle("monthly"); setSelectedCategories([]); setCategoryLimits({});
    setModalOpen(true);
  }

  async function openEdit(budget: Budget) {
    try {
      const config = await getBudgetConfiguration(db, budget.id);
      if (!config) throw new Error("Orçamento não encontrado.");
      setEditing(config); setName(config.name); setAmount(formatCentsToBRL(config.amountCents)); setCycle(config.cycle);
      setStartText(formatDate(config.startAt)); setEndText(formatDate((config.endAt ?? config.startAt + 86_400_000) - 1));
      setSelectedCategories(config.categoryLimits.map((item) => item.categoryId));
      setCategoryLimits(Object.fromEntries(config.categoryLimits.filter((item) => item.limitCents !== null).map((item) => [item.categoryId, formatCentsToBRL(item.limitCents!)])));
      setModalOpen(true);
    } catch (error) { Alert.alert("Não foi possível editar", error instanceof Error ? error.message : "Tente novamente."); }
  }

  async function save() {
    const cents = parseCurrencyToCents(amount);
    if (!name.trim() || !cents || cents < 1) return;
    const start = cycle === "custom" ? parseDateInput(startText) : Date.now();
    const endDate = cycle === "custom" ? parseDateInput(endText) : null;
    if (cycle === "custom" && (start === null || endDate === null || endDate < start)) { Alert.alert("Período inválido", "Informe datas válidas e uma data final igual ou posterior à inicial."); return; }
    const end = endDate === null ? null : new Date(endDate);
    if (end) end.setDate(end.getDate() + 1);
    const limits = selectedCategories.map((categoryId) => ({ categoryId, limitCents: categoryLimits[categoryId]?.trim() ? parseCurrencyToCents(categoryLimits[categoryId]) : null }));
    if (limits.some((item) => item.limitCents !== null && (!item.limitCents || item.limitCents < 1))) { Alert.alert("Limite inválido", "Confira o limite de cada categoria selecionada."); return; }
    try {
      if (editing) await updateBudget(db, editing.id, { name, amountCents: cents, color: editing.color, cycle, startAt: cycle === "custom" ? start! : editing.startAt, endAt: cycle === "custom" ? end!.getTime() : null, categoryLimits: limits });
      else await createBudget(db, { name, amountCents: cents, color: colors.accent, cycle, startAt: start ?? undefined, endAt: end?.getTime() ?? null, categoryLimits: limits });
      setEditing(null); setName(""); setAmount(""); setCycle("monthly"); setSelectedCategories([]); setCategoryLimits({}); setModalOpen(false); await load();
    } catch (error) { Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente."); }
  }

  function confirmArchive(budget: Budget) {
    Alert.alert("Arquivar orçamento?", `${budget.name} deixa de aparecer nos ativos. O histórico fica preservado.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Arquivar", onPress: () => { void archiveBudget(db, budget.id).then(load); } },
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
          <View><Text style={[styles.title, { color: colors.text }]}>Orçamentos</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Acompanhe o ritmo dos seus gastos.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Criar orçamento" onPress={openCreate} style={({ pressed }) => [styles.add, { backgroundColor: colors.surfaceStrong, transform: [{ scale: pressed && reduceMotion === false ? 0.96 : 1 }] }]}><Plus color={colors.text} size={22} /></Pressable>
        </View>
        {budgets.length === 0 ? (
          <Pressable onPress={openCreate} style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <PieChartMark color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Seu primeiro orçamento</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Defina um limite mensal ou semanal e veja o progresso conforme registra seus lançamentos.</Text>
            <Text style={[styles.emptyAction, { color: colors.accent }]}>Criar orçamento</Text>
          </Pressable>
        ) : <>
          <SectionHeader title="Período atual" />
          {budgets.map((budget) => {
            const progress = Math.min(budget.spentCents / Math.max(budget.amountCents, 1), 1);
            const remaining = budget.amountCents - budget.spentCents;
            const progressColor = remaining < 0 ? colors.negative : budget.color;
            return <View key={budget.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable accessibilityRole="button" accessibilityLabel={`Detalhes do orçamento ${budget.name}`} onPress={() => router.push(`/budget/${budget.id}`)} onLongPress={() => openActions(budget)}>
              <View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={[styles.cardName, { color: colors.text }]}>{budget.name}</Text><Text style={[styles.cycle, { color: colors.textMuted }]}>{budget.cycle === "monthly" ? "Este mês" : budget.cycle === "weekly" ? "Esta semana" : "Período personalizado"}</Text></View><Text style={[styles.percent, { color: progressColor }]}>{Math.round(budget.spentCents / Math.max(budget.amountCents, 1) * 100)}%</Text></View>
              <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.max(1, progress * 100)}%`, backgroundColor: progressColor }]} /></View>
              <View style={styles.amountRow}><Text style={[styles.amount, { color: colors.text }]}>{formatCentsToBRL(budget.spentCents)} <Text style={[styles.muted, { color: colors.textMuted }]}>de {formatCentsToBRL(budget.amountCents)}</Text></Text><Text style={[styles.remaining, { color: remaining < 0 ? colors.negative : colors.textMuted }]}>{remaining < 0 ? "Acima " : "Restam "}{formatCentsToBRL(Math.abs(remaining))}</Text></View>
            </Pressable><View style={styles.cardActions}><Pressable accessibilityRole="button" accessibilityLabel={`Editar orçamento ${budget.name}`} onPress={() => { void openEdit(budget); }}><Text style={[styles.cardAction, { color: colors.accent }]}>Editar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Arquivar orçamento ${budget.name}`} onPress={() => confirmArchive(budget)}><Text style={[styles.cardAction, { color: colors.textMuted }]}>Arquivar</Text></Pressable></View></View>;
          })}
          <Pressable accessibilityRole="button" onPress={openCreate} style={[styles.newRow, { borderColor: colors.border }]}><Plus color={colors.accent} size={18} /><Text style={[styles.newText, { color: colors.accent }]}>Adicionar orçamento</Text></Pressable>
        </>}
      </Screen></ScrollView>
      <BottomNav />
      <Modal visible={modalOpen} animationType={reduceMotion === false ? "slide" : "fade"} transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.scrim}><ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{editing ? "Editar orçamento" : "Novo orçamento"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setModalOpen(false)} style={styles.close}><X color={colors.textMuted} size={20} /></Pressable></View>
          <Text style={[styles.label, { color: colors.textMuted }]}>NOME</Text>
          <TextInput accessibilityLabel="Nome do orçamento" placeholder="Ex.: Gastos do mês" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} maxLength={50} />
          <Text style={[styles.label, { color: colors.textMuted }]}>LIMITE</Text>
          <TextInput accessibilityLabel="Limite do orçamento" placeholder="0,00" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
          <Text style={[styles.label, { color: colors.textMuted }]}>CICLO</Text>
          <View style={styles.cycleRow}>{cycles.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: cycle === item.id }} onPress={() => setCycle(item.id)} style={[styles.cycleOption, { borderColor: cycle === item.id ? colors.accent : colors.border, backgroundColor: cycle === item.id ? colors.accentSoft : colors.background }]}><Text style={[styles.cycleOptionText, { color: cycle === item.id ? colors.accent : colors.textMuted }]}>{item.label}</Text></Pressable>)}</View>
          {cycle === "custom" && <View style={styles.dateRow}>
            <View style={styles.dateField}><Text style={[styles.label, { color: colors.textMuted }]}>INÍCIO</Text><TextInput accessibilityLabel="Data inicial" value={startText} onChangeText={setStartText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></View>
            <View style={styles.dateField}><Text style={[styles.label, { color: colors.textMuted }]}>FIM</Text><TextInput accessibilityLabel="Data final" value={endText} onChangeText={setEndText} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={10} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></View>
          </View>}
          <Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIAS <Text style={styles.optionalLabel}>· opcional</Text></Text>
          <View style={styles.categoryRow}>{categories.map((category) => {
            const selected = selectedCategories.includes(category.id);
            return <View key={category.id}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => setSelectedCategories((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])} style={[styles.categoryOption, { backgroundColor: selected ? colors.accentSoft : colors.background, borderColor: selected ? colors.accent : colors.border }]}><Text style={{ color: selected ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "600" }}>{category.name}</Text></Pressable>{selected && <TextInput accessibilityLabel={`Limite de ${category.name}`} value={categoryLimits[category.id] ?? ""} onChangeText={(value) => setCategoryLimits((current) => ({ ...current, [category.id]: value }))} keyboardType="decimal-pad" placeholder="Sem limite" placeholderTextColor={colors.textMuted} style={[styles.categoryLimit, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />}</View>;
          })}</View>
          <PrimaryButton onPress={() => void save()} style={styles.save}>{editing ? "Salvar alterações" : "Salvar orçamento"}</PrimaryButton>
        </ScrollView></View>
      </Modal>
    </View>
  );
}

function PieChartMark({ color }: { color: string }) { return <View style={[styles.mark, { borderColor: color }]}><View style={[styles.markSlice, { borderLeftColor: color, borderTopColor: color }]} /></View>; }

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 5 },
  add: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  empty: { minHeight: 320, borderWidth: 1, borderRadius: radius.lg, padding: 26, alignItems: "center", justifyContent: "center", marginTop: 12 },
  mark: { width: 56, height: 56, borderWidth: 4, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 18 }, markSlice: { width: 19, height: 19, borderWidth: 3, borderRadius: 3, transform: [{ rotate: "45deg" }] },
  emptyTitle: { fontSize: 18, fontWeight: "700" }, emptyText: { fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, maxWidth: 270 }, emptyAction: { fontSize: 14, fontWeight: "700", marginTop: 20 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 18, marginTop: 12 }, cardTop: { flexDirection: "row", alignItems: "center" }, cardName: { fontSize: 17, fontWeight: "700" }, cycle: { fontSize: 12, marginTop: 3 }, percent: { fontSize: 19, fontWeight: "800" }, cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 22, marginTop: 13 }, cardAction: { fontSize: 12, fontWeight: "700", paddingVertical: 5 },
  track: { height: 12, borderRadius: 6, overflow: "hidden", marginTop: 19 }, fill: { height: "100%", borderRadius: 6 }, amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }, amount: { fontSize: 14, fontWeight: "700" }, muted: { fontWeight: "500" }, remaining: { fontSize: 12, fontWeight: "600" },
  newRow: { minHeight: 54, borderWidth: 1, borderStyle: "dashed", borderRadius: radius.md, marginTop: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, newText: { fontSize: 14, fontWeight: "700" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end" }, sheet: { maxHeight: "92%", borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36 }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, sheetTitle: { fontSize: 20, fontWeight: "700" }, close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" }, label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 12, marginBottom: 8 }, input: { height: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 16 },
  cycleRow: { flexDirection: "row", gap: 8 }, cycleOption: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, cycleOptionText: { fontSize: 11, fontWeight: "700" }, save: { marginTop: 24 },
  dateRow: { flexDirection: "row", gap: 10 }, dateField: { flex: 1 }, optionalLabel: { fontWeight: "500", letterSpacing: 0 }, categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, categoryOption: { minHeight: 36, borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, categoryLimit: { height: 34, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, fontSize: 11, marginTop: 5, minWidth: 112 },
});
