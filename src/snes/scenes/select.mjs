// The SNES select: Ward and Mercer as two personnel files on a desk blotter, the office window's skyline
// behind. A lamp cone by colour math (add) lights the chosen file and the other is dimmed by subtract;
// confirming stamps APPROVED on the chosen file in worn ink (subtract) before the mosaic out.
// Left and right move, Start or A confirms.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15, channels } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screen, fromRgba, mathPass } from '../fx.mjs';
import { FILES, SILL, STAMP_FRAMES, approvedStamp, screens } from '../bg/ui.mjs';
import { measure, drawString, wrapText } from '../text.mjs';
import { loadArt, pixelAt } from '../art.mjs';
import { currentSong, playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { AUDITORS, SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { SELECT } from '../../story/script.mjs';
import { selectStep } from '../../scenes/menu.mjs';
import { FrontScreen, IN_FRAMES, OUT_FRAMES, bufferFill, confirmed, inStep, outStep, spotSub } from './front.mjs';
import { WIPE_FRAMES, drawerPass, wipeEdge, wipeStep } from '../drawer.mjs';
import { SLIDE_FRAMES, openMemo, readSettings } from '../memo.mjs';
import { titleStill } from './title.mjs';

const HEADING = 'PERSONNEL FILES';
const PROMPT = 'A: SIGN OUT FILE';
const GRADE = ['GRADE 7', 'SENIOR', 'AUDITOR'];
const FILE = {
  ward: { tab: 'WARD', temperament: 'BY THE BOOK' },
  mercer: { tab: 'MERCER', temperament: 'OFF BOOK' },
};
const INK = rgb15(6, 4, 3);
const INK_SHADOW = rgb15(20, 14, 6);
const DIM = rgb15(10, 10, 8);
const STAMP_INK = [rgb15(1, 6, 6), rgb15(2, 11, 11), rgb15(3, 16, 16), rgb15(4, 22, 22)];
const STAMP_HOLD = 20;

// A column-wise colour ramp for lettering: fill() calls in `c === GRADIENT` take the row's colour.
const GRADIENT = -1;
const graded = (fill, top, colours) => (x, y, w, h, c) => fill(x, y, w, h, c === GRADIENT ? colours[Math.min(colours.length - 1, Math.max(0, y - top))] : c);
const ramp = (a, b, n) => {
  const [ca, cb] = [channels(a), channels(b)];
  return Array.from({ length: n }, (_, i) => rgb15(...ca.map((v, k) => Math.round(v + ((cb[k] - v) * i) / (n - 1)))));
};

// The heading on a dark plate with a gradient fill, bevelled edges and gradient, drop-shadowed letters.
function heading(fill) {
  const w = measure(HEADING) + 28;
  const x = (WIDTH - w) >> 1;
  const y = 29;
  ramp(rgb15(3, 3, 8), rgb15(1, 1, 3), 18).forEach((c, i) => fill(x + 1, y + i, w - 2, 1, c));
  fill(x, y + 1, 1, 16, rgb15(1, 1, 2)); fill(x + w - 1, y + 1, 1, 16, rgb15(1, 1, 2));
  fill(x + 1, y, w - 2, 1, rgb15(12, 12, 18)); fill(x + 1, y + 17, w - 2, 1, rgb15(0, 0, 1));
  drawString(graded(fill, y + 5, ramp(rgb15(31, 31, 27), rgb15(26, 20, 9), 8)), HEADING, x + 14, y + 5, GRADIENT, rgb15(0, 0, 0));
}

// The fixed writing on one file: its tab, grade, temperament and the auditor's line on the rules.
function fileText(fill, auditor, fx) {
  const { tab, temperament } = FILE[auditor];
  const { tab: t, photo, y, rules } = FILES;
  drawString(fill, tab, fx + t.dx + ((t.w - measure(tab)) >> 1), t.y + 4, INK, INK_SHADOW);
  GRADE.forEach((line, i) => drawString(fill, line, fx + photo.dx + photo.w + 4, y + photo.dy + 2 + i * 12, INK, INK_SHADOW));
  drawString(fill, temperament, fx + 7, y + photo.dy + photo.h + 8, rgb15(14, 2, 3), INK_SHADOW);
  wrapText(SELECT[auditor].line, FILES.w - 14, rules.length)[0].forEach((line, i) => drawString(fill, line, fx + 8, rules[i] - 9, rgb15(4, 6, 14), null));
}

// The room's falloff for subtract: the desk deepens down the screen (HDMA on the fixed colour) and
// toward both edges, away from the lamp.
function shade() {
  const out = screen();
  for (let y = SILL; y < 224; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const v = Math.round((7 * (y - SILL)) / (224 - SILL) + (5 * Math.abs(x - 128)) / 128);
      out[y * WIDTH + x] = rgb15(v, v, Math.round(v * 0.7));
    }
  }
  return out;
}

// The idle frame's head and shoulders, centred in the photo well.
function photoFromArt(buf, def, frameName, x, y, w, h) {
  const f = def.frames[frameName];
  const sx = (f.origin?.[0] ?? f.w >> 1) - (w >> 1);
  for (let dy = 0; dy < h - 4; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const v = pixelAt(f, sx + dx, dy);
      if (v) buf[(y + 4 + dy) * WIDTH + x + dx] = def.palette[v - 1];
    }
  }
}

