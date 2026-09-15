// The top status strip (docs/NES-PLAN.md section 4): portrait, 8 health pips, lives and the
// 4-segment injunction meter. hudLayout is pure; drawHud paints it onto a Phaser graphics.
import { WIDTH, SAFE } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';

export const HUD_HEIGHT = 24;

export function hudLayout({ name, hp, maxHp = 8, lives, meter, segments = 4 }) {
  const top = SAFE;
  return {
    strip: { x: 0, y: top, w: WIDTH, h: HUD_HEIGHT },
    portrait: { x: 8, y: top + 4, w: 16, h: 16 },
    name: { text: name.toUpperCase(), x: 32, y: top + 3 },
    pips: Array.from({ length: maxHp }, (_, i) => ({ x: 32 + i * 8, y: top + 14, w: 6, h: 6, full: i < hp })),
    lives: { text: `x${lives}`, x: 104, y: top + 13 },
    meterLabel: { text: 'NOTICE', x: 160, y: top + 3 },
    meter: Array.from({ length: segments }, (_, i) => ({ x: 160 + i * 20, y: top + 14, w: 18, h: 6, full: i < meter })),
  };
}

// The injunction's wax-seal ring around screen point (x, y), with the screen-wide flash first.
export function drawRing(g, shape, x, y) {
  if (shape.flash) {
    g.fillStyle(nes(0x30)).fillRect(0, 0, WIDTH, 240);
    return;
  }
  const dots = (r, n, size, colour) => {
    g.fillStyle(colour);
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n;
      g.fillRect(Math.round(x + Math.cos(a) * r) - (size >> 1), Math.round(y + Math.sin(a) * r) - (size >> 1), size, size);
    }
  };
  dots(shape.radius, 40, 4, nes(0x16));
  dots(shape.radius - 5, 32, 2, nes(shape.blink ? 0x38 : 0x28));
  dots(shape.radius * 0.45, 16, 3, nes(0x06));
}

// The boss's bar, under the strip on the right while a boss fights: his name, then one pip per point.
export function bossBarLayout({ name, hp, maxHp }) {
  const x = WIDTH - 8 - maxHp * 7;
  const y = SAFE + HUD_HEIGHT + 3;
  return {
    name: { text: name.toUpperCase(), x, y },
    pips: Array.from({ length: maxHp }, (_, i) => ({ x: x + i * 7, y: y + 10, w: 5, h: 6, full: i < hp })),
  };
}

export function drawBossBar(g, layout, drawText) {
  for (const p of layout.pips) g.fillStyle(nes(p.full ? 0x27 : 0x00)).fillRect(p.x, p.y, p.w, p.h);
  drawText(g, layout.name.text, layout.name.x, layout.name.y, nes(0x30));
}

export function drawHud(g, layout, drawText) {
  const { strip } = layout;
  g.fillStyle(nes(0x0f)).fillRect(strip.x, strip.y, strip.w, strip.h);
  for (const p of layout.pips) g.fillStyle(nes(p.full ? 0x16 : 0x00)).fillRect(p.x, p.y, p.w, p.h);
  for (const m of layout.meter) g.fillStyle(nes(m.full ? 0x28 : 0x00)).fillRect(m.x, m.y, m.w, m.h);
  for (const t of [layout.name, layout.lives, layout.meterLabel]) drawText(g, t.text, t.x, t.y, nes(0x30));
}
