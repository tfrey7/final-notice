// The top status strip (docs/NES-PLAN.md section 4): portrait, 8 health pips, lives and the
// 4-segment injunction meter; Stage 2 adds its two carried enchantments. hudLayout is pure.
import { WIDTH, SAFE } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { drawText } from './text/font.mjs';
import { HEALTH } from './stage2/player.mjs';
import { SEGMENTS, segments } from './injunction.mjs';

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
  const x = WIDTH - 8 - Math.max(maxHp * 7, name.length * 8);
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

// PAUSE in a black box in the middle of the screen, over whatever play was doing.
export function drawPause(g) {
  const x = Math.floor(WIDTH / 2) - 28;
  g.fillStyle(nes(0x30)).fillRect(x, 100, 56, 22);
  g.fillStyle(nes(0x0f)).fillRect(x + 1, 101, 54, 20);
  drawText(g, 'PAUSE', x + 8, 107, nes(0x30));
}

// Stage 2's strip: auditor, health pips, lives, meter and the two carried enchantments, the one in hand framed.
const C = { back: nes(0x0f), text: nes(0x30), pip: nes(0x16), empty: nes(0x00), frame: nes(0x28), wax: nes(0x16), gold: nes(0x38), dim: nes(0x2d), ink: nes(0x02) };

const ICONS = {
  notice: (g, x, y) => {
    g.fillStyle(C.wax).fillRect(x + 3, y + 2, 10, 12).fillRect(x + 2, y + 3, 12, 10);
    g.fillStyle(C.gold).fillRect(x + 6, y + 5, 4, 6).fillRect(x + 5, y + 6, 6, 4);
  },
  carbonCopy: (g, x, y) => {
    g.fillStyle(C.dim).fillRect(x + 2, y + 5, 8, 10);
    g.fillStyle(C.text).fillRect(x + 6, y + 1, 8, 10);
    g.fillStyle(C.dim).fillRect(x + 8, y + 4, 4, 1).fillRect(x + 8, y + 7, 4, 1);
  },
  redTape: (g, x, y) => {
    g.fillStyle(C.wax);
    for (let i = 0; i < 14; i += 2) g.fillRect(x + 1 + i, y + 7 + (i % 4 ? 2 : -1), 2, 3);
    g.fillRect(x + 6, y + 3, 3, 10);
  },
  margin: (g, x, y) => {
    g.fillStyle(C.text).fillRect(x + 3, y + 2, 10, 12);
    g.fillStyle(C.ink).fillRect(x + 6, y + 5, 4, 6).fillRect(x + 4, y + 7, 8, 2);
  },
};

export function drawStage2Hud(g, run, flow) {
  const p = run.player;
  g.fillStyle(C.back).fillRect(0, SAFE, WIDTH, 24);
  drawText(g, p.auditor.toUpperCase(), 8, SAFE + 2, C.text);
  for (let i = 0; i < HEALTH; i++) g.fillStyle(i < p.health ? C.pip : C.empty).fillRect(8 + i * 6, SAFE + 14, 4, 6);
  drawText(g, `x${flow.lives}`, 64, SAFE + 12, C.text);
  drawText(g, 'NOTICE', 96, SAFE + 2, C.text);
  for (let i = 0; i < SEGMENTS; i++) g.fillStyle(i < segments(run.meterHits) ? C.frame : C.empty).fillRect(96 + i * 16, SAFE + 14, 14, 6);
  run.carried.forEach((name, i) => {
    const x = WIDTH - 48 + i * 20;
    const y = SAFE + 4;
    g.fillStyle(i === run.hand ? C.frame : C.dim).fillRect(x - 2, y - 2, 20, 20);
    g.fillStyle(C.back).fillRect(x - 1, y - 1, 18, 18);
    if (name && ICONS[name]) ICONS[name](g, x, y);
  });
  // A boss's pips opposite the auditor's while he fights.
  const boss = run.bosses?.find((b) => !b.beaten);
  if (boss) for (let i = 0; i < boss.hp; i++) g.fillStyle(C.gold).fillRect(166 + i * 5, SAFE + 14, 4, 6);
}
