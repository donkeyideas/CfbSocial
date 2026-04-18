/**
 * Ensures a hex school color is visible against the current theme background.
 * In dark mode, lightens colors that are too dark to see.
 * In light mode, darkens colors that are too light to see.
 * Preserves hue and saturation — only adjusts HSL lightness.
 */
export function readableSchoolColor(hex: string, isDark: boolean, minL?: number): string {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  const MIN_L = minL ?? 0.35;
  const MAX_L = 0.85;

  if (isDark && l < MIN_L) {
    // Remap 0–MIN_L → MIN_L–(MIN_L+0.15), preserves relative ordering
    l = MIN_L + (l / MIN_L) * 0.15;
  } else if (!isDark && l > MAX_L) {
    // Remap 0.85–1.0 → 0.70–0.85
    l = 0.70 + ((l - MAX_L) / (1 - MAX_L)) * 0.15;
  } else {
    return hex; // No adjustment needed
  }

  // HSL → RGB
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r2: number, g2: number, b2: number;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n * 255)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
