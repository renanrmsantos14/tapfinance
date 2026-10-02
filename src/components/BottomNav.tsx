import { Pressable, StyleSheet, View } from "react-native";
import { ChartNoAxesCombined, Clock3, Ellipsis, LayoutGrid, PieChart } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppColors } from "../theme";
import { navigationSection } from "../utils/navigation";

const items = [
  { path: "/", label: "Início", Icon: ChartNoAxesCombined },
  { path: "/transactions", label: "Extrato", Icon: Clock3 },
  { path: "/categories", label: "Categorias", Icon: LayoutGrid },
  { path: "/budgets", label: "Orçamentos", Icon: PieChart },
  { path: "/more", label: "Mais", Icon: Ellipsis },
] as const;

export function BottomNav() {
  const colors = useAppColors();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.bar, { backgroundColor: colors.ink }]}>
        {items.map(({ path, label, Icon }) => {
          const active = navigationSection(pathname) === path;
          return (
            <Pressable key={path} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => { if (pathname !== path) router.replace(path); }} style={({ pressed }) => [styles.item, active && { backgroundColor: colors.accentSoft }, pressed && !active && { opacity: 0.6 }]}>
              <Icon color={active ? colors.accentText : colors.inkMuted} size={22} strokeWidth={active ? 2.4 : 2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { height: 68, borderRadius: 22, padding: 6, flexDirection: "row", alignItems: "center" },
  item: { flex: 1, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
