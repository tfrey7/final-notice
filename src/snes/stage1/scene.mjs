// Stage 1 on the SNES: the shared brawler logic (src/stage1) drawn at 56-64 px over each area's Mode 1
// background (parallax and the hdma floor), the always-on SNES HUD, and the throw-into-camera
// finisher on an area's last foe. Area 5 is Vellum's locked office (office.mjs); the sound and barks
// are voices.mjs, the sprites sprites.mjs, the HUD and cards huddraw.mjs, and Stages 3 and 5 bring
// their own floors in their hooks files.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { hex } from '../color.mjs';
import { fromRgba, screen, toRgba } from '../fx.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { loadArt, artOr, SpriteLayer } from '../art.mjs';
import { postReceipt } from '../hud.mjs';
import { endHold, holdMusic, playSong, sfx } from '../audio/player.mjs';
import CLAIMS from '../bg/claims.mjs';
import CLAIMS2 from '../bg/claims2.mjs';
import RECEPTION from '../bg/reception.mjs';
import { pollPad } from '../../input.mjs';
import { CHECKPOINTS, jumpTo, next, showFlow } from '../../flow.mjs';
import { TUNING, shakeOffset } from '../../stage1/moves.mjs';
import { newFloor, stepFloor } from '../../stage1/player.mjs';
import { freeInjunction } from '../../injunction.mjs';
import { areaFor, newStage, stepAreas } from '../../stage1/areas.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { mountTunePanel, registerTuning } from '../../tune.mjs';
import { fastOn, cheapen } from '../../fast.mjs';
import { PROFILES } from '../../platform.mjs';
import { createSlowdown, pairs, slowdownTick } from '../../slowdown.mjs';
import { vellum } from '../../stage1/vellum.mjs';
import { finisherFrame, finisherTarget, livingFoes, scaledTune } from './finisher.mjs';
import { SNES_STAGE1 } from './waves.mjs';
import { STAGE3_DEF } from '../stage3/hooks.mjs';
import { STAGE5_DEF } from '../stage5/hooks.mjs';
import { snesTune, useSnesTables } from '../fight.mjs';
import { closePause, holdings, openPause, stepPause } from '../pause.mjs';
import { DIM_TINT, PauseOverlay, drawPause } from '../pausedraw.mjs';
import { mountControls } from '../../controls.mjs';
import { OFFICE, clearDone } from './boss.mjs';
import { bakeOffice, bossBeat, drawOffice, entrancePan, officeArt, openOffice, stepCard, stepEntrance } from './office.mjs';
import { MENU_SOUNDS, newVoices, soundFrame, speakVoices, startMusic, voiceState } from './voices.mjs';
import { BODY_H, drawFinisher, drawMarks, drawThings } from './sprites.mjs';
import { drawBrawlHud } from './huddraw.mjs';
import { armWorld, defaultWeapons, scaledWeapons, stageSmash } from '../../stage1/weapons.mjs';
import { routeLights } from '../../stage1/combo.mjs';
import { readSettings } from '../memo.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
const BACKGROUNDS = [RECEPTION, CLAIMS.areas[1], CLAIMS2.areas[0], CLAIMS2.areas[1]];
const OFFICE_BG = CLAIMS2.areas[2];
const STAGE1_DEF = { number: 1, table: SNES_STAGE1, checkpoints: CHECKPOINTS.stage1, backgrounds: BACKGROUNDS, weapons: true };

export class SnesStage1Scene extends Phaser.Scene {
  constructor(key = 'stage1', def = STAGE1_DEF) {
    super(key);
    this.stageKey = key;
    this.def = def;
  }

