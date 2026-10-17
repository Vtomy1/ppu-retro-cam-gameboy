/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TestCardPreset {
  id: string;
  name: string;
  description: string;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export const TEST_CARDS: TestCardPreset[] = [
  {
    id: 'gbc_camera_face',
    name: 'Game Boy Camera Portrait',
    description: 'High dynamic range facial portrait ideal for Atkinson dithering',
    draw: (ctx, width, height) => {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#f2ece4');
      grad.addColorStop(1, '#948a7e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Studio backdrop spotlight
      const rad = ctx.createRadialGradient(width / 2, height / 2 - 10, 10, width / 2, height / 2, 80);
      rad.addColorStop(0, '#ffffff');
      rad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, width, height);

      // Stylized retro portrait silhouette and features
      ctx.fillStyle = '#2d251e';
      // Head
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2 - 12, 38, 48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#140f0c';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 24, 42, Math.PI, Math.PI * 2);
      ctx.lineTo(width / 2 + 42, height / 2);
      ctx.lineTo(width / 2 - 42, height / 2);
      ctx.fill();

      // Face skin
      ctx.fillStyle = '#e8b898';
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2 - 6, 28, 36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes & eyebrows
      ctx.fillStyle = '#1e140d';
      ctx.fillRect(width / 2 - 16, height / 2 - 16, 10, 3);
      ctx.fillRect(width / 2 + 6, height / 2 - 16, 10, 3);

      ctx.beginPath();
      ctx.arc(width / 2 - 11, height / 2 - 8, 4, 0, Math.PI * 2);
      ctx.arc(width / 2 + 11, height / 2 - 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Nose shadow
      ctx.fillStyle = '#b88065';
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2 - 6);
      ctx.lineTo(width / 2 - 3, height / 2 + 4);
      ctx.lineTo(width / 2 + 3, height / 2 + 4);
      ctx.closePath();
      ctx.fill();

      // Lips
      ctx.fillStyle = '#a64440';
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2 + 14, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shoulders & Shirt
      ctx.fillStyle = '#3a4a60';
      ctx.beginPath();
      ctx.ellipse(width / 2, height + 10, 65, 40, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'retro_landscape',
    name: '16-bit Castle & Mount Fuji',
    description: 'Scenic mountains, sunset clouds, and retro castle ramparts',
    draw: (ctx, width, height) => {
      // Sky sunset gradient
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#1a103c');
      sky.addColorStop(0.35, '#822659');
      sky.addColorStop(0.65, '#ee5a5a');
      sky.addColorStop(0.85, '#f3a683');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Distant pixel sun
      ctx.fillStyle = '#ffeaa7';
      ctx.beginPath();
      ctx.arc(width * 0.72, height * 0.45, 24, 0, Math.PI * 2);
      ctx.fill();

      // Mountain Fuji
      ctx.fillStyle = '#2c2c54';
      ctx.beginPath();
      ctx.moveTo(width * 0.1, height * 0.85);
      ctx.lineTo(width * 0.48, height * 0.32);
      ctx.lineTo(width * 0.85, height * 0.85);
      ctx.closePath();
      ctx.fill();

      // Snow cap
      ctx.fillStyle = '#f7f1e3';
      ctx.beginPath();
      ctx.moveTo(width * 0.42, height * 0.41);
      ctx.lineTo(width * 0.48, height * 0.32);
      ctx.lineTo(width * 0.54, height * 0.41);
      ctx.lineTo(width * 0.5, height * 0.44);
      ctx.closePath();
      ctx.fill();

      // Castle silhouettes on cliff
      ctx.fillStyle = '#130f40';
      ctx.fillRect(0, height * 0.72, width * 0.4, height * 0.28);
      ctx.fillRect(width * 0.08, height * 0.58, 24, 30);
      ctx.fillRect(width * 0.18, height * 0.52, 30, 40);
      // Castle roofs
      ctx.beginPath();
      ctx.moveTo(width * 0.05, height * 0.58);
      ctx.lineTo(width * 0.2, height * 0.50);
      ctx.lineTo(width * 0.35, height * 0.58);
      ctx.fill();

      // Water reflection
      ctx.fillStyle = '#0c2461';
      ctx.fillRect(0, height * 0.85, width, height * 0.15);
      ctx.fillStyle = '#f3a683';
      for (let y = height * 0.86; y < height; y += 4) {
        ctx.fillRect(width * 0.65 - (y % 8), y, 20 + (y % 12), 2);
      }
    },
  },
  {
    id: 'smpte_bars',
    name: 'SMPTE Color Calibration Bars',
    description: 'Broadcast color bars to test RGB555 and 8-palette quantization',
    draw: (ctx, width, height) => {
      const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      const barWidth = width / colors.length;

      // Top 67% standard bars
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(i * barWidth, 0, barWidth + 1, height * 0.67);
      }

      // Middle 8% cast bars
      const castColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
      for (let i = 0; i < castColors.length; i++) {
        ctx.fillStyle = castColors[i];
        ctx.fillRect(i * barWidth, height * 0.67, barWidth + 1, height * 0.08);
      }

      // Bottom 25% PLUGE and gray ramps
      const bottomW = width / 6;
      ctx.fillStyle = '#083842';
      ctx.fillRect(0, height * 0.75, bottomW, height * 0.25);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bottomW, height * 0.75, bottomW, height * 0.25);
      ctx.fillStyle = '#3a0842';
      ctx.fillRect(bottomW * 2, height * 0.75, bottomW, height * 0.25);
      ctx.fillStyle = '#131313';
      ctx.fillRect(bottomW * 3, height * 0.75, bottomW * 3, height * 0.25);
      // PLUGE pulses
      ctx.fillStyle = '#000000';
      ctx.fillRect(bottomW * 3.5, height * 0.75, bottomW * 0.4, height * 0.25);
      ctx.fillStyle = '#252525';
      ctx.fillRect(bottomW * 4.2, height * 0.75, bottomW * 0.4, height * 0.25);
    },
  },
  {
    id: 'hardware_die',
    name: 'Game Boy PPU Silicon Die',
    description: 'Semiconductor silicon trace grid and register blocks',
    draw: (ctx, width, height) => {
      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, 0, width, height);

      // Microcircuit grid
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Silicon functional units
      const blocks = [
        { x: 16, y: 16, w: 56, h: 44, color: '#00d2d3', label: 'VRAM $8000' },
        { x: 86, y: 16, w: 60, h: 44, color: '#ff9f43', label: 'BG MAP $9800' },
        { x: 16, y: 72, w: 40, h: 56, color: '#5f27cd', label: 'OAM $FE00' },
        { x: 68, y: 72, w: 78, h: 56, color: '#10ac84', label: 'PPU SCANLINE' },
      ];

      for (const b of blocks) {
        ctx.fillStyle = b.color + '22';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = b.color;
        ctx.font = '7px monospace';
        ctx.fillText(b.label, b.x + 4, b.y + 14);
      }

      // Bus connection traces
      ctx.strokeStyle = '#54a0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, 60);
      ctx.lineTo(44, 72);
      ctx.moveTo(100, 60);
      ctx.lineTo(100, 72);
      ctx.moveTo(56, 100);
      ctx.lineTo(68, 100);
      ctx.stroke();
    },
  },
];
