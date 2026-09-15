// Stage 1 on the SNES, the pure half: the one scale factor that grows reach, hitboxes and speeds to
// match 56-64 px characters, and the TMNT IV throw-into-camera finisher on an area's last foe.
import { STAGE } from '../../stage1/areas.mjs';
import { CROWD, CROWD_SCALED, KINDS } from '../../stage1/staff.mjs';
import { VELLUM } from '../../stage1/vellum.mjs';
import { STAFF_WEIGHT, VELLUM_WEIGHT, weighed } from '../weight.mjs';

// Every tuning number measured in pixels; times and damage keep their values.
export const SCALED = ['walkX', 'walkY', 'runX', 'jumpUp', 'gravity', 'punchReach', 'comboStep', 'depthReach', 'grabReach', 'knockback', 'launchX', 'launchUp', 'juggleUp', 'juggleFloat', 'airReachZ', 'thirdReach', 'diveX', 'diveDown', 'takedownReach'];
export const STAFF_SCALED = ['speed', 'reach', 'stand', 'flank', 'keep', 'near'];
export const MOVE_SCALED = ['reach', 'rush', 'from', 'to', 'speed'];

export const VELLUM_SCALED = ['speed', 'stand', 'rushSpeed', 'rushReach', 'sweepReach'];

const grown = (table, keys, scale) => ({ ...table, ...Object.fromEntries(keys.filter((k) => k in table).map((k) => [k, table[k] * scale])) });
const each = (value, fn) => (Array.isArray(value) ? value.map(fn) : fn(value));

// Vellum's parry duel: his table weighed and grown like the staff's, his guard short, and his tell
// (the wind-up, quicker with his fangs out) and the stagger a parry leaves him in read from the dials.
export function vellumTable(tune, scale) {
  const out = { ...VELLUM };
  for (const [k, m] of Object.entries(VELLUM_WEIGHT.scale)) out[k] = each(out[k], (x) => x * m);
  for (const [k, n] of Object.entries(VELLUM_WEIGHT.frames)) out[k] = each(out[k], (x) => x + n);
  for (const k of VELLUM_SCALED) out[k] = each(out[k], (x) => x * scale);
  const tell = tune.vellumTell;
  return { ...out, guard: VELLUM_WEIGHT.guard, windup: [tell, Math.max(1, Math.round(tell * 0.6))], stagger: tune.vellumStagger };
}

// The player's tune grown, carrying the staff foes' and Vellum's tables weighed and grown to match,
// which staff.mjs and vellum.mjs read in place of their NES tables. A flanker walks no faster than
// the auditor, so he can be caught.
export function scaledTune(base, scale) {
  const tune = grown(base, SCALED, scale);
  const staff = (k) => {
    const out = grown(weighed(k, STAFF_WEIGHT), STAFF_SCALED, scale);
    if (k.moves) {
      const move = (m) => weighed(grown(m, MOVE_SCALED, scale), { frames: { windup: STAFF_WEIGHT.frames.windup } });
      out.moves = Object.fromEntries(Object.entries(k.moves).map(([name, m]) => [name, move(m)]));
    }
    return k.flank ? { ...out, speed: Math.min(out.speed, tune.walkX) } : out;
  };
  return {
    ...tune, kinds: Object.fromEntries(Object.entries(KINDS).map(([kind, k]) => [kind, staff(k)])),
    crowd: grown(CROWD, CROWD_SCALED, scale), vellum: vellumTable(tune, scale),
  };
}

export const livingFoes = (world) => world.fighters.filter((f) => f.kind && f.state !== 'ko');

// True when the lock at `index` is the last one in its area.
export const endsArea = (index, locks = STAGE.locks) => Boolean(locks[index]) && locks[index + 1]?.area !== locks[index].area;

// The foe that earns the finisher this frame, or null: call after stepFloor and before stepAreas,
// with the living foes from before stepFloor. It is the area's last lock, on its last wave, nobody
// waiting on the bench, and the one foe standing a frame ago has just been knocked out.
export function finisherTarget(world, before) {
  const run = world.run;
  const { locks } = world.stage ?? STAGE;
  if (!run?.locked || !endsArea(run.lock, locks)) return null;
  if (run.wave !== locks[run.lock].waves.length - 1 || world.bench?.length) return null;
  if (before.length !== 1 || livingFoes(world).length) return null;
  return world.fighters.includes(before[0]) ? before[0] : null;
}

// Four drawn sizes, each held a quarter of the throw, flying from where the foe fell to the middle
// of the screen: sprite-scale frames, as Turtles in Time drew it, not Mode 7.
export const FINISHER_FRAMES = 40;
export const FINISHER_SCALES = [1, 1.75, 3, 5];

export function finisherFrame(t, frames = FINISHER_FRAMES) {
  const hold = frames / FINISHER_SCALES.length;
  const step = Math.min(FINISHER_SCALES.length - 1, Math.floor(t / hold));
  return { step, scale: FINISHER_SCALES[step], toward: step / (FINISHER_SCALES.length - 1), impact: t === Math.round(hold * step) && step === FINISHER_SCALES.length - 1, done: t >= frames };
}
