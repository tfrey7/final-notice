// The SNES cinema's pictures and timing, without Phaser: full-colour stand-in backdrops and portraits
// painted into a 15-bit screen buffer (BG1 and BG2), the mosaic between two pictures, Scene 2's Mode 7
// alarm spin and the fade out. The story's pages, typing and buttons are src/story/cinema.mjs.
import { WIDTH } from './screen.mjs';
import { rgb15, channels } from './color.mjs';
import { mosaicSize, MAX_MOSAIC, LEVELS } from './fx.mjs';
import { wrapText, drawString } from './text.mjs';
import { bufferFill } from './scenes/front.mjs';
import { STILLS } from './stills.mjs';

export const PICTURE = { x: 0, y: 0, w: WIDTH, h: 144 };
export const PORTRAIT = { x: 96, y: 40, w: 64, h: 96 };
export const CHANGE_FRAMES = 16;
export const SPIN_FRAMES = 60;
export const FADE_OUT_FRAMES = 24;
export const SPIN_CENTRE = [PICTURE.w >> 1, PICTURE.h >> 1];
export const ALARM_FLASH = rgb15(10, 0, 0);

// SNES A, B and Y all turn the page (the pad names them injunction, a and b); Start skips.
export const ADVANCE = ['a', 'b', 'injunction'];

export const snesWrap = (text) => wrapText(text);

export const pictureId = (page) => `${page.backdrop}|${page.portrait}|${page.still ?? ''}`;

// Between two pictures: the mosaic grows to 16 px on the old one, and shrinks back on the new.
export function changeStep(frame) {
  const f = Math.max(0, frame);
  return { mosaic: Math.min(MAX_MOSAIC, mosaicSize(f, CHANGE_FRAMES)), swap: f >= CHANGE_FRAMES / 2, done: f >= CHANGE_FRAMES };
}

// The alarm: one whole turn of the room in a second, dipping away from the camera and back, with the
// red light flashing by colour math every eight frames.
export function spinStep(frame) {
  const p = Math.min(1, Math.max(0, frame) / SPIN_FRAMES);
  return {
    angle: (1 - (1 - p) ** 2) * Math.PI * 2,
    scale: 1 - 0.3 * Math.sin(p * Math.PI),
    flash: p < 1 && Math.floor(frame / 8) % 2 === 0,
    done: p >= 1,
  };
}

export function fadeOutStep(frame) {
  const f = Math.max(0, frame);
  return { level: Math.max(0, LEVELS - 1 - Math.ceil((f * (LEVELS - 1)) / FADE_OUT_FRAMES)), done: f >= FADE_OUT_FRAMES };
}

export const spinTexture = (buf) => ({ w: PICTURE.w, h: PICTURE.h, px: buf.subarray(0, PICTURE.w * PICTURE.h) });

const mix = (a, b, t) => {
  const [x, y] = [channels(a), channels(b)];
  return rgb15(...x.map((v, i) => Math.round(v + (y[i] - v) * t)));
};

function gradient(fill, x, y, w, h, top, bottom) {
  for (let i = 0; i < h; i++) fill(x, y + i, w, 1, mix(top, bottom, h > 1 ? i / (h - 1) : 0));
}

const HORIZON = 104;

// Stand-in backdrops, each its own palette, until the cinema backdrops are drawn.
const LOOKS = {
  'bellwether-office': { wall: [rgb15(13, 9, 6), rgb15(6, 4, 3)], floor: [rgb15(9, 5, 3), rgb15(3, 2, 1)], window: true, desk: rgb15(14, 8, 4), lamp: rgb15(31, 26, 12) },
  'vellum-desk': { wall: [rgb15(11, 2, 4), rgb15(4, 1, 2)], floor: [rgb15(6, 1, 2), rgb15(2, 0, 1)], window: true, desk: rgb15(5, 4, 4), lamp: rgb15(31, 9, 6) },
  'archive-button': { wall: [rgb15(5, 8, 7), rgb15(2, 3, 3)], floor: [rgb15(4, 5, 5), rgb15(1, 2, 2)], shelves: true, button: true },
  'break-room': { wall: [rgb15(10, 16, 15), rgb15(5, 9, 9)], floor: [rgb15(12, 12, 10), rgb15(5, 5, 4)], lights: true, speaker: true },
  'ledger-page': { paper: true },
  grille: { wall: [rgb15(3, 5, 4), rgb15(1, 2, 2)], floor: [rgb15(2, 3, 3), rgb15(1, 1, 1)], grille: true },
};

