import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check, Trash2 } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../../src/components/CategorySelector";
import { AccountSelector } from "../../src/components/AccountSelector";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { TransactionFormReferenceStatus } from "../../src/components/TransactionFormReferenceStatus";
import { EmptyState, Label, PrimaryButton, QuietButton, Screen, SkeletonRows } from "../../src/components/ui";
import { deleteTransaction, getTransaction, updateTransaction } from "../../src/repositories/transactionRepository";
import type { TransactionType } from "../../src/types/category";
import type { Transaction } from "../../src/types/transaction";
import { radius, useAppColors } from "../../src/theme";
import { formatDate, replaceDateKeepingTime } from "../../src/utils/dates";
import { formatCentsToBRL } from "../../src/utils/currency";
import { validateTransactionDraft } from "../../src/utils/validation";
import { useTransactionFormReferences } from "../../src/hooks/useTransactionFormReferences";
import { resolveTransactionFormSelection } from "../../src/services/transactionFormService";

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const loadSequence = useRef(0);
  const [type, setType] = useState<TransactionType>("expense");
  const [amountCents, setAmountCents] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null); const [loanId, setLoanId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null); const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [description, setDescription] = useState("");
  const [occurredAtText, setOccurredAtText] = useState(formatDate(Date.now()));
  const references = useTransactionFormReferences(db, type, transaction);
  const categories = references.data?.categories ?? []; const accounts = references.data?.accounts ?? [];
  const canSave = references.ready && categories.some((category) => category.id === categoryId) && accounts.some((account) => account.id === accountId);

  const loadTransaction = useCallback(async () => {
    const request = ++loadSequence.current;
    setLoaded(false); setLoadError(false); setTransaction(null);
    try {
      const item = await getTransaction(db, id);
      if (request !== loadSequence.current) return;
      if (!item) return;
      setTransaction(item);
      setType(item.type);
      setAmountCents(item.amountCents);
      setCategoryId(item.categoryId);
      setAccountId(item.accountId);
      setGoalId(item.goalId); setLoanId(item.loanId);
      setScheduleId(item.scheduleId); setStatus(item.status);
      setDescription(item.description ?? "");
      setOccurredAtText(formatDate(item.occurredAt));
    } catch {
      if (request === loadSequence.current) setLoadError(true);
    } finally {
      if (request === loadSequence.current) setLoaded(true);
    }
  }, [db, id]);

  useEffect(() => { void loadTransaction(); return () => { loadSequence.current += 1; }; }, [loadTransaction]);
  useEffect(() => {
    if (!references.data) return;
    const data = references.data;
    setCategoryId((current) => resolveTransactionFormSelection(data, current, null).categoryId);
    setAccountId((current) => resolveTransactionFormSelection(data, null, current).accountId);
  }, [references.data]);

  const save = useCallback(async () => {
    if (savingRef.current || !transaction || !canSave) return;
    const parsedDate = replaceDateKeepingTime(transaction.occurredAt, occurredAtText);
    if (parsedDate === null) {
      Alert.alert("Confira a data", "Use o formato DD/MM/AAAA.");
      return;
    }
    const draft = { type, amountCents, categoryId: categoryId ?? "", accountId: accountId ?? undefined, goalId, loanId, scheduleId, status, description, notes: transaction.notes, title: description === (transaction.description ?? "") ? transaction.title : description, occurredAt: parsedDate };
    const error = validateTransactionDraft(draft);
    if (error) {
      Alert.alert("Confira o lançamento", error);
      return;
    }
    savingRef.current = true; setSaving(true);
    try {
      await updateTransaction(db, id, draft);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.back();
    } catch (error) {
      Alert.alert("Não foi possível salvar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      savingRef.current = false; setSaving(false);
    }
  }, [accountId, amountCents, canSave, categoryId, db, description, goalId, id, loanId, occurredAtText, scheduleId, status, transaction, type]);

  function confirmDelete() {
    if (savingRef.current) return;
    Alert.alert(transaction?.kind === "transfer" ? "Excluir transferência?" : "Excluir lançamento?", `${transaction?.title || transaction?.description || "Lançamento"} · ${formatCentsToBRL(transaction?.amountCents ?? 0)} · ${transaction?.status === "paid" ? "Pago" : "Pendente"}. ${transaction?.kind === "transfer" ? "As duas movimentações vinculadas serão excluídas." : transaction?.initialLoanId ? "Este é o desembolso inicial. Excluir altera a movimentação da conta, mas não apaga nem quita a dívida do empréstimo." : "A movimentação será removida da conta."} Essa ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => { void (async () => {
        if (savingRef.current) return;
        savingRef.current = true; setSaving(true);
        try { await deleteTransaction(db, id); router.back(); }
        catch (error) { Alert.alert("Não foi possível excluir", error instanceof Error ? error.message : "Tente novamente."); }
        finally { savingRef.current = false; setSaving(false); }
      })(); } },
    ]);
  }

  if (!loaded) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><View style={styles.loadingInner}><SkeletonRows count={4} /></View></View>;
  }

  if (loadError || !transaction) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <View style={styles.errorInner}>
          <EmptyState title={loadError ? "Não foi possível carregar" : "Lançamento não encontrado"} description={loadError ? "Tente consultar o lançamento novamente." : "Volte ao histórico para escolher outro lançamento."} actionLabel={loadError ? "Tentar novamente" : "Voltar"} onAction={loadError ? () => { void loadTransaction(); } : () => router.back()} />
          {loadError && <QuietButton onPress={() => router.back()} accessibilityLabel="Voltar ao histórico"><Text style={{ color: colors.accent }}>Voltar</Text></QuietButton>}
        </View>
      </View>
    );
  }

  if (transaction.kind !== "standard") {
    return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
      <QuietButton accessibilityLabel="Voltar" onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton>
      <Text style={[styles.specialTitle, { color: colors.text }]}>{transaction.kind === "transfer" ? "Transferência" : "Correção de saldo"}</Text>
      <View style={[styles.specialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.specialAmount, { color: colors.text }]}>{formatCentsToBRL(transaction.amountCents)}</Text>
        <Text style={[styles.specialMeta, { color: colors.textMuted }]}>{transaction.type === "expense" ? "Saída" : "Entrada"} · {transaction.accountName}</Text>
        <Text style={[styles.specialMeta, { color: colors.textMuted }]}>{formatDate(transaction.occurredAt)}{transaction.title ? ` · ${transaction.title}` : ""}</Text>
      </View>
      <Text style={[styles.specialNote, { color: colors.textMuted }]}>{transaction.kind === "transfer" ? "Esta movimentação faz parte de um par. Ao excluir, as duas partes são removidas juntas." : "Correções não podem ser convertidas em receitas ou despesas por esta tela."}</Text>
      <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={confirmDelete} style={[styles.deleteButton, { opacity: saving ? 0.45 : 1 }]}><Trash2 color={colors.negative} size={17} /><Text style={[styles.deleteText, { color: colors.negative }]}>{saving ? "Excluindo…" : transaction.kind === "transfer" ? "Excluir transferência" : "Excluir correção"}</Text></Pressable>
    </Screen></ScrollView></View>;
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <View style={styles.top}>
            <QuietButton accessibilityLabel="Voltar" onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton>
            <View style={styles.topCopy}><Text style={[styles.topTitle, { color: colors.text }]}>Editar lançamento</Text><Text style={[styles.topSubtitle, { color: colors.textMuted }]}>Ajuste os detalhes abaixo</Text></View>
            <View style={styles.topSpacer} accessibilityElementsHidden />
          </View>

          <TransactionFormReferenceStatus loading={references.loading} error={references.error} onRetry={references.retry} missingAccount={references.ready && accounts.length === 0} missingCategory={references.ready && categories.length === 0} />

          {transaction.initialLoanId && <Text style={[styles.specialNote, { color: colors.textMuted }]}>Desembolso inicial do empréstimo. Alterar o valor ajusta a referência pela diferença; pagamentos e compensações são preservados. Direção, vínculo e situação paga permanecem fixos.</Text>}

          <View accessibilityRole="tablist" style={[styles.typeSwitch, { backgroundColor: colors.surfaceMuted }]}>
            {(["expense", "income"] as const).map((item) => {
              const selected = type === item;
              return (
                <Pressable key={item} accessibilityRole="tab" disabled={saving || !!transaction.initialLoanId} accessibilityState={{ selected, disabled: saving || !!transaction.initialLoanId }} onPress={() => setType(item)} style={({ pressed }) => [styles.typeButton, { backgroundColor: selected ? colors.surface : "transparent", borderColor: selected ? colors.border : "transparent", opacity: saving || (!!transaction.initialLoanId && !selected) ? 0.45 : pressed ? 0.7 : 1 }]}>
                  <Text style={[styles.typeText, { color: selected ? colors.text : colors.textMuted }]}>{item === "expense" ? "Despesa" : "Receita"}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Label>Valor</Label>
            <CurrencyInput value={amountCents} onChange={setAmountCents} />
          </View>

          <View style={[styles.statusSwitch, { backgroundColor: colors.surfaceMuted }]}>{(["paid", "pending"] as const).map((item) => <Pressable key={item} accessibilityRole="radio" disabled={saving || !!transaction.initialLoanId} accessibilityState={{ selected: status === item, disabled: saving || !!transaction.initialLoanId }} onPress={() => setStatus(item)} style={[styles.statusOption, { borderColor: status === item ? colors.border : "transparent", backgroundColor: status === item ? colors.surface : "transparent", opacity: saving || (!!transaction.initialLoanId && item !== "paid") ? 0.45 : 1 }]}><Text style={{ color: status === item ? colors.text : colors.textMuted, fontSize: 13, fontWeight: "700" }}>{item === "paid" ? "Pago" : "Pendente"}</Text></Pressable>)}</View>

          <View style={styles.rowFields}>
            <View style={styles.field}>
              <Label>Data</Label>
              <TextInput accessibilityLabel="Data do lançamento" keyboardType="number-pad" maxLength={10} value={occurredAtText} onChangeText={setOccurredAtText} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            </View>
          </View>

          <View style={styles.section}><Label>Categoria</Label><CategorySelector categories={categories} selectedId={categoryId} onSelect={setCategoryId} /></View>
          <View style={styles.section}><Label>Conta</Label><AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} /></View>
          <View style={styles.section}>
            <Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label>
            <TextInput accessibilityLabel="Descrição" value={description} onChangeText={setDescription} maxLength={80} placeholder="Adicione uma nota" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
          </View>

          <PrimaryButton disabled={saving || !canSave} accessibilityLabel="Salvar alterações" onPress={() => void save()} style={styles.save}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Check color={colors.background} size={19} />}
            {saving ? "Salvando…" : "Salvar alterações"}
          </PrimaryButton>
          <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={confirmDelete} style={({ pressed }) => [styles.deleteButton, { opacity: saving ? 0.45 : pressed ? 0.6 : 1 }]}>
            <Trash2 color={colors.negative} size={17} />
            <Text style={[styles.deleteText, { color: colors.negative }]}>Excluir lançamento</Text>
          </Pressable>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: "center" },
  loadingInner: { paddingHorizontal: 28 },
  errorInner: { paddingHorizontal: 20 },
  scroll: { paddingBottom: 36 },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  topCopy: { flex: 1, alignItems: "center" },
  topSpacer: { width: 44, height: 44 },
  topTitle: { fontSize: 17, fontWeight: "700" },
  topSubtitle: { fontSize: 12, marginTop: 3 },
  typeSwitch: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginBottom: 16 },
  typeButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  typeText: { fontSize: 14, fontWeight: "700" },
  amountCard: { borderWidth: 1, borderRadius: radius.lg, padding: 18, alignItems: "center" },
  statusSwitch: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginTop: 16 }, statusOption: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  rowFields: { marginTop: 24, flexDirection: "row" },
  field: { flex: 1, gap: 10 },
  section: { marginTop: 24, gap: 10 },
  optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" },
  input: { minHeight: 54, borderWidth: 1, borderRadius: radius.md, fontSize: 15, paddingHorizontal: 14 },
  save: { marginTop: 30 },
  deleteButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  deleteText: { fontSize: 13, fontWeight: "700" },
  specialTitle: { fontSize: 28, fontWeight: "800", marginTop: 25 }, specialCard: { borderWidth: 1, borderRadius: radius.lg, padding: 20, marginTop: 18 }, specialAmount: { fontSize: 30, fontWeight: "800" }, specialMeta: { fontSize: 13, marginTop: 9 }, specialNote: { fontSize: 12, lineHeight: 18, marginTop: 16 },
});
