/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15, hex } from './color.mjs';
import { bakeScene, composeFrame } from './layers.mjs';
import {
  screen, mathPass, brightnessPass, mosaicPass, windowPass, mode7Pass, mode7Matrix,
  fadeLevel, mosaicSize, fromRgba, toRgba,
} from './fx.mjs';
import TEST_BG from './bg/test.mjs';
import { drawText, glyph, CELL } from '../text/font.mjs';

const FRAME_MS = 1000 / 60;
const EMPTY = 0xffff;

// A pane of window glass, a desk lamp's glow and a shadow under a passing figure, each drawn as
// a sub screen; the rest of the sub screen is black, so math there leaves the main untouched.
function subGlass() {
  const sub = screen();
  for (let y = 40; y < 136; y++) {
    for (let x = 32; x < 160; x++) {
      const frame = x < 36 || x > 155 || y < 44 || y > 131 || x === 96;
      sub[y * WIDTH + x] = frame ? rgb15(20, 22, 24) : rgb15(10, 18, 26 - ((x + y) >> 5) % 3);
    }
  }
  return sub;
}

function subBlob(cx, cy, rx, ry, colour) {
  const sub = screen();
  for (let y = Math.max(0, cy - ry); y < Math.min(HEIGHT, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x < Math.min(WIDTH, cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d < 1) sub[y * WIDTH + x] = colour(d);
    }
  }
  return sub;
}

const lamp = (d) => {
  const v = Math.round(22 * (1 - d));
  return rgb15(v, Math.round(v * 0.8), v >> 2);
};

// The title logo as a 256-colour Mode 7 texture: an ink plate with a gold rule and the words in
// the game font at double size.
function logoTexture() {
  const w = 112;
  const h = 56;
  const px = new Uint16Array(w * h).fill(EMPTY);
  const ink = rgb15(3, 3, 8);
  const gold = rgb15(29, 23, 8);
  const paper = rgb15(31, 30, 26);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
      const rule = x === 4 || y === 4 || x === w - 5 || y === h - 5;
      px[y * w + x] = edge ? gold : rule ? rgb15(18, 12, 4) : ink;
    }
  }
  const word = (text, top, colour) => {
    const left = (w - text.length * CELL * 2) >> 1;
    [...text].forEach((ch, i) => glyph(ch).forEach((row, r) => {
      for (let c = 0; c < CELL; c++) {
        if (row[c] !== '#') continue;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) px[(top + r * 2 + dy) * w + left + (i * CELL + c) * 2 + dx] = colour;
      }
    }));
  };
  word('FINAL', 10, paper);
  word('NOTICE', 30, gold);
  return { w, h, px };
}

// Each effect: a name for the label and a pass from (main, t in ms) to the frame and a readout.
const EFFECTS = [
  { key: 'glass', run(s, t) { return [mathPass(s.main, s.glass, { op: 'add', half: true, where: (x, y) => s.glass[y * WIDTH + x] !== 0 }), 'ADD HALF']; } },
  {
    key: 'glow',
    run(s, t) {
      const cx = 128 + Math.round(70 * Math.sin(t / 900));
      return [mathPass(s.main, subBlob(cx, 120, 56, 44, lamp), { op: 'add' }), `ADD AT ${cx}`];
    },
  },
  {
    key: 'shadow',
    run(s, t) {
      const cx = 128 + Math.round(90 * Math.sin(t / 1100));
      return [mathPass(s.main, subBlob(cx, 196, 36, 10, () => rgb15(14, 14, 12)), { op: 'sub' }), `SUB AT ${cx}`];
    },
  },
  {
    key: 'fade',
    run(s, t) {
      const f = Math.floor(t / FRAME_MS) % 96;
      const level = f < 48 ? fadeLevel(f, { every: 3 }) : fadeLevel(f - 48, { from: 0, to: 15, every: 3 });
      return [brightnessPass(s.main, level), `LEVEL ${level}`];
    },
  },
  {
    key: 'mosaic',
    run(s, t) {
      const size = mosaicSize(t % 1600, 1600);
      return [mosaicPass(s.main, size), `${size} PX`];
    },
  },
  {
    key: 'window',
    run(s, t) {
      const cx = 128 + Math.round(64 * Math.sin(t / 1000));
      const r = 60;
      const spot = (y) => {
        const dy = y - 120;
        if (Math.abs(dy) >= r) return [{ left: 1, right: 0 }];
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        return [{ left: cx - half, right: cx + half }];
      };
      return [windowPass(s.main, spot), `SPOT AT ${cx}`];
    },
  },
  {
    key: 'mode7',
    run(s, t) {
      const p = (t % 3000) / 3000;
      const ease = 1 - (1 - Math.min(1, p / 0.8)) ** 3;
      const scale = 0.08 + 1.72 * ease;
      const angle = (1 - ease) * Math.PI * 4;
      const frame = mode7Pass(s.logo, mode7Matrix(scale, angle), [WIDTH >> 1, HEIGHT >> 1], brightnessPass(s.main, 9));
      return [frame, `ZOOM ${scale.toFixed(2)}`];
    },
  },
];

// ?snes&fx: keys 1-7 pick an effect (or ?snes&fx=<glass|glow|shadow|fade|mosaic|window|mode7>);
// &t=<ms> pins the clock for a screenshot.
export class SnesFxScene extends Phaser.Scene {
  constructor() {
    super('snes-fx');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.index = Math.max(0, EFFECTS.findIndex((e) => params.getAll('fx').includes(e.key)));
    const bg = composeFrame(TEST_BG, bakeScene(TEST_BG), 40, 0);
    this.state = { main: fromRgba(bg), glass: subGlass(), logo: logoTexture() };
    this.tex = this.textures.createCanvas('snes-fx', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-fx').setOrigin(0);
    this.label = this.add.graphics().setDepth(5);
    this.white = hex(rgb15(31, 31, 31));
    this.yellow = hex(rgb15(31, 27, 8));
    this.input.keyboard.on('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= EFFECTS.length) this.index = n - 1;
    });
  }

  update(time) {
    const effect = EFFECTS[this.index];
    const [frame, readout] = effect.run(this.state, this.pinned ?? time);
    toRgba(frame, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    const g = this.label.clear();
    g.fillStyle(0).fillRect(0, 0, WIDTH, 22);
    drawText(g, `${this.index + 1} ${effect.key.toUpperCase()} ${readout}`, 4, 2, this.yellow);
    drawText(g, 'KEYS 1-7', 4, 12, this.white);
  }
}
