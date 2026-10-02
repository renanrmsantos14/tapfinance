import { forwardRef } from "react";
import { Text as NativeText, StyleSheet, type TextProps, type TextStyle } from "react-native";
import { manropeFamily } from "../theme/fonts";

/** Drop-in replacement for React Native's Text that renders Manrope at the weight the style asks for. */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, ...props }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const resolved: TextStyle = flat.fontFamily ? {} : { fontFamily: manropeFamily(flat.fontWeight), fontWeight: "normal" };
  return <NativeText ref={ref} {...props} style={[style, resolved]} />;
});
