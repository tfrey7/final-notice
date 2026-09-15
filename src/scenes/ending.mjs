// The ending: EVIDENCE stamped on the ledger's file, the credits rolling over the night office to the
// `ending` song, THE END, and back to the title (docs/NES-PLAN.md section 8).
/* global Phaser */
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { drawText, measure } from '../text/font.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../flow.mjs';
import { CREDITS, SYSTEM } from '../story/script.mjs';
import { LINE_GAP, STAMP_AT, endingAt, endingStep } from '../story/ending.mjs';
import { drawBig } from './title.mjs';
import { rng } from './menu.mjs';

const centre = (text, scale = 1) => Math.floor((WIDTH - measure(text) * scale) / 2);
const FILE = { x: 56, y: 44, w: 186, h: 132 };

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('ending');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'ending') state = jumpTo('ending');
    this.registry.set('flow', state);
    this.frame = 0;
    this.done = false;
    playSong(SONGS.ending);
    this.g = this.add.graphics();
  }

  update() {
    if (this.done) return;
    const pad = pollPad(this.game.loop.frame);
    const step = endingStep(this.frame, pad);
    if (step.event === 'title') {
      this.done = true;
      showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
      return;
    }
    this.frame = step.frame;
    if (this.frame === STAMP_AT) sfx('stamp');
    this.draw(endingAt(this.frame));
  }

  draw(at) {
    const g = this.g.clear();
    g.fillStyle(nes(0x0f)).fillRect(0, 0, WIDTH, HEIGHT);
    if (at.phase === 'stamp') return this.drawFile(g, at.stamped, this.frame - STAMP_AT);
    this.drawOffice(g);
    if (at.phase === 'credits') {
      CREDITS.forEach((line, i) => {
        const y = Math.round(at.rollY + i * LINE_GAP);
        if (line && y > SAFE && y < HEIGHT - SAFE - 8) drawText(g, line, centre(line), y, nes(i === 0 ? 0x28 : 0x30));
      });
      return;
    }
    drawBig(g, SYSTEM.theEnd, centre(SYSTEM.theEnd, 2) + 2, 98, nes(0x06), 2);
    drawBig(g, SYSTEM.theEnd, centre(SYSTEM.theEnd, 2), 96, nes(0x28), 2);
  }

  // A manila file with the ledger's pages, and the red EVIDENCE stamp slamming onto it.
  drawFile(g, stamped, since) {
    const shake = stamped && since < 8 ? (since % 2 ? 2 : -2) : 0;
    const { x, y, w, h } = FILE;
    g.fillStyle(nes(0x17)).fillRect(x + shake, y - 10, 56, 12);
    g.fillStyle(nes(0x27)).fillRect(x + shake, y, w, h);
    g.fillStyle(nes(0x37)).fillRect(x + 12 + shake, y + 10, w - 24, h - 20);
    g.fillStyle(nes(0x10));
    for (let ly = y + 22; ly < y + h - 16; ly += 10) g.fillRect(x + 22 + shake, ly, w - 44 - ((ly * 7) % 40), 2);
    drawText(g, 'LEDGER - ACCOUNT ZERO', x + 18 + shake, y + 14, nes(0x0f));
    if (!stamped) return;
    const sx = centre(SYSTEM.evidence, 2) - 8 + shake;
    const sy = y + 50;
    const sw = measure(SYSTEM.evidence) * 2 + 16;
    g.fillStyle(nes(0x16)).fillRect(sx, sy, sw, 32);
    g.fillStyle(nes(0x37)).fillRect(sx + 3, sy + 3, sw - 6, 26);
    drawBig(g, SYSTEM.evidence, sx + 8, sy + 8, nes(0x16), 2);
  }

  // The night office behind the credits: dark floors of windows, a few still lit.
  drawOffice(g) {
    const r = rng(1841);
    g.fillStyle(nes(0x01)).fillRect(0, SAFE, WIDTH, HEIGHT - 2 * SAFE);
    for (let wy = SAFE + 8; wy < HEIGHT - SAFE - 16; wy += 24) {
      for (let wx = 12; wx < WIDTH - 16; wx += 28) g.fillStyle(nes(r() < 0.15 ? 0x38 : 0x0f)).fillRect(wx, wy, 18, 14);
    }
    g.fillStyle(nes(0x0f)).fillRect(0, HEIGHT - SAFE - 16, WIDTH, 16).fillRect(40, 0, WIDTH - 80, HEIGHT);
  }
}
