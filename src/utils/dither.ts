/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DitherAlgorithm, RGBColor } from '../types/retro';
import { colorDistanceSq, findNearestColorIndex } from './palette';

// Standard Bayer Matrices normalized 0..1
const BAYER_2X2 = [
  [0 / 4, 2 / 4],
  [3 / 4, 1 / 4],
];

const BAYER_4X4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16],
];

const BAYER_8X8 = [
  [ 0/64, 32/64,  8/64, 40/64,  2/64, 34/64, 10/64, 42/64],
  [48/64, 16/64, 56/64, 24/64, 50/64, 18/64, 58/64, 26/64],
  [12/64, 44/64,  4/64, 36/64, 14/64, 46/64,  6/64, 38/64],
  [60/64, 28/64, 52/64, 20/64, 62/64, 30/64, 54/64, 22/64],
  [ 3/64, 35/64, 11/64, 43/64,  1/64, 33/64,  9/64, 41/64],
  [51/64, 19/64, 59/64, 27/64, 49/64, 17/64, 57/64, 25/64],
  [15/64, 47/64,  7/64, 39/64, 13/64, 45/64,  5/64, 37/64],
  [63/64, 31/64, 55/64, 23/64, 61/64, 29/64, 53/64, 21/64],
];

/**
 * Preprocess an RGB image: brightness, contrast, gamma, sharpness, invert
 */
