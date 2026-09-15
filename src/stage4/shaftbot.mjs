// A bot that climbs the elevator shaft with the SNES pad: girder hops like the Archive bot, walking to a
// cable and climbing to its top before jumping to the girder beside it, and waiting at a ledge's edge for
// a car to stop before boarding and riding it up. It answers the buttons held this frame. Any course built
// the same way (ledges, cables and cars on one route) can be passed in place of the shaft. Pure.
import { CABLE, SHAFT } from './shaft.mjs';
import { TILE } from '../stage2/physics.mjs';

export const createBot = () => ({ i: 0, hold: 0, steer: 0 });

const edges = (l) => [l.c0 * TILE, (l.c1 + 1) * TILE];
const mid = (l) => ((l.c0 + l.c1 + 1) / 2) * TILE;

function standingOn(p, course) {
  if (!p.grounded) return null;
  return course.ledges.find((l) => l.row * TILE === p.y && p.x + p.w / 2 > l.c0 * TILE && p.x - p.w / 2 < (l.c1 + 1) * TILE) ?? null;
}

const walk = (down, dir) => dir && down.add(dir > 0 ? 'right' : 'left');
const toward = (from, to, dead = 3) => (to - from > dead ? 1 : from - to > dead ? -1 : 0);

export function botButtons(bot, s, course = SHAFT) {
  const down = new Set();
  const p = s.run.player;
  if (s.over || s.respawn > 0) return down;
  const here = s.hang ?? (s.ride && course.cars[s.ride.k]) ?? standingOn(p, course);
  if (here) {
    bot.i = course.route.indexOf(here);
    bot.steer = 0;
  }
  const next = course.route[bot.i + 1];
  if (!next) return down;
  const hw = p.w / 2;

  if (!here) {
    if (bot.hold-- > 0) down.add('b');
    const target = next.kind === 'ledge' ? next : course.route[bot.i + 2];
    const [t0, t1] = edges(target);
    walk(down, bot.steer || (p.x < t0 + TILE ? 1 : p.x > t1 - TILE ? -1 : 0));
    return down;
  }

  if (s.hang) {
    if (s.hangY > s.hang.top) down.add('up');
    else {
      const dir = toward(p.x, mid(next), 0);
      walk(down, dir);
      down.add('b');
      Object.assign(bot, { hold: 20, steer: dir });
    }
    return down;
  }

  if (s.ride) {
    const car = s.ride;
    const off = course.route[bot.i + 1];
    if (!car.moving && car.y === car.top) walk(down, toward(p.x, mid(off)));
    else walk(down, toward(p.x, car.x, 16));
    return down;
  }

  const [h0, h1] = edges(here);
  if (next.kind === 'cable') {
    const dx = next.x - p.x;
    if (Math.abs(dx) <= CABLE.grab - 2) down.add('up');
    walk(down, toward(p.x, next.x, 2));
    return down;
  }

  if (next.kind === 'car') {
    const car = s.cars[next.k];
    const lane = [next.c0 * TILE, (next.c1 + 1) * TILE];
    const fromLeft = mid(here) < next.x;
    const boarding = !car.moving && car.y === here.row * TILE;
    if (boarding) walk(down, toward(p.x, next.x, 12));
    else walk(down, toward(p.x, fromLeft ? lane[0] - hw - 4 : lane[1] + hw + 4, 2));
    return down;
  }

  const [t0, t1] = edges(next);
  const under = p.x + hw > t0 && p.x - hw < t1;
  if (under) {
    walk(down, t0 - h0 > h1 - t1 ? -1 : 1);
    return down;
  }
  const dir = p.x < t0 ? 1 : -1;
  walk(down, dir);
  const gap = dir > 0 ? t0 - (p.x + hw) : p.x - hw - t1;
  const atEdge = dir > 0 ? p.x + hw >= h1 - 2 : p.x - hw <= h0 + 2;
  if (gap <= 8 || atEdge) {
    down.add('b');
    Object.assign(bot, { hold: 22, steer: dir });
  }
  return down;
}
