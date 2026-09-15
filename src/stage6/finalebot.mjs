// A bot that plays the finale with the SNES pad: the capstone climb as the shaft bot climbs, then Bellwether
// by the book (it parries every stamp, jumps every shockwave, steps out from under the wax and the Seal, and
// casts at him otherwise), then the final choice for the ending it was made with. Pure.
import { botButtons as climbButtons } from '../stage4/shaftbot.mjs';
import { CAPSTONE, CHOICES, CHOICE_DELAY } from './capstone.mjs';

export const createBot = (ending = 'good') => ({ i: 0, hold: 0, steer: 0, jump: 0, ending });

function choose(bot, s, down) {
  const c = s.choice;
  const want = CHOICES.findIndex((o) => o.key === bot.ending);
  if (c.t % 2) return down;
  if (c.pick !== want) down.add('down');
  else if (c.t >= CHOICE_DELAY) down.add('b');
  return down;
}

function fight(bot, s, down) {
  const t = s.boss;
  const b = s.fight;
  const p = s.run.player;
  const { x0, x1 } = b.arena;
  const walk = (dir) => dir && down.add(dir > 0 ? 'right' : 'left');
  if (bot.jump > 0) {
    bot.jump -= 1;
    down.add('b');
  }
  if (b.beaten) return down;
  const face = Math.sign(b.x - p.x) || p.facing;

  if (b.state === 'tell' && b.attack === 'stamp' && b.timer <= 3 && !p.parryCool) down.add('l');
  const wave = b.waves.find((w) => Math.sign(p.x - w.x) === Math.sign(w.vx) && Math.abs(p.x - w.x) < 30);
  if (wave && p.grounded && !bot.jump) {
    bot.jump = 14;
    down.add('b');
  }

  const slam = b.state === 'tell' && b.attack === 'slam' && Math.abs(p.x - b.slamX) < t.slamW / 2 + p.w / 2 + 6;
  const drop = b.drops.find((d) => Math.abs(d.x - p.x) < 16);
  if (slam || drop) {
    const from = slam ? b.slamX : drop.x;
    const away = p.x < from ? -1 : 1;
    const room = away < 0 ? p.x - x0 : x1 - p.x;
    walk(room > 40 ? away : -away);
    return down;
  }
  const gap = Math.abs(b.x - p.x);
  if (gap > 70) walk(face);
  else if (gap < 26) walk(-face);
  else {
    down.add('y');
    if (p.facing !== face) walk(face);
  }
  return down;
}

export function botButtons(bot, s) {
  if (s.part === 'climb') return climbButtons(bot, s, CAPSTONE);
  const down = new Set();
  if (s.over || s.respawn > 0) return down;
  return s.part === 'choice' ? choose(bot, s, down) : fight(bot, s, down);
}
