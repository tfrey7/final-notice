// The SNES title: FINAL NOTICE zooms in by Mode 7 over the parallax night skyline, then PUSH START
// blinks; after 20 idle seconds the attract note, as on the NES. Start slides up the memo slip
// (NEW AUDIT, CONTINUE, SETTINGS); NEW AUDIT hands over to select, which wipes in by file drawer.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { bakeLayer, bakeScene, composeFrame } from '../layers.mjs';
import { LEVELS, screen, fromRgba, mathPass, mode7Pass, mode7Matrix, brightnessPass } from '../fx.mjs';
import { afterHours, glintBand, logo, logoPalette, setFloors } from '../bg/ui.mjs';
import { INTRO_FRAMES, TITLE_BPM, lightsOut } from '../lights.mjs';
import { measure, drawString, setWindowColours } from '../text.mjs';
import { currentSong, playSong, setMono, sfx } from '../audio/player.mjs';
import { STOCK, SLIDE_FRAMES, hasSave, memoStep, openMemo, readSettings, writeSettings } from '../memo.mjs';
import { drawMemo } from '../memoart.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { blinkOn, titleStep } from '../../scenes/menu.mjs';
import { FrontScreen, ZOOM_FRAMES, bufferFill, logoZoom, mode7Texture } from './front.mjs';

const PAN = 20 / 60;
const FADE_FRAMES = 24;
const fadeUp = (f) => ({ mosaic: 1, level: Math.min(LEVELS - 1, Math.floor((Math.max(0, f) * (LEVELS - 1)) / FADE_FRAMES)) });
const LOGO_CENTRE = [WIDTH >> 1, 76];
// The press starts 20 frames before the downbeat of bar 5 so it lands on it.
const PRESS_AT = INTRO_FRAMES - ZOOM_FRAMES;
const FLASH = screen(rgb15(9, 8, 5));
const PROMPT = 'PUSH START';
const PROMPT_Y = 150;

const MEMO_SOUNDS = { move: 'pencil', new: 'stampOk', continue: 'stampOk', open: 'stampOk', change: 'stampOk', back: 'paperSlide', done: 'paperSlide' };

const storage = () => { try { return localStorage; } catch { return null; } };

export function applySettings(settings) {
  setWindowColours(...STOCK[settings.paper].window);
  setMono(settings.sound === 'mono');
}

export class SnesTitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'title') state = jumpTo('title');
    this.registry.set('flow', state);
    // The opening starts the title melody as its doors part; the logo zoom comes in on it without a restart.
    if (currentSong() !== SONGS.title) playSong(SONGS.title);
    const params = new URLSearchParams(location.search);
    // &t=<frames> pins the clock for a screenshot; &memo=memo|settings opens the slip on that page.
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.t = { idle: 0, demo: false };
    this.frames = 0;
    this.leaving = null;
    this.settings = readSettings(storage());
    applySettings(this.settings);
    this.memo = null;
    if (params.has('memo')) {
      this.memo = { ...openMemo(this.settings, hasSave(storage()), params.get('memo') === 'settings' ? 'settings' : 'memo'), slide: SLIDE_FRAMES };
    }
    this.sky = afterHours();
    this.baked = bakeScene(this.sky);
    this.dark = 0;
    this.logo = null;
    this.main = screen();
    this.out = screen();
    this.rgba = new Uint8ClampedArray(this.main.length * 4);
    this.view = new FrontScreen(this, 'snes-title');
  }

  stepMemo(pad) {
    this.memo = memoStep(this.memo, pad);
    const { event, settings } = this.memo;
    if (MEMO_SOUNDS[event]) sfx(MEMO_SOUNDS[event]);
    if (event === 'new' || event === 'continue') this.leaving = 0;
    if (event === 'back') { this.memo = null; this.t = { idle: 0, demo: false }; }
    if (event === 'change') {
      this.settings = settings;
      writeSettings(storage(), settings);
      applySettings(settings);
    }
  }

  update() {
    const f = this.pinned ?? this.frames++;
    if (this.pinned == null && this.leaving == null) {
      const pad = pollPad(this.game.loop.frame);
      if (this.memo) {
        this.stepMemo(pad);
      } else {
        const was = this.t.demo;
        this.t = titleStep(this.t, pad);
        if (this.t.event === 'start') this.memo = openMemo(this.settings, hasSave(storage()));
        if (this.t.event === 'attract') playSong('demo');
        if (this.t.event === 'back' && was) playSong(SONGS.title);
      }
    }

    // Lights out: one palette write a beat through the piano intro, then the logo zoom.
    const lights = lightsOut(f, TITLE_BPM);
    if (lights.dark !== this.dark) {
      this.dark = lights.dark;
      setFloors(this.sky.palettes, this.dark);
      const i = this.baked.findIndex((b) => b.layer.bg === 1);
      this.baked[i] = bakeLayer(this.sky, this.baked[i].layer);
    }
    if (lights.clunk && this.pinned == null) sfx('relay');
    if (f === INTRO_FRAMES && this.pinned == null) sfx('brassHit');
    const frame = paintTitle(this, f);
    if (this.leaving != null) {
      // Select opens the file drawer over this last frame.
      this.registry.set('drawer', frame.slice());
      showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
      return;
    }
    this.view.show(frame, fadeUp(f));
  }
}

// The title at frame `f`: the skyline panning, the logo zoom, and the demo note, memo or prompt over it.
function paintTitle(s, f) {
  composeFrame(s.sky, s.baked, Math.floor(f * PAN), 0, s.rgba);
  fromRgba(s.rgba, s.main);
  const zoom = logoZoom(f - PRESS_AT);
  const band = glintBand(f - INTRO_FRAMES);
  if (s.glint !== band) {
    s.glint = band;
    s.logo = mode7Texture({ ...logo, palette: logoPalette(band) });
  }
  let frame = f < PRESS_AT ? s.main : mode7Pass(s.logo, mode7Matrix(zoom.scale, 0), LOGO_CENTRE, s.main, s.out);
  // The landing frame: the whole screen brightens once by fixed-colour add.
  if (f === INTRO_FRAMES) frame = mathPass(frame, FLASH, { op: 'add' });
  if (s.t.demo) {
    frame = brightnessPass(frame, 5, s.main);
    const word = 'DEMO';
    drawString(bufferFill(frame), word, (WIDTH - measure(word)) >> 1, PROMPT_Y, rgb15(31, 26, 10));
  } else if (s.memo) {
    drawMemo(frame, s.memo, f);
  } else if (zoom.done && f >= INTRO_FRAMES + 60 && blinkOn(f - INTRO_FRAMES - 60)) {
    drawString(bufferFill(frame), PROMPT, (WIDTH - measure(PROMPT)) >> 1, PROMPT_Y);
  }
  return frame;
}

// The settled title with the memo up, for select's `&wipe=<frame>` screenshot of the drawer.
export function titleStill(memo, f = INTRO_FRAMES + 120) {
  const sky = afterHours();
  setFloors(sky.palettes, lightsOut(f, TITLE_BPM).dark);
  const main = screen();
  const s = { sky, baked: bakeScene(sky), logo: null, main, out: screen(), rgba: new Uint8ClampedArray(main.length * 4), t: { demo: false }, memo };
  return paintTitle(s, f).slice();
}
