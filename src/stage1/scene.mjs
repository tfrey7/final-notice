// Stage 1: the chosen auditor on one long scrolling test floor, with the HUD strip on top.
/* global Phaser */
import { SAFE, WIDTH } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { keep } from '../nes/limits.mjs';
import { createSlowdown, pairs, slowdownTick } from '../nes/slowdown.mjs';
import { NesDebug, nesDebugOn } from '../nes/debug.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next } from '../flow.mjs';
import { TUNING, shakeOffset } from './moves.mjs';
import { FLOOR_W, HITS_PER_SEGMENT, PIPS, SCREEN_W, animFor, newFloor, stepFloor, tuneFor } from './player.mjs';
import { AREAS, STAGE, areaFor, newStage, stepAreas } from './areas.mjs';
import { remark } from '../scenes/cinema.mjs';
import { ringShape } from '../injunction.mjs';
import { registerTuning, mountTunePanel } from '../tune.mjs';
import { drawText, showFlow } from '../scenes/placeholder.mjs';
import { HUD_HEIGHT, bossBarLayout, drawBossBar, drawHud, drawRing, hudLayout } from '../hud.mjs';
import { pose, spawnStaff } from './staff.mjs';
import { enterOffice, poseOffice, vellum } from './vellum.mjs';
import { bindSprites, foeSprites, tapeSprites } from './foe-actors.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
const MS = 1000 / 60;
const SOUND = {
  punch: 'punch', hit: 'hit', heavy: 'knockdown', jump: 'jump', land: 'land', grab: 'grab', throw: 'throw', step: 'step',
  redTape: 'redTape', guardBreak: 'knockdown', blocked: 'land', breakFree: 'throw', injunction: 'injunction',
  fangs: 'alarm', bossDown: 'stageClear', heal: 'heal',
};
export const OFFICE = 'stage1-area5';
const STAGE_START_MS = 2400;

function room(g, x0, w, wallTop, top, bottom, [wall, rail, floor, line]) {
  g.fillStyle(nes(wall)).fillRect(x0, wallTop, w, top - 40 - wallTop);
  g.fillStyle(nes(rail)).fillRect(x0, top - 40, w, 8);
  g.fillStyle(nes(floor)).fillRect(x0, top - 32, w, bottom - top + 40);
  g.fillStyle(nes(line));
  for (let y = top - 16; y < bottom + 8; y += 16) g.fillRect(x0, y, w, 1);
}

