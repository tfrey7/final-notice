// The SNES cinema's acting, without Phaser: a scene's pages with src/story/staging.mjs laid over them,
// the stand-in play sprites on their keyframes, the bill sliding across the desk and the lamp's
// stepped colour-math glow.
import { WIDTH } from './screen.mjs';
import { rgb15 } from './color.mjs';
import { MAX_MOSAIC, brightness, screen, mathPass } from './fx.mjs';
import { drawString } from './text.mjs';
import { drawHud, hudLayout } from './hud.mjs';
import { bufferFill } from './scenes/front.mjs';
import { PICTURE, SPIN_FRAMES } from './cinema.mjs';
import { STAGING } from '../story/staging.mjs';

export const BILL_FRAMES = 8;
export const MOSAIC_OUT_FRAMES = 20;
// The scene cue's warm pads (v4 and v5): what 'pad' leaves playing.
export const PAD_VOICES = [3, 4];

// The scene's pages as staged: the wordless acting page first, then each spoken page carrying its
// beat's music and fx on the first page of that beat.
export function stagePages(sceneId, pages, auditor) {
  const plan = STAGING[sceneId];
  if (!plan) return pages;
  const cast = (actors) => actors?.map((a) => ({ ...a, who: a.who === 'auditor' ? auditor : a.who }));
  const out = [];
  pages.forEach((page, i) => {
    const beat = plan.beats[page.beat] ?? {};
    const staged = { ...page, cut: beat.cut ?? !!plan.cuts, actors: cast(beat.actors) ?? null };
    if ('portrait' in beat) staged.portrait = beat.portrait;
    if (beat.still && (!beat.stillFor || beat.stillFor === auditor)) staged.still = beat.still;
    if (beat.backdrop) staged.backdrop = beat.backdrop;
    if ('sound' in beat) staged.sound = beat.sound;
    if (beat.keepFx) staged.fx = beat.fx;
    if (page.part === 0) Object.assign(staged, { music: beat.music ?? null, fx: beat.fx ?? null });
    out.push(staged);
    if (beat.spin && pages[i + 1]?.beat !== page.beat) {
      const { silence } = beat.spin;
      out.push({ acting: true, cut: true, backdrop: HOME[sceneId], portrait: null, speaker: null, lines: [], frames: silence + SPIN_FRAMES + 8, spinAt: silence, actors: null, sound: null, music: null, fx: null });
    }
  });
  const last = out.at(-1);
  if (last && plan.fadeAfter != null) last.fadeAfter = plan.fadeAfter;
  if (last && plan.mosaicOut) last.mosaicOut = true;
  if (last && plan.endCut) last.endCut = true;
  if (!plan.acting) return out;
  const { backdrop, frames, actors, music = null, hud = null, sound = null, fx = null } = plan.acting;
  return [{ acting: true, fromPlay: !!plan.fromPlay, hud, backdrop, portrait: null, speaker: null, lines: [], frames, actors: cast(actors), music, sound, fx }, ...out];
}

const HOME = { assignment: 'bellwether-office', incident: 'vellum-desk', documents: 'break-room' };

// Leaving by mosaic: the blocks grow from 1 to 16 px, then the next screen takes over.
export function mosaicOutStep(frame) {
  const f = Math.max(0, frame);
  return { mosaic: Math.min(MAX_MOSAIC, 1 + Math.floor((f * (MAX_MOSAIC - 1)) / MOSAIC_OUT_FRAMES)), done: f >= MOSAIC_OUT_FRAMES };
}

// The HUD's master brightness on frame t of an acting page that fades it out over `frames`.
export const hudLevel = (t, frames) => Math.max(0, Math.min(15, 15 - Math.ceil((Math.max(0, t) * 15) / frames)));

// Where an actor stands on frame t: x and feet eased linearly between keys, the pose of the key last passed.
export function actorAt(keys, t) {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  const [f0, x0, y0, pose] = keys[i];
  const nextKey = keys[i + 1];
  if (!nextKey) return { x: x0, feet: y0, pose };
  const p = Math.max(0, Math.min(1, (t - f0) / (nextKey[0] - f0)));
  return { x: Math.round(x0 + (nextKey[1] - x0) * p), feet: Math.round(y0 + (nextKey[2] - y0) * p), pose };
}

// The bill slides from the far edge of the desk toward the camera, growing as it comes.
export function billStep(frame) {
  const p = Math.min(1, Math.max(0, frame) / BILL_FRAMES);
  const e = 1 - (1 - p) ** 2;
  const lerp = (a, b) => Math.round(a + (b - a) * e);
  return { x: lerp(150, 70), y: lerp(100, 100), w: lerp(40, 120), h: lerp(7, 20), done: p >= 1 };
}

