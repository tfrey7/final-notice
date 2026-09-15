// The SNES plays heavier than the NES, at Final Fight's pace (Tim, 2026-09-15): a slower stride, longer
// wind-ups and recoveries, a longer hit-stop and fall, and foes that close in and swing slower. Each
// table lists `scale`, a multiplier on speeds and distances, and `frames`, whole frames added to a time.
// Only the SNES scenes read it, so the NES keeps its numbers. Estimates from memory, unverified.
import { BOSS, FOES } from '../stage1/tuning.mjs';
import { TUNING as ESCAPE } from '../stage2/escape.mjs';
import { ASSOCIATE } from '../stage2/foes.mjs';

export const BRAWL_WEIGHT = {
  scale: { walkX: 0.75, walkY: 0.8, runX: 0.8, knockback: 1.25, launchX: 1.25, foeSpeed: 0.8 },
  frames: {
    landFrames: 1, punchStartup: 1, punchActive: 1, punchRecovery: 2,
    finisherStartup: 2, finisherActive: 1, finisherRecovery: 6,
    bufferFrames: 4, comboWindow: 6, hitStop: 1, hitStopHeavy: 3, hitStopFinish: 4, hitstun: 4,
    hitFlashFrames: 6, heavyShakeFrames: 4,
    downFrames: 12, getUpFrames: 6, throwFrames: 6, shakeFrames: 2, foeWindup: 6, foeCooldown: 15,
  },
};

// Stage 1's staff foes (staff.mjs KINDS) close in and swing at the pace BRAWL_WEIGHT sets for foes.
export const STAFF_WEIGHT = {
  scale: { speed: BRAWL_WEIGHT.scale.foeSpeed },
  frames: { windup: BRAWL_WEIGHT.frames.foeWindup, cooldown: BRAWL_WEIGHT.frames.foeCooldown },
};

// Vellum's parry duel (vellum.mjs VELLUM): he paces and rushes at the foes' pace, recovers a little
// slower, and guards only about half a second between attacks, so the fight is his tells and your parries.
// Pairs are [normal, fangs]; `guard` replaces his NES guard outright.
export const VELLUM_WEIGHT = {
  scale: { speed: BRAWL_WEIGHT.scale.foeSpeed, rushSpeed: 0.85 },
  frames: { recover: 4, sweepFrames: 4 },
  guard: [30, 22],
};

export const FOES_WEIGHT = {
  scale: { walkX: 0.8, walkY: 0.8, circleSpeed: 0.8, dodgeSpeed: 0.8, knockback: 1.25 },
  frames: { tokenCooldown: 15, windupFrames: 6, recoverFrames: 6, staggerFrames: 4, knockdownFrames: 12 },
};

export const BOSS_WEIGHT = {
  scale: { walk: 0.8, chargeSpeed: 0.85 },
  frames: { restFrames: 10, enragedRest: 6, windupFrames: 6, enragedWindup: 4, heavyStagger: 4 },
};

// Stage 2 keeps its top walk speed and jump, so every pit stays clearable; the ramp, the casts and the
// foes slow instead.
export const ESCAPE_WEIGHT = {
  scale: { accel: 0.75, chaseSpeed: 0.9 },
  frames: { castDelay: 2, cooldown: 4, spawnFrames: 20 },
};

export const ASSOCIATE_WEIGHT = {
  scale: { walk: 0.85, glyphSpeed: 0.9 },
  frames: { windUp: 6, rest: 20, down: 10 },
};

export function weighed(table, { scale = {}, frames = {} }) {
  const out = { ...table };
  for (const [k, m] of Object.entries(scale)) if (k in out) out[k] = table[k] * m;
  for (const [k, n] of Object.entries(frames)) if (k in out) out[k] = table[k] + n;
  return out;
}

let shared = false;

// The shared foe and Stage 2 tables, weighed in place once per page; the SNES stage scenes call it.
export function weighShared() {
  if (shared) return;
  shared = true;
  for (const [table, weight] of [[FOES, FOES_WEIGHT], [BOSS, BOSS_WEIGHT], [ESCAPE, ESCAPE_WEIGHT], [ASSOCIATE, ASSOCIATE_WEIGHT]]) {
    Object.assign(table, weighed(table, weight));
  }
}
