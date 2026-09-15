/* global Phaser */
import { WIDTH, SAFE } from './screen.mjs';
import { MASTER, nes } from './palette.mjs';
import { TILE } from './limits.mjs';
import { registerArt, artOr, SpriteLayer } from './art.mjs';

const TEST_ART = {
  palettes: [[0x0f, 0x16, 0x30], [0x0f, 0x12, 0x21], [0x0f, 0x1a, 0x2a], [0x0f, 0x28, 0x38]],
  tiles: {
    ball: ['00111100', '01222210', '12233221', '12233321', '12222321', '12222221', '01222210', '00111100'],
    brick: ['11111111', '22232222', '22232222', '33333333', '11111111', '22222223', '22222223', '33333333'],
    check: ['11112222', '11112222', '11112222', '11112222', '22221111', '22221111', '22221111', '22221111'],
    dither: ['12121212', '21212121', '12121212', '21212121', '13131313', '31313131', '13131313', '31313131'],
    dot: ['00000000', '00000000', '00033000', '00322300', '00322300', '00033000', '00000000', '00000000'],
  },
  animations: {
    ball: { fps: 1, frames: [0, 1, 2, 3].map((palette) => ({ palette, parts: [{ tile: 'ball', x: 0, y: 0 }] })) },
  },
};

const BG_COLS = 32;
const BG_ROWS = 16;
const TILES = ['brick', 'check', 'dither', 'dot'];

// The 16x16 attribute areas cycle through the 4 bg palettes in diagonal stripes.
export function testBackground() {
  const areaCols = BG_COLS / 2;
  return {
    backdrop: 0x0f,
    palettes: [[0x07, 0x17, 0x27], [0x01, 0x11, 0x21], [0x09, 0x19, 0x29], [0x04, 0x14, 0x24]],
    cols: BG_COLS,
    rows: BG_ROWS,
    nametable: Array.from({ length: BG_COLS * BG_ROWS }, (_, i) => TILES[Math.floor((i % BG_COLS) / 8) % 4]),
    attributes: Array.from({ length: areaCols * (BG_ROWS / 2) }, (_, i) => (Math.floor(i / areaCols) + (i % areaCols)) % 4),
  };
}

export class NesTestScene extends Phaser.Scene {
  constructor() {
    super('nes');
  }

  create() {
    this.cameras.main.setBackgroundColor(nes(0x0f));
    const g = this.add.graphics();
    const cellW = WIDTH / 16;
    MASTER.forEach((_, i) => {
      g.fillStyle(nes(i)).fillRect((i % 16) * cellW, SAFE + Math.floor(i / 16) * 10, cellW, 10);
    });

    registerArt('nes-test', { ...TEST_ART, backgrounds: { stripes: testBackground() } });
    this.balls = artOr(this, 'nes-test');
    this.add.image(0, SAFE + 48, this.balls.background('stripes')).setOrigin(0);
    this.rowY = SAFE + 48 + BG_ROWS * TILE + 16;
    this.layer = new SpriteLayer(this);
  }

  update() {
    // The ball animation runs at 1 fps with one frame per sprite palette, so ms picks the palette.
    const sprites = Array.from({ length: 10 }, (_, i) => this.balls.frame('ball', (i % 4) * 1000, 16 + i * 23, this.rowY)[0]);
    this.layer.draw(sprites);
  }
}
