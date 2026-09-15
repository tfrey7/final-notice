// Stage 2 areas 1-4 on the SNES: the shared escape logic drawn at 40 px over the archive's parallax
// shelving, the wax front as an add-half tint, the BG3 HUD with enchantment icons. The Great Seal's
// room is card 1932's; reaching it holds on a card.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { screen, mathPass } from '../fx.mjs';
import { artOr, loadArt, SpriteLayer } from '../art.mjs';
import { bakeArea, composeArea } from '../bgart.mjs';
import { drawString, measure } from '../text.mjs';
import { hudLayout, drawHud } from '../hud.mjs';
import { playSong, sfx, stopSong } from '../audio/player.mjs';
import { FrontScreen, bufferFill } from '../scenes/front.mjs';
import { pollPad } from '../../input.mjs';
import { cheapen, fastOn } from '../../fast.mjs';
import { AUDITORS as WHO, jumpTo, next, showFlow } from '../../flow.mjs';
import { mountTunePanel } from '../../tune.mjs';
import { HITS_PER_SEGMENT } from '../../injunction.mjs';
import { TILE, solidAt } from '../../stage2/physics.mjs';
import { carry, swapHand } from '../../stage2/pickups.mjs';
import { reachedArena } from '../../stage2/greatseal.mjs';
import { BOSS_AREA, areaAt, arenaLocked, createStage, frontsOf, layoutFrom, promptsFor, stepStage } from '../../stage2/areas.mjs';
import { BELT } from '../../stage2/conveyor.mjs';
import { STAGE2, backdropFor, bodySize, camera, hudState, onScreen } from './view.mjs';

const MS = 1000 / 60;
const SOUNDS = { cast: 'cast', jump: 'jump', hit: 'hit', break: 'waxBreak', pit: 'hit', hurt: 'hit', carbonCopy: 'carbonCopy', redTape: 'redTape', margin: 'margin', pickup: 'pickup', injunction: 'injunction', alarm: 'alarm', doorShut: 'stamp', belt: 'conveyor', tell: 'alarm', stamp: 'stamp' };
const AREA_ART = ['archiveAccess', 'retentionOrder', 'originalCopy', 'disposalLine'];
const C = {
  stone: rgb15(7, 7, 9), stoneDark: rgb15(3, 3, 5), stoneTop: rgb15(12, 11, 13),
  box: rgb15(13, 9, 5), boxEdge: rgb15(21, 18, 12), flash: rgb15(31, 31, 31),
  wax: rgb15(24, 5, 3), waxLit: rgb15(31, 14, 5), ledger: rgb15(28, 26, 19), tab: rgb15(22, 4, 3),
  belt: rgb15(3, 3, 4), bar: rgb15(15, 15, 17), door: rgb15(6, 6, 8), stripe: rgb15(28, 22, 4),
  ink: rgb15(6, 8, 22), inkLit: rgb15(14, 18, 31), tape: rgb15(24, 4, 4), glyph: rgb15(20, 6, 22), burst: rgb15(31, 26, 10),
};
const TABS = { carbonCopy: C.flash, redTape: C.tape, margin: C.inkLit };
const SPRITE_CAST = { seal: 'notice', paper: 'carbonCopy', page: 'margin' };
const WAX_TOP = 24;

export class SnesStage2Scene extends Phaser.Scene {
  constructor() {
    super('stage2');
  }

