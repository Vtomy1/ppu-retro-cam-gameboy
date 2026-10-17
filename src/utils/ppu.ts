/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tile2bpp, TilemapCell } from '../types/retro';

/**
 * Encode an 8x8 pixel tile (with values 0..3) into Game Boy 2bpp planar format (16 bytes)
 */
export function encodeTile2bpp(pixels8x8: number[][]): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let y = 0; y < 8; y++) {
    let lowByte = 0;
    let highByte = 0;
    for (let x = 0; x < 8; x++) {
      const colorIdx = pixels8x8[y][x] & 0x03;
      const bitPos = 7 - x;
      const bit0 = colorIdx & 1;
      const bit1 = (colorIdx >> 1) & 1;
      lowByte |= bit0 << bitPos;
      highByte |= bit1 << bitPos;
    }
    bytes[y * 2] = lowByte;
    bytes[y * 2 + 1] = highByte;
  }
  return bytes;
}

/**
 * Decode 16 bytes of 2bpp planar tile data back into an 8x8 array of color indices (0..3)
 */
export function decodeTile2bpp(bytes: Uint8Array, offset = 0): number[][] {
  const pixels: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    const lowByte = bytes[offset + y * 2];
    const highByte = bytes[offset + y * 2 + 1];
    for (let x = 0; x < 8; x++) {
      const bitPos = 7 - x;
      const bit0 = (lowByte >> bitPos) & 1;
      const bit1 = (highByte >> bitPos) & 1;
      row.push((bit1 << 1) | bit0);
    }
    pixels.push(row);
  }
  return pixels;
}

/**
 * Compare two 16-byte tiles for equality
 */
function areTilesEqual(t1: Uint8Array, t2: Uint8Array): boolean {
  for (let i = 0; i < 16; i++) {
    if (t1[i] !== t2[i]) return false;
  }
  return true;
}

/**
 * Extract 8x8 tiles from a 160x144 2bpp image, optionally deduplicating them into a VRAM pattern table.
 * Game Boy screen is 20 tiles wide x 18 tiles tall = 360 visible tiles.
 * Background map is 32x32 tiles (1024 cells).
 */
export function processPpuTiles(
  pixelIndices: Uint8Array, // 160 * 144 array with 0..3 indices
  width = 160,
  height = 144,
  deduplicate = false
): {
  tiles: Tile2bpp[];
  tilemap: Uint8Array; // 32x32 = 1024 bytes (Game Boy BG map at $9800)
  visibleCells: TilemapCell[]; // 20x18 cells
  uniqueTileCount: number;
  totalVisibleTiles: number;
} {
  const tileCols = Math.floor(width / 8);  // 20
  const tileRows = Math.floor(height / 8); // 18
  const totalVisibleTiles = tileCols * tileRows; // 360

  const tiles: Tile2bpp[] = [];
  const tilemap = new Uint8Array(32 * 32); // Game Boy VRAM BG Map size
  const visibleCells: TilemapCell[] = [];

  for (let ty = 0; ty < tileRows; ty++) {
    for (let tx = 0; tx < tileCols; tx++) {
      // Extract 8x8 pixels
      const pixels8x8: number[][] = [];
      for (let py = 0; py < 8; py++) {
        const row: number[] = [];
        for (let px = 0; px < 8; px++) {
          const x = tx * 8 + px;
          const y = ty * 8 + py;
          row.push(pixelIndices[y * width + x] & 0x03);
        }
        pixels8x8.push(row);
      }

      const tileBytes = encodeTile2bpp(pixels8x8);

      let tileId = -1;
      if (deduplicate) {
        // Search if already in unique tiles
        for (let i = 0; i < tiles.length; i++) {
          if (areTilesEqual(tiles[i].bytes, tileBytes)) {
            tileId = i;
            tiles[i].usageCount++;
            break;
          }
        }
      }

      if (tileId === -1) {
        // If limit reached without deduplication (max 256 for standard 8-bit tile ID)
        tileId = tiles.length;
        tiles.push({
          id: tileId,
          bytes: tileBytes,
          pixels: pixels8x8,
          usageCount: 1,
        });
      }

      // BG Map coordinate (ty * 32 + tx)
      const mapIdx = ty * 32 + tx;
      tilemap[mapIdx] = tileId % 256; // 8-bit Tile ID

      visibleCells.push({
        tileId,
        paletteIdx: 0,
        vramBank: 0,
        flipX: false,
        flipY: false,
        x: tx,
        y: ty,
      });
    }
  }

  return {
    tiles,
    tilemap,
    visibleCells,
    uniqueTileCount: tiles.length,
    totalVisibleTiles,
  };
}

/**
 * Build GBC VRAM Bank 1 Attribute Map
 * Each entry: Bit 0-2 = Palette (0-7), Bit 3 = Bank (0/1)
 */
export function buildGbcAttributeMap(
  tilePaletteIndices: Uint8Array, // 360 entries for 20x18
  tileCols = 20,
  tileRows = 18
): Uint8Array {
  const attributeMap = new Uint8Array(32 * 32);
  for (let ty = 0; ty < tileRows; ty++) {
    for (let tx = 0; tx < tileCols; tx++) {
      const idx = ty * tileCols + tx;
      const palette = tilePaletteIndices[idx] & 0x07;
      const mapIdx = ty * 32 + tx;
      attributeMap[mapIdx] = palette; // Bank 0, no flip, palette 0-7
    }
  }
  return attributeMap;
}
