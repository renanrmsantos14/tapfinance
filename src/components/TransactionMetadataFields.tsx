import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Label } from "./ui";
import { radius, useAppColors } from "../theme";
import { MAX_TAG_LENGTH, MAX_TRANSACTION_TAGS, normalizeTransactionTags } from "../utils/transactionTags";

type Props = { title: string; notes: string; tags: string[]; tagInput: string; disabled?: boolean; onTitleChange: (value: string) => void; onNotesChange: (value: string) => void; onTagsChange: (tags: string[]) => void; onTagInputChange: (value: string) => void };
export function TransactionMetadataFields({ title, notes, tags, tagInput, disabled = false, onTitleChange, onNotesChange, onTagsChange, onTagInputChange }: Props) {
  const colors = useAppColors(); const [error, setError] = useState<string | null>(null);
  function addTag() {
    if (disabled || !tagInput.trim()) return;
    try { onTagsChange(normalizeTransactionTags([...tags, tagInput])); onTagInputChange(""); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Tag inválida."); }
  }
  return <View style={styles.fields}>
    <View style={styles.field}><Label>Título (opcional)</Label><TextInput accessibilityLabel="Título do lançamento" value={title} onChangeText={onTitleChange} editable={!disabled} maxLength={120} placeholder="Ex.: Conta de energia" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
    <View style={styles.field}><Label>Notas (opcional)</Label><TextInput accessibilityLabel="Notas do lançamento" value={notes} onChangeText={onNotesChange} editable={!disabled} multiline maxLength={2000} placeholder="Detalhes, referências ou lembretes" placeholderTextColor={colors.textMuted} style={[styles.input, styles.notes, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
    <View style={styles.field}><Label>Tags (opcional)</Label><View style={styles.tags}>{tags.map((tag, index) => <Pressable key={`${index}:${tag}`} accessibilityRole="button" accessibilityLabel={`Remover tag ${tag}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { onTagsChange(tags.filter((_, position) => position !== index)); setError(null); }} style={({ pressed }) => [styles.tag, { backgroundColor: colors.accentSoft, borderColor: colors.border, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={{ color: colors.accent, flexShrink: 1 }}>{tag}</Text><Text style={{ color: colors.accent }}>×</Text></Pressable>)}</View>
      <View style={styles.addRow}><TextInput accessibilityLabel="Nova tag" value={tagInput} onChangeText={(value) => { onTagInputChange(value); setError(null); }} editable={!disabled} maxLength={MAX_TAG_LENGTH} returnKeyType="done" onSubmitEditing={addTag} placeholder="Ex.: Trabalho" placeholderTextColor={colors.textMuted} style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /><Pressable accessibilityRole="button" accessibilityLabel="Adicionar tag" accessibilityState={{ disabled: disabled || !tagInput.trim() }} disabled={disabled || !tagInput.trim()} onPress={addTag} style={({ pressed }) => [styles.add, { borderColor: colors.border, opacity: disabled || !tagInput.trim() ? 0.45 : pressed ? 0.7 : 1 }]}><Text style={{ color: colors.accent }}>Adicionar</Text></Pressable></View>
      <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>Até {MAX_TRANSACTION_TAGS} tags. Uma tag digitada também é incluída ao salvar.</Text>
      {error && <Text accessibilityRole="alert" style={{ color: colors.negative, lineHeight: 20 }}>{error}</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({ fields: { gap: 22, marginTop: 22 }, field: { gap: 8 }, input: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 }, notes: { minHeight: 100, textAlignVertical: "top" }, tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, tag: { minHeight: 44, maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.round, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }, addRow: { flexDirection: "row", gap: 8 }, add: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderRadius: radius.md } });
