/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ConsoleMode = 'DMG' | 'GBC' | 'GBA';

export type DitherAlgorithm =
  | 'atkinson'
  | 'floyd-steinberg'
  | 'bayer4x4'
  | 'bayer8x8'
  | 'bayer2x2'
  | 'burkes'
  | 'sierra'
  | 'none';

export type DmgPalettePreset =
  | 'dmg_original'
  | 'pocket'
  | 'gameboy_light'
  | 'sgb_pastel'
  | 'sgb_ocean'
  | 'sgb_crimson'
  | 'virtual_boy';

export type ShellType =
  | 'dmg_classic'
  | 'pocket_silver'
  | 'color_atomic_purple'
  | 'color_berry'
  | 'gba_indigo'
  | 'gba_arctic'
  | 'clean_lab';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface Palette4 {
  name: string;
  colors: [RGBColor, RGBColor, RGBColor, RGBColor];
}

export interface Tile2bpp {
  id: number;
  bytes: Uint8Array; // 16 bytes for DMG/GBC
  pixels: number[][]; // 8x8 array with values 0..3
  usageCount: number;
}

export interface TilemapCell {
  tileId: number;
  paletteIdx: number; // 0-7 for GBC
  vramBank: number;   // 0 or 1 for GBC
  flipX: boolean;
  flipY: boolean;
  x: number;
  y: number;
}

export interface HeaderByteDetail {
  offset: number;
  hexOffset: string;
  byte: number;
  hex: string;
  ascii: string;
  field: string;
  meaning: string;
  category: 'entry' | 'logo' | 'title' | 'spec' | 'checksum' | 'code';
}

export interface RomHeaderInfo {
  console: ConsoleMode;
  entryPoint: string;
  title: string;
  gameCode?: string;
  cgbFlag?: string;
  sgbFlag?: string;
  cartridgeType: string;
  romSize: string;
  ramSize: string;
  destination: string;
  licenseeCode: string;
  maskVersion: number;
  headerChecksum: number;
  computedHeaderChecksum: number;
  isHeaderChecksumValid: boolean;
  globalChecksum: number;
  computedGlobalChecksum: number;
  isGlobalChecksumValid: boolean;
  totalRomBytes: number;
  headerBytes: Uint8Array;
  byteDetails: HeaderByteDetail[];
}

export interface VideoProcessingSettings {
  console: ConsoleMode;
  ditherAlgorithm: DitherAlgorithm;
  ditherStrength: number; // 0..1
  dmgPalette: DmgPalettePreset;
  brightness: number;     // -100..100
  contrast: number;       // 0.2..2.5
  gamma: number;          // 0.4..2.5
  exposure: number;       // -50..50
  sharpness: number;      // 0..1
  invert: boolean;
  showLcdGrid: boolean;
  showScanlines: boolean;
  colorCorrection: boolean; // GBC/GBA LCD saturation boost/color curve
  mirror: boolean;
  romTitle: string;
  gameCode: string;
}
