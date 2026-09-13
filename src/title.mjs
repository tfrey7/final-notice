// The title screen: FINAL NOTICE in brass over a midnight skyline, and a blinking PRESS START.
/* global Phaser */
import { WIDTH, HEIGHT, skyline, blinkVisible } from './screen.mjs';
import { PALETTE as P } from './palette.mjs';
import { textPixels, textWidth, GLYPH_H } from './font.mjs';

const TITLE = 'FINAL NOTICE';
const TITLE_SCALE = 3;
const PROMPT = 'PRESS START';

function brassFor(row) {
  if (row <= 1) return P.brassLight;
  if (row <= 4) return P.brass;
  return P.brassDark;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const g = this.add.graphics();

    // Sky: three flat midnight bands, darkest at the top.
    g.fillStyle(P.night0).fillRect(0, 0, WIDTH, 80);
    g.fillStyle(P.night1).fillRect(0, 80, WIDTH, 60);
    g.fillStyle(P.night2).fillRect(0, 140, WIDTH, HEIGHT - 140);

    // Distant towers with a few warmly lit windows.
    for (const t of skyline(1989)) {
      const top = HEIGHT - t.h;
      g.fillStyle(P.tower).fillRect(t.x, top, t.w, t.h);
      t.lit.forEach(([wx, wy], i) => {
        g.fillStyle(i % 3 === 0 ? P.windowDim : P.window).fillRect(t.x + wx, top + wy, 2, 2);
      });
    }

    // The title in brass with a one-pixel dark outline.
    const tw = textWidth(TITLE, TITLE_SCALE);
    const tx = Math.floor((WIDTH - tw) / 2);
    const ty = 58;
    const pixels = textPixels(TITLE, TITLE_SCALE);
    g.fillStyle(P.outline);
    for (const [x, y] of pixels) g.fillRect(tx + x - 1, ty + y - 1, 3, 3);
    g.fillStyle(P.burgundy);
    for (const [x, y] of pixels) g.fillRect(tx + x + 1, ty + y + 1, 1, 1);
    for (const [x, y, row] of pixels) g.fillStyle(brassFor(row)).fillRect(tx + x, ty + y, 1, 1);

    // A seafoam fluorescent rule beneath it.
    const ruleY = ty + GLYPH_H * TITLE_SCALE + 7;
    g.fillStyle(P.seafoam).fillRect(tx, ruleY, tw, 1);
    g.fillStyle(P.seafoamDark).fillRect(tx, ruleY + 1, tw, 1);

    // PRESS START on its own layer so it can blink.
    this.prompt = this.add.graphics();
    const px = Math.floor((WIDTH - textWidth(PROMPT)) / 2);
    const py = 128;
    for (const [x, y] of textPixels(PROMPT)) {
      this.prompt.fillStyle(P.outline).fillRect(px + x + 1, py + y + 1, 1, 1);
    }
    for (const [x, y] of textPixels(PROMPT)) {
      this.prompt.fillStyle(P.seafoam).fillRect(px + x, py + y, 1, 1);
    }

    // PRESS START: Enter, Space, Z or X on the keyboard, or any face or start button on a pad.
    this.started = false;
    this.input.keyboard.on('keydown', (e) => {
      if (['Enter', ' ', 'z', 'Z', 'x', 'X'].includes(e.key)) this.start();
    });
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.scene.start('lobby');
  }

  update(time) {
    this.prompt.setVisible(blinkVisible(time));
    const pad = this.input.gamepad && this.input.gamepad.total ? this.input.gamepad.getPad(0) : null;
    if (pad && [0, 1, 2, 3, 9].some((i) => pad.buttons[i] && pad.buttons[i].pressed)) this.start();
  }
}
