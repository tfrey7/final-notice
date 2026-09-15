// Deputy Director Vellum, Stage 1's boss, on the moves.mjs floor (docs/NES-PLAN.md section 6).
// Pure rules: he guards, telegraphs one of three attacks, and is open only in the recovery after
// one (the bait), when a thrown Associate breaks his guard, or when a parry sends him reeling.
// Below half he bares his fangs. A tune may carry its own `vellum` table (the SNES scene's parry
// duel, grown and weighed); without one VELLUM is used.
import { DOWNED, fighter, landHit, player, set, updateCommon } from './moves.mjs';
import { TAPE, spawnStaff, thinkStaff } from './staff.mjs';
import { WIDTH } from '../snes/screen.mjs';

// Pairs are [normal, fangs]; times are frames. Each telegraph is held about half a second (L8).
// `stand` is how far off the auditor he paces while guarding.
export const VELLUM = {
  hp: 16, fangsAt: 8, damage: 2, speed: [0.5, 0.75], stand: 28,
  guard: [80, 44], windup: [30, 18], recover: [44, 28],
  rushSpeed: [3, 4], rushFrames: 70, rushReach: 14,
  sweepReach: 38, sweepActive: 4, sweepFrames: 18,
  summonFrames: 30, fangsFrames: 40, guardBreak: 150, slumpFrames: 120,
};

export const LOOPS = { 1: ['rush', 'sweep', 'tape'], 2: ['rush', 'sweep', 'rush', 'tape'] };

// One screen wide on both consoles (NES and SNES are each 256 px), so nobody walks out of view.
export const ARENA = { left: 16, right: WIDTH - 16, top: 160, bottom: 216 };

export const vellumOf = (tune) => tune?.vellum ?? VELLUM;
const pick = (v, key, table = VELLUM) => {
  const value = table[key];
  return Array.isArray(value) ? value[v.fangs ? 1 : 0] : value;
};
export const windupFor = (v, table) => pick(v, 'windup', table);
export const guardFor = (v, table) => pick(v, 'guard', table);

export const vellum = (world) => world.fighters.find((f) => f.kind === 'vellum');

// The auditor nearest him; with two players he turns on whoever is closest.
const players = (world) => world.fighters.filter((f) => f.team === 'player');
const nearest = (world, v) => players(world).reduce((a, b) => (Math.hypot(b.x - v.x, b.y - v.y) < Math.hypot(a.x - v.x, a.y - v.y) ? b : a));

// The locked one-screen office: only the auditor and Vellum, no props, no camera scroll.
export function enterOffice(world, tune) {
  world.floor = { ...ARENA };
  world.locked = true;
  world.cameraX = 0;
  world.props = [];
  world.fighters = world.fighters.filter((f) => f.team === 'player');
  Object.assign(player(world), { x: 56, y: 188 });
  spawnStaff(world, [], tune);
  world.think = thinkOffice;
  world.fighters.push({
    ...fighter('vellum', 'foe', 232, 188, tune),
    kind: 'vellum', boss: true, hp: VELLUM.hp, maxHp: VELLUM.hp, hitsToFall: 0, taken: 0,
    state: 'guard', facing: -1, wait: 0, loop: 0, attacks: 0, summoned: 0, fangs: false,
    attack: null, armoured: false, guardDown: 0, guardBreakFrames: VELLUM.guardBreak,
  });
  return world;
}

export function thinkOffice(world, f, tune) {
  return f.kind === 'vellum' ? thinkVellum(world, f, tune) : thinkStaff(world, f, tune);
}

// He calls one Associate after his first attack and one more once his fangs are out.
function wantsSummon(world, v) {
  if (v.summoned >= 2 || world.fighters.some((f) => f.kind === 'associate') || world.bench.length) return false;
  return v.summoned === 0 ? v.attacks >= 1 : v.fangs;
}

// His blow goes through the parry like anyone's: met inside the window, it sends him reeling.
function hitsPlayer(world, v, p, tune) {
  if (p.z >= 16 || DOWNED.includes(p.state) || p.invuln > 0) return false;
  return landHit(world, p, { damage: VELLUM.damage, heavy: true, dir: v.facing, from: v }, tune);
}

