/* global Phaser */
import { WIDTH, SAFE } from './screen.mjs';
import { nes } from './palette.mjs';
import { loadArt, artOr, SpriteLayer } from './art.mjs';

// ?art=<name>: every background and animation of src/art/<name>.mjs, playing.
export class ArtScene extends Phaser.Scene {
  constructor() {
    super('art');
  }

  async create() {
    const name = new URLSearchParams(location.search).get('art');
    this.cameras.main.setBackgroundColor(nes(0x0f));
    const label = (x, y, text) => this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '8px', color: '#fcfcfc' }).setResolution(1);
    let def;
    try {
      def = await loadArt(name);
    } catch (err) {
      label(8, SAFE, `no art module "${name}"`);
      return;
    }
    const handle = artOr(this, name);
    let y = SAFE;
    label(8, y, name);
    y += 12;
    let x = 8;
    for (const bg of Object.keys(def.backgrounds ?? {})) {
      const img = this.add.image(x, y, handle.background(bg)).setOrigin(0);
      x += img.width + 8;
    }
    if (x > 8) y += Math.max(...Object.values(def.backgrounds).map((b) => b.rows * 8)) + 8;

    this.slots = [];
    x = 8;
    for (const anim of handle.animations) {
      const w = Math.max(...def.animations[anim].frames.flatMap((f) => f.parts.map((p) => p.x + 8)));
      const h = Math.max(...def.animations[anim].frames.flatMap((f) => f.parts.map((p) => p.y + 8)));
      if (x + Math.max(w, 40) > WIDTH) { x = 8; y += this.rowH + 12; this.rowH = 0; }
      label(x, y, anim);
      this.slots.push({ anim, x, y: y + 10 });
      this.rowH = Math.max(this.rowH ?? 0, h + 10);
      x += Math.max(w, 40) + 8;
    }
    this.handle = handle;
    this.layer = new SpriteLayer(this);
  }

  update(time) {
    if (!this.layer) return;
    this.layer.draw(this.slots.flatMap((s) => this.handle.frame(s.anim, time, s.x, s.y)));
  }
}