// Each Stage 1 area's scenery in flat colours, until bg-claims draws it (docs/NES-PLAN.md section 6).
const SCENERY = {
  reception(g, x0, w, wall, top, bottom) {
    room(g, x0, w, wall, top, bottom, [0x17, 0x28, 0x27, 0x37]);
    for (let x = x0 + 24; x < x0 + w; x += 72) g.fillStyle(nes(0x0f)).fillRect(x, wall + 12, 36, 52).fillStyle(nes(0x01)).fillRect(x + 2, wall + 14, 32, 48);
    g.fillStyle(nes(0x07)).fillRect(x0 + 120, top - 64, 88, 32).fillStyle(nes(0x28)).fillRect(x0 + 120, top - 64, 88, 3);
    g.fillStyle(nes(0x00)).fillRect(x0 + 420, top - 52, 24, 20).fillStyle(nes(0x2c)).fillRect(x0 + 424, top - 58, 6, 6);
  },
  serviceFloor(g, x0, w, wall, top, bottom) {
    room(g, x0, w, wall, top, bottom, [0x1a, 0x28, 0x06, 0x16]);
    for (let x = x0 + 8; x < x0 + w; x += 96) {
      g.fillStyle(nes(0x2a)).fillRect(x, wall + 8, 80, 40);
      g.fillStyle(nes(0x00)).fillRect(x, top - 72, 80, 32).fillStyle(nes(0x10)).fillRect(x + 38, top - 72, 4, 32);
      g.fillStyle(nes(0x28)).fillRect(x + 16, top - 82, 8, 6).fillRect(x + 19, top - 76, 2, 4);
    }
  },
  internalReview(g, x0, w, wall, top, bottom) {
    room(g, x0, w, wall, top, bottom, [0x0c, 0x28, 0x07, 0x17]);
    for (let x = x0 + 16; x < x0 + w; x += 128) {
      g.fillStyle(nes(0x21)).fillRect(x, wall + 8, 72, 72).fillStyle(nes(0x31)).fillRect(x + 4, wall + 12, 8, 64);
      g.fillStyle(nes(0x0f)).fillRect(x + 35, wall + 8, 2, 72);
      g.fillStyle(nes(0x18)).fillRect(x + 88, wall + 16, 28, top - 56 - wall).fillStyle(nes(0x28)).fillRect(x + 90, wall + 18, 11, top - 60 - wall).fillRect(x + 103, wall + 18, 11, top - 60 - wall);
    }
  },
  waiting(g, x0, w, wall, top, bottom) {
    room(g, x0, w, wall, top, bottom, [0x05, 0x28, 0x06, 0x16]);
    g.fillStyle(nes(0x01)).fillRect(x0 + 16, wall + 8, 120, 64);
    for (const [bx, bh] of [[20, 40], [40, 52], [66, 30], [88, 58], [112, 44]]) {
      g.fillStyle(nes(0x0f)).fillRect(x0 + bx, wall + 72 - bh, 18, bh).fillStyle(nes(0x28)).fillRect(x0 + bx + 4, wall + 80 - bh, 2, 2).fillRect(x0 + bx + 11, wall + 88 - bh, 2, 2);
    }
    for (let i = 0; i < 3; i++) g.fillStyle(nes(0x16)).fillRect(x0 + 150 + i * 22, top - 58, 18, 26).fillStyle(nes(0x06)).fillRect(x0 + 150 + i * 22, top - 44, 18, 4);
    g.fillStyle(nes(0x27)).fillRect(x0 + 72, top - 76, 10, 10).fillStyle(nes(0x02)).fillRect(x0 + 68, top - 66, 18, 16);
    g.fillStyle(nes(0x07)).fillRect(x0 + 52, top - 56, 52, 24).fillStyle(nes(0x28)).fillRect(x0 + 52, top - 56, 52, 3);
    // Vellum's brass door at the end of the floor.
    g.fillStyle(nes(0x18)).fillRect(x0 + w - 36, wall + 16, 30, top - 56 - wall).fillStyle(nes(0x28)).fillRect(x0 + w - 33, wall + 19, 24, top - 62 - wall);
  },
};
const FOE = { idle: 'idle', walk: 'walk', windup: 'punch', punch: 'punch', hurt: 'hurt', held: 'hurt', knockdown: 'hurt', down: 'hurt', getup: 'hurt', ko: 'hurt' };

export class Stage1Scene extends Phaser.Scene {
  constructor() {
    super('stage1');
  }