export function preprocessPixels(
  src: ImageData,
  destWidth: number,
  destHeight: number,
  options: {
    brightness: number;
    contrast: number;
    gamma: number;
    exposure: number;
    sharpness: number;
    invert: boolean;
  }
): Float32Array {
  // Returns an array of size width * height * 3 containing [r, g, b] in range 0..255
  const buffer = new Float32Array(destWidth * destHeight * 3);
  const srcData = src.data;
  const factor = (259 * (options.contrast * 128 + 128)) / (255 * (259 - options.contrast * 128));

  for (let y = 0; y < destHeight; y++) {
    for (let x = 0; x < destWidth; x++) {
      const idx = (y * destWidth + x) * 4;
      const outIdx = (y * destWidth + x) * 3;

      let r = srcData[idx];
      let g = srcData[idx + 1];
      let b = srcData[idx + 2];

      // Invert
      if (options.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Brightness & Exposure
      const expFactor = Math.pow(2, options.exposure / 30);
      r = (r + options.brightness) * expFactor;
      g = (g + options.brightness) * expFactor;
      b = (b + options.brightness) * expFactor;

      // Contrast
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;

      // Gamma
      const invGamma = 1.0 / Math.max(0.01, options.gamma);
      r = 255 * Math.pow(Math.max(0, Math.min(255, r)) / 255, invGamma);
      g = 255 * Math.pow(Math.max(0, Math.min(255, g)) / 255, invGamma);
      b = 255 * Math.pow(Math.max(0, Math.min(255, b)) / 255, invGamma);

      buffer[outIdx] = Math.max(0, Math.min(255, r));
      buffer[outIdx + 1] = Math.max(0, Math.min(255, g));
      buffer[outIdx + 2] = Math.max(0, Math.min(255, b));
    }
  }

  // Sharpness pass if requested (unsharp mask)
  if (options.sharpness > 0) {
    const sharp = options.sharpness;
    const temp = new Float32Array(buffer);
    for (let y = 1; y < destHeight - 1; y++) {
      for (let x = 1; x < destWidth - 1; x++) {
        for (let c = 0; c < 3; c++) {
          const center = temp[(y * destWidth + x) * 3 + c];
          const laplacian =
            center * 5 -
            temp[((y - 1) * destWidth + x) * 3 + c] -
            temp[((y + 1) * destWidth + x) * 3 + c] -
            temp[(y * destWidth + (x - 1)) * 3 + c] -
            temp[(y * destWidth + (x + 1)) * 3 + c];
          const val = center + (laplacian - center) * sharp;
          buffer[(y * destWidth + x) * 3 + c] = Math.max(0, Math.min(255, val));
        }
      }
    }
  }

  return buffer;
}

/**
 * Perform 4-shade Dithering for Game Boy DMG (160x144)
 * Returns indices array (160 * 144) where each element is 0..3 (0=lightest, 3=darkest)
 */
export function ditherDmgImage(
  processedBuffer: Float32Array,
  width: number,
  height: number,
  algorithm: DitherAlgorithm,
  strength: number
): Uint8Array {
  const result = new Uint8Array(width * height);
  // Convert buffer to luminance working array
  const lum = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = processedBuffer[i * 3];
    const g = processedBuffer[i * 3 + 1];
    const b = processedBuffer[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255
  }

  // Target 4 shades: 0 (lightest, 255), 1 (light, 170), 2 (dark, 85), 3 (darkest, 0)
  const targets = [255, 170, 85, 0];

  function quantizeLum(val: number): { idx: number; target: number } {
    if (val >= 212.5) return { idx: 0, target: 255 };
    if (val >= 127.5) return { idx: 1, target: 170 };
    if (val >= 42.5) return { idx: 2, target: 85 };
    return { idx: 3, target: 0 };
  }

  // Ordered Dither Matrices (Bayer)
  if (algorithm === 'bayer4x4' || algorithm === 'bayer8x8' || algorithm === 'bayer2x2') {
    const matrix =
      algorithm === 'bayer2x2' ? BAYER_2X2 : algorithm === 'bayer4x4' ? BAYER_4X4 : BAYER_8X8;
    const mSize = matrix.length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const ditherOffset = (matrix[y % mSize][x % mSize] - 0.5) * 85 * strength;
        const val = Math.max(0, Math.min(255, lum[i] + ditherOffset));
        result[i] = quantizeLum(val).idx;
      }
    }
    return result;
  }

  if (algorithm === 'none') {
    for (let i = 0; i < width * height; i++) {
      result[i] = quantizeLum(lum[i]).idx;
    }
    return result;
  }

  // Error Diffusion Algorithms
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const current = lum[idx];
      const { idx: quantizedIdx, target } = quantizeLum(current);
      result[idx] = quantizedIdx;

      const error = (current - target) * strength;

      if (algorithm === 'atkinson') {
        // Atkinson diffusion distributes 1/8 to 6 surrounding pixels
        const e = error / 8;
        distributeError(lum, width, height, x + 1, y, e);
        distributeError(lum, width, height, x + 2, y, e);
        distributeError(lum, width, height, x - 1, y + 1, e);
        distributeError(lum, width, height, x, y + 1, e);
        distributeError(lum, width, height, x + 1, y + 1, e);
        distributeError(lum, width, height, x, y + 2, e);
      } else if (algorithm === 'floyd-steinberg') {
        // Floyd-Steinberg: (x+1, y) 7/16, (x-1, y+1) 3/16, (x, y+1) 5/16, (x+1, y+1) 1/16
        distributeError(lum, width, height, x + 1, y, (error * 7) / 16);
        distributeError(lum, width, height, x - 1, y + 1, (error * 3) / 16);
        distributeError(lum, width, height, x, y + 1, (error * 5) / 16);
        distributeError(lum, width, height, x + 1, y + 1, (error * 1) / 16);
      } else if (algorithm === 'burkes') {
        // Burkes diffusion
        const e32 = error / 32;
        distributeError(lum, width, height, x + 1, y, e32 * 8);
        distributeError(lum, width, height, x + 2, y, e32 * 4);
        distributeError(lum, width, height, x - 2, y + 1, e32 * 2);
        distributeError(lum, width, height, x - 1, y + 1, e32 * 4);
        distributeError(lum, width, height, x, y + 1, e32 * 8);
        distributeError(lum, width, height, x + 1, y + 1, e32 * 4);
        distributeError(lum, width, height, x + 2, y + 1, e32 * 2);
      } else if (algorithm === 'sierra') {
        // Sierra-2 (Sierra Lite)
        const e16 = error / 16;
        distributeError(lum, width, height, x + 1, y, e16 * 4);
        distributeError(lum, width, height, x + 2, y, e16 * 3);
        distributeError(lum, width, height, x - 1, y + 1, e16 * 2);
        distributeError(lum, width, height, x, y + 1, e16 * 3);
        distributeError(lum, width, height, x + 1, y + 1, e16 * 2);
        distributeError(lum, width, height, x, y + 2, e16 * 2);
      }
    }
  }

  return result;
}

function distributeError(
  buffer: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  amount: number
) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    buffer[y * width + x] = Math.max(0, Math.min(255, buffer[y * width + x] + amount));
  }
}

/**
 * GBC 8-Palette Tile Quantization
 * 160x144 screen = 20x18 tiles (8x8 pixels)
 * Each 8x8 tile is assigned to the best of 8 palettes (4 colors each),
 * and dithered with Atkinson or Floyd-Steinberg.
 */
