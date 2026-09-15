// Vellum's office on the SNES, the pure half: the Sunset Riders-style title card (a filed memo with
// his name and department, stamped, then his voice line subtitled), the colour-math red flash of his
// fangs once he is at half health, and the longer hit-stop on his big hits.
import { VELLUM } from '../../stage1/vellum.mjs';
import { rgb15 } from '../color.mjs';
import { descentAt } from '../descent.mjs';

export const OFFICE = 'stage1-area5';

export const CARD = {
  name: 'DEPUTY DIRECTOR VELLUM',
  department: 'CLAIMS AND ADJUSTMENTS',
  stamp: 'FILED',
  subtitle: "YOU'RE OVERDUE.",
  voice: 'vellumLine',
  descent: descentAt(OFFICE),
};

// Frames: the memo drops in, is stamped, he speaks, it holds, then slides away and the fight starts.
export const CARD_TIMES = { drop: 16, stamp: 34, voice: 44, hold: 150, leave: 166 };

const ease = (p) => 1 - (1 - p) ** 2;

// Where the card is `t` frames in: its offset above its resting place (0 = resting), whether the
// stamp and subtitle show, the frame the stamp and the voice fire on, and whether play may start.
export function cardFrame(t, times = CARD_TIMES) {
  const { drop, stamp, voice, hold, leave } = times;
  let rise = 0;
  if (t < drop) rise = 1 - ease(Math.max(0, t) / drop);
  else if (t >= hold) rise = -ease(Math.min(1, (t - hold) / (leave - hold)));
  return {
    rise,
    stamped: t >= stamp,
    subtitle: t >= voice && t < leave,
    stampNow: t === stamp,
    voiceNow: t === voice,
    done: t >= leave,
  };
}

// The stage-clear card after his slump: held `hold` frames (START or B skips it after `skip`), with the
// run's time and the lives left, before Scene 2.
export const CLEAR = { hold: 300, skip: 60 };

export function clearLines(frames, lives) {
  const secs = Math.floor(frames / 60);
  return ['STAGE 1 CLEAR', `TIME ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, `LIVES ${lives}`];
}

export const clearDone = (t, pad) => t >= CLEAR.hold || (t >= CLEAR.skip && (pad.pressed.has('start') || pad.pressed.has('b')));

// The sub-screen colour added to the office while his fangs are out, or null: a hard flash every
// four frames while he bares them, then one short pulse a second for the rest of the fight.
export const FANG_RED = rgb15(14, 0, 0);
export const FANG_PULSE = { every: 60, lit: 6 };

export function fangFlash(v, frame) {
  if (!v || !v.fangs || v.hp <= 0 || v.hp > VELLUM.fangsAt) return null;
  if (v.state === 'fangs') return frame % 4 < 2 ? FANG_RED : null;
  return frame % FANG_PULSE.every < FANG_PULSE.lit ? rgb15(7, 0, 0) : null;
}

// His big hits hold the fight longer than a staff member's: a landed rush or sweep, and the blow
// that drops him. Answers the hit-stop to use, never shorter than the one already running.
export const BOSS_STOP = { hit: 10, down: 20 };

export function bossHitStop(world, v, hpBefore, playerHpBefore, player) {
  let stop = world.hitStop;
  if (player.hp < playerHpBefore && ['rush', 'sweep'].includes(v.state)) stop = Math.max(stop, BOSS_STOP.hit);
  if (hpBefore > 0 && v.hp <= 0) stop = Math.max(stop, BOSS_STOP.down);
  return stop;
}