const COLOURS = {
  bellwether: { skin: rgb15(24, 18, 14), hair: rgb15(24, 24, 25), suit: rgb15(6, 8, 14), tie: rgb15(21, 4, 4) },
  ward: { skin: rgb15(20, 14, 10), hair: rgb15(8, 5, 3), suit: rgb15(10, 10, 9), tie: rgb15(6, 10, 20) },
  mercer: { skin: rgb15(26, 19, 15), hair: rgb15(19, 8, 3), suit: rgb15(14, 6, 6), tie: rgb15(28, 24, 19) },
  vellum: { skin: rgb15(23, 23, 25), hair: rgb15(2, 2, 3), suit: rgb15(3, 3, 5), tie: rgb15(23, 2, 4) },
};
const OUTLINE = rgb15(3, 2, 4);
const SHIRT = rgb15(27, 27, 26);

const CHAIR = rgb15(9, 6, 5);
const BOOK = { cover: rgb15(6, 10, 7), edge: rgb15(26, 24, 18) };

function paintLedger(fill, x, y) {
  fill(x - 1, y - 1, 26, 10, OUTLINE);
  fill(x, y, 24, 8, BOOK.cover);
  fill(x, y + 6, 24, 2, BOOK.edge);
}

// A stand-in play sprite, 60 px tall, feet at `feet`: the back of the head and no tie when turned away.
// 'sit' is the same auditor on a chair, a third shorter; 'hold' stands with the ledger at the chest.
export function paintActor(fill, who, x, feet, pose = 'front', h = 60) {
  if (pose === 'sit') {
    fill(x - 12, feet - 22, 26, 4, CHAIR);
    fill(x - 12, feet - 18, 3, 18, CHAIR);
    fill(x + 11, feet - 18, 3, 18, CHAIR);
    return paintActor(fill, who, x, feet - 4, 'front', h - 20);
  }
  if (pose === 'hold') {
    paintActor(fill, who, x, feet, 'front', h);
    return paintLedger(fill, x - 8, feet - h + 18);
  }
  const { skin, hair, suit, tie } = COLOURS[who] ?? COLOURS.ward;
  const back = pose === 'back';
  if (pose === 'slump') h -= 10;
  const head = Math.round(h * 0.17);
  const body = Math.round(h * 0.4);
  const legs = h - head - body;
  const w = Math.round(h * 0.34);
  const top = feet - h;
  fill(x - (w >> 1) - 1, top + head - 1, w + 2, body + legs + 2, OUTLINE);
  fill(x - (w >> 1), top + head, w, body, suit);
  fill(x - (w >> 1) + 2, top + head + body, (w >> 1) - 3, legs, suit);
  fill(x + 1, top + head + body, (w >> 1) - 3, legs, suit);
  if (!back) {
    fill(x - 2, top + head, 4, body >> 2, SHIRT);
    fill(x - 1, top + head + 1, 2, body >> 2, tie);
  }
  const hx = pose === 'slump' ? x + 3 : x;
  const hy = pose === 'slump' ? top + 3 : top;
  fill(hx - (head >> 2) - 3, hy - 1, (head >> 1) + 6, head + 2, OUTLINE);
  fill(hx - (head >> 2) - 2, hy, (head >> 1) + 4, head, back ? hair : skin);
  fill(hx - (head >> 2) - 2, hy, (head >> 1) + 4, 3, hair);
  if (pose === 'tie') fill(x - 1, top + head + 2, 4, 3, skin);
}

// The play HUD as the fight left it, drawn at master brightness `level` over the picture.
export function hudPass(buf, name, level) {
  if (level <= 0) return buf;
  const hud = screen(0);
  drawHud(bufferFill(hud), hudLayout({ name, hp: 8, lives: 3, meter: 2 }));
  for (let i = 0; i < hud.length; i++) if (hud[i]) buf[i] = brightness(hud[i], level);
  return buf;
}

// The ledger far below, glowing up through the floor grille: stepped warm bands added in a window.
const LEDGER = { cx: 128, cy: 75, x0: 88, x1: 168 };
let ledgerSub = null;
export function ledgerGlow() {
  if (ledgerSub) return ledgerSub;
  ledgerSub = screen(0);
  const fill = bufferFill(ledgerSub);
  [[40, 32, rgb15(3, 3, 1)], [30, 24, rgb15(5, 5, 1)], [20, 16, rgb15(8, 7, 2)]].forEach(([rx, ry, c]) => fill(LEDGER.cx - rx, LEDGER.cy - ry, 2 * rx, 2 * ry, c));
  return ledgerSub;
}
const inGrille = (x, y) => x >= LEDGER.x0 && x < LEDGER.x1 && y < PICTURE.h;

// The desk lamp's pool: three stepped bands of warm light added to the room, masked to the lamp's side.
const LAMP = { cx: 216, cy: 96, x0: 164 };
let lampSub = null;
export function lampGlow() {
  if (lampSub) return lampSub;
  lampSub = screen(0);
  const fill = bufferFill(lampSub);
  [[48, rgb15(2, 1, 0)], [32, rgb15(4, 3, 1)], [18, rgb15(6, 4, 1)]].forEach(([r, c]) => {
    for (let y = LAMP.cy - r; y < LAMP.cy + r; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, r * r - (y - LAMP.cy) ** 2)));
      fill(LAMP.cx - half, y, 2 * half, 1, c);
    }
  });
  return lampSub;
}
const inLamp = (x, y) => x >= LAMP.x0 && y < PICTURE.h;

