/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleMode, ShellType, Tile2bpp, TilemapCell, VideoProcessingSettings, RomHeaderInfo } from './types/retro';
import { DMG_PALETTES, generateDefaultGbcPalettes, applyGbcColorCorrection, applyGbaColorCorrection } from './utils/palette';
import { preprocessPixels, ditherDmgImage, ditherGbcImage, ditherGbaImage } from './utils/dither';
import { processPpuTiles, buildGbcAttributeMap } from './utils/ppu';
import { buildGameBoyRom, buildGbaRom } from './utils/romHeader';
import { Header } from './components/Header';
import { WebcamInput } from './components/WebcamInput';
import { RetroConsoleView } from './components/RetroConsoleView';
import { DitherControls } from './components/DitherControls';
import { PpuInspector } from './components/PpuInspector';
import { RomHeaderInspector } from './components/RomHeaderInspector';

export default function App() {
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>('DMG');
  const [shellType, setShellType] = useState<ShellType>('dmg_classic');
  const [deduplicateTiles, setDeduplicateTiles] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  // Settings
  const [settings, setSettings] = useState<VideoProcessingSettings>({
    console: 'DMG',
    ditherAlgorithm: 'atkinson',
    ditherStrength: 0.9,
    dmgPalette: 'dmg_original',
    brightness: 0,
    contrast: 1.15,
    gamma: 1.0,
    exposure: 0,
    sharpness: 0.2,
    invert: false,
    showLcdGrid: true,
    showScanlines: false,
    colorCorrection: false,
    mirror: true,
    romTitle: 'RETROCAM',
    gameCode: 'WCAM',
  });

  // Current PPU State
  const [currentTiles, setCurrentTiles] = useState<Tile2bpp[]>([]);
  const [currentTilemap, setCurrentTilemap] = useState<Uint8Array>(new Uint8Array(1024));
  const [visibleCells, setVisibleCells] = useState<TilemapCell[]>([]);
  const [gbcPalettes, setGbcPalettes] = useState(generateDefaultGbcPalettes());

  // Current ROM State
  const [currentRomBytes, setCurrentRomBytes] = useState<Uint8Array>(new Uint8Array(32768));
  const [headerInfo, setHeaderInfo] = useState<RomHeaderInfo | null>(null);
  const [isMapLocked, setIsMapLocked] = useState<boolean>(false);
  const currentTilemapRef = useRef<Uint8Array>(new Uint8Array(1024));
  const isMapLockedRef = useRef<boolean>(false);

  useEffect(() => {
    currentTilemapRef.current = currentTilemap;
  }, [currentTilemap]);

  useEffect(() => {
    isMapLockedRef.current = isMapLocked;
  }, [isMapLocked]);

  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const lastRomUpdateRef = useRef<number>(0);

  // Dimensions based on console mode
  const targetWidth = consoleMode === 'GBA' ? 240 : 160;
  const targetHeight = consoleMode === 'GBA' ? 160 : 144;

  // Sync shell type when console mode changes
  const handleSelectConsole = (mode: ConsoleMode) => {
    setConsoleMode(mode);
    setSettings((prev) => ({ ...prev, console: mode }));
    if (mode === 'DMG') setShellType('dmg_classic');
    else if (mode === 'GBC') setShellType('color_atomic_purple');
    else if (mode === 'GBA') setShellType('gba_indigo');
  };

  // Reorder and update tilemap handler
  const handleUpdateTilemap = useCallback((newMap: Uint8Array, lockCustom: boolean) => {
    setCurrentTilemap(newMap);
    currentTilemapRef.current = newMap;
    if (lockCustom) {
      setIsMapLocked(true);
      isMapLockedRef.current = true;
    }

    if (currentTiles.length > 0) {
      const tileBytes = new Uint8Array(currentTiles.length * 16);
      for (let t = 0; t < currentTiles.length; t++) {
        tileBytes.set(currentTiles[t].bytes, t * 16);
      }
      const isColor = consoleMode === 'GBC';
      const { rom, headerInfo: hInfo } = buildGameBoyRom(
        isColor,
        settings.romTitle,
        tileBytes,
        newMap
      );
      setCurrentRomBytes(rom);
      setHeaderInfo(hInfo);
    }
  }, [currentTiles, consoleMode, settings.romTitle]);

  const handleResetToLive = useCallback(() => {
    setIsMapLocked(false);
    isMapLockedRef.current = false;
  }, []);

  // Process incoming video / image frame through retro PPU pipeline
  const handleProcessFrame = useCallback(
    (sourceCanvas: HTMLCanvasElement) => {
      const outCanvas = outputCanvasRef.current;
      if (!outCanvas) return;

      const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!srcCtx) return;

      const srcImgData = srcCtx.getImageData(0, 0, targetWidth, targetHeight);
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return;

      // 1. Image Preprocessing (Brightness, contrast, gamma, sharpness, invert)
      const processedBuffer = preprocessPixels(srcImgData, targetWidth, targetHeight, {
        brightness: settings.brightness,
        contrast: settings.contrast,
        gamma: settings.gamma,
        exposure: settings.exposure,
        sharpness: settings.sharpness,
        invert: settings.invert,
      });

      const outImgData = outCtx.createImageData(targetWidth, targetHeight);
      const outData = outImgData.data;

      const now = performance.now();

      // 2. Hardware Mode Specific Dithering & Tile Encoding
      if (consoleMode === 'DMG') {
        const palette = DMG_PALETTES[settings.dmgPalette].colors;
        const ditheredIndices = ditherDmgImage(
          processedBuffer,
          targetWidth,
          targetHeight,
          settings.ditherAlgorithm,
          settings.ditherStrength
        );

        // Render to canvas
        for (let i = 0; i < targetWidth * targetHeight; i++) {
          const colorIdx = ditheredIndices[i];
          const color = palette[colorIdx];
          const oIdx = i * 4;
          outData[oIdx] = color.r;
          outData[oIdx + 1] = color.g;
          outData[oIdx + 2] = color.b;
          outData[oIdx + 3] = 255;
        }

        // Throttle full PPU tile deduplication and ROM binary rebuild to ~5 Hz to keep 60fps silky smooth
        if (now - lastRomUpdateRef.current > 200) {
          lastRomUpdateRef.current = now;
          const ppuResult = processPpuTiles(ditheredIndices, targetWidth, targetHeight, deduplicateTiles);
          setCurrentTiles(ppuResult.tiles);

          const activeMap = isMapLockedRef.current ? currentTilemapRef.current : ppuResult.tilemap;
          if (!isMapLockedRef.current) {
            setCurrentTilemap(activeMap);
            currentTilemapRef.current = activeMap;
          }
          setVisibleCells(ppuResult.visibleCells);

          // Concatenate all tile bytes
          const tileBytes = new Uint8Array(ppuResult.tiles.length * 16);
          for (let t = 0; t < ppuResult.tiles.length; t++) {
            tileBytes.set(ppuResult.tiles[t].bytes, t * 16);
          }

          const { rom, headerInfo: hInfo } = buildGameBoyRom(
            false,
            settings.romTitle,
            tileBytes,
            activeMap
          );
          setCurrentRomBytes(rom);
          setHeaderInfo(hInfo);
        }

        // If map is locked, render the custom tilemap directly on screen
        if (isMapLockedRef.current && currentTiles.length > 0) {
          const activeMap = currentTilemapRef.current;
          for (let ty = 0; ty < 18; ty++) {
            for (let tx = 0; tx < 20; tx++) {
              const tId = activeMap[ty * 32 + tx] || 0;
              const t = currentTiles[tId] || currentTiles[0];
              if (t) {
                for (let py = 0; py < 8; py++) {
                  for (let px = 0; px < 8; px++) {
                    const y = ty * 8 + py;
                    const x = tx * 8 + px;
                    const oIdx = (y * targetWidth + x) * 4;
                    const colIdx = t.pixels[py][px];
                    const col = palette[colIdx] || palette[0];
                    outData[oIdx] = col.r;
                    outData[oIdx + 1] = col.g;
                    outData[oIdx + 2] = col.b;
                    outData[oIdx + 3] = 255;
                  }
                }
              }
            }
          }
        }

        outCtx.putImageData(outImgData, 0, 0);
      } else if (consoleMode === 'GBC') {
        const palettes = gbcPalettes;
        const gbcResult = ditherGbcImage(
          processedBuffer,
          targetWidth,
          targetHeight,
          palettes,
          settings.ditherAlgorithm,
          settings.ditherStrength
        );

        // Render to canvas
        for (let i = 0; i < targetWidth * targetHeight; i++) {
          let color = gbcResult.pixelColors[i];
          if (settings.colorCorrection) {
            color = applyGbcColorCorrection(color.r, color.g, color.b);
          }
          const oIdx = i * 4;
          outData[oIdx] = color.r;
          outData[oIdx + 1] = color.g;
          outData[oIdx + 2] = color.b;
          outData[oIdx + 3] = 255;
        }

        outCtx.putImageData(outImgData, 0, 0);

        if (now - lastRomUpdateRef.current > 200) {
          lastRomUpdateRef.current = now;
          const ppuResult = processPpuTiles(
            gbcResult.pixelPaletteIndices,
            targetWidth,
            targetHeight,
            deduplicateTiles
          );
          const activeMap = isMapLockedRef.current ? currentTilemapRef.current : ppuResult.tilemap;
          if (!isMapLockedRef.current) {
            setCurrentTilemap(activeMap);
            currentTilemapRef.current = activeMap;
          }
          setVisibleCells(ppuResult.visibleCells);

          const tileBytes = new Uint8Array(ppuResult.tiles.length * 16);
          for (let t = 0; t < ppuResult.tiles.length; t++) {
            tileBytes.set(ppuResult.tiles[t].bytes, t * 16);
          }

          const attrMap = buildGbcAttributeMap(gbcResult.tilePaletteIndices, 20, 18);

          const { rom, headerInfo: hInfo } = buildGameBoyRom(
            true,
            settings.romTitle,
            tileBytes,
            activeMap,
            attrMap
          );
          setCurrentRomBytes(rom);
          setHeaderInfo(hInfo);
        }
      } else if (consoleMode === 'GBA') {
        const gbaResult = ditherGbaImage(
          processedBuffer,
          targetWidth,
          targetHeight,
          settings.ditherAlgorithm,
          settings.ditherStrength
        );

        for (let i = 0; i < targetWidth * targetHeight; i++) {
          let color = gbaResult.pixelColors[i];
          if (settings.colorCorrection) {
            color = applyGbaColorCorrection(color.r, color.g, color.b);
          }
          const oIdx = i * 4;
          outData[oIdx] = color.r;
          outData[oIdx + 1] = color.g;
          outData[oIdx + 2] = color.b;
          outData[oIdx + 3] = 255;
        }

        outCtx.putImageData(outImgData, 0, 0);

        if (now - lastRomUpdateRef.current > 200) {
          lastRomUpdateRef.current = now;
          const { rom, headerInfo: hInfo } = buildGbaRom(
            settings.romTitle,
            settings.gameCode,
            gbaResult.rgb555Buffer
          );
          setCurrentRomBytes(rom);
          setHeaderInfo(hInfo);
        }
      }

      // FPS tracking
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
    },
    [
      consoleMode,
      targetWidth,
      targetHeight,
      settings,
      deduplicateTiles,
      gbcPalettes,
    ]
  );

  const activeDmgColors = DMG_PALETTES[settings.dmgPalette].colors;

  return (
    <div className="min-h-screen bg-[#0c0e12] text-neutral-100 flex flex-col">
      {/* Top Bar Navigation */}
      <Header
        consoleMode={consoleMode}
        onSelectConsole={handleSelectConsole}
        onDownloadRom={() => {
          const ext = consoleMode === 'GBA' ? 'gba' : consoleMode === 'GBC' ? 'gbc' : 'gb';
          const blob = new Blob([currentRomBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${settings.romTitle.toLowerCase() || 'retrocam'}.${ext}`;
          link.click();
          URL.revokeObjectURL(url);
        }}
        isStreaming={isStreaming}
        fps={fps}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Top Grid: Left Side Controls & Video Source | Center Handheld Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Video Input & Live Camera Controls (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <WebcamInput
              onFrame={handleProcessFrame}
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              mirror={settings.mirror}
              onToggleMirror={() => setSettings((s) => ({ ...s, mirror: !s.mirror }))}
              onSetMirror={(m) => setSettings((s) => ({ ...s, mirror: m }))}
            />

            <DitherControls
              settings={settings}
              onChangeSettings={setSettings}
              deduplicateTiles={deduplicateTiles}
              onToggleDeduplication={() => setDeduplicateTiles(!deduplicateTiles)}
              uniqueTilesCount={currentTiles.length}
            />
          </div>

          {/* Right Column: Handheld Housing & Screen Output (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <RetroConsoleView
              consoleMode={consoleMode}
              settings={settings}
              outputCanvasRef={outputCanvasRef}
              fps={fps}
              onSnapshot={() => setIsStreaming(!isStreaming)}
              shellType={shellType}
              onChangeShell={setShellType}
            />

            {/* PPU VRAM Pattern Table & Map Inspector */}
            {consoleMode !== 'GBA' && (
              <PpuInspector
                consoleMode={consoleMode}
                tiles={currentTiles}
                tilemap={currentTilemap}
                visibleCells={visibleCells}
                activePaletteColors={activeDmgColors}
                gbcPalettes={gbcPalettes}
                onUpdateTilemap={handleUpdateTilemap}
                isMapLocked={isMapLocked}
                onToggleMapLock={setIsMapLocked}
                onResetToLive={handleResetToLive}
              />
            )}
          </div>
        </div>

        {/* Bottom Section: ROM Header Inspector & Binary Exporters (Full Width) */}
        {headerInfo && (
          <RomHeaderInspector
            consoleMode={consoleMode}
            headerInfo={headerInfo}
            romBytes={currentRomBytes}
            tilesBytes={
              new Uint8Array(
                currentTiles.flatMap((t) => Array.from(t.bytes))
              )
            }
            tilemapBytes={currentTilemap}
            title={settings.romTitle}
            gameCode={settings.gameCode}
            onChangeTitle={(t) => setSettings((prev) => ({ ...prev, romTitle: t }))}
            onChangeGameCode={(c) => setSettings((prev) => ({ ...prev, gameCode: c }))}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-6 text-xs text-neutral-400 flex flex-wrap items-center justify-between gap-4 mt-auto">
        <div className="flex items-center gap-2">
          <span>PPU RetroCam Studio</span>
          <span aria-hidden="true">·</span>
          <span>Game Boy (DMG 2bpp) / Game Boy Color (CGB) / Game Boy Advance (AGB Mode 3)</span>
          <span aria-hidden="true">·</span>
          <span>GBDK-2020 & devkitARM Compatible</span>
        </div>
        <div className="text-neutral-400">
          Pure Client-Side Canvas & Web Audio Assembly Synthesizer
        </div>
      </footer>
    </div>
  );
}
