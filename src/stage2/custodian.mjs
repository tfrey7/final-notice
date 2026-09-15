// Original Copy's mid-boss, the Records Custodian: directs two casting Associates, flashes, then lunges along
// the floor; beaten, the original ledger lifts from its stand into the auditor's hands. Pure.
import { stagger } from './casting.mjs';
import { createAssociate } from './foes.mjs';
import { HEALTH, INVULN } from './player.mjs';

export const CUSTODIAN = { w: 16, h: 32, hp: 8, direct: 150, tell: 36, speed: 3, lunge: 90, recover: 50, damage: 2 };
export const LEDGER = { lift: 40, rise: 24, fly: 2.5 };

// `spots` are where the called Associates appear; `arena` is { x0, x1 }, the locked screen's walls.
export const createCustodian = ({ x, y }, spots, arena) => ({
  kind: 'custodian', boss: true, x, y, w: CUSTODIAN.w, h: CUSTODIAN.h, hp: CUSTODIAN.hp, facing: -1, vx: 0,
  phase: 'direct', timer: CUSTODIAN.direct, flash: 0, frozen: 0, spots, arena, beaten: false,
});

const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && a.y - a.h < b.y && b.y - b.h < a.y;

function hurt(player, events) {
  if (player.invuln) return;
  player.health -= CUSTODIAN.damage;
  player.invuln = INVULN;
  events.push({ type: 'hurt' });
  if (player.health <= 0) {
    player.health = HEALTH;
    events.push({ type: 'lifeLost' });
  }
}

// One frame. Called Associates join `foes`; answers the events.
export function stepCustodian(c, player, foes) {
  const events = [];
  c.flash = Math.max(0, c.flash - 1);
  c.frozen = 0;
  if (c.beaten) return events;
  if (c.hp <= 0) {
    c.beaten = true;
    c.vx = 0;
    for (const f of foes) if (f.called) f.hp = 0;
    events.push({ type: 'bossDown' });
    return events;
  }
  const hw = c.w / 2;
  stagger(c, (x) => x >= c.arena.x0 + hw && x <= c.arena.x1 - hw);
  if (c.phase === 'direct') {
    if (c.timer === CUSTODIAN.direct && !foes.some((f) => f.called && f.hp > 0)) {
      for (const spot of c.spots) foes.push({ ...createAssociate(spot), called: true, rest: 40 });
      events.push({ type: 'call' });
    }
    c.facing = Math.sign(player.x - c.x) || c.facing;
    if (--c.timer === 0) {
      Object.assign(c, { phase: 'tell', timer: CUSTODIAN.tell });
      events.push({ type: 'tell' });
    }
  } else if (c.phase === 'tell') {
    if (--c.timer === 0) {
      Object.assign(c, { phase: 'lunge', timer: CUSTODIAN.lunge, vx: c.facing * CUSTODIAN.speed });
      events.push({ type: 'lunge' });
    }
  } else if (c.phase === 'lunge') {
    const x = Math.max(c.arena.x0 + hw, Math.min(c.arena.x1 - hw, c.x + c.vx));
    const wall = x !== c.x + c.vx;
    c.x = x;
    if (overlaps(c, player)) hurt(player, events);
    if (--c.timer === 0 || wall) Object.assign(c, { phase: 'recover', timer: CUSTODIAN.recover, vx: 0 });
  } else if (--c.timer === 0) {
    Object.assign(c, { phase: 'direct', timer: CUSTODIAN.direct });
  }
  return events;
}

export const createLedger = ({ x, y }) => ({ x, y, baseY: y, age: 0, taken: false });

// Once the Custodian is beaten the ledger rises off its stand, then floats into the auditor's hands.
export function stepLedger(l, c, player) {
  if (l.taken || !c.beaten) return [];
  l.age += 1;
  if (l.age <= LEDGER.lift) {
    l.y = l.baseY - (LEDGER.rise * l.age) / LEDGER.lift;
    return [];
  }
  const tx = player.x;
  const ty = player.y - 20;
  const d = Math.hypot(tx - l.x, ty - l.y);
  if (d <= LEDGER.fly) {
    l.taken = true;
    return [{ type: 'pickup', name: 'ledger' }];
  }
  l.x += ((tx - l.x) / d) * LEDGER.fly;
  l.y += ((ty - l.y) / d) * LEDGER.fly;
  return [];
}
