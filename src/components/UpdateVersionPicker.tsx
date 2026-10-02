import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Check, X } from "lucide-react-native";
import { PrimaryButton, useReducedMotion } from "./ui";
import { radius, useAppColors } from "../theme";
import type { Update } from "../services/updateService";

type Props = {
  visible: boolean; installedVersion: string; updates: Update[]; selectedVersion: string | null;
  checking: boolean; downloading: boolean; error: string | null;
  onSelect: (version: string) => void; onClose: () => void; onRetry: () => void; onDownload: () => void;
};

export function UpdateVersionPicker(props: Props) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const selected = props.updates.find((item) => item.version === props.selectedVersion);
  const busy = props.checking || props.downloading;
  return <Modal visible={props.visible} transparent animationType={reduceMotion === false ? "fade" : "none"} onRequestClose={() => { if (!props.downloading) props.onClose(); }}>
    <View style={styles.overlay}><View accessibilityViewIsModal style={[styles.panel, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Atualizações disponíveis</Text><Text style={{ color: colors.textMuted, marginTop: 4 }}>Instalada: {props.installedVersion}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar atualizações" accessibilityState={{ disabled: props.downloading }} disabled={props.downloading} onPress={props.onClose} style={({ pressed }) => [styles.quiet, { opacity: props.downloading ? 0.4 : pressed ? 0.7 : 1 }]}><X size={21} color={colors.text} /></Pressable></View>
      <ScrollView contentContainerStyle={styles.content}>
        {props.checking && <View accessibilityLiveRegion="polite" style={styles.progress}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textMuted }}>Consultando versões no GitHub…</Text></View>}
        {!props.checking && props.updates.length === 0 && !props.error && <Text style={{ color: colors.textMuted, lineHeight: 21 }}>Nenhuma versão mais nova com APK verificado está disponível. Betas também aparecem aqui quando publicadas.</Text>}
        {props.error && <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={{ color: colors.negative, lineHeight: 21 }}>{props.error}</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={props.onRetry} style={({ pressed }) => [styles.quiet, { alignSelf: "flex-start", opacity: busy ? 0.4 : pressed ? 0.7 : 1 }]}><Text style={{ color: colors.accent }}>Consultar novamente</Text></Pressable></View>}
        {props.updates.map((item) => {
          const active = item.version === props.selectedVersion;
          return <Pressable key={item.version} accessibilityRole="radio" accessibilityLabel={`Versão ${item.version}, ${item.prerelease ? "beta ou pré-release" : "estável"}`} accessibilityState={{ selected: active, disabled: busy }} disabled={busy} onPress={() => props.onSelect(item.version)} style={({ pressed }) => [styles.option, { backgroundColor: active ? colors.accentSoft : colors.surface, borderColor: active ? colors.accent : colors.border, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
            <View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{item.version}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.prerelease ? "Pré-release · avaliação" : "Estável"} · {(item.size / 1048576).toFixed(1)} MB</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>Publicada em {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(item.publishedAt))}</Text></View>
            {active && <Check size={20} color={colors.accent} />}
          </Pressable>;
        })}
        {selected && <View style={{ gap: 10 }}><Text style={{ color: colors.text, fontWeight: "700" }}>Notas da versão {selected.version}</Text><Text selectable style={{ color: colors.textMuted, lineHeight: 20 }}>{selected.notes || "Sem notas publicadas."}</Text>{selected.prerelease && <Text style={{ color: colors.warning, lineHeight: 20 }}>Pré-release pode conter falhas. Faça backup completo antes de atualizar.</Text>}</View>}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: colors.border }]}><Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>O APK é conferido por SHA-256. A instalação exige confirmação do Android. Versões anteriores não são oferecidas para proteger seus dados.</Text><PrimaryButton disabled={busy || !selected} onPress={props.onDownload}>{props.downloading ? <ActivityIndicator color={colors.background} /> : null}{props.downloading ? "Baixando e verificando…" : selected ? `Baixar ${selected.version}` : "Escolha uma versão"}</PrimaryButton></View>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 },
  panel: { maxHeight: "90%", width: "100%", maxWidth: 560, alignSelf: "center", borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  header: { flexDirection: "row", gap: 10, alignItems: "center", padding: 18 },
  title: { fontSize: 19, fontWeight: "700" }, content: { gap: 14, paddingHorizontal: 18, paddingBottom: 18 },
  quiet: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  progress: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 15 },
  option: { minHeight: 72, borderWidth: 1, borderRadius: radius.md, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  footer: { borderTopWidth: 1, padding: 18, gap: 12 },
});
