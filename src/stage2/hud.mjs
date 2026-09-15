// Stage 2's HUD strip: auditor, health pips, lives and the two carried enchantments, the one in hand framed.
// Closer: merge this into src/hud.mjs once Stage 1 core's HUD lands.
import { WIDTH, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { drawText } from '../scenes/placeholder.mjs';
import { HEALTH } from './player.mjs';

const C = { back: nes(0x0f), text: nes(0x30), pip: nes(0x16), empty: nes(0x00), frame: nes(0x28), wax: nes(0x16), gold: nes(0x38), dim: nes(0x2d) };

const ICONS = {
  notice: (g, x, y) => {
    g.fillStyle(C.wax).fillRect(x + 3, y + 2, 10, 12).fillRect(x + 2, y + 3, 12, 10);
    g.fillStyle(C.gold).fillRect(x + 6, y + 5, 4, 6).fillRect(x + 5, y + 6, 6, 4);
  },
};

export function drawStage2Hud(g, run, flow) {
  const p = run.player;
  g.fillStyle(C.back).fillRect(0, SAFE, WIDTH, 24);
  drawText(g, p.auditor.toUpperCase(), 8, SAFE + 2, C.text);
  for (let i = 0; i < HEALTH; i++) g.fillStyle(i < p.health ? C.pip : C.empty).fillRect(8 + i * 6, SAFE + 14, 4, 6);
  drawText(g, `x${flow.lives}`, 64, SAFE + 12, C.text);
  run.carried.forEach((name, i) => {
    const x = WIDTH - 48 + i * 20;
    const y = SAFE + 4;
    g.fillStyle(i === run.hand ? C.frame : C.dim).fillRect(x - 2, y - 2, 20, 20);
    g.fillStyle(C.back).fillRect(x - 1, y - 1, 18, 18);
    if (name && ICONS[name]) ICONS[name](g, x, y);
  });
  if (run.paused) drawText(g, 'PAUSE', WIDTH / 2 - 20, SAFE + 8, C.text);
}
