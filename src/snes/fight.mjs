// Every SNES fight number, resolved: each value here is the one the SNES plays, at Final Fight's pace
// (Tim, 2026-09-15): a slower stride, a jab about 5 frames out and 11 back, a 7-12 frame hit-stop, a
// knockdown of about a second and foes that wind up for about half a second. The frozen NES build keeps
// its own base tables in src/stage1 and src/stage2 and never reads this file. Pixel numbers are before
// Stage 1's 1.5x scale (tuning.mjs STAGE1); times are frames at 60 fps.
import { tuneFor } from '../stage1/player.mjs';
import { BOSS, FOES } from '../stage1/tuning.mjs';
import { TUNING as ESCAPE } from '../stage2/escape.mjs';
import { ASSOCIATE } from '../stage2/foes.mjs';

// Each auditor's SNES numbers, laid over his moves.mjs tune; a key not listed plays at that value.
export const FIGHTERS = {
  ward: {
    walkX: 0.6, walkY: 0.40625, runX: 1.4, knockback: 1.25, launchX: 3.75, landFrames: 6,
    punchStartup: 5, punchActive: 3, punchRecovery: 11,
    finisherStartup: 8, finisherActive: 4, finisherRecovery: 26,
    heavyStartup: 10, heavyRecovery: 24,
    bufferFrames: 15, comboWindow: 24,
    hitStop: 7, hitStopHeavy: 9, hitStopFinish: 12, hitstun: 24, hitFlashFrames: 12, heavyShakeFrames: 4, shakeFrames: 11,
    downFrames: 60, getUpFrames: 24, throwFrames: 24, foeWindup: 30, foeCooldown: 100,
    foeSpeed: 0.325,
  },
  mercer: {
    walkX: 0.6, walkY: 0.40625, runX: 1.4, knockback: 1.25, launchX: 2.5, landFrames: 6,
    punchStartup: 5, punchActive: 3, punchRecovery: 9,
    finisherStartup: 6, finisherActive: 4, finisherRecovery: 26,
    heavyStartup: 10, heavyRecovery: 24,
    bufferFrames: 15, comboWindow: 24,
    hitStop: 7, hitStopHeavy: 9, hitStopFinish: 12, hitstun: 24, hitFlashFrames: 12, heavyShakeFrames: 4, shakeFrames: 11,
    downFrames: 60, getUpFrames: 24, throwFrames: 24, foeWindup: 30, foeCooldown: 100,
    foeSpeed: 0.325,
  },
};

export const snesTune = (who) => ({ ...tuneFor(who), ...FIGHTERS[who] });

// Stage 1's staff foes (staff.mjs KINDS) at the SNES pace; the brawl lab's dials turn these.
export const KINDS = {
  associate: { hp: 3, speed: 0.65, windup: 26, punch: 10, cooldown: 70, reach: 20, stand: 16, hitsToFall: 2,
    moves: {
      jab: { weight: 3 },
      lunge: { windup: 30, punch: 16, rush: 3, from: 28, to: 88, weight: 2 },
    },
    crowd: { circle: 0.9, feint: 1.6, taunt: 0.6, jitter: 1.8, gesture: 'beckon', back: true } },
  manager: { hp: 10, speed: 0.325, windup: 40, punch: 18, cooldown: 100, reach: 24, stand: 22, hitsToFall: 4, damage: 2,
    moves: {
      haymaker: { heavy: true, weight: 2 },
      grab: { windup: 30, punch: 12, reach: 18, damage: 1, hold: 60, squeeze: 20, mash: 6, weight: 2 },
      charge: { windup: 42, punch: 24, rush: 3.5, from: 48, to: 140, heavy: true, weight: 1 },
    },
    crowd: { circle: 1.3, feint: 0.4, taunt: 0.7, jitter: 0.7, gesture: 'tie' } },
  pruitt: { hp: 14, speed: 0.325, windup: 40, punch: 18, cooldown: 120, reach: 26, stand: 24, hitsToFall: 0, damage: 1,
    moves: {
      haymaker: { heavy: true, weight: 2 },
      charge: { windup: 42, punch: 24, rush: 3.5, from: 48, to: 140, heavy: true, weight: 2 },
    },
    crowd: { circle: 1.3, feint: 0.4, taunt: 0.7, jitter: 0.7, gesture: 'tie' } },
  counsel: { hp: 5, speed: 0.48750000000000004, windup: 28, punch: 16, cooldown: 120, reach: 100, hitsToFall: 3, keep: 64, near: 32,
    moves: {
      paper: { shot: 'paper', speed: 3, weight: 3 },
      object: { windup: 44, shot: 'object', speed: 2.25, damage: 2, heavy: true, weight: 2 },
      tape: { windup: 40, shot: 'tape', speed: 2, damage: 0, weight: 1 },
    },
    crowd: { circle: 2.2, feint: 0.2, taunt: 0.6, jitter: 0.8, gesture: 'tie' } },
  supervisor: { hp: 12, speed: 0.24375000000000002, windup: 34, punch: 14, cooldown: 110, reach: 24, stand: 20, hitsToFall: 4, guard: 300, counterAfter: 2,
    moves: {
      slap: { weight: 2 },
      overhead: { windup: 50, punch: 20, reach: 26, damage: 2, heavy: true, weight: 1 },
      counter: { windup: 20, punch: 16, reach: 32, damage: 2, heavy: true, weight: 0 },
    },
    crowd: { circle: 0.8, feint: 0.2, taunt: 2.2, jitter: 0.6, gesture: 'slap' } },
};

// Vellum's parry duel (vellum.mjs VELLUM): he paces and rushes at the foes' pace, recovers a little
// slower, and guards only about half a second between attacks. Pairs are [normal, fangs]; his tell and
// the stagger a parry leaves him in come from the brawl tune.
export const VELLUM = { hp: 16, fangsAt: 8, damage: 2, speed: [0.325, 0.48750000000000004], stand: 28, guard: [30, 22], windup: [30, 18], recover: [52, 36], rushSpeed: [2.25, 3], rushFrames: 70, rushReach: 14, sweepReach: 38, sweepActive: 4, sweepFrames: 24, summonFrames: 30, fangsFrames: 40, guardBreak: 150, slumpFrames: 120 };

// The shared foe and Stage 2 tables' SNES values. Stage 2 keeps its top walk speed and jump, so every
// pit stays clearable; the ramp, the casts and the foes slow instead.
export const SHARED = [
  [FOES, { walkX: 0.48750000000000004, walkY: 0.325, circleSpeed: 0.0078000000000000005, dodgeSpeed: 1.4, knockback: 2.5, tokenCooldown: 75, windupFrames: 28, recoverFrames: 32, staggerFrames: 20, knockdownFrames: 72 }],
  [BOSS, { walk: 0.39, chargeSpeed: 2.25, restFrames: 60, enragedRest: 32, windupFrames: 42, enragedWindup: 26, heavyStagger: 18 }],
  [ESCAPE, { accel: 0.09375, chaseSpeed: 1.0125, castDelay: 5, cooldown: 14, spawnFrames: 110 }],
  [ASSOCIATE, { walk: 0.34, glyphSpeed: 0.9900000000000001, windUp: 30, rest: 130, down: 50 }],
];

let shared = false;

// Writes the SNES values into the shared tables in place, once per page; the SNES stage scenes call it.
export function useSnesTables() {
  if (shared) return;
  shared = true;
  for (const [table, values] of SHARED) Object.assign(table, values);
}
