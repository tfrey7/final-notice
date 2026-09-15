// The SNES title: FINAL NOTICE zooms in by Mode 7 over the parallax night skyline, then PUSH START
// blinks; after 20 idle seconds the attract note, as on the NES. Start mosaics out to select.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screen, fromRgba, mode7Pass, mode7Matrix, brightnessPass } from '../fx.mjs';
import { screens, logo } from '../bg/ui.mjs';
import { measure, drawString } from '../text.mjs';
import { playSong } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { blinkOn, titleStep } from '../../scenes/menu.mjs';
import { FrontScreen, bufferFill, inStep, logoZoom, mode7Texture, outStep } from './front.mjs';

const PAN = 20 / 60;
const LOGO_CENTRE = [WIDTH >> 1, 76];
const PROMPT = 'PUSH START';
const PROMPT_Y = 150;

export class SnesTitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'title') state = jumpTo('title');
    this.registry.set('flow', state);
    playSong(SONGS.title);
    const params = new URLSearchParams(location.search);
    // &t=<frames> pins the clock for a screenshot.
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.t = { idle: 0, demo: false };
    this.frames = 0;
    this.leaving = null;
    this.baked = bakeScene(screens.title);
    this.logo = mode7Texture(logo);
    this.main = screen();
    this.out = screen();
    this.rgba = new Uint8ClampedArray(this.main.length * 4);
    this.view = new FrontScreen(this, 'snes-title');
  }

  update() {
    const f = this.pinned ?? this.frames++;
    if (this.pinned == null && this.leaving == null) {
      const pad = pollPad(this.game.loop.frame);
      const was = this.t.demo;
      this.t = titleStep(this.t, pad);
      if (this.t.event === 'start') this.leaving = 0;
      if (this.t.event === 'attract') playSong('demo');
      if (this.t.event === 'back' && was) playSong(SONGS.title);
    }

    composeFrame(screens.title, this.baked, Math.floor(f * PAN), 0, this.rgba);
    fromRgba(this.rgba, this.main);
    const zoom = logoZoom(f);
    let frame = mode7Pass(this.logo, mode7Matrix(zoom.scale, zoom.angle), LOGO_CENTRE, this.main, this.out);
    const fill = bufferFill(frame);
    if (this.t.demo) {
      frame = brightnessPass(frame, 5, this.main);
      const word = 'DEMO';
      drawString(bufferFill(frame), word, (WIDTH - measure(word)) >> 1, PROMPT_Y, rgb15(31, 26, 10));
    } else if (zoom.done && (this.leaving != null || blinkOn(f - 90))) {
      drawString(fill, PROMPT, (WIDTH - measure(PROMPT)) >> 1, PROMPT_Y);
    }

    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
        return;
      }
      this.view.show(frame, step);
      return;
    }
    this.view.show(frame, inStep(f));
  }
}
