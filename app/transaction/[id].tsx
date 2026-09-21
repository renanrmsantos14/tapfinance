import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check, Trash2 } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../../src/components/CategorySelector";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { EmptyState, Label, PrimaryButton, QuietButton, Screen, SkeletonRows } from "../../src/components/ui";
import { listCategories } from "../../src/repositories/categoryRepository";
import { deleteTransaction, getTransaction, updateTransaction } from "../../src/repositories/transactionRepository";
import type { Category, TransactionType } from "../../src/types/category";
import type { Transaction } from "../../src/types/transaction";
import { radius, useAppColors } from "../../src/theme";
import { formatDate, parseDateInput } from "../../src/utils/dates";
import { validateTransactionDraft } from "../../src/utils/validation";

export default function TransactionDetailScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amountCents, setAmountCents] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [occurredAtText, setOccurredAtText] = useState(formatDate(Date.now()));

  const loadTransaction = useCallback(async () => {
    setLoadError(false);
    try {
      const item = await getTransaction(db, id);
      if (!item) return;
      setTransaction(item);
      setType(item.type);
      setAmountCents(item.amountCents);
      setCategoryId(item.categoryId);
      setDescription(item.description ?? "");
      setOccurredAtText(formatDate(item.occurredAt));
    } catch {
      setLoadError(true);
    } finally {
      setLoaded(true);
    }
  }, [db, id]);

  useEffect(() => { void loadTransaction(); }, [loadTransaction]);
  useEffect(() => {
    void listCategories(db, type).then((next) => {
      setCategories(next);
      setCategoryId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
    });
  }, [db, type]);

  const save = useCallback(async () => {
    if (saving) return;
    const parsedDate = parseDateInput(occurredAtText);
    if (parsedDate === null) {
      Alert.alert("Confira a data", "Use o formato DD/MM/AAAA.");
      return;
    }
    const draft = { type, amountCents, categoryId: categoryId ?? "", description, occurredAt: parsedDate };
    const error = validateTransactionDraft(draft);
    if (error) {
      Alert.alert("Confira o lançamento", error);
      return;
    }
    setSaving(true);
    try {
      await updateTransaction(db, id, draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert("Não foi possível salvar", "Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [amountCents, categoryId, db, description, id, occurredAtText, saving, type]);

  function confirmDelete() {
    Alert.alert("Excluir lançamento?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => { void deleteTransaction(db, id).then(() => router.back()).catch(() => Alert.alert("Não foi possível excluir", "Tente novamente.")); } },
    ]);
  }

  if (!loaded) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><View style={styles.loadingInner}><SkeletonRows count={4} /></View></View>;
  }

  if (loadError || !transaction) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <View style={styles.errorInner}>
          <EmptyState title={loadError ? "Não foi possível carregar" : "Lançamento não encontrado"} description="Volte ao histórico e tente novamente." actionLabel="Voltar" onAction={() => router.back()} />
        </View>
      </View>
    );
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

          <View accessibilityRole="tablist" style={[styles.typeSwitch, { backgroundColor: colors.surfaceMuted }]}>
            {(["expense", "income"] as const).map((item) => {
              const selected = type === item;
              return (
                <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setType(item)} style={({ pressed }) => [styles.typeButton, { backgroundColor: selected ? colors.surface : "transparent", borderColor: selected ? colors.border : "transparent", opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[styles.typeText, { color: selected ? colors.text : colors.textMuted }]}>{item === "expense" ? "Despesa" : "Receita"}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Label>Valor</Label>
            <CurrencyInput value={amountCents} onChange={setAmountCents} />
          </View>

          <View style={styles.rowFields}>
            <View style={styles.field}>
              <Label>Data</Label>
              <TextInput accessibilityLabel="Data do lançamento" keyboardType="number-pad" maxLength={10} value={occurredAtText} onChangeText={setOccurredAtText} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
            </View>
          </View>

          <View style={styles.section}><Label>Categoria</Label><CategorySelector categories={categories} selectedId={categoryId} onSelect={setCategoryId} /></View>
          <View style={styles.section}>
            <Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label>
            <TextInput accessibilityLabel="Descrição" value={description} onChangeText={setDescription} maxLength={80} placeholder="Adicione uma nota" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
          </View>

          <PrimaryButton disabled={saving} accessibilityLabel="Salvar alterações" onPress={() => void save()} style={styles.save}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Check color={colors.background} size={19} />}
            {saving ? "Salvando…" : "Salvar alterações"}
          </PrimaryButton>
          <Pressable accessibilityRole="button" onPress={confirmDelete} style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.6 : 1 }]}>
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
  rowFields: { marginTop: 24, flexDirection: "row" },
  field: { flex: 1, gap: 10 },
  section: { marginTop: 24, gap: 10 },
  optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" },
  input: { minHeight: 54, borderWidth: 1, borderRadius: radius.md, fontSize: 15, paddingHorizontal: 14 },
  save: { marginTop: 30 },
  deleteButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  deleteText: { fontSize: 13, fontWeight: "700" },
});
