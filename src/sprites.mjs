// The sprite preview: Ward playing every animation at game scale on the lobby's burgundy
// carpet, one figure per animation, in the order the caption under the canvas names them.
/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { PALETTE as P } from './palette.mjs';

export const PREVIEW_ORDER = ['idle', 'walk', 'punch1', 'punch2', 'punch3', 'hit'];

// Where each figure's feet stand: three across, two rows, on the carpet.
export function previewSpots(count = PREVIEW_ORDER.length, width = WIDTH) {
  const perRow = 3;
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(((i % perRow) + 0.5) * (width / perRow)),
    y: 128 + Math.floor(i / perRow) * 84,
  }));
}

export class SpritesScene extends Phaser.Scene {
  constructor() {
    super('sprites');
  }

  preload() {
    this.load.json('ward-data', 'assets/sprites/ward.json');
    this.load.spritesheet('ward', 'assets/sprites/ward.png', { frameWidth: 40, frameHeight: 64 });
  }

  create() {
    const g = this.add.graphics();

    // The lobby's back wall: salmon stone under a seafoam fluorescent strip, then brass skirting.
    g.fillStyle(P.night1).fillRect(0, 0, WIDTH, 34);
    g.fillStyle(P.seafoam).fillRect(0, 6, WIDTH, 2);
    g.fillStyle(0xb86f5e).fillRect(0, 34, WIDTH, 22);
    g.fillStyle(P.brass).fillRect(0, 56, WIDTH, 1);
    g.fillStyle(P.brassDark).fillRect(0, 57, WIDTH, 1);

    // Burgundy carpet with a small Deco diamond repeat.
    g.fillStyle(P.burgundy).fillRect(0, 58, WIDTH, HEIGHT - 58);
    for (let y = 64; y < HEIGHT; y += 12) {
      for (let x = (y / 12) % 2 ? 6 : 0; x < WIDTH; x += 12) {
        g.fillStyle(0x4a1424).fillRect(x + 5, y, 2, 1).fillRect(x + 4, y + 1, 4, 1).fillRect(x + 5, y + 2, 2, 1);
      }
    }

    const data = this.cache.json.get('ward-data');
    const spots = previewSpots();
    PREVIEW_ORDER.forEach((name, i) => {
      const a = data.animations[name];
      this.anims.create({
        key: name,
        frames: a.frames.map((frame) => ({ key: 'ward', frame })),
        frameRate: a.fps,
        repeat: -1,
        repeatDelay: a.repeat === 0 ? 400 : 0,
      });
      const { x, y } = spots[i];
      g.fillStyle(0x2e0a16).fillEllipse(x, y + 1, 26, 5); // contact shadow
      this.add
        .sprite(x, y, 'ward')
        .setOrigin(data.origin.x / data.frameWidth, (data.origin.y + 1) / data.frameHeight)
        .play(name);
    });
  }
}
