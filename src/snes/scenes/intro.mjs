// The card before each stage of the run: the stage number and its floor on black, held a moment (Start
// skips it), then the stage itself.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString, measure } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { pollPad } from '../../input.mjs';
import { STAGE_CARDS, next, showFlow } from '../../flow.mjs';
import { confirmed } from './front.mjs';

export const INTRO = { hold: 120, skip: 20 };

export class SnesIntroScene extends Phaser.Scene {
  constructor() {
    super('intro');
  }

  create() {
    this.t = 0;
    this.g = this.add.graphics();
    this.fill = (x, y, w, h, c) => this.g.fillStyle(hex(c)).fillRect(x, y, w, h);
  }

  update() {
    const flow = this.registry.get('flow');
    const pad = pollPad(this.game.loop.frame);
    this.t += 1;
    if (this.t >= INTRO.hold || (this.t > INTRO.skip && confirmed(pad))) {
      showFlow(this, next(flow, { type: 'introDone' }));
      return;
    }
    const [number, floor] = STAGE_CARDS[flow.screen] ?? ['', ''];
    const centre = (text, y, c) => drawString(this.fill, text, Math.round((WIDTH - measure(text)) / 2), y, c);
    const g = this.g.clear();
    g.fillStyle(0x000000).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x6a6872).fillRect(64, HEIGHT / 2 - 2, WIDTH - 128, 1);
    centre(number, HEIGHT / 2 - 18, rgb15(20, 20, 22));
    centre(floor, HEIGHT / 2 + 6, rgb15(31, 31, 31));
    centre(`LIVES ${flow.lives}`, HEIGHT - 40, rgb15(16, 16, 18));
  }
}
