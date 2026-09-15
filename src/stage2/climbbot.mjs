// A bot that climbs the Archive with the SNES pad: ledge to ledge, stepping out from under the one above
// before it jumps, and casting on the move at an Associate it faces on its own ledge. It answers the buttons held this frame. Pure.
import { ARCHIVE } from './climb.mjs';
import { TILE } from './physics.mjs';

export const createBot = () => ({ target: null, hold: 0 });

const edges = (l) => [l.c0 * TILE, (l.c1 + 1) * TILE];

function standingOn(p) {
  if (!p.grounded) return null;
  return ARCHIVE.ledges.find((l) => l.row * TILE === p.y && p.x + p.w / 2 > l.c0 * TILE && p.x - p.w / 2 < (l.c1 + 1) * TILE) ?? null;
}

export function botButtons(bot, s) {
  const down = new Set();
  const p = s.run.player;
  if (s.over || s.respawn > 0) return down;
  const here = standingOn(p);
  if (here) bot.target = ARCHIVE.ledges[here.k + 1] ?? null;
  const target = bot.target;
  if (!target) return down;
  const [t0, t1] = edges(target);
  const hw = p.w / 2;

  if (!here) {
    if (bot.hold-- > 0) down.add('b');
    const dir = p.x < t0 + TILE ? 1 : p.x > t1 - TILE ? -1 : 0;
    if (dir) down.add(dir > 0 ? 'right' : 'left');
    return down;
  }

  const foe = s.run.foes.find((f) => f.hp > 0 && Math.abs(f.y - p.y) < 4 && Math.abs(f.x - p.x) < 120);
  if (foe && s.run.frame % 8 === 0 && Math.sign(foe.x - p.x) === p.facing) down.add('y');

  const [h0, h1] = edges(here);
  const under = p.x + hw > t0 && p.x - hw < t1;
  if (under) {
    down.add(t0 - h0 > h1 - t1 ? 'left' : 'right');
    return down;
  }
  const dir = p.x < t0 ? 1 : -1;
  down.add(dir > 0 ? 'right' : 'left');
  const gap = dir > 0 ? t0 - (p.x + hw) : p.x - hw - t1;
  const atEdge = dir > 0 ? p.x + hw >= h1 - 2 : p.x - hw <= h0 + 2;
  if (gap <= 8 || atEdge) {
    down.add('b');
    bot.hold = 22;
  }
  return down;
}
