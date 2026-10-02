import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../src/components/Text";
import { ChevronLeft, ChevronRight, Ellipsis, Tags } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import Svg, { Circle } from "react-native-svg";
import { BottomNav } from "../src/components/BottomNav";
import { categoryIcon } from "../src/components/CategorySelector";
import { BentoGrid, EmptyState, IconBox, Label, QuietButton, Screen, SkeletonRows, Tile } from "../src/components/ui";
import { loadInsightsSnapshot, type InsightsGroup } from "../src/services/insightsService";
import { type, useAppColors } from "../src/theme";
import { formatCentsByCurrency } from "../src/utils/currency";

const RADIUS = 44;
const SIZE = 112;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const colors = useAppColors();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [groups, setGroups] = useState<InsightsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setLoadError(null);
    try {
      const snapshot = await loadInsightsSnapshot(db, month.getTime());
      if (request === sequence.current) setGroups(snapshot.groups);
    } catch (error) {
      if (request === sequence.current) setLoadError(error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [db, month]);
  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current += 1; }; }, [load]));

  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shades = [colors.accent, colors.accentText, colors.inkMuted, colors.surfaceStrong];

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.scroll}><Screen scroll={false}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.metaStrong, { color: colors.textMuted, textTransform: "capitalize" }]}>{monthLabel} · despesas pagas</Text>
          <Text accessibilityRole="header" style={[type.h1, { color: colors.text }]}>Categorias</Text>
        </View>
        <QuietButton framed accessibilityLabel="Mês anterior" onPress={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft color={colors.text} size={18} strokeWidth={2.4} /></QuietButton>
        <QuietButton framed accessibilityLabel="Próximo mês" onPress={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight color={colors.text} size={18} strokeWidth={2.4} /></QuietButton>
      </View>

      {loading ? <SkeletonRows count={5} /> : loadError ? <EmptyState title="Não foi possível carregar" description={loadError} actionLabel="Tentar novamente" onAction={() => void load()} /> : groups.every((group) => group.categories.length === 0) ? (
        <EmptyState title="Nenhuma despesa paga neste mês" description="Os gastos aparecem aqui agrupados por categoria assim que forem pagos." actionLabel="Gerenciar categorias" onAction={() => router.push("/collection/categories")} />
      ) : groups.filter((group) => group.categories.length > 0).map((group) => {
        const top = group.categories[0];
        let offset = 0;
        const segments = group.categories.slice(0, 4).map((item, index) => {
          const length = group.expense > 0 ? item.total / group.expense * CIRCUMFERENCE : 0;
          const segment = { id: item.id, color: shades[index], length, offset };
          offset += length;
          return segment;
        });
        return <View key={group.currency} style={styles.group}>
          {groups.length > 1 && <Label style={{ paddingHorizontal: 4 }}>{group.currency}</Label>}
          <BentoGrid>
            <Tile ink span style={styles.donutTile}>
              <View style={styles.donutWrap}>
                <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} accessible={false}>
                  <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={16} />
                  {segments.map((segment) => <Circle key={segment.id} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={segment.color} strokeWidth={16} strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`} strokeDashoffset={-segment.offset} rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`} />)}
                </Svg>
                <View style={styles.donutCenter}><Text style={[type.eyebrow, { color: colors.inkMuted, fontSize: 9 }]}>Total</Text><Text style={[type.amount, { color: colors.inkText }]}>{formatCentsByCurrency(group.expense, group.currency).replace(/^[A-Z$ ]+ /, "")}</Text></View>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Label style={{ color: colors.inkMuted }}>Maior gasto</Label>
                <Text numberOfLines={1} style={[type.stat, { color: colors.inkText }]}>{top.name}</Text>
                <Text style={[type.metaStrong, { color: colors.inkMuted }]}>{Math.round(top.percentage)}% · {formatCentsByCurrency(top.total, group.currency)}</Text>
                <Text style={[type.meta, { color: colors.inkMuted }]}>{group.categories.length} {group.categories.length === 1 ? "categoria" : "categorias"} · {group.count} lançamentos</Text>
              </View>
            </Tile>
            {group.categories.map((item) => {
              const Icon = categoryIcon(item.icon) ?? Ellipsis;
              return <Tile key={item.id} onPress={() => router.push({ pathname: "/transactions", params: { categoryId: item.id, month: String(month.getTime()) } })} accessibilityLabel={`${item.name}: ${formatCentsByCurrency(item.total, group.currency)}, ${Math.round(item.percentage)}% das despesas`} accessibilityHint="Abre o extrato filtrado por esta categoria" style={styles.categoryTile}>
                <IconBox icon={Icon} color={colors.accentText} background={colors.accentSoft} />
                <Text numberOfLines={1} style={[type.bodyStrong, { color: colors.text }]}>{item.name}</Text>
                <Text style={[type.stat, { color: colors.text, fontSize: 20 }]}>{formatCentsByCurrency(item.total, group.currency).replace(/^[A-Z$ ]+ /, "")}</Text>
                <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.max(item.percentage, 1.5)}%`, backgroundColor: colors.accent }]} /></View>
                <Text style={[type.meta, { color: colors.textMuted }]}>{Math.round(item.percentage)}% · {item.count} {item.count === 1 ? "lançamento" : "lançamentos"}</Text>
              </Tile>;
            })}
            <Tile onPress={() => router.push("/collection/categories")} accessibilityLabel="Gerenciar categorias" style={[styles.categoryTile, styles.manageTile, { borderColor: colors.textMuted }]}>
              <IconBox icon={Tags} color={colors.textMuted} background={colors.surfaceMuted} />
              <Text style={[type.bodyStrong, { color: colors.textMuted }]}>Gerenciar</Text>
              <Text style={[type.meta, { color: colors.textMuted }]}>Criar, renomear ou arquivar categorias.</Text>
            </Tile>
          </BentoGrid>
        </View>;
      })}
    </Screen></ScrollView>
    <BottomNav />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingHorizontal: 4 },
  group: { marginBottom: 14, gap: 8 },
  donutTile: { flexDirection: "row", alignItems: "center", gap: 18, padding: 18 },
  donutWrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  donutCenter: { position: "absolute", alignItems: "center" },
  categoryTile: { width: "48%", flexGrow: 1, gap: 8 },
  manageTile: { borderStyle: "dashed", backgroundColor: "transparent" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" }, fill: { height: "100%", borderRadius: 3 },
});
