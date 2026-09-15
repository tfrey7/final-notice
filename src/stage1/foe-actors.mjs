// Draws staff.mjs's foes, their red tape and a bound auditor as hardware sprites. Each kind keeps
// one palette, so a colour always means a behaviour (NES-CLASSICS L3); stand-ins until the art lands.
import { artOr } from '../nes/art.mjs';

const PALETTES = {
  associate: [0x0f, 0x00, 0x10],
  manager: [0x0f, 0x27, 0x38],
  counsel: [0x0f, 0x16, 0x26],
  supervisor: [0x0f, 0x1a, 0x2a],
};
const ANIM = {
  idle: 'idle', walk: 'walk', guard: 'guard', windup: 'windup', punch: 'punch',
  hurt: 'hurt', held: 'hurt', knockdown: 'hurt', down: 'down', getup: 'hurt', ko: 'dazed',
};
// The cast sheet already has the Associate's walk, punch and hurt.
const CAST = { idle: 'idle', walk: 'walk', guard: 'idle', windup: 'punch', punch: 'punch', dazed: 'hurt', down: 'hurt' };

export function foeSprites(scene, cast, f, ms) {
  // Knocked out: sits dazed, then blinks away.
  if (f.state === 'ko' && f.t > 16 && Math.floor(f.t / 3) % 2) return [];
  if (f.invuln > 0 && f.invuln % 4 < 2) return [];
  const anim = ANIM[f.state] ?? 'idle';
  const flip = f.facing < 0;
  const sink = ['down', 'ko'].includes(f.state) ? 12 : 0;
  const top = f.y - 40 - f.z + sink;
  const name = `${f.kind}.${anim}`;
  if (f.kind === 'associate' && cast.animations.includes(`associate.${CAST[anim] ?? 'hurt'}`)) {
    return cast.frame(`associate.${CAST[anim] ?? 'hurt'}`, anim === 'windup' ? 0 : ms, f.x - 12, top, flip);
  }
  // A telegraph flashes the wind-up a frame in four.
  const palette = anim === 'windup' && f.t % 8 < 2 ? [0x0f, 0x30, 0x30] : PALETTES[f.kind];
  const flash = palette === PALETTES[f.kind] ? '' : ':flash';
  return artOr(scene, name + flash, { w: 24, h: 40 - sink, palette }).frame(anim, ms, f.x - 12, top, flip);
}

export function tapeSprites(scene, tape) {
  return artOr(scene, 'counsel.tape', { w: 16, h: 8, palette: [0x0f, 0x16, 0x30] }).frame('tape', 0, tape.x - 8, tape.y - 28);
}

export function bindSprites(scene, p) {
  return artOr(scene, 'counsel.bind', { w: 24, h: 8, palette: [0x0f, 0x16, 0x30] }).frame('bind', 0, p.x - 12, p.y - 26 - p.z);
}
