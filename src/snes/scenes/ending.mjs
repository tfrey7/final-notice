// The SNES ending, boards E1-E5: the ledger laid in a manila file on Bellwether's desk, EVIDENCE stamped
// by Mode 7 with a fixed-colour flash and a shake, the file closing into a mosaic, the credits on BG3
// over the night tower while its lit floors are windowed out band by band, then one window, THE END,
// the clock tick and a fade to the title. The timeline is src/snes/ending.mjs; the shapes are stand-ins
// until card 1937's backdrops. Start skips to THE END, and Start there leaves.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15, channels } from '../color.mjs';
import { mathPass, mode7Matrix, mode7Pass, screen, windowPass } from '../fx.mjs';
import { measure, drawString } from '../text.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { CREDITS, SYSTEM } from '../../story/script.mjs';
import { FLOORS, LINE_GAP, endingAt, endingCues, endingStep, floorWindow } from '../ending.mjs';
import { FrontScreen, bufferFill, outStep } from './front.mjs';

const CLEAR = 0xffff;
const CUES = { paper: 'carbonCopy', stamp: 'stamp', tick: 'step' };

const C = {
  deskTop: rgb15(12, 8, 5), deskBottom: rgb15(6, 4, 2), file: rgb15(24, 19, 10), cover: rgb15(26, 21, 12),
  crease: rgb15(18, 14, 7), page: rgb15(29, 28, 22), ink: rgb15(3, 3, 6), red: rgb15(27, 4, 5),
  book: rgb15(11, 4, 4), bookEdge: rgb15(6, 2, 2), gold: rgb15(31, 26, 10), leaves: rgb15(26, 25, 20),
  night: rgb15(1, 1, 5), dusk: rgb15(7, 3, 10), bldg: rgb15(2, 2, 4), bldg2: rgb15(3, 3, 6),
  outline: rgb15(3, 2, 4), dark: rgb15(3, 3, 6), dim: rgb15(6, 6, 9), lit: rgb15(28, 24, 11), flash: rgb15(16, 16, 16),
};

const mix = (a, b, t) => rgb15(...channels(a).map((v, i) => Math.round(v + (channels(b)[i] - v) * t)));

// The tower: floors every 9 px from TOWER.top + 6, windows 4 px tall; the lit floors are FLOORS of them
// in a row from LIT_FLOOR, and the clerk's window is the last lit floor's seventh.
const TOWER = { x: 178, top: 40, w: 72 };
const LIT_FLOOR = 6;
const floorY = (fl) => TOWER.top + 6 + fl * 9;
const KEEP = { left: TOWER.x + 4 + 6 * 7, right: TOWER.x + 7 + 6 * 7 };
const FILE = { x: 48, y: 48, w: 160, h: 128 };
const LEDGER = { x: 92, y: 84, w: 72, h: 52 };

// The desk in HDMA-style bands, warm lamp-lit wood at the top to shadow at the bottom.
function desk(fill) {
  const bands = 14;
  for (let i = 0; i < bands; i++) fill(0, Math.floor((i * HEIGHT) / bands), WIDTH, Math.ceil(HEIGHT / bands), mix(C.deskTop, C.deskBottom, i / (bands - 1)));
}

function ledger(fill, x, y) {
  const { w, h } = LEDGER;
  fill(x + 2, y + 2, w, h, C.bookEdge);
  fill(x, y, w, h, C.book);
  fill(x + w - 4, y + 2, 3, h - 4, C.leaves);
  const label = measure('LEDGER') + 8;
  const lx = x + ((w - 4 - label) >> 1);
  fill(lx, y + 14, label, 16, C.gold);
  fill(lx + 2, y + 16, label - 4, 12, C.book);
  drawString(fill, 'LEDGER', lx + 4, y + 18, C.gold, null);
}

// E1-E3: the file on the desk, the ledger sliding in, the stamp over both, and the cover closing on it.
function paintFile(buf, at, stamp) {
  const fill = bufferFill(buf);
  const s = at.shake;
  desk(fill);
  fill(FILE.x + s, FILE.y - 8, 60, 10, C.file);
  fill(FILE.x + s, FILE.y, FILE.w, FILE.h, C.file);
  fill(FILE.x + 12 + s, FILE.y + 12, FILE.w - 24, FILE.h - 24, C.page);
  drawString(fill, 'FILE: ACCOUNT ZERO', FILE.x + 24 + s, FILE.y + 24, C.ink, null);
  ledger(fill, LEDGER.x + s, Math.round(HEIGHT + (LEDGER.y - HEIGHT) * at.ledger));
  if (at.stamp) mode7Pass(stamp, mode7Matrix(at.stamp, -0.15), [128 + s, 144], buf, buf);
  if (at.closed > 0) {
    const h = Math.round(FILE.h * at.closed);
    fill(FILE.x + s, FILE.y, FILE.w, h, C.cover);
    fill(FILE.x + s, FILE.y + h - 1, FILE.w, 1, C.crease);
  }
  if (at.flash) mathPass(buf, screen(C.flash), { op: 'add' }, buf);
}

