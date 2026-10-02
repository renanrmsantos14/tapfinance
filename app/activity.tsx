import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../src/components/Text";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { EmptyState, Screen } from "../src/components/ui";
import { useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";
import { describeActivity } from "../src/utils/activity";

type Activity = { id: number; entity_id: string; action: string; occurred_at: number; title: string | null; amount_cents: number | null };

export default function ActivityScreen() {
  const db = useSQLiteContext(); const colors = useAppColors(); const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setLoadError(false);
    try { setItems(await db.getAllAsync<Activity>(`SELECT a.id, a.entity_id, a.action, a.occurred_at, COALESCE(t.title, l.name, c.name) AS title, t.amount_cents FROM activity_log a LEFT JOIN transactions t ON a.entity_type = 'transaction' AND t.id = a.entity_id LEFT JOIN loans l ON a.entity_type = 'loan' AND l.id = a.entity_id LEFT JOIN accounts c ON a.entity_type = 'account' AND c.id = a.entity_id ORDER BY a.occurred_at DESC, a.id DESC LIMIT 100`)); }
    catch { setLoadError(true); }
    finally { setLoading(false); }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Text accessibilityRole="button" onPress={() => router.back()} style={[styles.back, { color: colors.accent }]}>‹ Mais</Text><Text style={[styles.title, { color: colors.text }]}>Atividade</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Últimas 100 alterações registradas neste aparelho.</Text>
    <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>Carregando…</Text> : loadError ? <EmptyState title="Não foi possível carregar" description="Tente consultar a atividade novamente." actionLabel="Tentar novamente" onAction={() => { void load(); }} /> : items.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhuma atividade registrada ainda.</Text> : items.map((item, index) => { const description = describeActivity(item.action); return <View key={item.id} style={[styles.row, { borderBottomColor: colors.border }, index === items.length - 1 && { borderBottomWidth: 0 }]}><View style={[styles.dot, { backgroundColor: item.action === "deleted" ? colors.negative : colors.accent }]} /><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text }]}>{description.label}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.title || "Registro"} · {new Date(item.occurred_at).toLocaleString("pt-BR")}</Text>{description.detail && <Text style={[styles.meta, { color: colors.text }]}>{description.detail}</Text>}</View>{item.amount_cents !== null && <Text style={[styles.amount, { color: colors.text }]}>{formatCentsToBRL(item.amount_cents)}</Text>}</View>; })}</View>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800" }, subtitle: { fontSize: 13, marginTop: 5, marginBottom: 20 }, list: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 15 }, row: { minHeight: 72, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11 }, dot: { width: 9, height: 9, borderRadius: 5 }, name: { fontSize: 14, fontWeight: "700" }, meta: { fontSize: 11, marginTop: 4 }, amount: { fontSize: 12, fontWeight: "700" }, empty: { padding: 24, textAlign: "center", fontSize: 13 } });
