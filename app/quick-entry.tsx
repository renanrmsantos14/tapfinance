import { useCallback, useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as Haptics from "expo-haptics";
import { CategorySelector } from "../src/components/CategorySelector";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { QuietButton, Screen, styles as ui } from "../src/components/ui";
import { listCategories } from "../src/repositories/categoryRepository";
import { createTransaction } from "../src/repositories/transactionRepository";
import type { Category, TransactionType } from "../src/types/category";
import { useAppColors } from "../src/theme";
import { validateTransactionDraft } from "../src/utils/validation";

export default function QuickEntryScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const params = useLocalSearchParams<{ assistant?: string }>();
  const [type, setType] = useState<TransactionType>("expense");
  const [amountCents, setAmountCents] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    const next = await listCategories(db, type);
    setCategories(next);
    setCategoryId((current) => next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
  }, [db, type]);
  useEffect(() => { void loadCategories(); }, [loadCategories]);

  async function save() {
    if (saving) return;
    const draft = { type, amountCents, categoryId: categoryId ?? "", description, occurredAt: Date.now() };
    const error = validateTransactionDraft(draft);
    if (error) { Alert.alert("Confira o lançamento", error); return; }
    setSaving(true);
    try {
      await createTransaction(db, draft);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (params.assistant === "1") router.dismissAll(); else router.back();
    } catch {
      Alert.alert("Não foi possível salvar", "Tente novamente. O lançamento não foi alterado.");
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <View style={styles.top}><QuietButton onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton><Text style={[styles.topTitle, { color: colors.text }]}>Novo lançamento</Text><QuietButton onPress={() => router.back()}><X color={colors.textMuted} size={20} /></QuietButton></View>
          <View style={styles.typeSwitch}>
            {(["expense", "income"] as const).map((item) => { const selected = type === item; return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setType(item)} style={[styles.typeButton, { backgroundColor: selected ? colors.text : "transparent" }]}><Text style={{ color: selected ? colors.background : colors.textMuted, fontWeight: "700" }}>{item === "expense" ? "Despesa" : "Receita"}</Text></Pressable>; })}
          </View>
          <View style={styles.value}><Text style={[ui.label, { color: colors.textMuted }]}>Valor</Text><CurrencyInput value={amountCents} onChange={setAmountCents} autoFocus /><Text style={[styles.hint, { color: colors.textMuted }]}>Digite os números em sequência</Text></View>
          <Text style={[ui.label, { color: colors.textMuted, marginBottom: 10 }]}>Categoria</Text>
          <CategorySelector categories={categories} selectedId={categoryId} onSelect={(id) => { setCategoryId(id); void Haptics.selectionAsync(); }} />
          <View style={styles.description}><Text style={[ui.label, { color: colors.textMuted }]}>Descrição <Text style={{ textTransform: "none", letterSpacing: 0 }}>(opcional)</Text></Text><TextInput accessibilityLabel="Descrição opcional" placeholder="Ex.: almoço com equipe" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} style={[styles.descriptionInput, { color: colors.text, borderBottomColor: colors.border }]} /></View>
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [ui.primaryButton, { backgroundColor: colors.text, opacity: saving || pressed ? 0.72 : 1 }]}><Check color={colors.background} size={19} /><Text style={[ui.primaryButtonText, { color: colors.background }]}>{saving ? "Salvando…" : "Salvar lançamento"}</Text></Pressable>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ scroll: { paddingBottom: 32 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }, topTitle: { fontSize: 16, fontWeight: "700" }, topSwitch: {}, typeSwitch: { flexDirection: "row", backgroundColor: "#00000008", alignSelf: "center", borderRadius: 7, padding: 3, marginBottom: 30 }, typeButton: { minHeight: 40, minWidth: 112, alignItems: "center", justifyContent: "center", borderRadius: 5 }, value: { alignItems: "center", marginBottom: 32 }, hint: { fontSize: 12, marginTop: 3 }, description: { marginTop: 30, marginBottom: 28 }, descriptionInput: { minHeight: 48, borderBottomWidth: 1, fontSize: 16, paddingVertical: 12 },
});
