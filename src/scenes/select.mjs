// Choose your auditor: Ward and Mercer side by side, left and right to move, A to confirm.
/* global Phaser */
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { measure, wrap } from '../text/font.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { currentSong, playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { AUDITORS, SONGS, jumpTo, next } from '../flow.mjs';
import { SELECT } from '../story/script.mjs';
import { drawText, showFlow } from './placeholder.mjs';
import { loadUi } from './title.mjs';
import { selectStep } from './menu.mjs';

const PANEL_W = 104;
const PANEL_X = [16, WIDTH - 16 - PANEL_W];
const FRAME = { y: SAFE + 44, w: 64, h: 64 };
const HEADING = 'SELECT YOUR AUDITOR';

export class SelectScene extends Phaser.Scene {
  constructor() {
    super('select');
  }

  async create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'select') state = jumpTo('select');
    this.registry.set('flow', state);
    if (currentSong() !== SONGS.select) playSong(SONGS.select);
    this.ready = false;
    this.choice = Math.max(0, AUDITORS.indexOf(state.auditor));
    this.frames = 0;

    const [ui] = await Promise.all([loadUi(), loadArt('cast').catch(() => null)]);
    this.ui = ui;
    this.cast = artOr(this, 'cast');
    this.g = this.add.graphics();
    this.layer = new SpriteLayer(this);
    this.ready = true;
    this.draw();
  }

  portrait(auditor, x, ms) {
    const name = `select.${auditor}`;
    if (this.ui?.animations?.[name]) return artOr(this, 'ui').frame(name, ms, x, FRAME.y);
    if (!this.cast.standIn) return this.cast.frame(`${auditor}.idle`, ms, x + (FRAME.w - 24) / 2, FRAME.y + FRAME.h - 48);
    return artOr(this, name, { w: 48, h: 48, palette: [0x0f, 0x00, 0x10] }).frame(null, 0, x + 8, FRAME.y + 8);
  }

  draw() {
    const g = this.g.clear();
    g.fillStyle(nes(0x0f)).fillRect(0, 0, WIDTH, HEIGHT);
    drawText(g, HEADING, Math.floor((WIDTH - measure(HEADING)) / 2), SAFE + 16, nes(0x28));
    const sprites = [];
    AUDITORS.forEach((a, i) => {
      const on = i === this.choice;
      const px = PANEL_X[i];
      const fx = px + (PANEL_W - FRAME.w) / 2;
      g.fillStyle(nes(on ? 0x28 : 0x00)).fillRect(fx - 2, FRAME.y - 2, FRAME.w + 4, FRAME.h + 4);
      g.fillStyle(nes(on ? 0x01 : 0x0f)).fillRect(fx, FRAME.y, FRAME.w, FRAME.h);
      g.fillStyle(nes(0x2d)).fillRect(fx, FRAME.y + FRAME.h - 8, FRAME.w, 1);
      sprites.push(...this.portrait(a, fx, on ? this.frames * (1000 / 60) : 0));

      if (on && this.frames % 40 < 28) drawText(g, '▼', fx + (FRAME.w - 8) / 2, FRAME.y - 14, nes(0x30));
      const { name, line } = SELECT[a];
      drawText(g, name, px + Math.floor((PANEL_W - measure(name)) / 2), FRAME.y + FRAME.h + 12, nes(on ? 0x30 : 0x10));
      wrap(line, 13, 3)[0].forEach((text, r) => {
        drawText(g, text, px + Math.floor((PANEL_W - measure(text)) / 2), FRAME.y + FRAME.h + 30 + r * 10, nes(on ? 0x2b : 0x00));
      });
    });
    const hint = 'LEFT RIGHT CHOOSE   A OK';
    drawText(g, hint, Math.floor((WIDTH - measure(hint)) / 2), HEIGHT - SAFE - 20, nes(0x10));
    this.layer.draw(sprites);
  }

  update() {
    if (!this.ready) return;
    const pad = pollPad(this.game.loop.frame);
    const step = selectStep(this.choice, pad);
    if (step.moved) sfx('menu');
    this.choice = step.choice;
    if (step.confirm) {
      sfx('menu');
      showFlow(this, next(this.registry.get('flow'), { type: 'start', auditor: AUDITORS[this.choice] }));
      return;
    }
    this.frames++;
    this.draw();
  }
}
