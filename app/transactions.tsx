import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "../src/components/Text";
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { BottomNav } from "../src/components/BottomNav";
import { TransactionItem } from "../src/components/TransactionItem";
import { Chip, EmptyState, Label, QuietButton, Screen, SkeletonRows, Tile } from "../src/components/ui";
import { loadHistorySnapshot } from "../src/services/historyService";
import type { Transaction } from "../src/types/transaction";
import type { Category, TransactionType } from "../src/types/category";
import type { Account } from "../src/types/finance";
import { manrope, radius, type, useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";
import { summarizeTransactionsByCurrency } from "../src/utils/currencyTotals";
import { formatDate } from "../src/utils/dates";
import { filterTransactions, getTransactionTagOptions, transactionDayKey } from "../src/utils/transactionFilters";

type Filter = "all" | TransactionType;

function monthFromParam(value: string | undefined) {
  const parsed = Number(value);
  const base = Number.isSafeInteger(parsed) && Number.isFinite(new Date(parsed).getTime()) ? new Date(parsed) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

export default function TransactionsScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const params = useLocalSearchParams<{ categoryId?: string; month?: string }>();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(() => monthFromParam(params.month));
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(params.categoryId ?? null);
  const [status, setStatus] = useState<"all" | Transaction["status"]>("all");
  const [kind, setKind] = useState<"all" | Transaction["kind"]>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const focused = useRef(false);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    if (!focused.current) return;
    const request = ++sequence.current;
    const current = () => focused.current && sequence.current === request;
    setLoading(true);
    setLoadError(false);
    try {
      const snapshot = await loadHistorySnapshot(db);
      if (current()) { setItems(snapshot.items); setAccounts(snapshot.accounts); setCategories(snapshot.categories); }
    } catch {
      if (current()) setLoadError(true);
    } finally {
      if (current()) setLoading(false);
    }
  }, [db]);

  useFocusEffect(useCallback(() => {
    focused.current = true; void load();
    return () => { focused.current = false; sequence.current++; };
  }, [load]));
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const tagOptions = useMemo(() => getTransactionTagOptions(items, tag), [items, tag]);
  const filteredItems = useMemo(() => filterTransactions(items, { month, type: filter, query, accountId, categoryId, status, kind, tag }), [items, month, filter, query, accountId, categoryId, status, kind, tag]);
  const hasActiveFilters = filter !== "all" || !!query.trim() || !!accountId || !!categoryId || status !== "all" || kind !== "all" || tag !== null;
  function resetFilters() { setFilter("all"); setQuery(""); setAccountId(null); setCategoryId(null); setStatus("all"); setKind("all"); setTag(null); }
  const totals = useMemo(() => {
    try {
      const currencies = accounts.filter((account) => accountId ? account.id === accountId : !account.isArchived).map((account) => account.currency);
      return { summaries: summarizeTransactionsByCurrency(filteredItems, currencies), error: null };
    } catch (error) {
      return { summaries: [], error: error instanceof Error ? error.message : "Totais indisponíveis." };
    }
  }, [filteredItems, accounts, accountId]);
  const visibleCategories = useMemo(() => categories.filter((category) => category.isActive && (filter === "all" || category.type === filter)), [categories, filter]);
  const quickCategories = useMemo(() => {
    const selected = categories.find((category) => category.id === categoryId);
    const base = visibleCategories.slice(0, 6);
    return selected && !base.some((category) => category.id === selected.id) ? [selected, ...base] : base;
  }, [categories, categoryId, visibleCategories]);
  const dayGroups = useMemo(() => {
    const groups: { key: string; label: string; items: Transaction[]; net: number; currency: string }[] = [];
    for (const item of filteredItems) {
      const key = transactionDayKey(item.occurredAt);
      const group = groups[groups.length - 1]?.key === key ? groups[groups.length - 1] : null;
      const signed = item.kind === "standard" ? (item.type === "income" ? item.amountCents : -item.amountCents) : 0;
      if (group) { group.items.push(item); group.net += signed; }
      else groups.push({ key, label: formatDate(item.occurredAt), items: [item], net: signed, currency: item.accountCurrency ?? "BRL" });
    }
    return groups;
  }, [filteredItems]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Screen scroll={false}>
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.metaStrong, { color: colors.textMuted }]}>{loading ? "Atualizando…" : loadError ? "Histórico indisponível" : `${filteredItems.length} neste período`}</Text>
              <Text accessibilityRole="header" style={[type.h1, { color: colors.text }]}>Extrato</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Novo lançamento" onPress={() => router.push("/quick-entry")} style={({ pressed }) => [styles.add, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
              <Plus color={colors.accentContrast} size={20} strokeWidth={2.6} />
            </Pressable>
          </View>

          <View style={[styles.monthPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <QuietButton accessibilityLabel="Mês anterior" onPress={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} style={styles.monthArrow}><ChevronLeft color={colors.text} size={20} strokeWidth={2.4} /></QuietButton>
            <Text style={[type.bodyStrong, styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <QuietButton accessibilityLabel="Próximo mês" onPress={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} style={styles.monthArrow}><ChevronRight color={colors.text} size={20} strokeWidth={2.4} /></QuietButton>
          </View>

          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><Search color={colors.textMuted} size={18} strokeWidth={2.2} /><TextInput accessibilityLabel="Buscar transações" placeholder="Buscar por nome, categoria ou valor" placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} style={[styles.searchInput, { color: colors.text }]} returnKeyType="search" /></View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.chipScroll} keyboardShouldPersistTaps="handled">
            {(["all", "expense", "income"] as const).map((item) => <Chip key={item} accessibilityRole="tab" label={item === "all" ? "Todas" : item === "expense" ? "Despesas" : "Receitas"} selected={filter === item} onPress={() => { setFilter(item); setCategoryId(null); }} />)}
            {quickCategories.map((category) => <Chip key={category.id} accessibilityRole="radio" label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(categoryId === category.id ? null : category.id)} />)}
            <Chip label={`Filtros${hasActiveFilters ? " · ativos" : ""}`} icon={SlidersHorizontal} dashed onPress={() => setShowAdvanced((value) => !value)} accessibilityLabel={`${showAdvanced ? "Ocultar" : "Mostrar"} filtros avançados`} />
          </ScrollView>

          {showAdvanced && <Tile span style={styles.advancedPanel}>
            <Label>Contas</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{[{ id: null, name: "Todas" }, ...accounts].map((account) => <Chip key={account.id ?? "all"} accessibilityRole="radio" label={account.name} selected={accountId === account.id} onPress={() => setAccountId(account.id)} />)}</ScrollView>
            <Label>Categorias</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{[{ id: null, name: "Todas" }, ...categories.filter((category) => filter === "all" || category.type === filter)].map((category) => <Chip key={category.id ?? "all"} accessibilityRole="radio" label={category.name} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />)}</ScrollView>
            <Label>Tags</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{[{ value: null, label: "Todas" }, { value: "", label: "Sem tags" }, ...tagOptions.map((value) => ({ value, label: value }))].map((option) => <Chip key={option.value === null ? "all-tags" : `tag:${option.value}`} accessibilityRole="radio" accessibilityLabel={`Filtrar tags: ${option.label}`} label={option.label} selected={tag === option.value} onPress={() => setTag(option.value)} />)}</ScrollView>
            <Label>Situação</Label>
            <View style={styles.chipRow}>{([ ["all", "Todas"], ["paid", "Pagas"], ["pending", "Pendentes"] ] as const).map(([value, label]) => <Chip key={value} accessibilityRole="radio" label={label} selected={status === value} onPress={() => setStatus(value)} />)}</View>
            <Label>Natureza</Label>
            <View style={styles.chipRow}>{([ ["all", "Todas"], ["standard", "Lançamentos"], ["transfer", "Transferências"], ["correction", "Correções"] ] as const).map(([value, label]) => <Chip key={value} accessibilityRole="radio" label={label} selected={kind === value} onPress={() => setKind(value)} />)}</View>
            {hasActiveFilters && <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.clearFilters}><Text style={[type.chip, { color: colors.accentText }]}>Zerar filtros</Text></Pressable>}
          </Tile>}

          {!loading && !loadError && (totals.error ? <Text accessibilityRole="alert" style={[type.body, { color: colors.negative, marginBottom: 12 }]}>{totals.error}</Text> : <>
            {totals.summaries.length > 1 && <Text style={[type.meta, { color: colors.textMuted, marginBottom: 8, paddingHorizontal: 4 }]}>Totais separados por moeda · sem conversão cambial</Text>}
            {totals.summaries.map((summary) => <View key={summary.currency} style={styles.summaryRow}>
              <Tile tone="accent" style={styles.summaryTile}><Label style={{ color: colors.accentText }}>Entrou{totals.summaries.length > 1 ? ` · ${summary.currency}` : ""}</Label><Text style={[type.stat, { color: colors.positive, fontSize: 18 }]}>{formatCentsByCurrency(summary.income, summary.currency)}</Text></Tile>
              <Tile style={styles.summaryTile}><Label>Saiu{totals.summaries.length > 1 ? ` · ${summary.currency}` : ""}</Label><Text style={[type.stat, { color: colors.text, fontSize: 18 }]}>{formatCentsByCurrency(summary.expense, summary.currency)}</Text></Tile>
            </View>)}
          </>)}

          {loading ? <SkeletonRows count={6} /> : loadError ? (
            <EmptyState title="Histórico indisponível" description="Não foi possível carregar os lançamentos." actionLabel="Tentar novamente" onAction={() => void load()} />
          ) : filteredItems.length === 0 ? (
            <EmptyState title="Nada por aqui" description="Não há lançamentos neste mês para esta busca e filtro." actionLabel={hasActiveFilters ? "Zerar filtros" : "Criar lançamento"} onAction={hasActiveFilters ? resetFilters : () => router.push("/quick-entry")} />
          ) : dayGroups.map((group) => <View key={group.key} style={styles.dayGroup}>
            <View style={styles.dayHeader}><Text style={[type.metaStrong, { color: colors.textMuted }]}>{group.label}</Text><Text style={[type.metaStrong, { color: colors.textMuted, fontVariant: ["tabular-nums"] }]}>{group.net === 0 ? "" : `${group.net > 0 ? "+ " : "− "}${formatCentsByCurrency(Math.abs(group.net), group.currency)}`}</Text></View>
            <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {group.items.map((item, index) => <TransactionItem key={item.id} transaction={item} showDate={false} isLast={index === group.items.length - 1} onPress={() => router.push(`/transaction/${item.id}`)} />)}
            </View>
          </View>)}
        </Screen>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, paddingHorizontal: 4 },
  add: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monthPicker: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthArrow: { width: 44, height: 44, minWidth: 44, minHeight: 44 }, monthLabel: { flex: 1, textAlign: "center", textTransform: "capitalize" },
  search: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }, searchInput: { flex: 1, height: 46, fontFamily: manrope.semibold, fontSize: 14 },
  chipScroll: { marginHorizontal: -16, marginBottom: 10 }, chipRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16 },
  advancedPanel: { gap: 8, marginBottom: 10 }, clearFilters: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 6 }, summaryTile: { flex: 1, gap: 4, padding: 14 },
  dayGroup: { marginTop: 10, gap: 6 }, dayHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  list: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
});
