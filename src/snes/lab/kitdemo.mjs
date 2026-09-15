// The brawl lab's ?pose=kit: a scripted Mercer pressing the SNES pad through a three-button combo
// (Y, A, X: a light, the hook kick that dazes, the crush), then walking in and dive kicking the foe
// once he is back up, on a loop.
import { player } from '../../stage1/moves.mjs';

const STANDING = ['idle', 'walk'];

// The SNES buttons held on demo frame `t`. `memo` carries which half of the loop it is on.
export function kitDemoButtons(world, t, tune, memo) {
  const p = player(world);
  const foe = world.fighters.find((f) => f.team === 'foe');
  const down = new Set();
  if (!foe) return down;
  const gap = Math.abs(foe.x - p.x);
  const toward = foe.x > p.x ? 'right' : 'left';
  const tap = t % 2 === 0;
  if (memo.phase === 'dive') {
    const peak = tune.jumpUp ** 2 / (2 * tune.gravity);
    const reach = (peak * tune.diveX) / tune.diveDown + tune.punchReach / 2;
    if (p.state === 'jump' && p.vz <= 0 && !p.kicked) down.add('down').add('y');
    else if (p.state === 'jump' || p.state === 'land') memo.jumped = true;
    else if (memo.jumped && STANDING.includes(p.state)) Object.assign(memo, { phase: 'combo', jumped: false });
    else if (STANDING.includes(p.state) && STANDING.includes(foe.state)) {
      if (gap > reach) down.add(toward);
      else if (tap) down.add('b');
    }
    return down;
  }
  if (p.state === 'punch' && p.landed) { if (tap) down.add('a'); }
  else if (p.state === 'kick' && p.landed) { if (tap) down.add('x'); }
  else if (p.state === 'heavy') memo.phase = 'dive';
  else if (STANDING.includes(p.state) && STANDING.includes(foe.state)) {
    if (gap > tune.punchReach - 4) down.add(toward);
    else if (t % 6 === 0) down.add('y');
  }
  return down;
}