  async create() {
    this.ready = false;
    this.paused = false;
    this.fast = fastOn();
    const params = new URLSearchParams(location.search);
    let flow = this.registry.get('flow');
    if (!flow || flow.screen !== 'stage2') flow = jumpTo('stage2');
    if (WHO.includes(params.get('who'))) flow = { ...flow, auditor: params.get('who') };
    this.registry.set('flow', flow);
    this.holdAt = params.has('hold') ? Number(params.get('hold')) : null;
    const archive = await import('../../art/bg-archive.mjs').then((m) => m.default).catch(() => null);
    this.run = createStage(flow.auditor, layoutFrom(Object.fromEntries(AREA_ART.map((n) => [n, archive?.areas?.[n]?.solid]))), flow.checkpoint);
    if (params.has('at')) this.run.player.x = this.run.player.safe.x = Number(params.get('at'));
    if (params.has('spell')) carry(this.run, params.get('spell')), swapHand(this.run);
    if (params.has('meter')) this.run.meterHits = Number(params.get('meter')) * HITS_PER_SEGMENT;
    window.finalNoticeStage2 = this.run;
    this.song = 'stage2';
    playSong(this.song);

    this.buf = screen();
    this.wax = screen(C.wax);
    this.view = new FrontScreen(this, 'snes-stage2');
    this.layer = new SpriteLayer(this, 10);
    this.backs = new Map();
    this.done = flow.checkpoint === BOSS_AREA.id;
    if (params.has('tune') && !document.querySelector('details')) mountTunePanel();
    await loadArt(`${flow.auditor}-stage2`).catch(() => null);
    this.ready = true;
  }

  backdrop(index) {
    if (!this.backs.has(index)) {
      const area = backdropFor(index);
      this.backs.set(index, { area, baked: bakeArea(area) });
    }
    return this.backs.get(index);
  }

  update() {
    if (!this.ready) return;
    const { run } = this;
    if (this.done || (this.holdAt !== null && run.frame >= this.holdAt)) { this.draw(this.registry.get('flow')); return; }
    const pad = pollPad(this.game.loop.frame);
    if (this.fast) cheapen([...run.foes, ...(run.bosses ?? [])]);
    stepStage(run, pad);
    if (reachedArena(run)) {
      run.events.push({ type: 'checkpoint', id: BOSS_AREA.id });
      this.done = true;
    }
    if (run.paused !== this.paused) {
      this.paused = run.paused;
      sfx('pause');
      if (this.paused) stopSong();
      else playSong(this.song);
    }
    let flow = this.registry.get('flow');
    for (const e of run.events) {
      if (SOUNDS[e.type]) sfx(SOUNDS[e.type]);
      if (e.type === 'stageClear') { showFlow(this, next(flow, e)); return; }
      if (e.type === 'checkpoint') this.registry.set('flow', flow = next(flow, e));
      if (e.type === 'lifeLost') {
        flow = next(flow, e);
        if (flow.screen !== 'stage2') { showFlow(this, flow); return; }
        this.registry.set('flow', flow);
      }
    }
    const song = arenaLocked(run) ? 'boss' : 'stage2';
    if (!this.paused && song !== this.song) playSong(this.song = song);
    this.draw(flow);
  }

