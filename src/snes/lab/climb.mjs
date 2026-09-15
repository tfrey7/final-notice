// The climb lab under ?snes&go=climblab: Stage 2's real running, casting and Associates up a tall grey
// shaft, a grey flood rising behind, and a dial panel for tuning the feel live. Boxes stand in for every sprite.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { TUNING } from '../../stage2/escape.mjs';
import { HEALTH } from '../../stage2/player.mjs';
import { inHand } from '../../stage2/pickups.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { buildClimbDials, climbSettingsText, climbTune, createClimb, rowsClimbed, startAt, stepClimb } from '../../lab/climb.mjs';
import { mountLabPanel } from '../../lab/panel.mjs';

const REPEAT = { delay: 14, every: 3 };
const SOUND = { jump: 'jump', cast: 'punch', margin: 'punch', hit: 'hit', break: 'knockdown', clink: 'land', shelfLanded: 'knockdown', hurt: 'hit', swap: 'step', injunction: 'injunction' };
const GREY = { back: 0x2a2a30, column: 0x303036, tile: 0x6a6a72, edge: 0x8a8a92, flood: 0x9a9aa2, foam: 0xd0d0d6 };
const SPELL = { notice: 'SEAL', margin: 'MARGIN', carbonCopy: 'COPY', redTape: 'TAPE' };
const WHITE = rgb15(31, 31, 31);
const DIM = rgb15(20, 20, 22);

