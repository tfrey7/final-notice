// The fight grunts in the game: each baked variation is registered as an S-DSP sample at load and played
// dry. An auditor grunts on the partners' line voice, which is free whenever they grunt; the foes share a
// voice of their own, so a grunt never cuts a foe's spoken line off.
import GRUNTS from './grunts-brr.mjs';
import { unpack } from './recorded.mjs';
import { brrDecode } from './spc.mjs';
import { BARK_VOICE, SAMPLES, sfxDef } from './player.mjs';

export const FOE_GRUNT_VOICE = 3;

for (const [id, g] of Object.entries(GRUNTS)) {
  const brr = { blocks: unpack(g.brr), loop: null };
  SAMPLES[`grunt:${id}`] = { brr, pcm: brrDecode(brr), loop: null, rootHz: g.rootHz };
}

export const hasGrunt = (id) => !!GRUNTS[id];
export const gruntFrames = (id) => GRUNTS[id]?.frames ?? 0;

export function gruntDef(id, { partner = false } = {}) {
  const g = GRUNTS[id];
  if (!g) return null;
  return { voice: partner ? BARK_VOICE : FOE_GRUNT_VOICE, layers: [{ delay: 0, steps: [[{ sample: `grunt:${id}`, adsr: [15, 7, 7, 0], vol: g.vol ?? 127, echo: false }, g.midi, g.frames]] }] };
}

export function playGrunt(id, options) {
  const def = gruntDef(id, options);
  if (!def) return false;
  sfxDef(def);
  return true;
}
