/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleMode, HeaderByteDetail, RomHeaderInfo } from '../types/retro';

// Official Nintendo Logo bytes for Game Boy DMG / GBC (48 bytes at $0104-$0133)
export const DMG_NINTENDO_LOGO: number[] = [
  0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b, 0x03, 0x73, 0x00, 0x83, 0x00, 0x0c, 0x00, 0x0d,
  0x00, 0x08, 0x11, 0x1f, 0x88, 0x89, 0x00, 0x0e, 0xdc, 0xcc, 0x6e, 0xe6, 0xdd, 0xdd, 0xd9, 0x99,
  0xbb, 0xbb, 0x67, 0x63, 0x6e, 0x0e, 0xec, 0xcc, 0xdd, 0xdc, 0x99, 0x9f, 0xbb, 0xb9, 0x33, 0x3e,
];

// Official Nintendo Logo bytes for Game Boy Advance (156 bytes at $0004-$009F)
export const GBA_NINTENDO_LOGO: number[] = [
  0x24, 0xff, 0xae, 0x51, 0x69, 0x9a, 0xa2, 0x21, 0x3d, 0x84, 0x82, 0x0a, 0x84, 0xe4, 0x09, 0xad,
  0x11, 0x24, 0x8b, 0x98, 0xc0, 0x81, 0x7f, 0x21, 0xa3, 0x52, 0xbe, 0x19, 0x93, 0x09, 0xce, 0x20,
  0x10, 0x46, 0x4a, 0x4a, 0xf8, 0x27, 0x31, 0xec, 0x58, 0xc7, 0xe8, 0x33, 0x82, 0xe3, 0xce, 0xbf,
  0x85, 0xf4, 0xdf, 0x94, 0xce, 0x4b, 0x09, 0x2b, 0x94, 0x5e, 0xff, 0xff, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xca, 0xaa, 0x00, 0x00,
];

/**
 * Format number as 2-character uppercase hex
 */
