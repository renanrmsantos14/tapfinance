import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Check } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../src/components/CategorySelector";
import { AccountSelector } from "../src/components/AccountSelector";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { TransactionFormReferenceStatus } from "../src/components/TransactionFormReferenceStatus";
import { TransactionMetadataFields } from "../src/components/TransactionMetadataFields";
import { TransactionDateTimeFields } from "../src/components/TransactionDateTimeFields";
import { TransactionStatusSelector } from "../src/components/TransactionStatusSelector";
import { OptionalReferenceSelector } from "../src/components/OptionalReferenceSelector";
import { formatDate, formatTime, replaceDateAndTime } from "../src/utils/dates";
import { normalizeTransactionTags } from "../src/utils/transactionTags";
import { FormHeader, Label, PrimaryButton, QuietButton, Reveal, Screen } from "../src/components/ui";
import { createTransaction, suggestCategoryFromHistory } from "../src/repositories/transactionRepository";
import type { TransactionType } from "../src/types/category";
import { radius, useAppColors } from "../src/theme";
import { validateTransactionDraft } from "../src/utils/validation";
import { recordQuickEntryOpened } from "../src/services/assistantService";
import { getBankSuggestion, markBankSuggestionHandled } from "../src/services/bankNotificationService";
import { useTransactionFormReferences } from "../src/hooks/useTransactionFormReferences";
import { getTrackerFormPrefill, resolveTransactionFormSelection } from "../src/services/transactionFormService";

