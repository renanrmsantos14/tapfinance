import { useCallback, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Plus, X } from "lucide-react-native";
import { BottomNav } from "../../../src/components/BottomNav";
import { TransactionItem } from "../../../src/components/TransactionItem";
import { EmptyState, PrimaryButton, Screen, useReducedMotion } from "../../../src/components/ui";
import { CurrencyInput } from "../../../src/components/CurrencyInput";
import { listGoals, listLoans, setLoanInitialTransaction, setLoanRemainingBalance, setTrackerArchived, updateGoal, updateLoan } from "../../../src/repositories/financeRepository";
import { listGoalTransactions, listLoanTransactions } from "../../../src/repositories/transactionRepository";
import type { Goal, Loan } from "../../../src/types/finance";
import type { Transaction } from "../../../src/types/transaction";
import { radius, useAppColors } from "../../../src/theme";
import { formatCentsToBRL } from "../../../src/utils/currency";
import { formatDate, parseDateInput } from "../../../src/utils/dates";

export default function TrackerDetailScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const db = useSQLiteContext(); const colors = useAppColors();
  const [goal, setGoal] = useState<Goal | null>(null); const [loan, setLoan] = useState<Loan | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"edit" | "balance" | "initial" | null>(null);
  const [name, setName] = useState(""); const [amount, setAmount] = useState(0); const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
    if (!id || (kind !== "loans" && kind !== "goals")) { setLoan(null); setGoal(null); return; }
    if (kind === "loans") {
      const [loans, movements] = await Promise.all([listLoans(db, true), listLoanTransactions(db, id)]);
      setLoan(loans.find((item) => item.id === id) ?? null); setGoal(null); setTransactions(movements);
    } else if (kind === "goals") {
      const [goals, movements] = await Promise.all([listGoals(db, true), listGoalTransactions(db, id)]);
      setGoal(goals.find((item) => item.id === id) ?? null); setLoan(null); setTransactions(movements);
    }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Tente novamente.");
    } finally { setLoading(false); }
  }, [db, id, kind]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const item = loan ?? goal;
  function openEditor(mode: "edit" | "balance" | "initial") {
    if (!item || savingRef.current) return;
    setName(item.name); setAmount(mode === "balance" ? loan?.remainingCents ?? 0 : loan?.principalCents ?? goal?.targetCents ?? 0);
    setDeadline(item.dueAt === null ? "" : formatDate(item.dueAt)); setFormError(null); setEditor(mode);
  }

  async function save() {
    if (!item || savingRef.current || !editor || editor === "initial") return;
    setFormError(null);
    const dueAt = deadline.trim() ? parseDateInput(deadline) : null;
    if (editor === "edit" && deadline.trim() && dueAt === null) { setFormError("Informe uma data válida no formato DD/MM/AAAA."); return; }
    savingRef.current = true; setSaving(true);
    try {
      if (editor === "balance" && loan) await setLoanRemainingBalance(db, loan.id, amount);
      else if (loan) await updateLoan(db, loan.id, { name, principalCents: amount, color: item.color, dueAt });
      else if (goal) await updateGoal(db, goal.id, { name, targetCents: amount, color: item.color, dueAt });
      setEditor(null); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function confirmInitialTransaction(transaction: Transaction) {
    if (!loan || savingRef.current) return;
    Alert.alert("Confirmar desembolso inicial?", `${loan.name}: ${transaction.title || transaction.description || "Lançamento"}, ${formatCentsToBRL(transaction.amountCents)}, ${formatDate(transaction.occurredAt)}, pago. ID: ${transaction.id}. O saldo atual de ${formatCentsToBRL(loan.remainingCents)} e todas as transações serão preservados. Edições/exclusões posteriores usarão esse vínculo.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Identificar", onPress: () => { void (async () => {
        if (savingRef.current) return;
        savingRef.current = true; setSaving(true); setFormError(null);
        try { await setLoanInitialTransaction(db, loan.id, transaction.id); setEditor(null); await load(); }
        catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível identificar o desembolso."); }
        finally { savingRef.current = false; setSaving(false); }
      })(); } },
    ]);
  }

  function confirmArchive() {
    if (!item || savingRef.current) return;
    Alert.alert(item.isArchived ? "Restaurar item?" : "Arquivar item?", `${item.name}: ${item.isArchived ? "voltará às listas ativas" : "sairá das listas ativas"}. Todos os lançamentos e saldos serão preservados.`, [
      { text: "Cancelar", style: "cancel" },
      { text: item.isArchived ? "Restaurar" : "Arquivar", onPress: () => { void (async () => {
        if (savingRef.current) return;
        savingRef.current = true; setSaving(true);
        try { await setTrackerArchived(db, loan ? "loans" : "goals", item.id, !item.isArchived); await load(); }
        catch (error) { Alert.alert("Não foi possível atualizar", error instanceof Error ? error.message : "Tente novamente."); }
        finally { savingRef.current = false; setSaving(false); }
      })(); } },
    ]);
  }
  if (loadError) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: colors.accent }}>‹ Voltar</Text></Pressable><EmptyState title="Não foi possível carregar" description={loadError} actionLabel="Tentar novamente" onAction={() => { void load(); }} /></Screen><BottomNav /></View>;
  if (loading || !item) return <View style={[styles.root, { backgroundColor: colors.background }]}><Screen><Pressable onPress={() => router.back()}><Text style={{ color: colors.accent }}>‹ Voltar</Text></Pressable><Text style={[styles.title, { color: colors.text, marginTop: 20 }]}>{loading ? "Carregando…" : "Item não encontrado"}</Text></Screen><BottomNav /></View>;

  const target = loan?.principalCents ?? goal?.targetCents ?? 0;
  const progress = loan ? Math.max(0, target - loan.remainingCents) : goal?.progressCents ?? 0;
  const remaining = loan?.remainingCents ?? Math.max(0, target - progress);
  const ratio = Math.min(progress / Math.max(target, 1), 1);
  const primaryColor = remaining === 0 ? colors.positive : item.color;
  const typeLabel = loan ? loan.direction === "lent" ? "A RECEBER" : "A PAGAR" : goal?.type === "income" ? "META DE RECEITA" : "META DE DESPESA";

  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={[styles.back, { color: colors.accent }]}>‹ {loan ? "Empréstimos" : "Metas"}</Text></Pressable>
    <Text style={[styles.eyebrow, { color: colors.textMuted }]}>{typeLabel}</Text><Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
    <View style={styles.actions}><Pressable accessibilityRole="button" disabled={saving} onPress={() => openEditor("edit")} style={styles.action}><Text style={{ color: colors.accent }}>Editar</Text></Pressable>{loan && <Pressable accessibilityRole="button" disabled={saving} onPress={() => openEditor("balance")} style={styles.action}><Text style={{ color: colors.accent }}>Compensar saldo</Text></Pressable>}<Pressable accessibilityRole="button" disabled={saving} onPress={confirmArchive} style={styles.action}><Text style={{ color: colors.textMuted }}>{item.isArchived ? "Restaurar" : "Arquivar"}</Text></Pressable></View>
    {item.isArchived && <Text style={{ color: colors.warning, marginTop: 8 }}>Arquivado · histórico preservado</Text>}
    {loan && <View style={{ marginTop: 12 }}><Text style={{ color: loan.initialTransactionId === null ? colors.warning : colors.textMuted, lineHeight: 20 }}>{loan.initialTransactionId === null ? "Empréstimo legado: desembolso inicial ainda não identificado. O cálculo anterior permanece até sua confirmação." : transactions.some((transaction) => transaction.id === loan.initialTransactionId) ? "Desembolso inicial identificado. Pagamentos são calculados separadamente." : "Desembolso inicial excluído. A dívida e os pagamentos continuam preservados."}</Text><Pressable accessibilityRole="button" disabled={saving} onPress={() => openEditor("initial")} style={styles.action}><Text style={{ color: colors.accent }}>{loan.initialTransactionId === null ? "Identificar desembolso inicial" : "Revisar vínculo do desembolso"}</Text></Pressable></View>}
    <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{loan ? "Saldo restante" : "Progresso"}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCentsToBRL(loan ? remaining : progress)}</Text>
      <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>{loan ? `Referência: ${formatCentsToBRL(target)}` : `de ${formatCentsToBRL(target)} da meta`}</Text>
      {item.dueAt !== null && <Text style={[styles.summaryMeta, { color: remaining > 0 && item.dueAt < new Date().setHours(0, 0, 0, 0) ? colors.warning : colors.textMuted }]}>Prazo: {formatDate(item.dueAt)}</Text>}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: primaryColor }]} /></View>
      <View style={styles.progressFooter}><Text style={[styles.progressCaption, { color: colors.textMuted }]}>{loan ? "Redução do saldo" : "Concluído"}: {Math.round(ratio * 100)}%</Text><Text style={[styles.progressCaption, { color: remaining === 0 ? colors.positive : colors.textMuted }]}>{remaining === 0 ? loan ? "Saldo zerado" : "Concluído" : `Restam ${formatCentsToBRL(remaining)}`}</Text></View>
    </View>
    {!item.isArchived && (!loan || remaining > 0) && <PrimaryButton onPress={() => router.push(`/quick-entry?${loan ? "loanId" : "goalId"}=${encodeURIComponent(item.id)}`)} style={styles.add}><Plus color={colors.background} size={18} />{loan ? "Registrar pagamento" : "Adicionar lançamento"}</PrimaryButton>}
    <View style={styles.historyHeader}><Text style={[styles.historyTitle, { color: colors.text }]}>Movimentações</Text><Text style={[styles.historyCount, { color: colors.textMuted }]}>{transactions.length}</Text></View>
    <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{transactions.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum lançamento vinculado ainda.</Text> : transactions.map((transaction, index) => <TransactionItem key={transaction.id} transaction={transaction} isLast={index === transactions.length - 1} onPress={() => router.push(`/transaction/${transaction.id}`)} />)}</View>
  </Screen></ScrollView><BottomNav />
  <Modal visible={editor !== null} transparent animationType={reduceMotion === false ? "slide" : "none"} onRequestClose={() => { if (!saving) setEditor(null); }}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.scrim}><ScrollView accessibilityViewIsModal keyboardShouldPersistTaps="handled" style={[styles.sheet, { backgroundColor: colors.surface }]}>
    <View style={styles.editorHeader}><Text style={[styles.historyTitle, { color: colors.text }]}>{editor === "initial" ? "Identificar desembolso" : editor === "balance" ? "Compensar saldo" : loan ? "Editar empréstimo" : "Editar meta"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fechar formulário" disabled={saving} onPress={() => setEditor(null)} style={styles.action}><X size={22} color={colors.textMuted} /></Pressable></View>
    {editor === "initial" ? <><Text style={{ color: colors.textMuted, lineHeight: 20, marginBottom: 12 }}>Escolha o lançamento pago que representa o desembolso original. Não adivinhamos o vínculo por nome, data ou valor. Confirmar ou trocar esse vínculo não muda o saldo atual nem movimentações existentes.</Text>{transactions.filter((transaction) => transaction.kind === "standard" && transaction.status === "paid" && transaction.type === (loan?.direction === "lent" ? "expense" : "income")).map((transaction) => <Pressable key={transaction.id} accessibilityRole="button" disabled={saving} onPress={() => confirmInitialTransaction(transaction)} style={({ pressed }) => [styles.candidate, { borderColor: colors.border, opacity: saving ? 0.45 : pressed ? 0.65 : 1 }]}><Text style={{ color: colors.text, fontWeight: "700" }}>{transaction.title || transaction.description || "Lançamento"} · {formatCentsToBRL(transaction.amountCents)}</Text><Text style={{ color: colors.textMuted, marginTop: 4 }}>{formatDate(transaction.occurredAt)} · {transaction.accountName} · Pago{transaction.id === loan?.initialTransactionId ? " · Atual" : ""}</Text><Text selectable style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{transaction.id}</Text></Pressable>)}{!transactions.some((transaction) => transaction.kind === "standard" && transaction.status === "paid" && transaction.type === (loan?.direction === "lent" ? "expense" : "income")) && <Text style={{ color: colors.textMuted, lineHeight: 20 }}>Não há lançamento pago compatível neste empréstimo. Não será criado um desembolso fictício; use a compensação para corrigir o saldo, se necessário.</Text>}{formError && <Text accessibilityRole="alert" style={{ color: colors.negative, marginTop: 16 }}>{formError}</Text>}</> : <>
    {editor === "edit" && <><Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOME</Text><TextInput accessibilityLabel="Nome" value={name} onChangeText={setName} maxLength={80} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></>}
    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{editor === "balance" ? "SALDO DESEJADO" : loan ? "VALOR DE REFERÊNCIA" : "VALOR DA META"}</Text><CurrencyInput value={amount} onChange={setAmount} disabled={saving} accessibilityLabel={editor === "balance" ? "Saldo desejado" : loan ? "Valor de referência do empréstimo" : "Valor da meta"} />
    {editor === "edit" && <><Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PRAZO (OPCIONAL)</Text><TextInput accessibilityLabel="Prazo opcional" value={deadline} onChangeText={(value) => { const digits = value.replace(/\D/g, "").slice(0, 8); setDeadline(digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`); }} keyboardType="number-pad" maxLength={10} placeholder="DD/MM/AAAA" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} /></>}
    {loan && <Text style={{ color: colors.textMuted, lineHeight: 20, marginTop: 16 }}>{editor === "balance" ? `Saldo atual: ${formatCentsToBRL(remaining)}. A compensação muda apenas o saldo deste empréstimo. Não representa pagamento nem movimenta contas. O ajuste será registrado em Atividade.` : "Alterar o valor de referência ajusta o saldo pela diferença. Desembolso e pagamentos existentes não mudam; a direção permanece a mesma."}</Text>}
    {formError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.negative, lineHeight: 20, marginTop: 16 }}>{formError}</Text>}
    <PrimaryButton disabled={saving} onPress={() => { void save(); }} style={{ marginTop: 20 }}>{saving ? "Salvando…" : editor === "balance" ? "Confirmar compensação" : "Salvar alterações"}</PrimaryButton>
    </>}
  </ScrollView></KeyboardAvoidingView></Modal></View>;
}

const styles = StyleSheet.create({
  candidate: { minHeight: 64, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }, action: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" }, sheet: { maxHeight: "90%", padding: 22, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, fieldLabel: { fontSize: 11, fontWeight: "700", marginTop: 16, marginBottom: 8 }, input: { minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 },
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 22 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7, marginTop: 5 }, summary: { borderWidth: 1, borderRadius: radius.lg, padding: 22, marginTop: 23 }, summaryLabel: { fontSize: 13 }, summaryValue: { fontSize: 32, fontWeight: "800", marginTop: 7 }, summaryMeta: { fontSize: 13, marginTop: 3 }, progressTrack: { height: 10, borderRadius: 5, overflow: "hidden", marginTop: 24 }, progressFill: { height: "100%", borderRadius: 5 }, progressFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, progressCaption: { fontSize: 12, fontWeight: "700" }, add: { marginTop: 16 }, historyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 27, marginBottom: 10 }, historyTitle: { fontSize: 18, fontWeight: "700" }, historyCount: { fontSize: 12 }, list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14 }, empty: { fontSize: 13, textAlign: "center", padding: 24 },
});
