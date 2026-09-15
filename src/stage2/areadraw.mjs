// Stage 2's wax front, fire doors and teaching prompts on screen.
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { CELL } from '../text/font.mjs';
import { drawText } from '../scenes/placeholder.mjs';
import { TILE } from './physics.mjs';
import { frontsOf, promptsFor } from './areas.mjs';
import { BELT } from './conveyor.mjs';

const C = { belt: nes(0x00), stand: nes(0x07), ledger: nes(0x37), wax: nes(0x06), waxLit: nes(0x16), edge: nes(0x27), flash: nes(0x30), door: nes(0x00), bar: nes(0x10), back: nes(0x0f), text: nes(0x30) };
const TOP = SAFE + 24;

function drawBelts(g, run) {
  const cx = run.camX;
  const shift = Math.floor(run.frame * BELT.speed) % 8;
  for (const [key, dir] of run.stage.belts) {
    const [col, row] = key.split(',').map(Number);
    const x = col * TILE - cx;
    if (x < -TILE || x > WIDTH) continue;
    g.fillStyle(C.belt).fillRect(x, row * TILE, TILE, 4);
    g.fillStyle(C.bar);
    for (let i = 0; i < TILE; i += 8) {
      const bx = x + ((i + dir * shift + 16) % TILE);
      g.fillRect(bx + (dir > 0 ? 0 : 2), row * TILE + 1, 2, 1).fillRect(bx + 1, row * TILE + 2, 2, 1).fillRect(bx + (dir > 0 ? 0 : 2), row * TILE + 3, 2, 1);
    }
  }
}

function drawLedger(g, run) {
  const { ledger } = run.stage.arena;
  const x = Math.round(ledger.x - run.camX);
  g.fillStyle(C.stand).fillRect(ledger.x - run.camX - 6, ledger.baseY, 12, 3).fillRect(ledger.x - run.camX - 2, ledger.baseY + 3, 4, 13);
  if (ledger.taken) return;
  g.fillStyle(C.ledger).fillRect(x - 7, Math.round(ledger.y) - 9, 14, 9);
  g.fillStyle(C.edge).fillRect(x - 7, Math.round(ledger.y) - 9, 14, 1).fillRect(x - 1, Math.round(ledger.y) - 9, 2, 9);
}

export function drawStageParts(g, run) {
  const cx = run.camX;
  const { doors } = run.stage;
  drawBelts(g, run);
  drawLedger(g, run);
  for (const d of doors) {
    if (!d.closed) continue;
    const x = d.col * TILE - cx;
    const y = d.top * TILE;
    const h = (d.bottom - d.top + 1) * TILE;
    g.fillStyle(C.door).fillRect(x, y, TILE, h);
    g.fillStyle(C.bar);
    for (let by = y + 6; by < y + h; by += 12) g.fillRect(x + 2, by, TILE - 4, 2);
  }
  for (const front of frontsOf(run.stage)) {
    const right = Math.round(front.x - cx);
    if (!front.active || right <= 0) continue;
    g.fillStyle(C.wax).fillRect(0, TOP, right, HEIGHT - TOP);
    g.fillStyle(C.waxLit);
    for (let y = TOP; y < HEIGHT; y += 16) g.fillRect(right - 10 - (((y >> 4) + (run.frame >> 5)) % 3) * 3, y + 4, 6, 8);
    g.fillStyle(run.frame % 16 < 8 ? C.flash : C.edge).fillRect(right, TOP, 3, HEIGHT - TOP);
  }
}

export function drawPrompts(g, run) {
  promptsFor(run).forEach((text, i) => {
    const w = text.length * CELL + 16;
    const x = (WIDTH - w) >> 1;
    const y = TOP + 16 + i * 20;
    g.fillStyle(C.text).fillRect(x, y, w, 16).fillStyle(C.back).fillRect(x + 1, y + 1, w - 2, 14);
    if (run.frame % 60 < 45) drawText(g, text, x + 8, y + 4, C.text);
  });
}
