// The SNES opening, part 1 (boards O1-O4): the night skyline fading in to a clock tick, the tilt up the
// tower with the skyline (BG2) at half the tower's (BG1) speed, a mosaic into the lit billing floor, and
// the bill feeding up while LIFETIMES BILLED counts to 47. The timeline is src/snes/opening.mjs; the
// shapes are stand-ins until card 1937's backdrops. Start skips to the title.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15, channels } from '../color.mjs';
import { screen } from '../fx.mjs';
import { drawString } from '../text.mjs';
import { sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { jumpTo, showFlow } from '../../flow.mjs';
import { TILT_PX, countText, openingAt, openingCues, openingStep } from '../opening.mjs';
import { FrontScreen, bufferFill, outStep } from './front.mjs';

const CLEAR = 0xffff;
const CUES = { tick: 'step', count: 'blip' };

const C = {
  navy: rgb15(1, 1, 5), dusk: rgb15(7, 3, 10), far: rgb15(3, 3, 7), near: rgb15(2, 2, 5), farWin: rgb15(6, 6, 10),
  bldg: rgb15(2, 2, 4), outline: rgb15(1, 1, 3), dark: rgb15(3, 3, 6), dim: rgb15(6, 6, 9), lit: rgb15(28, 24, 11),
  tube: rgb15(29, 31, 28), wall: rgb15(9, 12, 11), carpet: rgb15(6, 6, 8), desk: rgb15(13, 9, 6),
  screenOn: rgb15(4, 10, 6), crt: rgb15(18, 18, 16), skin: rgb15(22, 16, 12), suit: rgb15(6, 7, 11), hair: rgb15(3, 3, 6),
  paper: rgb15(28, 28, 23), bar: rgb15(18, 26, 18), edge: rgb15(22, 22, 20), hole: rgb15(3, 3, 6), ink: rgb15(3, 3, 6),
};

const mix = (a, b, t) => rgb15(...channels(a).map((v, i) => Math.round(v + (channels(b)[i] - v) * t)));

const layerFill = (px, w, h) => (x, y, rw, rh, c) => {
  for (let j = Math.max(0, y); j < Math.min(h, y + rh); j++) for (let i = Math.max(0, x); i < Math.min(w, x + rw); i++) px[j * w + i] = c;
};

// BG2: the far skyline, transparent above the rooftops, TILT_PX / 2 taller than the screen.
function skylineLayer() {
  const h = HEIGHT + (TILT_PX >> 1);
  const px = new Uint16Array(WIDTH * h).fill(CLEAR);
  const f = layerFill(px, WIDTH, h);
  const base = h - 74;
  for (let i = 0; i < 16; i++) {
    const x = ((i * 23) % 290) - 18, w = 16 + (i * 7) % 14, top = base - 30 - (i * 37) % 64;
    const tone = i % 2 ? C.far : C.near;
    f(x, top, w, base - top, tone);
    for (let wy = top + 4; wy < base - 3; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 4) if ((wx * 5 + wy * 3 + i) % 7 < 2) f(wx, wy, 2, 2, C.farWin);
  }
  f(0, base, WIDTH, h - base, C.near);
  return { h, px };
}

// BG1: the tower, TILT_PX taller than the screen, with one lit floor that ends the tilt mid-screen.
export const LIT_FLOOR = 6;
function towerLayer() {
  const h = HEIGHT + TILT_PX;
  const px = new Uint16Array(WIDTH * h).fill(CLEAR);
  const f = layerFill(px, WIDTH, h);
  const [x, top, w] = [92, 40, 72];
  f(x - 1, top - 1, w + 2, h - top + 1, C.outline);
  f(x, top, w, h - top, C.bldg);
  for (let fl = 0, y = top + 6; y < h; fl++, y += 9) {
    for (let wx = x + 4; wx < x + w - 4; wx += 6) f(wx, y, 4, 4, fl === LIT_FLOOR ? C.lit : ((wx + fl) % 11 === 0 ? C.dim : C.dark));
  }
  f(x + (w >> 1) - 1, top - 14, 2, 14, C.outline);
  return { h, px };
}

// The sky in eight HDMA-style bands of the backdrop colour, deep navy to dusk, no black.
function sky(fill) {
  const bands = 8;
  for (let i = 0; i < bands; i++) fill(0, (i * HEIGHT) / bands, WIDTH, HEIGHT / bands, mix(C.navy, C.dusk, i / (bands - 1)));
}

function blit(buf, layer, scrollY) {
  for (let y = 0; y < HEIGHT; y++) {
    const row = (y + scrollY) * WIDTH;
    for (let x = 0; x < WIDTH; x++) {
      const c = layer.px[row + x];
      if (c !== CLEAR) buf[y * WIDTH + x] = c;
    }
  }
}

function office(fill) {
  for (let i = 0; i < 12; i++) fill(0, i * 8, WIDTH, 8, mix(C.wall, C.navy, i / 22));
  for (let i = 0; i < 16; i++) fill(0, 96 + i * 8, WIDTH, 8, mix(mix(C.carpet, C.wall, 0.3), C.carpet, i / 15));
  for (let x = 12; x < WIDTH; x += 70) { fill(x, 10, 50, 4, C.tube); fill(x - 2, 14, 54, 1, mix(C.tube, C.wall, 0.6)); }
  for (let row = 0; row < 4; row++) {
    const y = 100 + row * 26, w = 38 + row * 8;
    for (let x = 8 - row * 6; x < WIDTH; x += w + 18) {
      fill(x, y, w, 8, C.desk); fill(x, y + 8, w, 2, mix(C.desk, 0, 0.5));
      fill(x + 6, y - 10, 12, 10, C.crt); fill(x + 8, y - 8, 8, 5, C.screenOn);
    }
  }
  clerk(fill, 196, 118, 40);
}

// The clerk working late, back to us.
function clerk(fill, x, feet, h) {
  const head = Math.round(h * 0.17), body = Math.round(h * 0.4), legs = h - head - body;
  const w = Math.round(h * 0.34), top = feet - h;
  fill(x - (w >> 1) - 1, top + head - 1, w + 2, body + legs + 2, C.outline);
  fill(x - (w >> 1), top + head, w, body + legs, C.suit);
  fill(x - (head >> 2) - 3, top - 1, (head >> 1) + 6, head + 2, C.outline);
  fill(x - (head >> 2) - 2, top, (head >> 1) + 4, head, C.hair);
}

// Green-bar paper two tile rows tall (BG1) feeding up; the printout stays on BG3.
function bill(fill, feed, count) {
  fill(0, 0, WIDTH, HEIGHT, C.navy);
  for (let y = -(feed % 24); y < HEIGHT; y += 24) {
    fill(40, y, 176, 12, C.paper);
    fill(40, y + 12, 176, 12, C.bar);
    fill(43, y + 5, 3, 3, C.hole); fill(210, y + 5, 3, 3, C.hole);
    fill(43, y + 17, 3, 3, C.hole); fill(210, y + 17, 3, 3, C.hole);
  }
  fill(40, 0, 1, HEIGHT, C.edge); fill(215, 0, 1, HEIGHT, C.edge);
  drawString(fill, 'ACCOUNT 000047', 60, 64, C.ink, null);
  drawString(fill, countText(count), 60, 88, C.ink, null);
  drawString(fill, 'BALANCE DUE', 60, 112, C.ink, null);
}

export class SnesOpeningScene extends Phaser.Scene {
  constructor() {
    super('opening');
  }

  create() {
    const params = new URLSearchParams(location.search);
    // &t=<frames> pins the opening's clock for a screenshot.
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.frame = this.pinned ?? 0;
    this.leaving = null;
    this.skyline = skylineLayer();
    this.tower = towerLayer();
    this.buf = screen();
    this.view = new FrontScreen(this, 'snes-opening');
  }

  update() {
    if (this.pinned == null && this.leaving == null) {
      const step = openingStep(this.frame, pollPad(this.game.loop.frame));
      if (step.event === 'title') this.leaving = 0;
      else {
        this.frame = step.frame;
        for (const cue of openingCues(this.frame)) sfx(CUES[cue]);
      }
    }
    const at = openingAt(this.frame);
    this.paint(at);
    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        this.leaving = null;
        showFlow(this, jumpTo('title'));
        return;
      }
      this.view.show(this.buf, { mosaic: Math.max(at.mosaic, step.mosaic), level: Math.min(at.level, step.level) });
      return;
    }
    this.view.show(this.buf, at);
  }

  paint(at) {
    const fill = bufferFill(this.buf);
    if (at.picture === 'tower') {
      sky(fill);
      blit(this.buf, this.skyline, at.bg2Y);
      blit(this.buf, this.tower, at.bg1Y);
    } else if (at.picture === 'office') office(fill);
    else bill(fill, at.billY, at.count);
  }
}
