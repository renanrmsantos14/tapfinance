import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../src/components/Text";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { EmptyState, Screen, SkeletonRows } from "../src/components/ui";
import { calendarMonthDays, getCalendarDayTransactions, loadCalendarSnapshot } from "../src/services/calendarService";
import { radius, useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";

export default function CalendarScreen() {
  const db = useSQLiteContext(); const colors = useAppColors();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof loadCalendarSnapshot>> | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0); const focused = useRef(false);
  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++loadSequence.current;
    setLoading(true); setError(null);
    try {
      const next = await loadCalendarSnapshot(db, month.getTime());
      if (request === loadSequence.current) setSnapshot(next);
    } catch (cause) {
      if (request === loadSequence.current) setError(cause instanceof Error && /limite numérico/.test(cause.message) ? cause.message : "Não foi possível consultar os movimentos. Nenhum fluxo foi confirmado nesta tentativa.");
    } finally { if (request === loadSequence.current) setLoading(false); }
  }, [db, month]);
  useFocusEffect(useCallback(() => { focused.current = true; void load(); return () => { focused.current = false; loadSequence.current += 1; }; }, [load]));
  function changeMonth(offset: number) { loadSequence.current += 1; setLoading(true); setSelectedDay(null); setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const visibleSnapshot = !loading && !error ? snapshot : null;
  const items = visibleSnapshot ? getCalendarDayTransactions(visibleSnapshot, selectedDay) : [];
  const today = new Date();
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.accent }}>‹ Mais</Text></Pressable><Text style={[styles.title, { color: colors.text }]}>Calendário</Text>
    <View style={[styles.calendar, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.monthHeader}><Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => changeMonth(-1)} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}><ChevronLeft color={colors.text} size={23} /></Pressable><Text style={[styles.month, { color: colors.text, flex: 1, textAlign: "center" }]}>{monthLabel}</Text><Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => changeMonth(1)} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}><ChevronRight color={colors.text} size={23} /></Pressable></View>
      <View style={styles.grid}>{["S", "T", "Q", "Q", "S", "S", "D"].map((label, i) => <Text key={`weekday-${i}`} accessibilityLabel={["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"][i]} style={[styles.weekday, { color: colors.textMuted }]}>{label}</Text>)}{days.map((day, index) => {
        if (day === null) return <View key={`blank-${index}`} accessibilityElementsHidden style={styles.day} />;
        const count = visibleSnapshot?.dayCounts[day] ?? 0;
        const selected = selectedDay === day;
        const isToday = day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
        return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${day} de ${monthLabel}${isToday ? ", hoje" : ""}, ${visibleSnapshot ? `${count} movimentos` : "movimentos não consultados"}`} accessibilityState={{ selected, disabled: !visibleSnapshot }} disabled={!visibleSnapshot} onPress={() => setSelectedDay(day)} style={({ pressed }) => [styles.day, { height: 44, borderWidth: 1, borderColor: selected ? colors.accent : "transparent", backgroundColor: selected || isToday ? colors.accentSoft : "transparent", opacity: pressed ? 0.6 : 1 }]}><Text style={[styles.dayText, { color: colors.text }]}>{day}</Text>{count > 0 && <View accessibilityElementsHidden style={[styles.dayDot, { backgroundColor: colors.accent }]} />}</Pressable>;
      })}</View>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 10 }}>O ponto indica movimentos, incluindo pendências. Toque em um dia para filtrar.</Text>
      {visibleSnapshot && <>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 16 }}>Fluxo realizado do mês · sem conversão cambial</Text>
        {visibleSnapshot.summaries.map((summary) => <View key={summary.currency} style={[styles.summary, { borderTopColor: colors.border }]}><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{summary.currency}</Text><Text style={[styles.summaryValue, { color: summary.balance >= 0 ? colors.positive : colors.negative }]}>{formatCentsByCurrency(summary.balance, summary.currency)}</Text></View>)}
      </>}
    </View>
    {loading ? <View accessibilityLiveRegion="polite" style={{ marginTop: 20 }}><Text style={{ color: colors.textMuted }}>Carregando calendário…</Text><SkeletonRows count={4} /></View> : error ? <EmptyState title="Calendário indisponível" description={error} actionLabel="Tentar novamente" onAction={() => void load()} /> : visibleSnapshot && <>
      <Text accessibilityRole="header" style={[styles.section, { color: colors.text }]}>{selectedDay === null ? "Movimentações do mês" : `Movimentações de ${selectedDay} de ${monthLabel}`}</Text>
      {selectedDay !== null && <Pressable accessibilityRole="button" onPress={() => setSelectedDay(null)} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}><Text style={{ color: colors.accent }}>Ver mês inteiro</Text></Pressable>}
      <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>{items.length ? items.map((item, index) => <TransactionItem key={item.id} transaction={item} isLast={index === items.length - 1} onPress={() => router.push(`/transaction/${item.id}`)} />) : <EmptyState embedded title={selectedDay === null ? "Sem movimentos neste mês" : "Sem movimentos neste dia"} description={selectedDay === null ? "Crie um lançamento ou consulte outro mês." : "Escolha outro dia ou veja o mês inteiro."} actionLabel={selectedDay === null ? "Criar lançamento" : "Ver mês inteiro"} onAction={selectedDay === null ? () => router.push("/quick-entry") : () => setSelectedDay(null)} />}</View>
    </>}
  </Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 24 }, back: { fontSize: 13, marginBottom: 10 }, title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, calendar: { borderWidth: 1, borderRadius: radius.lg, padding: 16, marginTop: 22 }, monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, month: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" }, grid: { flexDirection: "row", flexWrap: "wrap" }, weekday: { width: `${100/7}%`, textAlign: "center", fontSize: 11, paddingBottom: 6 }, day: { width: `${100/7}%`, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 10 }, dayText: { fontSize: 13, fontWeight: "600" }, dayDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 4 }, summary: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 13, flexDirection: "row", justifyContent: "space-between" }, summaryLabel: { fontSize: 12 }, summaryValue: { fontSize: 14, fontWeight: "800" }, section: { fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 10 }, list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 15, overflow: "hidden" }, empty: { textAlign: "center", padding: 24, fontSize: 13 } });
