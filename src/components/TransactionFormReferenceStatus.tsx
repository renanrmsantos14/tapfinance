import { ActivityIndicator, View } from "react-native";
import { Text } from "./Text";
import { router } from "expo-router";
import { EmptyState } from "./ui";
import { useAppColors } from "../theme";

export function TransactionFormReferenceStatus({ loading, error, onRetry, missingAccount, missingCategory }: { loading: boolean; error: string | null; onRetry: () => void; missingAccount: boolean; missingCategory: boolean }) {
  const colors = useAppColors();
  if (loading) return <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, alignItems: "center", marginVertical: 16 }}><ActivityIndicator color={colors.accent} /><Text style={{ color: colors.textMuted, flex: 1, lineHeight: 20 }}>Carregando contas, categorias e vínculos…</Text></View>;
  if (error) return <View accessibilityLiveRegion="polite" style={{ marginVertical: 16 }}><EmptyState title="Não foi possível carregar os cadastros" description={`${error} Os campos preenchidos permanecem nesta tela.`} actionLabel="Tentar novamente" onAction={onRetry} /></View>;
  if (missingAccount) return <EmptyState title="Nenhuma conta disponível" description="Cadastre uma conta ativa antes de salvar o lançamento." actionLabel="Gerenciar contas" onAction={() => router.push("/collection/accounts")} />;
  if (missingCategory) return <EmptyState title="Nenhuma categoria disponível" description="Cadastre uma categoria para este tipo de lançamento ou altere receita/despesa." actionLabel="Gerenciar categorias" onAction={() => router.push("/collection/categories")} />;
  return null;
}
