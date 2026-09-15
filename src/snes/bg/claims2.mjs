// Stage 1, Claims & Adjustments, areas 3-5: Internal Review, Executive Waiting and Vellum's office.
// ?snes&art=claims2 (&area=2 Executive Waiting, &area=3 Vellum's office, &x=<pixels> pins the camera).
//
// Painted and cut exactly as claims.mjs, whose helpers it borrows. Its own set of 8 palettes, loaded
// with the area; the stone and carpet slots are claims.mjs's, so those floor tiles are the same data.
//     0 skyline      the title's near skyline palette: its tiles are reused as the view out of both windows
//     1 salmon stone claims.mjs's slot 1
//     2 review wall  plaster 1-3, walnut 4-6, brass 7-9, outline A, shadow B, ceiling C, tube D, steel E-F
//     3 meeting room wall 1-3, whiteboard 4, marker 5, table 6-8, chair 9-A, blind B, plant C-D, light E, carpet F
//     4 carpet       claims.mjs's slot 4
//     5 waiting      cream 1-3, wood 4-6, burgundy 7-9, brass A-B, outline C, shadow D, plant E-F
//     6 bookcase     walnut 1-3, red 4-5, green 6-7, blue 8-9, vellum A, gold B, outline C, back D
//     7 office       damask 1-3, mahogany 4-6, brass 7-8, lamp glow 9-B, shade C, paper D, outline E
// Colour math: glass is a half blend over BG2 on the window lines, as in Reception. In Internal Review
// BG2 is the meeting rooms behind the glass partitions, scrolling at half speed so the rooms slide
// behind their frames; in the other two it is the title skyline. The office lamp's glow is dithered
// onto the damask and the desk top, since one fixed colour cannot light a single spot.
import { rgb15 } from '../color.mjs';
import { floorTable } from '../layers.mjs';
import TITLE, { skyline, PAL } from './ui.mjs';
import {
  palettes as CLAIMS, pad, noise, canvas, cut, floorMath, stoneFloor, carpet, FLOOR,
} from './claims.mjs';

const COLS = 64;
const OFFICE_COLS = 48;
const SKY = 0;
const NIGHT = rgb15(2, 2, 7);

const palettes = [
  TITLE.palettes[PAL.near],
  CLAIMS[1],
  pad([rgb15(11, 11, 12), rgb15(15, 15, 15), rgb15(20, 19, 18), rgb15(6, 3, 2), rgb15(10, 6, 3), rgb15(15, 9, 5), rgb15(14, 10, 3), rgb15(22, 17, 6), rgb15(30, 26, 13), rgb15(3, 2, 2), rgb15(7, 6, 7), rgb15(7, 7, 8), rgb15(27, 30, 29), rgb15(12, 13, 15), rgb15(21, 23, 25)]),
  pad([rgb15(8, 10, 13), rgb15(12, 14, 17), rgb15(17, 19, 22), rgb15(27, 28, 28), rgb15(22, 6, 6), rgb15(7, 4, 3), rgb15(12, 8, 5), rgb15(18, 12, 8), rgb15(3, 3, 5), rgb15(8, 8, 11), rgb15(20, 21, 22), rgb15(3, 9, 5), rgb15(6, 15, 8), rgb15(24, 26, 25), rgb15(6, 7, 9)]),
  CLAIMS[4],
  pad([rgb15(18, 15, 11), rgb15(23, 20, 15), rgb15(27, 25, 19), rgb15(7, 4, 2), rgb15(12, 7, 4), rgb15(18, 11, 6), rgb15(8, 1, 3), rgb15(14, 3, 6), rgb15(21, 7, 10), rgb15(24, 18, 6), rgb15(31, 27, 14), rgb15(3, 2, 2), rgb15(12, 9, 6), rgb15(3, 10, 5), rgb15(7, 17, 8)]),
  pad([rgb15(4, 2, 1), rgb15(8, 5, 3), rgb15(13, 8, 4), rgb15(14, 3, 3), rgb15(20, 6, 5), rgb15(4, 10, 6), rgb15(7, 15, 9), rgb15(4, 5, 12), rgb15(7, 9, 17), rgb15(22, 20, 14), rgb15(25, 19, 6), rgb15(2, 1, 1), rgb15(3, 2, 1)]),
  pad([rgb15(3, 7, 5), rgb15(5, 10, 7), rgb15(8, 13, 9), rgb15(6, 2, 2), rgb15(11, 4, 3), rgb15(17, 8, 5), rgb15(14, 10, 3), rgb15(24, 19, 7), rgb15(13, 12, 6), rgb15(20, 17, 8), rgb15(29, 25, 13), rgb15(4, 14, 8), rgb15(26, 25, 20), rgb15(2, 2, 2)]),
];

