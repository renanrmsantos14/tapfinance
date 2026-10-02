import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "./Text";
import { BriefcaseBusiness, Car, Ellipsis, Fuel, Gamepad2, HeartPulse, House, LayoutGrid, Plus, ReceiptText, RefreshCcw, Search, ShoppingBag, Tag, Utensils, X, type LucideIcon } from "lucide-react-native";
import { router } from "expo-router";
import { manrope, radius, type, useAppColors } from "../theme";
import type { Category } from "../types/category";
import { useReducedMotion } from "./ui";

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils, car: Car, fuel: Fuel, house: House, "shopping-bag": ShoppingBag, "heart-pulse": HeartPulse, "gamepad-2": Gamepad2,
  "receipt-text": ReceiptText, ellipsis: Ellipsis, "briefcase-business": BriefcaseBusiness, "refresh-ccw": RefreshCcw, tag: Tag,
};

export function categoryIcon(name: string): LucideIcon | undefined {
  return iconMap[name];
}

const GRID_SLOTS = 7;

/** Four-column grid of category tiles; the last tile opens the full list in a sheet. */
export function CategorySelector({ categories, selectedId, onSelect, disabled = false }: { categories: Category[]; selectedId: string | null; onSelect: (id: string) => void; disabled?: boolean }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const visible = useMemo(() => {
    const first = categories.slice(0, GRID_SLOTS);
    const selected = categories.find((category) => category.id === selectedId);
    if (selected && !first.some((category) => category.id === selected.id)) return [...first.slice(0, GRID_SLOTS - 1), selected];
    return first;
  }, [categories, selectedId]);
  return (
    <View style={styles.grid}>
      {visible.map((category) => {
        const Icon = iconMap[category.icon] ?? Ellipsis;
        const selected = category.id === selectedId;
        return (
          <Pressable key={category.id} accessibilityRole="radio" disabled={disabled} accessibilityState={{ selected, disabled }} accessibilityLabel={`Categoria ${category.name}${category.isActive ? "" : ", arquivada do lançamento original"}`} onPress={() => onSelect(category.id)}
            style={({ pressed }) => [styles.cell, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border, opacity: disabled ? 0.5 : pressed ? 0.74 : 1, transform: [{ scale: pressed && reduceMotion === false ? 0.97 : 1 }] }]}>
            <Icon color={selected ? colors.accentContrast : colors.text} size={20} strokeWidth={2.2} />
            <Text numberOfLines={1} style={[styles.cellText, { color: selected ? colors.accentContrast : colors.text, fontFamily: selected ? manrope.extrabold : manrope.bold }]}>{category.name}</Text>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Ver todas as categorias" disabled={disabled} onPress={() => setSheetOpen(true)} style={({ pressed }) => [styles.cell, styles.cellDashed, { borderColor: colors.textMuted, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
        <LayoutGrid color={colors.textMuted} size={20} strokeWidth={2.2} />
        <Text numberOfLines={1} style={[styles.cellText, { color: colors.textMuted, fontFamily: manrope.bold }]}>Todas</Text>
      </Pressable>
      <CategorySheet visible={sheetOpen} categories={categories} selectedId={selectedId} onClose={() => setSheetOpen(false)} onSelect={(id) => { onSelect(id); setSheetOpen(false); }} />
    </View>
  );
}

export function CategorySheet({ visible, categories, selectedId, onSelect, onClose }: { visible: boolean; categories: Category[]; selectedId: string | null; onSelect: (id: string) => void; onClose: () => void }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return needle ? categories.filter((category) => category.name.toLocaleLowerCase("pt-BR").includes(needle)) : categories;
  }, [categories, query]);
  return <Modal visible={visible} transparent animationType={reduceMotion === false ? "slide" : "none"} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.scrim}>
      <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.scrimTouch} />
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.surfaceMuted }]} />
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.text, fontSize: 20 }]}>Categoria</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}><X color={colors.text} size={16} strokeWidth={2.4} /></Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textMuted} size={18} strokeWidth={2.2} />
          <TextInput accessibilityLabel="Buscar categoria" placeholder="Buscar categoria" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} returnKeyType="search" style={[styles.searchInput, { color: colors.text }]} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetList}>
          <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {filtered.length === 0 && <Text style={[type.body, { color: colors.textMuted, padding: 16 }]}>Nenhuma categoria com esse nome.</Text>}
            {filtered.map((category, index) => {
              const Icon = iconMap[category.icon] ?? Ellipsis;
              const selected = category.id === selectedId;
              return <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`Categoria ${category.name}${category.isActive ? "" : ", arquivada"}`} onPress={() => onSelect(category.id)}
                style={({ pressed }) => [styles.listRow, { backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : "transparent", borderTopColor: colors.border, borderTopWidth: index === 0 ? 0 : 1 }]}>
                <View style={[styles.listIcon, { backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}><Icon color={selected ? colors.accentText : colors.text} size={18} strokeWidth={2.2} /></View>
                <Text numberOfLines={1} style={[selected ? type.bodyStrong : type.body, { color: colors.text, flex: 1 }]}>{category.name}{!category.isActive && " · Arquivada"}</Text>
                {selected && <Text style={[type.chip, { color: colors.accentText }]}>Selecionada</Text>}
              </Pressable>;
            })}
            <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push("/collection/categories"); }} style={({ pressed }) => [styles.listRow, { borderTopColor: colors.border, borderTopWidth: 1, backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
              <View style={[styles.listIcon, { backgroundColor: colors.accentSoft }]}><Plus color={colors.accentText} size={18} strokeWidth={2.6} /></View>
              <Text style={[type.bodyStrong, { color: colors.accentText }]}>Nova categoria</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: { width: "23.5%", flexGrow: 1, minHeight: 72, borderWidth: 1, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4 },
  cellDashed: { borderStyle: "dashed", backgroundColor: "transparent" },
  cellText: { fontSize: 11, maxWidth: "100%" },
  scrim: { flex: 1, backgroundColor: "rgba(8,10,16,0.55)", justifyContent: "flex-end" },
  scrimTouch: { flex: 1 },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: "center" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  close: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  search: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  searchInput: { flex: 1, height: 44, fontFamily: manrope.semibold, fontSize: 14 },
  sheetList: { paddingBottom: 12 },
  listCard: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
  listRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  listIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
