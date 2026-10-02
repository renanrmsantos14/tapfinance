import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "./Text";
import { X } from "lucide-react-native";
import { Label } from "./ui";
import { manrope, radius, type, useAppColors } from "../theme";
import { MAX_TAG_LENGTH, MAX_TRANSACTION_TAGS, normalizeTransactionTags } from "../utils/transactionTags";

type Props = { title: string; notes: string; tags: string[]; tagInput: string; disabled?: boolean; onTitleChange: (value: string) => void; onNotesChange: (value: string) => void; onTagsChange: (tags: string[]) => void; onTagInputChange: (value: string) => void };
export function TransactionMetadataFields({ title, notes, tags, tagInput, disabled = false, onTitleChange, onNotesChange, onTagsChange, onTagInputChange }: Props) {
  const colors = useAppColors(); const [error, setError] = useState<string | null>(null);
  const field = { backgroundColor: colors.background, borderColor: colors.border, opacity: disabled ? 0.5 : 1 };
  function addTag() {
    if (disabled || !tagInput.trim()) return;
    try { onTagsChange(normalizeTransactionTags([...tags, tagInput])); onTagInputChange(""); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Tag inválida."); }
  }
  return <View style={styles.fields}>
    <View style={[styles.field, field]}><Label>Título <Text style={styles.optional}>(opcional)</Text></Label><TextInput accessibilityLabel="Título do lançamento" value={title} onChangeText={onTitleChange} editable={!disabled} maxLength={120} placeholder="Ex.: Conta de energia" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.text }]} /></View>
    <View style={[styles.field, field]}><Label>Notas <Text style={styles.optional}>(opcional)</Text></Label><TextInput accessibilityLabel="Notas do lançamento" value={notes} onChangeText={onNotesChange} editable={!disabled} multiline maxLength={2000} placeholder="Detalhes, referências ou lembretes" placeholderTextColor={colors.textMuted} style={[styles.input, styles.notes, { color: colors.text }]} /></View>
    <View style={[styles.field, field]}>
      <View style={styles.rowBetween}><Label>Tags</Label><Text style={[type.meta, { color: colors.textMuted }]}>{tags.length} de {MAX_TRANSACTION_TAGS}</Text></View>
      <View style={styles.tags}>
        {tags.map((tag, index) => <Pressable key={`${index}:${tag}`} accessibilityRole="button" accessibilityLabel={`Remover tag ${tag}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { onTagsChange(tags.filter((_, position) => position !== index)); setError(null); }} style={({ pressed }) => [styles.tag, { backgroundColor: colors.accentSoft, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}><Text numberOfLines={1} style={[type.metaStrong, { color: colors.accentText, flexShrink: 1 }]}>{tag}</Text><X color={colors.accentText} size={13} strokeWidth={2.6} /></Pressable>)}
        <TextInput accessibilityLabel="Nova tag" value={tagInput} onChangeText={(value) => { onTagInputChange(value); setError(null); }} editable={!disabled} maxLength={MAX_TAG_LENGTH} returnKeyType="done" onSubmitEditing={addTag} blurOnSubmit={false} placeholder="Nova tag" placeholderTextColor={colors.textMuted} style={[styles.input, styles.tagInput, { color: colors.text }]} />
        {!!tagInput.trim() && <Pressable accessibilityRole="button" accessibilityLabel="Adicionar tag" accessibilityState={{ disabled }} disabled={disabled} onPress={addTag} style={({ pressed }) => [styles.add, { opacity: pressed ? 0.7 : 1 }]}><Text style={[type.chip, { color: colors.accentText }]}>Adicionar</Text></Pressable>}
      </View>
      <Text style={[type.meta, { color: colors.textMuted }]}>Até {MAX_TRANSACTION_TAGS} tags. Uma tag digitada também é incluída ao salvar.</Text>
      {error && <Text accessibilityRole="alert" style={[type.body, { color: colors.negative }]}>{error}</Text>}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  fields: { gap: 10 },
  field: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  optional: { textTransform: "none", letterSpacing: 0, fontFamily: manrope.semibold },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  input: { minHeight: 28, padding: 0, fontFamily: manrope.bold, fontSize: 15 },
  notes: { minHeight: 64, textAlignVertical: "top" },
  tags: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  tag: { minHeight: 32, maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: radius.round, paddingLeft: 10, paddingRight: 8 },
  tagInput: { flexGrow: 1, minWidth: 90, minHeight: 32 },
  add: { minHeight: 32, justifyContent: "center", paddingHorizontal: 4 },
});