export function ditherGbcImage(
  processedBuffer: Float32Array,
  width: number,
  height: number,
  palettes: RGBColor[][],
  algorithm: DitherAlgorithm,
  strength: number
): {
  pixelColors: RGBColor[];
  tilePaletteIndices: Uint8Array; // 360 entries (20x18)
  pixelPaletteIndices: Uint8Array; // 0..3 for each pixel
} {
  const pixelColors: RGBColor[] = new Array(width * height);
  const tileCols = Math.floor(width / 8);  // 20
  const tileRows = Math.floor(height / 8); // 18
  const tilePaletteIndices = new Uint8Array(tileCols * tileRows);
  const pixelPaletteIndices = new Uint8Array(width * height);

  // 1. Determine best palette (0..7) for each 8x8 tile
  for (let ty = 0; ty < tileRows; ty++) {
    for (let tx = 0; tx < tileCols; tx++) {
      const tileIndex = ty * tileCols + tx;

      // Collect colors in this 8x8 tile
      const tilePixels: RGBColor[] = [];
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const x = tx * 8 + px;
          const y = ty * 8 + py;
          const idx = (y * width + x) * 3;
          tilePixels.push({
            r: processedBuffer[idx],
            g: processedBuffer[idx + 1],
            b: processedBuffer[idx + 2],
          });
        }
      }

      // Score each of the 8 palettes by total error for this tile
      let bestPalette = 0;
      let minError = Infinity;

      for (let p = 0; p < palettes.length; p++) {
        let totalDist = 0;
        const pal = palettes[p];
        for (const pixel of tilePixels) {
          let bestDist = Infinity;
          for (let c = 0; c < 4; c++) {
            const d = colorDistanceSq(pixel, pal[c]);
            if (d < bestDist) bestDist = d;
          }
          totalDist += bestDist;
        }
        if (totalDist < minError) {
          minError = totalDist;
          bestPalette = p;
        }
      }

      tilePaletteIndices[tileIndex] = bestPalette;
    }
  }

  // 2. Dither within each tile using its chosen palette
  const rgbBuffer = new Float32Array(processedBuffer);

  for (let y = 0; y < height; y++) {
    const ty = Math.floor(y / 8);
    for (let x = 0; x < width; x++) {
      const tx = Math.floor(x / 8);
      const paletteId = tilePaletteIndices[ty * tileCols + tx];
      const activePalette = palettes[paletteId];

      const idx = y * width + x;
      const bIdx = idx * 3;

      let r = rgbBuffer[bIdx];
      let g = rgbBuffer[bIdx + 1];
      let b = rgbBuffer[bIdx + 2];

      // Ordered dither addition
      if (algorithm === 'bayer4x4' || algorithm === 'bayer8x8' || algorithm === 'bayer2x2') {
        const matrix =
          algorithm === 'bayer2x2' ? BAYER_2X2 : algorithm === 'bayer4x4' ? BAYER_4X4 : BAYER_8X8;
        const mSize = matrix.length;
        const offset = (matrix[y % mSize][x % mSize] - 0.5) * 45 * strength;
        r = Math.max(0, Math.min(255, r + offset));
        g = Math.max(0, Math.min(255, g + offset));
        b = Math.max(0, Math.min(255, b + offset));
      }

      const chosenIdx = findNearestColorIndex({ r, g, b }, activePalette);
      const chosenColor = activePalette[chosenIdx];

      pixelColors[idx] = chosenColor;
      pixelPaletteIndices[idx] = chosenIdx;

      // Error diffusion
      if (algorithm === 'atkinson' || algorithm === 'floyd-steinberg' || algorithm === 'burkes') {
        const errR = (r - chosenColor.r) * strength;
        const errG = (g - chosenColor.g) * strength;
        const errB = (b - chosenColor.b) * strength;

        const distributeRgb = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 3;
            rgbBuffer[nIdx] = Math.max(0, Math.min(255, rgbBuffer[nIdx] + errR * factor));
            rgbBuffer[nIdx + 1] = Math.max(0, Math.min(255, rgbBuffer[nIdx + 1] + errG * factor));
            rgbBuffer[nIdx + 2] = Math.max(0, Math.min(255, rgbBuffer[nIdx + 2] + errB * factor));
          }
        };

        if (algorithm === 'atkinson') {
          distributeRgb(1, 0, 1 / 8);
          distributeRgb(2, 0, 1 / 8);
          distributeRgb(-1, 1, 1 / 8);
          distributeRgb(0, 1, 1 / 8);
          distributeRgb(1, 1, 1 / 8);
          distributeRgb(0, 2, 1 / 8);
        } else if (algorithm === 'floyd-steinberg') {
          distributeRgb(1, 0, 7 / 16);
          distributeRgb(-1, 1, 3 / 16);
          distributeRgb(0, 1, 5 / 16);
          distributeRgb(1, 1, 1 / 16);
        } else if (algorithm === 'burkes') {
          distributeRgb(1, 0, 8 / 32);
          distributeRgb(2, 0, 4 / 32);
          distributeRgb(-2, 1, 2 / 32);
          distributeRgb(-1, 1, 4 / 32);
          distributeRgb(0, 1, 8 / 32);
          distributeRgb(1, 1, 4 / 32);
          distributeRgb(2, 1, 2 / 32);
        }
      }
    }
  }

  return { pixelColors, tilePaletteIndices, pixelPaletteIndices };
}

