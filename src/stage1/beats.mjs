// Stage rhythm (item 2336): Final Fight never lets you walk a plain corridor for long, so after every
// two or three packs of staff comes a BEAT, and no two beats in a row are the same kind:
//
//   story   a short exchange with portraits, over play, from src/story/script.mjs FLOOR_TALK
//   boss    a miniboss alone in the room, or the floor's boss at the end
//   pace    a change of pace: `smash` furniture holding health, an `ambush` through a door or lift,
//           or `scenery` that changes how the room is fought
//
// Pure, beside areas.mjs: `armBeats` puts the table on the world, `stepBeats` runs after stepAreas
// each frame and pushes its events onto world.events. `extraWave` is the hook areas.mjs asks before
// it releases a lock, which is how an ambush gets its wave in.
import { DOWNED, player, set } from './moves.mjs';
import { PIPS, SCREEN_W } from './player.mjs';
import { FLOOR_TALK } from '../story/script.mjs';
import { armGimmick, placeRams, stepGimmicks } from './gimmick.mjs';
import { spawnStaff } from './staff.mjs';

export const TALK_FRAMES = 150;   // 2.5 s a line, played over the fight, never pausing it
export const FIRE_FRAMES = 720;   // the photocopier burns for 12 s
export const WIND_FRAMES = 600;   // the window blows in for 10 s
export const DARK_FRAMES = 420;   // the lights are out for 7 s
export const FIRE_DAMAGE_EVERY = 40;
export const WIND_PUSH = 0.35;
export const DARK_STUN = 90;

// Stage 1, Claims & Adjustments. `lock` is the wave group the beat follows (src/snes/stage1/waves.mjs
// counts seven), `packs` how many packs of staff it follows, and `x` is measured from that lock's
// screen. An ambush fires INSTEAD of the lock releasing, so it reads as one more pack walking in.
export const STAGE1_BEATS = [
  { id: 'cabinets', lock: 0, packs: 2, kind: 'pace', sort: 'smash',
    what: 'filing cabinets across the reception doorway, one with a first-aid kit in it',
    boxes: [{ kind: 'cabinet', dx: 150, y: 168, drop: 'binder' }, { kind: 'cabinet', dx: 176, y: 180, drop: 'firstAid' }, { kind: 'desk', dx: 202, y: 192, drop: 'stapler' }] },
  { id: 'serviceFloor', lock: 1, packs: 2, kind: 'story', talk: 'serviceFloor',
    what: 'the auditor reads the floor on the way in' },
  { id: 'lift', lock: 2, packs: 2, kind: 'pace', sort: 'ambush',
    what: 'the service lift opens behind you and two more walk out', foes: ['associate', 'associate'] },
  { id: 'copierGuard', lock: 3, packs: 2, kind: 'boss', sort: 'miniboss',
    what: 'Pruitt, the Floor Manager, too heavy to stagger by hand: a copier rammed into him is the way in',
    foes: ['pruitt', 'associate'], gimmick: 'pruitt',
    rams: [{ dx: 88, y: 172 }, { dx: 190, y: 198 }], firstAid: { dx: 140, y: 208 } },
  { id: 'copierFire', lock: 5, packs: 3, kind: 'pace', sort: 'scenery', scenery: 'fire',
    what: 'the photocopier catches fire and splits the room in two', dx: 120, frames: FIRE_FRAMES },
  { id: 'waitingDoor', lock: 6, packs: 2, kind: 'story', talk: 'waitingDoor',
    what: 'what they say at the waiting-room door, before the office' },
];