// The title's near skyline, tile for tile, moved to this set's skyline slot. The map is rolled up
// six rows so the rooftops sit in a window sixty floors up rather than below its sill.
export const SKY_ROLL = 6;

function skylineView(tiles, scroll) {
  const legend = {};
  for (const [ch, name] of Object.entries(skyline.near.legend)) {
    legend[ch] = `sky-${name}`;
    tiles[legend[ch]] = { ...TITLE.tiles[name], palette: SKY };
  }
  const { map } = skyline.near;
  return { bg: 2, map: [...map.slice(SKY_ROLL), ...map.slice(0, SKY_ROLL)], legend, scroll };
}

// Three flat bands with a checker seam at each step: the painted, soft gradient of a lit wall.
function bands(c, top, bottom, [light, mid, dark]) {
  const third = (bottom - top) / 3;
  const a = top + Math.round(third);
  const b = top + Math.round(2 * third);
  c.rect(0, top, c.w, a - top, light);
  c.rect(0, a, c.w, b - a, mid);
  c.rect(0, b, c.w, bottom - b, dark);
  c.checker(0, a - 4, c.w, 4, mid);
  c.checker(0, b - 4, c.w, 4, dark);
}

// Raised wainscot panels, lit from the upper left.
function wainscot(c, [dark, mid, light], outline) {
  c.rect(0, 112, c.w, 36, mid);
  c.rect(0, 112, c.w, 4, light);
  c.rect(0, 115, c.w, 1, dark);
  for (let px = 0; px < c.w; px += 32) {
    c.rect(px + 4, 120, 24, 22, dark);
    c.rect(px + 5, 121, 22, 20, mid);
    c.rect(px + 5, 121, 22, 1, light);
    c.rect(px + 5, 121, 1, 20, light);
  }
  c.rect(0, 148, c.w, 4, outline);
  c.rect(0, 148, c.w, 1, dark);
}

// --- Internal Review -----------------------------------------------------------------------------

function reviewWall() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 2);
  c.rect(0, 0, c.w, 16, 12);
  for (let px = 0; px < c.w; px += 128) {
    c.rect(px + 18, 5, 92, 6, 14);
    c.rect(px + 20, 6, 88, 4, 13);
  }
  bands(c, 16, 112, [3, 2, 1]);
  c.rect(0, 16, c.w, 3, 8);
  c.rect(0, 16, c.w, 1, 9);
  c.rect(0, 18, c.w, 1, 7);
  c.checker(0, 19, c.w, 4, 11);
  wainscot(c, [4, 5, 6], 10);
  for (let ux = 0; ux < c.w; ux += 256) {
    glassRoom(c, ux + 16);
    doors(c, ux + 184);
  }
  return c;
}

function glassRoom(c, gx) {
  c.rect(gx - 3, 26, 150, 122, 14);
  c.rect(gx - 3, 26, 150, 1, 15);
  c.rect(gx - 3, 26, 1, 122, 15);
  c.rect(gx + 146, 27, 1, 121, 11);
  c.rect(gx, 29, 144, 109, 0);
  for (let s = 0; s < 144; s += 48) {
    if (s) { c.rect(gx + s - 2, 29, 4, 109, 14); c.rect(gx + s - 2, 29, 1, 109, 15); }
    for (let t = 0; t < 28; t++) {
      c.set(gx + s + 8 + t, 72 - t, 15);
      if (t % 2 === 0) c.set(gx + s + 14 + t, 72 - t, 15);
    }
  }
  c.checker(gx, 84, 144, 6, 15, (i) => i % 2 === 0);
  c.rect(gx, 138, 144, 8, 14);
  c.rect(gx, 138, 144, 1, 15);
}

