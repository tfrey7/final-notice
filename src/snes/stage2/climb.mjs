// Stage 2 as an escape climb under ?snes&go=archive: the auditor climbs the Archive's grey shelving ahead
// of a rising paper flood, past Associates and falling paper, through the checkpoint to the Records
// Custodian's arena at the top, where the boss fight clears the stage. Boxes stand in for every sprite.
// ?bot lets the climb bot play; ?boss starts at the arena; Tab (or ?dials) opens his tuning dials;
// ?frames=<n> plays that many frames first (with the bot under ?bot), for a screenshot.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { createPad, pollPad, updatePad, PADS } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { HEALTH } from '../../stage2/player.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { ARCHIVE, ARENA, ARENA_LEDGE, CHECKPOINT_LEDGE, DROP, createArchive, ledgesClimbed, startAtSummit, stepArchive } from '../../stage2/climb.mjs';
import { CUSTODIAN, bossBar, cartBox, createCustodian, custodianDials, custodianTable, sweepBox } from '../../stage2/summit.mjs';
import { mountLabPanel } from '../../lab/panel.mjs';
import { botButtons, createBot } from '../../stage2/climbbot.mjs';
import { isShortcut, mountControls } from '../../controls.mjs';
import { playSong } from '../audio/player.mjs';
import { ARCHIVE_CLIMB_SONG } from '../audio/cues.mjs';

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
    this.atBoss = params.has('boss');
    this.dials = custodianDials();
    this.boss = custodianTable(this.dials);
    this.repeat = { dir: 0, t: 0 };
    this.restart();
    this.g = this.add.graphics();
    this.hud = this.add.graphics().setScrollFactor(0);
    this.fill = (x, y, w, h, c) => this.hud.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.controls = mountControls('stage2');
    this.panel = mountLabPanel({
      dials: this.dials,
      respawnLabel: 'Restart at the Custodian',
      onRespawn: () => { this.atBoss = true; this.restart(); },
      onCopy: () => ['Custodian settings', ...this.dials.map((d) => `${d.key}: ${d.value}`)].join('\n'),
      onReset: () => { this.dials.forEach((d) => { d.value = d.start; }); this.panel.flash('Dials reset.'); },
    });
    const onKey = (e) => { if (isShortcut(e.code, 'dials')) { e.preventDefault(); this.tabbed = true; } };
    window.addEventListener('keydown', onKey);
    if (params.has('dials')) this.panel.toggle(true);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.panel.remove();
      this.controls.remove();
    });
    const idle = pollPad(-1);
    for (let i = 0; i < Number(params.get('frames') ?? 0); i++) stepArchive(this.s, this.autoplay ? this.botPad() : idle);
  }

  restart() {
    this.s = createArchive(this.who, this.boss);
    if (this.atBoss) startAtSummit(this.s);
    this.bot = createBot();
    this.pad = createPad(PADS.snes);
    playSong(this.song = ARCHIVE_CLIMB_SONG);
  }

  // The climb plays until the run ends: the clear gets its fanfare, a lost run the game-over sting.
  cue() {
    const song = { clear: 'stageClear', 'game over': 'gameOver' }[this.s.over?.kind] ?? ARCHIVE_CLIMB_SONG;
    if (song !== this.song) playSong(this.song = song);
  }

  // While the dial panel is open the climb holds still and the pad works the panel.
  drivePanel(pad) {
    if (pad.pressed.has('up')) this.panel.move(-1);
    if (pad.pressed.has('down')) this.panel.move(1);
    const dir = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
    const r = this.repeat;
    if (dir !== r.dir) Object.assign(r, { dir, t: 0 });
    if (dir && (r.t === 0 || (r.t >= 14 && (r.t - 14) % 3 === 0))) this.panel.turn(dir);
    if (dir) r.t++;
    if (pad.pressed.has('a') || pad.pressed.has('b')) this.panel.press();
  }

  botPad() {
    this.pad = updatePad(this.pad, botButtons(this.bot, this.s));
    return this.pad;
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const { s } = this;
    if (this.tabbed) this.panel.toggle();
    this.tabbed = false;
    Object.assign(this.boss, custodianTable(this.dials));
    if (this.panel.visible) this.drivePanel(pad);
    else if (s.over && s.over.t > 45 && (pad.pressed.has('a') || pad.pressed.has('start'))) this.restart();
    else stepArchive(s, this.autoplay ? this.botPad() : pad);
    this.cue();
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

    this.drawCustodian(g, s.fight ?? { ...createCustodian(ARENA), state: 'waiting' });

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

  // His body flashes through a telegraph, the cart rides ahead of him, the mop's reach shows as it swings,
  // and he goes pale while reeling from a parry.
  drawCustodian(g, b) {
    const t = this.boss;
    const alpha = b.beaten ? 0.35 : 1;
    const body = b.flash || (b.state === 'tell' && b.timer % 6 < 3) ? 0xffffff : b.state === 'reel' ? 0xb0b0e0 : b.phase === 2 ? 0xa06a8a : 0x8a7aa0;
    g.fillStyle(body, alpha).fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
    g.fillStyle(0x18181c, alpha).fillRect(b.facing > 0 ? b.x + 3 : b.x - 7, b.y - b.h + 8, 4, 4);
    if (b.beaten) return;
    if (b.attack === 'charge' && ['tell', 'charge'].includes(b.state)) {
      const c = cartBox(b, t);
      g.fillStyle(0x6a5a40).fillRect(c.x - c.w / 2, c.y - c.h, c.w, c.h - 3);
      for (const wx of [c.x - c.w / 2 + 2, c.x + c.w / 2 - 5]) g.fillStyle(0x18181c).fillRect(wx, c.y - 3, 3, 3);
    }
    if (b.attack === 'sweep' && ['tell', 'sweep'].includes(b.state)) {
      const m = sweepBox(b, t);
      if (b.state === 'sweep') g.fillStyle(0xe0e0c0, 0.6).fillRect(m.x - m.w / 2, m.y - m.h, m.w, m.h);
      else g.fillStyle(0xc0b090).fillRect(b.x + b.facing * (b.w / 2) - 1, b.y - b.h - 10, 2, b.h + 10);
    }
    for (const sheet of b.papers) g.fillStyle(0xf0ecd8).fillRect(sheet.x - sheet.w / 2, sheet.y - sheet.h, sheet.w, sheet.h);
  }

  drawHud() {
    const { s } = this;
    const p = s.run.player;
    const hud = this.hud.clear();
    if (s.fight) {
      const b = s.fight;
      const w = Math.floor((WIDTH - 16) / b.maxHp);
      hud.fillStyle(0x111114).fillRect(6, HEIGHT - 26, b.maxHp * w + 4, 22);
      drawString(this.fill, 'THE CUSTODIAN', 8, HEIGHT - 24, WHITE);
      for (const [i, on] of bossBar(b).entries()) hud.fillStyle(on ? (b.phase === 2 ? 0xd05050 : 0xd8b050) : 0x3a3a3e).fillRect(8 + i * w, HEIGHT - 12, w - 1, 6);
    }
    hud.fillStyle(0x111114).fillRect(4, 4, 4 + HEALTH * 6, 8);
    for (let i = 0; i < HEALTH; i++) hud.fillStyle(i < p.health ? 0xd8d8d8 : 0x3a3a3e).fillRect(6 + i * 6, 6, 4, 4);
    drawString(this.fill, `LIVES ${s.lives}`, 4, 16, DIM);
    drawString(this.fill, `LEDGE ${ledgesClimbed(s)}/${ARENA_LEDGE}`, 4, 28, DIM);
    const gap = Math.max(0, Math.round((s.flood.y - p.y) / TILE));
    drawString(this.fill, `FLOOD ${gap}`, 4, 40, gap < 4 ? RED : DIM);
    drawString(this.fill, 'THE ARCHIVE', WIDTH - 92, 6, WHITE);
    if (s.events.some((e) => e.type === 'checkpoint')) this.cpShown = 90;
    if (this.cpShown > 0 && this.cpShown--) drawString(this.fill, 'CHECKPOINT', WIDTH - 84, 18, rgb15(16, 28, 16));
    const title = s.dying ? (s.dying === 'caught' ? 'CAUGHT' : 'WORN DOWN') : TITLES[s.over?.kind];
    if (!title) return;
    hud.fillStyle(0x000000, 0.6).fillRect(0, HEIGHT / 2 - 20, WIDTH, 40);
    drawString(this.fill, title, WIDTH / 2 - title.length * 4, HEIGHT / 2 - 12, WHITE);
    const sub = s.over?.kind === 'clear' ? 'THE CUSTODIAN STANDS ASIDE' : s.over ? 'JUMP TO RETRY' : 'BACK TO THE CHECKPOINT';
    drawString(this.fill, sub, WIDTH / 2 - sub.length * 4, HEIGHT / 2 + 2, DIM);
  }
}