  async create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== this.stageKey) state = jumpTo(this.stageKey);
    this.registry.set('flow', state);
    this.ready = false;
    this.paused = false;
    this.fast = fastOn();
    const params = new URLSearchParams(location.search);
    this.freezeAt = params.has('freeze') ? Number(params.get('freeze')) : null;
    // ?paused opens Form 13-B on the first frame, for a screenshot.
    this.openOnReady = params.has('paused');
    this.office = state.checkpoint === OFFICE;
    this.pinch = false;
    // The run's clock survives the restart into the office; ?clear holds the stage-clear card still.
    if (!this.office) this.registry.set('stage1Frames', 0);
    this.clear = params.has('clear') ? { t: 0, still: true } : null;
    startMusic(this);

    this.who = state.auditor;
    useSnesTables();
    this.base = registerTuning(`snes-brawl-${this.who}`, snesTune(this.who), RANGES);
    this.tune = scaledTune(this.base, STAGE1.scale);
    this.fin = null;
    this.voices = newVoices(this.who);
    this.slowdown = createSlowdown();
    if (this.office) {
      openOffice(this, params);
    } else {
      this.world = newStage(newFloor(this.who, this.tune), this.tune, areaFor(state.checkpoint, this.def.checkpoints, this.def.table.areas.length), this.def.table);
      if (this.def.arm) this.def.arm(this.world);
      else if (this.def.weapons) armWorld(this.world, stageSmash(this.world.stage.starts), scaledWeapons(defaultWeapons(), STAGE1.scale));
    }
    this.world.cooldown = freeInjunction();

    await Promise.all([loadArt('ward').catch(() => null), ...(this.office ? [officeArt()] : [])]);
    this.ward = artOr(this, 'ward');
    this.baked = this.office ? bakeOffice(OFFICE_BG) : this.def.backgrounds.map(bakeScene);
    this.buf15 = screen();
    this.tex = this.textures.exists('snes-stage1-bg') ? this.textures.get('snes-stage1-bg') : this.textures.createCanvas('snes-stage1-bg', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-stage1-bg').setOrigin(0);
    this.layer = new SpriteLayer(this, 10);
    this.marks = this.add.graphics().setDepth(12);
    this.markFill = (x, y, w, h, c) => this.marks.fillStyle(hex(c)).fillRect(x, y, w, h);
    // ?boxes: H toggles the debug overlay (hit and hurt boxes, turn owners, state tags), starting on.
    this.boxes = params.has('boxes');
    const onKey = (e) => { if (e.code === 'KeyH') this.boxes = !this.boxes; };
    if (this.boxes) window.addEventListener('keydown', onKey);
    this.finImages = [];
    this.g = this.add.graphics().setDepth(20).setScrollFactor(0);
    this.hudSprites = new SpriteLayer(this, 21);
    this.overlay = new PauseOverlay(this);
    this.menu = null;
    this.fill = (x, y, w, h, c, step = 15) => this.g.fillStyle(hex(c), step / 15).fillRect(x, y, w, h);
    this.receipt = null;
    this.drain = null;
    this.guide = null;
    this.guideOn = readSettings((() => { try { return localStorage; } catch { return null; } })()).guide === 'on';
    if (params.has('tune') && !this.panel) this.panel = mountTunePanel();
    this.controls?.remove();
    this.controls = mountControls(`stage1:${this.who}`);
    this.events.once('shutdown', () => {
      this.panel?.remove(); this.panel = null;
      this.controls?.remove(); this.controls = null;
      window.removeEventListener('keydown', onKey);
    });
    this.ready = true;
  }

  update(time) {
    if (!this.ready) return;
    const loopFrame = this.game.loop.frame;
    if (this.freezeAt !== null && loopFrame >= this.freezeAt) return;
    const pad = pollPad(loopFrame);
    if ((pad.pressed.has('start') && !this.entrance) || this.openOnReady) this.togglePause(), this.openOnReady = false;
    else if (this.paused) this.stepMenu(pad);
    if (this.paused) { this.draw(time); return; }
    Object.assign(this.tune, scaledTune(this.base, STAGE1.scale));
    if (this.fast) cheapen(this.world.fighters);

    const w = this.world;
    if (this.clear) {
      if (!this.clear.still && clearDone(++this.clear.t, pad)) { showFlow(this, next(this.registry.get('flow'), { type: 'stageClear' })); return; }
      this.draw(time);
      return;
    }
    // The office holds the fight while the camera pans in and his memo is filed.
    if (this.entrance && stepEntrance(this, pad)) { this.draw(time); return; }
    if (this.card && stepCard(this)) { this.draw(time); return; }
    const props = w.props.filter((o) => o.state !== 'gone').length;
    const work = { objects: w.fighters.length + props, collisions: pairs(w.fighters.length) + w.fighters.length * props, sprites: this.layer.stats?.count ?? 0 };
    if (!slowdownTick(this.slowdown, work, PROFILES.snes.slowdownBudget)) { this.draw(time); return; }
    const boss = this.office && vellum(w);
    const p = w.fighters.find((f) => f.team === 'player');
    const bossHp = boss?.hp;
    const playerHp = p.hp;
    const before = livingFoes(w);
    const frames = (this.registry.get('stage1Frames') ?? 0) + 1;
    this.registry.set('stage1Frames', frames);
    const said = voiceState(w);
    stepFloor(w, pad, this.tune);
    speakVoices(this.voices, w, said, frames, loopFrame);
    if (boss) bossBeat(this, w, boss, bossHp, playerHp, p);
    const target = !this.office && finisherTarget(w, before);
    if (target) this.startFinisher(target);
    if (!this.office) {
      stepAreas(w, this.tune);
      this.def.step?.(w, this.tune);
    }
    if (this.fin && finisherFrame(++this.fin.t).done) this.fin = null;
    soundFrame(this.voices, w, { frames, loopFrame, target, hurt: p.hp < playerHp, before: said });
    for (const e of w.events) {
      if (e === 'heal') this.receipt = postReceipt(this.receipt, time);
      if (e.startsWith('checkpoint:')) this.registry.set('flow', next(this.registry.get('flow'), { type: 'checkpoint', id: e.slice(11) }));
      if (e === 'bossDown') { w.shake = this.tune.shakeFrames; playSong('stageClear'); }
      if (e === 'bossBeaten') { this.clear = { t: 0, still: false }; break; }
      if (e === 'stageExit') { playSong('stageClear'); this.clear = { t: 0, still: false }; break; }
      if (e === 'toOffice') {
        this.registry.set('flow', next(this.registry.get('flow'), { type: 'checkpoint', id: OFFICE }));
        this.scene.restart();
        return;
      }
      if (e === 'lifeLost') {
        const after = next(this.registry.get('flow'), { type: 'lifeLost' });
        if (after.screen !== this.stageKey) { showFlow(this, after); return; }
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
    sfx('finisher');
  }

  togglePause() {
    this.paused = !this.paused;
    this.controls?.show(this.paused);
    sfx('pause');
    if (this.paused) {
      holdMusic();
      const rows = holdings({ lives: this.registry.get('flow').lives, meter: this.world.meter });
      const p = this.world.fighters.find((f) => f.team === 'player');
      this.menu = openPause(performance.now(), this.menu, { rows, routes: routeLights(p, this.tune) });
    } else {
      this.menu = closePause(this.menu, performance.now());
      endHold();
      if (this.resume) playSong(this.resume);
      this.resume = null;
    }
  }

  // Stage 1 carries no enchantments, so the form shows the combo routes where attachments would be.
  stepMenu(pad) {
    const { menu, action } = stepPause(this.menu, pad);
    this.menu = menu;
    if (action === 'close') this.togglePause();
    if (MENU_SOUNDS[action]) sfx(MENU_SOUNDS[action]);
  }

  draw(time) {
    const w = this.world;
    const shake = shakeOffset(w, this.tune);
    const pan = this.entrance ? entrancePan(this) : 0;
    const cam = Math.round(w.cameraX) - pan;
    if (this.office) {
      drawOffice(this, OFFICE_BG, shake, pan);
    } else {
      const { starts } = w.stage;
      const area = Math.max(0, starts.findLastIndex((s) => cam + WIDTH / 2 >= s));
      composeFrame(this.def.backgrounds[area], this.baked[area], cam - starts[area] + shake.x, 0, this.pixels.data);
    }
    const paused = this.paused && this.menu;
    if (paused) {
      const buf = drawPause(fromRgba(this.pixels.data, this.buf15), this.menu, this.game.loop.frame);
      toRgba(buf, this.pixels.data);
      this.overlay.show(buf);
    } else {
      this.overlay.hide();
    }
    [this.layer, this.hudSprites].forEach((l) => l.pool.forEach((img) => img.setTint(paused ? DIM_TINT : 0xffffff)));
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    this.cameras.main.setScroll(0, shake.y);

    drawThings(this, cam, shake);
    drawMarks(this, cam + shake.x);
    drawFinisher(this);
    drawBrawlHud(this, time);
  }
}

// Stage 3, the Backrooms: the same brawl on its own floor, no office at the end, the far door clears it.
export class SnesStage3Scene extends SnesStage1Scene {
  constructor() {
    super('stage3', STAGE3_DEF);
  }
}

// Stage 5, the executive chapel: the brawl among pews and altar-desks, whose ritual anoints the staff.
export class SnesStage5Scene extends SnesStage1Scene {
  constructor() {
    super('stage5', STAGE5_DEF);
  }
}
