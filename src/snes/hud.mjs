// The SNES HUD on BG3, over play with no strip behind it, laid out as Streets of Rage 2's: a small face
// icon with the lives beside it, the name (and a score, where one is kept) over a chunky health bar,
// a thin Notice meter under that; Stage 2's two enchantments and a boss bar sit to the right. It is
// always on screen, as in Final Fight: nothing fades or hides it. hudLayout and drainStep are pure.
import { WIDTH, HEIGHT } from './screen.mjs';
import { channels, rgb15 } from './color.mjs';
import { BG3_PALETTE, drawString, measure } from './text.mjs';
import { FACES } from './hudfaces.mjs';

export const PALE_FRAMES = 20;
export const DRAIN_PER_FRAME = 1 / 8;

export const HUD_COLOURS = {
  edge: BG3_PALETTE[1],
  outline: rgb15(1, 1, 3),
  iconBack: rgb15(10, 14, 24),
  name: rgb15(20, 28, 31),
  score: rgb15(31, 27, 4),
  lives: rgb15(31, 31, 30),
  health: rgb15(31, 27, 4),
  healthLit: rgb15(31, 31, 20),
  healthShadow: rgb15(24, 16, 2),
  pale: rgb15(27, 4, 3),
  paleShadow: rgb15(18, 2, 2),
  track: rgb15(6, 3, 8),
  meter: rgb15(8, 20, 31),
  boss: rgb15(15, 5, 16),
  bossLate: rgb15(11, 2, 6),
  bossLabel: rgb15(29, 22, 30),
  empty: rgb15(4, 4, 7),
  paper: rgb15(27, 25, 19),
  carbon: rgb15(8, 12, 27),
  receiptInk: rgb15(6, 5, 4),
  receiptRed: rgb15(25, 3, 3),
};

// The pickup receipt: slides in top right, holds, slides out; its carbon copy trails a step behind.
export const RECEIPT_MS = 2500;
export const SLIDE_MS = 200;
export const CARBON_LAG_MS = 50;
export const RECEIPT = { w: 58, h: 20, carbon: 3 };

// How far in the receipt is, 0 off screen to 1 fully in, `ms` after the pickup.
export function receiptSlide(ms) {
  if (ms == null || ms < 0 || ms >= RECEIPT_MS) return 0;
  return Math.min(1, ms / SLIDE_MS, (RECEIPT_MS - ms) / SLIDE_MS);
}

export const postReceipt = (receipt, ms) => ({ count: (receipt?.count ?? 0) + 1, ms });

function receiptLayout({ count, ms }, now, y) {
  const off = RECEIPT.w + 8 + RECEIPT.carbon;
  const at = (s) => WIDTH - 8 - RECEIPT.w + Math.round((1 - s) * off);
  const tab = receiptSlide(now - ms);
  const copy = receiptSlide(now - ms - CARBON_LAG_MS);
  if (!tab && !copy) return null;
  return {
    x: at(tab), y, w: RECEIPT.w, h: RECEIPT.h, count,
    carbon: { x: at(copy) + RECEIPT.carbon, y: y + RECEIPT.carbon, w: RECEIPT.w, h: RECEIPT.h },
  };
}

// Final Fight's colour-change trick: the boss bar darkens to a second colour once half is gone.
export const bossColour = (hp, maxHp) => (hp * 2 <= maxHp ? HUD_COLOURS.bossLate : HUD_COLOURS.boss);

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