/**
 * GBA Mode 3 / Mode 4 Dithering (240x160)
 * GBA uses 15-bit RGB555 colors. Dithering prevents color banding in 15-bit color.
 */
export function ditherGbaImage(
  processedBuffer: Float32Array,
  width: number,
  height: number,
  algorithm: DitherAlgorithm,
  strength: number
): {
  rgb555Buffer: Uint16Array;
  pixelColors: RGBColor[];
} {
  const pixelColors: RGBColor[] = new Array(width * height);
  const rgb555Buffer = new Uint16Array(width * height);
  const rgbBuffer = new Float32Array(processedBuffer);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const bIdx = idx * 3;

      let r = rgbBuffer[bIdx];
      let g = rgbBuffer[bIdx + 1];
      let b = rgbBuffer[bIdx + 2];

      if (algorithm === 'bayer4x4' || algorithm === 'bayer8x8' || algorithm === 'bayer2x2') {
        const matrix =
          algorithm === 'bayer2x2' ? BAYER_2X2 : algorithm === 'bayer4x4' ? BAYER_4X4 : BAYER_8X8;
        const mSize = matrix.length;
        const offset = (matrix[y % mSize][x % mSize] - 0.5) * (255 / 31) * strength;
        r = Math.max(0, Math.min(255, r + offset));
        g = Math.max(0, Math.min(255, g + offset));
        b = Math.max(0, Math.min(255, b + offset));
      }

      // Quantize to 5-bit (0..31)
      const r5 = Math.min(31, Math.max(0, Math.round((r * 31) / 255)));
      const g5 = Math.min(31, Math.max(0, Math.round((g * 31) / 255)));
      const b5 = Math.min(31, Math.max(0, Math.round((b * 31) / 255)));

      // Reconstructed 8-bit RGB
      const qR = Math.round((r5 * 255) / 31);
      const qG = Math.round((g5 * 255) / 31);
      const qB = Math.round((b5 * 255) / 31);

      pixelColors[idx] = { r: qR, g: qG, b: qB };
      // GBA Mode 3 little-endian 15-bit color format: BGR555 / RGB555
      rgb555Buffer[idx] = r5 | (g5 << 5) | (b5 << 10);

      // Error diffusion
      if (
        (algorithm === 'atkinson' || algorithm === 'floyd-steinberg' || algorithm === 'burkes') &&
        strength > 0
      ) {
        const errR = (r - qR) * strength;
        const errG = (g - qG) * strength;
        const errB = (b - qB) * strength;

        const distribute = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 3;
            rgbBuffer[nIdx] = Math.max(0, Math.min(255, rgbBuffer[nIdx] + errR * factor));
            rgbBuffer[nIdx + 1] = Math.max(0, Math.min(255, rgbBuffer[nIdx + 1] + errG * factor));
            rgbBuffer[nIdx + 2] = Math.max(0, Math.min(255, rgbBuffer[nIdx + 2] + errB * factor));
          }
        };

        if (algorithm === 'atkinson') {
          distribute(1, 0, 1 / 8);
          distribute(2, 0, 1 / 8);
          distribute(-1, 1, 1 / 8);
          distribute(0, 1, 1 / 8);
          distribute(1, 1, 1 / 8);
          distribute(0, 2, 1 / 8);
        } else if (algorithm === 'floyd-steinberg') {
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else if (algorithm === 'burkes') {
          distribute(1, 0, 8 / 32);
          distribute(2, 0, 4 / 32);
          distribute(-2, 1, 2 / 32);
          distribute(-1, 1, 4 / 32);
          distribute(0, 1, 8 / 32);
          distribute(1, 1, 4 / 32);
          distribute(2, 1, 2 / 32);
        }
      }
    }
  }

  return { rgb555Buffer, pixelColors };
}
