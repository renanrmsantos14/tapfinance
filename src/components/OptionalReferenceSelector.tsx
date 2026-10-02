import { ScrollView, View } from "react-native";
import { Text } from "./Text";
import { Chip, Label } from "./ui";
import { type, useAppColors } from "../theme";

export function OptionalReferenceSelector({ label, items, selectedId, onSelect, disabled = false }: { label: string; items: { id: string; name: string }[]; selectedId: string | null; onSelect: (id: string | null) => void; disabled?: boolean }) {
  const colors = useAppColors(); const unavailable = selectedId !== null && !items.some((item) => item.id === selectedId);
  const options = [{ id: null, name: "Nenhum" }, ...items];
  return <View style={{ gap: 8 }}>
    <Label style={{ paddingHorizontal: 4 }}>{label}</Label>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((item) => <Chip key={item.id ?? "none"} accessibilityRole="radio" accessibilityLabel={`${label}: ${item.name}`} label={item.name} selected={selectedId === item.id} disabled={disabled} onPress={() => onSelect(item.id)} />)}
    </ScrollView>
    {unavailable && <Text accessibilityRole="alert" style={[type.meta, { color: colors.warning, paddingHorizontal: 4 }]}>O vínculo selecionado não está mais disponível. Escolha outro ou "Nenhum".</Text>}
  </View>;
}
