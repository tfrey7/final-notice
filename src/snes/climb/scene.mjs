// What every grey-box climb scene draws and runs. ClimbScene holds the drawing the climbs and the climb lab
// share; ClimbStageScene adds a stage's loop: the run flow, the bot, the song, the dial panel, retry and
// ?frames=<n> (with the bot under ?bot). A stage keeps only its own layout, hazard, boss and titles.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { createPad, pollPad, updatePad, PADS } from '../../input.mjs';
import { showFlow } from '../../flow.mjs';
import { climbFlow, climber, inRun } from '../runflow.mjs';
import { HEALTH } from '../../stage2/player.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { mountControls } from '../../controls.mjs';
import { drawPrompt } from '../prompt.mjs';
import { playSong } from '../audio/player.mjs';

export const WHITE = rgb15(31, 31, 31);
export const DIM = rgb15(20, 20, 22);
export const RED = rgb15(31, 12, 12);
const SHELVING = { back: 0x2a2a30, column: 0x303036, tile: 0x6a6a72, edge: 0x8a8a92, flood: 0x9a9aa2, foam: 0xd0d0d6 };
const REPEAT = { delay: 14, every: 3 };
const RESULT_SONG = { clear: 'stageClear', 'game over': 'gameOver' };

export class ClimbScene extends Phaser.Scene {
  mountHud() {
    this.g = this.add.graphics();
    this.hud = this.add.graphics().setScrollFactor(0);
    this.fill = (x, y, w, h, c) => this.hud.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.repeat = { dir: 0, t: 0 };
  }

  // Centres the course across the screen at the camera's height and hands back a clean canvas.
  frameView(area, camY) {
    this.cameras.main.setScroll(-(WIDTH - area.width) / 2, camY);
    return this.g.clear();
  }

  drawTiles(g, area, camY, tile, edge) {
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const r1 = Math.min(area.rows - 1, Math.ceil((camY + HEIGHT) / TILE));
    for (let row = r0; row <= r1; row++) {
      for (let col = 0; col < area.cols; col++) {
        if (!area.solid[row * area.cols + col]) continue;
        g.fillStyle(tile).fillRect(col * TILE, row * TILE, TILE, TILE);
        g.fillStyle(edge).fillRect(col * TILE, row * TILE, TILE, 1);
      }
    }
  }

  // The Archive's grey shelving: back wall, columns and shelves.
  drawShelving(g, area, camY) {
    g.fillStyle(SHELVING.back).fillRect(0, camY - 8, area.width, HEIGHT + 16);
    for (let x = 24; x < area.width; x += 48) g.fillStyle(SHELVING.column).fillRect(x, camY - 8, 8, HEIGHT + 16);
    this.drawTiles(g, area, camY, SHELVING.tile, SHELVING.edge);
  }

  drawFlood(g, area, camY, y, frame) {
    const fy = Math.round(y);
    g.fillStyle(SHELVING.flood, 0.9).fillRect(0, fy, area.width, Math.max(0, camY + HEIGHT + 8 - fy));
    for (let x = 0; x < area.width; x += 8) g.fillStyle(SHELVING.foam).fillRect(x, fy - 2 + Math.round(Math.sin((x + frame * 2) / 12) * 2), 8, 3);
  }

  drawCables(g, cables, view, colour) {
    for (const c of cables) {
      if (c.bottom < view[0] || c.top > view[1]) continue;
      g.fillStyle(colour).fillRect(c.x - 1, c.top, 2, c.bottom - c.top);
      g.fillStyle(0x505058).fillRect(c.x - 3, c.top - 2, 6, 3);
    }
  }

  drawFlag(g, ledge, reached) {
    const flagX = ledge.c0 * TILE + 4;
    g.fillStyle(0x505058).fillRect(flagX, ledge.row * TILE - 28, 2, 28);
    g.fillStyle(reached ? 0x80e080 : 0x707078).fillRect(flagX + 2, ledge.row * TILE - 28, 10, 7);
  }

  drawFoes(g, run) {
    for (const f of run.foes) {
      const alpha = f.hp <= 0 ? 0.35 : 1;
      const flash = f.flash || (f.windUp > 0 && f.windUp % 6 < 3);
      g.fillStyle(flash ? 0xffffff : f.frozen ? 0x8080c0 : 0x9c9c9c, alpha).fillRect(f.x - f.w / 2, f.y - f.h, f.w, f.h);
      g.fillStyle(0x18181c, alpha).fillRect(f.facing > 0 ? f.x + 1 : f.x - 5, f.y - f.h + 6, 4, 4);
    }
    for (const gl of run.glyphs) g.fillStyle(0xe0a040).fillRect(gl.x - 4, gl.y - 8, 8, 8);
  }

  drawCasts(g, casts, colour = () => 0x80e080) {
    for (const k of casts) {
      if (k.kind === 'burst') g.lineStyle(1, 0xe0e0a0, 1 - k.age / k.rule.burstFrames).strokeCircle(k.x, k.y, k.rule.radius);
      else g.fillStyle(colour(k)).fillRect(k.x - 3, k.y - 3, 6, 6);
    }
  }

