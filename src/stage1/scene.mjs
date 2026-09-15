// Stage 1: the chosen auditor on one long scrolling test floor, with the HUD strip on top.
/* global Phaser */
import { SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next } from '../flow.mjs';
import { TUNING, shakeOffset } from './moves.mjs';
import { FLOOR_W, PIPS, animFor, newFloor, stepFloor, tuneFor } from './player.mjs';
import { registerTuning, mountTunePanel } from '../tune.mjs';
import { drawText, showFlow } from '../scenes/placeholder.mjs';
import { HUD_HEIGHT, drawHud, hudLayout } from '../hud.mjs';
import { pose, spawnStaff } from './staff.mjs';
import { bindSprites, foeSprites, tapeSprites } from './foe-actors.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
const MS = 1000 / 60;
const SOUND = {
  punch: 'punch', hit: 'hit', heavy: 'knockdown', jump: 'jump', land: 'land', grab: 'grab', throw: 'throw', step: 'step',
  redTape: 'redTape', guardBreak: 'knockdown', blocked: 'land', breakFree: 'throw',
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
    playSong(SONGS.stage1);
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
    await Promise.all([loadArt('ward'), loadArt('cast')]);
    this.body = this.who === 'ward' ? artOr(this, 'ward') : artOr(this, 'cast');
    this.cast = artOr(this, 'cast');
    this.dummyArt = artOr(this, 'dummy', { w: 16, h: 32, palette: [0x0f, 0x07, 0x27] });
    this.props = artOr(this, 'spells', { w: 16, h: 16, palette: [0x0f, 0x00, 0x2d] });

    this.drawFloor(this.add.graphics());
    this.hud = this.add.graphics().setDepth(20).setScrollFactor(0);
    this.layout = hudLayout({ name: this.who, hp: PIPS, lives: state.lives, meter: 0 });
    const { x, y } = this.layout.portrait;
    const portrait = this.who === 'ward'
      ? this.body.frame('portrait', 0, x, y)
      : artOr(this, 'mercer', { w: 16, h: 16, palette: [0x0f, 0x02, 0x28] }).frame('portrait', 0, x, y);
    for (const s of portrait) this.add.image(s.x, s.y, s.key).setOrigin(0).setScrollFactor(0).setDepth(21).setFlip(s.flipX, s.flipY);
    this.layer = new SpriteLayer(this);
    if (params.has('tune') && !this.panel) this.panel = mountTunePanel();
    this.events.once('shutdown', () => { this.panel?.remove(); this.panel = null; });
    this.ready = true;
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

  update() {
    if (!this.ready) return;
    const loopFrame = this.game.loop.frame;
    const pad = pollPad(loopFrame);
    const flow = this.registry.get('flow');
    if (pad.pressed.has('start')) { showFlow(this, next(flow, { type: 'stageClear' })); return; }
    if (this.freezeAt !== null && loopFrame >= this.freezeAt) return;

    stepFloor(this.world, pad, this.tune);
    for (const e of this.world.events) {
      if (SOUND[e]) sfx(SOUND[e]);
      if (e === 'lifeLost') {
        const after = next(flow, { type: 'lifeLost' });
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
    ].sort((a, b) => a.y - b.y);
    const sprites = things.flatMap(({ f, o, tape }) => {
      if (o) return this.props.frame(o.kind, 0, o.x - 8, o.y - 16 - o.z);
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
    });
    this.layer.draw(sprites);

    const flow = this.registry.get('flow');
    const p = w.fighters.find((f) => f.team === 'player');
    const g = this.hud.clear();
    drawHud(g, hudLayout({ name: this.who, hp: p.hp, maxHp: PIPS, lives: flow.lives, meter: w.meter }), drawText);
    if (p.state === 'bound') drawText(g, 'MASH!', Math.round(p.x - w.cameraX) - 20, p.y - 56, nes(0x30));
    if (this.freezeAt !== null) {
      const foes = w.fighters.filter((f) => f.team === 'foe')
        .map((f) => `${f.dummy ? 'DUM' : (f.kind ?? 'foe').slice(0, 3).toUpperCase()} ${f.state.slice(0, 4).toUpperCase()} ${f.hp}`);
      const move = p.state === 'punch' ? `PUNCH${p.combo}` : p.state.toUpperCase();
      drawText(g, `F${this.game.loop.frame} ${move} STOP ${w.hitStop}`, 8, SAFE + 28, nes(0x30));
      drawText(g, foes.join(' '), 8, SAFE + 40, nes(0x38));
    }
  }
}