// E4-E5 backdrop: the banded sky, the far skyline and the tower with every floor dark.
function nightPicture() {
  const buf = screen();
  const fill = bufferFill(buf);
  const base = 150;
  const bands = 10;
  for (let i = 0; i < bands; i++) fill(0, Math.floor((i * base) / bands), WIDTH, Math.ceil(base / bands), mix(C.night, C.dusk, i / (bands - 1)));
  for (let i = 0; i < 14; i++) {
    const x = ((i * 23) % 300) - 22, w = 16 + (i * 7) % 14, top = base - 30 - (i * 37) % 60;
    fill(x, top, w, base - top, C.bldg2);
    for (let wy = top + 4; wy < base - 3; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 4) if ((wx * 5 + wy * 3 + i) % 7 < 2) fill(wx, wy, 2, 2, C.dim);
  }
  fill(0, base, WIDTH, HEIGHT - base, C.bldg);
  const { x, top, w } = TOWER;
  fill(x - 1, top - 1, w + 2, HEIGHT - top + 1, C.outline);
  fill(x, top, w, HEIGHT - top, C.bldg);
  for (let fl = 0; floorY(fl) < HEIGHT; fl++) {
    for (let wx = x + 4; wx < x + w - 4; wx += 6) fill(wx, floorY(fl), 4, 4, (wx + fl) % 11 === 0 ? C.dim : C.dark);
  }
  fill(x + (w >> 1) - 1, top - 14, 2, 14, C.outline);
  return buf;
}

// The lit windows alone, a layer of their own the per-band windows mask.
function lightsLayer() {
  const buf = screen(CLEAR);
  const fill = bufferFill(buf);
  for (let k = 0; k < FLOORS; k++) {
    for (let wx = TOWER.x + 4; wx < TOWER.x + TOWER.w - 4; wx += 6) fill(wx, floorY(LIT_FLOOR + k), 4, 4, C.lit);
  }
  return buf;
}

// Which lit floor scanline y belongs to, or -1.
function bandOf(y) {
  const k = Math.floor((y - floorY(LIT_FLOOR)) / 9);
  return k >= 0 && k < FLOORS && (y - floorY(LIT_FLOOR)) % 9 < 4 ? k : -1;
}

function stampTexture(word) {
  const w = measure(word) + 24, h = 28;
  const px = new Uint16Array(w * h).fill(CLEAR);
  const fill = (x, y, rw, rh, c) => {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) px[j * w + i] = c;
  };
  fill(0, 0, w, 3, C.red); fill(0, h - 3, w, 3, C.red); fill(0, 0, 3, h, C.red); fill(w - 3, 0, 3, h, C.red);
  drawString(fill, word, 12, 10, C.red, null);
  return { w, h, px };
}

const leftCentre = (text) => Math.max(4, (TOWER.x - 4 - measure(text)) >> 1);

export class SnesEndingScene extends Phaser.Scene {
  constructor() {
    super('ending');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'ending') state = jumpTo('ending');
    this.registry.set('flow', state);
    const params = new URLSearchParams(location.search);
    // &t=<frames> pins the ending's clock for a screenshot.
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.frame = this.pinned ?? 0;
    this.leaving = null;
    playSong(SONGS.ending);
    this.night = nightPicture();
    this.lights = lightsLayer();
    this.lit = screen();
    this.stamp = stampTexture(SYSTEM.evidence);
    this.buf = screen();
    this.view = new FrontScreen(this, 'snes-ending');
  }

  update() {
    if (this.pinned == null && this.leaving == null) {
      const step = endingStep(this.frame, pollPad(this.game.loop.frame));
      if (step.event === 'title') this.leaving = 0;
      else {
        this.frame = step.frame;
        for (const cue of endingCues(this.frame)) sfx(CUES[cue]);
      }
    }
    const at = endingAt(this.frame);
    this.paint(at);
    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        this.leaving = null;
        showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
        return;
      }
      this.view.show(this.buf, { mosaic: Math.max(at.mosaic, step.mosaic), level: Math.min(at.level, step.level) });
      return;
    }
    this.view.show(this.buf, at);
  }

  paint(at) {
    if (at.picture === 'file') {
      paintFile(this.buf, at, this.stamp);
      return;
    }
    this.buf.set(this.night);
    windowPass(this.lights, (y) => {
      const k = bandOf(y);
      return k < 0 ? [] : floorWindow(k, at.out, FLOORS, KEEP);
    }, { colour: CLEAR }, this.lit);
    for (let i = 0; i < this.lit.length; i++) if (this.lit[i] !== CLEAR) this.buf[i] = this.lit[i];
    const fill = bufferFill(this.buf);
    if (at.rollY == null) {
      drawString(fill, SYSTEM.theEnd, leftCentre(SYSTEM.theEnd), 104);
      return;
    }
    CREDITS.forEach((line, i) => {
      const y = Math.round(at.rollY + i * LINE_GAP);
      if (line && y > -8 && y < HEIGHT) drawString(fill, line, leftCentre(line), y, i === 0 ? C.gold : undefined);
    });
  }
}
