import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../src/components/CategorySelector";
import { AccountSelector } from "../src/components/AccountSelector";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { Label, PrimaryButton, QuietButton, Reveal, Screen } from "../src/components/ui";
import { listCategories } from "../src/repositories/categoryRepository";
import { createTransaction, suggestCategoryFromHistory } from "../src/repositories/transactionRepository";
import type { Category, TransactionType } from "../src/types/category";
import { radius, useAppColors } from "../src/theme";
import { validateTransactionDraft } from "../src/utils/validation";
import { recordQuickEntryOpened } from "../src/services/assistantService";
import { getBankSuggestion, markBankSuggestionHandled } from "../src/services/bankNotificationService";
import { listAccounts, listGoals, listLoans } from "../src/repositories/financeRepository";
import type { Account } from "../src/types/finance";
import type { Goal, Loan } from "../src/types/finance";

export default function QuickEntryScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const params = useLocalSearchParams<{ assistant?: string; bankSuggestion?: string; loanId?: string; goalId?: string }>();
  const [type, setType] = useState<TransactionType>("expense");
  const [amountCents, setAmountCents] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]); const [loans, setLoans] = useState<Loan[]>([]);
  const [linkedId, setLinkedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(Date.now());
  const [suggestionId, setSuggestionId] = useState<string | null>(null);
  const [categorySuggested, setCategorySuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const categoryTouchedRef = useRef(false);

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
    setAmountCents(suggestion.amountCents);
    setCategoryId(suggestion.type === "income" ? "outros-receita" : "outros-despesa");
    setDescription(suggestion.description);
    setOccurredAt(suggestion.occurredAt);
    void suggestCategoryFromHistory(db, suggestion.type, suggestion.description).then((category) => {
      if (active && category && !categoryTouchedRef.current) {
        setCategoryId(category);
        setCategorySuggested(true);
      }
    }).catch(() => { /* Keep Outros when local history is unavailable. */ });
    return () => { active = false; };
  }, [db, params.bankSuggestion]);

  useEffect(() => {
    let active = true;
    void listCategories(db, type).then((next) => {
      if (!active) return;
      setCategories(next);
      setCategoryId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    });
    return () => { active = false; };
  }, [db, type]);

  useEffect(() => {
    let active = true;
    void listAccounts(db).then((next) => {
      if (!active) return;
      setAccounts(next);
      setAccountId((current) => next.some((item) => item.id === current) ? current : next.find((item) => item.isPrimary)?.id ?? next[0]?.id ?? null);
    });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    let active = true;
    void Promise.all([listGoals(db), listLoans(db)]).then(([nextGoals, nextLoans]) => {
      if (!active) return;
      setGoals(nextGoals); setLoans(nextLoans);
    });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    if (params.loanId) {
      const loan = loans.find((item) => item.id === params.loanId);
      if (!loan) return;
      setLinkedId(`loan:${loan.id}`);
      setType(loan.direction === "lent" ? "income" : "expense");
      setAmountCents(loan.remainingCents);
      setDescription(`Pagamento de ${loan.name}`);
    } else if (params.goalId) {
      const goal = goals.find((item) => item.id === params.goalId);
      if (!goal) return;
      setLinkedId(`goal:${goal.id}`);
      setType(goal.type);
      setAmountCents(Math.max(0, goal.targetCents - goal.progressCents));
      setDescription(goal.name);
    }
  }, [goals, loans, params.goalId, params.loanId]);

  async function save() {
    if (savingRef.current) return;
    const linkedGoal = linkedId?.startsWith("goal:") ? linkedId.slice(5) : null;
    const linkedLoan = linkedId?.startsWith("loan:") ? linkedId.slice(5) : null;
    const draft = { type, amountCents, categoryId: categoryId ?? "", accountId: accountId ?? "principal", goalId: linkedGoal, loanId: linkedLoan, description, title: description, occurredAt: suggestionId ? occurredAt : Date.now() };
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
    } catch {
      Alert.alert("Não foi possível salvar", "Tente novamente. O lançamento não foi alterado.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <View style={styles.top}>
            <QuietButton accessibilityLabel="Voltar" onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton>
            <View style={styles.topCopy}>
              <Text style={[styles.topTitle, { color: colors.text }]}>Novo lançamento</Text>
              <Text style={[styles.topSubtitle, { color: colors.textMuted }]}>{suggestionId ? "Sugestão do banco · confira antes de salvar" : "Registre em poucos segundos"}</Text>
            </View>
            <View style={styles.topSpacer} />
          </View>

          <View style={styles.section}>
            <Label>Conta</Label>
            <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
          </View>

          {(goals.length > 0 || loans.length > 0) && <View style={styles.section}>
            <Label>Vincular a uma meta ou empréstimo <Text style={styles.optional}>(opcional)</Text></Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linkRow}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: linkedId === null }} onPress={() => setLinkedId(null)} style={[styles.linkOption, { backgroundColor: linkedId === null ? colors.accentSoft : colors.surface, borderColor: linkedId === null ? colors.accent : colors.border }]}><Text style={[styles.linkText, { color: linkedId === null ? colors.accent : colors.textMuted }]}>Nenhum</Text></Pressable>
              {goals.map((goal) => { const id = `goal:${goal.id}`; const selected = linkedId === id; return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setLinkedId(id)} style={[styles.linkOption, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><Text style={[styles.linkText, { color: selected ? colors.accent : colors.textMuted }]}>{goal.name}</Text></Pressable>; })}
              {loans.map((loan) => { const id = `loan:${loan.id}`; const selected = linkedId === id; return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setLinkedId(id)} style={[styles.linkOption, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><Text style={[styles.linkText, { color: selected ? colors.accent : colors.textMuted }]}>{loan.name}</Text></Pressable>; })}
            </ScrollView>
          </View>}

          <Reveal>
            <View accessibilityRole="tablist" style={[styles.typeSwitch, { backgroundColor: colors.surfaceMuted }]}>
              {(["expense", "income"] as const).map((item) => {
                const selected = type === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => { categoryTouchedRef.current = true; setCategorySuggested(false); setType(item); void Haptics.selectionAsync(); }}
                    style={({ pressed }) => [styles.typeButton, { backgroundColor: selected ? colors.surface : "transparent", borderColor: selected ? colors.border : "transparent", opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.typeText, { color: selected ? colors.text : colors.textMuted }]}>{item === "expense" ? "Despesa" : "Receita"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Reveal>

          <Reveal delay={45}>
            <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Label>Valor</Label>
              <CurrencyInput value={amountCents} onChange={setAmountCents} autoFocus />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Use apenas números — os centavos entram automaticamente.</Text>
            </View>
          </Reveal>

          <View style={styles.section}>
            <Label>Categoria</Label>
            <CategorySelector categories={categories} selectedId={categoryId} onSelect={(id) => { categoryTouchedRef.current = true; setCategorySuggested(false); setCategoryId(id); void Haptics.selectionAsync(); }} />
            {categorySuggested && <Text style={[styles.hint, { color: colors.textMuted }]}>Categoria sugerida pelo seu histórico. Confira antes de salvar.</Text>}
          </View>

          <View style={styles.section}>
            <Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                accessibilityLabel="Descrição opcional"
                placeholder="Ex.: almoço com a equipe"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={80}
                returnKeyType="done"
                style={[styles.descriptionInput, { color: colors.text }]}
              />
              <Text style={[styles.counter, { color: colors.textMuted }]}>{description.length}/80</Text>
            </View>
          </View>

          <PrimaryButton disabled={saving} accessibilityLabel="Salvar lançamento" onPress={() => void save()} style={styles.save}>
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
  top: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  topCopy: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 17, fontWeight: "700" },
  topSubtitle: { fontSize: 12, marginTop: 3 },
  topSpacer: { width: 44 },
  typeSwitch: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginBottom: 16 },
  typeButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  typeText: { fontSize: 14, fontWeight: "700" },
  amountCard: { borderWidth: 1, borderRadius: radius.lg, padding: 18, alignItems: "center" },
  hint: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  section: { marginTop: 26, gap: 10 },
  optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" },
  inputWrap: { minHeight: 58, borderWidth: 1, borderRadius: radius.md, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  descriptionInput: { flex: 1, minHeight: 56, fontSize: 15 },
  counter: { fontSize: 11, marginLeft: 8 },
  save: { marginTop: 30 },
  linkRow: { gap: 8 }, linkOption: { minHeight: 40, borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" }, linkText: { fontSize: 12, fontWeight: "700" },
});
