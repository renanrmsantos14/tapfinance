import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import type { Account } from "../types/finance";
import { radius, useAppColors } from "../theme";

export function AccountSelector({ accounts, selectedId, onSelect }: { accounts: Account[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const colors = useAppColors();
  if (accounts.length === 0) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {accounts.map((account) => {
      const selected = account.id === selectedId;
      return <Pressable key={account.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => onSelect(account.id)} style={[styles.option, { backgroundColor: selected ? colors.accentSoft : colors.surface, borderColor: selected ? colors.accent : colors.border }]}>
        <View style={[styles.dot, { backgroundColor: account.color }]} /><Text numberOfLines={1} style={[styles.name, { color: selected ? colors.accent : colors.text }]}>{account.name}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({ row: { gap: 8 }, option: { minHeight: 42, maxWidth: 180, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 13, gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4 }, name: { fontSize: 13, fontWeight: "700" } });
