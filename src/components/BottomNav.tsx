import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChartNoAxesCombined, Clock3, Settings } from "lucide-react-native";
import { router, usePathname } from "expo-router";
import { useAppColors } from "../theme";

const items = [
  { path: "/", label: "Resumo", Icon: ChartNoAxesCombined },
  { path: "/transactions", label: "Histórico", Icon: Clock3 },
  { path: "/settings", label: "Ajustes", Icon: Settings },
];

export function BottomNav() {
  const colors = useAppColors();
  const pathname = usePathname();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {items.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <Pressable key={path} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => router.replace(path as "/") } style={styles.item}>
            <Icon color={active ? colors.accent : colors.textMuted} size={20} strokeWidth={active ? 2.5 : 2} />
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 68, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingBottom: 8, paddingTop: 10 },
  item: { minWidth: 76, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 4 },
  label: { fontSize: 11, fontWeight: "600" },
});