// Until the art exists, a shaded bust in silhouette: head, collar, suit and tie.
function photoStandIn(buf, x, y, w, h) {
  const cx = x + (w >> 1);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const hx = (xx - cx) / 6;
      const hy = (yy - (y + 14)) / 8;
      const shoulder = yy - (y + 25);
      let c = null;
      if (hx * hx + hy * hy < 1) c = xx < cx - 2 ? rgb15(13, 9, 6) : xx < cx + 3 ? rgb15(10, 7, 5) : rgb15(6, 4, 3);
      else if (shoulder >= 0 && Math.abs(xx - cx) < 7 + shoulder * 1.4) {
        if (Math.abs(xx - cx) <= 1 && shoulder > 1) c = shoulder % 5 === 0 ? rgb15(12, 2, 2) : rgb15(21, 4, 4);
        else if (Math.abs(xx - cx) <= 3 && shoulder < 5) c = rgb15(26, 26, 24);
        else c = xx < cx - 8 ? rgb15(6, 6, 11) : rgb15(3, 3, 7);
      }
      if (c != null) buf[yy * WIDTH + xx] = c;
    }
  }
}

export class SnesSelectScene extends Phaser.Scene {
  constructor() {
    super('select');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'select') state = jumpTo('select');
    this.registry.set('flow', state);
    if (currentSong() !== SONGS.select) playSong(SONGS.select);
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.choice = Math.max(0, AUDITORS.indexOf(state.auditor));
    this.spotX = this.centre(this.choice);
    this.frames = 0;
    this.leaving = params.has('stamp') ? Number(params.get('stamp')) : null;
    this.defs = {};
    AUDITORS.forEach((a) => loadArt(a).then((d) => { this.defs[a] = d; }).catch(() => {}));
    const rgba = new Uint8ClampedArray(WIDTH * 224 * 4);
    composeFrame(screens.select, bakeScene(screens.select), 0, 0, rgba);
    this.base = mathPass(fromRgba(rgba, screen()), shade(), { op: 'sub' });
    const fill = bufferFill(this.base);
    heading(fill);
    AUDITORS.forEach((a, i) => fileText(fill, a, FILES.xs[i]));
    drawString(fill, PROMPT, (WIDTH - measure(PROMPT)) >> 1, 209, rgb15(30, 29, 22), rgb15(1, 3, 2));
    this.work = screen();
    this.lit = screen();
    this.out = screen();
    this.sub = screen();
    this.dimSub = screen(DIM);
    this.inkSub = screen();
    this.drawn = screen();
    // The title's last frame, left by NEW AUDIT; &wipe=<frame> pins the drawer over a stand-in title.
    this.wipe = this.registry.get('drawer') ?? null;
    this.registry.remove('drawer');
    this.wipeF = 0;
    if (!this.wipe && params.has('wipe')) {
      this.wipe = titleStill({ ...openMemo(readSettings(null), false), slide: SLIDE_FRAMES });
      this.wipeF = Number(params.get('wipe'));
    }
    this.view = new FrontScreen(this, 'snes-select');
  }

  centre(i) {
    return FILES.xs[i] + (FILES.w >> 1);
  }

  photos(ms) {
    AUDITORS.forEach((a, i) => {
      const x = FILES.xs[i] + FILES.photo.dx + 2;
      const y = FILES.y + FILES.photo.dy + 2;
      const [w, h] = [FILES.photo.w - 4, FILES.photo.h - 4];
      const def = this.defs[a];
      if (!def) return photoStandIn(this.work, x, y, w, h);
      const idle = def.animations?.idle;
      const frame = idle && i === this.choice ? idle.frames[Math.floor((ms * (idle.fps ?? 8)) / 1000) % idle.frames.length] : (idle?.frames[0] ?? 'idle');
      return photoFromArt(this.work, def, def.frames[frame] ? frame : Object.keys(def.frames)[0], x, y, w, h);
    });
  }

  update() {
    if (this.wipe && this.wipeF >= WIPE_FRAMES && this.pinned == null) {
      this.wipe = null;
      this.frames = Math.max(this.frames, IN_FRAMES);
    }
    if (this.pinned == null) {
      const pad = pollPad(this.game.loop.frame);
      const press = confirmed(pad);
      if (this.wipe) {
        this.wipeF = wipeStep(this.wipeF, press).frame;
      } else if (this.leaving != null) {
        if (press && this.leaving > 0) this.leaving = STAMP_HOLD + OUT_FRAMES;
      } else if (press && this.frames < IN_FRAMES) {
        this.frames = IN_FRAMES;
      } else {
        const step = selectStep(this.choice, pad);
        if (step.moved) sfx('pencil');
        this.choice = step.choice;
        if (step.confirm || press) this.leaving = 0;
      }
    }
    const f = this.pinned ?? this.frames++;
    this.spotX += (this.centre(this.choice) - this.spotX) * (this.pinned == null ? 0.3 : 1);

    this.work.set(this.base);
    this.photos(f * (1000 / 60));
    const other = FILES.xs[1 - this.choice];
    spotSub(this.spotX, FILES.y + 40, 76, 110, this.sub, 11);
    mathPass(this.work, this.sub, { op: 'add' }, this.lit);
    let frame = mathPass(this.lit, this.dimSub, {
      op: 'sub',
      where: (x, y) => x >= other - 3 && x < other + FILES.w + 5 && y >= FILES.tab.y && y < FILES.y + FILES.h + 4,
    }, this.out);

    if (this.wipe) {
      this.view.show(drawerPass(this.wipe, frame, wipeEdge(this.wipeF), this.drawn));
      return;
    }
    if (this.leaving == null) {
      this.view.show(frame, inStep(f));
      return;
    }
    const k = this.leaving;
    if (k === 0 && this.pinned == null) sfx('stampOk');
    const ink = STAMP_INK[Math.min(k, STAMP_FRAMES - 1)];
    const cx = FILES.xs[this.choice] + FILES.stamp.dx;
    this.inkSub.fill(0);
    for (const [dx, dy] of approvedStamp(k)) {
      const x = cx + dx;
      const y = FILES.stamp.y + dy;
      if (x >= 0 && x < WIDTH && y >= 0 && y < 224) this.inkSub[y * WIDTH + x] = ink;
    }
    frame = mathPass(frame, this.inkSub, { op: 'sub' }, this.lit);
    if (this.pinned == null) this.leaving++;
    if (k < STAMP_HOLD) {
      this.view.show(frame);
      return;
    }
    const step = outStep(k - STAMP_HOLD);
    if (step.done) {
      showFlow(this, next(this.registry.get('flow'), { type: 'start', auditor: AUDITORS[this.choice] }));
      return;
    }
    this.view.show(frame, step);
  }
}
