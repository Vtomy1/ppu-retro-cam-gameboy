/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ConsoleMode } from '../types/retro';
import { Download, Cpu, Sparkles, RefreshCw } from 'lucide-react';
import { playBootChime, playUiTick } from '../utils/audio';

interface HeaderProps {
  consoleMode: ConsoleMode;
  onSelectConsole: (mode: ConsoleMode) => void;
  onDownloadRom: () => void;
  isStreaming: boolean;
  fps: number;
}

export const Header: React.FC<HeaderProps> = ({
  consoleMode,
  onSelectConsole,
  onDownloadRom,
  isStreaming,
  fps,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-neutral-800/80 bg-neutral-900/95 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
            PPU RetroCam
          </span>
          <span className="text-[11px] text-neutral-400 tracking-normal block -mt-0.5">
            Hardware Tile Engine & ROM Studio
          </span>
        </div>
      </div>

      {/* Zone 2: Console Navigation / Segmented Mode Selector */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800">
        <button
          onClick={() => {
            playUiTick();
            onSelectConsole('DMG');
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            consoleMode === 'DMG'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Game Boy (DMG 160×144)
        </button>
        <button
          onClick={() => {
            playUiTick();
            onSelectConsole('GBC');
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            consoleMode === 'GBC'
              ? 'bg-purple-950 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Game Boy Color (RGB555)
        </button>
        <button
          onClick={() => {
            playUiTick();
            onSelectConsole('GBA');
          }}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
            consoleMode === 'GBA'
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Game Boy Advance (240×160)
        </button>
      </div>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 font-mono tabular-nums pr-2">
          <span>{isStreaming ? 'Live 30Hz' : 'Frozen'}</span>
          <span aria-hidden="true">·</span>
          <span>{fps.toFixed(0)} FPS</span>
        </div>

        <button
          onClick={() => {
            playBootChime();
            onDownloadRom();
          }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
          title="Compile and download a real bootable Nintendo cartridge ROM"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download .{consoleMode.toLowerCase()} ROM</span>
        </button>
      </div>
    </header>
  );
};
