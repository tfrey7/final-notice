// Stage 2's enchantments, pickups, Associates, glyphs and wax locks on screen, through artOr.
import { nes } from '../nes/palette.mjs';
import { WIDTH } from '../nes/screen.mjs';

const MS = 1000 / 60;
const C = { tape: nes(0x16), ink: nes(0x02), inkLit: nes(0x21), wax: nes(0x06), waxLit: nes(0x16), ledger: nes(0x37), tab: nes(0x28), glyph: nes(0x15), burst: nes(0x38), flash: nes(0x30) };
const TABS = { carbonCopy: nes(0x30), redTape: nes(0x16), margin: nes(0x21) };
const SPRITE = { seal: 'notice', paper: 'carbonCopy', page: 'margin' };

export function loadActorArt(scene, artOr) {
  return {
    spells: artOr(scene, 'spells', { w: 8, h: 8, palette: [0x16, 0x28, 0x38] }),
    associate: artOr(scene, 'associate2', { w: 16, h: 32, palette: [0x0f, 0x07, 0x27] }),
    custodian: artOr(scene, 'custodian', { w: 16, h: 32, palette: [0x0f, 0x04, 0x24] }),
  };
}

function ring(g, x, y, reach, points, size) {
  for (let i = 0; i < points; i++) {
    const a = (i * 2 * Math.PI) / points;
    g.fillRect(Math.round(x + Math.cos(a) * reach) - (size >> 1), Math.round(y + Math.sin(a) * reach) - (size >> 1), size, size);
  }
}

// Pushes hardware sprites on `sprites` and draws the rest on `fx`.
export function drawActors(run, art, fx, sprites) {
  const cx = run.camX;
  const t = run.frame * MS;
  for (const lock of run.locks) {
    if (lock.hp <= 0) continue;
    const x = lock.x - lock.w / 2 - cx;
    fx.fillStyle(lock.flash ? C.flash : C.wax).fillRect(x, lock.y - lock.h, lock.w, lock.h);
    fx.fillStyle(C.waxLit).fillRect(x + 4, lock.y - 20, 8, 8);
  }
  for (const k of run.pickups) {
    const x = Math.round(k.x - 6 - cx);
    fx.fillStyle(C.ledger).fillRect(x, k.y - 12, 12, 12);
    fx.fillStyle(TABS[k.name]).fillRect(x + 9, k.y - 11, 3, 10).fillRect(x + 2, k.y - 8, 5, 1).fillRect(x + 2, k.y - 5, 5, 1);
  }
  // Off-screen actors send no sprites, or they would use up the 8-a-scanline budget of the ones in view.
  const offscreen = (b) => b.x + 16 < cx || b.x - 16 > cx + WIDTH;
  for (const f of run.foes) {
    if ((f.hp <= 0 && f.down % 4 < 2) || offscreen(f)) continue;
    const anim = f.hp <= 0 ? 'dazed' : f.windUp ? 'cast' : f.vx ? 'walk' : 'idle';
    sprites.push(...art.associate.frame(anim, f.frozen ? 0 : t, Math.round(f.x - 8 - cx), Math.round(f.y - 32), f.facing > 0));
    if (f.flash) fx.fillStyle(C.flash).fillRect(Math.round(f.x - 6 - cx), f.y - 34, 12, 2);
    if (f.frozen) fx.fillStyle(C.tape).fillRect(Math.round(f.x - 8 - cx), f.y - 22, 16, 2).fillRect(Math.round(f.x - 8 - cx), f.y - 12, 16, 2);
  }
  for (const c of run.bosses ?? []) {
    const x = Math.round(c.x - 8 - cx);
    const anim = c.beaten ? 'dazed' : c.phase === 'lunge' ? 'lunge' : c.phase === 'tell' ? 'tell' : c.phase === 'direct' ? 'direct' : 'idle';
    sprites.push(...art.custodian.frame(anim, t, x, Math.round(c.y - 32), c.facing > 0));
    // The tell (NES-CLASSICS L8): he flashes white before every lunge.
    if ((c.phase === 'tell' && run.frame % 6 < 3) || c.flash) {
      fx.fillStyle(C.flash).fillRect(x - 2, c.y - 34, 20, 2).fillRect(x - 2, c.y - 34, 2, 34).fillRect(x + 16, c.y - 34, 2, 34);
    }
  }
  for (const g of run.glyphs) {
    fx.fillStyle(run.frame % 8 < 4 ? C.glyph : C.burst);
    ring(fx, g.x - cx, g.y - g.h / 2, 3, 6, 2);
  }
  for (const c of run.casts) {
    const x = c.x - cx;
    if (c.kind === 'burst') {
      const grow = Math.min(1, (c.age + 3) / 6);
      if (c.spell === 'margin') {
        fx.fillStyle(C.ink);
        ring(fx, x, c.y, c.rule.radius * grow, 12, 4);
        fx.fillStyle(C.inkLit);
        ring(fx, x, c.y, c.rule.radius * grow * 0.5, 6, 3);
      } else {
        fx.fillStyle(C.burst);
        ring(fx, x, c.y, c.rule.radius * grow, 8, 3);
      }
    } else if (c.kind === 'tape') {
      const len = Math.min(c.age * 3, 14);
      const [dx, dy] = [Math.sign(c.vx), Math.sign(c.vy)];
      fx.fillStyle(C.tape);
      for (let i = 0; i < len; i += 2) fx.fillRect(Math.round(x - dx * i), Math.round(c.y - dy * i + ((i >> 1) % 2)), 2, 2);
    } else {
      sprites.push(...art.spells.frame(SPRITE[c.kind], 0, Math.round(x - 4), Math.round(c.y - 4)));
    }
  }
}