export function toHex2(val: number): string {
  return (val & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Format number as 4-character uppercase hex
 */
export function toHex4(val: number): string {
  return (val & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate a complete, bootable 32KB Game Boy (.gb or .gbc) ROM binary
 */
export function buildGameBoyRom(
  isColor: boolean,
  title: string,
  tileDataBytes: Uint8Array,
  tileMapBytes: Uint8Array,
  gbcAttributes?: Uint8Array,
  gbcPalettesRgb555?: number[][]
): { rom: Uint8Array; headerInfo: RomHeaderInfo } {
  // Standard 32KB Game Boy ROM (2 banks of 16KB)
  const romSize = 32768;
  const rom = new Uint8Array(romSize);

  // 1. Entry point at $0100: NOP; JP $0150
  rom[0x0100] = 0x00; // NOP
  rom[0x0101] = 0xc3; // JP
  rom[0x0102] = 0x50; // $50
  rom[0x0103] = 0x01; // $01

  // 2. Nintendo Logo at $0104 - $0133
  for (let i = 0; i < DMG_NINTENDO_LOGO.length; i++) {
    rom[0x0104 + i] = DMG_NINTENDO_LOGO[i];
  }

  // 3. Title at $0134 - $0143 (16 uppercase ASCII bytes)
  const sanitizedTitle = (title.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'RETROCAM').padEnd(
    16,
    '\0'
  );
  for (let i = 0; i < 16; i++) {
    rom[0x0134 + i] = sanitizedTitle.charCodeAt(i) || 0;
  }

  // CGB Flag at $0143
  if (isColor) {
    rom[0x0143] = 0x80; // Supports CGB and DMG backward compatibility
  } else {
    rom[0x0143] = 0x00; // DMG Only
  }

  // 4. New Licensee Code at $0144-$0145: "01" (Nintendo R&D1)
  rom[0x0144] = '0'.charCodeAt(0);
  rom[0x0145] = '1'.charCodeAt(0);

  // 5. SGB Flag at $0146: $00
  rom[0x0146] = 0x00;

  // 6. Cartridge Type at $0147: $00 (ROM ONLY)
  rom[0x0147] = 0x00;

  // 7. ROM Size at $0148: $00 (32 KByte, 2 banks)
  rom[0x0148] = 0x00;

  // 8. RAM Size at $0149: $00 (None)
  rom[0x0149] = 0x00;

  // 9. Destination Code at $014A: $01 (Non-Japanese)
  rom[0x014A] = 0x01;

  // 10. Old Licensee Code at $014B: $33 (Use New Licensee Code)
  rom[0x014B] = 0x33;

  // 11. Mask ROM Version at $014C: $00
  rom[0x014C] = 0x00;

  // 12. Calculate Header Checksum at $014D:
  // x=0: for (i=0x0134; i<=0x014C; i++) x = x - rom[i] - 1; rom[0x014D] = x;
  let headerChecksum = 0;
  for (let i = 0x0134; i <= 0x014c; i++) {
    headerChecksum = (headerChecksum - rom[i] - 1) & 0xff;
  }
  rom[0x014d] = headerChecksum;

  // 13. Z80 Executable Code at $0150
  // Real working Game Boy machine code:
  // Copies tile pattern data from ROM ($0200) to VRAM ($8000),
  // copies tilemap from ROM to VRAM ($9800), sets BGP to $E4, turns on LCD.
  let pc = 0x0150;

  const asmCode: number[] = [
    // wait_vbl: ldh a, [$44]; cp 144; jr c, wait_vbl
    0xf0, 0x44,       // ldh a, [$FF44] (LY)
    0xfe, 0x90,       // cp 144
    0x38, 0xfa,       // jr c, -6 (wait_vbl)

    // Turn off LCD: xor a; ldh [$40], a
    0xaf,             // xor a
    0xe0, 0x40,       // ldh [$FF40], a (LCDC)

    // Set DMG BGP: ld a, $E4; ldh [$47], a
    0x3e, 0xe4,       // ld a, $E4
    0xe0, 0x47,       // ldh [$FF47], a (BGP)

    // Copy Tile Data: ld hl, $0300; ld de, $8000; ld bc, tileLen
    0x21, 0x00, 0x03, // ld hl, $0300
    0x11, 0x00, 0x80, // ld de, $8000
    0x01, tileDataBytes.length & 0xff, (tileDataBytes.length >> 8) & 0xff, // ld bc, len
    // copy_loop_tiles:
    0x2a,             // ld a, [hl+]
    0x12,             // ld [de], a
    0x13,             // inc de
    0x0b,             // dec bc
    0x78,             // ld a, b
    0xb1,             // or c
    0x20, 0xf9,       // jr nz, copy_loop_tiles

    // Copy Tilemap: ld hl, mapAddr; ld de, $9800; ld bc, 1024
    // map starts immediately after tile data in ROM
  ];

  for (let i = 0; i < asmCode.length; i++) {
    rom[pc++] = asmCode[i];
  }

  // Address where tilemap data will sit in ROM:
  const tileDataRomAddr = 0x0300;
  const tileMapRomAddr = tileDataRomAddr + tileDataBytes.length;

  // ld hl, tileMapRomAddr
  rom[pc++] = 0x21;
  rom[pc++] = tileMapRomAddr & 0xff;
  rom[pc++] = (tileMapRomAddr >> 8) & 0xff;

  // ld de, $9800
  rom[pc++] = 0x11;
  rom[pc++] = 0x00;
  rom[pc++] = 0x98;

  // ld bc, 1024 (Game Boy BG map is 32x32)
  rom[pc++] = 0x01;
  rom[pc++] = 0x00;
  rom[pc++] = 0x04; // 1024 = 0x0400

  // copy_loop_map:
  rom[pc++] = 0x2a; // ld a, [hl+]
  rom[pc++] = 0x12; // ld [de], a
  rom[pc++] = 0x13; // inc de
  rom[pc++] = 0x0b; // dec bc
  rom[pc++] = 0x78; // ld a, b
  rom[pc++] = 0xb1; // or c
  rom[pc++] = 0x20; // jr nz, -7
  rom[pc++] = 0xf9;

  // Turn on LCD with BG enabled: ld a, $91; ldh [$40], a
  rom[pc++] = 0x3e;
  rom[pc++] = 0x91; // %10010001: LCD on, Tile data $8000, BG map $9800, BG on
  rom[pc++] = 0xe0;
  rom[pc++] = 0x40;

  // Infinite halt loop: halt; nop; jr -4
  rom[pc++] = 0x76; // halt
  rom[pc++] = 0x00; // nop
  rom[pc++] = 0x18; // jr -4
  rom[pc++] = 0xfc;

  // Place Tile Data in ROM at $0300
  for (let i = 0; i < tileDataBytes.length; i++) {
    if (tileDataRomAddr + i < romSize) {
      rom[tileDataRomAddr + i] = tileDataBytes[i];
    }
  }

  // Place Tile Map in ROM
  for (let i = 0; i < tileMapBytes.length; i++) {
    if (tileMapRomAddr + i < romSize) {
      rom[tileMapRomAddr + i] = tileMapBytes[i];
    }
  }

  // 14. Calculate Global Checksum at $014E-$014F (16-bit big-endian)
  let globalChecksum = 0;
  for (let i = 0; i < rom.length; i++) {
    if (i !== 0x014e && i !== 0x014f) {
      globalChecksum = (globalChecksum + rom[i]) & 0xffff;
    }
  }
  rom[0x014e] = (globalChecksum >> 8) & 0xff;
  rom[0x014f] = globalChecksum & 0xff;

  // Parse header inspector details
  const headerInfo = parseGameBoyHeader(rom, isColor ? 'GBC' : 'DMG');

  return { rom, headerInfo };
}

/**
 * Generate a complete, bootable Game Boy Advance (.gba) ROM binary
 * Using Mode 3 (240x160 direct color bitmap) or Mode 4
 */
export function buildGbaRom(
  title: string,
  gameCode: string,
  rgb555Frame: Uint16Array
): { rom: Uint8Array; headerInfo: RomHeaderInfo } {
  // GBA ROM size: 128KB (131,072 bytes)
  // Header: 192 bytes ($0000 - $00BF)
  // Code: $00C0 - $01FF
  // Frame buffer data: 240 * 160 * 2 = 76,800 bytes at $0200
  const romSize = 131072;
  const rom = new Uint8Array(romSize);

  // 1. ARM Branch at $0000: b $080000C0
  // Opcode: 0xEA00002E (Offset 0x2E = 46 words = 184 bytes + 8-byte prefetch = $00C0)
  rom[0x00] = 0x2e;
  rom[0x01] = 0x00;
  rom[0x02] = 0x00;
  rom[0x03] = 0xea;

  // 2. GBA Nintendo Logo at $0004 - $009F (156 bytes)
  for (let i = 0; i < GBA_NINTENDO_LOGO.length; i++) {
    rom[0x04 + i] = GBA_NINTENDO_LOGO[i];
  }

  // 3. Game Title at $00A0 - $00AB (12 chars ASCII)
  const safeTitle = (title.toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'RETROCAMGBA')
    .slice(0, 12)
    .padEnd(12, '\0');
  for (let i = 0; i < 12; i++) {
    rom[0xa0 + i] = safeTitle.charCodeAt(i) || 0;
  }

  // 4. Game Code at $00AC - $00AF (4 chars ASCII)
  const safeCode = (gameCode.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'WCAM')
    .slice(0, 4)
    .padEnd(4, 'X');
  for (let i = 0; i < 4; i++) {
    rom[0xac + i] = safeCode.charCodeAt(i);
  }

  // 5. Maker Code at $00B0 - $00B1: "01" (Nintendo)
  rom[0xb0] = '0'.charCodeAt(0);
  rom[0xb1] = '1'.charCodeAt(0);

  // 6. Fixed 96h byte at $00B2
  rom[0xb2] = 0x96;

  // 7. Main Unit Code at $00B3: $00
  rom[0xb3] = 0x00;

  // 8. Device Type at $00B4: $00
  rom[0xb4] = 0x00;

  // 9. Reserved bytes $00B5 - $00BB: 0
  for (let i = 0xb5; i <= 0xbb; i++) {
    rom[i] = 0x00;
  }

  // 10. Software Version at $00BC: $00
  rom[0xbc] = 0x00;

  // 11. Complement Checksum at $00BD
  // Formula: chk = 0; for (i = 0xA0; i <= 0xBC; i++) chk -= rom[i]; chk = (chk - 0x19) & 0xFF;
  let chk = 0;
  for (let i = 0xa0; i <= 0xbc; i++) {
    chk = (chk - rom[i]) & 0xff;
  }
  const complementChecksum = (chk - 0x19) & 0xff;
  rom[0xbd] = complementChecksum;

  // Reserved $00BE-$00BF
  rom[0xbe] = 0x00;
  rom[0xbf] = 0x00;

  // 12. ARM Assembly Boot Code at $00C0
  // Sets REG_DISPCNT ($04000000) = $0403 (Mode 3, BG2)
  // Copies 38,400 halfwords from ROM ($08000200) to VRAM ($06000000)
  // Loop forever
  const armCodeWords: number[] = [
    0xe3a00204, // mov r0, #0x04000000   (REG_BASE)
    0xe3a01c04, // mov r1, #0x00000400   (BG2 flag)
    0xe2811003, // add r1, r1, #0x03     (Mode 3 -> DISPCNT = 0x0403)
    0xe5801000, // str r1, [r0]          (*0x04000000 = 0x0403)
    0xe3a00306, // mov r0, #0x06000000   (VRAM Base address)
    0xe3a01102, // mov r1, #0x08000000   (ROM Base address)
    0xe2811c02, // add r1, r1, #0x00000200 (ROM Frame buffer address = 0x08000200)
    0xe3a02a96, // mov r2, #0x00009600   (38,400 pixels = 0x9600 halfwords)
    // copy_loop:
    0xe1d130b0, // ldrh r3, [r1], #2     (Load pixel from ROM)
    0xe1c030b0, // strh r3, [r0], #2     (Store pixel to VRAM)
    0xe2522001, // subs r2, r2, #1       (Decrement count)
    0x1afffffb, // bne copy_loop         (Branch if not zero)
    // halt_loop:
    0xeafffffe, // b . (infinite loop)
  ];

  let armOffset = 0x00c0;
  for (const word of armCodeWords) {
    rom[armOffset++] = word & 0xff;
    rom[armOffset++] = (word >> 8) & 0xff;
    rom[armOffset++] = (word >> 16) & 0xff;
    rom[armOffset++] = (word >> 24) & 0xff;
  }

  // 13. Copy 240x160 15-bit color pixels into ROM at $0200
  let pixelRomOffset = 0x0200;
  for (let i = 0; i < rgb555Frame.length; i++) {
    const val = rgb555Frame[i];
    rom[pixelRomOffset++] = val & 0xff;
    rom[pixelRomOffset++] = (val >> 8) & 0xff;
  }

  // Parse header info
  const headerInfo = parseGbaHeader(rom);

  return { rom, headerInfo };
}

/**
 * Parse and validate Game Boy DMG / GBC Header
 */
export function parseGameBoyHeader(rom: Uint8Array, consoleMode: ConsoleMode): RomHeaderInfo {
  const byteDetails: HeaderByteDetail[] = [];

  // Entry Point $0100 - $0103
  for (let i = 0x0100; i <= 0x0103; i++) {
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: rom[i],
      hex: toHex2(rom[i]),
      ascii: String.fromCharCode(rom[i] >= 32 && rom[i] <= 126 ? rom[i] : 46),
      field: 'Entry Point',
      meaning: i === 0x0100 ? 'NOP opcode' : i === 0x0101 ? 'JP opcode' : 'Target $0150',
      category: 'entry',
    });
  }

  // Nintendo Logo $0104 - $0133
  for (let i = 0x0104; i <= 0x0133; i++) {
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: rom[i],
      hex: toHex2(rom[i]),
      ascii: String.fromCharCode(rom[i] >= 32 && rom[i] <= 126 ? rom[i] : 46),
      field: 'Nintendo Boot Logo',
      meaning: `BootROM verification graphic byte ${i - 0x0104 + 1}/48`,
      category: 'logo',
    });
  }

  // Title & CGB flag $0134 - $0143
  let titleStr = '';
  for (let i = 0x0134; i <= 0x0143; i++) {
    const b = rom[i];
    if (i < 0x0143 && b >= 32 && b <= 126) titleStr += String.fromCharCode(b);
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: b,
      hex: toHex2(b),
      ascii: String.fromCharCode(b >= 32 && b <= 126 ? b : 46),
      field: i === 0x0143 ? 'CGB Flag' : 'Cartridge Title',
      meaning:
        i === 0x0143
          ? b === 0x80
            ? 'CGB Supported (Works on DMG & CGB)'
            : b === 0xc0
            ? 'CGB Only (Locks on DMG)'
            : 'DMG Mono Only'
          : `Title character [${i - 0x0134}]`,
      category: 'title',
    });
  }

  // New Licensee Code $0144 - $0145
  byteDetails.push({
    offset: 0x0144,
    hexOffset: '0x0144',
    byte: rom[0x0144],
    hex: toHex2(rom[0x0144]),
    ascii: String.fromCharCode(rom[0x0144]),
    field: 'New Licensee Hi',
    meaning: 'Publisher ID Char 1',
    category: 'spec',
  });
  byteDetails.push({
    offset: 0x0145,
    hexOffset: '0x0145',
    byte: rom[0x0145],
    hex: toHex2(rom[0x0145]),
    ascii: String.fromCharCode(rom[0x0145]),
    field: 'New Licensee Lo',
    meaning: 'Publisher ID Char 2 (01 = Nintendo)',
    category: 'spec',
  });

  // SGB Flag $0146
  byteDetails.push({
    offset: 0x0146,
    hexOffset: '0x0146',
    byte: rom[0x0146],
    hex: toHex2(rom[0x0146]),
    ascii: '.',
    field: 'SGB Flag',
    meaning: rom[0x0146] === 0x03 ? 'Super Game Boy Enabled' : 'No SGB Support ($00)',
    category: 'spec',
  });

  // Cartridge Type $0147
  byteDetails.push({
    offset: 0x0147,
    hexOffset: '0x0147',
    byte: rom[0x0147],
    hex: toHex2(rom[0x0147]),
    ascii: '.',
    field: 'Cartridge Type',
    meaning: rom[0x0147] === 0x00 ? 'ROM ONLY (No MBC chip)' : 'Memory Bank Controller (MBC)',
    category: 'spec',
  });

  // ROM Size $0148
  byteDetails.push({
    offset: 0x0148,
    hexOffset: '0x0148',
    byte: rom[0x0148],
    hex: toHex2(rom[0x0148]),
    ascii: '.',
    field: 'ROM Size',
    meaning: '32 KByte (2 Banks of 16KB)',
    category: 'spec',
  });

  // RAM Size $0149
  byteDetails.push({
    offset: 0x0149,
    hexOffset: '0x0149',
    byte: rom[0x0149],
    hex: toHex2(rom[0x0149]),
    ascii: '.',
    field: 'RAM Size',
    meaning: 'No external cartridge RAM',
    category: 'spec',
  });

  // Destination $014A
  byteDetails.push({
    offset: 0x014a,
    hexOffset: '0x014A',
    byte: rom[0x014a],
    hex: toHex2(rom[0x014a]),
    ascii: '.',
    field: 'Destination Code',
    meaning: rom[0x014a] === 0x00 ? 'Japanese Market' : 'Overseas / Non-Japanese ($01)',
    category: 'spec',
  });

  // Old Licensee $014B
  byteDetails.push({
    offset: 0x014b,
    hexOffset: '0x014B',
    byte: rom[0x014b],
    hex: toHex2(rom[0x014b]),
    ascii: '.',
    field: 'Old Licensee Code',
    meaning: '$33 specifies check New Licensee bytes',
    category: 'spec',
  });

  // Mask ROM Version $014C
  byteDetails.push({
    offset: 0x014c,
    hexOffset: '0x014C',
    byte: rom[0x014c],
    hex: toHex2(rom[0x014c]),
    ascii: '.',
    field: 'Mask ROM Version',
    meaning: 'Version 1.0 ($00)',
    category: 'spec',
  });

  // Header Checksum $014D
  let computedHeaderChecksum = 0;
  for (let i = 0x0134; i <= 0x014c; i++) {
    computedHeaderChecksum = (computedHeaderChecksum - rom[i] - 1) & 0xff;
  }
  const storedHeaderChecksum = rom[0x014d];

  byteDetails.push({
    offset: 0x014d,
    hexOffset: '0x014D',
    byte: storedHeaderChecksum,
    hex: toHex2(storedHeaderChecksum),
    ascii: '.',
    field: 'Header Checksum',
    meaning: `8-bit complement sum: expected $${toHex2(computedHeaderChecksum)}`,
    category: 'checksum',
  });

  // Global Checksum $014E - $014F
  let computedGlobalChecksum = 0;
  for (let i = 0; i < rom.length; i++) {
    if (i !== 0x014e && i !== 0x014f) {
      computedGlobalChecksum = (computedGlobalChecksum + rom[i]) & 0xffff;
    }
  }
  const storedGlobalChecksum = (rom[0x014e] << 8) | rom[0x014f];

  byteDetails.push({
    offset: 0x014e,
    hexOffset: '0x014E',
    byte: rom[0x014e],
    hex: toHex2(rom[0x014e]),
    ascii: '.',
    field: 'Global Checksum Hi',
    meaning: `Upper byte of 16-bit ROM sum`,
    category: 'checksum',
  });
  byteDetails.push({
    offset: 0x014f,
    hexOffset: '0x014F',
    byte: rom[0x014f],
    hex: toHex2(rom[0x014f]),
    ascii: '.',
    field: 'Global Checksum Lo',
    meaning: `Lower byte of 16-bit ROM sum ($${toHex4(computedGlobalChecksum)})`,
    category: 'checksum',
  });

  return {
    console: consoleMode,
    entryPoint: '0x0100 (NOP; JP $0150)',
    title: titleStr.trim() || 'RETROCAM',
    cgbFlag: rom[0x0143] === 0x80 ? 'CGB+DMG ($80)' : rom[0x0143] === 0xc0 ? 'CGB Only ($C0)' : 'DMG ($00)',
    sgbFlag: rom[0x0146] === 0x03 ? 'SGB Support' : 'None ($00)',
    cartridgeType: 'ROM ONLY ($00)',
    romSize: '32 KByte (2 Banks)',
    ramSize: 'None ($00)',
    destination: rom[0x014a] === 0x00 ? 'Japan ($00)' : 'Overseas ($01)',
    licenseeCode: `Nintendo / "${String.fromCharCode(rom[0x0144])}${String.fromCharCode(rom[0x0145])}"`,
    maskVersion: rom[0x014c],
    headerChecksum: storedHeaderChecksum,
    computedHeaderChecksum,
    isHeaderChecksumValid: storedHeaderChecksum === computedHeaderChecksum,
    globalChecksum: storedGlobalChecksum,
    computedGlobalChecksum,
    isGlobalChecksumValid: storedGlobalChecksum === computedGlobalChecksum,
    totalRomBytes: rom.length,
    headerBytes: rom.slice(0x0100, 0x0150),
    byteDetails,
  };
}

