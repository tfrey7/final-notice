// The title: FINAL NOTICE over a night skyline, PUSH START blinking, and after 20 idle seconds the attract note.
/* global Phaser */
import { WIDTH, HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { CELL, glyph, measure, drawText } from '../text/font.mjs';
import { loadArt, artOr, SpriteLayer } from '../nes/art.mjs';
import { playSong } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../flow.mjs';
import { blinkOn, rng, skyline, titleStep } from './menu.mjs';

const centre = (text, scale = 1) => Math.floor((WIDTH - measure(text) * scale) / 2);

export function drawBig(g, text, x, y, color, scale) {
  g.fillStyle(color);
  [...text].forEach((ch, i) => {
    glyph(ch).forEach((row, r) => {
      for (let c = 0; c < CELL; c++) if (row[c] === '#') g.fillRect(x + (i * CELL + c) * scale, y + r * scale, scale, scale);
    });
  });
}

export async function loadUi() {
  try {
    return await loadArt('ui');
  } catch {
    return null;
  }
}

// Places named art from the ui module, as a tile background or a sprite animation. False until that art exists.
export function placeArt(scene, def, name, x, y, layer, ms = 0) {
  if (def?.backgrounds?.[name]) {
    scene.add.image(x, y, artOr(scene, 'ui').background(name)).setOrigin(0);
    return true;
  }
  if (def?.animations?.[name]) {
    layer.draw(artOr(scene, 'ui').frame(name, ms, x, y));
    return true;
  }
  return false;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  async create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'title') state = jumpTo('title');
    this.registry.set('flow', state);
    playSong(SONGS.title);
    this.ready = false;
    this.t = { idle: 0, demo: false };
    this.frames = 0;

    const def = await loadUi();
    const layer = new SpriteLayer(this);
    if (!placeArt(this, def, 'skyline', 0, 0, layer)) this.drawSkyline();
    if (!placeArt(this, def, 'logo', 0, SAFE + 24, layer)) this.drawLogo();

    this.prompt = this.add.graphics();
    drawText(this.prompt, 'PUSH START', centre('PUSH START') + 1, 117, nes(0x0f));
    drawText(this.prompt, 'PUSH START', centre('PUSH START'), 116, nes(0x30));

    this.demo = this.add.graphics().setDepth(30).setVisible(false);
    this.demo.fillStyle(nes(0x0f)).fillRect(0, 0, WIDTH, HEIGHT);
    drawBig(this.demo, 'DEMO', centre('DEMO', 2), 104, nes(0x28), 2);
    this.ready = true;
  }

  drawSkyline() {
    const g = this.add.graphics();
    g.fillStyle(nes(0x0f)).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(nes(0x01)).fillRect(0, 128, WIDTH, HEIGHT - 128);
    g.fillStyle(nes(0x02)).fillRect(0, 168, WIDTH, HEIGHT - 168);
    const r = rng(1989);
    g.fillStyle(nes(0x10));
    for (let i = 0; i < 28; i++) g.fillRect(Math.floor(r() * WIDTH), SAFE + Math.floor(r() * 110), 1, 1);
    g.fillStyle(nes(0x30)).fillCircle(212, 36, 9);
    g.fillStyle(nes(0x0f)).fillCircle(217, 33, 8);
    for (const t of skyline(1989, WIDTH)) {
      const top = HEIGHT - SAFE - t.h;
      g.fillStyle(nes(0x0f)).fillRect(t.x, top, t.w, t.h);
      g.fillStyle(nes(0x2d)).fillRect(t.x, top, 1, t.h);
      t.lit.forEach(([wx, wy], i) => g.fillStyle(nes(i % 3 ? 0x38 : 0x27)).fillRect(t.x + wx, top + wy, 2, 3));
    }
    g.fillStyle(nes(0x0f)).fillRect(0, HEIGHT - SAFE, WIDTH, SAFE);
  }

  drawLogo() {
    const g = this.add.graphics();
    [['FINAL', SAFE + 26], ['NOTICE', SAFE + 56]].forEach(([word, y]) => {
      const x = centre(word, 3);
      drawBig(g, word, x + 2, y + 2, nes(0x06), 3);
      drawBig(g, word, x, y, nes(0x28), 3);
    });
    const w = measure('NOTICE') * 3;
    g.fillStyle(nes(0x2b)).fillRect(centre('NOTICE', 3), SAFE + 82, w, 1);
    g.fillStyle(nes(0x1b)).fillRect(centre('NOTICE', 3), SAFE + 83, w, 1);
  }

  update() {
    if (!this.ready) return;
    const pad = pollPad(this.game.loop.frame);
    const was = this.t.demo;
    this.t = titleStep(this.t, pad);
    if (this.t.event === 'start') {
      showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
      return;
    }
    if (this.t.event === 'attract') playSong('demo');
    if (this.t.event === 'back' && was) {
      this.frames = 0;
      playSong(SONGS.title);
    }
    this.demo.setVisible(this.t.demo);
    this.prompt.setVisible(blinkOn(this.frames++));
  }
}
