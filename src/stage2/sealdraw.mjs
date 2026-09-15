// The Great Seal's arena and the exit run on screen: bulkhead, rail, press, bindings, the Director and his seal.
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { drawText } from '../text/font.mjs';
import { DIRECTOR, FLOOR_Y, SEAL, sealOpen } from './greatseal.mjs';

const MS = 1000 / 60;
const RAIL = 48;
const C = {
  wall: nes(0x0f), panel: nes(0x00), rivet: nes(0x10), wax: nes(0x06), waxLit: nes(0x16), brass: nes(0x28), brassDark: nes(0x18),
  brassLit: nes(0x38), shadow: nes(0x00), tape: nes(0x16), flash: nes(0x30), gold: nes(0x38), night: nes(0x01), sign: nes(0x1a),
};

export function loadSealArt(scene, artOr) {
  return {
    director: artOr(scene, 'greatseal', { w: 16, h: 32, palette: [0x0f, 0x03, 0x13] }),
  };
}

// The background under the tiles: the bulkhead straining against the wax, the Director's gantry, the rail.
export function drawSealBack(g, run) {
  g.fillStyle(C.wall).fillRect(0, 0, WIDTH, HEIGHT);
  if (run.exit) {
    g.fillStyle(C.night).fillRect(0, SAFE + 24, WIDTH, 120);
    const x = run.exit.end - run.camX;
    g.fillStyle(C.sign).fillRect(x - 12, 150, 36, 14);
    drawText(g, 'EXIT', x - 10, 153, C.flash);
    return;
  }
  for (let y = SAFE + 32; y < FLOOR_Y; y += 24) {
    g.fillStyle(C.panel).fillRect(16, y, 20, 22);
    g.fillStyle(C.rivet).fillRect(18, y + 2, 2, 2).fillRect(32, y + 18, 2, 2);
    g.fillStyle((run.frame >> 4) % 2 ? C.waxLit : C.wax).fillRect(16, y + 22, 6 + ((y >> 3) % 3) * 2, 2);
  }
  g.fillStyle(C.brassDark).fillRect(16, RAIL - 4, WIDTH - 32, 4);
  g.fillStyle(C.brass).fillRect(16, RAIL, WIDTH - 32, 2);
  g.fillStyle(C.rivet).fillRect(DIRECTOR.x - 24, DIRECTOR.y, 40, 4).fillRect(DIRECTOR.x - 22, DIRECTOR.y + 4, 3, FLOOR_Y - DIRECTOR.y - 4);
}

function drawBinding(g, b) {
  g.fillStyle(C.brassDark).fillRect(b.x - 1, RAIL + 2, 2, b.y - b.h - RAIL - 2);
  if (b.hp <= 0) {
    g.fillStyle(C.wax).fillRect(b.x - 3, b.y - b.h, 6, 4);
    return;
  }
  const x = b.x - b.w / 2;
  g.fillStyle(b.flash ? C.flash : C.wax).fillRect(x + 2, b.y - b.h, b.w - 4, b.h).fillRect(x, b.y - b.h + 2, b.w, b.h - 4);
  g.fillStyle(C.waxLit).fillRect(x + 5, b.y - b.h + 5, 6, 6);
  g.fillStyle(C.shadow);
  for (let i = b.hp; i < SEAL.bindingHp; i++) g.fillRect(x + 3 + i * 2, b.y - b.h + 3 + (i % 2) * 7, 1, 4);
}

function drawPress(g, run) {
  const b = run.boss;
  const s = b.stamp;
  const x = s ? s.x : 128;
  let headY = RAIL + 20;
  if (s) {
    g.fillStyle(C.shadow);
    const grow = Math.min(1, s.t / s.shadow);
    const half = Math.round(8 + grow * 10);
    if (s.t < s.shadow && (s.t > s.shadow - 12 || s.t % 8 < 6)) g.fillRect(x - half, s.y - 3, half * 2, 3).fillRect(x - half + 3, s.y - 5, half * 2 - 6, 2);
    const drop = s.t < s.shadow - 8 ? 0 : s.t < s.shadow ? (s.t - s.shadow + 8) / 8 : s.t < s.shadow + SEAL.slam * 2 ? 1 : 1 - (s.t - s.shadow - SEAL.slam * 2) / SEAL.slam;
    headY = Math.round(RAIL + 20 + drop * (s.y - RAIL - 20));
  }
  g.fillStyle(C.brassDark).fillRect(x - 12, RAIL - 6, 24, 10);
  g.fillStyle(C.brass).fillRect(x - 3, RAIL + 4, 6, headY - RAIL - 20);
  g.fillStyle(C.brass).fillRect(x - SEAL.headHalf, headY - 16, SEAL.headHalf * 2, 16);
  g.fillStyle(C.brassLit).fillRect(x - SEAL.headHalf + 2, headY - 14, SEAL.headHalf * 2 - 4, 2);
  g.fillStyle(C.wax).fillRect(x - 8, headY - 4, 16, 4);
  if (s && s.t >= s.shadow && s.t < s.shadow + 4) {
    g.fillStyle(C.flash).fillRect(x - 26, s.y - 2, 8, 2).fillRect(x + 18, s.y - 2, 8, 2).fillRect(x - 24, s.y - 8, 4, 4).fillRect(x + 20, s.y - 8, 4, 4);
  }
}

function drawTape(g, run) {
  const t = run.boss.tape;
  if (!t) return;
  if (t.t <= SEAL.tapeWarn) {
    if (t.t % 8 < 4) g.fillStyle(C.tape).fillRect(t.dir > 0 ? 16 : WIDTH - 22, FLOOR_Y - 12, 6, 12);
    return;
  }
  g.fillStyle(C.tape);
  for (let i = 0; i < 24; i += 2) g.fillRect(Math.round(t.x - t.dir * i), FLOOR_Y - 8 + ((i + (run.frame >> 1)) % 4 < 2 ? 0 : 2), 2, 3);
}

// Pushes the Director's sprite on `sprites` and draws the press on `fx`.
export function drawSeal(fx, run, art, sprites) {
  if (run.exit) return;
  const b = run.boss;
  const down = b.state === 'down';
  for (const x of b.bindings) drawBinding(fx, x);
  sprites.push(...art.director.frame(down ? 'director.down' : 'director.idle', run.frame * MS, DIRECTOR.x - 8, DIRECTOR.y - 32 + (down ? 8 : 0)));
  const seal = b.seal;
  const cx = seal.x;
  const cy = seal.y - seal.h / 2;
  if (!down) {
    if (sealOpen(b)) {
      fx.fillStyle(seal.flash ? C.flash : C.gold).fillRect(cx - 7, cy - 5, 14, 10).fillRect(cx - 5, cy - 7, 10, 14);
      fx.fillStyle(run.frame % 16 < 8 ? C.flash : C.waxLit).fillRect(cx - 3, cy - 3, 6, 6);
    } else {
      fx.fillStyle(C.wax).fillRect(cx - 5, cy - 5, 10, 10);
      fx.fillStyle(C.brass).fillRect(cx - 1, cy - 5, 2, 10).fillRect(cx - 5, cy - 1, 10, 2);
    }
  }
  drawPress(fx, run);
  drawTape(fx, run);
  for (const s of b.shots) {
    fx.fillStyle(s.flash ? C.flash : C.wax).fillRect(s.x - 4, s.y - 7, 8, 6).fillRect(s.x - 3, s.y - 8, 6, 8);
    fx.fillStyle(C.gold).fillRect(s.x - 1, s.y - 5, 2, 2);
  }
}
