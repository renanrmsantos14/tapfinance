import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, Download, ExternalLink, Info, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react-native";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { Label, Reveal, Screen } from "../src/components/ui";
import { exportTransactions } from "../src/services/exportService";
import { isAssistantRoleAvailable, isAssistantRoleHeld, openAssistantSettings, requestAssistantRole } from "../src/services/assistantService";
import { radius, useAppColors } from "../src/theme";

export default function SettingsScreen() {
  const colors = useAppColors();
  const db = useSQLiteContext();
  const appVersion = Constants.expoConfig?.version ?? "desconhecida";
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  const [assistantAvailable, setAssistantAvailable] = useState(false);
  const [assistantHeld, setAssistantHeld] = useState(false);
  const [checkingAssistant, setCheckingAssistant] = useState(true);

  const loadRole = useCallback(async () => {
    setCheckingAssistant(true);
    try {
      const [available, held] = await Promise.all([isAssistantRoleAvailable(), isAssistantRoleHeld()]);
      setAssistantAvailable(available);
      setAssistantHeld(held);
    } catch {
      setAssistantAvailable(false);
      setAssistantHeld(false);
    } finally {
      setCheckingAssistant(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadRole(); }, [loadRole]));

  async function activateAssistant() {
    if (assistantAvailable) {
      try {
        const launched = await requestAssistantRole();
        if (!launched) {
          Alert.alert("Seleção manual necessária", "Abra as configurações do assistente e escolha TapFinance.");
          return;
        }
        Alert.alert("Conclua no Android", "Escolha TapFinance na tela oficial e volte ao app.");
      } catch {
        Alert.alert("Não foi possível abrir a seleção", "Use o atalho para as configurações e escolha TapFinance.");
      }
      return;
    }
    Alert.alert(
      "Configuração manual",
      "Este aparelho não disponibilizou a solicitação direta. Abra a lista de assistentes e procure por TapFinance.",
      [{ text: "Agora não", style: "cancel" }, { text: "Abrir configurações", onPress: () => { void openAssistantSettings(); } }],
    );
  }

  async function exportData() {
    try {
      const ok = await exportTransactions(db);
      if (!ok) Alert.alert("Compartilhamento indisponível", "Não foi possível abrir o compartilhamento neste aparelho.");
    } catch {
      Alert.alert("Não foi possível exportar", "Tente novamente.");
    }
  }

  const statusLabel = checkingAssistant ? "Verificando…" : assistantHeld ? "Ativo neste aparelho" : assistantAvailable ? "Disponível para ativar" : "Configuração manual";
  const statusColor = checkingAssistant ? colors.textMuted : assistantHeld ? colors.positive : colors.warning;
  const statusBackground = checkingAssistant ? colors.surfaceMuted : assistantHeld ? colors.positiveSoft : colors.warningSoft;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <Reveal style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>PREFERÊNCIAS</Text>
            <Text style={[styles.title, { color: colors.text }]}>Ajustes</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Integrações, dados e informações do app.</Text>
          </Reveal>

          <Label>Assistente do Android</Label>
          <Reveal delay={45}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.accentSoft }]}><Smartphone color={colors.accent} size={20} /></View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Lançamento por Back Tap</Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.cardDescription, { color: colors.textMuted }]}>{statusLabel}</Text>
                  </View>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void activateAssistant()} style={({ pressed }) => [styles.actionRow, { borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
                <ShieldCheck color={colors.text} size={18} />
                <Text style={[styles.actionText, { color: colors.text }]}>{assistantHeld ? "Verificar nas configurações" : "Configurar como assistente"}</Text>
                <ChevronRight color={colors.textMuted} size={18} />
              </Pressable>
            </View>
          </Reveal>

          <View style={[styles.help, { backgroundColor: statusBackground }]}>
            <Info color={statusColor} size={19} />
            <View style={styles.helpCopy}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>Como ativar</Text>
              <Text style={[styles.helpText, { color: colors.textMuted }]}>Escolha TapFinance como assistente digital padrão. Depois configure o gesto de toque traseiro para abrir o assistente.</Text>
              <Pressable accessibilityRole="link" onPress={() => void openAssistantSettings()} style={({ pressed }) => [styles.inline, { opacity: pressed ? 0.6 : 1 }]}>
                <ExternalLink color={colors.accent} size={15} />
                <Text style={[styles.inlineText, { color: colors.accent }]}>Abrir lista de assistentes</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionGap}><Label>Dados e privacidade</Label></View>
          <View style={[styles.rows, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable accessibilityRole="button" onPress={() => void exportData()} style={({ pressed }) => [styles.dataRow, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surfaceMuted }]}><Download color={colors.text} size={18} /></View>
              <View style={styles.cardCopy}><Text style={[styles.cardTitle, { color: colors.text }]}>Exportar lançamentos</Text><Text style={[styles.cardDescription, { color: colors.textMuted }]}>Arquivo CSV para guardar ou analisar</Text></View>
              <ChevronRight color={colors.textMuted} size={18} />
            </Pressable>
            <View style={styles.dataRow}>
              <View style={[styles.rowIcon, { backgroundColor: colors.positiveSoft }]}><LockKeyhole color={colors.positive} size={18} /></View>
              <View style={styles.cardCopy}><Text style={[styles.cardTitle, { color: colors.text }]}>Dados somente no aparelho</Text><Text style={[styles.cardDescription, { color: colors.textMuted }]}>Sem conta, servidor ou nuvem</Text></View>
            </View>
          </View>

          <View style={[styles.versionCard, { borderColor: colors.border }]}>
            <Text style={[styles.versionName, { color: colors.text }]}>TapFinance</Text>
            <Text style={[styles.version, { color: colors.textMuted }]}>Versão {appVersion} · build {androidVersionCode ?? "—"}</Text>
          </View>
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 28 },
  header: { marginBottom: 28 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.7, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -1.1 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", marginTop: 10 },
  cardHeader: { padding: 18, flexDirection: "row", alignItems: "center", gap: 13 },
  cardIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardDescription: { fontSize: 12.5, lineHeight: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  actionRow: { borderTopWidth: StyleSheet.hairlineWidth, minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 },
  actionText: { flex: 1, fontSize: 14, fontWeight: "700" },
  help: { borderRadius: radius.lg, padding: 17, marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  helpCopy: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: "700", marginBottom: 5 },
  helpText: { fontSize: 13, lineHeight: 19 },
  inline: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start" },
  inlineText: { fontSize: 13, fontWeight: "700" },
  sectionGap: { marginTop: 28 },
  rows: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden", marginTop: 10 },
  dataRow: { minHeight: 74, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  versionCard: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 28, paddingTop: 18, alignItems: "center" },
  versionName: { fontSize: 13, fontWeight: "700" },
  version: { fontSize: 12, marginTop: 4 },
});
