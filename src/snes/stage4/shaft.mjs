// Stage 4 as an escape climb under ?snes&go=shaft: the auditor climbs the express elevator shaft by girder,
// cable and car ahead of a runaway car rising in surges, through the checkpoint to the top landing where
// Bellwether's signature waits. Boxes stand in for every sprite; the climb has its own song. ?bot lets the
// shaft bot play; ?frames=<n> plays that many frames first (with the bot under ?bot), for a screenshot.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString, measure } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { createPad, pollPad, updatePad, PADS } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { HEALTH } from '../../stage2/player.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { CAR, CHECKPOINT_LEDGE, FLOORS, SHAFT, TOP_LEDGE, createShaft, floorsClimbed, stepShaft } from '../../stage4/shaft.mjs';
import { botButtons, createBot } from '../../stage4/shaftbot.mjs';
import { mountControls } from '../../controls.mjs';
import { playSong } from '../audio/player.mjs';
import { SHAFT_SONG } from '../audio/cues.mjs';

const GREY = { back: 0x26262c, rail: 0x34343a, tile: 0x6a6a72, edge: 0x8a8a92, cable: 0x9a9aa2, car: 0x7a7a84, roof: 0xb0b0b8 };
const WHITE = rgb15(31, 31, 31);
const DIM = rgb15(20, 20, 22);
const RED = rgb15(31, 12, 12);
const TITLES = { clear: 'STAGE CLEAR', 'game over': 'GAME OVER' };

export class SnesShaftScene extends Phaser.Scene {
  constructor() {
    super('shaft');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.who = AUDITORS.includes(params.get('who')) ? params.get('who') : 'ward';
    this.autoplay = params.has('bot');
    this.restart();
    this.g = this.add.graphics();
    this.hud = this.add.graphics().setScrollFactor(0);
    this.fill = (x, y, w, h, c) => this.hud.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.controls = mountControls('stage2');
    this.events.once('shutdown', () => this.controls.remove());
    const idle = pollPad(-1);
    for (let i = 0; i < Number(params.get('frames') ?? 0); i++) stepShaft(this.s, this.autoplay ? this.botPad() : idle);
  }

  restart() {
    this.s = createShaft(this.who);
    this.bot = createBot();
    this.pad = createPad(PADS.snes);
    playSong(this.song = SHAFT_SONG);
  }

  // The climb plays until the run ends: the clear gets its fanfare, a lost run the game-over sting.
  cue() {
    const song = { clear: 'stageClear', 'game over': 'gameOver' }[this.s.over?.kind] ?? SHAFT_SONG;
    if (song !== this.song) playSong(this.song = song);
  }

  botPad() {
    this.pad = updatePad(this.pad, botButtons(this.bot, this.s));
    return this.pad;
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const { s } = this;
    if (s.over && s.over.t > 45 && (pad.pressed.has('a') || pad.pressed.has('start'))) this.restart();
    else stepShaft(s, this.autoplay ? this.botPad() : pad);
    this.cue();
    this.draw();
  }