export default function QuickEntryScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const params = useLocalSearchParams<{ assistant?: string; bankSuggestion?: string; loanId?: string; goalId?: string }>();
  const [type, setType] = useState<TransactionType>("expense");
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [amountCents, setAmountCents] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [metadataOpen, setMetadataOpen] = useState(false);
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
  const references = useTransactionFormReferences(db, type);
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
    const prefill = getTrackerFormPrefill(references.data, params, { type, amountCents, description }, editedFields.current);
    if (!prefill) return;
    setPrefilledTracker(requestedTracker);
    setLinkedId(prefill.linkedId); setType(prefill.type); setAmountCents(prefill.amountCents); setDescription(prefill.description);
  }, [amountCents, description, dismissedTracker, prefilledTracker, references.data, requestedTracker, params.goalId, params.loanId, type]);

  function selectTracker(id: string | null) {
    setLinkedId(id);
    if (requestedTracker) setDismissedTracker(requestedTracker);
  }

  async function save() {
    if (savingRef.current || !canSave) return;
    const linkedGoal = linkedId?.startsWith("goal:") ? linkedId.slice(5) : null;
    const linkedLoan = linkedId?.startsWith("loan:") ? linkedId.slice(5) : null;
    let nextTags: string[];
    try { nextTags = normalizeTransactionTags([...tags, ...(tagInput.trim() ? [tagInput] : [])]); }
    catch (reason) { Alert.alert("Confira as tags", reason instanceof Error ? reason.message : "Tags inválidas."); return; }
    const selectedTime = useCurrentTime ? Date.now() : replaceDateAndTime(occurredAt, dateText, timeText);
    if (selectedTime === null) { Alert.alert("Confira data e hora", "Use DD/MM/AAAA e HH:mm (00:00 a 23:59). Os campos foram preservados."); return; }
    const draft = { type, status, amountCents, categoryId: categoryId ?? "", accountId: accountId ?? undefined, goalId: linkedGoal, loanId: linkedLoan, description, title: titleEdited.current ? title || null : undefined, notes, tags: nextTags, occurredAt: selectedTime };
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

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <FormHeader title="Novo lançamento" subtitle={suggestionId ? "Sugestão do banco · confira antes de salvar" : undefined} onBack={() => router.back()} disabled={saving} />

          <TransactionFormReferenceStatus loading={references.loading} error={references.error} onRetry={references.retry} missingAccount={references.ready && accounts.length === 0} missingCategory={references.ready && categories.length === 0} />
          {missingRequestedTracker && <View style={styles.section}><Text accessibilityRole="alert" style={{ color: colors.warning }}>A meta ou empréstimo solicitado não está disponível. Nenhum vínculo será adivinhado.</Text><QuietButton onPress={() => selectTracker(null)}><Text style={{ color: colors.accent }}>Continuar sem vínculo</Text></QuietButton></View>}

          <Reveal>
            <View accessibilityRole="tablist" style={[styles.typeSwitch, { backgroundColor: colors.surfaceMuted }]}>
              {(["expense", "income"] as const).map((item) => {
                const selected = type === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected, disabled: saving }}
                    disabled={saving}
                    onPress={() => { editedFields.current.type = true; categoryTouchedRef.current = true; setCategorySuggested(false); setType(item); void Haptics.selectionAsync().catch(() => undefined); }}
                    style={({ pressed }) => [styles.typeButton, { backgroundColor: selected ? colors.surface : "transparent", borderColor: selected ? colors.border : "transparent", opacity: saving ? 0.5 : pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.typeText, { color: selected ? colors.text : colors.textMuted }]}>{item === "expense" ? "Despesa" : "Receita"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Reveal>

          <Reveal delay={45}>
            <View style={styles.amountCard}>
              <Label>Valor</Label>
              <CurrencyInput currency={accounts.find((account) => account.id === accountId)?.currency} value={amountCents} onChange={(value) => { editedFields.current.amount = true; setAmountCents(value); }} autoFocus disabled={saving} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Use apenas números — os centavos entram automaticamente.</Text>
            </View>
          </Reveal>

          <View style={styles.section}>
            <Label>Conta</Label>
            <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} disabled={saving || !references.ready} />
          </View>

          <View style={styles.section}>
            <Label>Categoria</Label>
            <CategorySelector categories={categories} selectedId={categoryId} disabled={saving || !references.ready} onSelect={(id) => { categoryTouchedRef.current = true; setCategorySuggested(false); setCategoryId(id); void Haptics.selectionAsync().catch(() => undefined); }} />
            {categorySuggested && <Text style={[styles.hint, { color: colors.textMuted }]}>Categoria sugerida pelo seu histórico. Confira antes de salvar.</Text>}
          </View>

          <View style={styles.section}>
            <Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label>
            <View style={[styles.inputWrap, { opacity: saving ? 0.5 : 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                style={[styles.descriptionInput, { color: colors.text }]}
              />
              <Text style={[styles.counter, { color: colors.textMuted }]}>{description.length}/80</Text>
            </View>
          </View>

          {references.ready && (goals.length > 0 || loans.length > 0 || linkedId !== null) && <OptionalReferenceSelector label="Meta ou empréstimo (opcional)" items={[...goals.map((goal) => ({ id: `goal:${goal.id}`, name: `Meta · ${goal.name}` })), ...loans.map((loan) => ({ id: `loan:${loan.id}`, name: `Empréstimo · ${loan.name}` }))]} selectedId={linkedId} onSelect={selectTracker} disabled={saving} />}
          <TransactionStatusSelector type={type} status={status} onChange={setStatus} disabled={saving} />
          <TransactionDateTimeFields date={dateText} time={timeText} disabled={saving} onDateChange={(value) => { setUseCurrentTime(false); setDateText(value); }} onTimeChange={(value) => { setUseCurrentTime(false); setTimeText(value); }} />
          <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => { const now = Date.now(); setOccurredAt(now); setDateText(formatDate(now)); setTimeText(formatTime(now)); setUseCurrentTime(true); }} style={({ pressed }) => ({ minHeight: 48, justifyContent: "center", opacity: saving ? 0.5 : pressed ? 0.7 : 1 })}><Text style={{ color: colors.accent }}>{useCurrentTime ? "Usando o horário atual ao salvar" : "Usar data e hora atuais"}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: metadataOpen, disabled: saving }} disabled={saving} onPress={() => setMetadataOpen((value) => !value)} style={({ pressed }) => ({ minHeight: 48, marginTop: 18, justifyContent: "center", opacity: saving ? 0.5 : pressed ? 0.7 : 1 })}><Text style={{ color: colors.accent }}>{metadataOpen ? "Ocultar detalhes e tags" : "Adicionar título, notas e tags"}</Text></Pressable>
          {metadataOpen && <TransactionMetadataFields title={title} notes={notes} tags={tags} tagInput={tagInput} disabled={saving} onTitleChange={(value) => { titleEdited.current = true; setTitle(value); }} onNotesChange={setNotes} onTagsChange={setTags} onTagInputChange={setTagInput} />}
          <PrimaryButton disabled={saving || !canSave} accessibilityLabel="Salvar lançamento" onPress={() => void save()} style={styles.save}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Check color={colors.background} size={19} />}
            {saving ? "Salvando…" : "Salvar lançamento"}
          </PrimaryButton>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 36 },
  typeSwitch: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginBottom: 16 },
  typeButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  typeText: { fontSize: 14, fontWeight: "700" },
  amountCard: { paddingVertical: 16, alignItems: "center", gap: 8 },
  hint: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  section: { marginTop: 26, gap: 10 },
  optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" },
  inputWrap: { minHeight: 58, borderWidth: 1, borderRadius: radius.md, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  descriptionInput: { flex: 1, minHeight: 56, fontSize: 15 },
  counter: { fontSize: 11, marginLeft: 8 },
  save: { marginTop: 30 },
});
