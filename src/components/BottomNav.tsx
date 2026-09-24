import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChartNoAxesCombined, Clock3, Ellipsis, PieChart } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useAppColors } from "../theme";

const items = [
  { path: "/", label: "Início", Icon: ChartNoAxesCombined },
  { path: "/transactions", label: "Transações", Icon: Clock3 },
  { path: "/budgets", label: "Orçamentos", Icon: PieChart },
  { path: "/more", label: "Mais", Icon: Ellipsis },
];

export function BottomNav() {
  const colors = useAppColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map(({ path, label, Icon }) => {
        const active = path === "/" ? pathname === "/" : pathname === path || (path === "/more" && pathname === "/settings");
        return (
          <Pressable key={path} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => router.replace(path as "/") } style={({ pressed }) => [styles.item, { opacity: pressed ? 0.65 : 1 }]}>
            <View style={[styles.iconWrap, active && { backgroundColor: colors.accentSoft }]}><Icon color={active ? colors.accent : colors.textMuted} size={20} strokeWidth={active ? 2.5 : 2} /></View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 70, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  item: { minWidth: 88, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  iconWrap: { width: 42, height: 28, borderRadius: radius.round, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "600" },
});