// Stage 3, the Backrooms: seven locks, the same rhythm, its own flavour. The corridor folds, so its
// pace beats are the lights failing in a room you have already cleared and the break-room ambush.
export const STAGE3_BEATS = [
  { id: 'stairDoor', lock: 0, packs: 2, kind: 'story', talk: 'backrooms', what: 'what the stairwell smells of' },
  { id: 'trolley', lock: 1, packs: 2, kind: 'pace', sort: 'smash',
    what: 'a mail trolley and two crates by the break-room door, one with a first-aid kit',
    boxes: [{ kind: 'cabinet', dx: 90, y: 172, drop: 'firstAid' }, { kind: 'desk', dx: 118, y: 186, drop: 'extinguisher' }] },
  { id: 'breakRoomBoss', lock: 2, packs: 2, kind: 'boss', sort: 'miniboss',
    what: 'the Counsel who keeps sending you back through the same door', foes: ['counsel'], hpScale: 2 },
  { id: 'lightsOut', lock: 4, packs: 3, kind: 'pace', sort: 'scenery', scenery: 'dark',
    what: 'the lights fail: everyone on the floor is lost for a moment', dx: 0, frames: DARK_FRAMES },
  { id: 'copyRoomTalk', lock: 5, packs: 2, kind: 'story', talk: 'backrooms2', what: 'the same room, again' },
  { id: 'exitAmbush', lock: 6, packs: 2, kind: 'pace', sort: 'ambush',
    what: 'the exit door opens the wrong way: four come through it', foes: ['supervisor', 'associate', 'associate'] },
];

// Stage 5, the executive chapel: its pace beats are the window blowing in over the pews and the
// altar-desks, and its miniboss is the one who runs the ritual.
export const STAGE5_BEATS = [
  { id: 'pews', lock: 0, packs: 2, kind: 'pace', sort: 'smash',
    what: 'altar-desks to break open, one with a first-aid kit',
    boxes: [{ kind: 'desk', dx: 140, y: 174, drop: 'firstAid' }, { kind: 'desk', dx: 170, y: 190, drop: 'stamp' }] },
  { id: 'chapelTalk', lock: 1, packs: 2, kind: 'story', talk: 'chapel', what: 'what the chapel is for' },
  { id: 'windowIn', lock: 2, packs: 2, kind: 'pace', sort: 'scenery', scenery: 'wind',
    what: 'the rose window blows in and the wind drags the whole fight toward the altar', dx: 0, frames: WIND_FRAMES },
  { id: 'celebrant', lock: 3, packs: 2, kind: 'boss', sort: 'miniboss',
    what: 'the celebrant, alone at the altar', foes: ['manager'], hpScale: 2 },
  { id: 'aisleAmbush', lock: 5, packs: 3, kind: 'pace', sort: 'ambush',
    what: 'the vestry doors open down both sides of the aisle', foes: ['counsel', 'associate', 'supervisor'] },
  { id: 'lastRites', lock: 6, packs: 2, kind: 'story', talk: 'chapel2', what: 'the last word before the boss' },
];

export const BEAT_TABLES = { 1: STAGE1_BEATS, 3: STAGE3_BEATS, 5: STAGE5_BEATS };

// The beat map as a reader sees it: one row a beat, in order, with the packs it follows.
export const beatMap = (beats) => beats.map((b) => ({
  id: b.id, after: `lock ${b.lock}`, packs: b.packs, kind: b.kind, sort: b.sort ?? null, what: b.what,
}));

// No two beats in a row are the same kind. The test reads this; so does anyone editing a table.
export const rhythmOk = (beats) => beats.every((b, i) => i === 0 || b.kind !== beats[i - 1].kind)
  && beats.every((b) => b.packs >= 1 && b.packs <= 3);

export function armBeats(world, beats = STAGE1_BEATS) {
  world.beats = { list: beats, fired: [], talk: null, scenery: null };
  world.extraWave = extraWave;
  return world;
}

const lockX = (world, lock) => world.stage?.locks?.[lock]?.x ?? 0;
const pending = (world, kind, sort) => world.beats.list.filter((b) => b.kind === kind && (!sort || b.sort === sort)
  && !world.beats.fired.includes(b.id));

