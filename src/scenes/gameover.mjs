// GAME OVER: CONTINUE restarts the area with 3 lives while continues remain, END goes back to the title.
/* global Phaser */
import { WIDTH, HEIGHT } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { drawText, measure } from '../text/font.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, gameOverChoices, jumpTo, next, showFlow } from '../flow.mjs';
import { SYSTEM } from '../story/script.mjs';
import { drawBig } from './title.mjs';
import { blinkOn } from './menu.mjs';

const centre = (text, scale = 1) => Math.floor((WIDTH - measure(text) * scale) / 2);
const LABEL = { continue: SYSTEM.continue, end: SYSTEM.end };

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('gameover');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'gameover') state = jumpTo('gameover');
    this.registry.set('flow', state);
    this.choices = gameOverChoices(state);
    this.choice = 0;
    this.frames = 0;
    this.done = false;
    playSong(SONGS.gameover);
    this.add.graphics().fillStyle(nes(0x0f)).fillRect(0, 0, WIDTH, HEIGHT);
    const title = this.add.graphics();
    drawBig(title, SYSTEM.gameOver, centre(SYSTEM.gameOver, 2) + 2, 66, nes(0x06), 2);
    drawBig(title, SYSTEM.gameOver, centre(SYSTEM.gameOver, 2), 64, nes(0x16), 2);
    this.menu = this.add.graphics();
  }

  update() {
    if (this.done) return;
    const pad = pollPad(this.game.loop.frame);
    const hit = (b) => pad.pressed.has(b);
    if (['up', 'down', 'left', 'right', 'select'].some(hit) && this.choices.length > 1) {
      this.choice = 1 - this.choice;
      sfx('blip');
    }
    if (hit('start') || hit('a')) {
      this.done = true;
      showFlow(this, next(this.registry.get('flow'), { type: this.choices[this.choice] }));
      return;
    }
    this.draw(this.registry.get('flow'));
  }

  draw(state) {
    const g = this.menu.clear();
    this.choices.forEach((c, i) => {
      const y = 120 + i * 16;
      const x = centre(LABEL.continue) - 4;
      drawText(g, LABEL[c], x, y, nes(0x30));
      if (i === this.choice && blinkOn(this.frames)) drawText(g, '▶', x - 14, y, nes(0x28));
    });
    this.frames++;
    const left = `CONTINUES ${state.continues}`;
    drawText(g, left, centre(left), 172, nes(0x10));
  }
}
