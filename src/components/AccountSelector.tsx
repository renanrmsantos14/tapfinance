import { ScrollView, StyleSheet, Pressable, View } from "react-native";
import { Text } from "./Text";
import type { Account } from "../types/finance";
import { radius, type, useAppColors } from "../theme";
import { formatCentsByCurrency } from "../utils/currency";

export function AccountSelector({ accounts, selectedId, onSelect, disabled = false }: { accounts: Account[]; selectedId: string | null; onSelect: (id: string) => void; disabled?: boolean }) {
  const colors = useAppColors();
  if (accounts.length === 0) return null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {accounts.map((account) => {
      const selected = account.id === selectedId;
      return <Pressable key={account.id} accessibilityRole="radio" disabled={disabled} accessibilityState={{ selected, disabled }} accessibilityLabel={`Conta ${account.name}${account.isArchived ? ", arquivada do lançamento original" : ""}, saldo ${formatCentsByCurrency(account.balanceCents, account.currency)}`} onPress={() => onSelect(account.id)}
        style={({ pressed }) => [styles.option, { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.border, borderWidth: selected ? 2 : 1, paddingHorizontal: selected ? 11 : 12, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
        <View style={[styles.dot, { backgroundColor: account.color }]} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[type.chip, { color: colors.text }]}>{account.isArchived ? `Arquivada · ${account.name}` : account.name}</Text>
          <Text numberOfLines={1} style={[type.meta, { color: colors.textMuted, fontVariant: ["tabular-nums"] }]}>{formatCentsByCurrency(account.balanceCents, account.currency)}</Text>
        </View>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  option: { minHeight: 48, maxWidth: 240, flexDirection: "row", alignItems: "center", borderRadius: radius.md, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  copy: { flexShrink: 1, gap: 1 },
});
