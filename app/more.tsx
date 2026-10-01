import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowDownUp, CalendarDays, ChartNoAxesCombined, ChevronRight, FileClock, Goal, Landmark, Repeat2, Settings2, Tags } from "lucide-react-native";
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
      <View>{actions.map(({ title, subtitle, icon: Icon, route }, index) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={() => router.push(route as never)} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceMuted : "transparent", borderBottomColor: colors.border, borderBottomWidth: index < actions.length - 1 ? StyleSheet.hairlineWidth : 0 }]}>
        <Icon color={colors.textMuted} size={22} strokeWidth={1.8} /><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.rowSub, { color: colors.textMuted }]}>{subtitle}</Text></View><ChevronRight color={colors.textMuted} size={18} />
      </Pressable>)}</View>
    </Screen></ScrollView><BottomNav />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 24 }, title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6, marginBottom: 24 },
  row: { minHeight: 72, paddingVertical: 14, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 16, borderRadius: radius.sm },
  copy: { flex: 1, minWidth: 0 }, rowTitle: { fontSize: 16, fontWeight: "600" }, rowSub: { fontSize: 13, lineHeight: 19, marginTop: 3 },
});
