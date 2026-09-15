// What the brawl stages put on the sprite layer: the auditor, the staff, the weapons and furniture
// they drop, each fighter's readout over its box, and the finisher's growing frames. Grey boxes
// stand in wherever the art has not landed yet.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { artOr } from '../art.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { SHAPE, turnOwners } from '../../stage1/readout.mjs';
import { drawReadout } from '../readout.mjs';
import { drawSparks } from '../hitfx.mjs';
import { thingPriority, withPriority } from './priority.mjs';
import { finisherFrame } from './finisher.mjs';
import { fangFlash } from './boss.mjs';
import { vellumSprites } from './office.mjs';

export const MS = 1000 / 60;
export const BODY_H = 60;
const WHITE = rgb15(31, 31, 31);
const FOE_PALETTES = {
  associate: [rgb15(2, 2, 4), rgb15(12, 12, 14), rgb15(22, 22, 24)],
  manager: [rgb15(2, 2, 4), rgb15(24, 16, 4), rgb15(30, 28, 18)],
  counsel: [rgb15(2, 2, 4), rgb15(20, 6, 6), rgb15(28, 18, 16)],
  supervisor: [rgb15(2, 2, 4), rgb15(6, 10, 22), rgb15(18, 22, 30)],
};
const PROP_PALETTE = [rgb15(2, 2, 4), rgb15(16, 10, 4), rgb15(28, 24, 14)];
// Grey boxes for the office weapons and the furniture that drops them, until their art lands.
const FURNITURE = { desk: { w: 54, h: 32, palette: PROP_PALETTE }, cabinet: { w: 30, h: 54, palette: [rgb15(2, 2, 4), rgb15(13, 14, 16), rgb15(22, 23, 25)] },
  altar: { w: 44, h: 28, palette: [rgb15(2, 2, 4), rgb15(18, 3, 6), rgb15(31, 26, 8)] } };
// A foe anointed by a standing altar glows in the ritual's crimson and gold.
const ANOINTED = [rgb15(2, 2, 4), rgb15(26, 4, 6), rgb15(31, 26, 8)];
const WEAPON_BOX = {
  stapler: { w: 14, h: 8, palette: [WHITE, rgb15(6, 6, 7), rgb15(14, 14, 16)] },
  binder: { w: 12, h: 16, palette: [WHITE, rgb15(6, 12, 22), rgb15(12, 18, 28)] },
  extinguisher: { w: 9, h: 20, palette: [WHITE, rgb15(26, 6, 4), rgb15(30, 18, 16)] },
  stamp: { w: 12, h: 10, palette: [WHITE, rgb15(24, 3, 5), rgb15(31, 31, 31)] },
};
const WARD_ANIM = { idle: 'idle', walk: 'walk', run: 'walk', hurt: 'hit', held: 'hit', knockdown: 'hit', bound: 'hit', down: 'recoil', ko: 'recoil', jump: 'wind', carry: 'idle', throw: 'punch2', grab: 'punch1', step: 'walk', heavy: 'uppercut', special: 'uppercut' };

export function foeSprites(scene, f, sx, ms) {
  if (f.kind === 'vellum') return vellumSprites(scene, f, sx, ms, fangFlash(f, scene.game.loop.frame));
  if (f.state === 'ko' && f.t > 16 && Math.floor(f.t / 3) % 2) return [];
  if (f.invuln > 0 && f.invuln % 4 < 2) return [];
  const lying = ['down', 'ko'].includes(f.state);
  const h = lying ? 24 : BODY_H;
  const w = lying ? 56 : 32;
  const flash = (f.state === 'windup' && f.t % 8 < 2) || f.hitFlash > 0;
  const palette = flash ? [WHITE, WHITE, WHITE] : f.anointed ? ANOINTED : FOE_PALETTES[f.kind] ?? FOE_PALETTES.associate;
  const name = `foe:${f.kind}:${lying ? 'down' : 'up'}${flash ? ':flash' : f.anointed ? ':anointed' : ''}`;
  return artOr(scene, name, { w, h, palette }).frame('stand', ms, Math.round(sx - w / 2), Math.round(f.y - h - f.z));
}