export const BACKDROP_NAMES = Object.keys(LOOKS);

function paintWindow(fill) {
  const [x, y, w, h] = [16, 14, 84, 66];
  fill(x - 2, y - 2, w + 4, h + 4, rgb15(20, 18, 13));
  gradient(fill, x, y, w, h, rgb15(1, 2, 9), rgb15(7, 4, 12));
  [[0, 40, 12], [13, 26, 10], [24, 48, 14], [39, 20, 9], [49, 34, 16], [66, 44, 18]].forEach(([bx, top, bw]) => {
    fill(x + bx, y + top, bw, h - top, rgb15(2, 2, 5));
    for (let wy = y + top + 3; wy < y + h - 2; wy += 5) {
      for (let wx = x + bx + 2; wx < x + bx + bw - 2; wx += 4) if ((wx * 7 + wy * 3) % 5 < 2) fill(wx, wy, 2, 2, rgb15(29, 25, 12));
    }
  });
  fill(x + (w >> 1) - 1, y, 2, h, rgb15(20, 18, 13));
  fill(x, y + (h >> 1) - 1, w, 2, rgb15(20, 18, 13));
}

function paintPaper(fill) {
  gradient(fill, 0, 0, PICTURE.w, PICTURE.h, rgb15(29, 27, 21), rgb15(24, 22, 16));
  for (let y = 18; y < PICTURE.h; y += 12) fill(0, y, PICTURE.w, 1, rgb15(18, 22, 28));
  fill(36, 0, 1, PICTURE.h, rgb15(26, 10, 10));
  [[5, 150], [17, 120], [29, 172], [41, 96], [53, 140], [65, 160], [77, 110], [89, 150]].forEach(([y, w]) => {
    for (let x = 44; x < 44 + w; x += 7) fill(x, y + 7, 5 - ((x + y) % 3), 2, rgb15(4, 4, 8));
  });
  const stamp = rgb15(27, 4, 5);
  [[150, 98, 88, 26]].forEach(([x, y, w, h]) => {
    fill(x, y, w, 2, stamp); fill(x, y + h - 2, w, 2, stamp); fill(x, y, 2, h, stamp); fill(x + w - 2, y, 2, h, stamp);
  });
  drawString(fill, 'APPROVED', 166, 107, stamp, null);
}

