import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react-native";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../../src/components/BottomNav";
import { PrimaryButton, Screen, useReducedMotion } from "../../src/components/ui";
import { archiveAccount, createAccount, createGoal, createLoan, createSchedule, listAccounts, listGoals, listLoans, listSchedules, moveAccount, setPrimaryAccount, updateAccount } from "../../src/repositories/financeRepository";
import { archiveCategory, createCategory, listCategories, moveCategory, updateCategory } from "../../src/repositories/categoryRepository";
import type { Account, Goal, Loan, Schedule } from "../../src/types/finance";
import type { Category } from "../../src/types/category";
import { radius, useAppColors } from "../../src/theme";
import { formatCentsToBRL, parseCurrencyToCents } from "../../src/utils/currency";

type Kind = "accounts" | "goals" | "loans" | "schedules" | "categories";
type Entry = Account | Goal | Loan | Schedule | Category;
const labels: Record<Kind, string> = { accounts: "Contas", goals: "Metas", loans: "Empréstimos", schedules: "Recorrências", categories: "Categorias" };

export default function CollectionScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind: string }>();
  const kind = (rawKind in labels ? rawKind : "accounts") as Kind;
  const db = useSQLiteContext(); const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<Entry[]>([]); const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [amount, setAmount] = useState("");
  const [choice, setChoice] = useState("checking"); const [type, setType] = useState("expense"); const [categoryId, setCategoryId] = useState("outros-despesa");
  const [frequency, setFrequency] = useState<Schedule["frequency"]>("monthly");
  const [isSubscription, setIsSubscription] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [categoryColor, setCategoryColor] = useState(colors.accent);
  const [accountColor, setAccountColor] = useState(colors.accent);
  const [openingNegative, setOpeningNegative] = useState(false);
  const [categoryIcon, setCategoryIcon] = useState("tag");

  const load = useCallback(async () => {
    if (kind === "accounts") setItems(await listAccounts(db));
    else if (kind === "goals") setItems(await listGoals(db));
    else if (kind === "loans") setItems(await listLoans(db));
    else if (kind === "schedules") setItems(await listSchedules(db));
    else {
      const [expenses, incomes] = await Promise.all([listCategories(db, "expense"), listCategories(db, "income")]);
      setItems([...expenses, ...incomes]);
    }
    const [expenses, incomes] = await Promise.all([listCategories(db, "expense"), listCategories(db, "income")]);
    setCategories([...expenses, ...incomes]);
  }, [db, kind]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const title = labels[kind];
  const typeOptions = useMemo(() => kind === "accounts" ? ["checking", "cash", "savings", "credit", "investment"] : kind === "loans" ? ["lent", "borrowed"] : kind === "goals" ? ["income", "expense"] : kind === "schedules" ? ["monthly", "weekly", "yearly", "once"] : ["expense", "income"], [kind]);
  const typeLabels: Record<string, string> = { checking: "Conta", cash: "Dinheiro", savings: "Poupança", credit: "Crédito", investment: "Investimento", lent: "A receber", borrowed: "A pagar", income: "Receita", expense: "Despesa", monthly: "Mensal", weekly: "Semanal", yearly: "Anual", once: "Única" };
  const categoryColors = [colors.accent, colors.positive, colors.negative, colors.warning, "#B9A0E8", "#69C5C8"];
  const categoryIcons = ["tag", "utensils", "car", "house", "shopping-bag", "briefcase-business", "heart-pulse", "ellipsis"];
  const categoryIconLabels: Record<string, string> = { tag: "Etiqueta", utensils: "Comida", car: "Carro", house: "Casa", "shopping-bag": "Compras", "briefcase-business": "Trabalho", "heart-pulse": "Saúde", ellipsis: "Outros" };
  const displayedItems = kind === "categories" ? (items as Category[]).flatMap((item, _, all) =>
    item.parentId && all.some((parent) => parent.id === item.parentId) ? [] : [item, ...all.filter((child) => child.parentId === item.id)]) : items;

  function openCreate() {
    setEditingCategory(null); setEditingAccount(null); setName(""); setAmount(""); setType("expense"); setParentId(null);
    setCategoryColor(colors.accent); setAccountColor(colors.accent); setOpeningNegative(false); setCategoryIcon("tag"); setChoice(typeOptions[0] ?? ""); setOpen(true);
  }

  function openAccountEdit(account: Account) {
    setEditingAccount(account); setName(account.name); setAmount(formatCentsToBRL(Math.abs(account.openingBalanceCents)));
    setOpeningNegative(account.openingBalanceCents < 0); setChoice(account.type); setAccountColor(account.color); setOpen(true);
  }

  function openCategoryEdit(category: Category) {
    setEditingCategory(category); setName(category.name); setType(category.type); setParentId(category.parentId);
    setCategoryColor(category.color); setCategoryIcon(category.icon); setOpen(true);
  }

  function chooseOption(option: string) {
    if (kind === "categories") {
      if (!editingCategory) { setType(option); setParentId(null); }
    } else if (kind === "schedules") setFrequency(option as Schedule["frequency"]);
    else setChoice(option);
  }

  async function save() {
    if (!name.trim()) return;
    const cents = parseCurrencyToCents(amount) ?? 0;
    try {
      if (kind === "accounts") {
        const openingBalanceCents = openingNegative ? -cents : cents;
        if (editingAccount) await updateAccount(db, editingAccount.id, { name, type: choice as Account["type"], color: accountColor, openingBalanceCents });
        else await createAccount(db, { name, type: choice as Account["type"], color: accountColor, openingBalanceCents });
      }
      else if (kind === "goals") {
        if (cents <= 0) return;
        await createGoal(db, { name, type: choice as Goal["type"], targetCents: cents, color: colors.accent });
      } else if (kind === "loans") {
        if (cents <= 0) return;
        const accounts = await listAccounts(db);
        const accountId = accounts.find((account) => account.isPrimary)?.id ?? accounts[0]?.id;
        if (!accountId) throw new Error("Crie uma conta antes.");
        await createLoan(db, { name, direction: choice as Loan["direction"], principalCents: cents, color: colors.accent, accountId });
      } else if (kind === "schedules") {
        if (cents <= 0) return;
        const accounts = await listAccounts(db); const accountId = accounts[0]?.id;
        if (!accountId) throw new Error("Crie uma conta antes.");
        await createSchedule(db, { title: name, type: type as Schedule["type"], amountCents: cents, accountId, categoryId, frequency, nextAt: Date.now(), isSubscription });
      } else {
        if (editingCategory) await updateCategory(db, editingCategory.id, { name, icon: categoryIcon, color: categoryColor, parentId });
        else await createCategory(db, { name, type: type as Category["type"], icon: categoryIcon, color: categoryColor, parentId });
      }
    setName(""); setAmount(""); setChoice(typeOptions[0] ?? ""); setFrequency("monthly"); setIsSubscription(false); setEditingCategory(null); setEditingAccount(null); setOpen(false); await load();
    } catch (error) { Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente."); }
  }

  async function archive(item: Entry) {
    if (kind === "accounts" && (item as Account).isPrimary) { Alert.alert("Conta principal", "Escolha outra conta como principal antes de arquivar."); return; }
    Alert.alert("Arquivar item?", "Ele deixa de aparecer nas listas, mas os lançamentos existentes continuam preservados.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Arquivar", onPress: () => { void (async () => {
        const id = item.id;
        const table = kind === "accounts" ? "accounts" : kind === "goals" ? "goals" : kind === "loans" ? "loans" : kind === "schedules" ? "schedules" : "categories";
        const flag = kind === "schedules" ? "is_active" : kind === "categories" ? "is_active" : "is_archived";
        const value = kind === "schedules" || kind === "categories" ? 0 : 1;
        if (kind === "categories") await archiveCategory(db, id);
        else if (kind === "accounts") await archiveAccount(db, id);
        else await db.runAsync(`UPDATE ${table} SET ${flag} = ? WHERE id = ?`, value, id);
        await load();
      })(); } },
    ]);
  }

  function openActions(item: Entry) {
    if (kind !== "accounts") { archive(item); return; }
    const account = item as Account;
    Alert.alert(account.name, account.isPrimary ? "Esta é sua conta principal." : "Escolha uma ação para esta conta.", [
      { text: "Cancelar", style: "cancel" },
      ...(!account.isPrimary ? [{ text: "Tornar principal", onPress: () => { void setPrimaryAccount(db, account.id).then(load).catch((error: unknown) => Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Tente novamente.")); } }] : []),
      { text: "Arquivar", style: "destructive", onPress: () => archive(account) },
    ]);
  }

  function detail(item: Entry) {
    if (kind === "accounts") { const value = item as Account; return `${formatCentsToBRL(value.balanceCents)} · ${value.currency}${value.isPrimary ? " · Principal" : ""}`; }
    if (kind === "goals") { const value = item as Goal; return `${formatCentsToBRL(value.progressCents)} de ${formatCentsToBRL(value.targetCents)}`; }
    if (kind === "loans") { const value = item as Loan; return `${value.direction === "lent" ? "A receber" : "A pagar"} · ${formatCentsToBRL(value.remainingCents)} restantes`; }
    if (kind === "schedules") { const value = item as Schedule; return `${formatCentsToBRL(value.amountCents)} · ${value.isSubscription ? "Assinatura" : value.frequency === "monthly" ? "Mensal" : value.frequency === "weekly" ? "Semanal" : value.frequency === "yearly" ? "Anual" : "Única"}`; }
    const category = item as Category;
    const parent = categories.find((candidate) => candidate.id === category.parentId);
    return `${category.type === "income" ? "Receita" : "Despesa"}${parent ? ` · ${parent.name}` : ""}`;
  }

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <View style={styles.header}><View><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, { color: colors.accent }]}>‹ Mais</Text></Pressable><Text style={[styles.title, { color: colors.text }]}>{title}</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>{items.length} {items.length === 1 ? "item" : "itens"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${title}`} onPress={openCreate} style={[styles.add, { backgroundColor: colors.surfaceStrong }]}><Plus color={colors.text} size={21} /></Pressable></View>
    <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{displayedItems.length === 0 ? <View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum item cadastrado</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Adicione seu primeiro item para começar a acompanhar.</Text></View> : displayedItems.map((item, index) => <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }, index === displayedItems.length - 1 && { borderBottomWidth: 0 }]}>
      <Pressable accessibilityRole="button" onPress={kind === "categories" ? () => openCategoryEdit(item as Category) : kind === "accounts" ? () => openAccountEdit(item as Account) : kind === "goals" || kind === "loans" ? () => router.push(`/tracker/${kind}/${item.id}`) : () => openActions(item)} onLongPress={() => archive(item)} style={styles.rowMain}>
        <View style={[styles.dot, { backgroundColor: "color" in item ? item.color : colors.accent }, kind === "categories" && (item as Category).parentId ? styles.childDot : null]} />
        <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{"title" in item ? item.title : item.name}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{detail(item)}</Text></View>
      </Pressable>
      {kind === "categories" && <><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${(item as Category).name} para cima`} onPress={() => { void moveCategory(db, item.id, -1).then(load); }} style={styles.move}><ChevronUp color={colors.textMuted} size={18} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${(item as Category).name} para baixo`} onPress={() => { void moveCategory(db, item.id, 1).then(load); }} style={styles.move}><ChevronDown color={colors.textMuted} size={18} /></Pressable></>}
      {kind === "accounts" && !(item as Account).isPrimary && <><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${(item as Account).name} para cima`} onPress={() => { void moveAccount(db, item.id, -1).then(load); }} style={styles.move}><ChevronUp color={colors.textMuted} size={18} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${(item as Account).name} para baixo`} onPress={() => { void moveAccount(db, item.id, 1).then(load); }} style={styles.move}><ChevronDown color={colors.textMuted} size={18} /></Pressable></>}
      <Pressable accessibilityRole="button" accessibilityLabel={`Opções de ${"title" in item ? item.title : item.name}`} onPress={() => openActions(item)}><Text style={[styles.more, { color: colors.textMuted }]}>•••</Text></Pressable>
    </View>)}</View>
    <Text style={[styles.hint, { color: colors.textMuted }]}>Toque em ••• para ver as ações disponíveis.</Text>
  </Screen></ScrollView><BottomNav />
  <Modal visible={open} animationType={reduceMotion === false ? "slide" : "fade"} transparent onRequestClose={() => setOpen(false)}><View style={styles.scrim}><ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{editingCategory ? "Editar categoria" : editingAccount ? "Editar conta" : "Novo item"}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)}><X color={colors.textMuted} size={22} /></Pressable></View>
    <Text style={[styles.label, { color: colors.textMuted }]}>NOME</Text><TextInput accessibilityLabel="Nome" placeholder="Nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
    {(kind !== "categories") && <><Text style={[styles.label, { color: colors.textMuted }]}>{kind === "accounts" ? "SALDO INICIAL" : "VALOR"}</Text><TextInput accessibilityLabel="Valor" keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} /></>}
    {kind === "accounts" && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: openingNegative }} onPress={() => setOpeningNegative((value) => !value)} style={styles.subscriptionToggle}><View style={[styles.checkbox, { borderColor: openingNegative ? colors.accent : colors.border, backgroundColor: openingNegative ? colors.accent : "transparent" }]} /><Text style={{ color: colors.text, fontSize: 13 }}>Saldo inicial negativo</Text></Pressable>}
    <Text style={[styles.label, { color: colors.textMuted }]}>{kind === "schedules" ? "FREQUÊNCIA" : kind === "accounts" ? "TIPO DE CONTA" : kind === "loans" ? "DIREÇÃO" : kind === "goals" ? "TIPO DE META" : "TIPO"}</Text>
    <View style={styles.choices}>{typeOptions.map((option) => <Pressable key={option} onPress={() => chooseOption(option)} style={[styles.choice, { borderColor: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accent : colors.border, backgroundColor: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accentSoft : colors.background }]}><Text style={{ color: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "700" }}>{typeLabels[option] ?? option}</Text></Pressable>)}</View>
    {kind === "accounts" && <><Text style={[styles.label, { color: colors.textMuted }]}>COR</Text><View style={styles.choices}>{categoryColors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ selected: accountColor === color }} accessibilityLabel={`Cor ${color}`} onPress={() => setAccountColor(color)} style={[styles.colorChoice, { backgroundColor: color, borderColor: accountColor === color ? colors.text : "transparent" }]} />)}</View></>}
    {kind === "categories" && <><Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIA PAI</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}><Pressable onPress={() => setParentId(null)} style={[styles.choice, { borderColor: parentId ? colors.border : colors.accent }]}><Text style={{ color: parentId ? colors.textMuted : colors.accent }}>Nenhuma</Text></Pressable>{categories.filter((candidate) => candidate.type === type && !candidate.parentId && candidate.id !== editingCategory?.id).map((candidate) => <Pressable key={candidate.id} onPress={() => setParentId(candidate.id)} style={[styles.choice, { borderColor: parentId === candidate.id ? colors.accent : colors.border }]}><Text style={{ color: parentId === candidate.id ? colors.accent : colors.textMuted }}>{candidate.name}</Text></Pressable>)}</ScrollView>
      <Text style={[styles.label, { color: colors.textMuted }]}>COR</Text><View style={styles.choices}>{categoryColors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ selected: categoryColor === color }} accessibilityLabel={`Cor ${color}`} onPress={() => setCategoryColor(color)} style={[styles.colorChoice, { backgroundColor: color, borderColor: categoryColor === color ? colors.text : "transparent" }]} />)}</View>
      <Text style={[styles.label, { color: colors.textMuted }]}>ÍCONE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{categoryIcons.map((icon) => <Pressable key={icon} onPress={() => setCategoryIcon(icon)} style={[styles.choice, { borderColor: categoryIcon === icon ? colors.accent : colors.border }]}><Text style={{ color: categoryIcon === icon ? colors.accent : colors.textMuted, fontSize: 12 }}>{categoryIconLabels[icon]}</Text></Pressable>)}</ScrollView></>}
    {kind === "schedules" && <><Text style={[styles.label, { color: colors.textMuted }]}>TIPO</Text><View style={styles.choices}>{(["expense", "income"] as const).map((option) => <Pressable key={option} onPress={() => setType(option)} style={[styles.choice, { borderColor: type === option ? colors.accent : colors.border, backgroundColor: type === option ? colors.accentSoft : colors.background }]}><Text style={{ color: type === option ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "700" }}>{typeLabels[option]}</Text></Pressable>)}</View></>}
    {kind === "schedules" && <><Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIA</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{categories.filter((c) => c.type === type).map((c) => <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.choice, { borderColor: categoryId === c.id ? colors.accent : colors.border }]}><Text style={{ color: categoryId === c.id ? colors.accent : colors.textMuted, fontSize: 12 }}>{c.name}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isSubscription }} onPress={() => setIsSubscription((value) => !value)} style={styles.subscriptionToggle}><View style={[styles.checkbox, { borderColor: isSubscription ? colors.accent : colors.border, backgroundColor: isSubscription ? colors.accent : "transparent" }]} /><Text style={{ color: colors.text, fontSize: 13 }}>Marcar como assinatura</Text></Pressable></>}
    <PrimaryButton onPress={() => void save()} style={styles.save}>Salvar</PrimaryButton>
  </ScrollView></View></Modal></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 24 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, back: { fontSize: 13, marginBottom: 8 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, subtitle: { fontSize: 13, marginTop: 4 }, add: { width: 46, height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, overflow: "hidden" }, row: { minHeight: 76, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12 }, rowMain: { flex: 1, minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 }, dot: { width: 40, height: 40, borderRadius: 20 }, childDot: { width: 30, height: 30, borderRadius: 15, marginLeft: 10 }, rowTitle: { fontSize: 15, fontWeight: "700" }, rowMeta: { fontSize: 12, marginTop: 4 }, more: { padding: 8, fontSize: 15, fontWeight: "800" }, move: { minWidth: 24, minHeight: 40, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 180, alignItems: "center", justifyContent: "center", padding: 24 }, emptyTitle: { fontSize: 16, fontWeight: "700" }, emptyText: { color: "#9AAABC", textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 8 }, hint: { textAlign: "center", fontSize: 11, marginTop: 12 },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" }, sheet: { maxHeight: "90%", borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, sheetTitle: { fontSize: 20, fontWeight: "700" }, label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 14, marginBottom: 8 }, input: { height: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { minHeight: 40, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }, colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 }, subscriptionToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 }, checkbox: { width: 18, height: 18, borderWidth: 1, borderRadius: 5 }, save: { marginTop: 22 },
});