// Bars are outlined boxes: `fill` is the lit width inside the one-pixel outline.
export function hudLayout({ name, hp, maxHp = 8, pale = hp, lives, meter, segments = 4, score = null, carried = null, hand = 0, boss = null, receipt = null, now = 0 }) {
  const px = (w, value, max) => Math.round(((w - 2) * Math.max(0, Math.min(value, max))) / max);
  const bar = (x, y, w, h, value, max) => ({ x, y, w, h, fill: px(w, value, max) });
  const health = bar(47, 14, 72, 9, hp, maxHp);
  const scored = score == null ? null : String(score);
  const layout = {
    icon: { x: 11, y: 7, w: 14, h: 14, face: FACES[name.toLowerCase()] ?? null },
    lives: { text: `x${lives}`, x: 28, y: 10 },
    name: { text: name.toUpperCase(), x: 48, y: 4 },
    score: scored && { text: scored, x: health.x + health.w - 1 - measure(scored), y: 4 },
    health: { ...health, pale: Math.max(health.fill, px(health.w, pale, maxHp)) },
    meter: bar(47, 25, 72, 4, meter, segments),
    enchant: null,
    boss: null,
    receipt: receipt && receiptLayout(receipt, now, carried ? 58 : 8),
  };
  if (carried) {
    layout.enchant = carried.slice(0, 2).map((icon, i) => ({ icon, x: WIDTH - 52 + i * 22, y: 8, w: 20, h: 20, held: i === hand }));
  }
  if (boss) {
    const w = 96;
    const x = WIDTH - 8 - w;
    const label = `OVERDUE: ${boss.name.toUpperCase()}`;
    layout.boss = {
      name: { text: label, x: WIDTH - 8 - measure(label), y: 36 },
      bar: { ...bar(x, 46, w, 6, boss.hp, boss.maxHp), colour: bossColour(boss.hp, boss.maxHp) },
    };
  }
  return layout;
}

// Every box the layout draws, for bounds and overlap checks.
export function hudBoxes(layout) {
  const text = (t) => ({ x: t.x, y: t.y, w: measure(t.text) + 1, h: 9 });
  const boxes = [layout.icon, text(layout.lives), text(layout.name), layout.health, layout.meter];
  if (layout.score) boxes.push(text(layout.score));
  if (layout.enchant) boxes.push(...layout.enchant);
  if (layout.boss) boxes.push(text(layout.boss.name), layout.boss.bar);
  if (layout.receipt) boxes.push({ ...layout.receipt, w: RECEIPT.w + RECEIPT.carbon, h: RECEIPT.h + RECEIPT.carbon });
  return boxes;
}

