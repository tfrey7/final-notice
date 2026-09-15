/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { hex } from './color.mjs';
import { bakeScene, composeFrame } from './layers.mjs';
import { screens, logo } from './bg/ui.mjs';

const ORDER = Object.keys(screens);
const HOLD = 4000;
const ZOOM_MS = 1500;
const PAN = 40;
const LOGO_Y = 64;

// ?snes&art=ui: the front-end screens in turn, 4 s each. &screen=<name> holds one, &x=<pixels> pins
// the camera and &zoom=<0-1> the title logo's Mode 7 scale, for screenshots.
export class SnesUiScene extends Phaser.Scene {
  constructor() {
    super('snes-ui');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.only = screens[params.get('screen')] ? params.get('screen') : null;
    this.pinX = params.has('x') ? Number(params.get('x')) : null;
    this.pinZoom = params.has('zoom') ? Number(params.get('zoom')) : null;
    this.baked = Object.fromEntries(ORDER.map((k) => [k, bakeScene(screens[k])]));
    this.logoValues = logo.pixels.map((r) => [...r].map((v) => parseInt(v, 16)));
    this.logoRgb = logo.palette.map(hex);
    this.tex = this.textures.createCanvas('snes-ui', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-ui').setOrigin(0);
  }

  update(time) {
    const name = this.only ?? ORDER[Math.floor(time / HOLD) % ORDER.length];
    const local = this.only ? time : time % HOLD;
    const pans = name === 'title' || name === 'hud';
    const camX = this.pinX ?? (pans ? Math.floor((local * PAN) / 1000) : 0);
    composeFrame(screens[name], this.baked[name], camX, 0, this.pixels.data);
    if (name === 'title') {
      const t = Math.min(1, local / ZOOM_MS);
      this.drawLogo(this.pinZoom ?? 1 - (1 - t) ** 3);
    }
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
  }

  // Mode 7 as the hardware draws it: each screen pixel samples the logo through the inverse scale.
  drawLogo(z) {
    if (!(z > 0)) return;
    const cx = WIDTH / 2;
    const out = this.pixels.data;
    const y0 = Math.max(0, Math.floor(LOGO_Y - (logo.h * z) / 2));
    const y1 = Math.min(HEIGHT, Math.ceil(LOGO_Y + (logo.h * z) / 2));
    const x0 = Math.max(0, Math.floor(cx - (logo.w * z) / 2));
    const x1 = Math.min(WIDTH, Math.ceil(cx + (logo.w * z) / 2));
    for (let y = y0; y < y1; y++) {
      const v = Math.floor((y - LOGO_Y) / z + logo.h / 2);
      for (let x = x0; x < x1; x++) {
        const value = this.logoValues[v]?.[Math.floor((x - cx) / z + logo.w / 2)];
        if (!value) continue;
        const c = this.logoRgb[value - 1];
        const o = (y * WIDTH + x) * 4;
        out[o] = (c >> 16) & 255; out[o + 1] = (c >> 8) & 255; out[o + 2] = c & 255; out[o + 3] = 255;
      }
    }
  }
}
