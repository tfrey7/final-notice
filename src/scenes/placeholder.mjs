// A stand-in for every screen of the game: its name in the 8x8 font and the pad moving the flow on.
// A later card replaces one screen by registering its real scene under the same key.
/* global Phaser */
import { WIDTH, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { CELL, glyph } from '../text/font.mjs';
import { playSong } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { AUDITORS, CHECKPOINTS, SONGS, isStage, jumpTo, next } from '../flow.mjs';

const TITLES = {
  title: ['FINAL NOTICE', 'PUSH START'],
  select: ['SELECT YOUR AUDITOR'],
  scene1: ['SCENE 1', 'THE ASSIGNMENT'],
  stage1: ['STAGE 1', 'CLAIMS AND ADJUSTMENTS'],
  scene2: ['SCENE 2', 'THE INCIDENT'],
  stage2: ['STAGE 2', 'RECORDS RETENTION'],
  scene3: ['SCENE 3', 'ORIGINAL DOCUMENTS'],
  ending: ['ENDING', 'THE END'],
  gameover: ['GAME OVER'],
};

const WHITE = nes(0x30);
const GOLD = nes(0x28);
const GREY = nes(0x10);

export function drawText(g, text, x, y, color) {
  g.fillStyle(color);
  [...text].forEach((ch, i) => {
    glyph(ch).forEach((row, r) => {
      for (let c = 0; c < CELL; c++) if (row[c] === '#') g.fillRect(x + i * CELL + c, y + r, 1, 1);
    });
  });
}

const centre = (text) => Math.floor((WIDTH - [...text].length * CELL) / 2);

// The flow state lives in the game registry; showing a state starts the scene for its screen.
export function showFlow(scene, state) {
  scene.registry.set('flow', state);
  if (scene.scene.key !== state.screen) scene.scene.start(state.screen);
}

export class PlaceholderScene extends Phaser.Scene {
  constructor(key) {
    super(key);
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== this.scene.key) state = jumpTo(this.scene.key);
    this.registry.set('flow', state);
    this.choice = 0;
    this.g = this.add.graphics();
    playSong(SONGS[this.scene.key]);
    this.draw();
  }

  get flow() {
    return this.registry.get('flow');
  }

  draw() {
    const s = this.flow;
    const g = this.g.clear();
    const [name, sub] = TITLES[s.screen];
    drawText(g, name, centre(name), SAFE + 64, GOLD);
    if (sub && !(s.screen === 'title' && Math.floor(this.time.now / 500) % 2)) drawText(g, sub, centre(sub), SAFE + 80, WHITE);

    const lines = [];
    if (s.screen === 'select') {
      lines.push(AUDITORS.map((a, i) => `${i === this.choice ? '▶' : ' '}${a.toUpperCase()}`).join('   '));
    }
    if (isStage(s.screen)) {
      lines.push(`${s.auditor.toUpperCase()}  LIVES ${s.lives}  CONT ${s.continues}`, `CHECKPOINT ${s.checkpoint.toUpperCase()}`);
    }
    if (s.screen === 'gameover') {
      lines.push(`${this.choice === 0 ? '▶' : ' '}CONTINUE  ${this.choice === 1 ? '▶' : ' '}END`, `CONTINUES ${s.continues}`);
    }
    lines.forEach((line, i) => drawText(g, line, centre(line), SAFE + 112 + i * 16, WHITE));

    const hints = {
      select: ['LEFT RIGHT CHOOSE  A OR START'],
      gameover: ['UP DOWN CHOOSE  START'],
      stage1: ['START CLEAR  B LOSE A LIFE', 'A NEXT CHECKPOINT'],
      stage2: ['START CLEAR  B LOSE A LIFE', 'A NEXT CHECKPOINT'],
    }[s.screen] ?? ['START NEXT'];
    hints.forEach((line, i) => drawText(g, line, centre(line), SAFE + 176 + i * 12, GREY));
    drawText(g, 'PLACEHOLDER', centre('PLACEHOLDER'), SAFE + 208, GREY);
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const s = this.flow;
    const hit = (b) => pad.pressed.has(b);
    let after = s;

    if (s.screen === 'select') {
      if (hit('left') || hit('right')) this.choice = 1 - this.choice;
      if (hit('a') || hit('start')) after = next(s, { type: 'start', auditor: AUDITORS[this.choice] });
    } else if (s.screen === 'gameover') {
      if (hit('up') || hit('down')) this.choice = 1 - this.choice;
      if (hit('start') || hit('a')) after = next(s, { type: this.choice === 0 ? 'continue' : 'end' });
    } else if (isStage(s.screen)) {
      if (hit('start')) after = next(s, { type: 'stageClear' });
      else if (hit('b')) after = next(s, { type: 'lifeLost' });
      else if (hit('a')) {
        const list = CHECKPOINTS[s.screen];
        after = next(s, { type: 'checkpoint', id: list[Math.min(list.indexOf(s.checkpoint) + 1, list.length - 1)] });
      }
    } else if (hit('start')) {
      after = next(s, { type: 'start' });
    }

    if (after !== s) showFlow(this, after);
    if (this.scene.isActive()) this.draw();
  }
}
