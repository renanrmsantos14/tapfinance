import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { EmptyState, Reveal, Screen, SkeletonRows } from "../src/components/ui";
import { listTransactions } from "../src/repositories/transactionRepository";
import { listAccounts } from "../src/repositories/financeRepository";
import { listCategories } from "../src/repositories/categoryRepository";
import type { Transaction } from "../src/types/transaction";
import type { Category, TransactionType } from "../src/types/category";
import type { Account } from "../src/types/finance";
import { radius, useAppColors } from "../src/theme";
import { formatCentsToBRL } from "../src/utils/currency";
import { formatDate } from "../src/utils/dates";
import { filterTransactions, transactionDayKey } from "../src/utils/transactionFilters";

type Filter = "all" | TransactionType;

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | Transaction["status"]>("all");
  const [kind, setKind] = useState<"all" | Transaction["kind"]>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [transactions, activeAccounts, expenses, incomes] = await Promise.all([
        listTransactions(db), listAccounts(db), listCategories(db, "expense"), listCategories(db, "income"),
      ]);
      setItems(transactions); setAccounts(activeAccounts); setCategories([...expenses, ...incomes]);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const filteredItems = useMemo(() => filterTransactions(items, { month, type: filter, query, accountId, categoryId, status, kind }), [items, month, filter, query, accountId, categoryId, status, kind]);
  const hasActiveFilters = filter !== "all" || !!query.trim() || !!accountId || !!categoryId || status !== "all" || kind !== "all";
  function resetFilters() { setFilter("all"); setQuery(""); setAccountId(null); setCategoryId(null); setStatus("all"); setKind("all"); }
  const totals = useMemo(() => filteredItems.reduce((sum, item) => {
    if (item.status !== "paid" || item.kind !== "standard") return sum;
    if (item.type === "income") sum.income += item.amountCents; else sum.expense += item.amountCents;
    return sum;
  }, { income: 0, expense: 0 }), [filteredItems]);
  const total = totals.income - totals.expense;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen scroll={false}>
          <Reveal style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>MOVIMENTAÇÕES</Text>
              <Text style={[styles.title, { color: colors.text }]}>Transações</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>{loading ? "Atualizando…" : `${filteredItems.length} neste período`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Novo lançamento" onPress={() => router.push("/quick-entry")} style={[styles.add, { backgroundColor: colors.text }]}>
              <Plus color={colors.background} size={20} strokeWidth={2.5} />
            </Pressable>
          </Reveal>

          <View style={[styles.monthPicker, { backgroundColor: colors.surface }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.monthArrow}><ChevronLeft color={colors.textMuted} size={21} /></Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.monthArrow}><ChevronRight color={colors.textMuted} size={21} /></Pressable>
          </View>

          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Search color={colors.textMuted} size={17} /><TextInput accessibilityLabel="Buscar transações" placeholder="Buscar transações" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={[styles.searchInput, { color: colors.text }]} returnKeyType="search" /></View>

          <Reveal delay={45}>
            <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Despesas</Text><Text style={[styles.summaryValue, { color: colors.negative }]}>{formatCentsToBRL(totals.expense)}</Text></View>
              <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Receitas</Text><Text style={[styles.summaryValue, { color: colors.positive }]}>{formatCentsToBRL(totals.income)}</Text></View>
              <View style={styles.summaryItem}><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Saldo</Text><Text style={[styles.summaryValue, { color: total >= 0 ? colors.text : colors.negative }]}>{formatCentsToBRL(total)}</Text></View>
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
                  onPress={() => { setFilter(item); setCategoryId(null); }}
                  style={({ pressed }) => [styles.filter, { backgroundColor: active ? colors.surface : "transparent", borderColor: active ? colors.border : "transparent", opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.filterText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAdvanced }} onPress={() => setShowAdvanced((value) => !value)} style={styles.advancedToggle}><SlidersHorizontal color={colors.accent} size={16} /><Text style={[styles.advancedText, { color: colors.accent }]}>Filtros avançados{hasActiveFilters ? " · ativos" : ""}</Text><ChevronRight color={colors.textMuted} size={16} style={{ transform: [{ rotate: showAdvanced ? "90deg" : "0deg" }] }} /></Pressable>
          {showAdvanced && <View style={[styles.advancedPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.advancedLabel, { color: colors.textMuted }]}>CONTAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{[{ id: null, name: "Todas" }, ...accounts].map((account) => <Pressable key={account.id ?? "all"} accessibilityRole="radio" accessibilityState={{ selected: accountId === account.id }} onPress={() => setAccountId(account.id)} style={[styles.chip, { borderColor: accountId === account.id ? colors.accent : colors.border, backgroundColor: accountId === account.id ? colors.accentSoft : colors.background }]}><Text style={{ color: accountId === account.id ? colors.accent : colors.textMuted, fontSize: 12 }}>{account.name}</Text></Pressable>)}</ScrollView>
            <Text style={[styles.advancedLabel, { color: colors.textMuted }]}>CATEGORIAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{[{ id: null, name: "Todas" }, ...categories.filter((category) => filter === "all" || category.type === filter)].map((category) => <Pressable key={category.id ?? "all"} accessibilityRole="radio" accessibilityState={{ selected: categoryId === category.id }} onPress={() => setCategoryId(category.id)} style={[styles.chip, { borderColor: categoryId === category.id ? colors.accent : colors.border, backgroundColor: categoryId === category.id ? colors.accentSoft : colors.background }]}><Text style={{ color: categoryId === category.id ? colors.accent : colors.textMuted, fontSize: 12 }}>{category.name}</Text></Pressable>)}</ScrollView>
            <Text style={[styles.advancedLabel, { color: colors.textMuted }]}>SITUAÇÃO</Text>
            <View style={styles.chipRow}>{([ ["all", "Todas"], ["paid", "Pagas"], ["pending", "Pendentes"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.chip, { borderColor: status === value ? colors.accent : colors.border, backgroundColor: status === value ? colors.accentSoft : colors.background }]}><Text style={{ color: status === value ? colors.accent : colors.textMuted, fontSize: 12 }}>{label}</Text></Pressable>)}</View>
            <Text style={[styles.advancedLabel, { color: colors.textMuted }]}>NATUREZA</Text>
            <View style={styles.chipRow}>{([ ["all", "Todas"], ["standard", "Lançamentos"], ["transfer", "Transferências"], ["correction", "Correções"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: kind === value }} onPress={() => setKind(value)} style={[styles.chip, { borderColor: kind === value ? colors.accent : colors.border, backgroundColor: kind === value ? colors.accentSoft : colors.background }]}><Text style={{ color: kind === value ? colors.accent : colors.textMuted, fontSize: 12 }}>{label}</Text></Pressable>)}</View>
            {hasActiveFilters && <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.clearFilters}><Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12 }}>Zerar filtros</Text></Pressable>}
          </View>}

          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? <SkeletonRows count={6} /> : loadError ? (
              <EmptyState embedded title="Histórico indisponível" description="Não foi possível carregar os lançamentos." actionLabel="Tentar novamente" onAction={() => void load()} />
            ) : filteredItems.length === 0 ? (
              <EmptyState embedded title="Nada por aqui" description="Não há lançamentos neste mês para esta busca e filtro." actionLabel={hasActiveFilters ? "Zerar filtros" : "Criar lançamento"} onAction={hasActiveFilters ? resetFilters : () => router.push("/quick-entry")} />
            ) : filteredItems.map((item, index) => {
              const day = transactionDayKey(item.occurredAt);
              const previousDay = index > 0 ? transactionDayKey(filteredItems[index - 1].occurredAt) : null;
              const nextDay = index < filteredItems.length - 1 ? transactionDayKey(filteredItems[index + 1].occurredAt) : null;
              return <View key={item.id}>{day !== previousDay && <Text style={[styles.dayHeader, { color: colors.textMuted }]}>{formatDate(item.occurredAt)}</Text>}<TransactionItem transaction={item} isLast={day !== nextDay} onPress={() => router.push(`/transaction/${item.id}`)} /></View>;
            })}
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
  monthPicker: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthArrow: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, monthLabel: { fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  search: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }, searchInput: { flex: 1, height: 46, fontSize: 14 },
  summary: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 13, marginBottom: 14, flexDirection: "row", justifyContent: "space-between", gap: 6 },
  summaryItem: { flex: 1 }, summaryLabel: { fontSize: 10, marginBottom: 7 },
  summaryValue: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  filters: { flexDirection: "row", borderRadius: radius.md, padding: 4, marginBottom: 14 },
  filter: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  filterText: { fontSize: 13, fontWeight: "700" },
  advancedToggle: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }, advancedText: { flex: 1, fontSize: 12, fontWeight: "700" }, advancedPanel: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginBottom: 14 }, advancedLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginTop: 8, marginBottom: 7 }, chipRow: { flexDirection: "row", alignItems: "center", gap: 7 }, chip: { minHeight: 34, borderWidth: 1, borderRadius: radius.round, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, clearFilters: { alignSelf: "flex-start", paddingVertical: 10, marginTop: 5 },
  list: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 16, overflow: "hidden" }, dayHeader: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, marginTop: 14, marginBottom: 4 },
});
