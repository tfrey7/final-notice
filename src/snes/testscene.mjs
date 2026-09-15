/* global Phaser */
import { WIDTH } from './screen.mjs';
import { rgb15, hex } from './color.mjs';
import { BG_PALETTES, SPRITE_PALETTES, COLOURS, MAX_PER_LINE, MAX_TILES_PER_LINE } from './limits.mjs';
import { registerArt, artOr, SpriteLayer } from './art.mjs';
import TEST_ART from './art/test.mjs';
import { drawText } from '../text/font.mjs';

const SWATCH = 16;
const ROW_H = 5;
const SMALL_Y = 104;
const BIG_Y = 136;
const CLERK_Y = 168;

// Palette p of the set, colour c 1-15: one hue per palette, dark to light; sprite palettes are brighter.
export function swatch(p, c, sprite) {
  const hue = (p / 8) * Math.PI * 2;
  const light = (c / COLOURS) * (sprite ? 1 : 0.75);
  const chroma = sprite ? 0.55 : 0.35;
  const ch = (shift) => Math.max(0, Math.min(31, Math.round(31 * (light + chroma * light * Math.cos(hue + shift)))));
  return rgb15(ch(0), ch((2 * Math.PI) / 3), ch((4 * Math.PI) / 3));
}

export class SnesTestScene extends Phaser.Scene {
  constructor() {
    super('snes-hw');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    const g = this.add.graphics();
    const white = hex(rgb15(31, 31, 31));
    const grey = hex(rgb15(10, 10, 12));

    const groups = [[BG_PALETTES, false, 0], [SPRITE_PALETTES, true, 8 * ROW_H + 2]];
    for (const [count, sprite, top] of groups) {
      for (let p = 0; p < count; p++) {
        const y = top + p * ROW_H;
        for (let x = 0; x < SWATCH; x += 2) g.fillStyle((x / 2 + p) % 2 ? grey : 0x000000).fillRect(x, y, 2, ROW_H);
        for (let c = 1; c <= COLOURS; c++) g.fillStyle(hex(swatch(p, c, sprite))).fillRect(c * SWATCH, y, SWATCH, ROW_H);
      }
    }

    registerArt('snes-test', TEST_ART);
    this.art = artOr(this, 'snes-test');
    this.layer = new SpriteLayer(this);
    this.marks = this.add.graphics().setDepth(20);
    this.label = this.add.graphics().setDepth(20);
    this.white = white;
    this.red = hex(rgb15(31, 6, 4));
    this.green = hex(rgb15(8, 28, 10));
    this.smallCount = MAX_PER_LINE + 4;
    this.bigCount = Math.floor(MAX_TILES_PER_LINE / 4) + 1;
  }

  update() {
    const small = Array.from({ length: this.smallCount }, (_, i) => ({ ...this.art.frame('ball8', 0, Math.round((i * (WIDTH - 8)) / (this.smallCount - 1)), SMALL_Y)[0], size: 8 }));
    const big = Array.from({ length: this.bigCount }, (_, i) => this.art.frame('ball32', 0, i * 28, BIG_Y)[0]);
    const clerkA = this.art.frame('clerk', 0, 32, CLERK_Y + 55);
    const clerkB = this.art.frame('clerk', 0, 88, CLERK_Y + 55);
    const entries = [...small, ...big, ...clerkA, ...clerkB];
    this.layer.draw(entries);

    const m = this.marks.clear();
    const shown = this.layer.shown;
    small.forEach((e, i) => m.fillStyle(shown.has(i) ? this.green : this.red).fillRect(e.x + 2, SMALL_Y + 10, 4, 2));
    big.forEach((e, i) => m.fillStyle(shown.has(small.length + i) ? this.green : this.red).fillRect(e.x + 12, BIG_Y + 33, 8, 2));
    for (const e of clerkB) m.lineStyle(1, e.size === 32 ? this.white : this.green).strokeRect(e.x + 0.5, e.y + 0.5, e.size - 1, e.size - 1);

    const t = this.label.clear();
    const smallShown = small.filter((_, i) => shown.has(i)).length;
    const bigShown = big.filter((_, i) => shown.has(small.length + i)).length;
    drawText(t, `${smallShown} OF ${small.length} ON ONE LINE`, 8, SMALL_Y - 12, this.white);
    drawText(t, `${bigShown * 4} OF 34 TILES`, 8, BIG_Y - 10, this.white);
    const n16 = clerkB.filter((e) => e.size === 16).length;
    const n32 = clerkB.length - n16;
    drawText(t, `OAM ${this.layer.stats.count}`, 136, CLERK_Y + 8, this.white);
    drawText(t, `CLERK ${n32}X32`, 136, CLERK_Y + 24, this.white);
    drawText(t, `AND ${n16}X16`, 136, CLERK_Y + 36, this.green);
  }
}