  draw() {
    const { s } = this;
    const { run } = s;
    const { area } = run;
    const camY = Math.round(s.camY);
    const view = [camY - 8, camY + HEIGHT + 8];
    this.cameras.main.setScroll(-(WIDTH - area.width) / 2, camY);
    const g = this.g.clear();

    g.fillStyle(GREY.back).fillRect(0, view[0], area.width, HEIGHT + 16);
    for (const x of [2 * TILE, area.width - 2 * TILE - 4]) g.fillStyle(GREY.rail).fillRect(x, view[0], 4, HEIGHT + 16);
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(area.rows - 1, Math.ceil((camY + HEIGHT) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = 0; col < area.cols; col++) {
        if (!area.solid[row * area.cols + col]) continue;
        g.fillStyle(GREY.tile).fillRect(col * TILE, row * TILE, TILE, TILE);
        g.fillStyle(GREY.edge).fillRect(col * TILE, row * TILE, TILE, 1);
      }
    }

    for (const c of SHAFT.cables) {
      if (c.bottom < view[0] || c.top > view[1]) continue;
      g.fillStyle(GREY.cable).fillRect(c.x - 1, c.top, 2, c.bottom - c.top);
      g.fillStyle(0x505058).fillRect(c.x - 3, c.top - 2, 6, 3);
    }

    for (const car of s.cars) {
      if (car.y + CAR.h < view[0] || car.top > view[1]) continue;
      g.fillStyle(0x44444a).fillRect(car.x - 1, car.top - 2 * TILE, 2, car.y - car.top + 2 * TILE);
      g.fillStyle(GREY.car).fillRect(car.x - car.w / 2, car.y, car.w, CAR.h);
      g.fillStyle(GREY.roof).fillRect(car.x - car.w / 2, car.y, car.w, 2);
      const lamp = car.moving ? 0xe0c040 : car.t > 0 && car.y === car.bottom ? 0x80e080 : 0x505058;
      g.fillStyle(lamp).fillRect(car.x - 2, car.y + 4, 4, 3);
    }

    const cp = CHECKPOINT_LEDGE;
    const flagX = cp.c0 * TILE + 4;
    g.fillStyle(0x505058).fillRect(flagX, cp.row * TILE - 28, 2, 28);
    g.fillStyle(s.checkpoint ? 0x80e080 : 0x707078).fillRect(flagX + 2, cp.row * TILE - 28, 10, 7);

    const sig = s.signature;
    const found = s.over?.kind === 'clear';
    g.fillStyle(found ? 0xfff0c0 : 0xb8b09a).fillRect(sig.x - 9, sig.y - 22, 18, 14);
    g.fillStyle(0x3a2a50).fillRect(sig.x - 6, sig.y - 14, 12, 1);
    g.fillStyle(0x505058).fillRect(sig.x - 1, sig.y - 8, 2, 8);
    if (TOP_LEDGE.row * TILE > view[0]) g.fillStyle(0x18181c).fillRect(0, 0, area.width, 3 * TILE);

    for (const k of run.casts) {
      if (k.kind === 'burst') g.lineStyle(1, 0xe0e0a0, 1 - k.age / k.rule.burstFrames).strokeCircle(k.x, k.y, k.rule.radius);
      else g.fillStyle(0x80e080).fillRect(k.x - 3, k.y - 3, 6, 6);
    }
    const p = run.player;
    const h = p.crouch ? 20 : p.h;
    if (!s.dying && !(p.invuln > 0 && p.invuln % 4 < 2)) {
      g.fillStyle(0xdcdcdc).fillRect(p.x - p.w / 2, p.y - h, p.w, h);
      g.fillStyle(0x18181c).fillRect(p.facing > 0 ? p.x + 1 : p.x - 5, p.y - h + 6, 4, 4);
    }

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
    const hud = this.hud.clear();
    hud.fillStyle(0x111114).fillRect(4, 4, 4 + HEALTH * 6, 8);
    for (let i = 0; i < HEALTH; i++) hud.fillStyle(i < p.health ? 0xd8d8d8 : 0x3a3a3e).fillRect(6 + i * 6, 6, 4, 4);
    drawString(this.fill, `LIVES ${s.lives}`, 4, 16, DIM);
    drawString(this.fill, `FLOOR ${floorsClimbed(s)}/${FLOORS}`, 4, 28, DIM);
    const gap = Math.max(0, Math.round((s.runaway.y - p.y) / TILE));
    drawString(this.fill, `CAR ${gap}`, 4, 40, gap < 4 || s.runaway.warn > 0 ? RED : DIM);
    drawString(this.fill, 'THE SHAFT', WIDTH - 76, 6, WHITE);
    if (s.events.some((e) => e.type === 'checkpoint')) this.cpShown = 90;
    if (this.cpShown > 0 && this.cpShown--) drawString(this.fill, 'CHECKPOINT', WIDTH - 84, 18, rgb15(16, 28, 16));
    else if (s.runaway.warn > 0 && s.runaway.warn % 20 < 12) drawString(this.fill, 'BRAKES OUT', WIDTH - 84, 18, RED);
    const title = s.dying ? (s.dying === 'caught' ? 'CRUSHED' : 'WORN DOWN') : TITLES[s.over?.kind];
    if (!title) return;
    if (s.over?.kind === 'clear') return this.drawSignature();
    hud.fillStyle(0x000000, 0.6).fillRect(0, HEIGHT / 2 - 20, WIDTH, 40);
    drawString(this.fill, title, WIDTH / 2 - title.length * 4, HEIGHT / 2 - 12, WHITE);
    const sub = s.over ? 'JUMP TO RETRY' : 'BACK TO THE CHECKPOINT';
    drawString(this.fill, sub, WIDTH / 2 - sub.length * 4, HEIGHT / 2 + 2, DIM);
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
