/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { hex } from './color.mjs';
import { bakeScene, composeFrame } from './layers.mjs';
import { artOr, SpriteLayer } from './art.mjs';
import { hudLayout, drainStep, drawHud } from './hud.mjs';
import TEST_BG from './bg/test.mjs';

const LOOP_MS = 10000;
const FRAME_MS = 1000 / 60;

// A scripted 10 s of play: the Notice meter gains at 3.4 s, a hit
// lands at 3.5 s, the enchantments swap at 5 s, a boss is up from 6.5 s to 8 s, another hit at 9 s.
export function demoState(ms) {
  const t = ms % LOOP_MS;
  const hits = (t >= 3500) + (t >= 9000);
  return {
    name: 'ward',
    hp: 8 - 3 * hits,
    lives: 3,
    meter: t >= 3400 ? 2 : 1,
    carried: ['notice', 'redTape'],
    hand: t >= 5000 ? 1 : 0,
    boss: t >= 6500 && t < 9000 ? { name: 'Mr Vellum', hp: 12 - Math.floor((t - 6500) / 300), maxHp: 12 } : null,
    receipt: t >= 8000 ? { count: 12, ms: 8000 } : t >= 2000 ? { count: 11, ms: 2000 } : null,
  };
}

// ?snes&hud: the HUD over the test backdrop; &t=<ms> replays the demo to that moment for a screenshot.
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
    this.drain = null;
    this.fill = (x, y, w, h, c, step = 15) => this.g.fillStyle(hex(c), step / 15).fillRect(x, y, w, h);
  }

  frame(ms) {
    const state = demoState(ms);
    this.drain = drainStep(this.drain, state.hp);
    return hudLayout({ ...state, pale: this.drain.pale, now: ms % LOOP_MS });
  }

  hudAt(ms) {
    if (this.pinned == null) return this.frame(ms);
    this.drain = null;
    let out;
    for (let f = 0; f * FRAME_MS <= ms; f++) out = this.frame(f * FRAME_MS);
    return out;
  }

  update(time) {
    const ms = this.pinned ?? time;
    composeFrame(TEST_BG, this.baked, 0, 0, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();

    const layout = this.hudAt(ms);
    this.g.clear();
    drawHud(this.fill, layout);

    const { portrait } = layout;
    const entries = [...artOr(this, 'hud-portrait-ward', { w: 20, h: 20, palette: [0x0421, 0x2d6b, 0x7fff] }).frame('stand', 0, portrait.x + 2, portrait.y + 2)];
    for (const e of layout.enchant) {
      entries.push(...artOr(this, `hud-${e.icon}`, { w: 16, h: 16, palette: [0x0421, e.icon === 'notice' ? 0x0c1c : 0x3def, 0x7fff] })
        .frame('stand', 0, e.x + 2, e.y + 2));
    }
    this.sprites.draw(entries);
  }
}