  async create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'stage1') state = jumpTo('stage1');
    this.registry.set('flow', state);
    this.ready = false;
    // The boss room's checkpoint is Vellum's locked office.
    this.office = state.checkpoint === OFFICE;
    if (this.office) playSong('boss');
    else {
      playSong('stageStart');
      this.time.delayedCall(STAGE_START_MS, () => playSong(SONGS.stage1));
    }
    this.cameras.main.setBackgroundColor(nes(0x0f));
    const params = new URLSearchParams(location.search);
    this.freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null;

    this.who = state.auditor;
    this.tune = registerTuning(`brawl-${this.who}`, tuneFor(this.who), RANGES);
    this.world = newFloor(this.who, this.tune);
    // ?foes=associate,manager,... puts those foes on the test floor in place of the dummy.
    if (params.get('foes')) {
      this.world.fighters = this.world.fighters.filter((f) => f.team === 'player');
      spawnStaff(this.world, params.get('foes').split(','), this.tune);
      pose(this.world, params.get('pose'), this.tune);
    }
    // ?meter=<segments> starts with that much of the injunction meter filled.
    if (params.has('meter')) this.world.meterHits = Number(params.get('meter')) * HITS_PER_SEGMENT;
    if (this.office) {
      enterOffice(this.world, this.tune);
      poseOffice(this.world, params.get('pose'));
    }
    // Without ?foes the floor is the real stage, from the flow's checkpoint.
    this.areas = !this.office && !params.get('foes');
    if (this.areas) newStage(this.world, this.tune, areaFor(state.checkpoint));
    const optional = (name) => loadArt(name).catch(() => null);
    await Promise.all([loadArt('ward'), loadArt('cast'), optional('staff2'), optional('spells'), optional('bg-claims'), ...(this.office ? [optional('vellum')] : [])]);
    this.body = this.who === 'ward' ? artOr(this, 'ward') : artOr(this, 'cast');
    this.cast = artOr(this, 'cast');
    this.dummyArt = artOr(this, 'dummy', { w: 16, h: 32, palette: [0x0f, 0x07, 0x27] });
    this.props = artOr(this, 'spells', { w: 16, h: 16, palette: [0x0f, 0x00, 0x2d] });
    this.aid = artOr(this, 'spells', { w: 16, h: 12, palette: [0x0f, 0x30, 0x16] });

    if (this.office) this.drawOffice(this.add.graphics());
    else if (this.areas) this.drawAreas(this.add.graphics());
    else this.drawFloor(this.add.graphics());
    this.hud = this.add.graphics().setDepth(20).setScrollFactor(0);
    this.layout = hudLayout({ name: this.who, hp: PIPS, lives: state.lives, meter: 0 });
    const { x, y } = this.layout.portrait;
    const portrait = this.who === 'ward'
      ? this.body.frame('portrait', 0, x, y)
      : artOr(this, 'mercer', { w: 16, h: 16, palette: [0x0f, 0x02, 0x28] }).frame('portrait', 0, x, y);
    for (const s of portrait) this.add.image(s.x, s.y, s.key).setOrigin(0).setScrollFactor(0).setDepth(21).setFlip(s.flipX, s.flipY);
    this.layer = new SpriteLayer(this);
    this.slowdown = createSlowdown();
    if (nesDebugOn()) this.debug = new NesDebug(this, drawText);
    if (params.has('tune') && !this.panel) this.panel = mountTunePanel();
    this.events.once('shutdown', () => { this.panel?.remove(); this.panel = null; });
    if (this.office) remark(this, 'vellumOffice');
    this.ready = true;
  }

  // Every area's background from bg-claims when it has one, else that area's flat scenery.
  drawAreas(g) {
    const { top, bottom } = this.world.floor;
    const wallTop = SAFE + HUD_HEIGHT;
    AREAS.forEach((a, i) => {
      const x0 = STAGE.starts[i];
      let key = null;
      try { key = artOr(this, 'bg-claims').background(a.id); } catch { key = null; }
      if (key) this.add.image(x0, wallTop, key).setOrigin(0);
      else SCENERY[a.id](g, x0, a.screens * SCREEN_W, wallTop, top, bottom);
    });
  }

  // One scrolling layer: the back wall with midnight windows, a brass rail, and the carpet band.
  drawFloor(g) {
    const { top, bottom } = this.world.floor;
    const wallTop = SAFE + HUD_HEIGHT;
    g.fillStyle(nes(0x07)).fillRect(0, wallTop, FLOOR_W, top - 40 - wallTop);
    for (let x = 16; x < FLOOR_W; x += 64) g.fillStyle(nes(0x01)).fillRect(x, wallTop + 24, 32, 48);
    for (let x = 0; x < FLOOR_W; x += 256) g.fillStyle(nes(0x17)).fillRect(x, wallTop, 8, top - 40 - wallTop);
    g.fillStyle(nes(0x28)).fillRect(0, top - 40, FLOOR_W, 8);
    g.fillStyle(nes(0x06)).fillRect(0, top - 32, FLOOR_W, bottom - top + 40);
    g.fillStyle(nes(0x16));
    for (let y = top - 16; y < bottom + 8; y += 16) g.fillRect(0, y, FLOOR_W, 1);
  }

  // Vellum's office on one screen: the vellumOffice background when its art has landed, else his
  // panelled wall, bookcase, desk and lamp in flat colours.
  drawOffice(g) {
    let key = null;
    try { key = artOr(this, 'bg-claims').background('vellumOffice'); } catch { key = null; }
    if (key) { this.add.image(0, SAFE + HUD_HEIGHT, key).setOrigin(0); return; }
    const { top, bottom } = this.world.floor;
    const wallTop = SAFE + HUD_HEIGHT;
    g.fillStyle(nes(0x07)).fillRect(0, wallTop, FLOOR_W, top - 40 - wallTop);
    for (let x = 0; x < 300; x += 40) g.fillStyle(nes(0x0f)).fillRect(x, wallTop, 2, top - 40 - wallTop);
    g.fillStyle(nes(0x17)).fillRect(24, wallTop + 12, 64, top - 52 - wallTop);
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = wallTop + 16 + shelf * 20;
      for (let i = 0; i < 14; i++) g.fillStyle(nes([0x16, 0x28, 0x1a, 0x00][(i + shelf) % 4])).fillRect(28 + i * 4, y, 3, 14);
      g.fillStyle(nes(0x07)).fillRect(24, y + 14, 64, 4);
    }
    g.fillStyle(nes(0x01)).fillRect(128, wallTop + 16, 64, 48);
    g.fillStyle(nes(0x30)).fillRect(150, wallTop + 26, 2, 2).fillRect(170, wallTop + 40, 2, 2);
    g.fillStyle(nes(0x08)).fillRect(206, top - 60, 72, 28);
    g.fillStyle(nes(0x18)).fillRect(206, top - 60, 72, 3);
    g.fillStyle(nes(0x28)).fillRect(260, top - 76, 10, 8);
    g.fillStyle(nes(0x38)).fillRect(264, top - 68, 2, 8);
    g.fillStyle(nes(0x28)).fillRect(0, top - 40, FLOOR_W, 8);
    g.fillStyle(nes(0x06)).fillRect(0, top - 32, FLOOR_W, bottom - top + 40);
    g.fillStyle(nes(0x16));
    for (let y = top - 16; y < bottom + 8; y += 16) g.fillRect(0, y, FLOOR_W, 1);
  }

  update() {
    if (!this.ready) return;
    const loopFrame = this.game.loop.frame;
    if (this.freezeAt !== null && loopFrame >= this.freezeAt) return;
    const w = this.world;
    const live = (w.props ?? []).filter((o) => o.state !== 'gone').length + (w.tapes ?? []).length;
    const work = { objects: w.fighters.length + live, collisions: pairs(w.fighters.length) + w.fighters.length * live, sprites: this.layer.stats?.count ?? 0 };
    if (!slowdownTick(this.slowdown, work)) { this.draw(); return; }
    const pad = pollPad(loopFrame);
    const flow = this.registry.get('flow');
    if (pad.pressed.has('start')) { showFlow(this, next(flow, { type: 'stageClear' })); return; }

    stepFloor(this.world, pad, this.tune);
    if (this.areas) stepAreas(this.world, this.tune);
    for (const e of this.world.events) {
      if (SOUND[e]) sfx(SOUND[e]);
      if (e === 'bossDown') playSong('stageClear');
      if (e === 'bossBeaten') { showFlow(this, next(flow, { type: 'stageClear' })); return; }
      if (e.startsWith('checkpoint:')) this.registry.set('flow', next(this.registry.get('flow'), { type: 'checkpoint', id: e.slice(11) }));
      if (e.startsWith('remark:')) remark(this, e.slice(7));
      if (e === 'toOffice') {
        this.registry.set('flow', next(this.registry.get('flow'), { type: 'checkpoint', id: OFFICE }));
        this.scene.restart();
        return;
      }
      if (e === 'lifeLost') {
        const after = next(this.registry.get('flow'), { type: 'lifeLost' });
        if (after.screen !== 'stage1') { showFlow(this, after); return; }
        this.registry.set('flow', after);
      }
    }
    const shake = shakeOffset(this.world, this.tune);
    this.cameras.main.setScroll(Math.round(this.world.cameraX) + shake.x, shake.y);
    this.draw();
  }

  draw() {
    const w = this.world;
    const things = [
      ...w.fighters.map((f) => ({ y: f.y, f })),
      ...w.props.filter((o) => o.state !== 'gone').map((o) => ({ y: o.y + (o.state === 'held' ? 1 : 0), o })),
      ...(w.tapes ?? []).map((tape) => ({ y: tape.y + 1, tape })),
      ...(w.firstAid ?? []).filter((b) => !b.taken).map((box) => ({ y: box.y - 1, box })),
    ].sort((a, b) => a.y - b.y);
    const spritesOf = ({ f, o, tape, box }) => {
      if (o) return this.props.frame(o.kind, 0, o.x - 8, o.y - 16 - o.z);
      if (box) return this.aid.frame('firstAid', 0, box.x - 8, box.y - 12);
      if (tape) return tapeSprites(this, tape);
      const ms = f.t * MS;
      if (f.kind) return foeSprites(this, this.cast, f, ms);
      if (f.invuln > 0 && f.invuln % 4 < 2 && f.state !== 'step') return [];
      if (f.state === 'bound') return [...bindSprites(this, f), ...this.body.frame(animFor(this.who, f), 0, f.x - 12, f.y - 40 - f.z, f.facing < 0)];
      const flip = f.facing < 0;
      const top = f.y - 40 - f.z;
      const lying = ['down', 'ko'].includes(f.state) ? 8 : 0;
      if (f.team === 'player') return this.body.frame(animFor(this.who, f), ms, f.x - 12, top, flip);
      if (f.dummy) return this.dummyArt.frame('idle', 0, f.x - 8, f.y - 32 - f.z + lying * 2);
      const foeMs = f.state === 'windup' ? 0 : f.state === 'punch' ? 150 : ms;
      return this.cast.frame(`associate.${FOE[f.state]}`, foeMs, f.x - 12, top + lying, flip);
    };
    const boss = this.office && vellum(w);
    const sprites = things.flatMap((t) => keep(spritesOf(t), t.f && (t.f.team === 'player' || t.f === boss)));
    this.layer.draw(sprites);

    const flow = this.registry.get('flow');
    const p = w.fighters.find((f) => f.team === 'player');
    const g = this.hud.clear();
    if (w.ring) drawRing(g, ringShape(w.ring), Math.round(w.ring.x - w.cameraX), w.ring.y);
    drawHud(g, hudLayout({ name: this.who, hp: p.hp, maxHp: PIPS, lives: flow.lives, meter: w.meter }), drawText);
    if (boss) drawBossBar(g, bossBarLayout({ name: 'vellum', hp: boss.hp, maxHp: boss.maxHp }), drawText);
    if (p.state === 'bound') drawText(g, 'MASH!', Math.round(p.x - w.cameraX) - 20, p.y - 56, nes(0x30));
    const run = this.areas && w.run;
    if (run?.prompt) drawText(g, run.prompt, Math.round(WIDTH / 2 - run.prompt.length * 4), SAFE + 64, nes(0x30));
    if (run && !run.locked && run.go > 0 && Math.floor(run.go / 10) % 2) {
      drawText(g, 'GO', WIDTH - 44, SAFE + 64, nes(0x28));
      g.fillStyle(nes(0x28)).fillTriangle(WIDTH - 24, SAFE + 63, WIDTH - 24, SAFE + 73, WIDTH - 16, SAFE + 68);
    }
    if (this.freezeAt !== null) {
      const foes = w.fighters.filter((f) => f.team === 'foe')
        .map((f) => `${f.dummy ? 'DUM' : (f.kind ?? 'foe').slice(0, 3).toUpperCase()} ${f.state.slice(0, 4).toUpperCase()} ${f.hp}`);
      const move = p.state === 'punch' ? `PUNCH${p.combo}` : p.state.toUpperCase();
      drawText(g, `F${this.game.loop.frame} ${move} STOP ${w.hitStop}`, 8, SAFE + 28, nes(0x30));
      drawText(g, foes.join(' '), 8, SAFE + 40, nes(0x38));
    }
    this.debug?.draw(this.layer.stats, this.slowdown);
  }
}
