// Stage 1 on the SNES: the shared brawler logic (src/stage1) drawn at 56-64 px over each area's Mode 1
// background (parallax and the hdma floor), the always-on SNES HUD, and the throw-into-camera
// finisher on an area's last foe. Area 5 is Vellum's locked office: his memo title card and voice
// line, the boss bar, his fangs as a colour-math red flash, and his slump into Scene 2.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { hex, rgb15 } from '../color.mjs';
import { colorMath, fromRgba, screen, toRgba } from '../fx.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { loadArt, artOr, SpriteLayer } from '../art.mjs';
import { drainStep, drawHud, hudLayout, postReceipt } from '../hud.mjs';
import { drawString, measure } from '../text.mjs';
import { bark, barkFrames, endHold, holdMusic, playSong, sfx } from '../audio/player.mjs';
import { brawlSound } from '../audio/brawl.mjs';
import { bark as pickBark, barkKind, newBarker } from '../barks.mjs';
import { VELLUM_PINCH, VELLUM_SONG, vellumPinch } from '../audio/cues.mjs';
import { barkMoments, createBarker, snapshot } from '../audio/barks.mjs';
import { barkLength, loadBarks, playBark } from '../audio/barkplayer.mjs';
import CLAIMS from '../bg/claims.mjs';
import CLAIMS2 from '../bg/claims2.mjs';
import RECEPTION from '../bg/reception.mjs';
import { pollPad } from '../../input.mjs';
import { CHECKPOINTS, SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { TUNING, shakeOffset } from '../../stage1/moves.mjs';
import { PIPS, newFloor, stepFloor, tuneFor } from '../../stage1/player.mjs';
import { freeInjunction } from '../../injunction.mjs';
import { areaFor, newStage, stepAreas } from '../../stage1/areas.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { mountTunePanel, registerTuning } from '../../tune.mjs';
import { fastOn, cheapen } from '../../fast.mjs';
import { PROFILES } from '../../platform.mjs';
import { createSlowdown, pairs, slowdownTick } from '../../slowdown.mjs';
import { enterOffice, poseOffice, vellum } from '../../stage1/vellum.mjs';
import { finisherFrame, finisherTarget, livingFoes, scaledTune } from './finisher.mjs';
import { SNES_STAGE1 } from './waves.mjs';
import { SNES_STAGE3 } from '../stage3/waves.mjs';
import { SNES_STAGE5, armChapel, stepRitual } from '../stage5/chapel.mjs';
import { thingPriority, withPriority } from './priority.mjs';
import { snesTune, useSnesTables } from '../fight.mjs';
import { closePause, holdings, openPause, stepPause } from '../pause.mjs';
import { DIM_TINT, PauseOverlay, drawPause } from '../pausedraw.mjs';
import { mountControls } from '../../controls.mjs';
import { CARD, OFFICE, bossHitStop, cardFrame, clearDone, clearLines, fangFlash } from './boss.mjs';
import { VELLUM_IN, skipTo, vellumEntrance } from '../entrance.mjs';
import { armWorld, defaultWeapons, scaledWeapons, stageSmash } from '../../stage1/weapons.mjs';
import { SHAPE, turnOwners } from '../../stage1/readout.mjs';
import { guideStep, liveRoutes, routeLights } from '../../stage1/combo.mjs';
import { drawReadout } from '../readout.mjs';
import { drawCombo, drawGuide, drawSparks } from '../hitfx.mjs';
import { readSettings } from '../memo.mjs';

const RANGES = Object.fromEntries(Object.entries(TUNING).map(([k, [, min, max, stepSize]]) => [k, [min, max, stepSize]]));
const MS = 1000 / 60;
const STAGE_START_MS = 2400;
const BACKGROUNDS = [RECEPTION, CLAIMS.areas[1], CLAIMS2.areas[0], CLAIMS2.areas[1]];
const OFFICE_BG = CLAIMS2.areas[2];
const STAGE1_DEF = { number: 1, table: SNES_STAGE1, checkpoints: CHECKPOINTS.stage1, backgrounds: BACKGROUNDS, weapons: true };
// Stage 3's grey box borrows Stage 1's rooms until the Backrooms art lands; its break room is one screen.
const STAGE3_DEF = { number: 3, table: SNES_STAGE3, checkpoints: CHECKPOINTS.stage3, backgrounds: [RECEPTION, CLAIMS2.areas[1], CLAIMS2.areas[0], CLAIMS2.areas[1]] };
// Stage 5's grey box borrows rooms too; its altar-desks are furniture (`arm`) and its ritual runs after the areas (`step`).
const STAGE5_DEF = { number: 5, table: SNES_STAGE5, checkpoints: CHECKPOINTS.stage5, backgrounds: [CLAIMS2.areas[0], CLAIMS2.areas[1], CLAIMS.areas[1], CLAIMS2.areas[2]], arm: armChapel, step: stepRitual };
const MENU_SOUNDS = { move: 'pencil', swap: 'stampOk', close: 'paperSlide', thud: 'stamp' };
const VELLUM_PALETTE = [rgb15(2, 1, 3), rgb15(9, 2, 5), rgb15(26, 22, 20)];
const MEMO = { paper: rgb15(29, 28, 23), rule: rgb15(18, 16, 12), ink: rgb15(3, 3, 6), stamp: rgb15(26, 3, 3) };
const BODY_H = 60;
const WHITE = rgb15(31, 31, 31);
const FOE_PALETTES = {
  associate: [rgb15(2, 2, 4), rgb15(12, 12, 14), rgb15(22, 22, 24)],
  manager: [rgb15(2, 2, 4), rgb15(24, 16, 4), rgb15(30, 28, 18)],
  counsel: [rgb15(2, 2, 4), rgb15(20, 6, 6), rgb15(28, 18, 16)],
  supervisor: [rgb15(2, 2, 4), rgb15(6, 10, 22), rgb15(18, 22, 30)],
};
const PROP_PALETTE = [rgb15(2, 2, 4), rgb15(16, 10, 4), rgb15(28, 24, 14)];
// Grey boxes for the office weapons and the furniture that drops them, until their art lands.
const FURNITURE = { desk: { w: 54, h: 32, palette: PROP_PALETTE }, cabinet: { w: 30, h: 54, palette: [rgb15(2, 2, 4), rgb15(13, 14, 16), rgb15(22, 23, 25)] },
  altar: { w: 44, h: 28, palette: [rgb15(2, 2, 4), rgb15(18, 3, 6), rgb15(31, 26, 8)] } };
// A foe anointed by a standing altar glows in the ritual's crimson and gold.
const ANOINTED = [rgb15(2, 2, 4), rgb15(26, 4, 6), rgb15(31, 26, 8)];
const WEAPON_BOX = {
  stapler: { w: 14, h: 8, palette: [WHITE, rgb15(6, 6, 7), rgb15(14, 14, 16)] },
  binder: { w: 12, h: 16, palette: [WHITE, rgb15(6, 12, 22), rgb15(12, 18, 28)] },
  extinguisher: { w: 9, h: 20, palette: [WHITE, rgb15(26, 6, 4), rgb15(30, 18, 16)] },
  stamp: { w: 12, h: 10, palette: [WHITE, rgb15(24, 3, 5), rgb15(31, 31, 31)] },
};
const WARD_ANIM = { idle: 'idle', walk: 'walk', run: 'walk', hurt: 'hit', held: 'hit', knockdown: 'hit', bound: 'hit', down: 'recoil', ko: 'recoil', jump: 'wind', carry: 'idle', throw: 'punch2', grab: 'punch1', step: 'walk', heavy: 'uppercut', special: 'uppercut' };

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
    playSong('stageStart');
    this.time.delayedCall(STAGE_START_MS, () => {
      const song = this.pinch ? VELLUM_PINCH : this.office ? VELLUM_SONG : SONGS[this.stageKey];
      if (this.paused) this.resume = song; else playSong(song);
    });

    this.who = state.auditor;
    this.partner = newBarker(this.who);
    useSnesTables();
    this.base = registerTuning(`snes-brawl-${this.who}`, snesTune(this.who), RANGES);
    this.tune = scaledTune(this.base, STAGE1.scale);
    this.fin = null;
    this.barker = createBarker();
    loadBarks();
    this.slowdown = createSlowdown();
    if (this.office) {
      this.world = enterOffice(newFloor(this.who, this.tune), this.tune);
      poseOffice(this.world, params.get('pose'));
      // A staged pose (?pose=rush, ?pose=fangs) skips the title card; ?card holds the card still.
      this.card = params.get('pose') ? null : { t: params.has('card') ? Number(params.get('card')) : 0, still: params.has('card') };
      // Before the card, the camera pans in and he stands from the desk; ?entrance=<frame> holds it still.
      this.entrance = this.card && !params.has('card') ? { t: Number(params.get('entrance') ?? 0), still: params.has('entrance') } : null;
    } else {
      this.world = newStage(newFloor(this.who, this.tune), this.tune, areaFor(state.checkpoint, this.def.checkpoints, this.def.table.areas.length), this.def.table);
      if (this.def.arm) this.def.arm(this.world);
      else if (this.def.weapons) armWorld(this.world, stageSmash(this.world.stage.starts), scaledWeapons(defaultWeapons(), STAGE1.scale));
    }
    this.world.cooldown = freeInjunction();

    await Promise.all([loadArt('ward').catch(() => null), ...(this.office ? [loadArt('vellum').catch(() => null)] : [])]);
    this.ward = artOr(this, 'ward');
    this.baked = this.office ? [bakeScene(OFFICE_BG)] : this.def.backgrounds.map(bakeScene);
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
    if (this.entrance) {
      this.entrance.t = skipTo(this.entrance.t, pad, VELLUM_IN.end);
      if (vellumEntrance(this.entrance.t).done) this.entrance = null;
      else if (!this.entrance.still) this.entrance.t++;
      this.draw(time);
      return;
    }
    if (this.card) {
      const step = cardFrame(this.card.t);
      if (step.stampNow) sfx('stamp');
      if (step.voiceNow) sfx(CARD.voice);
      if (step.done) this.card = null;
      else if (!this.card.still) this.card.t++;
      this.draw(time);
      return;
    }
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
    const voices = snapshot(w.fighters);
    stepFloor(w, pad, this.tune);
    const partnerTalking = loopFrame < this.partner.until;
    for (const said of this.barker(barkMoments(voices, w.fighters), frames, { frames: barkLength, busy: partnerTalking })) playBark(said);
    if (boss) w.hitStop = bossHitStop(w, boss, bossHp, playerHp, p);
    if (boss && !this.pinch && vellumPinch(boss.hp, boss.maxHp)) {
      this.pinch = true;
      playSong(VELLUM_PINCH);
    }
    const target = !this.office && finisherTarget(w, before);
    if (target) this.startFinisher(target);
    if (!this.office) {
      stepAreas(w, this.tune);
      this.def.step?.(w, this.tune);
    }
    if (this.fin && finisherFrame(++this.fin.t).done) this.fin = null;
    const sound = !target && brawlSound(w.events);
    if (sound) sfx(sound);
    const kind = barkKind(w.events, { hurt: p.hp < playerHp, finisher: !!target });
    const line = kind && pickBark(this.partner, kind, loopFrame, { frames: barkFrames, busy: this.barker.speaking(frames) });
    if (line) bark(line);
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

  // Vellum stands in until his art lands: a taller dark suit, flashing white on a telegraph and
  // lit by the same red colour math as the room while his fangs are out.
  vellumSprites(v, sx, ms, red) {
    if (v.invuln > 0 && v.invuln % 4 < 2 && v.state !== 'fangs') return [];
    const lying = ['down', 'slumped', 'knockdown'].includes(v.state);
    // Standing from the desk during his entrance: seated, half up, upright.
    const rise = this.entrance ? Math.round(vellumEntrance(this.entrance.t).stand * 2) : 2;
    const h = lying ? 28 : 44 + rise * 11;
    const w = lying ? 60 : 36;
    const flash = v.state === 'windup' && v.t % 8 < 2;
    const tint = red ?? (v.fangs ? rgb15(4, 0, 0) : 0);
    const palette = flash ? [WHITE, WHITE, WHITE] : VELLUM_PALETTE.map((c) => colorMath(c, tint, 'add'));
    const name = `foe:vellum:${lying ? 'down' : `up${h}`}:${flash ? 'flash' : tint}`;
    return artOr(this, name, { w, h, palette }).frame('stand', ms, Math.round(sx - w / 2), Math.round(v.y - h - v.z), v.facing < 0);
  }

  foeSprites(f, sx, ms) {
    if (f.kind === 'vellum') return this.vellumSprites(f, sx, ms, fangFlash(f, this.game.loop.frame));
    if (f.state === 'ko' && f.t > 16 && Math.floor(f.t / 3) % 2) return [];
    if (f.invuln > 0 && f.invuln % 4 < 2) return [];
    const lying = ['down', 'ko'].includes(f.state);
    const h = lying ? 24 : BODY_H;
    const w = lying ? 56 : 32;
    const flash = (f.state === 'windup' && f.t % 8 < 2) || f.hitFlash > 0;
    const palette = flash ? [WHITE, WHITE, WHITE] : f.anointed ? ANOINTED : FOE_PALETTES[f.kind] ?? FOE_PALETTES.associate;
    const name = `foe:${f.kind}:${lying ? 'down' : 'up'}${flash ? ':flash' : f.anointed ? ':anointed' : ''}`;
    return artOr(this, name, { w, h, palette }).frame('stand', ms, Math.round(sx - w / 2), Math.round(f.y - h - f.z));
  }

  weaponSprites(kind, sx, bottom) {
    const { w, h, palette } = WEAPON_BOX[kind];
    return artOr(this, `weapon:${kind}`, { w, h, palette }).frame('stand', 0, Math.round(sx - w / 2), Math.round(bottom - h));
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
    // The entrance's pan: the camera starts 96 px left of the office and travels right into it.
    const pan = this.entrance ? vellumEntrance(this.entrance.t).pan : 0;
    const cam = Math.round(w.cameraX) - pan;
    if (this.office) {
      composeFrame(OFFICE_BG, this.baked[0], shake.x - pan, 0, this.pixels.data);
      // His fangs: the red sub-screen added to the whole room, clamped per 5-bit channel.
      const red = fangFlash(vellum(w), this.game.loop.frame);
      if (red) {
        const buf = fromRgba(this.pixels.data, this.buf15);
        for (let i = 0; i < buf.length; i++) buf[i] = colorMath(buf[i], red, 'add');
        toRgba(buf, this.pixels.data);
      }
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

    // Foes still walking on from off screen push no sprites, which would count against the line limit.
    const things = [
      ...w.fighters.filter((f) => f !== this.fin?.foe && Math.abs(f.x - cam - WIDTH / 2) < WIDTH / 2 + 32).map((f) => ({ y: f.y, f })),
      ...w.props.filter((o) => o.state !== 'gone').map((o) => ({ y: o.y + (o.state === 'held' ? 1 : 0), o })),
      ...(w.tapes ?? []).map((tape) => ({ y: tape.y + 1, tape })),
      ...(w.firstAid ?? []).filter((b) => !b.taken).map((box) => ({ y: box.y - 1, box })),
      ...(w.smash ?? []).map((s) => ({ y: s.y - 2, s })),
      ...(w.weapons ?? []).filter((wp) => !(wp.state === 'floor' && wp.t > w.weaponTune.weaponLife - 90 && wp.t % 8 < 4)).map((wp) => ({ y: wp.y, wp })),
    ].sort((a, b) => a.y - b.y);
    const at = (x) => x - cam - shake.x;
    const spritesOf = ({ f, o, tape, box, s, wp }) => {
      if (s) {
        const { w: sw, h, palette } = FURNITURE[s.kind];
        const sh = s.state === 'broken' ? 10 : h;
        return artOr(this, `prop:${s.kind}${s.state === 'broken' ? ':broken' : ''}`, { w: sw, h: sh, palette }).frame('stand', 0, Math.round(at(s.x) - sw / 2), s.y - sh);
      }
      if (wp) return this.weaponSprites(wp.kind, at(wp.x), wp.y - wp.z * STAGE1.scale);
      if (f?.state === 'spray' && w.weaponTune) {
        const reach = Math.round(w.weaponTune.extinguisherReach);
        const cloud = artOr(this, `fx:spray:${reach}`, { w: reach, h: 16, palette: [rgb15(24, 26, 28), rgb15(28, 30, 31), WHITE] });
        return [...this.playerSprites(f, at(f.x), f.t * MS), ...this.weaponSprites('extinguisher', at(f.x) + f.facing * 22, f.y - 26),
          ...cloud.frame('stand', 0, Math.round(at(f.x) + (f.facing > 0 ? 24 : -24 - reach)), f.y - 40)];
      }
      if (f?.team === 'player' && f.weapon) return [...this.playerSprites(f, at(f.x), f.t * MS), ...this.weaponSprites(f.weapon.kind, at(f.x) + f.facing * 22, f.y - 26 - f.z)];
      if (f?.marked > 0) return [...this.foeSprites(f, at(f.x), f.t * MS), ...this.weaponSprites('stamp', at(f.x), f.y - BODY_H - 6 - f.z)];
      if (o) return artOr(this, `prop:${o.kind}`, { w: 24, h: 24, palette: PROP_PALETTE }).frame('stand', 0, Math.round(at(o.x) - 12), Math.round(o.y - 24 - o.z * STAGE1.scale));
      if (box) return artOr(this, 'prop:firstAid', { w: 24, h: 16, palette: [rgb15(2, 2, 4), WHITE, rgb15(28, 4, 4)] }).frame('stand', 0, Math.round(at(box.x) - 12), box.y - 16);
      if (tape?.shot === 'paper') return artOr(this, 'prop:paper', { w: 16, h: 8, palette: [rgb15(2, 2, 4), WHITE, rgb15(24, 24, 22)] }).frame('stand', 0, Math.round(at(tape.x) - 8), tape.y - 40);
      if (tape?.shot === 'object') return artOr(this, 'prop:object', { w: 16, h: 16, palette: [rgb15(2, 2, 4), rgb15(10, 10, 12), rgb15(20, 20, 22)] }).frame('stand', 0, Math.round(at(tape.x) - 8), tape.y - 44);
      if (tape) return artOr(this, 'prop:tape', { w: 24, h: 8, palette: [rgb15(2, 2, 4), rgb15(26, 4, 4), WHITE] }).frame('stand', 0, Math.round(at(tape.x) - 12), tape.y - 40);
      const ms = f.t * MS;
      return f.team === 'player' ? this.playerSprites(f, at(f.x), ms) : this.foeSprites(f, at(f.x), ms);
    };
    this.layer.draw(things.flatMap((t) => withPriority(spritesOf(t), thingPriority(t))));
    this.drawMarks(cam + shake.x);
    this.drawFinisher();
    this.drawHud(time);
  }

  // Each fighter's readout over its stand-in sprite, sized to the sprite's own box.
  drawMarks(off) {
    const g = this.marks.clear();
    const w = this.world;
    if (this.card || this.entrance || this.paused) return;
    drawSparks(g, w.sparks, -off, this.tune);
    const turns = turnOwners(w);
    for (const f of w.fighters) {
      if (f === this.fin?.foe || Math.abs(f.x - off - WIDTH / 2) > WIDTH / 2 + 32) continue;
      const vellumBox = f.kind === 'vellum';
      const lying = (vellumBox ? ['down', 'slumped', 'knockdown'] : ['down', 'ko']).includes(f.state);
      const shape = SHAPE[f.kind];
      const bw = lying ? (vellumBox ? 60 : 56) : vellumBox ? 36 : shape?.[0] ?? 32;
      const bh = lying ? (vellumBox ? 28 : 24) : vellumBox ? 66 : f.team === 'player' ? BODY_H + 2 : shape?.[1] ?? BODY_H;
      drawReadout(g, this.markFill, f, { x: Math.round(f.x - off), top: Math.round(f.y - bh - f.z), w: bw, h: bh, feet: f.y, lying }, {
        tune: this.tune, dx: -off, frame: this.game.loop.frame, cooldown: w.cooldown, boxes: this.boxes, turn: turns.includes(f),
      });
    }
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
    const v = this.office && vellum(w);
    const boss = v && !this.card && !this.entrance ? { name: 'Vellum', hp: v.hp, maxHp: v.maxHp } : null;
    if (!this.paused && !this.card) this.drain = drainStep(this.drain, p.hp);
    const state = { name: this.who, hp: p.hp, maxHp: PIPS, lives: flow.lives, meter: w.meter, boss };
    const layout = hudLayout({ ...state, pale: this.drain?.pale ?? p.hp, receipt: this.receipt, now: time });
    const dim = this.paused ? 0.5 : 1;
    this.g.clear();
    // A parry's flash: the whole screen washed white for a few frames while the fight holds still.
    if (w.flash > 0) this.fill(0, 0, WIDTH, HEIGHT, WHITE, Math.ceil(10 * w.flash / (this.tune.parryFlash || 1)));
    drawHud(this.fill, layout);
    if (!this.paused && !this.card) {
      drawCombo(this.g, this.fill, w.combo, this.tune, { right: WIDTH - 10, top: 44 });
      this.guide = guideStep(this.guide, this.guideOn ? liveRoutes(p, this.tune) : []);
      if (this.guide) drawGuide(this.g, this.fill, this.guide, { x: 8, y: 38, device: this.controls?.device });
    }
    const { portrait } = layout;
    this.hudSprites.draw(artOr(this, `hud-portrait-${this.who}`, { w: 20, h: 20, palette: [rgb15(1, 1, 1), rgb15(11, 11, 13), WHITE] })
      .frame('stand', 0, portrait.x + 2, portrait.y + 2));
    this.hudSprites.pool.forEach((img) => img.setAlpha(dim).setScrollFactor(0));
    this.g.setAlpha(dim);

    const run = w.run;
    const centred = (text, y, colour) => drawString(this.fill, text, (WIDTH - measure(text)) >> 1, y, colour);
    if (run?.prompt) centred(run.prompt, 64);
    if (run && !run.locked && run.go > 0 && Math.floor(run.go / 10) % 2) {
      drawString(this.fill, 'GO', WIDTH - 40, 64, rgb15(31, 26, 8));
      this.g.fillStyle(hex(rgb15(31, 26, 8))).fillTriangle(WIDTH - 22, 63, WIDTH - 22, 73, WIDTH - 14, 68);
    }
    if (w.ritual && Math.floor(w.ritualT / 20) % 2 === 0) centred('BREAK THE ALTARS', 80, rgb15(31, 26, 8));
    if (p.state === 'bound') drawString(this.fill, 'MASH!', Math.round(p.x - w.cameraX) - 16, p.y - 80);
    if (this.card && !this.entrance) this.drawCard(cardFrame(this.card.t));
    if (this.clear) this.drawClear(clearLines(this.registry.get('stage1Frames') ?? 0, flow.lives, this.def.number));
  }

  // The stage-clear card: a plain dark panel over the slumped room, the heading in gold.
  drawClear([heading, ...rows]) {
    const w = 150;
    const h = 30 + rows.length * 14;
    const x = (WIDTH - w) >> 1;
    const y = 70;
    this.fill(x + 3, y + 3, w, h, rgb15(0, 0, 0));
    this.fill(x, y, w, h, rgb15(2, 2, 5));
    this.fill(x + 6, y + 21, w - 12, 1, rgb15(31, 26, 8));
    drawString(this.fill, heading, (WIDTH - measure(heading)) >> 1, y + 8, rgb15(31, 26, 8));
    rows.forEach((row, i) => drawString(this.fill, row, (WIDTH - measure(row)) >> 1, y + 28 + i * 14));
  }

  // The boss title card as a filed memo, in the manner of Sunset Riders' wanted posters: it drops in,
  // FILED is stamped across it, and his line runs as a subtitle under it.
  drawCard(step) {
    const w = 206;
    const h = 104;
    const x = (WIDTH - w) >> 1;
    const y = Math.round(44 + step.rise * 150);
    const fill = this.fill;
    const ink = (text, tx, ty, colour = MEMO.ink) => drawString(fill, text, tx, ty, colour, null);
    fill(x + 3, y + 3, w, h, rgb15(1, 1, 2));
    fill(x, y, w, h, MEMO.paper);
    fill(x + 8, y + 22, w - 16, 1, MEMO.rule);
    ink('INTEROFFICE MEMORANDUM', x + 8, y + 9);
    ink('RE: FINAL NOTICE', x + 8, y + 30);
    ink('FROM:', x + 8, y + 46);
    ink(CARD.name, x + 8, y + 57);
    ink('DEPT:', x + 8, y + 73);
    ink(CARD.department, x + 8, y + 84);
    if (step.stamped) {
      const sw = measure(CARD.stamp) + 12;
      const sx = x + w - sw - 10;
      const sy = y + 32;
      fill(sx, sy, sw, 16, MEMO.stamp);
      fill(sx + 2, sy + 2, sw - 4, 12, MEMO.paper);
      ink(CARD.stamp, sx + 6, sy + 4, MEMO.stamp);
    }
    if (step.subtitle) {
      const tw = measure(CARD.subtitle);
      fill(((WIDTH - tw) >> 1) - 6, 170, tw + 12, 14, rgb15(1, 1, 2));
      drawString(fill, CARD.subtitle, (WIDTH - tw) >> 1, 173);
    }
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
