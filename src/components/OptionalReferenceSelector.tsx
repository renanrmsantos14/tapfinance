import { Pressable, ScrollView, Text, View } from "react-native";
import { Label } from "./ui";
import { radius, useAppColors } from "../theme";

export function OptionalReferenceSelector({ label, items, selectedId, onSelect, disabled = false }: { label: string; items: { id: string; name: string }[]; selectedId: string | null; onSelect: (id: string | null) => void; disabled?: boolean }) {
  const colors = useAppColors(); const unavailable = selectedId !== null && !items.some((item) => item.id === selectedId);
  const options = [{ id: null, name: "Nenhum" }, ...items];
  return <View style={{ gap: 8, marginTop: 22 }}><Label>{label}</Label><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{options.map((item) => <Pressable key={item.id ?? "none"} accessibilityRole="radio" accessibilityLabel={`${label}: ${item.name}`} accessibilityState={{ selected: selectedId === item.id, disabled }} disabled={disabled} onPress={() => onSelect(item.id)} style={({ pressed }) => ({ minHeight: 48, maxWidth: 240, borderWidth: 1, borderColor: selectedId === item.id ? colors.accent : colors.border, backgroundColor: selectedId === item.id ? colors.accentSoft : colors.surface, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}><Text style={{ color: selectedId === item.id ? colors.accent : colors.text }}>{item.name}</Text></Pressable>)}</ScrollView>{unavailable && <Text accessibilityRole="alert" style={{ color: colors.warning, lineHeight: 20 }}>O vínculo anterior não está ativo. Escolha outro cadastro ou “Nenhum” antes de salvar.</Text>}</View>;
}