  // The auditor's box, blinking while invulnerable; answers the height drawn, or 0 when hidden.
  drawAuditor(g, p, dying = null) {
    const h = p.crouch ? 20 : p.h;
    if (dying || (p.invuln > 0 && p.invuln % 4 < 2)) return 0;
    g.fillStyle(0xdcdcdc).fillRect(p.x - p.w / 2, p.y - h, p.w, h);
    g.fillStyle(0x18181c).fillRect(p.facing > 0 ? p.x + 1 : p.x - 5, p.y - h + 6, 4, 4);
    return h;
  }

  // Health pips top left, then one readout line under another: [text, colour].
  drawStatus(p, lines) {
    const hud = this.hud.clear();
    hud.fillStyle(0x111114).fillRect(4, 4, 4 + HEALTH * 6, 8);
    for (let i = 0; i < HEALTH; i++) hud.fillStyle(i < p.health ? 0xd8d8d8 : 0x3a3a3e).fillRect(6 + i * 6, 6, 4, 4);
    lines.forEach(([text, colour], i) => drawPrompt(this.fill, text, 4, 16 + 12 * i, { colour }));
    return hud;
  }

  // A title across the middle of the screen, with a line under it.
  banner(title, sub, x = (text) => WIDTH / 2 - text.length * 4) {
    this.hud.fillStyle(0x000000, 0.6).fillRect(0, HEIGHT / 2 - 20, WIDTH, 40);
    drawString(this.fill, title, x(title), HEIGHT / 2 - 12, WHITE);
    if (sub) drawString(this.fill, sub, x(sub), HEIGHT / 2 + 2, DIM);
  }

  // While the dial panel is open the climb holds still and the pad works the panel.
  drivePanel(pad) {
    if (pad.pressed.has('up')) this.panel.move(-1);
    if (pad.pressed.has('down')) this.panel.move(1);
    const dir = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
    const r = this.repeat;
    if (dir !== r.dir) Object.assign(r, { dir, t: 0 });
    if (dir && (r.t === 0 || (r.t >= REPEAT.delay && (r.t - REPEAT.delay) % REPEAT.every === 0))) this.panel.turn(dir);
    if (dir) r.t++;
    if (pad.pressed.has('a') || pad.pressed.has('b')) this.panel.press();
  }
}

// A stage sets `climbSong` (or overrides cue), `retryAfter`, `bots` ({ createBot, botButtons }), and
// defines fresh() for a new climb state, step(s, pad) for one frame and draw(); setup(params) runs before
// the first restart and mount(params) after the HUD, answering its own cleanup.
export class ClimbStageScene extends ClimbScene {
  create() {
    const params = new URLSearchParams(location.search);
    const flow = this.registry.get('flow');
    const key = this.sys.settings.key;
    this.inRun = inRun(flow, key);
    this.who = climber(flow, key, params);
    this.autoplay = params.has('bot');
    this.setup(params);
    this.restart();
    this.mountHud();
    this.controls = mountControls('stage2');
    const unmount = this.mount(params);
    this.events.once('shutdown', () => {
      unmount?.();
      this.controls.remove();
    });
    const idle = pollPad(-1);
    for (let i = 0; i < Number(params.get('frames') ?? 0); i++) this.step(this.s, this.autoplay ? this.botPad() : idle);
  }

  setup() {}

  mount() {}

  restart() {
    this.s = this.fresh();
    if (this.inRun) this.s.lives = this.registry.get('flow').lives;
    this.bot = this.bots.createBot();
    this.pad = createPad(PADS.snes);
    if (this.climbSong) playSong(this.playing = this.climbSong);
  }

  // The climb plays until the run ends: the clear gets its fanfare, a lost run the game-over sting.
  cue() {
    const song = RESULT_SONG[this.s.over?.kind] ?? this.climbSong;
    if (song !== this.playing) playSong(this.playing = song);
  }

  botPad() {
    this.pad = updatePad(this.pad, this.bots.botButtons(this.bot, this.s));
    return this.pad;
  }

  // True when something other than the climb takes this frame's pad.
  held() {
    return false;
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const { s } = this;
    if (this.held(pad)) this.drivePanel(pad);
    else if (this.inRun) {
      this.step(s, this.autoplay ? this.botPad() : pad);
      if (this.follow(pad)) return;
    } else if (s.over && s.over.t > this.retryAfter && (pad.pressed.has('a') || pad.pressed.has('start'))) this.restart();
    else this.step(s, this.autoplay ? this.botPad() : pad);
    this.cue();
    this.draw();
  }

  follow(pad) {
    const { flow, leave } = climbFlow(this.registry.get('flow'), this.s, pad);
    if (leave) showFlow(this, flow);
    else this.registry.set('flow', flow);
    return leave;
  }

  // The notice top right for 90 frames after the checkpoint; true while it shows.
  noticeCheckpoint(draw = (text, y, c) => drawString(this.fill, text, WIDTH - 84, y, c)) {
    if (this.s.events.some((e) => e.type === 'checkpoint')) this.cpShown = 90;
    if (!(this.cpShown > 0 && this.cpShown--)) return false;
    draw('CHECKPOINT', 18, rgb15(16, 28, 16));
    return true;
  }
}
