/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tile2bpp, RGBColor } from '../types/retro';
import { toHex2 } from '../utils/romHeader';
import {
  ArrowLeftRight,
  RotateCcw,
  Undo2,
  Redo2,
  FlipHorizontal,
  FlipVertical,
  Paintbrush,
  Move,
  Lock,
  Unlock,
  Download,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import { playBootChime, playUiTick } from '../utils/audio';

interface TilemapPreviewProps {
  tiles: Tile2bpp[];
  tilemap: Uint8Array; // 1024 bytes (32x32)
  activePaletteColors: RGBColor[];
  onUpdateTilemap: (newMap: Uint8Array, lockCustom: boolean) => void;
  isMapLocked: boolean;
  onToggleMapLock: (locked: boolean) => void;
  onResetToLive: () => void;
  selectedTileId: number;
  onSelectTileId: (id: number) => void;
}

export type ReorderMode = 'swap' | 'shift' | 'stamp';

export const TilemapPreview: React.FC<TilemapPreviewProps> = ({
  tiles,
  tilemap,
  activePaletteColors,
  onUpdateTilemap,
  isMapLocked,
  onToggleMapLock,
  onResetToLive,
  selectedTileId,
  onSelectTileId,
}) => {
  const [reorderMode, setReorderMode] = useState<ReorderMode>('swap');
  const [draggedCell, setDraggedCell] = useState<{ x: number; y: number; tileId: number } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; tileId: number } | null>(null);
  const [cellScale, setCellScale] = useState<number>(20); // pixel width per tile cell (16px, 20px, 24px)
  const [showTileIds, setShowTileIds] = useState<boolean>(true);

  // Undo / Redo history
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Initialize history with initial tilemap
  useEffect(() => {
    if (history.length === 0 && tilemap.length > 0) {
      setHistory([new Uint8Array(tilemap)]);
      setHistoryIndex(0);
    }
  }, [tilemap]);

  const commitMapChange = useCallback((newMap: Uint8Array) => {
    // Trim future history if branching
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(new Uint8Array(newMap));
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
    onUpdateTilemap(newMap, true);
  }, [history, historyIndex, onUpdateTilemap]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      playUiTick();
      const prevMap = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateTilemap(new Uint8Array(prevMap), true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      playUiTick();
      const nextMap = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateTilemap(new Uint8Array(nextMap), true);
    }
  };

  // Drag handlers
  const handleDragStart = (x: number, y: number, tileId: number, e: React.DragEvent) => {
    playUiTick();
    setDraggedCell({ x, y, tileId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ x, y, tileId, source: 'tilemap' }));
  };

  const handleDragOver = (x: number, y: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverCell || dragOverCell.x !== x || dragOverCell.y !== y) {
      setDragOverCell({ x, y });
    }
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (targetX: number, targetY: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCell(null);

    const targetIdx = targetY * 32 + targetX;
    const newMap = new Uint8Array(tilemap);

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (rawData) {
        const parsed = JSON.parse(rawData);

        // Dropping from Pattern Table Palette onto Map
        if (parsed.source === 'palette') {
          playBootChime();
          newMap[targetIdx] = parsed.tileId % 256;
          commitMapChange(newMap);
          setDraggedCell(null);
          return;
        }

        // Dropping from Map onto Map (Reorder / Swap / Shift)
        if (parsed.source === 'tilemap') {
          const srcX = parsed.x;
          const srcY = parsed.y;
          const srcIdx = srcY * 32 + srcX;

          if (srcIdx === targetIdx) {
            setDraggedCell(null);
            return;
          }

          playBootChime();

          if (reorderMode === 'swap') {
            // Swap tiles at src and target
            const temp = newMap[srcIdx];
            newMap[srcIdx] = newMap[targetIdx];
            newMap[targetIdx] = temp;
          } else if (reorderMode === 'shift') {
            // Shift tile: remove from src and insert at target within the 20x18 area
            const movedTile = newMap[srcIdx];
            // Linear reorder in visible 20x18 bounds
            const visibleIndices: number[] = [];
            for (let r = 0; r < 18; r++) {
              for (let c = 0; c < 20; c++) {
                visibleIndices.push(r * 32 + c);
              }
            }

            const fromPos = visibleIndices.indexOf(srcIdx);
            const toPos = visibleIndices.indexOf(targetIdx);

            if (fromPos !== -1 && toPos !== -1) {
              const currentVisibleTiles = visibleIndices.map((idx) => newMap[idx]);
              currentVisibleTiles.splice(fromPos, 1);
              currentVisibleTiles.splice(toPos, 0, movedTile);

              for (let i = 0; i < visibleIndices.length; i++) {
                newMap[visibleIndices[i]] = currentVisibleTiles[i];
              }
            } else {
              newMap[targetIdx] = movedTile;
            }
          }

          commitMapChange(newMap);
        }
      }
    } catch {
      // Fallback
    }

    setDraggedCell(null);
  };

  // Click on cell in stamp mode
  const handleCellClick = (x: number, y: number) => {
    if (reorderMode === 'stamp') {
      playUiTick();
      const idx = y * 32 + x;
      const newMap = new Uint8Array(tilemap);
      newMap[idx] = selectedTileId % 256;
      commitMapChange(newMap);
    }
  };

  // Flip Map actions
  const handleFlipHorizontal = () => {
    playUiTick();
    const newMap = new Uint8Array(tilemap);
    for (let y = 0; y < 18; y++) {
      for (let x = 0; x < 10; x++) {
        const leftIdx = y * 32 + x;
        const rightIdx = y * 32 + (19 - x);
        const temp = newMap[leftIdx];
        newMap[leftIdx] = newMap[rightIdx];
        newMap[rightIdx] = temp;
      }
    }
    commitMapChange(newMap);
  };

  const handleFlipVertical = () => {
    playUiTick();
    const newMap = new Uint8Array(tilemap);
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 20; x++) {
        const topIdx = y * 32 + x;
        const bottomIdx = (17 - y) * 32 + x;
        const temp = newMap[topIdx];
        newMap[topIdx] = newMap[bottomIdx];
        newMap[bottomIdx] = temp;
      }
    }
    commitMapChange(newMap);
  };

  const handleDownloadMapBinary = () => {
    playUiTick();
    const blob = new Blob([tilemap.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'background_tilemap.map';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        {/* Lock / Live Sync State */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playUiTick();
              onToggleMapLock(!isMapLocked);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
              isMapLocked
                ? 'bg-amber-400/20 border-amber-400/60 text-amber-300 font-semibold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={isMapLocked ? 'Map edits are locked in ROM' : 'Map auto-syncs with live video'}
          >
            {isMapLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isMapLocked ? 'Custom Map (Locked)' : 'Live Auto-Sync'}</span>
          </button>

          {isMapLocked && (
            <button
              onClick={() => {
                playUiTick();
                onResetToLive();
              }}
              className="flex items-center gap-1 text-xs px-2 py-1 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-all cursor-pointer"
              title="Reset custom map back to current camera frame"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Live</span>
            </button>
          )}
        </div>

        {/* Reorder Mode Selector */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-xs">
          <button
            onClick={() => {
              playUiTick();
              setReorderMode('swap');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
              reorderMode === 'swap'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Drag a tile onto another to swap their positions"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Swap Mode</span>
          </button>

          <button
            onClick={() => {
              playUiTick();
              setReorderMode('shift');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
              reorderMode === 'shift'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Drag a tile to insert and reorder tiles in sequence"
          >
            <Move className="w-3 h-3" />
            <span>Shift Mode</span>
          </button>

          <button
            onClick={() => {
              playUiTick();
              setReorderMode('stamp');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all ${
              reorderMode === 'stamp'
                ? 'bg-neutral-800 text-amber-300 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Click or drag to paint the selected pattern tile"
          >
            <Paintbrush className="w-3 h-3" />
            <span>Stamp #{selectedTileId}</span>
          </button>
        </div>

        {/* Action buttons (Undo, Redo, Flips, Export) */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed bg-neutral-900 rounded border border-neutral-800 transition-all"
            title="Undo reorder"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed bg-neutral-900 rounded border border-neutral-800 transition-all"
            title="Redo reorder"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-800 mx-1"></div>

          <button
            onClick={handleFlipHorizontal}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-900 rounded border border-neutral-800 transition-all"
            title="Flip Tilemap Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFlipVertical}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-900 rounded border border-neutral-800 transition-all"
            title="Flip Tilemap Vertically"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownloadMapBinary}
            className="flex items-center gap-1 text-[11px] px-2 py-1 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-all"
            title="Download raw 1024-byte .map binary file"
          >
            <Download className="w-3 h-3 text-amber-400" />
            <span>.map</span>
          </button>
        </div>
      </div>

      {/* Visual Instruction Banner */}
      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {reorderMode === 'swap' && 'Click & drag any tile onto another cell to swap their positions.'}
            {reorderMode === 'shift' && 'Click & drag a tile to shift and reorder the screen sequence.'}
            {reorderMode === 'stamp' && `Click or drag across the grid to stamp Tile #${selectedTileId}.`}
          </span>
        </span>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {hoveredCell ? (
            <span className="text-amber-300 font-semibold">
              X:{hoveredCell.x} Y:{hoveredCell.y} · Tile ${toHex2(hoveredCell.tileId)} (#{hoveredCell.tileId})
            </span>
          ) : (
            <span>20×18 Screen (360 tiles)</span>
          )}
        </div>
      </div>

      {/* Main 20x18 Interactive Tilemap Grid */}
      <div className="overflow-auto bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex justify-center max-h-[460px]">
        <div
          className="grid gap-[1px] bg-neutral-800/80 p-[1px] rounded shadow-inner"
          style={{
            gridTemplateColumns: `repeat(20, minmax(${cellScale}px, ${cellScale}px))`,
          }}
        >
          {Array.from({ length: 18 }).flatMap((_, y) =>
            Array.from({ length: 20 }).map((_, x) => {
              const mapIdx = y * 32 + x;
              const tileId = tilemap[mapIdx] || 0;
              const tile = tiles[tileId];
              const isDragSource = draggedCell?.x === x && draggedCell?.y === y;
              const isDropTarget = dragOverCell?.x === x && dragOverCell?.y === y;
              const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;

              return (
                <div
                  key={`${x}-${y}`}
                  draggable={reorderMode !== 'stamp'}
                  onDragStart={(e) => handleDragStart(x, y, tileId, e)}
                  onDragOver={(e) => handleDragOver(x, y, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(x, y, e)}
                  onClick={() => handleCellClick(x, y)}
                  onMouseEnter={() => setHoveredCell({ x, y, tileId })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`relative select-none transition-transform cursor-pointer ${
                    isDropTarget
                      ? 'border-2 border-amber-400 bg-amber-400/40 scale-110 z-20 shadow-md'
                      : isDragSource
                      ? 'opacity-40 border border-dashed border-amber-400/60'
                      : isHovered
                      ? 'border border-amber-400/80 scale-105 z-10'
                      : 'border-[0.5px] border-neutral-900/60'
                  }`}
                  style={{
                    width: cellScale,
                    height: cellScale,
                  }}
                  title={`Cell (${x}, ${y})\nTile ID: ${tileId} ($${toHex2(tileId)})\nDrag to reorder`}
                >
                  {/* Render 8x8 Tile Pixels */}
                  {tile ? (
                    <div className="w-full h-full grid grid-cols-8 grid-rows-8">
                      {tile.pixels.flatMap((row, py) =>
                        row.map((colorIdx, px) => {
                          const c = activePaletteColors[colorIdx] || { r: 0, g: 0, b: 0 };
                          return (
                            <span
                              key={`${py}-${px}`}
                              style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                            />
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center text-[7px] text-neutral-600 font-mono">
                      0
                    </div>
                  )}

                  {/* Tile ID Watermark / Overlay */}
                  {showTileIds && cellScale >= 20 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[7px] font-mono text-white/40 font-bold bg-black/40 px-0.5 rounded-[1px] leading-none">
                        {tileId}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mini Pattern Table Stamp Drawer (Drag tiles from palette onto tilemap) */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="text-[11px] font-semibold text-neutral-300">
            Pattern Palette (Click to stamp, or drag onto any cell above):
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] cursor-pointer text-neutral-400 hover:text-neutral-200">
              <input
                type="checkbox"
                checked={showTileIds}
                onChange={(e) => setShowTileIds(e.target.checked)}
                className="accent-amber-400 rounded-xs"
              />
              <span>Show IDs</span>
            </label>
            <div className="flex items-center gap-1 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">
              <button
                onClick={() => setCellScale(Math.max(16, cellScale - 4))}
                className="p-0.5 text-neutral-400 hover:text-white"
                title="Decrease cell size"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] text-neutral-400">{cellScale}px</span>
              <button
                onClick={() => setCellScale(Math.min(28, cellScale + 4))}
                className="p-0.5 text-neutral-400 hover:text-white"
                title="Increase cell size"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-24 overflow-x-auto overflow-y-hidden bg-neutral-900 border border-neutral-800 rounded-lg p-2 flex gap-1.5">
          {tiles.slice(0, 64).map((tile) => {
            const isSelected = selectedTileId === tile.id;
            return (
              <div
                key={tile.id}
                draggable
                onDragStart={(e) => {
                  playUiTick();
                  e.dataTransfer.setData(
                    'text/plain',
                    JSON.stringify({ tileId: tile.id, source: 'palette' })
                  );
                }}
                onClick={() => {
                  playUiTick();
                  onSelectTileId(tile.id);
                  setReorderMode('stamp');
                }}
                className={`relative w-8 h-8 shrink-0 p-0.5 rounded border transition-all cursor-grab active:cursor-grabbing ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/20 scale-105 shadow-sm'
                    : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950'
                }`}
                title={`Tile #${tile.id} ($${toHex2(tile.id)})\nDrag onto Tilemap or Click to select as active stamp`}
              >
                <div className="w-full h-full grid grid-cols-8 grid-rows-8">
                  {tile.pixels.flatMap((row, py) =>
                    row.map((colorIdx, px) => {
                      const c = activePaletteColors[colorIdx] || { r: 0, g: 0, b: 0 };
                      return (
                        <span
                          key={`${py}-${px}`}
                          style={{ backgroundColor: `rgb(${c.r},${c.g},${c.b})` }}
                        />
                      );
                    })
                  )}
                </div>
                <span className="absolute bottom-0 right-0 text-[6px] font-mono text-white/70 bg-black/70 px-0.5">
                  {tile.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
