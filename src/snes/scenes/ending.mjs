// The SNES ending: EVIDENCE stamped on the ledger's file, the credits rolling over the night office as
// its lights go out floor by floor, THE END over the dark skyline, then a mosaic out to the title. The
// timeline is the NES one (src/story/ending.mjs): Start skips to THE END, Start there leaves.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screen, fromRgba } from '../fx.mjs';
import { screens } from '../bg/ui.mjs';
import { measure, drawString } from '../text.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { CREDITS, SYSTEM } from '../../story/script.mjs';
import { LINE_GAP, STAMP_AT, endingAt, endingStep } from '../../story/ending.mjs';
import { FrontScreen, bufferFill, inStep, outStep } from './front.mjs';
import { darkTo, douse } from './lights.mjs';

const C = {
  desk: rgb15(2, 2, 4), tab: rgb15(18, 13, 6), file: rgb15(24, 19, 10), page: rgb15(29, 28, 23),
  rule: rgb15(18, 16, 12), ink: rgb15(3, 3, 6), red: rgb15(26, 3, 3), gold: rgb15(31, 26, 10),
};

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
    this.intro = 0;
    this.leaving = null;
    playSong(SONGS.ending);
    this.night = bakeScene(screens.title);
    this.end = bakeScene(screens.theend);
    this.rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    this.buf = screen();
    this.view = new FrontScreen(this, 'snes-ending');
  }

  update() {
    if (this.pinned == null && this.leaving == null) {
      const step = endingStep(this.frame, pollPad(this.game.loop.frame));
      if (step.event === 'title') this.leaving = 0;
      else {
        if (this.frame < STAMP_AT && step.frame >= STAMP_AT) sfx('stamp');
        this.frame = step.frame;
      }
    }
    this.paint(endingAt(this.frame));
    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        this.leaving = null;
        showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
        return;
      }
      this.view.show(this.buf, step);
      return;
    }
    this.view.show(this.buf, inStep(this.intro++));
  }

  paint(at) {
    const fill = bufferFill(this.buf);
    if (at.phase === 'stamp') {
      drawFile(fill, at.stamped, this.frame - STAMP_AT);
      return;
    }
    const end = at.phase === 'end';
    fromRgba(composeFrame(end ? screens.theend : screens.title, end ? this.end : this.night, 0, 0, this.rgba), this.buf);
    douse(this.buf, darkTo(this.frame));
    if (end) return;
    CREDITS.forEach((line, i) => {
      const y = Math.round(at.rollY + i * LINE_GAP);
      if (line && y > -8 && y < HEIGHT) drawString(fill, line, (WIDTH - measure(line)) >> 1, y, i === 0 ? C.gold : undefined);
    });
  }
}

// A manila file with the ledger's pages, and the red EVIDENCE stamp slamming onto it.
function drawFile(fill, stamped, since) {
  const shake = stamped && since < 8 ? (since % 2 ? 2 : -2) : 0;
  const [x, y, w, h] = [36 + shake, 44, 184, 132];
  fill(0, 0, WIDTH, HEIGHT, C.desk);
  fill(x, y - 10, 56, 12, C.tab);
  fill(x, y, w, h, C.file);
  fill(x + 12, y + 10, w - 24, h - 20, C.page);
  for (let ly = y + 30; ly < y + h - 16; ly += 10) fill(x + 22, ly, w - 44 - ((ly * 7) % 40), 1, C.rule);
  drawString(fill, 'LEDGER - ACCOUNT ZERO', x + 18, y + 15, C.ink, null);
  if (!stamped) return;
  const sw = measure(SYSTEM.evidence) + 24;
  const sx = ((WIDTH - sw) >> 1) + shake;
  const sy = y + 56;
  fill(sx, sy, sw, 26, C.red);
  fill(sx + 3, sy + 3, sw - 6, 20, C.page);
  drawString(fill, SYSTEM.evidence, sx + 12, sy + 9, C.red, null);
}
