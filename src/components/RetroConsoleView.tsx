/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ConsoleMode, ShellType, VideoProcessingSettings } from '../types/retro';
import { Camera, Download, Maximize2, Sparkles, Volume2 } from 'lucide-react';
import { playBootChime, playShutterSound, playUiTick } from '../utils/audio';

interface RetroConsoleViewProps {
  consoleMode: ConsoleMode;
  settings: VideoProcessingSettings;
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  fps: number;
  onSnapshot: () => void;
  shellType: ShellType;
  onChangeShell: (shell: ShellType) => void;
}

export const RetroConsoleView: React.FC<RetroConsoleViewProps> = ({
  consoleMode,
  settings,
  outputCanvasRef,
  fps,
  onSnapshot,
  shellType,
  onChangeShell,
}) => {
  const [scale, setScale] = useState<number>(3); // 1x, 2x, 3x, 4x
  const [btnAPressed, setBtnAPressed] = useState(false);
  const [btnBPressed, setBtnBPressed] = useState(false);

  // Screen resolution
  const screenWidth = consoleMode === 'GBA' ? 240 : 160;
  const screenHeight = consoleMode === 'GBA' ? 160 : 144;

  const handleDownloadPng = () => {
    playShutterSound();
    if (!outputCanvasRef.current) return;
    const canvas = outputCanvasRef.current;
    const link = document.createElement('a');
    link.download = `${settings.romTitle.toLowerCase() || 'retrocam'}_${consoleMode.toLowerCase()}_snapshot.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Shell Selector & Viewport Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between w-full gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl">
        {/* Shell Type Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-neutral-400 pl-2 pr-1">Housing:</span>
          {consoleMode === 'DMG' && (
            <>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('dmg_classic');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'dmg_classic'
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                DMG-01 Classic
              </button>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('pocket_silver');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'pocket_silver'
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Pocket Silver
              </button>
            </>
          )}

          {consoleMode === 'GBC' && (
            <>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('color_atomic_purple');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'color_atomic_purple'
                    ? 'bg-purple-900/60 border border-purple-500/40 text-purple-200 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Atomic Purple
              </button>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('color_berry');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'color_berry'
                    ? 'bg-pink-900/60 border border-pink-500/40 text-pink-200 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Berry Magenta
              </button>
            </>
          )}

          {consoleMode === 'GBA' && (
            <>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('gba_indigo');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'gba_indigo'
                    ? 'bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                AGB Indigo
              </button>
              <button
                onClick={() => {
                  playUiTick();
                  onChangeShell('gba_arctic');
                }}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  shellType === 'gba_arctic'
                    ? 'bg-neutral-800 text-amber-300 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Arctic White
              </button>
            </>
          )}

          <button
            onClick={() => {
              playUiTick();
              onChangeShell('clean_lab');
            }}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
              shellType === 'clean_lab'
                ? 'bg-neutral-800 text-amber-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Direct Lab
          </button>
        </div>

        {/* Scale & PNG Export */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center gap-0.5 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {[2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => {
                  playUiTick();
                  setScale(s);
                }}
                className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                  scale === s
                    ? 'bg-neutral-800 text-amber-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadPng}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-all cursor-pointer"
            title="Download crisp pixel PNG snapshot"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Main Handheld Simulator Shell Container */}
      <div className="flex justify-center w-full py-2">
        {shellType === 'clean_lab' ? (
          // Direct Lab Mode: Sleek Technical Monitor Frame
          <div className="relative p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center shadow-2xl">
            <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-neutral-800 text-xs text-neutral-400 font-mono">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>PPU LCD Active ({screenWidth}×{screenHeight})</span>
              </span>
              <span>2bpp Planar Mode</span>
            </div>

            <div
              className="relative overflow-hidden rounded-md border-2 border-neutral-800 shadow-inner"
              style={{
                width: screenWidth * scale,
                height: screenHeight * scale,
              }}
            >
              <canvas
                ref={outputCanvasRef}
                width={screenWidth}
                height={screenHeight}
                className="w-full h-full pixelated block"
              />
              {settings.showLcdGrid && (
                <div className="absolute inset-0 pointer-events-none lcd-grid-overlay" />
              )}
              {settings.showScanlines && (
                <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-60" />
              )}
            </div>
          </div>
        ) : shellType === 'gba_indigo' || shellType === 'gba_arctic' ? (
          // Game Boy Advance Horizontal Shell (AGB-001)
          <div
            className={`relative rounded-4xl p-6 sm:p-8 flex flex-col items-center shadow-2xl border-4 ${
              shellType === 'gba_indigo'
                ? 'bg-gradient-to-b from-indigo-700 via-indigo-800 to-indigo-900 border-indigo-600/80'
                : 'bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 border-slate-300'
            }`}
            style={{ width: Math.max(480, screenWidth * scale + 160) }}
          >
            {/* L & R Shoulder Buttons */}
            <div className="absolute -top-3 left-10 w-24 h-4 bg-neutral-300 rounded-t-lg border-t border-neutral-400 shadow-sm flex items-center justify-center">
              <span className="text-[9px] font-bold text-neutral-600">L</span>
            </div>
            <div className="absolute -top-3 right-10 w-24 h-4 bg-neutral-300 rounded-t-lg border-t border-neutral-400 shadow-sm flex items-center justify-center">
              <span className="text-[9px] font-bold text-neutral-600">R</span>
            </div>

            {/* Screen Bezel */}
            <div className="bg-neutral-900 p-4 rounded-2xl border-2 border-neutral-700 flex flex-col items-center shadow-inner">
              <div className="flex items-center justify-between w-full px-2 pb-1.5 text-neutral-400">
                <span className="font-pixel text-[8px] text-neutral-300 tracking-wider">
                  GAME BOY ADVANCE
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </div>

              <div
                className="relative overflow-hidden rounded-xs bg-black"
                style={{
                  width: screenWidth * scale,
                  height: screenHeight * scale,
                }}
              >
                <canvas
                  ref={outputCanvasRef}
                  width={screenWidth}
                  height={screenHeight}
                  className="w-full h-full pixelated block"
                />
                {settings.showLcdGrid && (
                  <div className="absolute inset-0 pointer-events-none lcd-grid-overlay" />
                )}
                {settings.showScanlines && (
                  <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-60" />
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between w-full px-6 pt-5">
              {/* D-Pad */}
              <div className="relative w-20 h-20 bg-neutral-800 rounded-lg p-1 flex items-center justify-center shadow-md">
                <div className="w-16 h-6 bg-neutral-900 rounded-sm absolute shadow-inner"></div>
                <div className="h-16 w-6 bg-neutral-900 rounded-sm absolute shadow-inner"></div>
                <div className="w-4 h-4 rounded-full bg-neutral-800 z-10 shadow-sm"></div>
              </div>

              {/* Start & Select */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      playUiTick();
                      onSnapshot();
                    }}
                    className="w-10 h-3 bg-neutral-700 hover:bg-neutral-600 rounded-full rotate-[-25deg] shadow-md cursor-pointer active:scale-95"
                  />
                  <span className="text-[8px] font-bold text-neutral-400 mt-2">SELECT</span>
                </div>
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      playBootChime();
                      onSnapshot();
                    }}
                    className="w-10 h-3 bg-neutral-700 hover:bg-neutral-600 rounded-full rotate-[-25deg] shadow-md cursor-pointer active:scale-95"
                  />
                  <span className="text-[8px] font-bold text-neutral-400 mt-2">START</span>
                </div>
              </div>

              {/* A & B Action Buttons */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => {
                      playUiTick();
                      setBtnBPressed(true);
                    }}
                    onMouseUp={() => setBtnBPressed(false)}
                    className={`w-10 h-10 rounded-full font-bold text-xs shadow-md transition-all cursor-pointer ${
                      shellType === 'gba_indigo'
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                        : 'bg-indigo-900 text-white'
                    } ${btnBPressed ? 'scale-90 shadow-inner' : ''}`}
                  >
                    B
                  </button>
                  <span className="text-[9px] font-bold text-neutral-400 mt-1">B</span>
                </div>

                <div className="flex flex-col items-center mb-5">
                  <button
                    onMouseDown={() => {
                      playBootChime();
                      setBtnAPressed(true);
                    }}
                    onMouseUp={() => setBtnAPressed(false)}
                    className={`w-10 h-10 rounded-full font-bold text-xs shadow-md transition-all cursor-pointer ${
                      shellType === 'gba_indigo'
                        ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                        : 'bg-indigo-900 text-white'
                    } ${btnAPressed ? 'scale-90 shadow-inner' : ''}`}
                  >
                    A
                  </button>
                  <span className="text-[9px] font-bold text-neutral-400 mt-1">A</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Classic Vertical Game Boy (DMG-01 or Color) Shell
          <div
            className={`relative rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl border-4 ${
              shellType === 'color_atomic_purple'
                ? 'bg-purple-950/85 backdrop-blur-md border-purple-500/50 shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                : shellType === 'color_berry'
                ? 'bg-pink-700 border-pink-500/70'
                : shellType === 'pocket_silver'
                ? 'bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-300 border-neutral-300'
                : 'bg-gradient-to-b from-[#dfdfd7] via-[#d6d6cb] to-[#c7c7bb] border-[#bcbcaf]'
            }`}
            style={{ width: Math.max(340, screenWidth * scale + 64) }}
          >
            {/* DMG Bezel Stripes and DOT MATRIX STEREO SOUND Header */}
            <div className="w-full flex items-center justify-between pb-3 px-2">
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-8 bg-purple-700 inline-block"></span>
                <span className="h-0.5 w-8 bg-blue-700 inline-block"></span>
              </div>
              <span className="font-pixel text-[8px] text-neutral-600 tracking-wider">
                {consoleMode === 'GBC' ? 'COLOR' : 'DOT MATRIX WITH STEREO SOUND'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-8 bg-blue-700 inline-block"></span>
                <span className="h-0.5 w-8 bg-purple-700 inline-block"></span>
              </div>
            </div>

            {/* Screen Bezel (Classic Dark Gray Screen Window) */}
            <div className="relative bg-[#5f6368] p-5 sm:p-6 rounded-xl rounded-b-3xl border-2 border-neutral-700 shadow-inner flex flex-col items-center">
              {/* Battery indicator LED */}
              <div className="absolute top-6 left-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_#ef4444] animate-pulse"></span>
                <span className="text-[7px] font-bold text-neutral-400">BATTERY</span>
              </div>

              {/* Physical Screen Glass */}
              <div
                className="relative overflow-hidden rounded-xs bg-[#8b956d] shadow-inner"
                style={{
                  width: screenWidth * scale,
                  height: screenHeight * scale,
                }}
              >
                <canvas
                  ref={outputCanvasRef}
                  width={screenWidth}
                  height={screenHeight}
                  className="w-full h-full pixelated block"
                />
                {settings.showLcdGrid && (
                  <div className="absolute inset-0 pointer-events-none lcd-grid-overlay" />
                )}
                {settings.showScanlines && (
                  <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-60" />
                )}
              </div>
            </div>

            {/* Brand Logo Under Screen */}
            <div className="w-full flex justify-start pl-4 pt-3 pb-2">
              <span className="font-sans italic font-black text-sm tracking-wide text-blue-900">
                Nintendo <span className="text-xs font-semibold text-neutral-600 font-pixel not-italic">GAME BOY™</span>
              </span>
            </div>

            {/* Physical Controls Section */}
            <div className="flex items-center justify-between w-full px-3 pt-4">
              {/* D-Pad */}
              <div className="relative w-20 h-20 bg-neutral-700/80 rounded-full flex items-center justify-center p-1">
                <div className="w-16 h-6 bg-neutral-800 rounded-sm absolute shadow-md"></div>
                <div className="h-16 w-6 bg-neutral-800 rounded-sm absolute shadow-md"></div>
                <div className="w-4 h-4 rounded-full bg-neutral-700 z-10"></div>
              </div>

              {/* A & B Angled Magenta Buttons */}
              <div className="flex items-center gap-3 rotate-[-25deg]">
                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => {
                      playUiTick();
                      setBtnBPressed(true);
                    }}
                    onMouseUp={() => setBtnBPressed(false)}
                    className={`w-9 h-9 rounded-full bg-[#9c1b48] hover:bg-[#83163c] text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
                      btnBPressed ? 'scale-90 shadow-inner' : ''
                    }`}
                  >
                    B
                  </button>
                  <span className="text-[8px] font-bold text-neutral-500 mt-1">B</span>
                </div>

                <div className="flex flex-col items-center">
                  <button
                    onMouseDown={() => {
                      playBootChime();
                      setBtnAPressed(true);
                    }}
                    onMouseUp={() => setBtnAPressed(false)}
                    className={`w-9 h-9 rounded-full bg-[#9c1b48] hover:bg-[#83163c] text-white font-bold text-xs shadow-md transition-all cursor-pointer ${
                      btnAPressed ? 'scale-90 shadow-inner' : ''
                    }`}
                  >
                    A
                  </button>
                  <span className="text-[8px] font-bold text-neutral-500 mt-1">A</span>
                </div>
              </div>
            </div>

            {/* Select & Start Pill Buttons */}
            <div className="flex items-center justify-center gap-5 pt-8">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    playUiTick();
                    onSnapshot();
                  }}
                  className="w-11 h-2.5 bg-neutral-500 hover:bg-neutral-600 rounded-full rotate-[-25deg] shadow-md cursor-pointer active:scale-95"
                />
                <span className="text-[8px] font-bold text-neutral-600 mt-2 font-pixel">SELECT</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    playBootChime();
                    onSnapshot();
                  }}
                  className="w-11 h-2.5 bg-neutral-500 hover:bg-neutral-600 rounded-full rotate-[-25deg] shadow-md cursor-pointer active:scale-95"
                />
                <span className="text-[8px] font-bold text-neutral-600 mt-2 font-pixel">START</span>
              </div>
            </div>

            {/* Speaker Grille angled cutouts */}
            <div className="w-full flex justify-end pr-5 pt-4">
              <div className="flex gap-1.5 rotate-[-25deg]">
                <div className="w-1 h-8 bg-neutral-400/80 rounded-full"></div>
                <div className="w-1 h-8 bg-neutral-400/80 rounded-full"></div>
                <div className="w-1 h-8 bg-neutral-400/80 rounded-full"></div>
                <div className="w-1 h-8 bg-neutral-400/80 rounded-full"></div>
                <div className="w-1 h-8 bg-neutral-400/80 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
