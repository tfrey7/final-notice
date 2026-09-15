// The SNES title: digitized live action of Ward and Mercer passing the notice in the rain, the tower crown
// glowing up through the piano intro; FINAL NOTICE presses in by Mode 7, then PUSH START pulses;
// Start during the reveal skips to the settled title. After 20 idle seconds the title fades to the
// attract intro. Start slides up the memo slip (NEW AUDIT, CONTINUE, SETTINGS);
// NEW AUDIT hands over to select, which wipes in by file drawer.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { LEVELS, screen, mathPass, mode7Pass, mode7Matrix, brightness } from '../fx.mjs';
import { logo, logoPalette, logoReading } from '../bg/ui.mjs';
import { INTRO_FRAMES } from '../lights.mjs';
import { pastDue } from '../clock.mjs';
import { paintArt } from '../titlepaint.mjs';
import { BG3_PALETTE, measure, drawString, setWindowColours } from '../text.mjs';
import { currentSong, playSong, setMono, sfx } from '../audio/player.mjs';
import { STOCK, SLIDE_FRAMES, hasSave, memoStep, openMemo, readSettings, writeSettings } from '../memo.mjs';
import { drawMemo } from '../memoart.mjs';
import { PROMPT_AT, fadeLevel, newTitle, promptLevel, titleTick } from '../titlestate.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { FrontScreen, ZOOM_FRAMES, bufferFill, logoZoom, mode7Texture } from './front.mjs';
import { TITLE_FROM } from '../attract.mjs';

const FADE_FRAMES = 24;
const fadeUp = (f) => Math.min(LEVELS - 1, Math.floor((Math.max(0, f) * (LEVELS - 1)) / FADE_FRAMES));
// The logo sits in the night sky above the partners and the tower crown.
const LOGO_CENTRE = [WIDTH >> 1, 2 + (logo.h >> 1)];
// The press starts 20 frames before the downbeat of bar 5 so it lands on it.
const PRESS_AT = INTRO_FRAMES - ZOOM_FRAMES;
const FLASH = screen(rgb15(9, 8, 5));
const PROMPT = 'PUSH START';
const PROMPT_Y = 208;
const PAST_DUE = logoReading('PAST DUE');

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
    // &t=<frames> pins the clock for a screenshot; &memo=memo|settings opens the slip on that page;
    // &attract=<frames> pins the fade into the attract loop.
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    // Skipped out of the intro: the settled title fades up with the prompt already pulsing. Run to its
    // end: the title fades up just before the logo press, which lands on the melody the intro started.
    const skipped = this.registry.get('attractBack') === true;
    const handed = this.registry.get('introEnd') === true;
    this.registry.remove('attractBack');
    this.registry.remove('introEnd');
    this.back = skipped || handed;
    this.t = newTitle(skipped ? PROMPT_AT : handed ? TITLE_FROM : 0);
    if (params.has('attract')) this.t.fade = Number(params.get('attract'));
    this.shown = 0;
    this.leaving = null;
    this.settings = readSettings(storage());
    applySettings(this.settings);
    this.memo = null;
    if (params.has('memo')) {
      this.memo = { ...openMemo(this.settings, hasSave(storage()), params.get('memo') === 'settings' ? 'settings' : 'memo'), slide: SLIDE_FRAMES };
    }
    // &pastdue opens on the after-midnight title.
    this.opened = new Date();
    this.pastDue = params.has('pastdue');
    this.logo = null;
    this.main = screen();
    this.out = screen();
    this.view = new FrontScreen(this, 'snes-title');
  }

  stepMemo(pad) {
    this.memo = memoStep(this.memo, pad);
    const { event, settings } = this.memo;
    if (MEMO_SOUNDS[event]) sfx(MEMO_SOUNDS[event]);
    if (event === 'new' || event === 'continue') this.leaving = 0;
    if (event === 'back') { this.memo = null; this.t = { ...this.t, idle: 0 }; }
    if (event === 'change') {
      this.settings = settings;
      writeSettings(storage(), settings);
      applySettings(settings);
    }
  }

  update() {
    if (this.pinned == null && this.leaving == null) {
      const pad = pollPad(this.game.loop.frame);
      if (this.memo) {
        this.stepMemo(pad);
      } else {
        this.t = titleTick(this.t, pad);
        if (this.t.event === 'confirm') sfx('stampOk');
        if (this.t.event === 'enter') {
          this.memo = openMemo(this.settings, hasSave(storage()));
          this.t = { ...this.t, confirm: null };
        }
        if (this.t.event === 'attract') {
          this.scene.start('attract');
          return;
        }
      }
    }
    const f = this.pinned ?? this.t.frame;

    if (!this.pastDue && this.pinned == null && f % 60 === 0 && pastDue(this.opened)) {
      this.pastDue = true;
      this.logo = null;
      sfx('relay');
    }
    if (f === INTRO_FRAMES && this.pinned == null) sfx('brassHit');
    const frame = paintTitle(this, f);
    if (this.leaving != null) {
      // Select opens the file drawer over this last frame.
      this.registry.set('drawer', frame.slice());
      showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
      return;
    }
    const up = fadeUp(this.back ? this.shown++ : f);
    this.view.show(frame, { mosaic: 1, level: Math.min(up, fadeLevel(this.t.fade)) });
  }
}

// PUSH START in the text layer's own colours at brightness `level`.
function drawPrompt(frame, level) {
  const [, shadow, , ink] = BG3_PALETTE;
  drawString(bufferFill(frame), PROMPT, (WIDTH - measure(PROMPT)) >> 1, PROMPT_Y, brightness(ink, level), brightness(shadow, level));
}

// The title at frame `f`: the painting in the rain, the logo zoom, and the memo or prompt over it.
function paintTitle(s, f) {
  paintArt(s.main, f, INTRO_FRAMES);
  s.logo ??= mode7Texture({ ...(s.pastDue ? PAST_DUE : logo), palette: logoPalette(0) });
  const zoom = logoZoom(f - PRESS_AT);
  let frame = f < PRESS_AT ? s.main : mode7Pass(s.logo, mode7Matrix(zoom.scale, 0), LOGO_CENTRE, s.main, s.out);
  // The landing frame: the whole screen brightens once by fixed-colour add.
  if (f === INTRO_FRAMES) frame = mathPass(frame, FLASH, { op: 'add' });
  if (s.memo) {
    drawMemo(frame, s.memo, f);
  } else if (zoom.done) {
    // Confirmed: the prompt holds at full brightness until the memo slides up.
    const level = s.t.confirm != null ? LEVELS - 1 : promptLevel(f);
    if (level != null) drawPrompt(frame, level);
  }
  return frame;
}

// The settled title with the memo up, for select's `&wipe=<frame>` screenshot of the drawer.
export function titleStill(memo, f = INTRO_FRAMES + 120) {
  const s = { logo: null, main: screen(), out: screen(), t: newTitle(f), memo };
  return paintTitle(s, f).slice();
}
