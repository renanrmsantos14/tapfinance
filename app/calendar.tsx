import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { Screen } from "../src/components/ui";
import { listTransactions } from "../src/repositories/transactionRepository";
import type { Transaction } from "../src/types/transaction";
import { radius, useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";

export default function CalendarScreen() {
  const db = useSQLiteContext(); const colors = useAppColors(); const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1)); const [items, setItems] = useState<Transaction[]>([]);
  const start = month.getTime(); const end = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
  const load = useCallback(async () => setItems((await listTransactions(db)).filter((item) => item.occurredAt >= start && item.occurredAt < end)), [db, end, start]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const days = useMemo(() => { const firstWeekday = (month.getDay() + 6) % 7; const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...Array(firstWeekday).fill(0), ...Array.from({ length: count }, (_, i) => i + 1)]; }, [month]);
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const txByDay = new Map<number, number>(); for (const item of items) { const day = new Date(item.occurredAt).getDate(); txByDay.set(day, (txByDay.get(day) ?? 0) + (item.type === "income" ? item.amountCents : -item.amountCents)); }
  const balance = items.filter((item) => item.status === "paid" && item.kind === "standard").reduce((sum, item) => sum + (item.type === "income" ? item.amountCents : -item.amountCents), 0);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Text onPress={() => router.back()} style={[styles.back, { color: colors.accent }]}>‹ Mais</Text><Text style={[styles.title, { color: colors.text }]}>Calendário</Text>
    <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.monthHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft color={colors.text} size={23} /></Pressable><Text style={[styles.month, { color: colors.text }]}>{monthLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight color={colors.text} size={23} /></Pressable></View>
      <View style={styles.grid}>{["S", "T", "Q", "Q", "S", "S", "D"].map((label, i) => <Text key={`weekday-${i}`} style={[styles.weekday, { color: colors.textMuted }]}>{label}</Text>)}{days.map((day, index) => { const active = !!day && txByDay.has(day); return <View key={`${day}-${index}`} style={[styles.day, day === new Date().getDate() && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear() && { backgroundColor: colors.accentSoft }]}><Text style={[styles.dayText, { color: day ? colors.text : "transparent" }]}>{day || "·"}</Text>{active && <View style={[styles.dayDot, { backgroundColor: (txByDay.get(day) ?? 0) >= 0 ? colors.positive : colors.negative }]} />}</View>; })}</View>
      <View style={[styles.summary, { borderTopColor: colors.border }]}><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Fluxo do período</Text><Text style={[styles.summaryValue, { color: balance >= 0 ? colors.positive : colors.negative }]}>{formatCentsToBRL(balance)}</Text></View>
    </View>
    <Text style={[styles.section, { color: colors.text }]}>Movimentações</Text><View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{items.length ? items.map((item, index) => <TransactionItem key={item.id} transaction={item} isLast={index === items.length - 1} onPress={() => router.push(`/transaction/${item.id}`)} />) : <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhuma movimentação neste mês.</Text>}</View>
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, calendar: { borderWidth: 1, borderRadius: radius.lg, padding: 16, marginTop: 22 }, monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, month: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" }, grid: { flexDirection: "row", flexWrap: "wrap" }, weekday: { width: `${100/7}%`, textAlign: "center", fontSize: 11, paddingBottom: 6 }, day: { width: `${100/7}%`, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 10 }, dayText: { fontSize: 13, fontWeight: "600" }, dayDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 4 }, summary: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 13, flexDirection: "row", justifyContent: "space-between" }, summaryLabel: { fontSize: 12 }, summaryValue: { fontSize: 14, fontWeight: "800" }, section: { fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 10 }, list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 15, overflow: "hidden" }, empty: { textAlign: "center", padding: 24, fontSize: 13 } });
