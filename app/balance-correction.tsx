import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ArrowLeft, Check } from "lucide-react-native";
import { CurrencyInput } from "../src/components/CurrencyInput";
import { EmptyState, Label, PrimaryButton, Screen } from "../src/components/ui";
import { correctAccountBalance, listAccounts } from "../src/repositories/financeRepository";
import type { Account } from "../src/types/finance";
import { radius, useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";

export default function BalanceCorrectionScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const db = useSQLiteContext(); const colors = useAppColors();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0); const [amountCents, setAmountCents] = useState(0); const [negative, setNegative] = useState(false); const [notes, setNotes] = useState("");
  const initialized = useRef<string | null>(null); const edited = useRef(false);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false); const [saveError, setSaveError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true; setLoading(true); setLoadError(null);
    void listAccounts(db).then((accounts) => {
      if (!active) return;
      const next = accounts.find((item) => item.id === accountId) ?? null;
      setAccount(next);
      if (next && initialized.current !== accountId) {
        initialized.current = accountId;
        if (!edited.current) { setAmountCents(Math.abs(next.balanceCents)); setNegative(next.balanceCents < 0); }
      }
    }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Não foi possível consultar o saldo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accountId, db, revision]));
  const target = negative ? -amountCents : amountCents;
  const delta = account ? target - account.balanceCents : 0;
  const ready = !loading && !loadError && !!account && Number.isSafeInteger(target) && Number.isSafeInteger(delta);
  function release() { busyRef.current = false; setBusy(false); }
  function confirm() {
    if (busyRef.current || !ready || !account || delta === 0) return;
    busyRef.current = true; setBusy(true); setSaveError(null);
    const input = { accountId: account.id, expectedBalanceCents: account.balanceCents, balanceCents: target, notes };
    Alert.alert("Confirmar correção de saldo?", `${account.name}\nAtual: ${formatCentsByCurrency(account.balanceCents, account.currency)}\nNovo: ${formatCentsByCurrency(target, account.currency)}\nAjuste: ${formatCentsByCurrency(delta, account?.currency)}\n\nSerá criada uma movimentação de correção, sem alterar saldo inicial, receitas, despesas ou lançamentos anteriores. Excluir essa correção no histórico reverte seu efeito.`, [
      { text: "Cancelar", style: "cancel", onPress: release },
      { text: "Confirmar", onPress: () => { void (async () => {
        try { await correctAccountBalance(db, input); router.back(); }
        catch (error) { setSaveError(error instanceof Error ? error.message : "Não foi possível corrigir. Seus campos foram preservados."); setRevision((value) => value + 1); }
        finally { release(); }
      })(); } },
    ], { cancelable: false });
  }
  return <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Voltar" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => router.back()} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: busy ? 0.45 : pressed ? 0.7 : 1 })}><ArrowLeft color={colors.text} size={21} /></Pressable><Text style={[styles.title, { color: colors.text }]}>Corrigir saldo</Text><View style={{ width: 44 }} /></View>
    {loading ? <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textMuted }}>Consultando saldo atual…</Text></View> : loadError ? <EmptyState title="Não foi possível consultar a conta" description={`${loadError} Os campos preenchidos foram preservados.`} actionLabel="Tentar novamente" onAction={() => { setLoading(true); setRevision((value) => value + 1); }} /> : !account ? <EmptyState title="Conta indisponível" description="A conta pode estar arquivada ou não existir. Restaure ou escolha uma conta ativa." actionLabel="Gerenciar contas" onAction={() => router.push("/collection/accounts")} /> : <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.name, { color: colors.text }]}>{account.name}</Text><Text style={{ color: colors.textMuted, marginTop: 8 }}>Saldo atual · {account.currency}</Text><Text style={[styles.balance, { color: colors.text }]}>{formatCentsByCurrency(account.balanceCents, account.currency)}</Text></View>}
    <View style={styles.section}><Label>Novo saldo</Label><CurrencyInput currency={account?.currency} accessibilityLabel="Novo saldo da conta" value={amountCents} onChange={(value) => { edited.current = true; setAmountCents(value); }} /><View style={styles.signs}>{([false, true] as const).map((value) => <Pressable key={String(value)} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: negative === value, disabled: busy }} onPress={() => { edited.current = true; setNegative(value); }} style={({ pressed }) => [styles.sign, { borderColor: negative === value ? colors.accent : colors.border, backgroundColor: negative === value ? colors.accentSoft : colors.surface, opacity: pressed ? 0.7 : 1 }]}><Text style={{ color: negative === value ? colors.accent : colors.text }}>{value ? "Negativo" : "Positivo ou zero"}</Text></Pressable>)}</View></View>
    {ready && <Text accessibilityLiveRegion="polite" style={[styles.note, { color: colors.textMuted }]}>{delta === 0 ? "O saldo já corresponde ao valor informado. Nenhuma correção será criada." : `Ajuste a registrar: ${formatCentsByCurrency(delta, account?.currency)}`}</Text>}
    <View style={styles.section}><Label>Motivo (opcional)</Label><TextInput accessibilityLabel="Motivo da correção" value={notes} onChangeText={setNotes} editable={!busy} maxLength={200} multiline placeholder="Ex.: Conferência com o extrato" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, borderColor: colors.border }]} /></View>
    <Text style={[styles.note, { color: colors.textMuted }]}>Esta é uma correção administrativa. Para registrar uma compra ou recebimento, use um lançamento comum.</Text>
    {saveError && <Text accessibilityRole="alert" style={[styles.note, { color: colors.negative }]}>{saveError}</Text>}
    <PrimaryButton disabled={busy || !ready || delta === 0} onPress={confirm} style={styles.section}>{busy ? <ActivityIndicator color={colors.background} /> : <Check color={colors.background} size={18} />}{busy ? "Confirmando…" : "Revisar correção"}</PrimaryButton>
  </Screen></ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 32 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }, title: { fontSize: 18, fontWeight: "700" }, loading: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 16 }, card: { borderWidth: 1, borderRadius: radius.lg, padding: 18 }, name: { fontSize: 17, fontWeight: "700" }, balance: { fontSize: 28, fontWeight: "700", marginTop: 8 }, section: { marginTop: 24, gap: 10 }, signs: { flexDirection: "row", gap: 8 }, sign: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.md, alignItems: "center", justifyContent: "center" }, note: { fontSize: 13, lineHeight: 20, marginTop: 18 }, input: { minHeight: 80, borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 15, textAlignVertical: "top" } });
