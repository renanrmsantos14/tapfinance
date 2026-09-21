import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ellipsis, type LucideIcon } from "lucide-react-native";
import { radius, useAppColors } from "../theme";
import type { Category } from "../types/category";

const iconMap: Record<string, LucideIcon> = {
  utensils: require("lucide-react-native").Utensils,
  car: require("lucide-react-native").Car,
  fuel: require("lucide-react-native").Fuel,
  house: require("lucide-react-native").House,
  "shopping-bag": require("lucide-react-native").ShoppingBag,
  "heart-pulse": require("lucide-react-native").HeartPulse,
  "gamepad-2": require("lucide-react-native").Gamepad2,
  "receipt-text": require("lucide-react-native").ReceiptText,
  ellipsis: Ellipsis,
  "briefcase-business": require("lucide-react-native").BriefcaseBusiness,
  "refresh-ccw": require("lucide-react-native").RefreshCcw,
  tag: require("lucide-react-native").Tag,
};

export function CategorySelector({ categories, selectedId, onSelect }: { categories: Category[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const colors = useAppColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {categories.map((category) => {
        const Icon = iconMap[category.icon] ?? Ellipsis;
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Categoria ${category.name}`}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [styles.item, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border, opacity: pressed ? 0.74 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Icon color={selected ? colors.accent : colors.textMuted} size={18} strokeWidth={2} />
            <Text style={[styles.text, { color: selected ? colors.accent : colors.text }]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8, paddingVertical: 4, paddingRight: 20 },
  item: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  text: { fontSize: 14, fontWeight: "600" },
});
