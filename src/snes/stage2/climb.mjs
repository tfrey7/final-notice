// Stage 2 as an escape climb under ?snes&go=archive: the auditor climbs the Archive's grey shelving ahead
// of a rising paper flood, past Associates and falling paper, through the checkpoint to the Records
// Custodian's arena at the top, where the boss fight clears the stage. Boxes stand in for every sprite.
// ?bot lets the climb bot play; ?boss starts at the arena; Tab (or ?dials) opens his tuning dials;
// ?frames=<n> plays that many frames first (with the bot under ?bot), for a screenshot.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { ARCHIVE, ARENA, ARENA_LEDGE, CHECKPOINT_LEDGE, DROP, createArchive, ledgesClimbed, startAtSummit, stepArchive } from '../../stage2/climb.mjs';
import { CUSTODIAN, bossBar, cartBox, createCustodian, custodianDials, custodianTable, sweepBox } from '../../stage2/summit.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { mountLabPanel } from '../../lab/panel.mjs';
import { botButtons, createBot } from '../../stage2/climbbot.mjs';
import { isShortcut } from '../../controls.mjs';
import { ARCHIVE_CLIMB_SONG } from '../audio/cues.mjs';
import { ClimbStageScene, DIM, RED, WHITE } from '../climb/scene.mjs';

const TITLES = { clear: 'STAGE CLEAR', 'game over': 'GAME OVER' };

export class SnesArchiveClimbScene extends ClimbStageScene {
  constructor() {
    super('archiveclimb');
    Object.assign(this, { climbSong: ARCHIVE_CLIMB_SONG, retryAfter: 45, bots: { botButtons, createBot } });
  }

  setup(params) {
    this.atBoss = params.has('boss');
    this.dials = custodianDials();
    this.boss = custodianTable(this.dials);
  }

  mount(params) {
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
    return () => {
      window.removeEventListener('keydown', onKey);
      this.panel.remove();
    };
  }

  fresh() {
    const s = createArchive(this.who, this.boss);
    if (this.atBoss) startAtSummit(s);
    return s;
  }

  step(s, pad) {
    stepArchive(s, pad);
  }

  held() {
    if (this.tabbed) this.panel.toggle();
    this.tabbed = false;
    Object.assign(this.boss, custodianTable(this.dials));
    return this.panel.visible;
  }

  draw() {
    const { s } = this;
    const { run } = s;
    const { area } = run;
    const camY = Math.round(s.camY);
    const g = this.frameView(area, camY);
    this.drawShelving(g, area, camY);
    this.drawFlag(g, ARCHIVE.ledges[CHECKPOINT_LEDGE], s.checkpoint);
    this.drawCustodian(g, s.fight ?? { ...createCustodian(ARENA), state: 'waiting' });
    this.drawFoes(g, run);
    for (const d of s.drops) {
      g.fillStyle(0xe8e4d0).fillRect(d.x - DROP.w / 2, d.y - DROP.h, DROP.w, DROP.h);
      g.fillStyle(0x9a9a90).fillRect(d.x - DROP.w / 2 + 2, d.y - DROP.h + 3, DROP.w - 4, 1);
    }
    this.drawCasts(g, run.casts);
    this.drawAuditor(g, run.player, s.dying);
    this.drawFlood(g, area, camY, s.flood.y, run.frame);
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
    const gap = Math.max(0, Math.round((s.flood.y - p.y) / TILE));
    const hud = this.drawStatus(p, [
      [`LIVES ${s.lives}`, DIM],
      [`LEDGE ${ledgesClimbed(s)}/${ARENA_LEDGE}`, DIM],
      [`FLOOD ${gap}`, gap < 4 ? RED : DIM],
    ]);
    if (s.fight) {
      const b = s.fight;
      const w = Math.floor((WIDTH - 16) / b.maxHp);
      hud.fillStyle(0x111114).fillRect(6, HEIGHT - 26, b.maxHp * w + 4, 22);
      drawString(this.fill, 'THE CUSTODIAN', 8, HEIGHT - 24, WHITE);
      for (const [i, on] of bossBar(b).entries()) hud.fillStyle(on ? (b.phase === 2 ? 0xd05050 : 0xd8b050) : 0x3a3a3e).fillRect(8 + i * w, HEIGHT - 12, w - 1, 6);
    }
    drawString(this.fill, 'THE ARCHIVE', WIDTH - 92, 6, WHITE);
    this.noticeCheckpoint();
    const title = s.dying ? (s.dying === 'caught' ? 'CAUGHT' : 'WORN DOWN') : TITLES[s.over?.kind];
    if (!title) return;
    this.banner(title, s.over?.kind === 'clear' ? 'THE CUSTODIAN STANDS ASIDE' : s.over ? 'JUMP TO RETRY' : 'BACK TO THE CHECKPOINT');
  }
}