export function paintBackdrop(fill, name) {
  const look = LOOKS[name] ?? LOOKS['bellwether-office'];
  if (look.paper) return paintPaper(fill);
  gradient(fill, 0, 0, PICTURE.w, HORIZON, ...look.wall);
  gradient(fill, 0, HORIZON, PICTURE.w, PICTURE.h - HORIZON, ...look.floor);
  fill(0, HORIZON - 3, PICTURE.w, 3, mix(look.wall[1], 0, 0.5));
  if (look.window) paintWindow(fill);
  if (look.shelves) {
    for (let y = 10; y < HORIZON - 8; y += 22) {
      fill(0, y + 16, PICTURE.w, 3, rgb15(9, 8, 6));
      for (let x = 2; x < PICTURE.w - 10; x += 13) fill(x, y + 3 + ((x >> 3) % 3), 11, 13 - ((x >> 3) % 3), [rgb15(20, 18, 12), rgb15(15, 13, 9), rgb15(22, 21, 17)][(x + y) % 3]);
    }
  }
  if (look.button) {
    fill(104, 74, 48, 46, rgb15(8, 8, 9));
    fill(106, 76, 44, 3, rgb15(16, 16, 17));
    for (let i = 0; i < 12; i++) fill(108 + i, 62 + i, 40 - 2 * i, 1, mix(rgb15(31, 8, 6), rgb15(18, 2, 2), i / 11));
    fill(112, 60, 8, 3, rgb15(31, 22, 20));
  }
  if (look.grille) {
    gradient(fill, 0, 0, PICTURE.w, PICTURE.h, ...look.wall);
    fill(112, 64, 32, 22, rgb15(24, 22, 15));
    for (let y = 67; y < 84; y += 4) fill(116, y, 18 + ((y * 5) % 7), 1, rgb15(10, 9, 7));
    for (let x = 0; x < PICTURE.w; x += 16) fill(x, 0, 3, PICTURE.h, rgb15(6, 7, 7));
    for (let y = 10; y < PICTURE.h; y += 24) fill(0, y, PICTURE.w, 3, rgb15(6, 7, 7));
  }
  if (look.lights) {
    [40, 150].forEach((x) => { fill(x, 4, 64, 5, rgb15(31, 31, 29)); fill(x - 2, 9, 68, 2, rgb15(18, 22, 21)); });
  }
  if (look.speaker) {
    fill(198, 22, 38, 30, rgb15(15, 15, 14));
    for (let y = 26; y < 48; y += 4) fill(202, y, 30, 2, rgb15(4, 4, 4));
    fill(230, 48, 3, 2, rgb15(31, 4, 4));
  }
  if (look.desk) {
    fill(8, 108, 240, 36, look.desk);
    fill(8, 108, 240, 2, mix(look.desk, rgb15(31, 31, 31), 0.35));
    fill(8, 110, 240, 1, mix(look.desk, 0, 0.5));
    fill(206, 84, 20, 8, look.lamp);
    fill(214, 92, 4, 16, rgb15(6, 6, 6));
    gradient(fill, 204, 100, 24, 8, mix(look.lamp, look.desk, 0.4), look.desk);
  }
}

// Stand-in portraits: a bust in each character's four colours (skin, hair, suit, tie).
const CAST = {
  bellwether: [rgb15(24, 18, 14), rgb15(24, 24, 25), rgb15(6, 8, 14), rgb15(21, 4, 4)],
  vellum: [rgb15(23, 23, 25), rgb15(2, 2, 3), rgb15(3, 3, 5), rgb15(23, 2, 4)],
  ward: [rgb15(20, 14, 10), rgb15(8, 5, 3), rgb15(10, 10, 9), rgb15(6, 10, 20)],
  mercer: [rgb15(26, 19, 15), rgb15(19, 8, 3), rgb15(14, 6, 6), rgb15(28, 24, 19)],
  tuesday: [rgb15(25, 22, 19), rgb15(13, 9, 5), rgb15(12, 13, 11), rgb15(9, 14, 10)],
};
const OUTLINE = rgb15(3, 2, 4);

