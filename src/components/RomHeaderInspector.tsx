/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ConsoleMode, HeaderByteDetail, RomHeaderInfo } from '../types/retro';
import { CheckCircle2, Copy, Download, FileCode, HardDrive, Info, ShieldCheck, Terminal } from 'lucide-react';
import { generateCSource, generateRgbdsAsm, toHex2, toHex4 } from '../utils/romHeader';
import { playBootChime, playUiTick } from '../utils/audio';

interface RomHeaderInspectorProps {
  consoleMode: ConsoleMode;
  headerInfo: RomHeaderInfo;
  romBytes: Uint8Array;
  tilesBytes: Uint8Array;
  tilemapBytes: Uint8Array;
  title: string;
  gameCode: string;
  onChangeTitle: (t: string) => void;
  onChangeGameCode: (c: string) => void;
}

export const RomHeaderInspector: React.FC<RomHeaderInspectorProps> = ({
  consoleMode,
  headerInfo,
  romBytes,
  tilesBytes,
  tilemapBytes,
  title,
  gameCode,
  onChangeTitle,
  onChangeGameCode,
}) => {
  const [selectedByte, setSelectedByte] = useState<HeaderByteDetail | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'hex' | 'c' | 'rgbds'>('hex');
  const [copied, setCopied] = useState<boolean>(false);

  const cSource = generateCSource(consoleMode, title, tilesBytes, tilemapBytes);
  const rgbdsAsm = generateRgbdsAsm(title, tilesBytes, tilemapBytes);

  const handleDownloadRom = () => {
    playBootChime();
    const ext = consoleMode === 'GBA' ? 'gba' : consoleMode === 'GBC' ? 'gbc' : 'gb';
    const blob = new Blob([romBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase() || 'retrocam'}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadC = () => {
    playUiTick();
    const blob = new Blob([cSource], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase() || 'retrocam'}_tiles.c`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsm = () => {
    playUiTick();
    const blob = new Blob([rgbdsAsm], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase() || 'retrocam'}_tiles.asm`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload2bpp = () => {
    playUiTick();
    const blob = new Blob([tilesBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase() || 'retrocam'}.2bpp`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    playUiTick();
    const textToCopy = activeCodeTab === 'c' ? cSource : rgbdsAsm;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-neutral-200 tracking-wide">
            Cartridge Header & ROM Binary Compiler
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadRom}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .{consoleMode.toLowerCase()} ROM ({romBytes.length / 1024} KB)</span>
          </button>
        </div>
      </div>

      {/* Cartridge Title and Code Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg">
        <div>
          <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
            Cartridge Title (Max 12-16 chars):
          </label>
          <input
            type="text"
            maxLength={consoleMode === 'GBA' ? 12 : 15}
            value={title}
            onChange={(e) => onChangeTitle(e.target.value.toUpperCase())}
            placeholder="RETROCAM"
            className="w-full text-xs font-mono uppercase bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        {consoleMode === 'GBA' ? (
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
              GBA 4-Letter Game Code:
            </label>
            <input
              type="text"
              maxLength={4}
              value={gameCode}
              onChange={(e) => onChangeGameCode(e.target.value.toUpperCase())}
              placeholder="WCAM"
              className="w-full text-xs font-mono uppercase bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-amber-400"
            />
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
              Cartridge Specification:
            </label>
            <div className="text-xs font-mono text-neutral-300 py-1.5">
              32KB ROM Only (No MBC required)
            </div>
          </div>
        )}
      </div>

      {/* ROM Header Field Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-neutral-400 font-mono">Entry Point</span>
          <span className="text-xs font-mono font-bold text-cyan-400">{headerInfo.entryPoint}</span>
        </div>

        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-neutral-400 font-mono">Nintendo Logo</span>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed BIOS</span>
          </span>
        </div>

        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-neutral-400 font-mono">Cartridge Type</span>
          <span className="text-xs font-bold text-neutral-200 truncate">{headerInfo.cartridgeType}</span>
        </div>

        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-neutral-400 font-mono">ROM Capacity</span>
          <span className="text-xs font-mono font-bold text-neutral-200">{headerInfo.romSize}</span>
        </div>

        <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
          <span className="text-[10px] text-neutral-400 font-mono">
            {consoleMode === 'GBA' ? 'Complement Checksum' : 'Header Checksum'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-amber-300">
              ${toHex2(headerInfo.headerChecksum)}
            </span>
            {headerInfo.isHeaderChecksumValid && (
              <span className="text-[9px] px-1 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded">
                Valid
              </span>
            )}
          </div>
        </div>

        {consoleMode !== 'GBA' && (
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-1">
            <span className="text-[10px] text-neutral-400 font-mono">Global Checksum</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-purple-300">
                ${toHex4(headerInfo.globalChecksum)}
              </span>
              {headerInfo.isGlobalChecksumValid && (
                <span className="text-[9px] px-1 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded">
                  Valid
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs for Memory Dump and Source Code Exporters */}
      <div className="flex items-center justify-between border-b border-neutral-800 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playUiTick();
              setActiveCodeTab('hex');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeCodeTab === 'hex'
                ? 'bg-neutral-800 text-amber-300 border-t border-x border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Header Hex Inspector
          </button>
          <button
            onClick={() => {
              playUiTick();
              setActiveCodeTab('c');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeCodeTab === 'c'
                ? 'bg-neutral-800 text-amber-300 border-t border-x border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            C Source (GBDK / devkitARM)
          </button>
          <button
            onClick={() => {
              playUiTick();
              setActiveCodeTab('rgbds');
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-all ${
              activeCodeTab === 'rgbds'
                ? 'bg-neutral-800 text-amber-300 border-t border-x border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            RGBDS Assembly (.asm)
          </button>
        </div>

        {activeCodeTab !== 'hex' && (
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-all cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={activeCodeTab === 'c' ? handleDownloadC : handleDownloadAsm}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download File</span>
            </button>
          </div>
        )}
      </div>

      {/* Hex Inspector Tab */}
      {activeCodeTab === 'hex' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Hex Memory Grid */}
          <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-72 overflow-y-auto">
            <div className="text-[11px] font-mono text-neutral-400 pb-2 mb-2 border-b border-neutral-800 flex justify-between">
              <span>Offset &nbsp; 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
              <span>ASCII</span>
            </div>

            <div className="flex flex-col gap-1 font-mono text-[11px]">
              {Array.from({ length: Math.ceil(headerInfo.byteDetails.length / 16) }).map((_, row) => {
                const startIdx = row * 16;
                const rowBytes = headerInfo.byteDetails.slice(startIdx, startIdx + 16);
                const baseOffset = rowBytes[0]?.offset || 0;

                return (
                  <div key={row} className="flex items-center justify-between hover:bg-neutral-900/60 rounded px-1">
                    <span className="text-neutral-500 w-16">${toHex4(baseOffset)}:</span>

                    <div className="flex gap-1.5 flex-1 px-2">
                      {rowBytes.map((b) => {
                        const isSelected = selectedByte?.offset === b.offset;
                        let colorClass = 'text-neutral-300';
                        if (b.category === 'entry') colorClass = 'text-cyan-400 font-bold';
                        else if (b.category === 'logo') colorClass = 'text-emerald-400';
                        else if (b.category === 'title') colorClass = 'text-amber-400 font-bold';
                        else if (b.category === 'checksum') colorClass = 'text-red-400 font-bold';

                        return (
                          <span
                            key={b.offset}
                            onMouseEnter={() => setSelectedByte(b)}
                            onClick={() => setSelectedByte(b)}
                            className={`cursor-pointer px-0.5 rounded transition-colors ${colorClass} ${
                              isSelected ? 'bg-amber-400 text-neutral-950 font-bold' : 'hover:bg-neutral-800'
                            }`}
                          >
                            {b.hex}
                          </span>
                        );
                      })}
                    </div>

                    <span className="text-neutral-400 tracking-wider">
                      {rowBytes.map((b) => b.ascii).join('')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Byte Inspector Tooltip Card */}
          <div className="w-full lg:w-72 bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Info className="w-3.5 h-3.5" />
              <span>Byte Inspector</span>
            </div>

            {selectedByte ? (
              <div className="flex flex-col gap-1.5 text-xs text-neutral-300 font-mono">
                <div>Offset: <span className="text-cyan-400">{selectedByte.hexOffset}</span> ({selectedByte.offset})</div>
                <div>Hex Value: <span className="text-amber-400">${selectedByte.hex}</span> (Dec: {selectedByte.byte})</div>
                <div>ASCII: <span className="text-emerald-400">'{selectedByte.ascii}'</span></div>
                <div>Field: <span className="text-white font-bold">{selectedByte.field}</span></div>
                <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                  {selectedByte.meaning}
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 italic">
                Hover or click any byte in the hex dump to inspect hardware register details and checksum equations.
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-neutral-800 flex flex-col gap-1">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Direct Exports:</span>
              <button
                onClick={handleDownload2bpp}
                className="flex items-center justify-between text-xs px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-300 cursor-pointer"
              >
                <span>Raw VRAM Pattern File (.2bpp)</span>
                <Download className="w-3 h-3 text-neutral-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C Code Source Tab */}
      {activeCodeTab === 'c' && (
        <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-72 overflow-y-auto text-xs font-mono text-neutral-300 leading-relaxed">
          {cSource}
        </pre>
      )}

      {/* RGBDS Assembly Tab */}
      {activeCodeTab === 'rgbds' && (
        <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 max-h-72 overflow-y-auto text-xs font-mono text-neutral-300 leading-relaxed">
          {rgbdsAsm}
        </pre>
      )}
    </div>
  );
};
