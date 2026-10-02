import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import type { Account } from "../types/finance";
import { radius, useAppColors } from "../theme";

export function AccountSelector({ accounts, selectedId, onSelect, disabled = false }: { accounts: Account[]; selectedId: string | null; onSelect: (id: string) => void; disabled?: boolean }) {
  const colors = useAppColors();
  if (accounts.length === 0) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {accounts.map((account) => {
      const selected = account.id === selectedId;
      return <Pressable key={account.id} accessibilityRole="radio" disabled={disabled} accessibilityState={{ selected, disabled }} accessibilityLabel={`Conta ${account.name}${account.isArchived ? ", arquivada do lançamento original" : ""}`} onPress={() => onSelect(account.id)} style={({ pressed }) => [styles.option, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border, opacity: disabled ? 0.5 : pressed ? 0.74 : 1 }]}>
        <View style={[styles.dot, { backgroundColor: account.color }]} /><Text style={[styles.name, { color: selected ? colors.accent : colors.text }]}>{account.isArchived ? `Arquivada · ${account.name}` : account.name}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({ row: { gap: 8 }, option: { minHeight: 48, maxWidth: 240, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, paddingVertical: 10, gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4 }, name: { flexShrink: 1, fontSize: 14, fontWeight: "600" } });
