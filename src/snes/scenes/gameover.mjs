// The SNES game over: the worn red GAME OVER stamp fades up, then CONTINUE (while continues remain)
// and END. Continue restarts the area with 3 lives; END mosaics out to the title.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screen, fromRgba } from '../fx.mjs';
import { screens } from '../bg/ui.mjs';
import { measure, drawString } from '../text.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, gameOverChoices, jumpTo, next, showFlow } from '../../flow.mjs';
import { SYSTEM } from '../../story/script.mjs';
import { blinkOn } from '../../scenes/menu.mjs';
import { FrontScreen, bufferFill, confirmed, inStep, outStep } from './front.mjs';

const LABEL = { continue: SYSTEM.continue, end: SYSTEM.end };
const MENU_Y = 172;
const FADE_UP = 40;

export class SnesGameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'gameover') state = jumpTo('gameover');
    this.registry.set('flow', state);
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.choices = gameOverChoices(state);
    this.choice = 0;
    this.frames = 0;
    this.leaving = null;
    playSong(SONGS.gameover);
    const s = screens.gameover;
    this.back = screen();
    this.buf = screen();
    const rgba = composeFrame(s, bakeScene(s), 0, 0);
    fromRgba(rgba, this.back);
    this.view = new FrontScreen(this, 'snes-gameover');
  }

  update() {
    const f = this.pinned ?? this.frames++;
    const ready = f >= FADE_UP;
    if (this.pinned == null && this.leaving == null && ready) {
      const pad = pollPad(this.game.loop.frame);
      if (['up', 'down', 'left', 'right', 'select'].some((b) => pad.pressed.has(b)) && this.choices.length > 1) {
        this.choice = 1 - this.choice;
        sfx('blip');
      }
      if (confirmed(pad)) this.leaving = 0;
    }

    this.buf.set(this.back);
    if (ready) {
      const fill = bufferFill(this.buf);
      const x = (WIDTH - measure(LABEL.continue)) >> 1;
      this.choices.forEach((c, i) => {
        const y = MENU_Y + i * 14;
        const on = i === this.choice;
        drawString(fill, LABEL[c], x, y, on ? rgb15(31, 31, 31) : rgb15(17, 15, 15));
        if (on && (this.leaving != null || blinkOn(f))) drawString(fill, '▶', x - 12, y, rgb15(31, 10, 8));
      });
    }

    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        showFlow(this, next(this.registry.get('flow'), { type: this.choices[this.choice] }));
        return;
      }
      this.view.show(this.buf, step);
      return;
    }
    const level = Math.min(15, Math.floor((f * 15) / FADE_UP));
    this.view.show(this.buf, { mosaic: 1, level });
  }
}
