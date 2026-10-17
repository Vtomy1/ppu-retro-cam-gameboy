/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ConsoleMode, DitherAlgorithm, DmgPalettePreset, VideoProcessingSettings } from '../types/retro';
import { DMG_PALETTES } from '../utils/palette';
import { Sliders, Palette, Monitor, Layers, Eye } from 'lucide-react';
import { playUiTick } from '../utils/audio';

interface DitherControlsProps {
  settings: VideoProcessingSettings;
  onChangeSettings: (updater: (prev: VideoProcessingSettings) => VideoProcessingSettings) => void;
  deduplicateTiles: boolean;
  onToggleDeduplication: () => void;
  uniqueTilesCount: number;
}

export const DitherControls: React.FC<DitherControlsProps> = ({
  settings,
  onChangeSettings,
  deduplicateTiles,
  onToggleDeduplication,
  uniqueTilesCount,
}) => {
  const ditherOptions: { id: DitherAlgorithm; label: string; badge: string }[] = [
    { id: 'atkinson', label: 'Atkinson', badge: 'GB Camera' },
    { id: 'floyd-steinberg', label: 'Floyd-Steinberg', badge: 'Smooth' },
    { id: 'bayer4x4', label: 'Bayer 4×4', badge: 'Classic Dot' },
    { id: 'bayer8x8', label: 'Bayer 8×8', badge: 'Fine Mesh' },
    { id: 'bayer2x2', label: 'Bayer 2×2', badge: 'Coarse' },
    { id: 'burkes', label: 'Burkes', badge: 'Balanced' },
    { id: 'sierra', label: 'Sierra-2', badge: 'Sharp' },
    { id: 'none', label: 'Threshold', badge: 'Hard Edge' },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Section 1: Dithering Algorithm */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-neutral-200 tracking-wide">
              PPU Dithering Matrix
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {Math.round(settings.ditherStrength * 100)}% Error
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {ditherOptions.map((opt) => {
            const isSelected = settings.ditherAlgorithm === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  playUiTick();
                  onChangeSettings((prev) => ({ ...prev, ditherAlgorithm: opt.id }));
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'bg-amber-400/10 border-amber-400/60 text-amber-300 font-semibold'
                    : 'bg-neutral-950/50 border-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-[10px] text-neutral-400 font-mono">{opt.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Dither strength slider */}
        {settings.ditherAlgorithm !== 'none' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-neutral-400 w-16">Strength:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.ditherStrength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeSettings((prev) => ({ ...prev, ditherStrength: val }));
              }}
              className="flex-1 accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Section 2: Console Specific Palettes */}
      {settings.console === 'DMG' && (
        <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-200 tracking-wide">
                DMG Palette Preset (BGP $FF47)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(DMG_PALETTES) as DmgPalettePreset[]).map((key) => {
              const pal = DMG_PALETTES[key];
              const isSelected = settings.dmgPalette === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    playUiTick();
                    onChangeSettings((prev) => ({ ...prev, dmgPalette: key }));
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-neutral-800 border-emerald-400/50 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="text-xs font-medium truncate max-w-[100px]">{pal.name}</span>
                  {/* Swatches */}
                  <div className="flex gap-0.5 shrink-0">
                    {pal.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-3.5 rounded-xs inline-block border border-black/40"
                        style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Exposure, Contrast, Gamma & Sharpness */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-neutral-200 tracking-wide">
            Sensor & Image Calibration
          </span>
        </div>

        {/* Contrast */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 w-20 text-[11px]">Contrast:</span>
          <input
            type="range"
            min="0.4"
            max="2.2"
            step="0.05"
            value={settings.contrast}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeSettings((prev) => ({ ...prev, contrast: val }));
            }}
            className="flex-1 accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[10px] text-neutral-300 tabular-nums">
            {settings.contrast.toFixed(2)}x
          </span>
        </div>

        {/* Brightness */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 w-20 text-[11px]">Brightness:</span>
          <input
            type="range"
            min="-80"
            max="80"
            step="2"
            value={settings.brightness}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onChangeSettings((prev) => ({ ...prev, brightness: val }));
            }}
            className="flex-1 accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[10px] text-neutral-300 tabular-nums">
            {settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}
          </span>
        </div>

        {/* Gamma */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 w-20 text-[11px]">Gamma:</span>
          <input
            type="range"
            min="0.5"
            max="2.2"
            step="0.05"
            value={settings.gamma}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeSettings((prev) => ({ ...prev, gamma: val }));
            }}
            className="flex-1 accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[10px] text-neutral-300 tabular-nums">
            {settings.gamma.toFixed(2)}
          </span>
        </div>

        {/* Sharpness */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 w-20 text-[11px]">Sharpness:</span>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.1"
            value={settings.sharpness}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeSettings((prev) => ({ ...prev, sharpness: val }));
            }}
            className="flex-1 accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="w-10 text-right font-mono text-[10px] text-neutral-300 tabular-nums">
            {Math.round(settings.sharpness * 100)}%
          </span>
        </div>
      </div>

      {/* Section 4: Hardware LCD Simulation & PPU Memory Options */}
      <div className="flex flex-col gap-2 pt-3 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-neutral-200 tracking-wide">
            Hardware LCD & VRAM Engine
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* LCD Grid */}
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40">
            <input
              type="checkbox"
              checked={settings.showLcdGrid}
              onChange={(e) => {
                playUiTick();
                onChangeSettings((prev) => ({ ...prev, showLcdGrid: e.target.checked }));
              }}
              className="accent-amber-400 rounded-xs"
            />
            <span className="text-neutral-300 text-[11px]">LCD Pixel Grid</span>
          </label>

          {/* Scanlines */}
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40">
            <input
              type="checkbox"
              checked={settings.showScanlines}
              onChange={(e) => {
                playUiTick();
                onChangeSettings((prev) => ({ ...prev, showScanlines: e.target.checked }));
              }}
              className="accent-amber-400 rounded-xs"
            />
            <span className="text-neutral-300 text-[11px]">Scanline Matrix</span>
          </label>

          {/* Invert */}
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40">
            <input
              type="checkbox"
              checked={settings.invert}
              onChange={(e) => {
                playUiTick();
                onChangeSettings((prev) => ({ ...prev, invert: e.target.checked }));
              }}
              className="accent-amber-400 rounded-xs"
            />
            <span className="text-neutral-300 text-[11px]">Invert Bitplanes</span>
          </label>

          {/* Color Correction */}
          <label className="flex items-center gap-2 p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/80 cursor-pointer hover:bg-neutral-800/40">
            <input
              type="checkbox"
              checked={settings.colorCorrection}
              onChange={(e) => {
                playUiTick();
                onChangeSettings((prev) => ({ ...prev, colorCorrection: e.target.checked }));
              }}
              className="accent-amber-400 rounded-xs"
            />
            <span className="text-neutral-300 text-[11px]">Reflective LCD Curve</span>
          </label>
        </div>

        {/* Tile Deduplication Button for Game Boy */}
        {settings.console !== 'GBA' && (
          <button
            onClick={() => {
              playUiTick();
              onToggleDeduplication();
            }}
            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
              deduplicateTiles
                ? 'bg-amber-400/10 border-amber-400/50 text-amber-300'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>VRAM Tile Deduplication</span>
            </div>
            <span className="font-mono text-[10px] tabular-nums">
              {uniqueTilesCount} / 360 unique
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
