/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DmgPalettePreset, Palette4, RGBColor } from '../types/retro';

export const DMG_PALETTES: Record<DmgPalettePreset, Palette4> = {
  dmg_original: {
    name: 'DMG-01 Classic Olive',
    colors: [
      { r: 155, g: 188, b: 15 },  // Lightest #9bbc0f
      { r: 139, g: 172, b: 15 },  // Light     #8bac0f
      { r: 48, g: 98, b: 48 },    // Dark      #306230
      { r: 15, g: 56, b: 15 },    // Darkest   #0f380f
    ],
  },
  pocket: {
    name: 'Game Boy Pocket B&W',
    colors: [
      { r: 228, g: 228, b: 228 }, // #e4e4e4
      { r: 160, g: 160, b: 160 }, // #a0a0a0
      { r: 86, g: 86, b: 86 },    // #565656
      { r: 20, g: 20, b: 20 },    // #141414
    ],
  },
  gameboy_light: {
    name: 'Game Boy Light Teal',
    colors: [
      { r: 140, g: 242, b: 220 }, // #8cf2dc
      { r: 72, g: 182, b: 168 },  // #48b6a8
      { r: 36, g: 120, b: 120 },  // #247878
      { r: 16, g: 52, b: 62 },    // #10343e
    ],
  },
  sgb_pastel: {
    name: 'Super Game Boy Pastel',
    colors: [
      { r: 255, g: 239, b: 206 },
      { r: 247, g: 165, b: 140 },
      { r: 181, g: 74, b: 107 },
      { r: 49, g: 24, b: 57 },
    ],
  },
  sgb_ocean: {
    name: 'Super Game Boy Deep Ocean',
    colors: [
      { r: 207, g: 239, b: 255 },
      { r: 123, g: 189, b: 214 },
      { r: 57, g: 115, b: 156 },
      { r: 16, g: 41, b: 74 },
    ],
  },
  sgb_crimson: {
    name: 'Super Game Boy Crimson',
    colors: [
      { r: 255, g: 206, b: 206 },
      { r: 222, g: 107, b: 107 },
      { r: 148, g: 41, b: 41 },
      { r: 49, g: 8, b: 16 },
    ],
  },
  virtual_boy: {
    name: 'Virtual Boy Crimson Red',
    colors: [
      { r: 255, g: 40, b: 40 },
      { r: 175, g: 20, b: 20 },
      { r: 96, g: 10, b: 10 },
      { r: 16, g: 0, b: 0 },
    ],
  },
};

/** Convert 8-bit RGB to 15-bit RGB555 (as used by GBC and GBA hardware) */
export function rgbToRgb555(r: number, g: number, b: number): number {
  const r5 = Math.min(31, Math.max(0, Math.round((r * 31) / 255)));
  const g5 = Math.min(31, Math.max(0, Math.round((g * 31) / 255)));
  const b5 = Math.min(31, Math.max(0, Math.round((b * 31) / 255)));
  return r5 | (g5 << 5) | (b5 << 10);
}

/** Convert 15-bit RGB555 back to 8-bit RGB */
export function rgb555ToRgb(val: number): RGBColor {
  const r5 = val & 0x1f;
  const g5 = (val >> 5) & 0x1f;
  const b5 = (val >> 10) & 0x1f;
  return {
    r: Math.round((r5 * 255) / 31),
    g: Math.round((g5 * 255) / 31),
    b: Math.round((b5 * 255) / 31),
  };
}

/** Color distance in perceptual RGB space */
export function colorDistanceSq(c1: RGBColor, c2: RGBColor): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  // Weighted RGB distance for human eye sensitivity
  return 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
}

/** Find nearest color in a given 4-color palette */
export function findNearestColorIndex(target: RGBColor, palette: RGBColor[]): number {
  let minIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const d = colorDistanceSq(target, palette[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

/**
 * Authentic GBC LCD color correction matrix (Gambatte / CGB-001)
 * Simulates the darker, higher-gamma reflective LCD display.
 */
export function applyGbcColorCorrection(r: number, g: number, b: number): RGBColor {
  const correctedR = Math.min(255, Math.round((r * 13 + g * 2 + b * 1) / 16));
  const correctedG = Math.min(255, Math.round((g * 14 + b * 2) / 16));
  const correctedB = Math.min(255, Math.round((r * 1 + g * 2 + b * 13) / 16));
  return { r: correctedR, g: correctedG, b: correctedB };
}

/**
 * Authentic GBA AGB-001 reflective LCD color correction
 */
export function applyGbaColorCorrection(r: number, g: number, b: number): RGBColor {
  // AGB-001 non-backlit LCD color profile
  const cr = Math.min(255, Math.round(0.85 * r + 0.10 * g + 0.05 * b));
  const cg = Math.min(255, Math.round(0.05 * r + 0.85 * g + 0.10 * b));
  const cb = Math.min(255, Math.round(0.05 * r + 0.15 * g + 0.80 * b));
  return { r: cr, g: cg, b: cb };
}

/**
 * Generate 8 distinct 4-color palettes for Game Boy Color Background (BCPS 0-7)
 * GBC PPU supports 8 palettes of 4 colors each for the background tilemap.
 */
export function generateDefaultGbcPalettes(): RGBColor[][] {
  return [
    // Palette 0: Outdoor foliage / green
    [
      { r: 248, g: 248, b: 240 },
      { r: 128, g: 200, b: 96 },
      { r: 56, g: 144, b: 48 },
      { r: 16, g: 48, b: 24 },
    ],
    // Palette 1: Warm skin / earth / orange
    [
      { r: 255, g: 240, b: 224 },
      { r: 240, g: 160, b: 104 },
      { r: 192, g: 96, b: 40 },
      { r: 72, g: 32, b: 16 },
    ],
    // Palette 2: Sky / water / cyan
    [
      { r: 232, g: 248, b: 255 },
      { r: 120, g: 184, b: 248 },
      { r: 40, g: 104, b: 192 },
      { r: 16, g: 32, b: 80 },
    ],
    // Palette 3: Crimson / flame / red
    [
      { r: 255, g: 232, b: 232 },
      { r: 232, g: 88, b: 88 },
      { r: 168, g: 32, b: 32 },
      { r: 56, g: 8, b: 16 },
    ],
    // Palette 4: Royal violet / purple
    [
      { r: 248, g: 232, b: 255 },
      { r: 176, g: 112, b: 224 },
      { r: 104, g: 48, b: 160 },
      { r: 32, g: 16, b: 64 },
    ],
    // Palette 5: Golden sun / yellow
    [
      { r: 255, g: 255, b: 216 },
      { r: 248, g: 208, b: 64 },
      { r: 184, g: 128, b: 16 },
      { r: 64, g: 40, b: 8 },
    ],
    // Palette 6: Slate / metal / high-contrast gray
    [
      { r: 240, g: 240, b: 248 },
      { r: 168, g: 176, b: 192 },
      { r: 88, g: 96, b: 120 },
      { r: 24, g: 28, b: 40 },
    ],
    // Palette 7: Deep shadow / black & white
    [
      { r: 255, g: 255, b: 255 },
      { r: 176, g: 176, b: 176 },
      { r: 96, g: 96, b: 96 },
      { r: 16, g: 16, b: 16 },
    ],
  ];
}