  draw(flow) {
    const { run } = this;
    const s = STAGE2.scale;
    const cam = camera(run, s);
    const { area, baked } = this.backdrop(Math.max(0, areaAt(run.player.x)));
    const buf = composeArea(area, baked, cam.x, this.buf);
    const fill = bufferFill(buf);
    const rect = (x, y, w, h, c) => { const r = onScreen(cam, s, x, y, w, h); fill(r.x, r.y, r.w, r.h, c); };
    const px = (x) => Math.round(x * s) - cam.x;
    const py = (y) => Math.round(y * s) - cam.y;
    const t = run.frame * MS;

    const a = run.area;
    for (let col = Math.floor(cam.x / s / TILE); col <= Math.floor((cam.x + WIDTH) / s / TILE) && col < a.cols; col++) {
      for (let row = 0; row < a.rows; row++) {
        if (!solidAt(a, col, row)) continue;
        rect(col * TILE, row * TILE, TILE, TILE, C.stone);
        rect(col * TILE, row * TILE + TILE - 2, TILE, 2, C.stoneDark);
        if (!solidAt(a, col, row - 1)) rect(col * TILE, row * TILE, TILE, 2, C.stoneTop);
      }
    }
    this.drawParts(run, rect, t);

    const sprites = [];
    const p = run.player;
    const body = bodySize(s);
    if (!(p.invuln && p.invuln % 6 < 3)) {
      const who = artOr(this, `${p.auditor}-stage2`, { w: body.w, h: body.h, palette: [rgb15(2, 2, 6), rgb15(6, 9, 20), rgb15(28, 24, 18)] });
      const flip = p.castPose ? /left/i.test(p.castDir) : p.facing < 0;
      sprites.push(...who.frame(undefined, t, px(p.x) - (body.w >> 1), py(p.y) - body.h, flip));
    }
    const foe = artOr(this, 'associate-stage2', { w: body.w, h: body.h, palette: [rgb15(2, 2, 4), rgb15(8, 8, 10), rgb15(20, 18, 14)] });
    for (const f of run.foes) {
      if ((f.hp <= 0 && f.down % 4 < 2) || px(f.x) < -body.w || px(f.x) > WIDTH + body.w) continue;
      sprites.push(...foe.frame(undefined, f.frozen ? 0 : t, px(f.x) - (body.w >> 1), py(f.y) - body.h, f.facing > 0));
      if (f.flash) fill(px(f.x) - 8, py(f.y) - body.h - 3, 16, 2, C.flash);
      if (f.frozen) for (const dy of [14, 26]) fill(px(f.x) - (body.w >> 1), py(f.y) - dy, body.w, 2, C.tape);
    }
    const boss = artOr(this, 'custodian-stage2', { w: body.w, h: body.h, palette: [rgb15(2, 1, 4), rgb15(12, 4, 14), rgb15(26, 20, 26)] });
    for (const c of run.bosses ?? []) {
      sprites.push(...boss.frame(undefined, t, px(c.x) - (body.w >> 1), py(c.y) - body.h, c.facing > 0));
      if ((c.phase === 'tell' && run.frame % 6 < 3) || c.flash) fill(px(c.x) - (body.w >> 1) - 2, py(c.y) - body.h - 3, body.w + 4, 2, C.flash);
    }
    const spells = artOr(this, 'spells-stage2', { w: 10, h: 10, palette: [rgb15(20, 4, 4), rgb15(31, 24, 10), rgb15(31, 31, 31)] });
    for (const c of run.casts) {
      if (c.kind === 'burst') {
        const grow = Math.min(1, (c.age + 3) / 6) * c.rule.radius;
        ring(fill, px(c.x), py(c.y), grow * s, 10, 4, c.spell === 'margin' ? C.ink : C.burst);
      } else if (c.kind === 'tape') {
        const len = Math.min(c.age * 3, 14);
        for (let i = 0; i < len; i += 2) fill(px(c.x - Math.sign(c.vx) * i), py(c.y - Math.sign(c.vy) * i), 3, 3, C.tape);
      } else {
        sprites.push(...spells.frame(SPRITE_CAST[c.kind] ?? undefined, 0, px(c.x) - 5, py(c.y) - 5));
      }
    }
    for (const g of run.glyphs) ring(fill, px(g.x), py(g.y - g.h / 2), 4, 6, 3, run.frame % 8 < 4 ? C.glyph : C.burst);

    // The wax front: everything it covers takes the red by add-half, as a sub-screen layer would.
    for (const front of frontsOf(run.stage)) {
      const edge = px(front.x);
      if (!front.active || edge <= 0) continue;
      mathPass(buf, this.wax, { op: 'add', half: true, where: (x, y) => x < edge && y >= WAX_TOP }, buf);
      for (let y = WAX_TOP; y < HEIGHT; y += 20) fill(edge - 12 - (((y >> 4) + (run.frame >> 5)) % 3) * 4, y + 4, 8, 10, C.waxLit);
      fill(edge, WAX_TOP, 3, HEIGHT - WAX_TOP, run.frame % 16 < 8 ? C.flash : C.waxLit);
    }

    const layout = hudLayout(hudState(run, flow));
    drawHud(fill, layout);
    sprites.unshift(...artOr(this, `hud-portrait-${p.auditor}`, { w: 20, h: 20, palette: [rgb15(1, 1, 1), rgb15(11, 13, 21), rgb15(31, 31, 31)] })
      .frame(undefined, 0, layout.portrait.x + 2, layout.portrait.y + 2));
    for (const e of layout.enchant ?? []) {
      if (!e.icon) continue;
      sprites.unshift(...artOr(this, `hud-${e.icon}`, { w: 16, h: 16, palette: [rgb15(1, 1, 1), e.icon === 'notice' ? rgb15(28, 3, 3) : rgb15(15, 15, 15), rgb15(31, 31, 31)] })
        .frame(undefined, 0, e.x + 2, e.y + 2));
    }
    promptsFor(run).forEach((text, i) => {
      if (run.frame % 60 < 45) drawString(fill, text, (WIDTH - measure(text)) >> 1, 60 + i * 14);
    });
    if (run.paused) drawString(fill, 'PAUSE', (WIDTH - measure('PAUSE')) >> 1, HEIGHT >> 1);
    if (this.done) drawString(fill, 'THE GREAT SEAL AWAITS', (WIDTH - measure('THE GREAT SEAL AWAITS')) >> 1, HEIGHT >> 1);

    this.layer.draw(sprites);
    this.view.show(buf);
  }

