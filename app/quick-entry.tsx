import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../src/components/Text";
import { CalendarDays, Check, ChevronRight, ListPlus, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategorySelector } from "../src/components/CategorySelector";
import { AccountSelector } from "../src/components/AccountSelector";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { TransactionFormReferenceStatus } from "../src/components/TransactionFormReferenceStatus";
import { TransactionMetadataFields } from "../src/components/TransactionMetadataFields";
import { TransactionDateTimeFields } from "../src/components/TransactionDateTimeFields";
import { TransactionStatusSelector } from "../src/components/TransactionStatusSelector";
import { OptionalReferenceSelector } from "../src/components/OptionalReferenceSelector";
import { formatDate, formatShortDate, formatTime, replaceDateAndTime } from "../src/utils/dates";
import { normalizeTransactionTags } from "../src/utils/transactionTags";
import { IconBox, Label, PrimaryButton, QuietButton } from "../src/components/ui";
import { createTransaction, suggestCategoryFromHistory } from "../src/repositories/transactionRepository";
import type { TransactionType } from "../src/types/category";
import { manrope, radius, type, useAppColors } from "../src/theme";
import { validateTransactionDraft } from "../src/utils/validation";
import { recordQuickEntryOpened } from "../src/services/assistantService";
import { getBankSuggestion, markBankSuggestionHandled } from "../src/services/bankNotificationService";
import { useTransactionFormReferences } from "../src/hooks/useTransactionFormReferences";
import { getTrackerFormPrefill, resolveTransactionFormSelection } from "../src/services/transactionFormService";
import { formatCentsByCurrency } from "../src/utils/currency";

