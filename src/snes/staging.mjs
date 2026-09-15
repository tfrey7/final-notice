// The SNES cinema's acting, without Phaser: a scene's pages with src/story/staging.mjs laid over them,
// the stand-in play sprites on their keyframes, the bill sliding across the desk and the lamp's
// stepped colour-math glow.
import { rgb15 } from './color.mjs';
import { screen, mathPass } from './fx.mjs';
import { drawString } from './text.mjs';
import { bufferFill } from './scenes/front.mjs';
import { PICTURE } from './cinema.mjs';
import { STAGING } from '../story/staging.mjs';

export const BILL_FRAMES = 8;
// The scene cue's warm pads (v4 and v5): what 'pad' leaves playing.
export const PAD_VOICES = [3, 4];

// The scene's pages as staged: the wordless acting page first, then each spoken page carrying its
// beat's music and fx on the first page of that beat.
export function stagePages(sceneId, pages, auditor) {
  const plan = STAGING[sceneId];
  if (!plan) return pages;
  const cast = (actors) => actors?.map((a) => ({ ...a, who: a.who === 'auditor' ? auditor : a.who }));
  const out = pages.map((page) => {
    const beat = plan.beats[page.beat] ?? {};
    const staged = { ...page, cut: !!plan.cuts, actors: cast(beat.actors) ?? null };
    if ('portrait' in beat) staged.portrait = beat.portrait;
    if (page.part === 0) Object.assign(staged, { music: beat.music ?? null, fx: beat.fx ?? null });
    return staged;
  });
  if (out.length && plan.fadeAfter != null) out[out.length - 1].fadeAfter = plan.fadeAfter;
  if (!plan.acting) return out;
  const { backdrop, frames, actors } = plan.acting;
  return [{ acting: true, backdrop, portrait: null, speaker: null, lines: [], frames, actors: cast(actors), music: null, fx: null }, ...out];
}

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

// A stand-in play sprite, 60 px tall, feet at `feet`: the back of the head and no tie when turned away.
export function paintActor(fill, who, x, feet, pose = 'front', h = 60) {
  const { skin, hair, suit, tie } = COLOURS[who] ?? COLOURS.ward;
  const back = pose === 'back';
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
  fill(x - (head >> 2) - 3, top - 1, (head >> 1) + 6, head + 2, OUTLINE);
  fill(x - (head >> 2) - 2, top, (head >> 1) + 4, head, back ? hair : skin);
  fill(x - (head >> 2) - 2, top, (head >> 1) + 4, 3, hair);
}

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

// One frame of a staged page over its painted picture: the actors on page clock t, then its fx.
export function stageFrame(buf, page, t) {
  const fill = bufferFill(buf);
  for (const actor of page.actors ?? []) {
    const { x, feet, pose } = actorAt(actor.keys, t);
    paintActor(fill, actor.who, x, feet, pose);
  }
  if (page.fx === 'bill') {
    const b = billStep(t);
    fill(b.x, b.y, b.w, b.h, rgb15(28, 28, 23));
    fill(b.x, b.y, b.w, Math.min(3, b.h), rgb15(18, 26, 18));
    if (b.done) drawString(fill, 'LIFETIMES: 47', b.x + 20, b.y + 8, rgb15(3, 3, 6), null);
  }
  if (page.fx === 'lamp') mathPass(buf, lampGlow(), { op: 'add', where: inLamp }, buf);
  return buf;
}
