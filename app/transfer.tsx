import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowDownUp, ArrowLeft, Check } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { AccountSelector } from "../src/components/AccountSelector";
import { EmptyState, Label, PrimaryButton, QuietButton, Screen } from "../src/components/ui";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { createTransfer, listAccounts } from "../src/repositories/financeRepository";
import type { Account } from "../src/types/finance";
import { radius, useAppColors } from "../src/theme";
import { resolveTransferSelection } from "../src/utils/accountSelection";

export default function TransferScreen() {
  const db = useSQLiteContext(); const colors = useAppColors(); const [accounts, setAccounts] = useState<Account[]>([]);
  const [selection, setSelection] = useState<{ fromId: string | null; toId: string | null }>({ fromId: null, toId: null });
  const { fromId, toId } = selection;
  const [amountCents, setAmountCents] = useState(0); const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null); const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setLoadError(null);
    void listAccounts(db).then((next) => {
      if (!active) return;
      setAccounts(next); setSelection((current) => resolveTransferSelection(next, current));
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Não foi possível carregar as contas.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db, revision]));
  const source = accounts.find((account) => account.id === fromId);
  const targets = accounts.filter((account) => account.id !== fromId && account.currency === source?.currency);
  const canSave = !loading && !loadError && !!source && targets.some((account) => account.id === toId) && Number.isSafeInteger(amountCents) && amountCents > 0;
  async function save() {
    if (savingRef.current || !canSave || !fromId || !toId) return;
    savingRef.current = true; setSaving(true);
    try { await createTransfer(db, { fromAccountId: fromId, toAccountId: toId, amountCents, occurredAt: Date.now(), title }); router.back(); }
    catch (error) { Alert.alert("Não foi possível transferir", `${error instanceof Error ? error.message : "Tente novamente."} Os campos preenchidos foram preservados.`); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <View style={styles.top}><QuietButton accessibilityLabel="Voltar" onPress={() => router.back()}><ArrowLeft color={colors.text} size={21} /></QuietButton><Text style={[styles.title, { color: colors.text }]}>Transferir</Text><View style={{ width: 44 }} /></View>
    {loading && <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textMuted }}>Carregando contas…</Text></View>}
    {!loading && loadError && <EmptyState title="Não foi possível carregar as contas" description={`${loadError} Seus campos permanecem preenchidos.`} actionLabel="Tentar novamente" onAction={() => { setLoading(true); setRevision((value) => value + 1); }} />}
    {!loading && !loadError && (!source || targets.length === 0) && <EmptyState title="São necessárias duas contas da mesma moeda" description="Cadastre outra conta ativa ou escolha uma origem com destino disponível. Conversão entre moedas não é suportada." actionLabel="Gerenciar contas" onAction={() => router.push("/collection/accounts")} />}
    <View style={[styles.hero, { backgroundColor: colors.surface }]}><View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}><ArrowDownUp color={colors.accent} size={22} /></View><Text style={[styles.amountHint, { color: colors.textMuted }]}>VALOR DA TRANSFERÊNCIA</Text><CurrencyInput currency={source?.currency} accessibilityLabel="Valor da transferência" value={amountCents} onChange={setAmountCents} /></View>
    <View style={styles.section}><Label>De qual conta?</Label><AccountSelector accounts={accounts} selectedId={fromId} onSelect={(id) => setSelection((current) => resolveTransferSelection(accounts, { ...current, fromId: id }))} /></View>
    <View style={styles.section}><Label>Para qual conta?</Label><AccountSelector accounts={targets} selectedId={toId} onSelect={(id) => setSelection((current) => ({ ...current, toId: id }))} /></View>
    <View style={styles.section}><Label>Descrição <Text style={styles.optional}>(opcional)</Text></Label><TextInput accessibilityLabel="Descrição da transferência" placeholder="Ex.: Reserva mensal" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} maxLength={60} style={[styles.titleInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
    <Text style={[styles.note, { color: colors.textMuted }]}>A transferência cria duas movimentações vinculadas e não altera receitas ou despesas.</Text>
    <PrimaryButton disabled={saving || !canSave} onPress={() => void save()} style={styles.save}>{saving ? <ActivityIndicator color={colors.background} /> : <Check color={colors.background} size={18} />}{saving ? "Transferindo…" : "Confirmar transferência"}</PrimaryButton>
  </Screen></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 30 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 25 }, loading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }, title: { fontSize: 18, fontWeight: "700" }, hero: { minHeight: 205, borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 20 }, heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 }, amountHint: { fontSize: 10, fontWeight: "700", letterSpacing: 1 }, section: { marginTop: 25, gap: 10 }, optional: { textTransform: "none", letterSpacing: 0, fontWeight: "500" }, titleInput: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 }, note: { fontSize: 12, lineHeight: 18, marginTop: 20, textAlign: "center" }, save: { marginTop: 24 } });