  drawParts(run, rect, t) {
    const { stage } = run;
    for (const b of run.targets) {
      if (b.hp <= 0) continue;
      rect(b.x - b.w / 2, b.y - b.h, b.w, b.h, b.flash ? C.flash : C.boxEdge);
      rect(b.x - b.w / 2 + 2, b.y - b.h + 2, b.w - 4, b.h - 4, b.flash ? C.flash : C.box);
    }
    for (const lock of run.locks) {
      if (lock.hp <= 0) continue;
      rect(lock.x - lock.w / 2, lock.y - lock.h, lock.w, lock.h, lock.flash ? C.flash : C.wax);
      rect(lock.x - 4, lock.y - 20, 8, 8, C.waxLit);
    }
    for (const k of run.pickups) {
      rect(k.x - 6, k.y - 12, 12, 12, C.ledger);
      rect(k.x + 3, k.y - 11, 3, 10, TABS[k.name] ?? C.tab);
    }
    const shift = Math.floor(run.frame * BELT.speed) % 8;
    for (const [key, dir] of stage.belts) {
      const [col, row] = key.split(',').map(Number);
      rect(col * TILE, row * TILE, TILE, 4, C.belt);
      for (let i = 0; i < TILE; i += 8) rect(col * TILE + ((i + dir * shift + 16) % TILE), row * TILE + 1, 3, 2, C.bar);
    }
    for (const d of stage.doors) {
      if (!d.closed) continue;
      const h = (d.bottom - d.top + 1) * TILE;
      rect(d.col * TILE, d.top * TILE, TILE, h, C.door);
      for (let y = 6; y < h; y += 12) rect(d.col * TILE + 2, d.top * TILE + y, TILE - 4, 2, C.stripe);
    }
    const { ledger } = stage.arena;
    rect(ledger.x - 6, ledger.baseY, 12, 3, C.door);
    rect(ledger.x - 2, ledger.baseY + 3, 4, 13, C.door);
    if (!ledger.taken) rect(ledger.x - 7, Math.round(ledger.y) - 9 + (Math.floor(t / 400) % 2), 14, 9, C.ledger);
  }
}

function ring(fill, x, y, reach, points, size, colour) {
  for (let i = 0; i < points; i++) {
    const a = (i * 2 * Math.PI) / points;
    fill(Math.round(x + Math.cos(a) * reach) - (size >> 1), Math.round(y + Math.sin(a) * reach) - (size >> 1), size, size, colour);
  }
}
