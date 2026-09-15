// Stage 1 as a playable brawl with the stand-in cast: Ward against waves of Security Associates.
/* global Phaser */
import { WIDTH, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next } from '../flow.mjs';
import { TUNING, FLOOR, defaultTune, newWorld, shakeOffset, step } from '../brawl.mjs';
import { registerTuning, mountTunePanel } from '../tune.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
import { drawText, showFlow } from './placeholder.mjs';

const MS = 1000 / 60;

// The player's state to a ward.mjs animation, and how its time runs.
const WARD = {
  idle: 'idle', walk: 'walk', run: 'walk', punch: null, jump: 'jump', land: 'step', grab: 'grab', throw: 'throw',
  hurt: 'hit', knockdown: 'knockdown', down: 'down', getup: 'step', held: 'hit',
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
    playSong(SONGS.stage1);
    this.cameras.main.setBackgroundColor(nes(0x0f));
    const params = new URLSearchParams(location.search);
    this.freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null;

    this.tune = registerTuning('brawl', defaultTune(), RANGES);
    this.world = newWorld(this.tune);
    await Promise.all([loadArt('ward'), loadArt('cast')]);
    this.ward = artOr(this, 'ward');
    this.cast = artOr(this, 'cast');

    const bg = this.add.graphics();
    bg.fillStyle(nes(0x07)).fillRect(0, SAFE + 24, WIDTH, FLOOR.top - 40 - SAFE - 24);
    bg.fillStyle(nes(0x17)).fillRect(0, FLOOR.top - 40, WIDTH, 8);
    bg.fillStyle(nes(0x26)).fillRect(0, FLOOR.top - 32, WIDTH, FLOOR.bottom - FLOOR.top + 40);
    bg.fillStyle(nes(0x16));
    for (let y = FLOOR.top - 16; y < FLOOR.bottom + 8; y += 16) bg.fillRect(0, y, WIDTH, 1);
    this.hud = this.add.graphics().setDepth(20);
    this.layer = new SpriteLayer(this);
    if (params.has('tune') && !this.panel) this.panel = mountTunePanel();
    this.events.once('shutdown', () => { this.panel?.remove(); this.panel = null; });
    this.ready = true;
  }

  update() {
    if (!this.ready) return;
    const loopFrame = this.game.loop.frame;
    const pad = pollPad(loopFrame);
    const flow = this.registry.get('flow');
    if (pad.pressed.has('start')) { showFlow(this, next(flow, { type: 'stageClear' })); return; }
    if (this.freezeAt !== null && loopFrame >= this.freezeAt) return;

    step(this.world, pad, this.tune);
    for (const e of this.world.events) {
      if (e === 'hit' || e === 'heavy' || e === 'throw') sfx('punch');
      if (e === 'jump') sfx('jump');
      if (e === 'lifeLost') {
        const after = next(flow, { type: 'lifeLost' });
        if (after.screen !== 'stage1') { showFlow(this, after); return; }
        this.registry.set('flow', after);
      }
    }
    const shake = shakeOffset(this.world, this.tune);
    this.cameras.main.setScroll(shake.x, shake.y);
    this.draw();
  }

  draw() {
    const sprites = [...this.world.fighters].sort((a, b) => a.y - b.y).flatMap((f) => {
      if (f.invuln > 0 && f.invuln % 4 < 2) return [];
      const ms = f.t * MS;
      const flip = f.facing < 0;
      const top = f.y - 40 - f.z;
      if (f.team === 'player') {
        const anim = f.state === 'jump' && f.kicked ? 'jumpKick' : WARD[f.state] ?? `punch${f.combo}`;
        return this.ward.frame(anim, f.state === 'run' ? ms * 2 : ms, f.x - 12, top, flip);
      }
      const lying = ['down', 'ko'].includes(f.state) ? 8 : 0;
      const foeMs = f.state === 'windup' ? 0 : f.state === 'punch' ? 150 : ms;
      return this.cast.frame(`associate.${FOE[f.state]}`, foeMs, f.x - 12, top + lying, flip);
    });
    this.layer.draw(sprites);

    const flow = this.registry.get('flow');
    const p = this.world.fighters.find((f) => f.team === 'player');
    const g = this.hud.clear();
    drawText(g, `${flow.auditor.toUpperCase()}  LIVES ${flow.lives}`, 8, SAFE + 4, nes(0x30));
    g.fillStyle(nes(0x00)).fillRect(8, SAFE + 14, this.tune.playerHp * 4, 4);
    g.fillStyle(nes(0x2a)).fillRect(8, SAFE + 14, p.hp * 4, 4);
    drawText(g, `WAVE ${this.world.wave}`, WIDTH - 64, SAFE + 4, nes(0x28));
    if (this.freezeAt !== null) {
      const foes = this.world.fighters.filter((f) => f.team === 'foe').map((f) => `${f.state.slice(0, 4).toUpperCase()} ${f.hp}`);
      const move = p.state === 'punch' ? `PUNCH${p.combo}` : p.state.toUpperCase();
      drawText(g, `F${this.game.loop.frame} ${move} STOP ${this.world.hitStop}`, 8, SAFE + 24, nes(0x30));
      drawText(g, foes.join('  '), 8, SAFE + 36, nes(0x38));
    }
  }
}
