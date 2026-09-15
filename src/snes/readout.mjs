// A placeholder fighter's readout on a Phaser graphics, around its body box: type letter, facing
// arrow, one outline or mark per state (src/stage1/readout.mjs), a weapon icon and, on the auditor,
// the Injunction seal. `boxes` adds the debug overlay: hurt and hit boxes, the turn owner, a state tag.
import { drawString, measure } from './text.mjs';
import { rgb15 } from './color.mjs';
import { injunctionLook, readout } from '../stage1/readout.mjs';

const WHITE = rgb15(31, 31, 31);
const TAG = rgb15(31, 28, 10);
const STAR = 0xf0d040;
const SHIELD = 0x5080e0;
const STRIKE = 0xe0a040;
export const WEAPON_COLOUR = { stapler: 0x303038, binder: 0x3464b4, extinguisher: 0xd83828, stamp: 0xc02838 };

// body: { x centre, top, w, h, feet, lying } in screen px; dx turns a world x into a screen x.
export function drawReadout(g, fill, f, body, { tune, dx = 0, frame = 0, cooldown = null, boxes = false, turn = false }) {
  const r = readout(f, tune);
  const { x, top, w, h, feet, lying } = body;
  const left = x - w / 2;
  const ahead = x + f.facing * (w / 2);

  if (r.look === 'windup') {
    // The outline flashes and stretches toward the strike as the wind-up runs out.
    const grow = Math.round(r.windup * 10);
    g.lineStyle(2, f.t % 8 < 4 ? STRIKE : 0xffffff).strokeRect(f.facing > 0 ? left - 1 : left - 1 - grow, top - 1, w + 2 + grow, h + 2);
  } else if (!r.blink) {
    g.lineStyle(['idle', 'walk'].includes(r.look) ? 1 : 2, r.colour).strokeRect(left, top, w, h);
  }
  if (r.hit) g.fillStyle(STRIKE, 0.45).fillRect(r.hit.x + dx, top + 14, r.hit.w, Math.max(10, r.hit.h)).lineStyle(1, STRIKE).strokeRect(r.hit.x + dx, top + 14, r.hit.w, Math.max(10, r.hit.h));
  if (!lying) {
    const tip = ahead + f.facing * 7;
    g.fillStyle(0xffffff).fillTriangle(ahead + f.facing * 2, top + 2, ahead + f.facing * 2, top + 12, tip, top + 7);
  }
  if (r.shield) g.fillStyle(SHIELD).fillRect(ahead + (f.facing > 0 ? 2 : -6), top + 4, 4, h - 8).lineStyle(1, 0xffffff).strokeRect(ahead + (f.facing > 0 ? 2 : -6), top + 4, 4, h - 8);
  if (r.look === 'open') {
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.2 + i * 2.094;
      const sx = Math.round(x + Math.cos(a) * 11);
      const sy = Math.round(top - 20 + Math.sin(a) * 3);
      g.fillStyle(STAR).fillRect(sx - 2, sy - 1, 5, 3).fillRect(sx - 1, sy - 2, 3, 5);
    }
    // The free-combo window draining away under the stars.
    g.fillStyle(STAR).fillRect(x - 10, top - 14, Math.ceil((20 * r.openLeft) / (f.stagger || 1)), 2);
  }

  const lw = measure(r.letter);
  drawString(fill, r.letter, Math.round(x - lw / 2), top - 11, WHITE);
  if (r.weapon) g.fillStyle(WEAPON_COLOUR[r.weapon] ?? 0x808080).fillRect(Math.round(x + lw / 2) + 3, top - 10, 6, 6).lineStyle(1, 0xffffff).strokeRect(Math.round(x + lw / 2) + 3, top - 10, 6, 6);
  const seal = f.team === 'player' && injunctionLook(cooldown);
  if (seal) {
    const sx = Math.round(x - lw / 2) - 11;
    if (seal.ready) g.fillStyle(0xc02838).fillRect(sx, top - 10, 7, 7).lineStyle(1, frame % 30 < 15 ? 0xffffff : 0xe0d0a0).strokeRect(sx, top - 10, 7, 7);
    else {
      g.fillStyle(0x2a2a2e).fillRect(sx, top - 10, 7, 7);
      g.fillStyle(0xd8b050).fillRect(sx + 1, top - 4 - Math.round((5 * seal.lit) / seal.of), 5, Math.round((5 * seal.lit) / seal.of));
    }
  }

  if (!boxes) return;
  g.lineStyle(1, 0x40ff60).strokeRect(left, top, w, h);
  if (r.hit) g.lineStyle(1, 0xff4040).strokeRect(r.hit.x + dx, r.hit.y, r.hit.w, r.hit.h);
  if (turn) g.fillStyle(0xffe040).fillTriangle(x - 5, top - 26, x + 5, top - 26, x, top - 20);
  const tw = measure(r.tag);
  // Foes' tags sit a line below the auditors', so a foe standing on him never runs into his.
  drawString(fill, r.tag, Math.round(x - tw / 2), feet + (f.team === 'player' ? 3 : 13), TAG);
}
