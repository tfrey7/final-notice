// Stage 1 on the SNES, the pure half: the one scale factor that grows reach, hitboxes and speeds to
// match 56-64 px characters, and the TMNT IV throw-into-camera finisher on an area's last foe.
import { STAGE } from '../../stage1/areas.mjs';

// Every tuning number measured in pixels; times and damage keep their values.
export const SCALED = ['walkX', 'walkY', 'runX', 'jumpUp', 'gravity', 'punchReach', 'comboStep', 'depthReach', 'grabReach', 'knockback', 'launchX', 'launchUp'];

export const scaledTune = (base, scale) => ({ ...base, ...Object.fromEntries(SCALED.map((k) => [k, base[k] * scale])) });

export const livingFoes = (world) => world.fighters.filter((f) => f.kind && f.state !== 'ko');

// True when the lock at `index` is the last one in its area.
export const endsArea = (index, locks = STAGE.locks) => Boolean(locks[index]) && locks[index + 1]?.area !== locks[index].area;

// The foe that earns the finisher this frame, or null: call after stepFloor and before stepAreas,
// with the living foes from before stepFloor. It is the area's last lock, on its last wave, nobody
// waiting on the bench, and the one foe standing a frame ago has just been knocked out.
export function finisherTarget(world, before) {
  const run = world.run;
  if (!run?.locked || !endsArea(run.lock)) return null;
  if (run.wave !== STAGE.locks[run.lock].waves.length - 1 || world.bench?.length) return null;
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