function doors(c, dx) {
  c.rect(dx - 6, 30, 76, 118, 4);
  c.rect(dx - 5, 31, 74, 2, 6);
  c.rect(dx - 5, 31, 2, 117, 6);
  c.rect(dx, 38, 64, 110, 10);
  for (const [n, leaf] of [dx + 1, dx + 33].entries()) {
    c.rect(leaf, 39, 30, 109, 5);
    c.rect(leaf, 39, 30, 1, 6);
    c.rect(leaf, 39, 1, 109, 6);
    c.rect(leaf + 29, 39, 1, 109, 4);
    for (const [py, ph] of [[46, 38], [94, 36]]) {
      c.rect(leaf + 5, py, 20, ph, 6);
      c.rect(leaf + 5, py, 20, 1, 4);
      c.rect(leaf + 5, py, 1, ph, 4);
      c.rect(leaf + 6, py + 1, 18, ph - 2, 5);
    }
    const plate = n ? leaf + 3 : leaf + 23;
    c.rect(plate, 78, 4, 18, 8);
    c.rect(plate, 78, 1, 18, 9);
    c.rect(plate + 3, 78, 1, 18, 7);
    c.rect(leaf + 1, 136, 28, 11, 8);
    c.rect(leaf + 1, 136, 28, 1, 9);
    c.rect(leaf + 1, 146, 28, 1, 7);
  }
  c.rect(dx + 31, 39, 2, 109, 10);
  c.rect(dx + 14, 20, 36, 8, 7);
  c.rect(dx + 15, 21, 34, 6, 8);
  c.rect(dx + 15, 21, 34, 1, 9);
  for (let i = 0; i < 7; i++) c.rect(dx + 18 + i * 4, 24, 2, 1, 7);
}

function meetingRooms() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 3);
  c.rect(0, 0, c.w, 32, 1);
  c.rect(0, 32, c.w, 88, 2);
  c.checker(0, 32, c.w, 10, 3);
  c.checker(0, 100, c.w, 20, 1);
  c.rect(0, 120, c.w, 32, 15);
  c.checker(0, 120, c.w, 3, 9);
  for (let px = 0; px < c.w; px += 128) {
    c.rect(px + 24, 28, 48, 4, 14);
    c.rect(px + 9, 45, 50, 36, 10);
    c.rect(px + 10, 46, 48, 34, 4);
    for (let t = 0; t < 40; t++) c.set(px + 14 + t, 52 + Math.floor(t * 0.5) + (noise(t, 11) % 3), 5);
    c.rect(px + 14, 74, 12, 1, 9);
    c.rect(px + 14, 76, 20, 1, 9);
    c.rect(px + 10, 80, 48, 2, 10);
    c.rect(px + 72, 42, 46, 60, 10);
    c.rect(px + 73, 43, 44, 58, 1);
    for (let y = 43; y < 101; y += 3) c.rect(px + 73, y, 44, 2, 11);
    for (let y = -9; y <= 0; y++) for (let x = -7; x <= 7; x++) {
      if (x * x + 2 * y * y < 60 && noise(x + 8, y + 10) % 3) c.set(px + 64 + x, 106 + y, noise(x, y) % 2 ? 12 : 13);
    }
    c.rect(px + 60, 106, 8, 12, 7);
    c.rect(px + 60, 106, 2, 12, 8);
    for (let k = 0; k < 4; k++) {
      const cx = px + 10 + k * 30;
      c.rect(cx, 88, 18, 18, 9);
      c.rect(cx + 1, 89, 16, 2, 10);
      c.rect(cx + 1, 89, 1, 16, 10);
    }
    c.rect(px + 4, 104, 120, 6, 8);
    c.rect(px + 4, 104, 120, 1, 14);
    c.rect(px + 4, 110, 120, 3, 6);
    c.rect(px + 10, 113, 4, 26, 6);
    c.rect(px + 114, 113, 4, 26, 6);
    for (let k = 0; k < 4; k++) {
      const cx = px + 12 + k * 30;
      c.rect(cx, 118, 14, 16, 9);
      c.rect(cx, 118, 14, 2, 10);
      c.rect(cx + 6, 134, 2, 10, 9);
    }
  }
  return c;
}

