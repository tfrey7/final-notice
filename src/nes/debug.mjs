// The ?nesdebug overlay: sprites wanted on each scanline down the right edge (red past 8, where the
// flicker happens), the sprite and palette counts, and a strip of the last frames with lag frames red.
import { WIDTH, HEIGHT, SAFE } from './screen.mjs';
import { nes } from './palette.mjs';
import { MAX_PER_LINE, MAX_SPRITES, MAX_PALETTES } from './limits.mjs';
import { FRAME_CYCLES } from './slowdown.mjs';

const BAR = 3;
const STRIP = 96;

export const nesDebugOn = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('nesdebug');

export class NesDebug {
  constructor(scene, drawText) {
    this.g = scene.add.graphics().setDepth(40).setScrollFactor(0);
    this.drawText = drawText;
    this.lags = [];
  }

  draw(stats, sd) {
    const g = this.g.clear();
    if (!stats) return;
    const edge = WIDTH - MAX_PER_LINE * BAR;
    g.fillStyle(nes(0x0f), 0.6).fillRect(edge - 1, SAFE, MAX_PER_LINE * BAR + 1, HEIGHT - 2 * SAFE);
    stats.lines.forEach((n, y) => {
      if (!n) return;
      g.fillStyle(nes(n > MAX_PER_LINE ? 0x16 : 0x2a)).fillRect(WIDTH - Math.min(n, MAX_PER_LINE) * BAR, y, Math.min(n, MAX_PER_LINE) * BAR, 1);
    });
    g.fillStyle(nes(0x30)).fillRect(edge - 1, SAFE, 1, HEIGHT - 2 * SAFE);

    this.lags.push(Boolean(sd?.lag));
    if (this.lags.length > STRIP) this.lags.shift();
    const y = HEIGHT - SAFE - 4;
    g.fillStyle(nes(0x0f)).fillRect(8, y - 1, STRIP, 4);
    this.lags.forEach((lag, i) => g.fillStyle(nes(lag ? 0x16 : 0x1a)).fillRect(8 + i, y, 1, 2));

    const red = nes(0x16);
    const white = nes(0x30);
    const over = stats.lines.some((n) => n > MAX_PER_LINE);
    this.drawText(g, `SPR ${stats.count}/${MAX_SPRITES}${stats.dropped ? ` +${stats.dropped}` : ''}`, 8, y - 34, stats.dropped ? red : white);
    this.drawText(g, `FLK ${stats.flicker} PAL ${stats.palettes}/${MAX_PALETTES}${stats.offPalette ? ` -${stats.offPalette}` : ''}`, 8, y - 24, over || stats.offPalette ? red : white);
    if (sd) this.drawText(g, `CPU ${Math.round((sd.cost / FRAME_CYCLES) * 100)}/100 LAG ${sd.lagFrames}`, 8, y - 14, sd.lag ? red : white);
  }
}
