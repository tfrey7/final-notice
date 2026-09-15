// Stage 2's test run on screen: the chosen auditor, platforms, seals and target boxes, drawn through artOr.
/* global Phaser */
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { AUDITORS as WHO, jumpTo, next } from '../flow.mjs';
import { drawText, showFlow } from '../scenes/placeholder.mjs';
import { mountTunePanel } from '../tune.mjs';
import { TILE, solidAt } from './physics.mjs';
import { drawActors, loadActorArt } from './draw.mjs';
import { carry, inHand, swapHand } from './pickups.mjs';
import { drawStage2Hud } from './hud.mjs';
import { drawRing } from '../hud.mjs';
import { HITS_PER_SEGMENT, ringShape } from '../injunction.mjs';
import { arenaLocked, createStage, layoutFrom, stepStage } from './areas.mjs';
import { drawPrompts, drawStageParts } from './areadraw.mjs';

const MS = 1000 / 60;
const C = { sky: nes(0x0f), shelf: nes(0x07), block: nes(0x17), edge: nes(0x27), box: nes(0x07), boxEdge: nes(0x27), flash: nes(0x30), burst: nes(0x38) };
const SOUNDS = { cast: 'cast', jump: 'jump', hit: 'hit', break: 'waxBreak', pit: 'hit', hurt: 'hit', carbonCopy: 'carbonCopy', redTape: 'redTape', margin: 'margin', pickup: 'pickup', injunction: 'injunction', alarm: 'alarm', doorShut: 'stamp', belt: 'conveyor', tell: 'alarm' };
const AREA_ART = ['archiveAccess', 'retentionOrder', 'originalCopy', 'disposalLine'];
const CAST_POSE = { right: 'fwd', left: 'fwd', upRight: 'diagUp', upLeft: 'diagUp', up: 'up', downRight: 'diagDown', downLeft: 'diagDown', down: 'down' };

// The art cards' Stage 2 names, as ward.mjs exports them; an auditor without them is a 16x32 stand-in.
async function loadAuditor(scene, who) {
  const mod = await import(`../art/${who}.mjs`).catch(() => null);
  if (mod?.default) await loadArt(who);
  return { art: artOr(scene, mod?.default ? who : `${who}2`, { w: 16, h: 32, palette: [0x0f, 0x00, 0x10] }), names: mod?.stage2 ?? null };
}

export class EscapeScene extends Phaser.Scene {
  constructor() {
    super('stage2');
  }

  async create() {
    this.ready = false;
    const params = new URLSearchParams(location.search);
    let flow = this.registry.get('flow');
    if (!flow || flow.screen !== 'stage2') flow = jumpTo('stage2');
    if (WHO.includes(params.get('who'))) flow = { ...flow, auditor: params.get('who') };
    this.registry.set('flow', flow);
    this.freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null;

    const archive = await loadArt('bg-archive').catch(() => null);
    this.run = createStage(flow.auditor, layoutFrom(Object.fromEntries(AREA_ART.map((n) => [n, archive?.areas?.[n]?.solid]))), flow.checkpoint);
    // ?at=<x> starts the auditor further along the floor, for a quick look at one spot.
    if (params.has('at')) this.run.player.x = this.run.player.safe.x = Number(params.get('at'));
    // ?spell=<name> starts with that enchantment in hand.
    if (params.has('spell')) carry(this.run, params.get('spell')), swapHand(this.run);
    // ?meter=<segments> starts with that much of the injunction meter filled.
    if (params.has('meter')) this.run.meterHits = Number(params.get('meter')) * HITS_PER_SEGMENT;
    window.finalNoticeStage2 = this.run;
    this.song = 'stage2';
    playSong(this.song);

    this.bg = this.add.graphics();
    this.layer = new SpriteLayer(this);
    this.fx = this.add.graphics().setDepth(15);
    this.hud = this.add.graphics().setDepth(20);
    if (params.has('tune') && !document.querySelector('details')) mountTunePanel();
    this.who = await loadAuditor(this, flow.auditor);
    this.actors = loadActorArt(this, artOr);
    this.ready = true;
  }