function internalReview() {
  const tiles = {};
  const rooms = cut(meetingRooms(), 'ir', tiles);
  const wall = reviewWall();
  stoneFloor(wall);
  const play = cut(wall, 'iw', tiles);
  return {
    name: 'Internal Review',
    backdrop: rgb15(3, 4, 5),
    palettes,
    tiles,
    layers: [
      { bg: 2, ...rooms, scroll: [0.5, 0] },
      { bg: 1, ...play, scroll: [1, 0], hdma: floorTable({ top: FLOOR, horizon: FLOOR - 160 }) },
    ],
    math: [[29, 'none'], [109, 'half', rgb15(8, 13, 15), [2]], [14, 'none'], ...floorMath()],
  };
}

// --- Executive Waiting ---------------------------------------------------------------------------

function waitingWall() {
  const c = canvas(COLS);
  c.palette(0, 0, c.w, FLOOR, 5);
  c.rect(0, 0, c.w, 12, 4);
  c.rect(0, 10, c.w, 3, 6);
  c.rect(0, 13, c.w, 1, 12);
  bands(c, 14, 112, [3, 2, 1]);
  for (let x = 0; x < c.w; x += 16) for (let y = 14; y < 112; y++) c.set(x, y, Math.max(1, c.get(x, y) - 1));
  c.checker(0, 14, c.w, 4, 13);
  wainscot(c, [4, 5, 6], 12);
  for (let ux = 0; ux < c.w; ux += 256) {
    const wx = ux + 32;
    c.rect(wx - 6, 20, 204, 90, 4);
    c.rect(wx - 5, 21, 202, 1, 6);
    c.rect(wx - 5, 21, 1, 88, 6);
    c.rect(wx, 26, 192, 78, 0);
    for (let m = 48; m < 192; m += 48) { c.rect(wx + m - 2, 26, 4, 78, 5); c.rect(wx + m - 2, 26, 1, 78, 6); }
    c.rect(wx, 44, 192, 3, 5);
    c.rect(wx, 44, 192, 1, 6);
    c.rect(wx - 8, 104, 208, 5, 6);
    c.rect(wx - 8, 104, 208, 1, 11);
    c.rect(wx - 8, 108, 208, 1, 4);
    for (const side of [wx - 20, wx + 194]) {
      for (let i = 0; i < 18; i++) c.rect(side + i, 18, 1, 96 + (i % 4 === 1 ? 2 : 0), i % 4 === 0 ? 7 : i % 4 === 2 ? 9 : 8);
      c.rect(side + 2, 60, 14, 3, 10);
      c.rect(side + 2, 60, 14, 1, 11);
    }
    c.rect(wx - 22, 13, 236, 2, 10);
    c.rect(wx - 22, 13, 236, 1, 11);
    c.rect(wx - 20, 15, 232, 8, 8);
    c.rect(wx - 20, 15, 232, 1, 9);
    c.checker(wx - 20, 23, 232, 3, 10);
    for (let k = 0; k < 5; k++) chair(c, wx + 8 + k * 38);
    plant(c, ux + 240);
  }
  return c;
}

function chair(c, x) {
  c.rect(x, 114, 28, 20, 12);
  c.rect(x + 1, 115, 26, 18, 8);
  c.rect(x + 1, 115, 26, 3, 9);
  c.rect(x + 1, 115, 2, 18, 9);
  c.rect(x + 25, 115, 2, 18, 7);
  for (const [tx, ty] of [[7, 122], [14, 122], [21, 122], [10, 128], [17, 128]]) {
    c.set(x + tx, ty, 7);
    c.set(x + tx - 1, ty - 1, 9);
  }
  c.rect(x - 3, 126, 4, 12, 5);
  c.rect(x - 3, 126, 4, 1, 6);
  c.rect(x + 27, 126, 4, 12, 4);
  c.rect(x - 1, 134, 30, 6, 8);
  c.rect(x - 1, 134, 30, 2, 9);
  c.rect(x - 1, 139, 30, 1, 7);
  for (let i = 1; i < 29; i += 3) c.set(x - 1 + i, 138, 10);
  c.rect(x + 1, 140, 3, 12, 4);
  c.rect(x + 24, 140, 3, 12, 4);
  c.rect(x + 1, 140, 1, 12, 6);
  c.checker(x + 4, 148, 20, 4, 13);
}