/**
 * Parse and validate Game Boy Advance Header
 */
export function parseGbaHeader(rom: Uint8Array): RomHeaderInfo {
  const byteDetails: HeaderByteDetail[] = [];

  // Entry point $0000 - $0003
  for (let i = 0; i < 4; i++) {
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: rom[i],
      hex: toHex2(rom[i]),
      ascii: '.',
      field: 'ARM Branch',
      meaning: i === 0 ? 'ARM opcode low byte' : i === 3 ? 'b 0x080000C0 (0xEA)' : 'Branch offset',
      category: 'entry',
    });
  }

  // Logo $0004 - $009F
  for (let i = 0x04; i <= 0x9f; i++) {
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: rom[i],
      hex: toHex2(rom[i]),
      ascii: String.fromCharCode(rom[i] >= 32 && rom[i] <= 126 ? rom[i] : 46),
      field: 'GBA BIOS Logo',
      meaning: `Nintendo BIOS signature byte ${i - 0x04 + 1}/156`,
      category: 'logo',
    });
  }

  // Title $00A0 - $00AB (12 chars)
  let titleStr = '';
  for (let i = 0xa0; i <= 0xab; i++) {
    const b = rom[i];
    if (b >= 32 && b <= 126) titleStr += String.fromCharCode(b);
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: b,
      hex: toHex2(b),
      ascii: String.fromCharCode(b >= 32 && b <= 126 ? b : 46),
      field: 'GBA Title',
      meaning: `Title character [${i - 0xa0}]`,
      category: 'title',
    });
  }

  // Game Code $00AC - $00AF (4 chars)
  let gameCode = '';
  for (let i = 0xac; i <= 0xaf; i++) {
    const b = rom[i];
    gameCode += String.fromCharCode(b);
    byteDetails.push({
      offset: i,
      hexOffset: `0x${toHex4(i)}`,
      byte: b,
      hex: toHex2(b),
      ascii: String.fromCharCode(b),
      field: 'Game Code',
      meaning: `Cartridge identifier char [${i - 0xac}]`,
      category: 'title',
    });
  }

  // Maker code $00B0 - $00B1
  byteDetails.push({
    offset: 0xb0,
    hexOffset: '0x00B0',
    byte: rom[0xb0],
    hex: toHex2(rom[0xb0]),
    ascii: String.fromCharCode(rom[0xb0]),
    field: 'Maker Code Hi',
    meaning: 'Nintendo Maker Code ("01")',
    category: 'spec',
  });
  byteDetails.push({
    offset: 0xb1,
    hexOffset: '0x00B1',
    byte: rom[0xb1],
    hex: toHex2(rom[0xb1]),
    ascii: String.fromCharCode(rom[0xb1]),
    field: 'Maker Code Lo',
    meaning: 'Nintendo Maker Code',
    category: 'spec',
  });

  // Fixed byte $00B2
  byteDetails.push({
    offset: 0xb2,
    hexOffset: '0x00B2',
    byte: rom[0xb2],
    hex: toHex2(rom[0xb2]),
    ascii: '.',
    field: 'Fixed Value',
    meaning: 'Must be $96 for GBA BIOS verification',
    category: 'spec',
  });

  // Unit code $00B3
  byteDetails.push({
    offset: 0xb3,
    hexOffset: '0x00B3',
    byte: rom[0xb3],
    hex: toHex2(rom[0xb3]),
    ascii: '.',
    field: 'Main Unit Code',
    meaning: 'Standard GBA ($00)',
    category: 'spec',
  });

  // Device type $00B4
  byteDetails.push({
    offset: 0xb4,
    hexOffset: '0x00B4',
    byte: rom[0xb4],
    hex: toHex2(rom[0xb4]),
    ascii: '.',
    field: 'Device Type',
    meaning: 'Standard D-Bus ($00)',
    category: 'spec',
  });

  // Version $00BC
  byteDetails.push({
    offset: 0xbc,
    hexOffset: '0x00BC',
    byte: rom[0xbc],
    hex: toHex2(rom[0xbc]),
    ascii: '.',
    field: 'Software Version',
    meaning: 'Revision 1.0 ($00)',
    category: 'spec',
  });

  // Complement Checksum $00BD
  let chk = 0;
  for (let i = 0xa0; i <= 0xbc; i++) {
    chk = (chk - rom[i]) & 0xff;
  }
  const computedComplement = (chk - 0x19) & 0xff;
  const storedComplement = rom[0xbd];

  byteDetails.push({
    offset: 0xbd,
    hexOffset: '0x00BD',
    byte: storedComplement,
    hex: toHex2(storedComplement),
    ascii: '.',
    field: 'Complement Checksum',
    meaning: `GBA BIOS complement: expected $${toHex2(computedComplement)}`,
    category: 'checksum',
  });

  return {
    console: 'GBA',
    entryPoint: '0x08000000 (b 0x080000C0)',
    title: titleStr.trim() || 'RETROCAMGBA',
    gameCode: gameCode || 'WCAM',
    cartridgeType: 'Direct Boot Cartridge',
    romSize: '128 KByte',
    ramSize: 'None ($00)',
    destination: 'Worldwide',
    licenseeCode: `Nintendo / "${String.fromCharCode(rom[0xb0])}${String.fromCharCode(rom[0xb1])}"`,
    maskVersion: rom[0xbc],
    headerChecksum: storedComplement,
    computedHeaderChecksum: computedComplement,
    isHeaderChecksumValid: storedComplement === computedComplement,
    globalChecksum: 0,
    computedGlobalChecksum: 0,
    isGlobalChecksumValid: true,
    totalRomBytes: rom.length,
    headerBytes: rom.slice(0x00, 0xc0),
    byteDetails,
  };
}

