// The ?snes&layers test scene: a night skyline on BG2 at half speed seen through an office's
// glass wall on BG1, a floor under hdma perspective, and a fixed HUD bar on BG3.
import { rgb15 } from '../color.mjs';
import { floorTable } from '../layers.mjs';

const W = 64;
const H = 28;
const FLOOR = 20;

const fill = (v) => Array(8).fill(v.repeat(8));
const pad = (colours) => [...colours, ...Array(15 - colours.length).fill(colours[colours.length - 1])];

const palettes = [
  pad([rgb15(5, 4, 10), rgb15(29, 25, 12), rgb15(9, 8, 16), rgb15(12, 10, 20)]),
  pad([rgb15(8, 11, 13), rgb15(13, 17, 19), rgb15(4, 6, 8), rgb15(18, 22, 24)]),
  pad([rgb15(14, 8, 5), rgb15(8, 4, 3), rgb15(18, 11, 7)]),
  pad([rgb15(2, 3, 9), rgb15(8, 12, 22), rgb15(31, 31, 31)]),
];

const tiles = {
  block: { palette: 0, pixels: fill('1') },
  roof: { palette: 0, pixels: ['44444444', ...fill('1').slice(1)] },
  lit: { palette: 0, pixels: ['11111111', '12211221', '12211221', '11111111', '11111111', '13311331', '13311331', '11111111'] },
  dark: { palette: 0, pixels: ['11111111', '13311331', '13311331', '11111111', '11111111', '12211331', '12211331', '11111111'] },
  mullion: { palette: 1, pixels: fill('0').map(() => '00233200') },
  beam: { palette: 1, pixels: ['44444444', '22222222', '22222222', '22222222', '22222222', '22222222', '33333333', '00000000'] },
  wall: { palette: 1, pixels: fill('1') },
  sill: { palette: 1, pixels: ['44444444', '22222222', '33333333', '11111111', '11111111', '11111111', '11111111', '11111111'] },
  planks: { palette: 2, pixels: ['22111111', '22111111', '22111111', '22111111', '22111111', '22111111', '22111111', '33333333'] },
  planks2: { palette: 2, pixels: ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '33333333'] },
  hudEdge: { palette: 3, pixels: ['11111111', '22222222', ...fill('1').slice(2)] },
  hud: { palette: 3, pixels: fill('1') },
  hudLine: { palette: 3, pixels: ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '33333333', '22222222'] },
};

// Buildings of 3-6 tiles wide and 8-16 tall, lit windows on a fixed pattern.
function skyline() {
  const rows = Array.from({ length: H }, () => Array(W).fill('.'));
  let x = 0;
  let n = 0;
  while (x < W) {
    const w = 3 + ((n * 7) % 4);
    const top = 4 + ((n * 5) % 9);
    for (let bx = x; bx < Math.min(W, x + w); bx++) {
      rows[top][bx] = 'r';
      for (let y = top + 1; y < H; y++) rows[y][bx] = (bx === x || bx === x + w - 1) ? 'b' : ((bx * 3 + y * 5 + n) % 4 ? 'l' : 'd');
    }
    x += w + (n % 2);
    n++;
  }
  return rows.map((r) => r.join(''));
}

function office() {
  return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
    if (y >= FLOOR) return x % 4 ? 'q' : 'p';
    if (y === FLOOR - 3) return 's';
    if (y > FLOOR - 3) return 'w';
    if (y === 3) return 'm';
    if (x % 12 === 0) return 'i';
    return '.';
  }).join(''));
}

const hud = Array.from({ length: H }, (_, y) => (y === 0 ? 'e' : y === 1 ? 'h' : y === 2 ? 'u' : '.').repeat(32));

export default {
  backdrop: rgb15(2, 2, 6),
  palettes,
  tiles,
  layers: [
    { bg: 2, map: skyline(), legend: { b: 'block', r: 'roof', l: 'lit', d: 'dark' }, scroll: [0.5, 0] },
    {
      bg: 1,
      map: office(),
      legend: { p: 'planks', q: 'planks2', s: 'sill', w: 'wall', m: 'beam', i: 'mullion' },
      scroll: [1, 0],
      hdma: floorTable({ top: FLOOR * 8, horizon: FLOOR * 8 - 128 }),
    },
    { bg: 3, map: hud, legend: { e: 'hudEdge', h: 'hud', u: 'hudLine' }, scroll: [0, 0] },
  ],
};
