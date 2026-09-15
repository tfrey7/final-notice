// Stage 4 as an escape climb under ?snes&go=shaft: the auditor climbs the express elevator shaft by girder,
// cable and car ahead of a runaway car rising in surges, through the checkpoint to the top landing where
// Bellwether's signature waits. Boxes stand in for every sprite; the climb has its own song. ?bot lets the
// shaft bot play; ?frames=<n> plays that many frames first (with the bot under ?bot), for a screenshot.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString, measure } from '../text.mjs';
import { rgb15 } from '../color.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { CAR, CHECKPOINT_LEDGE, FLOORS, SHAFT, TOP_LEDGE, createShaft, floorsClimbed, stepShaft } from '../../stage4/shaft.mjs';
import { botButtons, createBot } from '../../stage4/shaftbot.mjs';
import { SHAFT_SONG } from '../audio/cues.mjs';
import { ClimbStageScene, DIM, RED, WHITE } from '../climb/scene.mjs';

const GREY = { back: 0x26262c, rail: 0x34343a, tile: 0x6a6a72, edge: 0x8a8a92, cable: 0x9a9aa2, car: 0x7a7a84, roof: 0xb0b0b8 };
const TITLES = { clear: 'STAGE CLEAR', 'game over': 'GAME OVER' };

export class SnesShaftScene extends ClimbStageScene {
  constructor() {
    super('shaft');
    Object.assign(this, { climbSong: SHAFT_SONG, retryAfter: 45, bots: { botButtons, createBot } });
  }

  fresh() {
    return createShaft(this.who);
  }

  step(s, pad) {
    stepShaft(s, pad);
  }

  draw() {
    const { s } = this;
    const { run } = s;
    const { area } = run;
    const camY = Math.round(s.camY);
    const view = [camY - 8, camY + HEIGHT + 8];
    const g = this.frameView(area, camY);

    g.fillStyle(GREY.back).fillRect(0, view[0], area.width, HEIGHT + 16);
    for (const x of [2 * TILE, area.width - 2 * TILE - 4]) g.fillStyle(GREY.rail).fillRect(x, view[0], 4, HEIGHT + 16);
    this.drawTiles(g, area, camY, GREY.tile, GREY.edge);
    this.drawCables(g, SHAFT.cables, view, GREY.cable);

    for (const car of s.cars) {
      if (car.y + CAR.h < view[0] || car.top > view[1]) continue;
      g.fillStyle(0x44444a).fillRect(car.x - 1, car.top - 2 * TILE, 2, car.y - car.top + 2 * TILE);
      g.fillStyle(GREY.car).fillRect(car.x - car.w / 2, car.y, car.w, CAR.h);
      g.fillStyle(GREY.roof).fillRect(car.x - car.w / 2, car.y, car.w, 2);
      const lamp = car.moving ? 0xe0c040 : car.t > 0 && car.y === car.bottom ? 0x80e080 : 0x505058;
      g.fillStyle(lamp).fillRect(car.x - 2, car.y + 4, 4, 3);
    }

    this.drawFlag(g, CHECKPOINT_LEDGE, s.checkpoint);

    const sig = s.signature;
    const found = s.over?.kind === 'clear';
    g.fillStyle(found ? 0xfff0c0 : 0xb8b09a).fillRect(sig.x - 9, sig.y - 22, 18, 14);
    g.fillStyle(0x3a2a50).fillRect(sig.x - 6, sig.y - 14, 12, 1);
    g.fillStyle(0x505058).fillRect(sig.x - 1, sig.y - 8, 2, 8);
    if (TOP_LEDGE.row * TILE > view[0]) g.fillStyle(0x18181c).fillRect(0, 0, area.width, 3 * TILE);

    this.drawCasts(g, run.casts);
    this.drawAuditor(g, run.player, s.dying);

    const r = s.runaway;
    const ry = Math.round(r.y);
    const alarm = r.warn > 0 && r.warn % 10 < 5;
    g.fillStyle(r.surge > 0 ? 0xa05050 : 0x6e5a5a).fillRect(8, ry, area.width - 16, Math.max(0, view[1] - ry));
    for (let x = 8; x < area.width - 8; x += 16) g.fillStyle(alarm ? 0xff4040 : 0xd0b040).fillRect(x, ry, 8, 3);
    g.fillStyle(0x18181c).fillRect(area.width / 2 - 12, ry + 8, 24, 6);
    if (ry > view[1] - 8) {
      const near = Math.max(0, 1 - (ry - camY - HEIGHT) / 120);
      for (let x = 8; x < area.width - 8; x += 16) g.fillStyle(alarm ? 0xff4040 : 0xd0b040, 0.3 + 0.7 * near).fillRect(x, camY + HEIGHT - 3, 8, 3);
    }

    this.drawHud();
  }

  drawHud() {
    const { s } = this;
    const p = s.run.player;
    const gap = Math.max(0, Math.round((s.runaway.y - p.y) / TILE));
    this.drawStatus(p, [
      [`LIVES ${s.lives}`, DIM],
      [`FLOOR ${floorsClimbed(s)}/${FLOORS}`, DIM],
      [`CAR ${gap}`, gap < 4 || s.runaway.warn > 0 ? RED : DIM],
    ]);
    drawString(this.fill, 'THE SHAFT', WIDTH - 76, 6, WHITE);
    if (!this.noticeCheckpoint() && s.runaway.warn > 0 && s.runaway.warn % 20 < 12) drawString(this.fill, 'BRAKES OUT', WIDTH - 84, 18, RED);
    const title = s.dying ? (s.dying === 'caught' ? 'CRUSHED' : 'WORN DOWN') : TITLES[s.over?.kind];
    if (!title) return;
    if (s.over?.kind === 'clear') return this.drawSignature();
    this.banner(title, s.over ? 'JUMP TO RETRY' : 'BACK TO THE CHECKPOINT');
  }

  // The stub for the stage's reward: the signed form found on the top landing.
  drawSignature() {
    const hud = this.hud;
    const [w, h] = [200, 88];
    const [x, y] = [(WIDTH - w) / 2, (HEIGHT - h) / 2];
    hud.fillStyle(0x000000, 0.6).fillRect(0, 0, WIDTH, HEIGHT);
    hud.fillStyle(0xe8e0c8).fillRect(x, y, w, h);
    hud.fillStyle(0x18181c).fillRect(x + 2, y + 2, w - 4, 1).fillRect(x + 12, y + 58, w - 24, 1);
    const line = (text, dy, c) => drawString(this.fill, text, Math.round((WIDTH - measure(text)) / 2), y + dy, c);
    line('STAGE CLEAR', 8, rgb15(6, 6, 8));
    line('A SIGNATURE ON FILE', 24, rgb15(10, 10, 12));
    line('C. BELLWETHER', 44, rgb15(12, 6, 18));
    if (this.s.over.t > 45) line('JUMP TO CLIMB AGAIN', 68, rgb15(10, 10, 12));
  }
}
