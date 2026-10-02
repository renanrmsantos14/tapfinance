import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../../src/components/Text";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react-native";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../../src/components/BottomNav";
import { AccountSelector } from "../../src/components/AccountSelector";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { SelectionChoice } from "../../src/components/SelectionChoice";
import { EmptyState, FormHeader, PrimaryButton, QuietButton, Screen, useReducedMotion } from "../../src/components/ui";
import { archiveAccount, createAccount, createGoal, createLoan, createSchedule, deleteSchedule, moveAccount, restoreAccount, setPrimaryAccount, setScheduleActive, setTrackerArchived, updateAccount, updateSchedule } from "../../src/repositories/financeRepository";
import { archiveCategory, createCategory, moveCategory, restoreCategory, updateCategory } from "../../src/repositories/categoryRepository";
import type { Account, Goal, Loan, Schedule } from "../../src/types/finance";
import type { Category } from "../../src/types/category";
import { radius, useAppColors } from "../../src/theme";
import { formatCentsByCurrency, formatCentsToBRL, parseCurrencyToCents } from "../../src/utils/currency";
import { formatDate, parseDateInput } from "../../src/utils/dates";
import { loadCollectionSnapshot } from "../../src/services/collectionService";

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(formatDate(Date.now()));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleActions, setScheduleActions] = useState<Schedule | null>(null);
  const [accountActions, setAccountActions] = useState<Account | null>(null);
  const [updateFuturePending, setUpdateFuturePending] = useState(false);
  const [changingSchedule, setChangingSchedule] = useState(false);
  const scheduleChangeInProgress = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [changingCatalog, setChangingCatalog] = useState(false);
  const catalogChangeInProgress = useRef(false);
  const loadSequence = useRef(0);
  const focused = useRef(false);

  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++loadSequence.current;
    setLoading(true); setLoadError(null);
    try {
      const next = await loadCollectionSnapshot(db, kind);
      if (request !== loadSequence.current) return;
      setItems(next.items); setCategories(next.categories); setAccounts(next.accounts);
    } catch (error) { if (request === loadSequence.current) setLoadError(error instanceof Error ? error.message : "Tente novamente."); }
    finally { if (request === loadSequence.current) setLoading(false); }
  }, [db, kind]);
  useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; loadSequence.current += 1; }; }, [load]));

  const title = labels[kind];
  const typeOptions = useMemo(() => kind === "accounts" ? ["checking", "cash", "savings", "credit", "investment"] : kind === "loans" ? ["lent", "borrowed"] : kind === "goals" ? ["income", "expense"] : kind === "schedules" ? ["monthly", "weekly", "yearly", "once"] : ["expense", "income"], [kind]);
  const typeLabels: Record<string, string> = { checking: "Conta", cash: "Dinheiro", savings: "Poupança", credit: "Crédito", investment: "Investimento", lent: "A receber", borrowed: "A pagar", income: "Receita", expense: "Despesa", monthly: "Mensal", weekly: "Semanal", yearly: "Anual", once: "Única" };
  const categoryColors = [colors.accent, colors.positive, colors.negative, colors.warning, "#B9A0E8", "#69C5C8"];
  const categoryIcons = ["tag", "utensils", "car", "house", "shopping-bag", "briefcase-business", "heart-pulse", "ellipsis"];
  const categoryIconLabels: Record<string, string> = { tag: "Etiqueta", utensils: "Comida", car: "Carro", house: "Casa", "shopping-bag": "Compras", "briefcase-business": "Trabalho", "heart-pulse": "Saúde", ellipsis: "Outros" };
  const hasArchiveFilter = kind === "accounts" || kind === "categories";
  const isArchived = (item: Entry) => kind === "categories" ? !(item as Category).isActive : (item as Account).isArchived;
  const filteredItems = hasArchiveFilter ? items.filter((item) => isArchived(item) === showArchived) : items;
  const displayedItems = kind === "categories" ? (filteredItems as Category[]).flatMap((item, _, all) =>
    item.parentId && all.some((parent) => parent.id === item.parentId) ? [] : [item, ...all.filter((child) => child.parentId === item.id)]) : filteredItems;
  const busy = saving || changingCatalog || changingSchedule;

  async function runCatalogAction(action: () => Promise<void>) {
    if (catalogChangeInProgress.current) return;
    catalogChangeInProgress.current = true; setChangingCatalog(true);
    try { await action(); await load(); }
    catch (error) { Alert.alert("Não foi possível atualizar o cadastro", error instanceof Error ? error.message : "Tente novamente."); }
    finally { catalogChangeInProgress.current = false; setChangingCatalog(false); }
  }

  function openCreate() {
    if (loading || loadError || catalogChangeInProgress.current || saveInProgress.current) return;
    setEditingSchedule(null); setUpdateFuturePending(false);
    setEditingCategory(null); setEditingAccount(null); setName(""); setAmount(""); setType("expense"); setParentId(null);
    setCategoryId(categories.find((category) => category.id === "outros-despesa")?.id ?? categories.find((category) => category.type === "expense")?.id ?? "");
    setFrequency("monthly"); setIsSubscription(false); setDateInput(kind === "schedules" ? formatDate(Date.now()) : ""); setFormError(null);
    setAccountId(accounts.find((account) => account.isPrimary)?.id ?? accounts[0]?.id ?? null);
    setCategoryColor(colors.accent); setAccountColor(colors.accent); setOpeningNegative(false); setCategoryIcon("tag"); setChoice(typeOptions[0] ?? ""); setOpen(true);
  }

  function openScheduleEdit(schedule: Schedule) {
    setScheduleActions(null); setEditingSchedule(schedule); setUpdateFuturePending(false); setFormError(null);
    setName(schedule.title); setAmount(formatCentsToBRL(schedule.amountCents)); setType(schedule.type);
    setAccountId(schedule.accountId); setCategoryId(schedule.categoryId); setFrequency(schedule.frequency);
    setIsSubscription(schedule.isSubscription); setDateInput(formatDate(schedule.nextAt)); setOpen(true);
  }

  async function runScheduleAction(action: () => Promise<void>) {
    if (scheduleChangeInProgress.current) return;
    scheduleChangeInProgress.current = true; setChangingSchedule(true);
    try { await action(); await load(); }
    catch (error) { Alert.alert("Não foi possível atualizar a recorrência", error instanceof Error ? error.message : "Tente novamente."); }
    finally { scheduleChangeInProgress.current = false; setChangingSchedule(false); }
  }

  function confirmScheduleState(schedule: Schedule) {
    setScheduleActions(null);
    Alert.alert(schedule.isActive ? "Pausar recorrência?" : "Retomar recorrência?", `${schedule.title}: ${schedule.isActive ? "novas ocorrências não serão geradas" : "novas ocorrências voltarão a ser geradas, inclusive atrasadas"}. Lançamentos já existentes permanecem sem alteração.`, [
      { text: "Cancelar", style: "cancel" },
      { text: schedule.isActive ? "Pausar" : "Retomar", onPress: () => { void runScheduleAction(() => setScheduleActive(db, schedule.id, !schedule.isActive)); } },
    ]);
  }

  function confirmScheduleDelete(schedule: Schedule) {
    setScheduleActions(null);
    Alert.alert("Excluir recorrência?", `${schedule.title} (${formatCentsToBRL(schedule.amountCents)}): a regra será removida definitivamente. Todos os lançamentos pagos e pendentes serão preservados, sem vínculo com a recorrência.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir regra", style: "destructive", onPress: () => { void runScheduleAction(() => deleteSchedule(db, schedule.id)); } },
    ]);
  }

  function openAccountEdit(account: Account) {
    setFormError(null);
    setEditingAccount(account); setName(account.name); setAmount(formatCentsToBRL(Math.abs(account.openingBalanceCents)));
    setOpeningNegative(account.openingBalanceCents < 0); setChoice(account.type); setAccountColor(account.color); setOpen(true);
  }

  function openCategoryEdit(category: Category) {
    setFormError(null);
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
    if (saveInProgress.current) return;
    setFormError(null);
    if (!name.trim()) { setFormError("Informe um nome."); return; }
    const cents = kind === "categories" ? 0 : kind === "accounts" && !amount.trim() ? 0 : parseCurrencyToCents(amount);
    if (cents === null || (kind !== "accounts" && kind !== "categories" && cents <= 0)) { setFormError("Informe um valor válido maior que zero."); return; }
    const hasDate = kind === "schedules" || ((kind === "goals" || kind === "loans") && !!dateInput.trim());
    const nextAt = hasDate ? parseDateInput(dateInput) : null;
    if (hasDate && nextAt === null) { setFormError("Informe uma data válida no formato DD/MM/AAAA."); return; }
    saveInProgress.current = true; setSaving(true);
    try {
      if (kind === "accounts") {
        const openingBalanceCents = openingNegative ? -cents : cents;
        if (editingAccount) await updateAccount(db, editingAccount.id, { name, type: choice as Account["type"], color: accountColor, openingBalanceCents });
        else await createAccount(db, { name, type: choice as Account["type"], color: accountColor, openingBalanceCents });
      }
      else if (kind === "goals") {
        await createGoal(db, { name, type: choice as Goal["type"], targetCents: cents, color: colors.accent, dueAt: nextAt });
      } else if (kind === "loans") {
        if (!accountId) throw new Error("Selecione uma conta antes de salvar.");
        await createLoan(db, { name, direction: choice as Loan["direction"], principalCents: cents, color: colors.accent, accountId, dueAt: nextAt });
      } else if (kind === "schedules") {
        if (!accountId) throw new Error("Selecione uma conta antes de salvar.");
        const configuration = { title: name, type: type as Schedule["type"], amountCents: cents, accountId, categoryId, frequency, nextAt: editingSchedule && dateInput === formatDate(editingSchedule.nextAt) ? editingSchedule.nextAt : nextAt!, isSubscription };
        if (editingSchedule) await updateSchedule(db, editingSchedule.id, configuration, { updateFuturePending });
        else await createSchedule(db, configuration);
      } else {
        if (editingCategory) await updateCategory(db, editingCategory.id, { name, icon: categoryIcon, color: categoryColor, parentId });
        else await createCategory(db, { name, type: type as Category["type"], icon: categoryIcon, color: categoryColor, parentId });
      }
    setName(""); setAmount(""); setChoice(typeOptions[0] ?? ""); setFrequency("monthly"); setIsSubscription(false); setEditingCategory(null); setEditingAccount(null); setEditingSchedule(null); setOpen(false); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { saveInProgress.current = false; setSaving(false); }
  }

  async function archive(item: Entry) {
    if (catalogChangeInProgress.current) return;
    if (kind === "schedules") { confirmScheduleState(item as Schedule); return; }
    if (kind === "goals" || kind === "loans") {
      const tracker = item as Goal | Loan;
      Alert.alert(tracker.isArchived ? "Restaurar item?" : "Arquivar item?", `${tracker.name}: lançamentos e saldos serão preservados.`, [
        { text: "Cancelar", style: "cancel" },
        { text: tracker.isArchived ? "Restaurar" : "Arquivar", onPress: () => { void setTrackerArchived(db, kind, tracker.id, !tracker.isArchived).then(load).catch((error: unknown) => Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Tente novamente.")); } },
      ]);
      return;
    }
    if (kind === "accounts" && (item as Account).isPrimary) { Alert.alert("Conta principal", "Escolha outra conta como principal antes de arquivar."); return; }
    const restoring = isArchived(item);
    Alert.alert(restoring ? "Restaurar cadastro?" : "Arquivar cadastro?", `${"title" in item ? item.title : item.name}: ${restoring ? "voltará às listas ativas" : "ficará disponível na lista de arquivados"}. Lançamentos e saldos serão preservados.${kind === "categories" && !restoring ? " Subcategorias serão separadas; restaurar não recria os vínculos removidos." : ""}`, [
      { text: "Cancelar", style: "cancel" },
      { text: restoring ? "Restaurar" : "Arquivar", onPress: () => { void runCatalogAction(() => kind === "categories" ? restoring ? restoreCategory(db, item.id) : archiveCategory(db, item.id) : restoring ? restoreAccount(db, item.id) : archiveAccount(db, item.id)); } },
    ]);
  }

  function openActions(item: Entry) {
    if (changingCatalog) return;
    if (kind === "schedules") { if (!changingSchedule) setScheduleActions(item as Schedule); return; }
    if (kind !== "accounts") { archive(item); return; }
    const account = item as Account;
    if (account.isArchived) { void archive(account); return; }
    setAccountActions(account);
  }

  function detail(item: Entry) {
    if (kind === "accounts") { const value = item as Account; return `${formatCentsByCurrency(value.balanceCents, value.currency)}${value.isPrimary ? " · Principal" : ""}${value.isArchived ? " · Arquivada" : ""}`; }
    if (kind === "goals") { const value = item as Goal; return `${formatCentsToBRL(value.progressCents)} de ${formatCentsToBRL(value.targetCents)}${value.isArchived ? " · Arquivada" : ""}`; }
    if (kind === "loans") { const value = item as Loan; return `${value.direction === "lent" ? "A receber" : "A pagar"} · ${formatCentsToBRL(value.remainingCents)} restantes${value.isArchived ? " · Arquivado" : ""}`; }
    if (kind === "schedules") { const value = item as Schedule; return `${formatCentsToBRL(value.amountCents)} · ${typeLabels[value.frequency]}${value.isSubscription ? " · Assinatura" : ""}\n${value.isActive ? `Novas a partir de ${formatDate(value.nextAt)}` : "Inativa · lançamentos preservados"}`; }
    const category = item as Category;
    const parent = categories.find((candidate) => candidate.id === category.parentId);
    return `${category.type === "income" ? "Receita" : "Despesa"}${parent ? ` · ${parent.name}` : ""}${!category.isActive ? " · Arquivada" : ""}`;
  }

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <View style={styles.header}><View style={styles.headerCopy}><FormHeader title={title} subtitle={loading ? "Carregando…" : loadError ? "Cadastros indisponíveis" : `${items.length} ${items.length === 1 ? "item" : "itens"}`} onBack={() => router.back()} disabled={busy} /></View><QuietButton accessibilityLabel={`Adicionar ${title}`} disabled={loading || !!loadError || busy} onPress={openCreate}><Plus color={colors.text} size={22} /></QuietButton></View>
    {changingSchedule && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, marginBottom: 12 }}>Atualizando recorrência…</Text>}
    {hasArchiveFilter && <View style={[styles.choices, { marginBottom: 16 }]}>{([false, true] as const).map((archived) => <SelectionChoice key={String(archived)} label={`${archived ? "Arquivados" : "Ativos"}${loading || loadError ? "" : ` · ${items.filter((item) => isArchived(item) === archived).length}`}`} selected={showArchived === archived} disabled={busy || loading || !!loadError} onPress={() => setShowArchived(archived)} />)}</View>}
    {changingCatalog && <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, marginBottom: 12 }}>Atualizando cadastro…</Text>}
    <View>{loading ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textMuted, paddingVertical: 24 }}>Carregando…</Text> : loadError ? <EmptyState title="Não foi possível carregar" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /> : displayedItems.length === 0 ? <View style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.text }]}>{hasArchiveFilter && showArchived ? "Nenhum cadastro arquivado" : "Nenhum item ativo"}</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>{hasArchiveFilter && showArchived ? "Cadastros arquivados aparecerão aqui para recuperação." : "Adicione um item ou restaure um cadastro arquivado."}</Text></View> : displayedItems.map((item, index) => <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }, index === displayedItems.length - 1 && { borderBottomWidth: 0 }]}>
      <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={hasArchiveFilter && isArchived(item) ? () => { void archive(item); } : kind === "categories" ? () => openCategoryEdit(item as Category) : kind === "accounts" ? () => openAccountEdit(item as Account) : kind === "schedules" ? () => openScheduleEdit(item as Schedule) : kind === "goals" || kind === "loans" ? () => router.push(`/tracker/${kind}/${item.id}`) : () => openActions(item)} onLongPress={() => { void archive(item); }} style={({ pressed }) => [styles.rowMain, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", opacity: busy ? 0.5 : 1 }]}>
        <View style={[styles.dot, { backgroundColor: "color" in item ? item.color : colors.accent }, kind === "categories" && (item as Category).parentId ? styles.childDot : null]} />
        <View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.rowTitle, { color: colors.text }]}>{"title" in item ? item.title : item.name}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{detail(item)}</Text></View>
      </Pressable>
      <View style={styles.rowActions}>
      {kind === "categories" && (item as Category).isActive && <><QuietButton disabled={busy} accessibilityLabel={`Mover ${(item as Category).name} para cima`} onPress={() => { void runCatalogAction(() => moveCategory(db, item.id, -1)); }}><ChevronUp color={colors.textMuted} size={20} /></QuietButton><QuietButton disabled={busy} accessibilityLabel={`Mover ${(item as Category).name} para baixo`} onPress={() => { void runCatalogAction(() => moveCategory(db, item.id, 1)); }}><ChevronDown color={colors.textMuted} size={20} /></QuietButton></>}
      {kind === "accounts" && !(item as Account).isPrimary && !(item as Account).isArchived && <><QuietButton disabled={busy} accessibilityLabel={`Mover ${(item as Account).name} para cima`} onPress={() => { void runCatalogAction(() => moveAccount(db, item.id, -1)); }}><ChevronUp color={colors.textMuted} size={20} /></QuietButton><QuietButton disabled={busy} accessibilityLabel={`Mover ${(item as Account).name} para baixo`} onPress={() => { void runCatalogAction(() => moveAccount(db, item.id, 1)); }}><ChevronDown color={colors.textMuted} size={20} /></QuietButton></>}
      <QuietButton disabled={busy} accessibilityLabel={`${hasArchiveFilter && isArchived(item) ? "Restaurar" : "Opções de"} ${"title" in item ? item.title : item.name}`} onPress={() => openActions(item)}><Text style={[styles.more, { color: colors.textMuted }]}>{hasArchiveFilter && isArchived(item) ? "↶" : "•••"}</Text></QuietButton>
      </View>
    </View>)}</View>
    <Text style={[styles.hint, { color: colors.textMuted }]}>{hasArchiveFilter && showArchived ? "Toque no cadastro para restaurar. Histórico preservado." : "Toque em ••• para ver as ações disponíveis."}</Text>
  </Screen></ScrollView><BottomNav />
  <Modal visible={open || !!scheduleActions || !!accountActions} animationType={reduceMotion === false ? "slide" : "none"} transparent onRequestClose={() => { if (!saving) { setOpen(false); setScheduleActions(null); setAccountActions(null); } }}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.scrim}>{accountActions ? <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text, flex: 1 }]}>{accountActions.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar opções da conta" onPress={() => setAccountActions(null)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><X color={colors.textMuted} size={22} /></Pressable></View>
    <PrimaryButton onPress={() => { const account = accountActions; setAccountActions(null); openAccountEdit(account); }}>Editar conta</PrimaryButton>
    <Pressable accessibilityRole="button" onPress={() => { const account = accountActions; setAccountActions(null); router.push({ pathname: "/balance-correction", params: { accountId: account.id } }); }} style={styles.scheduleAction}><Text style={{ color: colors.text }}>Corrigir saldo</Text></Pressable>
    {!accountActions.isPrimary && <Pressable accessibilityRole="button" onPress={() => { const account = accountActions; setAccountActions(null); void runCatalogAction(() => setPrimaryAccount(db, account.id)); }} style={styles.scheduleAction}><Text style={{ color: colors.text }}>Tornar principal</Text></Pressable>}
    <Pressable accessibilityRole="button" onPress={() => { const account = accountActions; setAccountActions(null); void archive(account); }} style={styles.scheduleAction}><Text style={{ color: colors.negative }}>Arquivar conta</Text></Pressable>
  </View> : scheduleActions ? <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text, flex: 1 }]}>{scheduleActions?.title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar opções" onPress={() => setScheduleActions(null)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><X color={colors.textMuted} size={22} /></Pressable></View>
    <PrimaryButton onPress={() => { if (scheduleActions) openScheduleEdit(scheduleActions); }}>Editar recorrência</PrimaryButton>
    <Pressable accessibilityRole="button" onPress={() => { if (scheduleActions) confirmScheduleState(scheduleActions); }} style={styles.scheduleAction}><Text style={{ color: colors.text }}>{scheduleActions?.isActive ? "Pausar" : "Retomar"}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => { if (scheduleActions) confirmScheduleDelete(scheduleActions); }} style={styles.scheduleAction}><Text style={{ color: colors.negative }}>Excluir regra</Text></Pressable>
  </View> : <ScrollView keyboardShouldPersistTaps="handled" accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: colors.text }]}>{editingCategory ? "Editar categoria" : editingAccount ? "Editar conta" : editingSchedule ? "Editar recorrência" : kind === "schedules" ? "Nova recorrência" : "Novo item"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar formulário" disabled={saving} onPress={() => setOpen(false)}><X color={colors.textMuted} size={22} /></Pressable></View>
    <Text style={[styles.label, { color: colors.textMuted }]}>NOME</Text><TextInput accessibilityLabel="Nome" placeholder="Nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
    {(kind !== "categories") && <><Text style={[styles.label, { color: colors.textMuted }]}>{kind === "accounts" ? "SALDO INICIAL" : "VALOR"}</Text><CurrencyInput currency={kind === "accounts" ? editingAccount?.currency : kind === "schedules" || kind === "loans" ? accounts.find((account) => account.id === accountId)?.currency : undefined} value={parseCurrencyToCents(amount) ?? 0} onChange={(cents) => setAmount(formatCentsToBRL(cents))} disabled={saving} /></>}
    {(kind === "schedules" || kind === "loans") && <><Text style={[styles.label, { color: colors.textMuted }]}>CONTA</Text><AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} disabled={saving} /></>}
    {(kind === "schedules" || kind === "goals" || kind === "loans") && <><Text style={[styles.label, { color: colors.textMuted }]}>{kind === "schedules" ? editingSchedule ? "PRÓXIMA A GERAR" : "PRIMEIRA OCORRÊNCIA" : "PRAZO (OPCIONAL)"}</Text><TextInput accessibilityLabel={kind === "schedules" ? editingSchedule ? "Data da próxima ocorrência a gerar" : "Data da primeira ocorrência" : "Prazo opcional"} keyboardType="number-pad" placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} value={dateInput} onChangeText={(value) => { const digits = value.replace(/\D/g, "").slice(0, 8); setDateInput(digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`); }} maxLength={10} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} /></>}
    {editingSchedule && <><Text style={{ color: colors.textMuted, lineHeight: 20, marginTop: 12 }}>Alterações valem para novas ocorrências. A data não move lançamentos já gerados. Uma regra inativa continua inativa até você retomá-la.</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: updateFuturePending }} onPress={() => setUpdateFuturePending((value) => !value)} style={styles.subscriptionToggle}><View style={[styles.checkbox, { borderColor: updateFuturePending ? colors.accent : colors.border, backgroundColor: updateFuturePending ? colors.accent : "transparent" }]} /><Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Atualizar também valor, conta, categoria, tipo e título dos pendentes futuros</Text></Pressable><Text style={{ color: colors.textMuted, lineHeight: 20 }}>Pagos, pendentes vencidos, notas e datas existentes serão preservados.</Text></>}
    {kind === "accounts" && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: openingNegative }} onPress={() => setOpeningNegative((value) => !value)} style={styles.subscriptionToggle}><View style={[styles.checkbox, { borderColor: openingNegative ? colors.accent : colors.border, backgroundColor: openingNegative ? colors.accent : "transparent" }]} /><Text style={{ color: colors.text, fontSize: 13 }}>Saldo inicial negativo</Text></Pressable>}
    <Text style={[styles.label, { color: colors.textMuted }]}>{kind === "schedules" ? "FREQUÊNCIA" : kind === "accounts" ? "TIPO DE CONTA" : kind === "loans" ? "DIREÇÃO" : kind === "goals" ? "TIPO DE META" : "TIPO"}</Text>
    <View style={styles.choices}>{typeOptions.map((option) => <Pressable key={option} onPress={() => chooseOption(option)} style={[styles.choice, { borderColor: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accent : colors.border, backgroundColor: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accentSoft : colors.background }]}><Text style={{ color: (kind === "categories" ? type : kind === "schedules" ? frequency : choice) === option ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "700" }}>{typeLabels[option] ?? option}</Text></Pressable>)}</View>
    {kind === "accounts" && <><Text style={[styles.label, { color: colors.textMuted }]}>COR</Text><View style={styles.choices}>{categoryColors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ selected: accountColor === color }} accessibilityLabel={`Cor ${color}`} onPress={() => setAccountColor(color)} style={[styles.colorChoice, { backgroundColor: color, borderColor: accountColor === color ? colors.text : "transparent" }]} />)}</View></>}
    {kind === "categories" && <><Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIA PAI</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}><Pressable onPress={() => setParentId(null)} style={[styles.choice, { borderColor: parentId ? colors.border : colors.accent }]}><Text style={{ color: parentId ? colors.textMuted : colors.accent }}>Nenhuma</Text></Pressable>{categories.filter((candidate) => candidate.type === type && !candidate.parentId && candidate.id !== editingCategory?.id).map((candidate) => <Pressable key={candidate.id} onPress={() => setParentId(candidate.id)} style={[styles.choice, { borderColor: parentId === candidate.id ? colors.accent : colors.border }]}><Text style={{ color: parentId === candidate.id ? colors.accent : colors.textMuted }}>{candidate.name}</Text></Pressable>)}</ScrollView>
      <Text style={[styles.label, { color: colors.textMuted }]}>COR</Text><View style={styles.choices}>{categoryColors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ selected: categoryColor === color }} accessibilityLabel={`Cor ${color}`} onPress={() => setCategoryColor(color)} style={[styles.colorChoice, { backgroundColor: color, borderColor: categoryColor === color ? colors.text : "transparent" }]} />)}</View>
      <Text style={[styles.label, { color: colors.textMuted }]}>ÍCONE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{categoryIcons.map((icon) => <Pressable key={icon} onPress={() => setCategoryIcon(icon)} style={[styles.choice, { borderColor: categoryIcon === icon ? colors.accent : colors.border }]}><Text style={{ color: categoryIcon === icon ? colors.accent : colors.textMuted, fontSize: 12 }}>{categoryIconLabels[icon]}</Text></Pressable>)}</ScrollView></>}
    {kind === "schedules" && <><Text style={[styles.label, { color: colors.textMuted }]}>TIPO</Text><View style={styles.choices}>{(["expense", "income"] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: type === option }} onPress={() => { setType(option); setCategoryId(categories.find((category) => category.type === option)?.id ?? ""); }} style={[styles.choice, { borderColor: type === option ? colors.accent : colors.border, backgroundColor: type === option ? colors.accentSoft : colors.background }]}><Text style={{ color: type === option ? colors.accent : colors.textMuted, fontSize: 12, fontWeight: "700" }}>{typeLabels[option]}</Text></Pressable>)}</View></>}
    {kind === "schedules" && <><Text style={[styles.label, { color: colors.textMuted }]}>CATEGORIA</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>{categories.filter((c) => c.type === type).map((c) => <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.choice, { borderColor: categoryId === c.id ? colors.accent : colors.border }]}><Text style={{ color: categoryId === c.id ? colors.accent : colors.textMuted, fontSize: 12 }}>{c.name}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isSubscription }} onPress={() => setIsSubscription((value) => !value)} style={styles.subscriptionToggle}><View style={[styles.checkbox, { borderColor: isSubscription ? colors.accent : colors.border, backgroundColor: isSubscription ? colors.accent : "transparent" }]} /><Text style={{ color: colors.text, fontSize: 13 }}>Marcar como assinatura</Text></Pressable></>}
    {formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.negative, marginTop: 16, lineHeight: 20 }}>{formError}</Text>}
    <PrimaryButton disabled={saving} onPress={() => void save()} style={styles.save}>{saving ? "Salvando…" : "Salvar"}</PrimaryButton>
  </ScrollView>}</KeyboardAvoidingView></Modal></View>;
}

const styles = StyleSheet.create({
  scheduleAction: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 24 }, header: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, headerCopy: { flex: 1, minWidth: 0 },
  row: { minHeight: 76, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, rowMain: { flexGrow: 1, flexBasis: 160, minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }, rowActions: { flexDirection: "row", marginLeft: "auto" }, dot: { width: 12, height: 12, borderRadius: 6 }, childDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 12 }, rowTitle: { fontSize: 15, lineHeight: 21, fontWeight: "600" }, rowMeta: { fontSize: 13, lineHeight: 19, marginTop: 4 }, more: { fontSize: 15, fontWeight: "600" }, empty: { minHeight: 180, alignItems: "center", justifyContent: "center", padding: 24 }, emptyTitle: { fontSize: 16, fontWeight: "600" }, emptyText: { textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 8 }, hint: { textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: 12 },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" }, sheet: { maxHeight: "90%", borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 }, sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, sheetTitle: { fontSize: 20, fontWeight: "700" }, label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 14, marginBottom: 8 }, input: { height: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, choice: { minHeight: 40, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }, colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 }, subscriptionToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 }, checkbox: { width: 18, height: 18, borderWidth: 1, borderRadius: 5 }, save: { marginTop: 22 },
});
