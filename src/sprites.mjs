// The sprite preview: every drawn character playing every animation at game scale on the
// lobby's burgundy carpet. Ward's six stand along the back row and the Security Associate's
// six along the front, in the order the caption under the canvas names them.
/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { PALETTE as P } from './palette.mjs';

export const PREVIEW_ORDER = ['idle', 'walk', 'punch1', 'punch2', 'punch3', 'hit'];
export const ASSOCIATE_ORDER = ['walk', 'windup', 'punch', 'reel', 'knockdown', 'down'];

// Where each figure's feet stand. Ward's row is spaced evenly; the Associate's last two
// spots are wider apart because he lands flat on his back, his head towards the left.
export function previewSpots(width = WIDTH) {
  const ward = PREVIEW_ORDER.map((anim, i) => ({
    sheet: 'ward',
    anim,
    x: Math.round((i + 0.5) * (width / PREVIEW_ORDER.length)),
    y: 128,
  }));
  const associateX = [25, 72, 118, 158, 214, 276];
  const associate = ASSOCIATE_ORDER.map((anim, i) => ({ sheet: 'associate', anim, x: associateX[i], y: 212 }));
  return [...ward, ...associate];
}

export class SpritesScene extends Phaser.Scene {
  constructor() {
    super('sprites');
  }

  preload() {
    this.load.json('ward-data', 'assets/sprites/ward.json');
    this.load.spritesheet('ward', 'assets/sprites/ward.png', { frameWidth: 40, frameHeight: 64 });
    this.load.json('associate-data', 'assets/sprites/associate.json');
    this.load.spritesheet('associate', 'assets/sprites/associate.png', { frameWidth: 80, frameHeight: 64 });
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

    previewSpots().forEach(({ sheet, anim, x, y }) => {
      const data = this.cache.json.get(`${sheet}-data`);
      const a = data.animations[anim];
      const key = `${sheet}-${anim}`;
      this.anims.create({
        key,
        frames: a.frames.map((frame) => ({ key: sheet, frame })),
        frameRate: a.fps,
        repeat: -1,
        repeatDelay: a.repeat === 0 ? 400 : 0,
      });
      g.fillStyle(0x2e0a16).fillEllipse(x, y + 1, 26, 5); // contact shadow
      this.add
        .sprite(x, y, sheet)
        .setOrigin(data.origin.x / data.frameWidth, (data.origin.y + 1) / data.frameHeight)
        .play(key);
    });
  }
}
