import assert from "node:assert/strict";
import test from "node:test";
import { darkColors, lightColors } from "../src/theme/palette";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

for (const [name, colors] of [["light", lightColors], ["dark", darkColors]] as const) {
  test(`${name} palette keeps normal text and semantic labels at 4.5:1 contrast`, () => {
    const pairs = [
      ["text", "background"], ["text", "surface"], ["textMuted", "background"],
      ["textMuted", "surface"], ["textMuted", "surfaceMuted"],
      ["accent", "accentSoft"], ["accentContrast", "accent"],
      ["positive", "positiveSoft"], ["negative", "negativeSoft"], ["warning", "warningSoft"],
    ] as const;
    for (const [foreground, background] of pairs) {
      const values = [luminance(colors[foreground]), luminance(colors[background])].sort((a, b) => b - a);
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio.toFixed(2)}:1`);
    }
  });
}