export function thinkVellum(world, v, tune) {
  const table = vellumOf(tune);
  const at = (key) => pick(v, key, table);
  const p = nearest(world, v);
  if (v.invuln > 0) v.invuln--;
  if (v.guardDown > 0) v.guardDown--;
  v.parryStagger = table.stagger;
  v.t++;
  v.armoured = v.state === 'windup';
  switch (v.state) {
    case 'held':
      set(v, 'hurt');
      break;
    case 'idle': case 'walk': case 'guard': {
      const stance = v.guardDown > 0 ? 'idle' : 'guard';
      if (v.state !== stance) set(v, stance);
      const side = Math.sign(v.x - p.x) || 1;
      const dx = p.x + side * table.stand - v.x;
      const dy = p.y - v.y;
      const speed = at('speed');
      v.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
      v.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * 0.75);
      v.facing = Math.sign(p.x - v.x) || v.facing;
      if (++v.wait < at('guard') || DOWNED.includes(p.state)) break;
      v.wait = 0;
      if (wantsSummon(world, v)) {
        v.summoned++;
        world.bench.push('associate');
        world.events.push('summon');
        set(v, 'summon');
        break;
      }
      const loop = LOOPS[v.fangs ? 2 : 1];
      v.attack = loop[v.loop++ % loop.length];
      if (v.attack === 'tape' && p.state === 'bound') v.attack = 'sweep';
      v.armoured = true;
      world.events.push('telegraph');
      set(v, 'windup');
      break;
    }
    case 'summon':
      if (v.t >= VELLUM.summonFrames) set(v, 'guard');
      break;
    case 'windup':
      if (v.attack !== 'tape') v.y += Math.sign(p.y - v.y) * Math.min(Math.abs(p.y - v.y), 0.5);
      if (v.t < at('windup')) break;
      v.attacks++;
      v.armoured = false;
      v.facing = Math.sign(p.x - v.x) || v.facing;
      if (v.attack === 'rush') {
        v.vx = v.facing * at('rushSpeed');
        v.landed = [];
        set(v, 'rush');
      } else if (v.attack === 'sweep') {
        set(v, 'sweep');
      } else {
        world.tapes.push({ x: v.x + v.facing * 12, y: v.y, vx: v.facing * TAPE.speed, t: 0, from: v.id });
        world.events.push('redTape');
        set(v, 'recover');
      }
      break;
    case 'rush':
      v.x = Math.min(world.floor.right - 8, Math.max(world.floor.left + 8, v.x + v.vx));
      for (const o of players(world)) {
        if (v.state !== 'rush' || v.landed === true || v.landed?.includes?.(o.id)) continue;
        if (Math.abs(o.x - v.x) < table.rushReach && Math.abs(o.y - v.y) <= tune.depthReach && hitsPlayer(world, v, o, tune)) v.landed = [...(v.landed || []), o.id];
      }
      if (v.state === 'rush' && (v.x <= world.floor.left + 8 || v.x >= world.floor.right - 8 || v.t >= table.rushFrames)) set(v, 'recover');
      break;
    case 'sweep': {
      if (v.t === table.sweepActive) {
        for (const o of players(world)) {
          const ahead = (o.x - v.x) * v.facing;
          if (v.state === 'sweep' && ahead >= -8 && ahead <= table.sweepReach && Math.abs(o.y - v.y) <= tune.depthReach * 2) hitsPlayer(world, v, o, tune);
        }
      }
      if (v.state === 'sweep' && v.t >= table.sweepFrames) set(v, 'recover');
      break;
    }
    case 'recover':
      if (v.t >= at('recover')) set(v, 'guard');
      break;
    case 'fangs':
      if (v.t >= VELLUM.fangsFrames) set(v, 'guard');
      break;
    case 'down':
      if (v.hp > 0) { updateCommon(world, v, tune); break; }
      set(v, 'slumped');
      world.events.push('bossDown');
      break;
    case 'slumped':
      if (v.t === VELLUM.slumpFrames) world.events.push('bossBeaten');
      break;
    default:
      updateCommon(world, v, tune);
  }
  if (!v.fangs && v.hp > 0 && v.hp <= VELLUM.fangsAt && ['idle', 'guard', 'hurt', 'recover'].includes(v.state)) {
    v.fangs = true;
    v.loop = 0;
    v.wait = 0;
    v.invuln = VELLUM.fangsFrames;
    world.events.push('fangs');
    set(v, 'fangs');
  }
}

export const bossBar = (v) => Array.from({ length: VELLUM.hp }, (_, i) => i < v.hp);

// Office stagings for screenshots: the rush mid-telegraph, and the fangs just out.
export function poseOffice(world, name) {
  const v = vellum(world);
  const p = player(world);
  if (name === 'rush') Object.assign(v, { x: p.x + 120, y: p.y, state: 'windup', t: 0, attack: 'rush', wait: 0, armoured: true });
  if (name === 'fangs') {
    Object.assign(v, { x: p.x + 60, y: p.y, hp: VELLUM.fangsAt, state: 'hurt', t: 0 });
  }
  return world;
}