function paintBust(fill, [skin, hair, suit, tie], ox, oy) {
  const ellipse = (cx, cy, rx, ry, c, test = () => true) => {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(rx * Math.sqrt(1 - (y / ry) ** 2));
      for (let x = -half; x <= half; x++) if (test(x, y)) fill(ox + cx + x, oy + cy + y, 1, 1, c);
    }
  };
  for (let y = 58; y < 96; y++) {
    const half = Math.min(32, 17 + (y - 58));
    fill(ox + 32 - half - 1, oy + y, 2 * half + 2, 1, OUTLINE);
    fill(ox + 32 - half, oy + y, 2 * half, 1, suit);
    fill(ox + 32 + (half >> 2), oy + y, half - (half >> 2), 1, mix(suit, 0, 0.35));
  }
  fill(ox + 26, oy + 44, 12, 16, OUTLINE);
  fill(ox + 27, oy + 44, 10, 15, mix(skin, 0, 0.2));
  for (let y = 58; y < 76; y++) fill(ox + 32 - (76 - y >> 1), oy + y, 76 - y, 1, rgb15(28, 28, 27));
  fill(ox + 30, oy + 60, 4, 36, tie);
  fill(ox + 31, oy + 60, 1, 36, mix(tie, rgb15(31, 31, 31), 0.3));
  ellipse(32, 30, 15, 19, OUTLINE);
  ellipse(32, 30, 14, 18, skin);
  ellipse(32, 30, 14, 18, mix(skin, 0, 0.25), (x) => x > 7);
  ellipse(32, 26, 15, 16, hair, (x, y) => y < -9 || (y < 0 && Math.abs(x) > 12));
  fill(ox + 24, oy + 30, 4, 2, OUTLINE);
  fill(ox + 36, oy + 30, 4, 2, OUTLINE);
  fill(ox + 29, oy + 41, 7, 1, mix(skin, 0, 0.45));
}

function paintSpeaker(fill, ox, oy) {
  fill(ox + 6, oy + 18, 52, 60, OUTLINE);
  fill(ox + 8, oy + 20, 48, 56, rgb15(16, 16, 15));
  for (let y = oy + 26; y < oy + 66; y += 5) fill(ox + 12, y, 40, 2, rgb15(4, 4, 4));
  fill(ox + 46, oy + 69, 4, 3, rgb15(31, 4, 4));
}

// A real portrait frame, when src/snes/art/portraits.mjs has one: value v is palette[v - 1], 0 clear.
function paintFrame(buf, frame, palette, ox, oy) {
  frame.pixels.forEach((row, y) => [...row].forEach((ch, x) => {
    const v = parseInt(ch, 16);
    const [px, py] = [ox + x, oy + y];
    if (v && px >= 0 && px < WIDTH && py >= 0 && py < PICTURE.h) buf[py * WIDTH + px] = palette[v - 1];
  }));
}

export function paintPortrait(buf, who, art = null) {
  const frame = art?.frames?.[who] ?? art?.frames?.[`portrait.${who}`];
  const fill = bufferFill(buf);
  if (frame) return paintFrame(buf, frame, art.palettes?.[who] ?? art.palette, PORTRAIT.x + ((PORTRAIT.w - frame.w) >> 1), PORTRAIT.y + PORTRAIT.h - frame.h);
  if (CAST[who]) return paintBust(fill, CAST[who], PORTRAIT.x, PORTRAIT.y);
  return paintSpeaker(fill, PORTRAIT.x, PORTRAIT.y);
}

// A digitized still: each 8x8 tile draws its pixels through the one BG palette it chose.
export function paintStill(buf, still) {
  const palettes = still.palettes.map((pal) => pal.map(([r, g, b]) => rgb15(r, g, b)));
  const tilesWide = still.w >> 3;
  for (let y = 0; y < Math.min(still.h, PICTURE.h); y++) {
    const row = still.pixels[y];
    for (let x = 0; x < Math.min(still.w, WIDTH); x++) {
      const pal = palettes[parseInt(still.tiles[(y >> 3) * tilesWide + (x >> 3)], 16)];
      buf[y * WIDTH + x] = pal[parseInt(row[x], 16)];
    }
  }
  return buf;
}

// One page's picture: a digitized still when the page has one, else the backdrop on BG2 (or
// `backdrop`, a buffer the backdrop art composed) and the portrait on BG1.
export function paintPicture(buf, page, { art = null, backdrop = null } = {}) {
  buf.fill(0);
  if (page.still && STILLS[page.still]) return paintStill(buf, STILLS[page.still]);
  if (backdrop) buf.set(backdrop.subarray(0, PICTURE.w * PICTURE.h));
  else paintBackdrop(bufferFill(buf), page.backdrop);
  if (page.portrait) paintPortrait(buf, page.portrait, art);
  return buf;
}