export const inScreen = (b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= WIDTH && b.y + b.h <= HEIGHT;
export const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// One frame of the health bar's loss: a hit leaves the old value pale for PALE_FRAMES, then it drains.
export function drainStep(d, hp) {
  if (!d || hp > d.pale) return { hp, pale: hp, hold: 0 };
  if (hp < d.hp) return { hp, pale: Math.max(d.pale, d.hp), hold: PALE_FRAMES };
  if (d.hold > 0) return { hp, pale: d.pale, hold: d.hold - 1 };
  return { hp, pale: Math.max(hp, d.pale - DRAIN_PER_FRAME), hold: 0 };
}

// A black-outlined bar over a dark track, the slice just lost in red; bars taller than two pixels
// inside get a highlight row and a shadow row.
function drawBar(fill, b, colour, lit = shade(colour, 4), dark = shade(colour, -4)) {
  const inner = b.h - 2;
  fill(b.x, b.y, b.w, b.h, HUD_COLOURS.outline);
  fill(b.x + 1, b.y + 1, b.w - 2, inner, HUD_COLOURS.track);
  if (b.pale > b.fill) {
    fill(b.x + 1 + b.fill, b.y + 1, b.pale - b.fill, inner, HUD_COLOURS.pale);
    if (inner > 2) fill(b.x + 1 + b.fill, b.y + b.h - 2, b.pale - b.fill, 1, HUD_COLOURS.paleShadow);
  }
  if (!b.fill) return;
  fill(b.x + 1, b.y + 1, b.fill, inner, colour);
  if (inner <= 2) return;
  fill(b.x + 1, b.y + 1, b.fill, 1, lit);
  fill(b.x + 1, b.y + b.h - 2, b.fill, 1, dark);
}

function drawIcon(fill, icon) {
  fill(icon.x, icon.y, icon.w, icon.h, HUD_COLOURS.outline);
  fill(icon.x + 1, icon.y + 1, icon.w - 2, icon.h - 2, HUD_COLOURS.iconBack);
  icon.face?.forEach((row, y) => row.forEach((c, x) => c != null && fill(icon.x + 1 + x, icon.y + 1 + y, 1, 1, c)));
}

const drawSlot = (fill, s, colour) => {
  fill(s.x, s.y, s.w, s.h, HUD_COLOURS.outline);
  fill(s.x + 1, s.y + 1, s.w - 2, s.h - 2, colour);
  fill(s.x + 2, s.y + 2, s.w - 4, s.h - 4, HUD_COLOURS.empty);
};

// The icon, bars and words, each group at its own step (fill's sixth argument, 0-15; a track takes
// half, see-through); the enchantment icons go inside their slots on top (artOr).
export function drawHud(fill, layout, steps = {}) {
  const group = (g) => {
    const step = steps[g] ?? 15;
    return (x, y, w, h, c, part) => {
      const s = part === 'track' ? step >> 1 : step;
      if (s > 0) fill(x, y, w, h, c, s);
    };
  };
  const health = group('health');
  const words = (t, c) => drawString(health, t.text, t.x, t.y, c, HUD_COLOURS.outline);
  drawIcon(health, layout.icon);
  words(layout.lives, HUD_COLOURS.lives);
  words(layout.name, HUD_COLOURS.name);
  if (layout.score) words(layout.score, HUD_COLOURS.score);
  drawBar(health, layout.health, HUD_COLOURS.health, HUD_COLOURS.healthLit, HUD_COLOURS.healthShadow);
  drawBar(group('meter'), layout.meter, HUD_COLOURS.meter);
  const enchant = group('enchant');
  for (const e of layout.enchant ?? []) drawSlot(enchant, e, e.held ? HUD_COLOURS.score : HUD_COLOURS.outline);
  if (layout.boss) {
    const boss = group('boss');
    const { name, bar } = layout.boss;
    const lettering = (x, y, w, h, c, part) =>
      boss(x, y, w, h, c === HUD_COLOURS.bossLabel ? blend15(HUD_COLOURS.bossLabel, bar.colour, Math.min(15, (y - name.y) * 2)) : c, part);
    drawString(lettering, name.text, name.x, name.y, HUD_COLOURS.bossLabel, HUD_COLOURS.outline);
    drawBar(boss, bar, bar.colour);
  }
  if (layout.receipt) drawReceipt(group('receipt'), layout.receipt);
}

// The receipt: a see-through carbon copy behind, a drop shadow, then grained paper, a bevel, RCPT and the count in red.
function drawReceipt(fill, r) {
  const { paper } = HUD_COLOURS;
  const c = r.carbon;
  fill(c.x, c.y, c.w, c.h, HUD_COLOURS.carbon, 'track');
  fill(c.x + 2, c.y + c.h - 4, c.w - 4, 1, shade(HUD_COLOURS.carbon, 6), 'track');
  fill(r.x + 2, r.y + r.h, r.w, 1, HUD_COLOURS.edge, 'track');
  fill(r.x + r.w, r.y + 2, 1, r.h - 1, HUD_COLOURS.edge, 'track');
  fill(r.x, r.y, r.w, r.h, shade(paper, -14));
  fill(r.x + 1, r.y + 1, r.w - 2, r.h - 2, paper);
  fill(r.x + 1, r.y + 1, r.w - 2, 1, shade(paper, 4));
  fill(r.x + 1, r.y + 1, 1, r.h - 2, shade(paper, 2));
  fill(r.x + 1, r.y + r.h - 2, r.w - 2, 1, shade(paper, -6));
  fill(r.x + r.w - 2, r.y + 1, 1, r.h - 2, shade(paper, -4));
  for (let y = r.y + 3; y < r.y + r.h - 3; y += 2) {
    for (let x = r.x + 3 + ((y * 3) % 4); x < r.x + r.w - 3; x += 4) fill(x, y, 1, 1, shade(paper, -3));
  }
  const count = String(r.count);
  drawString(fill, 'RCPT', r.x + 4, r.y + 6, HUD_COLOURS.receiptInk, shade(paper, -7));
  drawString(fill, count, r.x + r.w - 5 - measure(count), r.y + 6, HUD_COLOURS.receiptRed, shade(paper, -9));
}
