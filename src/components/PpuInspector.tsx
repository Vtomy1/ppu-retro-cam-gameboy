/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ConsoleMode, Tile2bpp, TilemapCell, RGBColor } from '../types/retro';
import { toHex2, toHex4 } from '../utils/romHeader';
import { Database, Grid, Palette, HelpCircle, Layers, Edit3 } from 'lucide-react';
import { playUiTick } from '../utils/audio';
import { TilemapPreview } from './TilemapPreview';

interface PpuInspectorProps {
  consoleMode: ConsoleMode;
  tiles: Tile2bpp[];
  tilemap: Uint8Array;
  visibleCells: TilemapCell[];
  activePaletteColors: RGBColor[];
  gbcPalettes?: RGBColor[][];
  onUpdateTilemap: (newMap: Uint8Array, lockCustom: boolean) => void;
  isMapLocked: boolean;
  onToggleMapLock: (locked: boolean) => void;
  onResetToLive: () => void;
}

export const PpuInspector: React.FC<PpuInspectorProps> = ({
  consoleMode,
  tiles,
  tilemap,
  visibleCells,
  activePaletteColors,
  gbcPalettes,
  onUpdateTilemap,
  isMapLocked,
  onToggleMapLock,
  onResetToLive,
}) => {
  const [activeTab, setActiveTab] = useState<'tilemap_editor' | 'tiles' | 'vram_32x32' | 'palettes'>('tilemap_editor');
  const [selectedTileId, setSelectedTileId] = useState<number>(0);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; tileId: number } | null>(null);

  const selectedTile = tiles[selectedTileId] || tiles[0];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Header and Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-neutral-200 tracking-wide">
            PPU VRAM & Hardware Tile Engine
          </span>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
          <button
            onClick={() => {
              playUiTick();
              setActiveTab('tilemap_editor');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-all cursor-pointer ${
              activeTab === 'tilemap_editor'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-3 h-3 text-amber-400" />
            <span>Tilemap Preview & Reorder</span>
          </button>

          <button
            onClick={() => {
              playUiTick();
              setActiveTab('tiles');
            }}
            className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
              activeTab === 'tiles'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Pattern Table ($8000)
          </button>

          <button
            onClick={() => {
              playUiTick();
              setActiveTab('vram_32x32');
            }}
            className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
              activeTab === 'vram_32x32'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            32×32 VRAM Map ($9800)
          </button>

          <button
            onClick={() => {
              playUiTick();
              setActiveTab('palettes');
            }}
            className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
              activeTab === 'palettes'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Palette RAM
          </button>
        </div>
      </div>

      {/* Tab 0: Visual Tilemap Preview & Interactive Reorder Component */}
      {activeTab === 'tilemap_editor' && (
        <TilemapPreview
          tiles={tiles}
          tilemap={tilemap}
          activePaletteColors={activePaletteColors}
          onUpdateTilemap={onUpdateTilemap}
          isMapLocked={isMapLocked}
          onToggleMapLock={onToggleMapLock}
          onResetToLive={onResetToLive}
          selectedTileId={selectedTileId}
          onSelectTileId={setSelectedTileId}
        />
      )}

      {/* Tab 1: Pattern Table (Tiles) */}
      {activeTab === 'tiles' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Tile Grid */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Unique Pattern Tiles: {tiles.length}</span>
              <span className="font-mono text-[11px]">VRAM Size: {tiles.length * 16} bytes</span>
            </div>

            <div className="max-h-64 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg p-2 grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1">
              {tiles.map((tile) => {
                const isSelected = tile.id === selectedTileId;
                return (
                  <button
                    key={tile.id}
                    onClick={() => {
                      playUiTick();
                      setSelectedTileId(tile.id);
                    }}
                    title={`Tile ID: ${tile.id} ($${toHex2(tile.id)})\nUsage count: ${tile.usageCount}\nClick to inspect or stamp`}
                    className={`relative w-7 h-7 p-0.5 rounded border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/20 scale-105 z-10 shadow-sm'
                        : 'border-neutral-800 hover:border-neutral-600 bg-neutral-900'
                    }`}
                  >
                    {/* Render mini 8x8 tile */}
                    <div className="w-full h-full grid grid-cols-8 grid-rows-8">
                      {tile.pixels.flatMap((row, y) =>
                        row.map((pixelColorIdx, x) => {
                          const col = activePaletteColors[pixelColorIdx] || { r: 0, g: 0, b: 0 };
                          return (
                            <span
                              key={`${y}-${x}`}
                              style={{ backgroundColor: `rgb(${col.r},${col.g},${col.b})` }}
                            />
                          );
                        })
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Tile Inspector (Zoomed & Bitplanes) */}
          {selectedTile && (
            <div className="w-full lg:w-72 bg-neutral-950/80 border border-neutral-800 rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                <span className="text-xs font-bold text-neutral-200">
                  Tile ${toHex2(selectedTile.id)} (#{selectedTile.id})
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  VRAM: $8000 + ${toHex4(selectedTile.id * 16)}
                </span>
              </div>

              {/* Magnified 8x8 Tile View */}
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 border-2 border-neutral-700 rounded-sm overflow-hidden grid grid-cols-8 grid-rows-8 bg-black">
                  {selectedTile.pixels.flatMap((row, y) =>
                    row.map((colorIdx, x) => {
                      const col = activePaletteColors[colorIdx] || { r: 0, g: 0, b: 0 };
                      return (
                        <div
                          key={`${y}-${x}`}
                          className="w-full h-full border-[0.5px] border-black/30 flex items-center justify-center text-[6px] font-mono text-white/50"
                          style={{ backgroundColor: `rgb(${col.r},${col.g},${col.b})` }}
                        >
                          {colorIdx}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-col text-xs text-neutral-400 gap-1 font-mono text-[11px]">
                  <div>Uses: <span className="text-neutral-200">{selectedTile.usageCount} times</span></div>
                  <div>Format: <span className="text-emerald-400">2bpp Planar</span></div>
                  <div>Size: <span className="text-neutral-200">16 bytes</span></div>
                </div>
              </div>

              {/* 2bpp Planar Bitplane Breakdown Table */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  2bpp Bitplanes (Low + High Byte):
                </span>
                <div className="font-mono text-[10px] bg-neutral-900 border border-neutral-800/80 rounded p-1.5 flex flex-col gap-0.5">
                  {Array.from({ length: 8 }).map((_, y) => {
                    const lowByte = selectedTile.bytes[y * 2];
                    const highByte = selectedTile.bytes[y * 2 + 1];
                    const lowBits = lowByte.toString(2).padStart(8, '0');
                    const highBits = highByte.toString(2).padStart(8, '0');

                    return (
                      <div key={y} className="flex items-center justify-between text-neutral-400">
                        <span className="text-neutral-500">Row {y}:</span>
                        <span className="text-cyan-400">${toHex2(lowByte)}</span>
                        <span className="text-neutral-600">|</span>
                        <span className="text-purple-400">${toHex2(highByte)}</span>
                        <span className="text-neutral-600 text-[9px] tracking-tight">
                          b0:{lowBits.slice(0, 4)} b1:{highBits.slice(0, 4)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 32x32 VRAM Grid */}
      {activeTab === 'vram_32x32' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 border border-amber-400 bg-amber-400/20 inline-block"></span>
              <span>20×18 Active LCD Viewport ($9800) on 32×32 Scroll Plane</span>
            </span>
            {hoveredCell && (
              <span className="font-mono text-[11px] text-amber-300">
                Coord ({hoveredCell.x}, {hoveredCell.y}) · Tile ID ${toHex2(hoveredCell.tileId)} (#{hoveredCell.tileId})
              </span>
            )}
          </div>

          {/* 32x32 Grid */}
          <div className="overflow-x-auto bg-neutral-950 border border-neutral-800 rounded-lg p-2">
            <div
              className="grid gap-[1px] bg-neutral-800 w-max"
              style={{
                gridTemplateColumns: 'repeat(32, minmax(0, 1fr))',
              }}
            >
              {Array.from({ length: 32 * 32 }).map((_, idx) => {
                const x = idx % 32;
                const y = Math.floor(idx / 32);
                const isVisibleScreen = x < 20 && y < 18;
                const tileId = tilemap[idx] || 0;
                const tile = tiles[tileId];

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredCell({ x, y, tileId })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-4 h-4 transition-all relative ${
                      isVisibleScreen
                        ? 'border border-amber-500/40 bg-neutral-900 hover:border-amber-400 hover:scale-125 z-10'
                        : 'bg-neutral-950/60 opacity-30 border border-neutral-900'
                    }`}
                  >
                    {tile && (
                      <div className="w-full h-full grid grid-cols-4 grid-rows-4">
                        {Array.from({ length: 16 }).map((_, pIdx) => {
                          const px = (pIdx % 4) * 2;
                          const py = Math.floor(pIdx / 4) * 2;
                          const colorIdx = tile.pixels[py]?.[px] || 0;
                          const col = activePaletteColors[colorIdx] || { r: 0, g: 0, b: 0 };
                          return (
                            <span
                              key={pIdx}
                              style={{ backgroundColor: `rgb(${col.r},${col.g},${col.b})` }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Palette RAM */}
      {activeTab === 'palettes' && (
        <div className="flex flex-col gap-4">
          {consoleMode === 'DMG' ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-neutral-300">
                DMG Background Palette Register (BGP at $FF47 = %11100100)
              </span>
              <div className="grid grid-cols-4 gap-2">
                {activePaletteColors.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1.5"
                  >
                    <div
                      className="w-full h-12 rounded border border-neutral-700"
                      style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-200">Shade {i}</span>
                      <span className="font-mono text-[10px] text-neutral-400">
                        #{c.r.toString(16).padStart(2, '0')}{c.g.toString(16).padStart(2, '0')}{c.b.toString(16).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-neutral-300">
                Game Boy Color 8 Background Palettes (BCPS/BCPD $FF68-$FF69)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(gbcPalettes || []).map((pal, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1.5"
                  >
                    <span className="text-xs font-bold text-amber-300">Palette {pIdx}</span>
                    <div className="grid grid-cols-4 gap-1">
                      {pal.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="h-8 rounded-xs border border-neutral-700"
                          style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                          title={`Color ${cIdx}: rgb(${c.r}, ${c.g}, ${c.b})`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