// The ledger page as one tall BG1 strip: YEARS at the top, a column of approved transfers, ACCOUNT
// ZERO and the seal at the foot. It scrolls up a pixel a frame until the seal is in the picture.
export const LEDGER_SCROLL = 120;
export const ledgerOffset = (t) => Math.min(LEDGER_SCROLL, Math.max(0, Math.floor(t)));
const STRIP_H = PICTURE.h + LEDGER_SCROLL;
let ledgerStrip = null;
export function ledgerPage() {
  if (ledgerStrip) return ledgerStrip;
  ledgerStrip = new Uint16Array(WIDTH * STRIP_H);
  const fill = (x, y, w, h, c) => {
    for (let yy = Math.max(0, y); yy < Math.min(STRIP_H, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(WIDTH, x + w); xx++) ledgerStrip[yy * WIDTH + xx] = c;
    }
  };
  const ink = rgb15(4, 4, 8);
  const red = rgb15(27, 4, 5);
  for (let y = 0; y < STRIP_H; y++) fill(0, y, WIDTH, 1, rgb15(29 - Math.round((5 * y) / STRIP_H), 27 - Math.round((5 * y) / STRIP_H), 21 - Math.round((5 * y) / STRIP_H)));
  for (let y = 22; y < STRIP_H; y += 14) fill(0, y, WIDTH, 1, rgb15(18, 22, 28));
  fill(36, 0, 1, STRIP_H, rgb15(26, 10, 10));
  drawString(fill, 'YEARS', 44, 8, ink, null);
  drawString(fill, 'TRANSFER', 150, 8, ink, null);
  ['1647', '1712', '1788', '1851', '1903', '1929', '1966', '1987'].forEach((year, i) => {
    const y = 26 + i * 14;
    drawString(fill, year, 44, y, ink, null);
    for (let x = 84; x < 140 + ((i * 17) % 30); x += 7) fill(x, y + 3, 5 - ((x + i) % 3), 2, ink);
    drawString(fill, 'APPROVED', 170, y, red, null);
  });
  fill(40, 222, 200, 1, ink);
  drawString(fill, 'ACCOUNT ZERO', 44, 230, ink, null);
  for (let dy = -14; dy <= 14; dy++) {
    const half = Math.floor(Math.sqrt(196 - dy * dy));
    fill(206 - half, 238 + dy, 2 * half, 1, dy * dy + half * half > 120 ? red : rgb15(22, 3, 4));
  }
  drawString(fill, 'B', 203, 234, rgb15(31, 24, 20), null);
  return ledgerStrip;
}

// The wall speaker talks with the room dimmed: a fixed colour subtracted over the picture, not the box.
const DIM = rgb15(7, 7, 6);
let dimSub = null;
const inPicture = (x, y) => y < PICTURE.h;

const TABLE = { x: 84, y: 116, w: 96 };

// One frame of a staged page over its painted picture: the actors on page clock t, then its fx.
export function stageFrame(buf, staged, t) {
  const page = staged.still ? { ...staged, fx: null } : staged;
  const fill = bufferFill(buf);
  if (page.fx === 'ledgerScroll') {
    const src = ledgerPage();
    const off = ledgerOffset(t);
    for (let y = 0; y < PICTURE.h; y++) buf.set(src.subarray((y + off) * WIDTH, (y + off + 1) * WIDTH), y * WIDTH);
  }
  const poses = (page.actors ?? []).map((actor) => ({ who: actor.who, ...actorAt(actor.keys, t) }));
  if (page.fx === 'table') {
    fill(TABLE.x, TABLE.y, TABLE.w, 6, rgb15(17, 15, 12));
    fill(TABLE.x, TABLE.y + 6, TABLE.w, 2, rgb15(8, 7, 6));
    fill(TABLE.x + 6, TABLE.y + 8, 3, 20, rgb15(8, 7, 6));
    fill(TABLE.x + TABLE.w - 9, TABLE.y + 8, 3, 20, rgb15(8, 7, 6));
    if (!poses.some((p) => p.pose === 'hold')) paintLedger(fill, TABLE.x + 10, TABLE.y - 8);
  }
  for (const { who, x, feet, pose } of poses) paintActor(fill, who, x, feet, pose);
  if (page.fx === 'bill') {
    const b = billStep(t);
    fill(b.x, b.y, b.w, b.h, rgb15(28, 28, 23));
    fill(b.x, b.y, b.w, Math.min(3, b.h), rgb15(18, 26, 18));
    if (b.done) drawString(fill, 'LIFETIMES: 47', b.x + 20, b.y + 8, rgb15(3, 3, 6), null);
  }
  if (page.fx === 'lamp') mathPass(buf, lampGlow(), { op: 'add', where: inLamp }, buf);
  if (page.fx === 'ledger') mathPass(buf, ledgerGlow(), { op: 'add', where: inGrille }, buf);
  if (page.hud) hudPass(buf, page.actors?.at(-1)?.who ?? 'ward', hudLevel(t, page.hud));
  if (page.fx === 'dim') mathPass(buf, (dimSub ??= screen(DIM)), { op: 'sub', where: inPicture }, buf);
  return buf;
}
