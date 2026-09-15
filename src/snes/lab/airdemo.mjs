// The brawl lab's ?pose=air: a scripted Ward pressing the SNES pad through his launcher and air
// combo, so the whole string can be watched, or held on any frame for a picture.
import { player } from '../../stage1/moves.mjs';

// The SNES buttons held on demo frame `t`: up + X to launch, B to jump after him, Y twice in the
// air, then X to slam. Presses are a frame long and spaced wider than the Y+X room clear.
export function airDemoButtons(world, t, tune) {
  const p = player(world);
  const foe = world.fighters.find((f) => f.team === 'foe');
  const down = new Set();
  if (!foe) return down;
  const beat = t % 6 === 0;
  if (['idle', 'walk'].includes(p.state) && !foe.juggle && foe.state === 'idle') {
    down.add('up');
    if (beat) down.add('x');
  } else if (p.state === 'heavy' && p.landed && foe.juggle) {
    if (t % 2 === 0) down.add('b');
  } else if (p.state === 'jump' && foe.juggle && beat && Math.abs(foe.z - p.z) <= tune.airReachZ) {
    down.add(p.airHits < tune.airLights ? 'y' : 'x');
  }
  return down;
}
