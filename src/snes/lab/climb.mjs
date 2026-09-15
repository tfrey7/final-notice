// The climb lab under ?snes&go=climblab: Stage 2's real running, casting and Associates up a tall grey
// shaft, a grey flood rising behind, and a dial panel for tuning the feel live. Boxes stand in for every sprite.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { TUNING } from '../../stage2/escape.mjs';
import { inHand } from '../../stage2/pickups.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { buildClimbDials, climbSettingsText, climbTune, createClimb, rowsClimbed, startAt, stepClimb } from '../../lab/climb.mjs';
import { mountLabPanel } from '../../lab/panel.mjs';
import { isShortcut, mountControls } from '../../controls.mjs';
import { ClimbScene, DIM, RED, WHITE } from '../climb/scene.mjs';

const SOUND = { jump: 'jump', cast: 'punch', margin: 'punch', hit: 'hit', break: 'knockdown', clink: 'land', shelfLanded: 'knockdown', hurt: 'hit', swap: 'step', injunction: 'injunction' };
const SPELL = { notice: 'SEAL', margin: 'MARGIN', carbonCopy: 'COPY', redTape: 'TAPE' };

export class SnesClimbLabScene extends ClimbScene {
  constructor() {
    super('climblab');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.who = AUDITORS.includes(params.get('who')) ? params.get('who') : 'ward';
    this.dials = buildClimbDials();
    this.saved = { ...TUNING };
    this.climb = createClimb(this.who, this.dials);

    this.mountHud();
    this.panel = mountLabPanel({
      dials: this.dials,
      respawnLabel: 'Restart climb',
      onRespawn: () => { this.climb = createClimb(this.who, this.dials); },
      onCopy: () => climbSettingsText(this.dials, this.who),
      onReset: () => { this.dials.forEach((d) => { d.value = d.start; }); this.panel.flash('Dials reset.'); },
    });
    this.controls = mountControls('stage2');
    this.controls.show();
    this.tabbed = false;
    const onKey = (e) => { if (isShortcut(e.code, 'dials')) { e.preventDefault(); this.tabbed = true; } };
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
      this.controls.remove();
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
    const g = this.frameView(area, camY);
    this.drawShelving(g, area, camY);
    g.fillStyle(0xb0b0b8).fillRect(TILE, 2 * TILE - 2, area.width - 2 * TILE, 2);

    for (const s of c.shelves) {
      if (s.state === 'landed') continue;
      const x = s.x - s.w / 2;
      if (s.state === 'hanging') for (const cx of [x + 4, x + s.w - 6]) g.fillStyle(0x505058).fillRect(cx, s.y - 40, 2, 32);
      g.fillStyle(s.flash ? 0xffffff : 0x9a8a70).fillRect(x, s.y - s.h, s.w, s.h);
      g.lineStyle(1, 0x18181c).strokeRect(x, s.y - s.h, s.w, s.h);
    }
    this.drawFoes(g, run);
    this.drawCasts(g, run.casts, (k) => (k.spell === 'margin' ? 0xe0e0a0 : 0x80e080));
    const p = run.player;
    const h = this.drawAuditor(g, p);
    if (h && p.planted) g.lineStyle(1, 0x80e080).strokeRect(p.x - p.w / 2 - 2, p.y - h - 2, p.w + 4, h + 4);
    this.drawFlood(g, area, camY, c.flood.y, c.frame);
    this.drawHud();
  }

  drawHud() {
    const c = this.climb;
    const { run } = c;
    const p = run.player;
    const gap = Math.max(0, Math.round((c.flood.y - p.y) / TILE));
    this.drawStatus(p, [
      [`${SPELL[inHand(run)] ?? 'SEAL'}  X:SWAP`, DIM],
      [`ROW ${rowsClimbed(c)}`, DIM],
      [`FLOOD ${gap}`, gap < 4 ? RED : DIM],
    ]);
    drawString(this.fill, 'CLIMB LAB', WIDTH - 84, 6, WHITE);
    drawString(this.fill, this.panel.visible ? 'TAB: CLIMB' : 'TAB: DIALS', WIDTH - 84, 18, DIM);
    if (c.over) {
      this.banner({ caught: 'CAUGHT', escaped: 'ESCAPED', 'worn down': 'WORN DOWN' }[c.over.kind]);
      drawString(this.fill, `ROW ${rowsClimbed(c)}  JUMP TO RETRY`, WIDTH / 2 - 76, HEIGHT / 2 + 2, DIM);
    }
  }
}
