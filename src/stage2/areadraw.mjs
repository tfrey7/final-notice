// Stage 2's wax front, fire doors and teaching prompts on screen.
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { CELL } from '../text/font.mjs';
import { drawText } from '../scenes/placeholder.mjs';
import { TILE } from './physics.mjs';
import { promptsFor } from './areas.mjs';

const C = { wax: nes(0x06), waxLit: nes(0x16), edge: nes(0x27), flash: nes(0x30), door: nes(0x00), bar: nes(0x10), back: nes(0x0f), text: nes(0x30) };
const TOP = SAFE + 24;

export function drawStageParts(g, run) {
  const cx = run.camX;
  const { doors, front } = run.stage;
  for (const d of doors) {
    if (!d.closed) continue;
    const x = d.col * TILE - cx;
    const y = d.top * TILE;
    const h = (d.bottom - d.top + 1) * TILE;
    g.fillStyle(C.door).fillRect(x, y, TILE, h);
    g.fillStyle(C.bar);
    for (let by = y + 6; by < y + h; by += 12) g.fillRect(x + 2, by, TILE - 4, 2);
  }
  const right = Math.round(front.x - cx);
  if (!front.active || right <= 0) return;
  g.fillStyle(C.wax).fillRect(0, TOP, right, HEIGHT - TOP);
  g.fillStyle(C.waxLit);
  for (let y = TOP; y < HEIGHT; y += 16) g.fillRect(right - 10 - (((y >> 4) + (run.frame >> 5)) % 3) * 3, y + 4, 6, 8);
  g.fillStyle(run.frame % 16 < 8 ? C.flash : C.edge).fillRect(right, TOP, 3, HEIGHT - TOP);
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
