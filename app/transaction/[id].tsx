import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check, Trash2 } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../../src/components/CategorySelector";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { QuietButton, Screen, styles as ui } from "../../src/components/ui";
import { listCategories } from "../../src/repositories/categoryRepository";
import { deleteTransaction, getTransaction, updateTransaction } from "../../src/repositories/transactionRepository";
import type { Category, TransactionType } from "../../src/types/category";
import type { Transaction } from "../../src/types/transaction";
import { useAppColors } from "../../src/theme";
import { formatDate, parseDateInput } from "../../src/utils/dates";
import { validateTransactionDraft } from "../../src/utils/validation";

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [type, setType] = useState<TransactionType>("expense");
  const [amountCents, setAmountCents] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [occurredAtText, setOccurredAtText] = useState(formatDate(Date.now()));

  useEffect(() => { void getTransaction(db, id).then((item) => { if (!item) return; setTransaction(item); setType(item.type); setAmountCents(item.amountCents); setCategoryId(item.categoryId); setDescription(item.description ?? ""); setOccurredAtText(formatDate(item.occurredAt)); }).catch(() => Alert.alert("Não foi possível carregar", "Tente novamente.")); }, [db, id]);
  useEffect(() => { void listCategories(db, type).then((next) => { setCategories(next); setCategoryId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? null); }); }, [db, type]);

  const save = useCallback(async () => {
    const parsedDate = parseDateInput(occurredAtText);
    if (parsedDate === null) { Alert.alert("Confira a data", "Use o formato DD/MM/AAAA."); return; }
    const draft = { type, amountCents, categoryId: categoryId ?? "", description, occurredAt: parsedDate };
    const error = validateTransactionDraft(draft); if (error) { Alert.alert("Confira o lançamento", error); return; }
    try { await updateTransaction(db, id, draft); await Haptics.selectionAsync(); router.back(); } catch { Alert.alert("Não foi possível salvar", "Tente novamente."); }
  }, [categoryId, db, description, id, occurredAtText, type, amountCents]);

  function confirmDelete() { Alert.alert("Excluir lançamento?", "Essa ação não pode ser desfeita.", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => { void deleteTransaction(db, id).then(() => router.back()).catch(() => Alert.alert("Não foi possível excluir", "Tente novamente.")); } }]); }
  if (!transaction) return <View style={[styles.loading, { backgroundColor: colors.background }]}><Text style={{ color: colors.textMuted }}>Carregando…</Text></View>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}><Screen scroll={false}><View style={styles.top}><QuietButton onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton><Text style={[styles.topTitle, { color: colors.text }]}>Editar lançamento</Text><QuietButton onPress={confirmDelete}><Trash2 color={colors.negative} size={20} /></QuietButton></View><Text style={[ui.label, { color: colors.textMuted, textAlign: "center", marginBottom: 6 }]}>Data</Text><TextInput accessibilityLabel="Data do lançamento" keyboardType="number-pad" maxLength={10} value={occurredAtText} onChangeText={setOccurredAtText} style={[styles.dateInput, { color: colors.text, borderBottomColor: colors.border }]} /><View style={styles.typeSwitch}>{(["expense", "income"] as const).map((item) => { const selected = type === item; return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setType(item)} style={[styles.typeButton, { backgroundColor: selected ? colors.text : "transparent" }]}><Text style={{ color: selected ? colors.background : colors.textMuted, fontWeight: "700" }}>{item === "expense" ? "Despesa" : "Receita"}</Text></Pressable>; })}</View><View style={styles.value}><CurrencyInput value={amountCents} onChange={setAmountCents} /></View><Text style={[ui.label, { color: colors.textMuted, marginBottom: 10 }]}>Categoria</Text><CategorySelector categories={categories} selectedId={categoryId} onSelect={setCategoryId} /><View style={styles.description}><Text style={[ui.label, { color: colors.textMuted }]}>Descrição</Text><TextInput accessibilityLabel="Descrição" value={description} onChangeText={setDescription} placeholder="Adicione uma nota" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]} /></View><Pressable accessibilityRole="button" onPress={() => void save()} style={[ui.primaryButton, { backgroundColor: colors.text }]}><Check color={colors.background} size={19} /><Text style={[ui.primaryButtonText, { color: colors.background }]}>Salvar alterações</Text></Pressable></Screen></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center" }, scroll: { paddingBottom: 32 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, topTitle: { fontSize: 16, fontWeight: "700" }, dateInput: { alignSelf: "center", minWidth: 120, minHeight: 42, borderBottomWidth: 1, textAlign: "center", fontSize: 16, paddingVertical: 8, marginBottom: 24 }, typeSwitch: { flexDirection: "row", backgroundColor: "#00000008", alignSelf: "center", borderRadius: 7, padding: 3, marginBottom: 22 }, typeButton: { minHeight: 40, minWidth: 112, alignItems: "center", justifyContent: "center", borderRadius: 5 }, value: { alignItems: "center", marginBottom: 24 }, description: { marginTop: 30, marginBottom: 28 }, input: { minHeight: 48, borderBottomWidth: 1, fontSize: 16, paddingVertical: 12 } });
