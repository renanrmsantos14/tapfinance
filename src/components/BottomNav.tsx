import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChartNoAxesCombined, Clock3, Ellipsis, PieChart } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, useAppColors } from "../theme";
import { navigationSection } from "../utils/navigation";

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
        const active = navigationSection(pathname) === path;
        return (
          <Pressable key={path} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => { if (pathname !== path) router.replace(path as "/"); }} style={({ pressed }) => [styles.item, { backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
            <View style={[styles.iconWrap, active && { backgroundColor: colors.accentSoft }]}><Icon color={active ? colors.accent : colors.textMuted} size={22} strokeWidth={2} /></View>
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 70, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  item: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", gap: 4 },
  iconWrap: { width: 40, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "600", textAlign: "center" },
});