  update() {
    if (!this.ready) return;
    const frame = this.game.loop.frame;
    const pad = pollPad(frame);
    if (this.freezeAt !== null && frame >= this.freezeAt) return;
    stepStage(this.run, pad);
    let flow = this.registry.get('flow');
    for (const e of this.run.events) {
      if (SOUNDS[e.type]) sfx(SOUNDS[e.type]);
      if (e.type === 'checkpoint') this.registry.set('flow', flow = next(flow, e));
      if (e.type === 'lifeLost') {
        flow = next(flow, e);
        if (flow.screen !== 'stage2') { showFlow(this, flow); return; }
        this.registry.set('flow', flow);
      }
    }
    // The boss theme while the Custodian's screen is locked, back to the stage's once the ledger is taken.
    const song = arenaLocked(this.run) ? 'boss' : 'stage2';
    if (song !== this.song) playSong(this.song = song);
    this.draw(flow);
  }

  draw(flow) {
    const { run } = this;
    const cx = run.camX;
    const g = this.bg.clear();
    g.fillStyle(C.sky).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(C.shelf);
    for (let sx = -((cx >> 1) % 48); sx < WIDTH; sx += 48) g.fillRect(sx, SAFE + 48, 32, 128);
    const { area } = run;
    for (let col = Math.floor(cx / TILE); col <= Math.floor((cx + WIDTH) / TILE); col++) {
      for (let row = 0; row < area.rows; row++) {
        if (col >= area.cols || !solidAt(area, col, row)) continue;
        g.fillStyle(C.block).fillRect(col * TILE - cx, row * TILE, TILE, TILE);
        if (!solidAt(area, col, row - 1)) g.fillStyle(C.edge).fillRect(col * TILE - cx, row * TILE, TILE, 2);
      }
    }
    for (const t of run.targets) {
      const x = t.x - t.w / 2 - cx;
      if (t.hp <= 0) {
        if (t.flash) g.fillStyle(C.boxEdge).fillRect(x - (6 - t.flash) * 2, t.y - 12 + (6 - t.flash), 5, 5).fillRect(x + 11 + (6 - t.flash) * 2, t.y - 12 + (6 - t.flash), 5, 5);
        continue;
      }
      g.fillStyle(t.flash ? C.flash : C.boxEdge).fillRect(x, t.y - t.h, t.w, t.h);
      g.fillStyle(t.flash ? C.flash : C.box).fillRect(x + 2, t.y - t.h + 2, t.w - 4, t.h - 4);
      g.fillStyle(C.boxEdge).fillRect(x + 2, t.y - 9, t.w - 4, 2);
    }

    const p = run.player;
    const sprites = [];
    if (!(p.invuln && p.invuln % 6 < 3)) {
      const n = this.who.names;
      let anim = null;
      let flip = p.facing < 0;
      if (n) {
        if (p.castPose) {
          anim = n.cast[CAST_POSE[p.castDir]];
          if (!['up', 'down'].includes(p.castDir)) flip = p.castDir.endsWith('Left') || p.castDir === 'left';
        } else if (!p.grounded) anim = n.jump;
        else if (p.crouch) anim = n.crouch;
        else if (Math.abs(p.vx) > 0.2) anim = n.run;
        else anim = n.idle;
      }
      sprites.push(...this.who.art.frame(anim, run.frame * MS * 1.5, Math.round(p.x - 8 - cx), Math.round(p.y - 32), flip));
    }
    drawActors(run, this.actors, this.fx.clear(), sprites);
    drawStageParts(this.fx, run);
    this.layer.draw(sprites);
    const hud = this.hud.clear();
    if (run.ring) drawRing(hud, ringShape(run.ring), Math.round(run.ring.x - cx), run.ring.y);
    drawStage2Hud(hud, run, flow);
    drawPrompts(hud, run);
    if (this.freezeAt !== null) drawText(this.hud, `F${this.game.loop.frame} ${inHand(run).toUpperCase()} CASTS ${run.casts.length} ${p.castDir.toUpperCase()}`, 8, HEIGHT - SAFE - 10, nes(0x30));
  }
}
