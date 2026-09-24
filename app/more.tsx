import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownUp, CalendarDays, ChartNoAxesCombined, CreditCard, FileClock, Goal, Landmark, Repeat2, Settings2, Tags } from "lucide-react-native";
import { router } from "expo-router";
import { BottomNav } from "../src/components/BottomNav";
import { Screen } from "../src/components/ui";
import { radius, useAppColors } from "../src/theme";

const actions = [
  { title: "Contas", subtitle: "Bancos, dinheiro e cartões", icon: Landmark, route: "/collection/accounts" },
  { title: "Transferência", subtitle: "Movimente entre contas", icon: ArrowDownUp, route: "/transfer" },
  { title: "Metas", subtitle: "Acompanhe seus objetivos", icon: Goal, route: "/collection/goals" },
  { title: "Empréstimos", subtitle: "Valores a receber ou pagar", icon: ArrowDownUp, route: "/collection/loans" },
  { title: "Recorrências", subtitle: "Assinaturas e lançamentos futuros", icon: Repeat2, route: "/collection/schedules" },
  { title: "Calendário", subtitle: "Movimentações por data", icon: CalendarDays, route: "/calendar" },
  { title: "Relatórios", subtitle: "Entenda seus hábitos", icon: ChartNoAxesCombined, route: "/insights" },
  { title: "Atividade", subtitle: "Alterações recentes", icon: FileClock, route: "/activity" },
  { title: "Categorias", subtitle: "Organize seus lançamentos", icon: Tags, route: "/collection/categories" },
  { title: "Ajustes", subtitle: "Preferências e dados", icon: Settings2, route: "/settings" },
];

export default function MoreScreen() {
  const colors = useAppColors();
  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
      <Text style={[styles.title, { color: colors.text }]}>Mais</Text>
      <Pressable onPress={() => router.push("/insights")} style={({ pressed }) => [styles.pro, { opacity: pressed ? 0.9 : 1 }]}>
        <View style={styles.proIcon}><CreditCard color="#13263A" size={22} /></View><View style={{ flex: 1 }}><Text style={styles.proTitle}>Visão financeira</Text><Text style={styles.proSub}>Relatórios e tendências do seu dinheiro</Text></View>
      </Pressable>
      <View style={styles.grid}>{actions.map(({ title, subtitle, icon: Icon, route }) => <Pressable key={title} accessibilityRole="button" onPress={() => router.push(route as never)} style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border }]}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}><Icon color={colors.accent} size={20} strokeWidth={2.2} /></View><Text style={[styles.tileTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.tileSub, { color: colors.textMuted }]}>{subtitle}</Text>
      </Pressable>)}</View>
    </Screen></ScrollView><BottomNav />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8, marginBottom: 22 },
  pro: { minHeight: 94, borderRadius: radius.lg, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#9BC0EA", marginBottom: 24 }, proIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" }, proTitle: { color: "#11253B", fontSize: 17, fontWeight: "800" }, proSub: { color: "#243B54", fontSize: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, tile: { width: "48%", minHeight: 134, borderWidth: 1, borderRadius: radius.md, padding: 14 }, icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 12 }, tileTitle: { fontSize: 14, fontWeight: "700" }, tileSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
});
