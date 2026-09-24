import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowDownUp, ArrowLeft, Check } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { AccountSelector } from "../src/components/AccountSelector";
import { Label, PrimaryButton, QuietButton, Screen } from "../src/components/ui";
import { createTransfer, listAccounts } from "../src/repositories/financeRepository";
import type { Account } from "../src/types/finance";
import { radius, useAppColors } from "../src/theme";
import { parseCurrencyToCents } from "../src/utils/currency";

export default function TransferScreen() {
  const db = useSQLiteContext(); const colors = useAppColors(); const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<string | null>(null); const [toId, setToId] = useState<string | null>(null); const [amount, setAmount] = useState(""); const [title, setTitle] = useState("");
  const load = useCallback(async () => { const next = await listAccounts(db); setAccounts(next); setFromId((id) => next.some((a) => a.id === id) ? id : next[0]?.id ?? null); setToId((id) => next.some((a) => a.id === id) && id !== fromId ? id : next.find((a) => a.id !== fromId)?.id ?? null); }, [db, fromId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function save() {
    const cents = parseCurrencyToCents(amount);
    if (!fromId || !toId || fromId === toId || !cents || cents < 1) { Alert.alert("Confira a transferência", "Escolha duas contas diferentes e informe um valor maior que zero."); return; }
    try { await createTransfer(db, { fromAccountId: fromId, toAccountId: toId, amountCents: cents, occurredAt: Date.now(), title }); router.back(); }
    catch (error) { Alert.alert("Não foi possível transferir", error instanceof Error ? error.message : "Tente novamente."); }
  }
  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <View style={styles.top}><QuietButton accessibilityLabel="Voltar" onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton><Text style={[styles.title, { color: colors.text }]}>Transferir</Text><View style={{ width: 44 }} /></View>
    <View style={[styles.hero, { backgroundColor: colors.surface }]}><View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}><ArrowDownUp color={colors.accent} size={22} /></View><Text style={[styles.amountHint, { color: colors.textMuted }]}>VALOR DA TRANSFERÊNCIA</Text><TextInput accessibilityLabel="Valor da transferência" keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} style={[styles.amount, { color: colors.text }]} /></View>
    <View style={styles.section}><Label>De qual conta?</Label><AccountSelector accounts={accounts} selectedId={fromId} onSelect={setFromId} /></View>
    <View style={styles.section}><Label>Para qual conta?</Label><AccountSelector accounts={accounts.filter((account) => account.id !== fromId)} selectedId={toId} onSelect={setToId} /></View>
    <View style={styles.section}><Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label><TextInput accessibilityLabel="Descrição da transferência" placeholder="Ex.: Reserva mensal" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} maxLength={60} style={[styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
    <Text style={[styles.note, { color: colors.textMuted }]}>A transferência cria duas movimentações vinculadas e não altera receitas ou despesas.</Text>
    <PrimaryButton onPress={() => void save()} style={styles.save}><Check color={colors.background} size={18} /> Confirmar transferência</PrimaryButton>
  </Screen></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 30 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 25 }, title: { fontSize: 18, fontWeight: "700" }, hero: { minHeight: 205, borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 20 }, heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 }, amountHint: { fontSize: 10, fontWeight: "700", letterSpacing: 1 }, amount: { minWidth: 180, fontSize: 36, fontWeight: "800", textAlign: "center", marginTop: 6, padding: 0 }, section: { marginTop: 25, gap: 10 }, optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" }, titleInput: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 }, note: { fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: "center" }, save: { marginTop: 24 } });