// areas.mjs asks this when a lock's own waves are down, before it releases: an ambush or a miniboss
// beat answers with one more pack, which walks in as the beat.
export function extraWave(world, lock) {
  if (!world.beats) return null;
  const beat = world.beats.list.find((b) => b.lock === lock && !world.beats.fired.includes(b.id)
    && (b.sort === 'ambush' || b.sort === 'miniboss'));
  if (!beat) return null;
  world.beats.fired.push(beat.id);
  world.events.push(`beat:${beat.kind}:${beat.id}`, beat.sort === 'ambush' ? 'ambush' : 'miniboss');
  world.beats.boost = beat.hpScale ? { scale: beat.hpScale, kind: beat.foes[0] } : null;
  // A gimmick boss brings his room with him: the copiers he is beaten with are parked as he walks on.
  world.beats.gimmick = beat.gimmick ? { id: beat.gimmick, kind: beat.foes[0] } : null;
  if (beat.rams) placeRams(world, beat.rams, lockX(world, beat.lock));
  // A miniboss room can pay for itself: the copy room keeps a kit on the wall.
  if (beat.firstAid) world.firstAid.push({ x: lockX(world, beat.lock) + beat.firstAid.dx, y: beat.firstAid.y, taken: false });
  return { foes: beat.foes };
}

function fireSmash(world, beat) {
  const x = lockX(world, beat.lock);
  world.smash ??= [];
  for (const [n, b] of beat.boxes.entries()) {
    world.smash.push({ id: `${beat.id}-${n}`, kind: b.kind, x: x + b.dx, y: b.y, drop: b.drop, hits: 0, state: 'standing', beat: beat.id });
  }
  world.events.push(`beat:pace:${beat.id}`, 'smash:placed');
}

function fireScenery(world, beat) {
  world.beats.scenery = { id: beat.scenery, t: 0, frames: beat.frames, x: lockX(world, beat.lock) + (beat.dx ?? 0), beat: beat.id };
  if (beat.scenery === 'dark') {
    for (const f of world.fighters) if (f.kind && !DOWNED.includes(f.state)) { set(f, 'idle'); f.cooldown = DARK_STUN; }
  }
  world.events.push(`beat:pace:${beat.id}`, `scenery:${beat.scenery}`);
}

function fireStory(world, beat) {
  world.beats.talk = { id: beat.talk, line: 0, t: 0, lines: (FLOOR_TALK[beat.talk] ?? []).length };
  world.events.push(`beat:story:${beat.id}`, `talk:${beat.talk}`);
}

// A first-aid drop is not a weapon: a broken box holding one becomes a first-aid box on the floor,
// which areas.mjs then heals from, so a pack of staff can be paid for by a filing cabinet.
function collectDrops(world) {
  for (const box of world.smash ?? []) {
    if (box.drop !== 'firstAid' || box.state !== 'broken' || box.given) continue;
    box.given = true;
    world.firstAid.push({ x: box.x, y: box.y + 6, taken: false });
    world.events.push('drop:firstAid');
  }
  world.weapons = (world.weapons ?? []).filter((w) => w.kind !== 'firstAid');
}

function stepScenery(world, tune) {
  const s = world.beats.scenery;
  if (!s) return;
  const p = player(world);
  if (s.id === 'fire') {
    for (const f of world.fighters) {
      if (DOWNED.includes(f.state) || Math.abs(f.x - s.x) > 14) continue;
      if (s.t % FIRE_DAMAGE_EVERY !== 0) continue;
      // It burns whoever stands in it, but it never stuns: the fire is an obstacle to fight around,
      // not a second opponent (a fire that set `hurt` doubled Ward's run, item 2336).
      f.hp = Math.max(0, f.hp - 1);
      f.x += Math.sign(f.x - s.x) || 1;
      world.events.push(f === p ? 'burn:player' : 'burn:staff');
    }
  } else if (s.id === 'wind') {
    for (const f of world.fighters) if (!DOWNED.includes(f.state)) f.x += WIND_PUSH;
  }
  if (++s.t >= s.frames) {
    world.beats.scenery = null;
    world.events.push(`scenery:over:${s.id}`);
  }
}