/**
 * Generate C Source Code Header & Arrays for GBDK-2020 / devkitARM
 */
export function generateCSource(
  consoleMode: ConsoleMode,
  title: string,
  tiles: Uint8Array,
  map: Uint8Array,
  palettes?: number[][]
): string {
  const cleanTitle = title.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

  if (consoleMode === 'GBA') {
    return `// ============================================================================
// Generated by PPU RetroCam - Game Boy Advance Asset Export
// Suitable for devkitARM / libtonc / libgba
// ============================================================================

#ifndef ${cleanTitle}_H
#define ${cleanTitle}_H

#include <stdint.h>

#define ${cleanTitle}_WIDTH  240
#define ${cleanTitle}_HEIGHT 160
#define ${cleanTitle}_SIZE   (240 * 160)

// 15-bit RGB555 Color Frame Buffer (Mode 3 Direct Bitmap)
// Format: 1 bit 0, 5 bits Blue, 5 bits Green, 5 bits Red
extern const uint16_t ${cleanTitle.toLowerCase()}_bitmap[${cleanTitle}_SIZE];

#endif // ${cleanTitle}_H

// ============================================================================
// Source Data (.c):
// ============================================================================
const uint16_t ${cleanTitle.toLowerCase()}_bitmap[${cleanTitle}_SIZE] __attribute__((aligned(4))) = {
  // First 32 pixels sample:
  ${Array.from(tiles.slice(0, 64))
    .map((b, i) => (i % 8 === 0 ? '\n  ' : '') + `0x${toHex2(b)}, `)
    .join('')}
  // ... (${tiles.length} bytes total)
};
`;
  }

  // DMG or GBC
  const tileCount = Math.floor(tiles.length / 16);
  return `// ============================================================================
// Generated by PPU RetroCam - Game Boy / GBC 2bpp Tile Export
// Suitable for GBDK-2020 (lcc) and RGBDS
// ============================================================================

#ifndef ${cleanTitle}_H
#define ${cleanTitle}_H

#include <stdint.h>

#define ${cleanTitle}_TILE_COUNT ${tileCount}
#define ${cleanTitle}_MAP_WIDTH   20
#define ${cleanTitle}_MAP_HEIGHT  18
#define ${cleanTitle}_MAP_SIZE    1024

// 2bpp Planar Tile Data (16 bytes per 8x8 tile)
// Load to VRAM at 0x8000 using set_bkg_data(0, ${tileCount}, ${cleanTitle.toLowerCase()}_tiles);
extern const uint8_t ${cleanTitle.toLowerCase()}_tiles[${tiles.length}];

// 32x32 Background Tile Map
// Load to VRAM at 0x9800 using set_bkg_tiles(0, 0, 20, 18, ${cleanTitle.toLowerCase()}_map);
extern const uint8_t ${cleanTitle.toLowerCase()}_map[${map.length}];

#endif // ${cleanTitle}_H

// ============================================================================
// Tile Pattern Data (${tileCount} tiles, ${tiles.length} bytes):
// ============================================================================
const uint8_t ${cleanTitle.toLowerCase()}_tiles[] = {
  ${Array.from(tiles)
    .map((b, i) => (i % 16 === 0 ? `\n  // Tile ${Math.floor(i / 16)}\n  ` : '') + `0x${toHex2(b)}, `)
    .join('')}
};