export function weaponSprites(scene, kind, sx, bottom) {
  const { w, h, palette } = WEAPON_BOX[kind];
  return artOr(scene, `weapon:${kind}`, { w, h, palette }).frame('stand', 0, Math.round(sx - w / 2), Math.round(bottom - h));
}

export function playerSprites(scene, p, sx, ms) {
  if (p.invuln > 0 && p.invuln % 4 < 2 && p.state !== 'step') return [];
  const flip = p.facing < 0;
  if (scene.who === 'ward' && !scene.ward.standIn) {
    const anim = p.state === 'punch' ? (p.combo >= 3 ? 'uppercut' : 'jab') : WARD_ANIM[p.state] ?? 'idle';
    return scene.ward.frame(anim, ms, Math.round(sx), Math.round(p.y - p.z), flip);
  }
  const stand = artOr(scene, `auditor:${scene.who}`, { w: 32, h: BODY_H + 2, palette: [rgb15(2, 2, 4), rgb15(6, 8, 18), rgb15(28, 22, 16)] });
  return stand.frame('stand', ms, Math.round(sx - 16), Math.round(p.y - BODY_H - 2 - p.z), flip);
}

// Everything standing in the room this frame, sorted back to front and pushed to the sprite layer.
export function drawThings(scene, cam, shake) {
  const w = scene.world;
  // Foes still walking on from off screen push no sprites, which would count against the line limit.
  const things = [
    ...w.fighters.filter((f) => f !== scene.fin?.foe && Math.abs(f.x - cam - WIDTH / 2) < WIDTH / 2 + 32).map((f) => ({ y: f.y, f })),
    ...w.props.filter((o) => o.state !== 'gone').map((o) => ({ y: o.y + (o.state === 'held' ? 1 : 0), o })),
    ...(w.tapes ?? []).map((tape) => ({ y: tape.y + 1, tape })),
    ...(w.firstAid ?? []).filter((b) => !b.taken).map((box) => ({ y: box.y - 1, box })),
    ...(w.smash ?? []).map((s) => ({ y: s.y - 2, s })),
    ...(w.weapons ?? []).filter((wp) => !(wp.state === 'floor' && wp.t > w.weaponTune.weaponLife - 90 && wp.t % 8 < 4)).map((wp) => ({ y: wp.y, wp })),
  ].sort((a, b) => a.y - b.y);
  const at = (x) => x - cam - shake.x;
  const spritesOf = ({ f, o, tape, box, s, wp }) => {
    if (s) {
      const { w: sw, h, palette } = FURNITURE[s.kind];
      const sh = s.state === 'broken' ? 10 : h;
      return artOr(scene, `prop:${s.kind}${s.state === 'broken' ? ':broken' : ''}`, { w: sw, h: sh, palette }).frame('stand', 0, Math.round(at(s.x) - sw / 2), s.y - sh);
    }
    if (wp) return weaponSprites(scene, wp.kind, at(wp.x), wp.y - wp.z * STAGE1.scale);
    if (f?.state === 'spray' && w.weaponTune) {
      const reach = Math.round(w.weaponTune.extinguisherReach);
      const cloud = artOr(scene, `fx:spray:${reach}`, { w: reach, h: 16, palette: [rgb15(24, 26, 28), rgb15(28, 30, 31), WHITE] });
      return [...playerSprites(scene, f, at(f.x), f.t * MS), ...weaponSprites(scene, 'extinguisher', at(f.x) + f.facing * 22, f.y - 26),
        ...cloud.frame('stand', 0, Math.round(at(f.x) + (f.facing > 0 ? 24 : -24 - reach)), f.y - 40)];
    }
    if (f?.team === 'player' && f.weapon) return [...playerSprites(scene, f, at(f.x), f.t * MS), ...weaponSprites(scene, f.weapon.kind, at(f.x) + f.facing * 22, f.y - 26 - f.z)];
    if (f?.marked > 0) return [...foeSprites(scene, f, at(f.x), f.t * MS), ...weaponSprites(scene, 'stamp', at(f.x), f.y - BODY_H - 6 - f.z)];
    if (o) return artOr(scene, `prop:${o.kind}`, { w: 24, h: 24, palette: PROP_PALETTE }).frame('stand', 0, Math.round(at(o.x) - 12), Math.round(o.y - 24 - o.z * STAGE1.scale));
    if (box) return artOr(scene, 'prop:firstAid', { w: 24, h: 16, palette: [rgb15(2, 2, 4), WHITE, rgb15(28, 4, 4)] }).frame('stand', 0, Math.round(at(box.x) - 12), box.y - 16);
    if (tape?.shot === 'paper') return artOr(scene, 'prop:paper', { w: 16, h: 8, palette: [rgb15(2, 2, 4), WHITE, rgb15(24, 24, 22)] }).frame('stand', 0, Math.round(at(tape.x) - 8), tape.y - 40);
    if (tape?.shot === 'object') return artOr(scene, 'prop:object', { w: 16, h: 16, palette: [rgb15(2, 2, 4), rgb15(10, 10, 12), rgb15(20, 20, 22)] }).frame('stand', 0, Math.round(at(tape.x) - 8), tape.y - 44);
    if (tape) return artOr(scene, 'prop:tape', { w: 24, h: 8, palette: [rgb15(2, 2, 4), rgb15(26, 4, 4), WHITE] }).frame('stand', 0, Math.round(at(tape.x) - 12), tape.y - 40);
    const ms = f.t * MS;
    return f.team === 'player' ? playerSprites(scene, f, at(f.x), ms) : foeSprites(scene, f, at(f.x), ms);
  };
  scene.layer.draw(things.flatMap((t) => withPriority(spritesOf(t), thingPriority(t))));
}

