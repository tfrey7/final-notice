/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15, hex } from './color.mjs';
import { bakeScene, composeFrame, layerScroll, lineFactors, TILE } from './layers.mjs';
import TEST_BG from './bg/test.mjs';
import { drawText } from '../text/font.mjs';

const SPEED = 60;

// ?snes&layers: the test scene pans back and forth; &x=<pixels> pins the camera for a screenshot.
// Built with a picker instead, it shows a background module's area without the readout:
// ?snes&art=claims&area=2 pans the Service Floor from end to end.
export class SnesLayersScene extends Phaser.Scene {
  constructor(key = 'snes-layers', pick = () => TEST_BG) {
    super(key);
    this.pick = pick;
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.bg = this.pick(params);
    this.readout = this.bg === TEST_BG;
    this.pinned = params.has('x') ? Number(params.get('x')) : null;
    const bg1 = this.bg.layers.find((l) => l.bg === 1);
    this.span = this.readout ? 512 : Math.max(1, bg1.map[0].length * TILE - WIDTH);
    this.baked = bakeScene(this.bg);
    this.tex = this.textures.createCanvas(this.sys.settings.key, WIDTH, HEIGHT);
    this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
    this.add.image(0, 0, this.sys.settings.key).setOrigin(0);
    this.label = this.add.graphics().setDepth(5);
    this.white = hex(rgb15(31, 31, 31));
  }

  update(time) {
    const t = ((time * SPEED) / 1000) % (2 * this.span);
    const camX = Math.floor(this.pinned ?? (t < this.span ? t : 2 * this.span - t));
    composeFrame(this.bg, this.baked, camX, 0, this.pixels.data);
    this.tex.context.putImageData(this.pixels, 0, 0);
    this.tex.refresh();
    if (!this.readout) return;

    const [bg2, bg1] = this.bg.layers;
    const floor = lineFactors(bg1)[HEIGHT - 1];
    drawText(this.label.clear(), `BG1 ${layerScroll(bg1, camX, 0)[0]} BG2 ${layerScroll(bg2, camX, 0)[0]} FLR ${layerScroll(bg1, camX, 0, floor)[0]}`, 6, 9, this.white);
  }
}
