/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { hex } from './color.mjs';
import { bakeScene, composeFrame } from './layers.mjs';
import { artOr, SpriteLayer } from './art.mjs';
import { hudLayout, hudBrightness, hudWatch, drawHud } from './hud.mjs';
import TEST_BG from './bg/test.mjs';

const LOOP_MS = 9000;
const ICONS = ['notice', 'carbonCopy', 'redTape', 'margin'];

// A scripted 9 s of play: hits, meter, an enchantment swap and a boss taking damage for 3 s, then
// nothing happens so the HUD fades, then a hit at 7.5 s brings it back.
export function demoState(ms) {
  const t = ms % LOOP_MS;
  const beat = Math.min(Math.floor(t / 600), 5) + (t >= 7500 ? 1 : 0);
  return {
    name: 'ward',
    hp: 8 - beat,
    lives: 3,
    meter: Math.min(4, beat),
    carried: [ICONS[beat % 4], ICONS[(beat + 2) % 4]],
    hand: beat % 2,
    boss: { name: 'Vellum', hp: 12 - 2 * beat, maxHp: 12 },
  };
}

// ?snes&hud: the HUD over the test backdrop; &t=<ms> pins the demo clock for a screenshot.
export class SnesHudScene extends Phaser.Scene {
  constructor() {
    super('snes-hud');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.baked = bakeScene(TEST_BG);
    this.tex = this.textures.createCanvas('snes-hud-back', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-hud-back').setOrigin(0);
    this.g = this.add.graphics().setDepth(20);
    this.sprites = new SpriteLayer(this, 21);
    this.watch = hudWatch();
    this.fill = (x, y, w, h, c) => this.g.fillStyle(hex(c)).fillRect(x, y, w, h);
  }

  update(time) {
    const ms = this.pinned ?? time;
    composeFrame(TEST_BG, this.baked, 0, 0, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();

    const state = demoState(ms);
    const idle = this.pinned == null ? this.watch.see(state, ms) : Math.max(0, (ms % LOOP_MS) - 3000);
    const alpha = hudBrightness(idle) / 15;
    const layout = hudLayout(state);
    this.g.clear();
    drawHud(this.fill, layout);
    this.g.setAlpha(alpha);

    const { portrait } = layout;
    const entries = [...artOr(this, 'hud-portrait-ward', { w: 20, h: 20, palette: [0x0421, 0x2d6b, 0x7fff] })
      .frame('stand', 0, portrait.x + 2, portrait.y + 2)];
    for (const e of layout.enchant) {
      entries.push(...artOr(this, `hud-${e.icon}`, { w: 16, h: 16, palette: [0x0421, e.icon === 'notice' ? 0x0c1c : 0x3def, 0x7fff] })
        .frame('stand', 0, e.x + 2, e.y + 2));
    }
    this.sprites.draw(entries);
    this.sprites.pool.forEach((img) => img.setAlpha(alpha));
  }
}
