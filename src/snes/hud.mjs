// The SNES HUD on BG3, over play with no strip behind it: portrait slot, health bar, lives, the
// injunction meter, Stage 2's two enchantments and a boss bar. Each group shows and hides on its own,
// the Donkey Kong Country way: it lights when its value changes, holds, then its BG3 colours step to
// clear (never master brightness, which dims the whole screen). hudLayout, hudGroups and drainStep are pure.
import { WIDTH, HEIGHT } from './screen.mjs';
import { channels, rgb15 } from './color.mjs';
import { BG3_PALETTE, drawString, measure } from './text.mjs';

export const HOLD_MS = 2500;
export const FADE_MS = 500;
export const PALE_FRAMES = 20;
export const DRAIN_PER_FRAME = 1 / 8;
export const GROUPS = ['health', 'meter', 'enchant', 'boss'];

export const HUD_COLOURS = {
  edge: BG3_PALETTE[1],
  frame: BG3_PALETTE[2],
  text: BG3_PALETTE[3],
  ink: rgb15(26, 25, 21),
  health: rgb15(21, 6, 5),
  pale: rgb15(26, 19, 16),
  meter: rgb15(23, 18, 8),
  stamp: rgb15(19, 4, 4),
  boss: rgb15(15, 5, 16),
  empty: rgb15(4, 4, 7),
};

const clamp5 = (v) => Math.max(0, Math.min(31, v));
export const shade = (c, d) => rgb15(...channels(c).map((v) => clamp5(v + d)));

// One colour stepped toward another in sixteen steps, 15 being the source itself.
export function blend15(dst, src, step) {
  const a = channels(dst);
  const b = channels(src);
  return rgb15(...a.map((v, i) => v + Math.round(((b[i] - v) * step) / 15)));
}

// A fill into a 15-bit buffer that honours a fade step, for scenes that compose their own frame.
export const fadeFill = (buf) => (x, y, w, h, c, step = 15) => {
  if (step <= 0) return;
  for (let yy = Math.max(0, y); yy < Math.min(HEIGHT, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) {
      const i = yy * WIDTH + xx;
      buf[i] = step >= 15 ? c : blend15(buf[i], c, step);
    }
  }
};

