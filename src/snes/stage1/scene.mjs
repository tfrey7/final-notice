// Stage 1 on the SNES: the shared brawler logic (src/stage1) drawn at 56-64 px over each area's Mode 1
// background (parallax and the hdma floor), the SNES HUD fading when idle, and the throw-into-camera
// finisher on an area's last foe. Areas 1-4; Vellum's office is card 1931.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { hex, rgb15 } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { loadArt, artOr, SpriteLayer } from '../art.mjs';
import { drawHud, hudBrightness, hudLayout, hudWatch } from '../hud.mjs';
import { drawString, measure } from '../text.mjs';
import { currentSong, playSong, sfx, stopSong } from '../audio/player.mjs';
import CLAIMS from '../bg/claims.mjs';
import CLAIMS2 from '../bg/claims2.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { TUNING, shakeOffset } from '../../stage1/moves.mjs';
import { PIPS, newFloor, stepFloor, tuneFor } from '../../stage1/player.mjs';
import { STAGE, areaFor, newStage, stepAreas } from '../../stage1/areas.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { mountTunePanel, registerTuning } from '../../tune.mjs';
import { fastOn, cheapen } from '../../fast.mjs';
import { finisherFrame, finisherTarget, livingFoes, scaledTune } from './finisher.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
const MS = 1000 / 60;
const STAGE_START_MS = 2400;
const BACKGROUNDS = [CLAIMS.areas[0], CLAIMS.areas[1], CLAIMS2.areas[0], CLAIMS2.areas[1]];
const SOUND = {
  punch: 'punch', hit: 'hit', heavy: 'knockdown', jump: 'jump', land: 'land', grab: 'grab', throw: 'throw', step: 'step',
  redTape: 'redTape', guardBreak: 'knockdown', blocked: 'land', breakFree: 'throw', injunction: 'injunction', heal: 'heal',
};
const BODY_H = 60;
const WHITE = rgb15(31, 31, 31);
const FOE_PALETTES = {
  associate: [rgb15(2, 2, 4), rgb15(12, 12, 14), rgb15(22, 22, 24)],
  manager: [rgb15(2, 2, 4), rgb15(24, 16, 4), rgb15(30, 28, 18)],
  counsel: [rgb15(2, 2, 4), rgb15(20, 6, 6), rgb15(28, 18, 16)],
  supervisor: [rgb15(2, 2, 4), rgb15(6, 10, 22), rgb15(18, 22, 30)],
};
const PROP_PALETTE = [rgb15(2, 2, 4), rgb15(16, 10, 4), rgb15(28, 24, 14)];
const WARD_ANIM = { idle: 'idle', walk: 'walk', run: 'walk', hurt: 'hit', held: 'hit', knockdown: 'hit', bound: 'hit', down: 'recoil', ko: 'recoil', jump: 'wind', carry: 'idle', throw: 'punch2', grab: 'punch1', step: 'walk' };

export class SnesStage1Scene extends Phaser.Scene {
  constructor() {
    super('stage1');
  }