// Each fighter's readout over its stand-in sprite, sized to the sprite's own box.
export function drawMarks(scene, off) {
  const g = scene.marks.clear();
  const w = scene.world;
  if (scene.card || scene.entrance || scene.paused) return;
  drawSparks(g, w.sparks, -off, scene.tune);
  const turns = turnOwners(w);
  for (const f of w.fighters) {
    if (f === scene.fin?.foe || Math.abs(f.x - off - WIDTH / 2) > WIDTH / 2 + 32) continue;
    const vellumBox = f.kind === 'vellum';
    const lying = (vellumBox ? ['down', 'slumped', 'knockdown'] : ['down', 'ko']).includes(f.state);
    const shape = SHAPE[f.kind];
    const bw = lying ? (vellumBox ? 60 : 56) : vellumBox ? 36 : shape?.[0] ?? 32;
    const bh = lying ? (vellumBox ? 28 : 24) : vellumBox ? 66 : f.team === 'player' ? BODY_H + 2 : shape?.[1] ?? BODY_H;
    drawReadout(g, scene.markFill, f, { x: Math.round(f.x - off), top: Math.round(f.y - bh - f.z), w: bw, h: bh, feet: f.y, lying }, {
      tune: scene.tune, dx: -off, frame: scene.game.loop.frame, cooldown: w.cooldown, boxes: scene.boxes, turn: turns.includes(f),
    });
  }
}

// The finisher's growing frames as scaled images over the sprite layer, like the drawn frames of
// Turtles in Time: its OAM entries, each scaled about the foe's centre as it flies to the screen's.
export function drawFinisher(scene) {
  const fin = scene.fin;
  scene.finImages.forEach((img) => img.setVisible(false));
  if (!fin) return;
  const step = finisherFrame(fin.t);
  if (step.impact) scene.world.shake = scene.tune.shakeFrames;
  const palette = [rgb15(2, 2, 4), FOE_PALETTES[fin.foe.kind]?.[1] ?? WHITE, WHITE];
  const entries = artOr(scene, `foe:${fin.foe.kind}:up`, { w: 32, h: BODY_H, palette }).frame('stand', 0, fin.x - 16, fin.y - BODY_H / 2);
  const cx = fin.x + (WIDTH / 2 - fin.x) * step.toward;
  const cy = fin.y + (HEIGHT / 2 - fin.y) * step.toward;
  entries.forEach((e, i) => {
    const img = scene.finImages[i] ?? (scene.finImages[i] = scene.add.image(0, 0, e.key).setOrigin(0).setDepth(15).setScrollFactor(0));
    img.setTexture(e.key).setScale(step.scale).setVisible(true)
      .setPosition(Math.round(cx + (e.x - fin.x) * step.scale), Math.round(cy + (e.y - fin.y) * step.scale));
  });
}