export function hudLayout({ name, hp, maxHp = 8, pale = hp, lives, meter, segments = 4, carried = null, hand = 0, boss = null }) {
  const px = (w, value, max) => Math.round(((w - 2) * Math.max(0, Math.min(value, max))) / max);
  const bar = (x, y, w, h, value, max) => ({ x, y, w, h, fill: px(w, value, max) });
  const health = bar(36, 20, 66, 8, hp, maxHp);
  const layout = {
    portrait: { x: 8, y: 8, w: 24, h: 24 },
    name: { text: name.toUpperCase(), x: 36, y: 8 },
    health: { ...health, pale: Math.max(health.fill, px(66, pale, maxHp)) },
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

// A group's palette step 0-15, given how long since it last lit.
export function fadeStep(idleMs, hold = HOLD_MS, fade = FADE_MS) {
  if (idleMs <= hold) return 15;
  return Math.max(0, 15 - Math.ceil(((idleMs - hold) * 15) / fade));
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const LIGHTS = {
  health: (was, now) => was.hp !== now.hp || was.lives !== now.lives,
  meter: (was, now) => (now.meter ?? 0) > (was.meter ?? 0),
  enchant: (was, now) => !same([was.carried, was.hand], [now.carried, now.hand]),
  boss: () => false,
};

// Which groups are lit: every group shows at the start, then each on its own trigger; the boss
// group stays lit while a boss is up. see() answers each group's step; `all` holds every group up.
export function hudGroups() {
  let was = null;
  const since = {};
  return {
    see(state, ms, all = false) {
      for (const g of GROUPS) if (!was || LIGHTS[g](was, state)) since[g] = ms;
      if (state.boss) since.boss = ms;
      was = state;
      return Object.fromEntries(GROUPS.map((g) => [g, all ? 15 : fadeStep(ms - since[g])]));
    },
  };
}

// One frame of the health bar's loss: a hit leaves the old value pale for PALE_FRAMES, then it drains.
export function drainStep(d, hp) {
  if (!d || hp > d.pale) return { hp, pale: hp, hold: 0 };
  if (hp < d.hp) return { hp, pale: Math.max(d.pale, d.hp), hold: PALE_FRAMES };
  if (d.hold > 0) return { hp, pale: d.pale, hold: d.hold - 1 };
  return { hp, pale: Math.max(hp, d.pale - DRAIN_PER_FRAME), hold: 0 };
}

// A bar with a highlight row, a mid and a shadow over a see-through track.
const drawBar = (fill, b, colour) => {
  fill(b.x, b.y, b.w, b.h, HUD_COLOURS.edge);
  fill(b.x + 1, b.y + 1, b.w - 2, b.h - 2, HUD_COLOURS.empty, 'track');
  if (b.pale > b.fill) {
    fill(b.x + 1 + b.fill, b.y + 1, b.pale - b.fill, b.h - 2, HUD_COLOURS.pale);
    fill(b.x + 1 + b.fill, b.y + b.h - 2, b.pale - b.fill, 1, shade(HUD_COLOURS.pale, -6));
  }
  if (!b.fill) return;
  fill(b.x + 1, b.y + 1, b.fill, b.h - 2, colour);
  fill(b.x + 1, b.y + 1, b.fill, 1, shade(colour, 4));
  fill(b.x + 1, b.y + b.h - 2, b.fill, 1, shade(colour, -4));
  for (let t = b.x + 8; t < b.x + 1 + b.fill; t += 8) fill(t, b.y + 2, 1, b.h - 3, shade(colour, -3));
};

// A Notice segment: a bevelled gold box, a red bar stamped into it once it fills.
const drawStampBox = (fill, m) => {
  fill(m.x, m.y, m.w, m.h, HUD_COLOURS.edge);
  if (!m.full) {
    fill(m.x + 1, m.y + 1, m.w - 2, m.h - 2, shade(HUD_COLOURS.meter, -12));
    fill(m.x + 2, m.y + 2, m.w - 4, m.h - 4, HUD_COLOURS.empty, 'track');
    return;
  }
  fill(m.x + 1, m.y + 1, m.w - 2, m.h - 2, HUD_COLOURS.meter);
  fill(m.x + 1, m.y + 1, m.w - 2, 1, shade(HUD_COLOURS.meter, 3));
  fill(m.x + 1, m.y + m.h - 2, m.w - 2, 1, shade(HUD_COLOURS.meter, -5));
  fill(m.x + 3, m.y + 3, m.w - 6, 2, HUD_COLOURS.stamp);
  fill(m.x + 3, m.y + 5, m.w - 6, 1, shade(HUD_COLOURS.stamp, -4));
};

const drawSlot = (fill, s, colour) => {
  fill(s.x, s.y, s.w, s.h, HUD_COLOURS.edge);
  fill(s.x + 1, s.y + 1, s.w - 2, s.h - 2, colour);
  fill(s.x + 1, s.y + 1, s.w - 2, 1, shade(colour, 6));
  fill(s.x + 2, s.y + 2, s.w - 4, s.h - 4, HUD_COLOURS.empty);
};

// The bars, frames and words, each group at its own fade step (fill's sixth argument, 0-15; a
// track takes half, see-through); the portrait and icon art go inside the slots on top (artOr).
export function drawHud(fill, layout, steps = {}) {
  const group = (g) => {
    const step = steps[g] ?? 15;
    return (x, y, w, h, c, part) => {
      const s = part === 'track' ? step >> 1 : step;
      if (s > 0) fill(x, y, w, h, c, s);
    };
  };
  const health = group('health');
  const meter = group('meter');
  drawSlot(health, layout.portrait, HUD_COLOURS.frame);
  drawString(health, layout.name.text, layout.name.x, layout.name.y, HUD_COLOURS.ink);
  drawString(health, layout.lives.text, layout.lives.x, layout.lives.y, HUD_COLOURS.ink);
  drawBar(health, layout.health, HUD_COLOURS.health);
  drawString(meter, layout.meterLabel.text, layout.meterLabel.x, layout.meterLabel.y, HUD_COLOURS.meter);
  for (const m of layout.meter) drawStampBox(meter, m);
  const enchant = group('enchant');
  for (const e of layout.enchant ?? []) drawSlot(enchant, e, e.held ? HUD_COLOURS.meter : HUD_COLOURS.empty);
  if (layout.boss) {
    const boss = group('boss');
    drawString(boss, layout.boss.name.text, layout.boss.name.x, layout.boss.name.y);
    drawBar(boss, layout.boss.bar, HUD_COLOURS.boss);
  }
}
