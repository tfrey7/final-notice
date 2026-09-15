// Area 5 of Stage 1, Vellum's locked office: entering it, his camera-pan entrance and memo title
// card, his stand-in sprite, the red colour-math wash of his fangs over the room, and the longer
// hit-stop and pinch song his fight brings.
import { rgb15 } from '../color.mjs';
import { colorMath, fromRgba, toRgba } from '../fx.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { artOr, loadArt } from '../art.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { VELLUM_PINCH, vellumPinch } from '../audio/cues.mjs';
import { newFloor } from '../../stage1/player.mjs';
import { enterOffice, poseOffice, vellum } from '../../stage1/vellum.mjs';
import { CARD, bossHitStop, cardFrame, fangFlash } from './boss.mjs';
import { VELLUM_IN, skipTo, vellumEntrance } from '../entrance.mjs';

const WHITE = rgb15(31, 31, 31);
const VELLUM_PALETTE = [rgb15(2, 1, 3), rgb15(9, 2, 5), rgb15(26, 22, 20)];

// The office world, plus the entrance pan and title card that play before the fight.
// ?pose=rush / ?pose=fangs stages him and skips the card; ?card and ?entrance hold each still.
export function openOffice(scene, params) {
  scene.world = enterOffice(newFloor(scene.who, scene.tune), scene.tune);
  poseOffice(scene.world, params.get('pose'));
  scene.card = params.get('pose') ? null : { t: params.has('card') ? Number(params.get('card')) : 0, still: params.has('card') };
  scene.entrance = scene.card && !params.has('card') ? { t: Number(params.get('entrance') ?? 0), still: params.has('entrance') } : null;
}

export const officeArt = () => loadArt('vellum').catch(() => null);

// The pan-in, one frame: true while it still owns the screen.
export function stepEntrance(scene, pad) {
  scene.entrance.t = skipTo(scene.entrance.t, pad, VELLUM_IN.end);
  if (vellumEntrance(scene.entrance.t).done) scene.entrance = null;
  else if (!scene.entrance.still) scene.entrance.t++;
  return true;
}

// The memo card, one frame: the stamp and his voice line fire on their frames.
export function stepCard(scene) {
  const step = cardFrame(scene.card.t);
  if (step.stampNow) sfx('stamp');
  if (step.voiceNow) sfx(CARD.voice);
  if (step.done) scene.card = null;
  else if (!scene.card.still) scene.card.t++;
  return true;
}

// His hit-stop, and the pinch song once he is hurt enough to bare his fangs.
export function bossBeat(scene, world, boss, bossHp, playerHp, player) {
  world.hitStop = bossHitStop(world, boss, bossHp, playerHp, player);
  if (!scene.pinch && vellumPinch(boss.hp, boss.maxHp)) {
    scene.pinch = true;
    playSong(VELLUM_PINCH);
  }
}

export const bakeOffice = (background) => [bakeScene(background)];

// The entrance's pan: the camera starts 96 px left of the office and travels right into it.
export const entrancePan = (scene) => vellumEntrance(scene.entrance.t).pan;

// The room, and over it the red sub-screen of his fangs, added and clamped per 5-bit channel.
export function drawOffice(scene, background, shake, pan) {
  composeFrame(background, scene.baked[0], shake.x - pan, 0, scene.pixels.data);
  const red = fangFlash(vellum(scene.world), scene.game.loop.frame);
  if (!red) return;
  const buf = fromRgba(scene.pixels.data, scene.buf15);
  for (let i = 0; i < buf.length; i++) buf[i] = colorMath(buf[i], red, 'add');
  toRgba(buf, scene.pixels.data);
}

// Vellum stands in until his art lands: a taller dark suit, flashing white on a telegraph and
// lit by the same red colour math as the room while his fangs are out.
export function vellumSprites(scene, v, sx, ms, red) {
  if (v.invuln > 0 && v.invuln % 4 < 2 && v.state !== 'fangs') return [];
  const lying = ['down', 'slumped', 'knockdown'].includes(v.state);
  // Standing from the desk during his entrance: seated, half up, upright.
  const rise = scene.entrance ? Math.round(vellumEntrance(scene.entrance.t).stand * 2) : 2;
  const h = lying ? 28 : 44 + rise * 11;
  const w = lying ? 60 : 36;
  const flash = v.state === 'windup' && v.t % 8 < 2;
  const tint = red ?? (v.fangs ? rgb15(4, 0, 0) : 0);
  const palette = flash ? [WHITE, WHITE, WHITE] : VELLUM_PALETTE.map((c) => colorMath(c, tint, 'add'));
  const name = `foe:vellum:${lying ? 'down' : `up${h}`}:${flash ? 'flash' : tint}`;
  return artOr(scene, name, { w, h, palette }).frame('stand', ms, Math.round(sx - w / 2), Math.round(v.y - h - v.z), v.facing < 0);
}