function stepTalk(world) {
  const t = world.beats.talk;
  if (!t) return;
  if (++t.t < TALK_FRAMES) return;
  t.t = 0;
  if (++t.line >= t.lines) {
    world.beats.talk = null;
    world.events.push(`talk:over:${t.id}`);
  } else world.events.push('talk:next');
}

// The auditor cannot be worse off for a beat: a miniboss's extra hide is put on the pack that beat
// spawned, once, the frame after it walks on.
function boostPack(world) {
  if (!world.beats.boost) return;
  const { scale, kind } = world.beats.boost;
  for (const f of world.fighters) {
    if (f.kind !== kind || f.boosted) continue;
    f.boosted = true;
    f.hp = Math.round(f.hp * scale);
    f.maxHp = Math.max(f.maxHp ?? f.hp, f.hp);
  }
  world.beats.boost = null;
}

// The gimmick is stamped on the boss the frame after his pack walks on, the way the extra hide is.
function armPack(world) {
  const want = world.beats.gimmick;
  if (!want) return;
  for (const f of world.fighters) if (f.kind === want.kind && !f.gimmick) armGimmick(f, want.id);
  if (world.fighters.some((f) => f.gimmick)) world.beats.gimmick = null;
}

// After stepAreas each frame: fire any beat whose lock has just been cleared, then run what is running.
export function stepBeats(world, tune) {
  if (!world.beats) return world;
  const run = world.run;
  boostPack(world);
  armPack(world);
  for (const beat of world.beats.list) {
    if (world.beats.fired.includes(beat.id) || run.lock <= beat.lock || run.locked) continue;
    world.beats.fired.push(beat.id);
    if (beat.kind === 'story') fireStory(world, beat);
    else if (beat.sort === 'smash') fireSmash(world, beat);
    else if (beat.sort === 'scenery') fireScenery(world, beat);
  }
  collectDrops(world);
  stepGimmicks(world, tune);
  stepScenery(world, tune);
  stepTalk(world);
  const p = player(world);
  if (p.hp > PIPS) p.hp = PIPS;
  return world;
}

// Fire one beat by name, wherever the run is: `?beat=copierFire` on the stage URL, for a look at it.
export function forceBeat(world, id) {
  const found = world.beats?.list.find((b) => b.id === id);
  if (!found) return null;
  // Where the camera is, not where the beat lives, so a forced beat is on screen to be looked at.
  const here = Math.round(world.cameraX ?? 0) - lockX(world, found.lock);
  const beat = { ...found, dx: here + SCREEN_W / 2, boxes: found.boxes?.map((b) => ({ ...b, dx: b.dx + here })) };
  if (!world.beats.fired.includes(id)) world.beats.fired.push(id);
  // A miniboss or an ambush walks on where the camera is, with the room it brings.
  if (beat.sort === 'miniboss' || beat.sort === 'ambush') {
    spawnStaff(world, beat.foes, world.tune ?? {});
    world.beats.gimmick = beat.gimmick ? { id: beat.gimmick, kind: beat.foes[0] } : null;
    if (beat.rams) placeRams(world, beat.rams.map((r) => ({ ...r, dx: r.dx + here })), lockX(world, beat.lock));
    world.events.push(`beat:${beat.kind}:${beat.id}`, beat.sort);
    return beat;
  }
  if (beat.kind === 'story') fireStory(world, beat);
  else if (beat.sort === 'smash') fireSmash(world, beat);
  else if (beat.sort === 'scenery') fireScenery(world, beat);
  return beat;
}

// How far into the stage each beat sits, as a share of the floor: the beat map's "where".
export const beatPlaces = (world, beats = world.beats?.list ?? STAGE1_BEATS) => beats.map((b) => ({
  id: b.id, x: lockX(world, b.lock), screen: Math.round(lockX(world, b.lock) / SCREEN_W),
}));

export const pendingBeats = pending;