// ============================================================================
// Background Tilemap (32x32 = 1024 bytes):
// ============================================================================
const uint8_t ${cleanTitle.toLowerCase()}_map[] = {
  ${Array.from(map)
    .map((b, i) => (i % 32 === 0 ? `\n  // Row ${Math.floor(i / 32)}\n  ` : '') + `0x${toHex2(b)}, `)
    .join('')}
};
`;
}

/**
 * Generate RGBDS Assembly Source (.asm)
 */
export function generateRgbdsAsm(
  title: string,
  tiles: Uint8Array,
  map: Uint8Array
): string {
  const cleanTitle = title.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const tileCount = Math.floor(tiles.length / 16);

  return `; ============================================================================
; Generated by PPU RetroCam - RGBDS Game Boy Assembly Format
; Compatible with rgbasm / rgblink / rgbfix
; ============================================================================

SECTION "${cleanTitle}_Tiles", ROM0

${cleanTitle}_TileCount EQU ${tileCount}

${cleanTitle}_Tiles::
${Array.from(tiles)
  .reduce((acc: string[][], b, i) => {
    if (i % 16 === 0) acc.push([]);
    acc[acc.length - 1].push(`$${toHex2(b)}`);
    return acc;
  }, [])
  .map((chunk, i) => `    ; Tile ${i}\n    db ${chunk.join(', ')}`)
  .join('\n')}

SECTION "${cleanTitle}_Map", ROM0

${cleanTitle}_Map::
${Array.from(map)
  .reduce((acc: string[][], b, i) => {
    if (i % 32 === 0) acc.push([]);
    acc[acc.length - 1].push(`$${toHex2(b)}`);
    return acc;
  }, [])
  .map((chunk, i) => `    ; Row ${i}\n    db ${chunk.join(', ')}`)
  .join('\n')}
`;
}
