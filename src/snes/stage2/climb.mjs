// Stage 2 as an escape climb under ?snes&go=archive: the auditor climbs the Archive's grey shelving ahead
// of a rising paper flood, past Associates and falling paper, through the checkpoint to the Records
// Custodian at the top. Boxes stand in for every sprite. ?bot lets the climb bot play; ?frames=<n> plays
// that many frames first (with the bot under ?bot), for a screenshot.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { createPad, pollPad, updatePad, PADS } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { HEALTH } from '../../stage2/player.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { ARCHIVE, CHECKPOINT_LEDGE, DROP, LEDGES, createArchive, ledgesClimbed, stepArchive } from '../../stage2/climb.mjs';
import { botButtons, createBot } from '../../stage2/climbbot.mjs';
import { mountControls } from '../../controls.mjs';

const GREY = { back: 0x2a2a30, column: 0x303036, tile: 0x6a6a72, edge: 0x8a8a92, flood: 0x9a9aa2, foam: 0xd0d0d6 };
const WHITE = rgb15(31, 31, 31);
const DIM = rgb15(20, 20, 22);
const RED = rgb15(31, 12, 12);
const TITLES = { clear: 'STAGE CLEAR', 'game over': 'GAME OVER' };

export class SnesArchiveClimbScene extends Phaser.Scene {
  constructor() {
    super('archiveclimb');
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
    for (let i = 0; i < Number(params.get('frames') ?? 0); i++) stepArchive(this.s, this.autoplay ? this.botPad() : idle);
  }

  restart() {
    this.s = createArchive(this.who);
    this.bot = createBot();
    this.pad = createPad(PADS.snes);
  }

  botPad() {
    this.pad = updatePad(this.pad, botButtons(this.bot, this.s));
    return this.pad;
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const { s } = this;
    if (s.over && s.over.t > 45 && (pad.pressed.has('a') || pad.pressed.has('start'))) this.restart();
    else stepArchive(s, this.autoplay ? this.botPad() : pad);
    this.draw();
  }

  draw() {
    const { s } = this;
    const { run } = s;
    const { area } = run;
    const camY = Math.round(s.camY);
    this.cameras.main.setScroll(-(WIDTH - area.width) / 2, camY);
    const g = this.g.clear();

    g.fillStyle(GREY.back).fillRect(0, camY - 8, area.width, HEIGHT + 16);
    for (let x = 24; x < area.width; x += 48) g.fillStyle(GREY.column).fillRect(x, camY - 8, 8, HEIGHT + 16);
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(area.rows - 1, Math.ceil((camY + HEIGHT) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = 0; col < area.cols; col++) {
        if (!area.solid[row * area.cols + col]) continue;
        g.fillStyle(GREY.tile).fillRect(col * TILE, row * TILE, TILE, TILE);
        g.fillStyle(GREY.edge).fillRect(col * TILE, row * TILE, TILE, 1);
      }
    }

    const cp = ARCHIVE.ledges[CHECKPOINT_LEDGE];
    const flagX = cp.c0 * TILE + 4;
    g.fillStyle(0x505058).fillRect(flagX, cp.row * TILE - 28, 2, 28);
    g.fillStyle(s.checkpoint ? 0x80e080 : 0x707078).fillRect(flagX + 2, cp.row * TILE - 28, 10, 7);

    const { custodian } = s;
    g.fillStyle(s.over?.kind === 'clear' ? 0xffffff : 0x8a7aa0).fillRect(custodian.x - 7, custodian.y - 36, 14, 36);
    g.fillStyle(0x18181c).fillRect(custodian.x - 5, custodian.y - 30, 4, 4);

    for (const f of run.foes) {
      const alpha = f.hp <= 0 ? 0.35 : 1;
      const flash = f.flash || (f.windUp > 0 && f.windUp % 6 < 3);
      g.fillStyle(flash ? 0xffffff : f.frozen ? 0x8080c0 : 0x9c9c9c, alpha).fillRect(f.x - f.w / 2, f.y - f.h, f.w, f.h);
      g.fillStyle(0x18181c, alpha).fillRect(f.facing > 0 ? f.x + 1 : f.x - 5, f.y - f.h + 6, 4, 4);
    }
    for (const gl of run.glyphs) g.fillStyle(0xe0a040).fillRect(gl.x - 4, gl.y - 8, 8, 8);
    for (const d of s.drops) {
      g.fillStyle(0xe8e4d0).fillRect(d.x - DROP.w / 2, d.y - DROP.h, DROP.w, DROP.h);
      g.fillStyle(0x9a9a90).fillRect(d.x - DROP.w / 2 + 2, d.y - DROP.h + 3, DROP.w - 4, 1);
    }
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

    const fy = Math.round(s.flood.y);
    const frame = run.frame;
    g.fillStyle(GREY.flood, 0.9).fillRect(0, fy, area.width, Math.max(0, camY + HEIGHT + 8 - fy));
    for (let x = 0; x < area.width; x += 8) g.fillStyle(GREY.foam).fillRect(x, fy - 2 + Math.round(Math.sin((x + frame * 2) / 12) * 2), 8, 3);

    this.drawHud();
  }

  drawHud() {
    const { s } = this;
    const p = s.run.player;
    const hud = this.hud.clear();
    hud.fillStyle(0x111114).fillRect(4, 4, 4 + HEALTH * 6, 8);
    for (let i = 0; i < HEALTH; i++) hud.fillStyle(i < p.health ? 0xd8d8d8 : 0x3a3a3e).fillRect(6 + i * 6, 6, 4, 4);
    drawString(this.fill, `LIVES ${s.lives}`, 4, 16, DIM);
    drawString(this.fill, `LEDGE ${ledgesClimbed(s)}/${LEDGES + 1}`, 4, 28, DIM);
    const gap = Math.max(0, Math.round((s.flood.y - p.y) / TILE));
    drawString(this.fill, `FLOOD ${gap}`, 4, 40, gap < 4 ? RED : DIM);
    drawString(this.fill, 'THE ARCHIVE', WIDTH - 92, 6, WHITE);
    if (s.events.some((e) => e.type === 'checkpoint')) this.cpShown = 90;
    if (this.cpShown > 0 && this.cpShown--) drawString(this.fill, 'CHECKPOINT', WIDTH - 84, 18, rgb15(16, 28, 16));
    const title = s.dying ? (s.dying === 'caught' ? 'CAUGHT' : 'WORN DOWN') : TITLES[s.over?.kind];
    if (!title) return;
    hud.fillStyle(0x000000, 0.6).fillRect(0, HEIGHT / 2 - 20, WIDTH, 40);
    drawString(this.fill, title, WIDTH / 2 - title.length * 4, HEIGHT / 2 - 12, WHITE);
    const sub = s.over?.kind === 'clear' ? 'THE CUSTODIAN WILL SEE YOU' : s.over ? 'JUMP TO RETRY' : 'BACK TO THE CHECKPOINT';
    drawString(this.fill, sub, WIDTH / 2 - sub.length * 4, HEIGHT / 2 + 2, DIM);
  }
}