export class SnesClimbLabScene extends Phaser.Scene {
  constructor() {
    super('climblab');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.who = AUDITORS.includes(params.get('who')) ? params.get('who') : 'ward';
    this.dials = buildClimbDials();
    this.saved = { ...TUNING };
    this.climb = createClimb(this.who, this.dials);
    this.repeat = { dir: 0, t: 0 };

    this.g = this.add.graphics();
    this.hud = this.add.graphics().setScrollFactor(0);
    this.fill = (x, y, w, h, c) => this.hud.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.panel = mountLabPanel({
      dials: this.dials,
      respawnLabel: 'Restart climb',
      onRespawn: () => { this.climb = createClimb(this.who, this.dials); },
      onCopy: () => climbSettingsText(this.dials, this.who),
      onReset: () => { this.dials.forEach((d) => { d.value = d.start; }); this.panel.flash('Dials reset.'); },
    });
    this.tabbed = false;
    const onKey = (e) => { if (e.code === 'Tab') { e.preventDefault(); this.tabbed = true; } };
    window.addEventListener('keydown', onKey);
    // ?dials opens the panel on the first frame, for a screenshot; ?at=<row> starts on that row's ledge
    // with the flood its usual gap below; ?frames=<n> plays that many idle frames first.
    if (params.has('dials')) this.panel.toggle(true);
    if (params.has('at')) startAt(this.climb, Number(params.get('at')), this.dials);
    const idle = pollPad(-1);
    for (let i = 0; i < Number(params.get('frames') ?? 0); i++) this.climb = stepClimb(this.climb, idle, this.dials);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.panel.remove();
      Object.assign(TUNING, this.saved);
    });
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    if (this.tabbed || pad.pressed.has('select')) this.panel.toggle();
    this.tabbed = false;
    if (this.panel.visible) this.drivePanel(pad);
    else this.play(pad);
    this.draw();
  }

  // While the panel is open the climb holds still and the pad works the panel.
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

  play(pad) {
    Object.assign(TUNING, climbTune(this.dials));
    this.climb = stepClimb(this.climb, pad, this.dials);
    for (const e of this.climb.events ?? []) if (SOUND[e.type]) sfx(SOUND[e.type]);
    this.climb.events = [];
  }

  draw() {
    const c = this.climb;
    const { run } = c;
    const { area } = run;
    const camY = Math.round(c.camY);
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
    g.fillStyle(0xb0b0b8).fillRect(TILE, 2 * TILE - 2, area.width - 2 * TILE, 2);

    for (const s of c.shelves) {
      if (s.state === 'landed') continue;
      const x = s.x - s.w / 2;
      if (s.state === 'hanging') for (const cx of [x + 4, x + s.w - 6]) g.fillStyle(0x505058).fillRect(cx, s.y - 40, 2, 32);
      g.fillStyle(s.flash ? 0xffffff : 0x9a8a70).fillRect(x, s.y - s.h, s.w, s.h);
      g.lineStyle(1, 0x18181c).strokeRect(x, s.y - s.h, s.w, s.h);
    }
    for (const f of run.foes) {
      const alpha = f.hp <= 0 ? 0.35 : 1;
      const flash = f.flash || (f.windUp > 0 && f.windUp % 6 < 3);
      g.fillStyle(flash ? 0xffffff : f.frozen ? 0x8080c0 : 0x9c9c9c, alpha).fillRect(f.x - f.w / 2, f.y - f.h, f.w, f.h);
      g.fillStyle(0x18181c, alpha).fillRect(f.facing > 0 ? f.x + 1 : f.x - 5, f.y - f.h + 6, 4, 4);
    }
    for (const gl of run.glyphs) g.fillStyle(0xe0a040).fillRect(gl.x - 4, gl.y - 8, 8, 8);
    for (const k of run.casts) {
      if (k.kind === 'burst') g.lineStyle(1, 0xe0e0a0, 1 - k.age / k.rule.burstFrames).strokeCircle(k.x, k.y, k.rule.radius);
      else g.fillStyle(k.spell === 'margin' ? 0xe0e0a0 : 0x80e080).fillRect(k.x - 3, k.y - 3, 6, 6);
    }
    const p = run.player;
    const h = p.crouch ? 20 : p.h;
    if (!(p.invuln > 0 && p.invuln % 4 < 2)) {
      g.fillStyle(0xdcdcdc).fillRect(p.x - p.w / 2, p.y - h, p.w, h);
      g.fillStyle(0x18181c).fillRect(p.facing > 0 ? p.x + 1 : p.x - 5, p.y - h + 6, 4, 4);
      if (p.planted) g.lineStyle(1, 0x80e080).strokeRect(p.x - p.w / 2 - 2, p.y - h - 2, p.w + 4, h + 4);
    }

    const fy = Math.round(c.flood.y);
    g.fillStyle(GREY.flood, 0.9).fillRect(0, fy, area.width, Math.max(0, camY + HEIGHT + 8 - fy));
    for (let x = 0; x < area.width; x += 8) g.fillStyle(GREY.foam).fillRect(x, fy - 2 + Math.round(Math.sin((x + c.frame * 2) / 12) * 2), 8, 3);

    this.drawHud();
  }

  drawHud() {
    const c = this.climb;
    const { run } = c;
    const p = run.player;
    const hud = this.hud.clear();
    hud.fillStyle(0x111114).fillRect(4, 4, 4 + HEALTH * 6, 8);
    for (let i = 0; i < HEALTH; i++) hud.fillStyle(i < p.health ? 0xd8d8d8 : 0x3a3a3e).fillRect(6 + i * 6, 6, 4, 4);
    drawString(this.fill, `${SPELL[inHand(run)] ?? 'SEAL'}  X:SWAP`, 4, 16, DIM);
    drawString(this.fill, `ROW ${rowsClimbed(c)}`, 4, 28, DIM);
    const gap = Math.max(0, Math.round((c.flood.y - p.y) / TILE));
    drawString(this.fill, `FLOOD ${gap}`, 4, 40, gap < 4 ? rgb15(31, 12, 12) : DIM);
    drawString(this.fill, 'CLIMB LAB', WIDTH - 84, 6, WHITE);
    drawString(this.fill, this.panel.visible ? 'TAB: CLIMB' : 'TAB: DIALS', WIDTH - 84, 18, DIM);
    if (c.over) {
      const title = { caught: 'CAUGHT', escaped: 'ESCAPED', 'worn down': 'WORN DOWN' }[c.over.kind];
      hud.fillStyle(0x000000, 0.6).fillRect(0, HEIGHT / 2 - 20, WIDTH, 40);
      drawString(this.fill, title, WIDTH / 2 - title.length * 4, HEIGHT / 2 - 12, WHITE);
      drawString(this.fill, `ROW ${rowsClimbed(c)}  JUMP TO RETRY`, WIDTH / 2 - 76, HEIGHT / 2 + 2, DIM);
    }
  }
}