function plant(c, px) {
  for (let dy = -30; dy <= 0; dy++) for (let dx = -12; dx <= 12; dx++) {
    const n = noise(dx + 20, dy + 40);
    if (dx * dx * 2 + dy * dy / 2 < 250 && n % 3) c.set(px + 8 + dx, 128 + dy, n % 5 < 2 ? 15 : 14);
  }
  c.rect(px, 128, 18, 20, 10);
  c.rect(px, 128, 18, 2, 11);
  c.rect(px, 128, 2, 20, 11);
  c.rect(px + 15, 130, 3, 18, 4);
  c.rect(px - 1, 127, 20, 1, 12);
}

function executiveWaiting() {
  const tiles = {};
  const view = skylineView(tiles, [0.25, 0]);
  const wall = waitingWall();
  carpet(wall);
  const play = cut(wall, 'ew', tiles);
  return {
    name: 'Executive Waiting',
    backdrop: NIGHT,
    palettes,
    tiles,
    layers: [
      view,
      { bg: 1, ...play, scroll: [1, 0], hdma: floorTable({ top: FLOOR, horizon: FLOOR - 160 }) },
    ],
    math: [[26, 'none'], [78, 'half', rgb15(6, 8, 14), [2]], [48, 'none'], ...floorMath()],
  };
}

// --- Vellum's office -----------------------------------------------------------------------------

function officeWall() {
  const c = canvas(OFFICE_COLS);
  c.palette(0, 0, c.w, FLOOR, 7);
  c.rect(0, 0, c.w, 14, 4);
  c.rect(0, 9, c.w, 3, 6);
  c.rect(0, 13, c.w, 1, 14);
  for (let y = 14; y < 112; y++) {
    for (let x = 0; x < c.w; x++) {
      const dx = Math.abs((x % 16) - 8);
      const dy = Math.abs(((y - 14) % 24) - 12);
      c.set(x, y, Math.abs(dx * 3 + dy * 2 - 18) < 2 ? 3 : dx + dy < 2 ? 1 : 2);
    }
  }
  c.checker(0, 14, c.w, 4, 1);
  c.checker(0, 100, c.w, 12, 1);
  wainscot(c, [4, 5, 6], 14);

  c.rect(146, 20, 92, 84, 4);
  c.rect(147, 21, 90, 1, 6);
  c.rect(147, 21, 1, 82, 6);
  c.rect(152, 26, 80, 72, 0);
  c.rect(190, 26, 4, 72, 5);
  c.rect(152, 58, 80, 3, 5);
  c.rect(152, 58, 80, 1, 6);
  for (let y = 26; y < 40; y += 3) c.rect(152, y, 80, 2, 13);

  c.rect(32, 34, 56, 58, 7);
  c.rect(33, 35, 54, 56, 8);
  c.rect(33, 35, 54, 1, 11);
  c.rect(37, 39, 46, 48, 14);
  c.rect(38, 40, 44, 46, 1);
  c.checker(38, 40, 44, 16, 2);
  for (let y = -8; y <= 8; y++) for (let x = -6; x <= 6; x++) {
    if (x * x * 1.4 + y * y < 60) c.set(60 + x, 56 + y, x + y < -4 ? 6 : 5);
  }
  c.rect(44, 70, 32, 16, 4);
  c.rect(44, 70, 32, 2, 5);
  c.rect(58, 70, 4, 10, 13);

  c.rect(132, 100, 136, 8, 6);
  c.rect(132, 100, 136, 1, 8);
  c.rect(132, 106, 136, 2, 4);
  c.rect(136, 108, 128, 40, 5);
  for (const px of [142, 226]) {
    c.rect(px, 114, 32, 28, 4);
    c.rect(px + 1, 115, 30, 26, 5);
    c.rect(px + 1, 140, 30, 1, 6);
    c.rect(px + 30, 115, 1, 26, 6);
    c.rect(px + 10, 126, 12, 2, 8);
    c.rect(px + 10, 127, 12, 1, 7);
  }
  c.rect(182, 112, 36, 30, 4);
  c.rect(183, 113, 34, 28, 5);
  c.rect(134, 146, 132, 6, 4);
  c.rect(148, 95, 20, 5, 13);
  c.rect(148, 99, 20, 1, 14);
  c.rect(176, 96, 4, 4, 14);
  c.rect(177, 96, 1, 1, 8);

  for (let y = 56; y < 112; y++) {
    for (let x = 192; x < 288; x++) {
      const v = c.get(x, y);
      const d = Math.hypot((x - 238) / 1.4, y - 88);
      const on = ((x + y) & 1) === 0;
      if (v >= 1 && v <= 3) {
        if (d < 9 && on) c.set(x, y, 11);
        else if (d < 20 && on) c.set(x, y, 10);
        else if (d < 34 && ((x + y) & 3) === 0) c.set(x, y, 9);
      }
    }
  }
  for (let x = 200; x < 268; x++) if (Math.abs(x - 238) < 30 && ((x + 100) & 1) === 0) c.set(x, 101, 11);
  c.rect(232, 97, 12, 3, 8);
  c.rect(232, 97, 12, 1, 11);
  c.rect(237, 88, 2, 9, 8);
  c.rect(228, 81, 20, 7, 12);
  c.checker(228, 81, 20, 2, 11);
  c.rect(228, 87, 20, 1, 14);
  c.rect(231, 88, 14, 1, 11);

  bookcase(c, 296);
  return c;
}

