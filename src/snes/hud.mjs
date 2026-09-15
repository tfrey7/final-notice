// The SNES HUD on BG3, over play with no strip behind it: portrait slot, health bar, lives, the
// injunction meter, Stage 2's two enchantments and a boss bar. hudLayout and hudBrightness are pure;
// the HUD is up while anything on it changes and fades out once play has been idle (hide until needed).
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15 } from './color.mjs';
import { BG3_PALETTE, drawString, measure } from './text.mjs';

export const HOLD_MS = 2500;
export const FADE_MS = 500;

export const HUD_COLOURS = {
  edge: BG3_PALETTE[1],
  frame: BG3_PALETTE[2],
  text: BG3_PALETTE[3],
  health: rgb15(28, 6, 4),
  meter: rgb15(30, 24, 6),
  boss: rgb15(20, 4, 22),
  empty: rgb15(4, 4, 8),
};

export function hudLayout({ name, hp, maxHp = 8, lives, meter, segments = 4, carried = null, hand = 0, boss = null }) {
  const bar = (x, y, w, h, value, max) => ({ x, y, w, h, fill: Math.round(((w - 2) * Math.max(0, Math.min(value, max))) / max) });
  const layout = {
    portrait: { x: 8, y: 8, w: 24, h: 24 },
    name: { text: name.toUpperCase(), x: 36, y: 8 },
    health: bar(36, 20, 66, 8, hp, maxHp),
    lives: { text: `x${lives}`, x: 106, y: 20 },
    meterLabel: { text: 'NOTICE', x: 128, y: 8 },
    meter: Array.from({ length: segments }, (_, i) => ({ x: 128 + i * 14, y: 20, w: 12, h: 8, full: i < meter })),
    enchant: null,
    boss: null,
  };
  if (carried) {
    layout.enchant = carried.slice(0, 2).map((icon, i) => ({ icon, x: WIDTH - 52 + i * 22, y: 8, w: 20, h: 20, held: i === hand }));
  }
  if (boss) {
    const w = 96;
    const x = WIDTH - 8 - w;
    const label = boss.name.toUpperCase();
    layout.boss = { name: { text: label, x: WIDTH - 8 - measure(label), y: 36 }, bar: bar(x, 46, w, 6, boss.hp, boss.maxHp) };
  }
  return layout;
}

// Every box the layout draws, for bounds and overlap checks.
export function hudBoxes(layout) {
  const text = (t) => ({ x: t.x, y: t.y, w: measure(t.text) + 1, h: 9 });
  const boxes = [layout.portrait, text(layout.name), layout.health, text(layout.lives), text(layout.meterLabel), ...layout.meter];
  if (layout.enchant) boxes.push(...layout.enchant);
  if (layout.boss) boxes.push(text(layout.boss.name), layout.boss.bar);
  return boxes;
}

export const inScreen = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= WIDTH && b.y + b.h <= HEIGHT;
export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Master brightness 0-15 for the HUD, given how long since anything on it last changed.
export function hudBrightness(idleMs, hold = HOLD_MS, fade = FADE_MS) {
  if (idleMs <= hold) return 15;
  return Math.max(0, 15 - Math.ceil(((idleMs - hold) * 15) / fade));
}

// Tracks the HUD's state and when it last changed; idle(ms) answers the time since.
export function hudWatch() {
  let last = null;
  let since = 0;
  return {
    see(state, ms) {
      const key = JSON.stringify(state);
      if (key !== last) { last = key; since = ms; }
      return ms - since;
    },
  };
}

const drawBar = (fill, b, colour) => {
  fill(b.x, b.y, b.w, b.h, HUD_COLOURS.edge);
  fill(b.x + 1, b.y + 1, b.w - 2, b.h - 2, HUD_COLOURS.empty);
  if (b.fill) fill(b.x + 1, b.y + 1, b.fill, b.h - 2, colour);
  fill(b.x + 1, b.y + 1, b.fill, 1, HUD_COLOURS.text);
};

const drawSlot = (fill, s, colour) => {
  fill(s.x, s.y, s.w, s.h, HUD_COLOURS.edge);
  fill(s.x + 1, s.y + 1, s.w - 2, s.h - 2, colour);
  fill(s.x + 2, s.y + 2, s.w - 4, s.h - 4, HUD_COLOURS.empty);
};

// The bars, frames and words; the portrait and icon art go inside the slots on top (artOr).
export function drawHud(fill, layout) {
  drawSlot(fill, layout.portrait, HUD_COLOURS.frame);
  for (const t of [layout.name, layout.lives, layout.meterLabel]) drawString(fill, t.text, t.x, t.y);
  drawBar(fill, layout.health, HUD_COLOURS.health);
  for (const m of layout.meter) drawBar(fill, { ...m, fill: m.full ? m.w - 2 : 0 }, HUD_COLOURS.meter);
  for (const e of layout.enchant ?? []) drawSlot(fill, e, e.held ? HUD_COLOURS.meter : HUD_COLOURS.empty);
  if (layout.boss) {
    drawString(fill, layout.boss.name.text, layout.boss.name.x, layout.boss.name.y);
    drawBar(fill, layout.boss.bar, HUD_COLOURS.boss);
  }
}
