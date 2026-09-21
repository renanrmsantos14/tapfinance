import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { EmptyState, Reveal, Screen, SkeletonRows } from "../src/components/ui";
import { listTransactions } from "../src/repositories/transactionRepository";
import type { Transaction } from "../src/types/transaction";
import type { TransactionType } from "../src/types/category";
import { radius, useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";

type Filter = "all" | TransactionType;

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await listTransactions(db, filter === "all" ? undefined : filter));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db, filter]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const total = useMemo(() => items.reduce((sum, item) => sum + (item.type === "income" ? item.amountCents : -item.amountCents), 0), [items]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <Reveal style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>MOVIMENTAÇÕES</Text>
              <Text style={[styles.title, { color: colors.text }]}>Histórico</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{loading ? "Atualizando…" : `${items.length} ${items.length === 1 ? "lançamento" : "lançamentos"}`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Novo lançamento" onPress={() => router.push("/quick-entry")} style={({ pressed }) => [styles.add, { backgroundColor: colors.text, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Plus color={colors.background} size={20} strokeWidth={2.5} />
            </Pressable>
          </Reveal>

          <Reveal delay={45}>
            <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Saldo dos itens exibidos</Text>
              <Text style={[styles.summaryValue, { color: total >= 0 ? colors.positive : colors.negative }]}>{formatCentsToBRL(total)}</Text>
            </View>
          </Reveal>

          <View accessibilityRole="tablist" style={[styles.filters, { backgroundColor: colors.surfaceMuted }]}>
            {(["all", "expense", "income"] as const).map((item) => {
              const active = filter === item;
              const label = item === "all" ? "Todas" : item === "expense" ? "Despesas" : "Receitas";
              return (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(item)}
                  style={({ pressed }) => [styles.filter, { backgroundColor: active ? colors.surface : "transparent", borderColor: active ? colors.border : "transparent", opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.filterText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? <SkeletonRows count={6} /> : loadError ? (
              <EmptyState embedded title="Histórico indisponível" description="Não foi possível carregar os lançamentos." actionLabel="Tentar novamente" onAction={() => void load()} />
            ) : items.length === 0 ? (
              <EmptyState embedded title="Nada por aqui" description="Não há lançamentos para este filtro." actionLabel="Criar lançamento" onAction={() => router.push("/quick-entry")} />
            ) : items.map((item, index) => (
              <TransactionItem key={item.id} transaction={item} isLast={index === items.length - 1} onPress={() => router.push(`/transaction/${item.id}`)} />
            ))}
          </View>
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.7, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -1.1 },
  subtitle: { fontSize: 13, marginTop: 5 },
  add: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  summary: { borderWidth: 1, borderRadius: radius.lg, padding: 18, marginBottom: 14 },
  summaryLabel: { fontSize: 12, marginBottom: 8 },
  summaryValue: { fontSize: 25, fontWeight: "700", letterSpacing: -0.8 },
  filters: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginBottom: 14 },
  filter: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 13, fontWeight: "700" },
  list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, overflow: "hidden" },
});