  async create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'stage1') state = jumpTo('stage1');
    this.registry.set('flow', state);
    this.ready = false;
    this.paused = false;
    this.fast = fastOn();
    const params = new URLSearchParams(location.search);
    this.freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null;
    playSong('stageStart');
    this.time.delayedCall(STAGE_START_MS, () => { if (this.paused) this.resume = SONGS.stage1; else playSong(SONGS.stage1); });

    this.who = state.auditor;
    this.base = registerTuning(`snes-brawl-${this.who}`, tuneFor(this.who), RANGES);
    this.tune = scaledTune(this.base, STAGE1.scale);
    this.world = newStage(newFloor(this.who, this.tune), this.tune, areaFor(state.checkpoint));
    this.fin = null;

    await loadArt('ward').catch(() => null);
    this.ward = artOr(this, 'ward');
    this.baked = BACKGROUNDS.map(bakeScene);
    this.tex = this.textures.exists('snes-stage1-bg') ? this.textures.get('snes-stage1-bg') : this.textures.createCanvas('snes-stage1-bg', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-stage1-bg').setOrigin(0);
    this.layer = new SpriteLayer(this, 10);
    this.finImages = [];
    this.g = this.add.graphics().setDepth(20).setScrollFactor(0);
    this.hudSprites = new SpriteLayer(this, 21);
    this.fill = (x, y, w, h, c) => this.g.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.watch = hudWatch();
    if (params.has('tune') && !this.panel) this.panel = mountTunePanel();
    this.events.once('shutdown', () => { this.panel?.remove(); this.panel = null; });
    this.ready = true;
  }

  update(time) {
    if (!this.ready) return;
    const loopFrame = this.game.loop.frame;
    if (this.freezeAt !== null && loopFrame >= this.freezeAt) return;
    const pad = pollPad(loopFrame);
    if (pad.pressed.has('start')) this.togglePause();
    if (this.paused) { this.draw(time); return; }
    Object.assign(this.tune, scaledTune(this.base, STAGE1.scale));
    if (this.fast) cheapen(this.world.fighters);

    const w = this.world;
    const before = livingFoes(w);
    stepFloor(w, pad, this.tune);
    const target = finisherTarget(w, before);
    if (target) this.startFinisher(target);
    stepAreas(w, this.tune);
    if (this.fin && finisherFrame(++this.fin.t).done) this.fin = null;
    for (const e of w.events) {
      if (SOUND[e]) sfx(SOUND[e]);
      if (e.startsWith('checkpoint:')) this.registry.set('flow', next(this.registry.get('flow'), { type: 'checkpoint', id: e.slice(11) }));
      // Vellum's office is its own card (1931); until then the door ends the stage.
      if (e === 'toOffice') { showFlow(this, next(this.registry.get('flow'), { type: 'stageClear' })); return; }
      if (e === 'lifeLost') {
        const after = next(this.registry.get('flow'), { type: 'lifeLost' });
        if (after.screen !== 'stage1') { showFlow(this, after); return; }
        this.registry.set('flow', after);
      }
    }
    this.draw(time);
  }

  // The last foe of an area flies at the screen: hold the fight still, shake, and grow its sprite.
  startFinisher(foe) {
    this.fin = { foe, t: 0, x: foe.x - this.world.cameraX, y: foe.y - BODY_H / 2 };
    this.world.hitStop = Math.max(this.world.hitStop, STAGE1.finisherHitStop);
    this.world.shake = this.tune.shakeFrames;
    sfx('throw');
  }

  togglePause() {
    this.paused = !this.paused;
    sfx('pause');
    if (this.paused) {
      this.resume = currentSong() === 'stageStart' ? SONGS.stage1 : currentSong() ?? this.resume;
      stopSong();
    } else if (this.resume) {
      playSong(this.resume);
    }
  }

  foeSprites(f, sx, ms) {
    if (f.state === 'ko' && f.t > 16 && Math.floor(f.t / 3) % 2) return [];
    if (f.invuln > 0 && f.invuln % 4 < 2) return [];
    const lying = ['down', 'ko'].includes(f.state);
    const h = lying ? 24 : BODY_H;
    const w = lying ? 56 : 32;
    const flash = f.state === 'windup' && f.t % 8 < 2;
    const palette = flash ? [WHITE, WHITE, WHITE] : FOE_PALETTES[f.kind] ?? FOE_PALETTES.associate;
    const name = `foe:${f.kind}:${lying ? 'down' : 'up'}${flash ? ':flash' : ''}`;
    return artOr(this, name, { w, h, palette }).frame('stand', ms, Math.round(sx - w / 2), Math.round(f.y - h - f.z));
  }

  playerSprites(p, sx, ms) {
    if (p.invuln > 0 && p.invuln % 4 < 2 && p.state !== 'step') return [];
    const flip = p.facing < 0;
    if (this.who === 'ward' && !this.ward.standIn) {
      const anim = p.state === 'punch' ? (p.combo >= 3 ? 'uppercut' : 'jab') : WARD_ANIM[p.state] ?? 'idle';
      return this.ward.frame(anim, ms, Math.round(sx), Math.round(p.y - p.z), flip);
    }
    const stand = artOr(this, `auditor:${this.who}`, { w: 32, h: BODY_H + 2, palette: [rgb15(2, 2, 4), rgb15(6, 8, 18), rgb15(28, 22, 16)] });
    return stand.frame('stand', ms, Math.round(sx - 16), Math.round(p.y - BODY_H - 2 - p.z), flip);
  }

  draw(time) {
    const w = this.world;
    const shake = shakeOffset(w, this.tune);
    const cam = Math.round(w.cameraX);
    const area = Math.max(0, STAGE.starts.findLastIndex((s) => cam + WIDTH / 2 >= s));
    composeFrame(BACKGROUNDS[area], this.baked[area], cam - STAGE.starts[area] + shake.x, 0, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    this.cameras.main.setScroll(0, shake.y);

    const things = [
      ...w.fighters.filter((f) => f !== this.fin?.foe).map((f) => ({ y: f.y, f })),
      ...w.props.filter((o) => o.state !== 'gone').map((o) => ({ y: o.y + (o.state === 'held' ? 1 : 0), o })),
      ...(w.tapes ?? []).map((tape) => ({ y: tape.y + 1, tape })),
      ...(w.firstAid ?? []).filter((b) => !b.taken).map((box) => ({ y: box.y - 1, box })),
    ].sort((a, b) => a.y - b.y);
    const at = (x) => x - cam - shake.x;
    const sprites = things.flatMap(({ f, o, tape, box }) => {
      if (o) return artOr(this, `prop:${o.kind}`, { w: 24, h: 24, palette: PROP_PALETTE }).frame('stand', 0, Math.round(at(o.x) - 12), Math.round(o.y - 24 - o.z * STAGE1.scale));
      if (box) return artOr(this, 'prop:firstAid', { w: 24, h: 16, palette: [rgb15(2, 2, 4), WHITE, rgb15(28, 4, 4)] }).frame('stand', 0, Math.round(at(box.x) - 12), box.y - 16);
      if (tape) return artOr(this, 'prop:tape', { w: 24, h: 8, palette: [rgb15(2, 2, 4), rgb15(26, 4, 4), WHITE] }).frame('stand', 0, Math.round(at(tape.x) - 12), tape.y - 40);
      const ms = f.t * MS;
      return f.team === 'player' ? this.playerSprites(f, at(f.x), ms) : this.foeSprites(f, at(f.x), ms);
    });
    this.layer.draw(sprites);
    this.drawFinisher();
    this.drawHud(time);
  }

  // The finisher's growing frames as scaled images over the sprite layer, like the drawn frames of
  // Turtles in Time: its OAM entries, each scaled about the foe's centre as it flies to the screen's.
  drawFinisher() {
    const fin = this.fin;
    this.finImages.forEach((img) => img.setVisible(false));
    if (!fin) return;
    const step = finisherFrame(fin.t);
    if (step.impact) this.world.shake = this.tune.shakeFrames;
    const palette = [rgb15(2, 2, 4), FOE_PALETTES[fin.foe.kind]?.[1] ?? WHITE, WHITE];
    const entries = artOr(this, `foe:${fin.foe.kind}:up`, { w: 32, h: BODY_H, palette }).frame('stand', 0, fin.x - 16, fin.y - BODY_H / 2);
    const cx = fin.x + (WIDTH / 2 - fin.x) * step.toward;
    const cy = fin.y + (HEIGHT / 2 - fin.y) * step.toward;
    entries.forEach((e, i) => {
      const img = this.finImages[i] ?? (this.finImages[i] = this.add.image(0, 0, e.key).setOrigin(0).setDepth(15).setScrollFactor(0));
      img.setTexture(e.key).setScale(step.scale).setVisible(true)
        .setPosition(Math.round(cx + (e.x - fin.x) * step.scale), Math.round(cy + (e.y - fin.y) * step.scale));
    });
  }

  drawHud(time) {
    const w = this.world;
    const flow = this.registry.get('flow');
    const p = w.fighters.find((f) => f.team === 'player');
    const state = { name: this.who, hp: p.hp, maxHp: PIPS, lives: flow.lives, meter: w.meter };
    const layout = hudLayout(state);
    const alpha = this.paused || w.run?.prompt ? 1 : hudBrightness(this.watch.see(state, time)) / 15;
    this.g.clear();
    drawHud(this.fill, layout);
    const { portrait } = layout;
    this.hudSprites.draw(artOr(this, `hud-portrait-${this.who}`, { w: 20, h: 20, palette: [rgb15(1, 1, 1), rgb15(11, 11, 13), WHITE] })
      .frame('stand', 0, portrait.x + 2, portrait.y + 2));
    this.hudSprites.pool.forEach((img) => img.setAlpha(alpha).setScrollFactor(0));
    this.g.setAlpha(alpha);

    const run = w.run;
    const centred = (text, y, colour) => drawString(this.fill, text, (WIDTH - measure(text)) >> 1, y, colour);
    if (run?.prompt) centred(run.prompt, 64);
    if (run && !run.locked && run.go > 0 && Math.floor(run.go / 10) % 2) {
      drawString(this.fill, 'GO', WIDTH - 40, 64, rgb15(31, 26, 8));
      this.g.fillStyle(hex(rgb15(31, 26, 8))).fillTriangle(WIDTH - 22, 63, WIDTH - 22, 73, WIDTH - 14, 68);
    }
    if (p.state === 'bound') drawString(this.fill, 'MASH!', Math.round(p.x - w.cameraX) - 16, p.y - 80);
    if (this.paused) centred('PAUSE', 100);
  }
}
