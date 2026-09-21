import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { Screen } from "../src/components/ui";
import { deleteTransaction, listTransactions } from "../src/repositories/transactionRepository";
import type { Transaction } from "../src/types/transaction";
import type { TransactionType } from "../src/types/category";
import { useAppColors } from "../src/theme";

type Filter = "all" | TransactionType;

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Transaction[]>([]);
  useFocusEffect(useCallback(() => { void listTransactions(db, filter === "all" ? undefined : filter).then(setItems); }, [db, filter]));
  return <View style={[styles.root, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}><View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.textMuted }]}>MOVIMENTAÇÕES</Text><Text style={[styles.title, { color: colors.text }]}>Histórico</Text></View><Pressable accessibilityRole="button" onPress={() => router.push("/quick-entry")} style={[styles.add, { backgroundColor: colors.text }]}><Plus color={colors.background} size={19} /></Pressable></View><View style={[styles.filters, { borderBottomColor: colors.border }]}>{(["all", "expense", "income"] as const).map((item) => { const active = filter === item; return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(item)} style={[styles.filter, active && { borderBottomColor: colors.accent }]}><Text style={{ color: active ? colors.accent : colors.textMuted, fontWeight: "700" }}>{item === "all" ? "Todas" : item === "expense" ? "Despesas" : "Receitas"}</Text></Pressable>; })}</View>{items.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum lançamento neste filtro.</Text> : items.map((item) => <TransactionItem key={item.id} transaction={item} onPress={() => router.push(`/transaction/${item.id}`)} />)}</Screen></ScrollView><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, scroll: { paddingBottom: 24 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }, eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 1.8, marginBottom: 8 }, title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.7 }, add: { width: 42, height: 42, borderRadius: 7, alignItems: "center", justifyContent: "center" }, filters: { flexDirection: "row", gap: 22, borderBottomWidth: 1, marginBottom: 7 }, filter: { minHeight: 42, borderBottomWidth: 2, borderBottomColor: "transparent", justifyContent: "center" }, empty: { paddingVertical: 30, fontSize: 15 } });
