/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { rgb15, hex } from './color.mjs';
import { toRgba } from './fx.mjs';
import { bakeArea, composeArea, sweep } from './bgart.mjs';
import { drawText } from '../text/font.mjs';

// ?snes&art=<module>: a background module's areas panning; keys 1-9 pick an area, or &area=<n>;
// &x=<pixels> pins the camera for a screenshot, &frame=<n> pins an animated area's frame, &clean
// hides the label. An area with `frames` (scenes sharing a tileset) steps through them at `fps`.
export function bgArtScene(key, areas) {
  return class extends Phaser.Scene {
    constructor() {
      super(`snes-art-${key}`);
    }

    create() {
      const params = new URLSearchParams(location.search);
      this.pinned = params.has('x') ? Number(params.get('x')) : null;
      this.frame = params.has('frame') ? Number(params.get('frame')) : null;
      this.clean = params.has('clean');
      this.index = Math.min(areas.length - 1, Math.max(0, Number(params.get('area') ?? 1) - 1));
      this.baked = areas.map((a) => (a.frames ?? [a.scene]).map((scene) => bakeArea({ ...a, scene })));
      this.tex = this.textures.createCanvas(`snes-art-${key}`, WIDTH, HEIGHT);
      this.pixels = this.tex.context.createImageData(WIDTH, HEIGHT);
      this.add.image(0, 0, `snes-art-${key}`).setOrigin(0);
      this.label = this.add.graphics().setDepth(5);
      this.white = hex(rgb15(31, 31, 31));
      this.input.keyboard.on('keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= areas.length) this.index = n - 1;
      });
    }

    update(time) {
      const area = areas[this.index];
      const camX = this.pinned ?? sweep(area.span, time);
      const baked = this.baked[this.index];
      const f = (this.frame ?? Math.floor((time * (area.fps ?? 8)) / 1000)) % baked.length;
      toRgba(composeArea(area, baked[f], camX), this.pixels.data);
      this.tex.context.putImageData(this.pixels, 0, 0);
      this.tex.refresh();
      const g = this.label.clear();
      if (!this.clean) drawText(g, `${this.index + 1} ${area.name} X ${camX}`, 4, 214, this.white);
    }
  };
}
