/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15, hex } from './color.mjs';
import { bakeScene, composeFrame, layerScroll, lineFactors } from './layers.mjs';
import TEST_BG from './bg/test.mjs';
import { drawText } from '../text/font.mjs';

const SPAN = 512;
const SPEED = 60;

// ?snes&layers: the test scene pans back and forth; &x=<pixels> pins the camera for a screenshot.
export class SnesLayersScene extends Phaser.Scene {
  constructor() {
    super('snes-layers');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('x') ? Number(params.get('x')) : null;
    this.baked = bakeScene(TEST_BG);
    this.tex = this.textures.createCanvas('snes-layers', WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, 'snes-layers').setOrigin(0);
    this.label = this.add.graphics().setDepth(5);
    this.white = hex(rgb15(31, 31, 31));
  }

  update(time) {
    const t = ((time * SPEED) / 1000) % (2 * SPAN);
    const camX = Math.floor(this.pinned ?? (t < SPAN ? t : 2 * SPAN - t));
    composeFrame(TEST_BG, this.baked, camX, 0, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();

    const [bg2, bg1] = TEST_BG.layers;
    const floor = lineFactors(bg1)[HEIGHT - 1];
    drawText(this.label.clear(), `BG1 ${layerScroll(bg1, camX, 0)[0]} BG2 ${layerScroll(bg2, camX, 0)[0]} FLR ${layerScroll(bg1, camX, 0, floor)[0]}`, 6, 9, this.white);
  }
}