function bookcase(c, x) {
  c.palette(x, 16, 80, 136, 6);
  c.rect(x, 16, 80, 136, 1);
  c.rect(x + 2, 18, 76, 132, 2);
  c.rect(x + 2, 18, 2, 132, 3);
  c.rect(x, 16, 80, 2, 3);
  const SPINES = [[4, 5], [6, 7], [8, 9], [10, 10]];
  for (const s of [24, 52, 80, 108]) {
    c.rect(x + 6, s, 68, 24, 13);
    let bx = x + 6;
    for (let i = 0; bx < x + 72; i++) {
      const bw = 3 + (noise(i, s) % 3);
      const bh = 14 + (noise(i, s + 1) % 8);
      const [dark, light] = SPINES[noise(i, s + 2) % 4];
      if (bx + bw > x + 74) break;
      c.rect(bx, s + 24 - bh, bw, bh, dark);
      c.rect(bx, s + 24 - bh, 1, bh, light);
      c.rect(bx, s + 27 - bh, bw, 1, 11);
      c.rect(bx, s + 21, bw, 1, 11);
      c.rect(bx + bw - 1, s + 24 - bh, 1, bh, 12);
      bx += bw + (noise(i, s + 3) % 6 === 0 ? 3 : 0);
    }
    c.rect(x + 4, s + 24, 72, 4, 3);
    c.rect(x + 4, s + 27, 72, 1, 1);
  }
  c.rect(x + 4, 136, 72, 14, 2);
  for (const dx of [6, 42]) {
    c.rect(x + dx, 138, 32, 10, 1);
    c.rect(x + dx + 1, 139, 30, 8, 3);
    c.rect(x + dx + 2, 140, 28, 7, 2);
  }
}

function vellumsOffice() {
  const tiles = {};
  const view = skylineView(tiles, [0.25, 0]);
  const wall = officeWall();
  carpet(wall);
  const play = cut(wall, 'vo', tiles);
  return {
    name: "Vellum's office",
    backdrop: NIGHT,
    palettes,
    tiles,
    layers: [
      view,
      { bg: 1, ...play, scroll: [1, 0], hdma: floorTable({ top: FLOOR, horizon: FLOOR - 160 }) },
    ],
    math: [[26, 'none'], [72, 'half', rgb15(5, 7, 12), [2]], [54, 'none'], ...floorMath()],
  };
}

const areas = [internalReview(), executiveWaiting(), vellumsOffice()];

export default { ...areas[0], areas };