export default function QuickEntryScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ assistant?: string; bankSuggestion?: string; loanId?: string; goalId?: string }>();
  const [type_, setType] = useState<TransactionType>("expense");
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [amountCents, setAmountCents] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [title, setTitle] = useState(""); const titleEdited = useRef(false);
  const [notes, setNotes] = useState(""); const [tags, setTags] = useState<string[]>([]); const [tagInput, setTagInput] = useState("");
  const [occurredAt, setOccurredAt] = useState(Date.now());
  const [dateText, setDateText] = useState(() => formatDate(occurredAt));
  const [timeText, setTimeText] = useState(() => formatTime(occurredAt));
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [categorySuggested, setCategorySuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const categoryTouchedRef = useRef(false);
  const references = useTransactionFormReferences(db, type_);
  const categories = references.data?.categories ?? []; const accounts = references.data?.accounts ?? [];
  const goals = references.data?.goals ?? []; const loans = references.data?.loans ?? [];
  const [prefilledTracker, setPrefilledTracker] = useState<string | null>(null);
  const editedFields = useRef({ type: false, amount: false, description: false });
  const [dismissedTracker, setDismissedTracker] = useState<string | null>(null);
  const requestedTracker = params.loanId ? `loan:${params.loanId}` : params.goalId ? `goal:${params.goalId}` : null;
  const missingRequestedTracker = references.ready && !!requestedTracker && dismissedTracker !== requestedTracker && prefilledTracker !== requestedTracker && !(params.loanId ? loans.some((loan) => loan.id === params.loanId) : goals.some((goal) => goal.id === params.goalId));
  const missingSelectedTracker = references.ready && !!linkedId && !(linkedId.startsWith("loan:") ? loans.some((loan) => `loan:${loan.id}` === linkedId) : goals.some((goal) => `goal:${goal.id}` === linkedId));
  const requestedTrackerReady = !requestedTracker || prefilledTracker === requestedTracker || dismissedTracker === requestedTracker;
  const canSave = references.ready && categories.some((category) => category.id === categoryId) && accounts.some((account) => account.id === accountId) && requestedTrackerReady && !missingSelectedTracker;
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const currency = selectedAccount?.currency ?? "BRL";
  const expense = type_ === "expense";
  const hasDetails = !!description.trim() || !!linkedId || !!title.trim() || !!notes.trim() || tags.length > 0 || !!tagInput.trim();

  useEffect(() => {
    if (params.assistant === "1") recordQuickEntryOpened();
  }, [params.assistant]);

  useEffect(() => {
    let active = true;
    setSuggestionId(null);
    setCategorySuggested(false);
    categoryTouchedRef.current = false;
    if (!params.bankSuggestion) return;
    const suggestion = getBankSuggestion(params.bankSuggestion);
    if (!suggestion) {
      Alert.alert("Sugestão indisponível", "Ela pode ter expirado ou já ter sido usada. Você ainda pode criar um lançamento manual.");
      return;
    }
    setSuggestionId(suggestion.id);
    setType(suggestion.type);
    setStatus("paid");
    setAmountCents(suggestion.amountCents);
    setCategoryId(suggestion.type === "income" ? "outros-receita" : "outros-despesa");
    setDescription(suggestion.description);
    setOccurredAt(suggestion.occurredAt);
    setDateText(formatDate(suggestion.occurredAt)); setTimeText(formatTime(suggestion.occurredAt)); setUseCurrentTime(false);
    void suggestCategoryFromHistory(db, suggestion.type, suggestion.description).then((category) => {
      if (active && category && !categoryTouchedRef.current) {
        setCategoryId(category);
        setCategorySuggested(true);
      }
    }).catch(() => { /* Keep Outros when local history is unavailable. */ });
    return () => { active = false; };
  }, [db, params.bankSuggestion]);

  useEffect(() => {
    if (!references.data) return;
    const data = references.data;
    setCategoryId((current) => resolveTransactionFormSelection(data, current, null).categoryId);
    setAccountId((current) => resolveTransactionFormSelection(data, null, current).accountId);
  }, [references.data]);

  useEffect(() => {
    if (!references.data || !requestedTracker || prefilledTracker === requestedTracker || dismissedTracker === requestedTracker) return;
    const prefill = getTrackerFormPrefill(references.data, params, { type: type_, amountCents, description }, editedFields.current);
    if (!prefill) return;
    setPrefilledTracker(requestedTracker);
    setLinkedId(prefill.linkedId); setType(prefill.type); setAmountCents(prefill.amountCents); setDescription(prefill.description);
  }, [amountCents, description, dismissedTracker, prefilledTracker, references.data, requestedTracker, params.goalId, params.loanId, type_]);

  function selectTracker(id: string | null) {
    setLinkedId(id);
    if (requestedTracker) setDismissedTracker(requestedTracker);
  }

  function useNow() {
    const now = Date.now();
    setOccurredAt(now); setDateText(formatDate(now)); setTimeText(formatTime(now)); setUseCurrentTime(true);
  }

  async function save() {
    if (savingRef.current || !canSave) return;
    const linkedGoal = linkedId?.startsWith("goal:") ? linkedId.slice(5) : null;
    const linkedLoan = linkedId?.startsWith("loan:") ? linkedId.slice(5) : null;
    let nextTags: string[];
    try { nextTags = normalizeTransactionTags([...tags, ...(tagInput.trim() ? [tagInput] : [])]); }
    catch (reason) { Alert.alert("Confira as tags", reason instanceof Error ? reason.message : "Tags inválidas."); return; }
    const selectedTime = useCurrentTime ? Date.now() : replaceDateAndTime(occurredAt, dateText, timeText);
    if (selectedTime === null) { Alert.alert("Confira data e hora", "Use DD/MM/AAAA e HH:mm (00:00 a 23:59). Os campos foram preservados."); setDateOpen(true); return; }
    const draft = { type: type_, status, amountCents, categoryId: categoryId ?? "", accountId: accountId ?? undefined, goalId: linkedGoal, loanId: linkedLoan, description, title: titleEdited.current ? title || null : undefined, notes, tags: nextTags, occurredAt: selectedTime };
    const error = validateTransactionDraft(draft);
    if (error) {
      Alert.alert("Confira o lançamento", error);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await createTransaction(db, draft, suggestionId ?? undefined);
      if (suggestionId) {
        try { markBankSuggestionHandled(suggestionId); } catch { /* SQLite already prevents a second save. */ }
      }
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* Save already succeeded. */ }
      if (params.assistant === "1") router.dismissAll();
      else router.back();
    } catch (error) {
      Alert.alert("Não foi possível salvar", `${error instanceof Error ? error.message : "Tente novamente."} Os campos preenchidos foram preservados.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const saveLabel = saving ? "Salvando…" : `Salvar ${expense ? "despesa" : "receita"}${amountCents > 0 ? ` · ${formatCentsByCurrency(amountCents, currency)}` : ""}`;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <QuietButton framed accessibilityLabel="Fechar" onPress={() => router.back()} disabled={saving}><X color={colors.text} size={18} strokeWidth={2.4} /></QuietButton>
          <View accessibilityRole="tablist" style={[styles.typeSwitch, { backgroundColor: colors.surfaceMuted }]}>
            {(["expense", "income"] as const).map((item) => {
              const selected = type_ === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected, disabled: saving }}
                  disabled={saving}
                  onPress={() => { editedFields.current.type = true; categoryTouchedRef.current = true; setCategorySuggested(false); setType(item); void Haptics.selectionAsync().catch(() => undefined); }}
                  style={({ pressed }) => [styles.typeButton, { backgroundColor: selected ? colors.ink : "transparent", opacity: saving ? 0.5 : pressed ? 0.7 : 1 }]}
                >
                  <Text style={[type.chip, { color: selected ? colors.inkText : colors.textMuted, fontFamily: selected ? manrope.extrabold : manrope.bold }]}>{item === "expense" ? "Despesa" : "Receita"}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ width: 40 }} />
        </View>
        {suggestionId && <Text accessibilityLiveRegion="polite" style={[type.metaStrong, { color: colors.accentText, textAlign: "center", marginBottom: 10 }]}>Sugestão do banco · confira antes de salvar</Text>}

        <TransactionFormReferenceStatus loading={references.loading} error={references.error} onRetry={references.retry} missingAccount={references.ready && accounts.length === 0} missingCategory={references.ready && categories.length === 0} />
        {missingRequestedTracker && <Text accessibilityRole="alert" style={[type.body, { color: colors.warning, marginBottom: 12 }]}>A meta ou empréstimo solicitado não está disponível. Nenhum vínculo será adivinhado; escolha abaixo ou salve sem vínculo.</Text>}

        <View style={[styles.amountTile, { backgroundColor: colors.ink }]}>
          <View style={styles.rowBetween}>
            <Label style={{ color: colors.inkMuted }}>Valor</Label>
            <View style={styles.currencyBadge}><Text style={[type.metaStrong, { color: colors.inkText, fontSize: 11 }]}>{currency}</Text></View>
          </View>
          <CurrencyInput inverted currency={currency} value={amountCents} onChange={(value) => { editedFields.current.amount = true; setAmountCents(value); }} autoFocus disabled={saving} />
          <Text style={[type.meta, { color: colors.inkMuted }]}>Só números. Os centavos entram sozinhos.</Text>
        </View>

        <View style={styles.section}>
          <Label style={styles.sectionLabel}>Conta</Label>
          <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} disabled={saving || !references.ready} />
        </View>

        <View style={styles.section}>
          <View style={styles.rowBetween}><Label style={styles.sectionLabel}>Categoria</Label>{categorySuggested && <Text style={[type.metaStrong, { color: colors.accentText }]}>Sugerida pelo histórico</Text>}</View>
          <CategorySelector categories={categories} selectedId={categoryId} disabled={saving || !references.ready} onSelect={(id) => { categoryTouchedRef.current = true; setCategorySuggested(false); setCategoryId(id); }} />
        </View>

        <View style={styles.section}>
          <TransactionStatusSelector type={type_} status={status} onChange={setStatus} disabled={saving} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: dateOpen, disabled: saving }} accessibilityLabel={`Data e hora: ${useCurrentTime ? "agora" : `${dateText} ${timeText}`}`} disabled={saving} onPress={() => setDateOpen((value) => !value)} style={({ pressed }) => [styles.cardRow, { backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
            <IconBox icon={CalendarDays} color={colors.text} background={colors.surfaceMuted} />
            <View style={styles.cardCopy}><Text style={[type.metaStrong, { color: colors.textMuted, fontSize: 11 }]}>Data e hora</Text><Text style={[type.bodyStrong, { color: colors.text }]}>{useCurrentTime ? `Agora · ${formatShortDate(Date.now())}, ${formatTime(Date.now())}` : `${dateText} · ${timeText}`}</Text></View>
            <Text style={[type.metaStrong, { color: colors.accentText }]}>{dateOpen ? "Ocultar" : "Alterar"}</Text>
          </Pressable>
          {dateOpen && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <TransactionDateTimeFields date={dateText} time={timeText} disabled={saving} onDateChange={(value) => { setUseCurrentTime(false); setDateText(value); }} onTimeChange={(value) => { setUseCurrentTime(false); setTimeText(value); }} />
            <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={useNow} style={styles.inlineAction}><Text style={[type.chip, { color: colors.accentText }]}>Usar agora</Text></Pressable>
          </View>}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: metadataOpen, disabled: saving }} disabled={saving} onPress={() => setMetadataOpen((value) => !value)} style={({ pressed }) => [styles.cardRow, { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
            <IconBox icon={ListPlus} color={colors.text} background={colors.surfaceMuted} />
            <View style={styles.cardCopy}><Text style={[type.bodyStrong, { color: colors.text }]}>Mais detalhes{hasDetails && !metadataOpen ? " · preenchidos" : ""}</Text><Text numberOfLines={1} style={[type.meta, { color: colors.textMuted }]}>Descrição, meta ou empréstimo, título, notas, tags</Text></View>
            <ChevronRight color={colors.textMuted} size={16} strokeWidth={2.4} style={{ transform: [{ rotate: metadataOpen ? "90deg" : "0deg" }] }} />
          </Pressable>
          {metadataOpen && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            <View style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border, opacity: saving ? 0.5 : 1 }]}>
              <View style={styles.rowBetween}><Label>Descrição</Label><Text style={[type.meta, { color: colors.textMuted }]}>{description.length}/80</Text></View>
              <TextInput
                accessibilityLabel="Descrição opcional"
                placeholder="Ex.: almoço com a equipe"
                placeholderTextColor={colors.textMuted}
                value={description}
                editable={!saving}
                accessibilityState={{ disabled: saving }}
                onChangeText={(value) => { editedFields.current.description = true; setDescription(value); }}
                maxLength={80}
                returnKeyType="done"
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            {references.ready && (goals.length > 0 || loans.length > 0 || linkedId !== null) && <OptionalReferenceSelector label="Meta ou empréstimo (opcional)" items={[...goals.map((goal) => ({ id: `goal:${goal.id}`, name: goal.name })), ...loans.map((loan) => ({ id: `loan:${loan.id}`, name: loan.name }))]} selectedId={linkedId} onSelect={selectTracker} disabled={saving} />}
            <TransactionMetadataFields title={title} notes={notes} tags={tags} tagInput={tagInput} disabled={saving} onTitleChange={(value) => { titleEdited.current = true; setTitle(value); }} onNotesChange={setNotes} onTagsChange={setTags} onTagInputChange={setTagInput} />
          </View>}
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton disabled={saving || !canSave} accessibilityLabel="Salvar lançamento" onPress={() => void save()}>
          {saving ? <ActivityIndicator color={colors.accentContrast} /> : <Check color={colors.accentContrast} size={20} strokeWidth={2.6} />}
          {saveLabel}
        </PrimaryButton>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  typeSwitch: { flexDirection: "row", borderRadius: 14, padding: 3, gap: 3 },
  typeButton: { minHeight: 34, minWidth: 96, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  amountTile: { borderRadius: radius.xl, padding: 18, paddingHorizontal: 20, gap: 6 },
  currencyBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  section: { marginTop: 14, gap: 8 }, sectionLabel: { paddingHorizontal: 4 },
  card: { marginTop: 14, borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  cardRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  cardCopy: { flex: 1, minWidth: 0, gap: 1 },
  cardBody: { borderTopWidth: 1, padding: 14, gap: 12 },
  inlineAction: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  field: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  input: { minHeight: 28, padding: 0, fontFamily: manrope.bold, fontSize: 15 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
