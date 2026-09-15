// Stage 2's Associates: walk a ledge, stop, wind up and cast a slow seal glyph at the auditor. Pure.
import { solidPoint } from './physics.mjs';
import { INVULN, HEALTH } from './player.mjs';

export const ASSOCIATE = { w: 12, h: 32, hp: 3, walk: 0.4, sight: 150, windUp: 24, rest: 110, glyphSpeed: 1.1, glyphLife: 240, down: 40 };

export const createAssociate = ({ x, y }) => ({
  kind: 'associate', x, y, w: ASSOCIATE.w, h: ASSOCIATE.h, hp: ASSOCIATE.hp, facing: -1, vx: 0,
  windUp: 0, rest: 60, frozen: 0, flash: 0, down: 0,
});

// One frame of every Associate. Answers the events; new glyphs go on `glyphs`.
export function stepFoes(foes, glyphs, player, area) {
  const events = [];
  const keep = foes.filter((f) => {
    f.flash = Math.max(0, f.flash - 1);
    if (f.hp <= 0) return ++f.down < ASSOCIATE.down;
    if (f.frozen > 0) {
      f.frozen -= 1;
      f.windUp = 0;
      return true;
    }
    f.rest = Math.max(0, f.rest - 1);
    const dx = player.x - f.x;
    if (f.windUp > 0) {
      f.windUp -= 1;
      if (f.windUp === 0) {
        const gx = f.x + f.facing * 8;
        const gy = f.y - 20;
        const len = Math.hypot(player.x - gx, player.y - 16 - gy) || 1;
        glyphs.push({ glyph: true, x: gx, y: gy + 4, w: 8, h: 8, hp: 1, flash: 0, age: 0,
          vx: ((player.x - gx) / len) * ASSOCIATE.glyphSpeed, vy: ((player.y - 16 - gy) / len) * ASSOCIATE.glyphSpeed });
        f.rest = ASSOCIATE.rest;
        events.push({ type: 'glyph', foe: f });
      }
      return true;
    }
    if (Math.abs(dx) < ASSOCIATE.sight && f.rest === 0) {
      f.facing = Math.sign(dx) || f.facing;
      f.windUp = ASSOCIATE.windUp;
      f.vx = 0;
      return true;
    }
    // Walk, turning at a wall or the edge of the ledge.
    const ahead = f.x + f.facing * (f.w / 2 + 1);
    if (solidPoint(area, ahead, f.y - 8) || !solidPoint(area, ahead, f.y + 1)) f.facing = -f.facing;
    f.vx = f.facing * ASSOCIATE.walk;
    f.x += f.vx;
    return true;
  });
  foes.splice(0, foes.length, ...keep);
  return events;
}

// One frame of the glyphs in flight: slow, shootable, gone on a wall or after a while; one touching the
// auditor costs a pip. Answers the events.
export function stepGlyphs(glyphs, player, area) {
  const events = [];
  const keep = glyphs.filter((g) => {
    if (g.hp <= 0) return false;
    g.age += 1;
    g.x += g.vx;
    g.y += g.vy;
    const touch = Math.abs(g.x - player.x) < (g.w + player.w) / 2 && g.y > player.y - player.h && g.y - g.h < player.y;
    if (touch && !player.invuln) {
      player.health -= 1;
      player.invuln = INVULN;
      events.push({ type: 'hurt' });
      if (player.health <= 0) {
        player.health = HEALTH;
        events.push({ type: 'lifeLost' });
      }
      return false;
    }
    return g.age < ASSOCIATE.glyphLife && !solidPoint(area, g.x, g.y - g.h / 2);
  });
  glyphs.splice(0, glyphs.length, ...keep);
  return events;
}
