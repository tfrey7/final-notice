// Stage 2, Records Retention, areas 1-3 (docs/NES-PLAN.md section 7) as Mode 1 scenes. Each area
// puts its scenery on BG1 and BG2 of the main screen and one BG3 layer on the sub screen for colour
// math: reading-lamp glows added, or the red wax front blended in by add-half. BG2 carries two
// depths by hdma (a far gallery at quarter speed over the stacks at half speed), so every area has
// three planes of shelving against the play layer. src/snes/bgart.mjs composes them.
import { rgb15 as c } from '../color.mjs';
import { floorTable } from '../layers.mjs';
import { descentAt } from '../descent.mjs';

const H = 28;
const FLOOR = 22;
const pad = (colours) => [...colours, ...Array(15 - colours.length).fill(colours[colours.length - 1])];

const palettes = [
  // 0 far stacks (1-7) and filing cabinets (8-D)
  pad([c(2, 2, 5), c(4, 4, 8), c(6, 5, 10), c(9, 8, 13), c(6, 3, 8), c(3, 6, 8), c(8, 5, 5),
    c(5, 6, 6), c(8, 9, 8), c(12, 13, 11), c(19, 17, 12), c(17, 13, 5), c(2, 3, 3)]),
  // 1 wood and book spines
  pad([c(3, 2, 2), c(6, 4, 3), c(9, 6, 4), c(13, 9, 5), c(13, 4, 4), c(5, 10, 6), c(16, 12, 5), c(10, 10, 13), c(21, 18, 12), c(2, 1, 1)]),
  // 2 stone
  pad([c(3, 3, 5), c(5, 5, 7), c(7, 7, 9), c(10, 9, 11), c(2, 2, 3)]),
  // 3 brass and green lamp shades
  pad([c(3, 2, 1), c(9, 6, 2), c(16, 12, 4), c(25, 21, 9), c(3, 8, 5), c(5, 13, 8), c(9, 19, 12), c(31, 29, 20), c(6, 6, 7)]),
  // 4 lamp glow, added on the sub screen (BG3: 1-3)
  pad([c(3, 2, 1), c(7, 5, 1), c(12, 9, 3)]),
  // 5 fire-door steel, warning red and yellow
  pad([c(3, 3, 4), c(6, 6, 8), c(10, 10, 12), c(15, 15, 17), c(22, 4, 3), c(28, 22, 4), c(2, 2, 2), c(12, 2, 2), c(22, 22, 24)]),
  // 6 red wax, add-half on the sub screen (BG3: 1-3)
  pad([c(17, 2, 2), c(24, 5, 3), c(31, 14, 5)]),
  // 7 the original ledger
  pad([c(4, 2, 2), c(21, 18, 13), c(28, 26, 19), c(31, 30, 25), c(19, 3, 4), c(9, 6, 4), c(15, 10, 6), c(10, 9, 11)]),
];

const tiles = {};
const def = (name, palette, pixels) => { tiles[name] = { palette, pixels }; return name; };
const fill = (v) => Array(8).fill(v.repeat(8));
const draw = (fn) => Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => fn(x, y)).join(''));
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));

// A shelf of books: one spine colour a column, `short` how many rows each book sits below the top,
// then the plank and its underside; a side post on the left or right tile of a case.
function shelf(name, palette, spines, short, { side = '', gap = 'A', plank = '4', under = '2', post = '1', face = '3' } = {}) {
  return def(name, palette, draw((x, y) => {
    if (side === 'l' && x < 2) return x ? face : post;
    if (side === 'r' && x > 5) return x === 7 ? post : face;
    if (y === 6) return plank;
    if (y === 7) return under;
    return y < Number(short[x]) ? gap : spines[x];
  }));
}

// A w x h picture drawn by fn(x, y) cut into 8x8 tiles, named row by row: grid of tile names.
function picture(name, palette, w, h, fn) {
  return Array.from({ length: h / 8 }, (_, ty) => Array.from({ length: w / 8 }, (_, tx) => {
    const rows = draw((x, y) => fn(tx * 8 + x, ty * 8 + y));
    return rows.every((r) => r === '00000000') ? null : def(`${name}${ty}_${tx}`, palette, rows);
  }));
}

// --- shared tiles --------------------------------------------------------------------------

const FAR = [['23232323', '01020010'], ['32322323', '10200102'], ['22333232', '00120001']];
const MID = [['56725672', '00102001'], ['67256527', '01000210'], ['72566725', '20010100']];
const NEAR = [['56787856', '00102001'], ['78563675', '10020010'], ['65873568', '02001200'], ['87556783', '00210001']];
FAR.forEach(([s, h], i) => ['l', '', 'r'].forEach((side) => shelf(`far${i}${side}`, 0, s, h, { side, gap: '1', plank: '3', under: '1', post: '1', face: '2' })));
MID.forEach(([s, h], i) => ['l', '', 'r'].forEach((side) => shelf(`mid${i}${side}`, 0, s, h, { side, gap: '1', plank: '4', under: '1', post: '1', face: '3' })));
NEAR.forEach(([s, h], i) => ['l', '', 'r'].forEach((side) => shelf(`near${i}${side}`, 1, s, h, { side })));

def('rail', 0, ['44444444', '33333333', '11111111', '03000300', '03000300', '03000300', '33333333', '11111111']);
def('beam', 1, ['11111111', '44444444', '33333333', '33333333', '22222222', '22222222', '11111111', 'AAAAAAAA']);
const cap = ['11111111', '44444444', '44444444', '33333333', '33333333', '22222222', '11111111', 'AAAAAAAA'];
const base = ['AAAAAAAA', '11111111', '44444444', '33333333', '33333333', '22222222', '22222222', '11111111'];
const leftEdge = (rows, keepLast) => rows.map((r, i) => (i === 0 || (i === 6 && !keepLast) || (i === 7 && keepLast) ? r : `1${r.slice(1)}`));
def('cap', 1, cap);
def('capl', 1, leftEdge(cap).map((r, i) => (i === 7 ? '13AAAAAA' : r)));
def('capr', 1, mirror(tiles.capl.pixels));
def('base', 1, base);
def('basel', 1, leftEdge(base, true).map((r, i) => (i === 0 ? '13AAAAAA' : r)));
def('baser', 1, mirror(tiles.basel.pixels));

def('skirt', 2, ['11111111', '44444444', '33333333', '22222222', '22222222', '22222222', '11111111', '55555555']);
const flag = ['22222222', '23222222', '22222222', '22222232', '22222222', '22322222', '22222222', '11111111'];
def('flag', 2, flag);
def('seam', 2, flag.map((r) => `53${r.slice(2)}`));

def('chain', 3, ['00099000', '00900900', '00099000', '00099000', '00900900', '00099000', '00099000', '00900900']);
def('shade', 3, ['00022000', '00233200', '55666655', '66677666', '66777766', '66666666', '55555555', '11111111']);
def('shadel', 3, ['00000000', '00000000', '00000055', '00005566', '00556666', '05666666', '55555555', '01111111']);
def('shader', 3, mirror(tiles.shadel.pixels));
def('bulb', 3, ['01888810', '00888800', '00088000', ...fill('0').slice(3)]);

def('desk', 1, ['44444444', '33333333', '22222222', '11111111', '00000000', '00000000', '00000000', '00000000']);
def('deskl', 1, ['44444444', '33333333', '22222222', '11111111', '12000000', '12000000', '12000000', '12000000']);
def('deskr', 1, mirror(tiles.deskl.pixels));
def('legl', 1, fill('0').map(() => '12000000'));
def('legr', 1, fill('0').map(() => '00000021'));
def('papers', 1, ['00000000', '00000000', '00000000', '00000000', '00999900', '09999990', '00999990', '99999999']);

// Glow and wax, BG3 values 1-3, with 2x2 checkers between steps.
const checker = (a, b) => draw((x, y) => (((x >> 1) + (y >> 1)) % 2 ? a : b));
for (const [pal, pre] of [[4, 'g'], [6, 'w']]) {
  def(`${pre}1`, pal, fill('1'));
  def(`${pre}2`, pal, fill('2'));
  def(`${pre}3`, pal, fill('3'));
  def(`${pre}01`, pal, checker('0', '1'));
  def(`${pre}12`, pal, checker('1', '2'));
  def(`${pre}23`, pal, checker('2', '3'));
}

// --- grids -----------------------------------------------------------------------------------

const grid = (w) => Array.from({ length: H }, () => Array(w).fill(null));
const put = (g, x, y, name) => { if (y >= 0 && y < H) g[y][((x % g[0].length) + g[0].length) % g[0].length] = name; };
const stamp = (g, x, y, pic) => pic.forEach((row, dy) => row.forEach((n, dx) => n && put(g, x + dx, y + dy, n)));

// Tile-name grid to a layers.mjs map and legend, one character a tile name.
const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*+-/:;<=>?@^_~|';
function layer(bg, g, scroll, extra = {}) {
  const legend = {};
  const chars = new Map();
  const map = g.map((row) => row.map((n) => {
    if (!n) return '.';
    if (!chars.has(n)) {
      const ch = CHARS[chars.size];
      chars.set(n, ch);
      legend[ch] = n;
    }
    return chars.get(n);
  }).join(''));
  return { bg, map, legend, scroll, ...extra };
}

const unit = (g, x, y, rows, w, kind, variants, seed) => {
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < w; i++) put(g, x + i, y + r, `${kind}${(seed + r * 2 + i) % variants}${i === 0 ? 'l' : i === w - 1 ? 'r' : ''}`);
  }
};

// BG2: a far gallery of stacks above a railing, the nearer stacks with aisles between; the hdma
// table moves the gallery at a quarter of the camera and the stacks at half.
function stacks(w) {
  const g = grid(w);
  for (let x = 0; x < w; x += 4) unit(g, x, 0, 11, 4, 'far', FAR.length, x);
  for (let x = 0; x < w; x++) put(g, x, 11, 'rail');
  for (let x = 0; x < w; x += 8) unit(g, x, 12, FLOOR - 12, 6, 'mid', MID.length, x / 8);
  return layer(2, g, [0.5, 0], { hdma: [[96, 0.25], [127, 0.5], [1, 0.5]] });
}

function room(w) {
  const g = grid(w);
  for (let x = 0; x < w; x++) {
    put(g, x, 0, 'beam');
    put(g, x, FLOOR, 'skirt');
    for (let y = FLOOR + 1; y < H; y++) put(g, x, y, (x + (y % 2) * 2) % 4 ? 'flag' : 'seam');
  }
  return g;
}

function bookcase(g, x, top = 2, w = 6, seed = 0) {
  for (let i = 0; i < w; i++) {
    const side = i === 0 ? 'l' : i === w - 1 ? 'r' : '';
    put(g, x + i, top, `cap${side}`);
    put(g, x + i, FLOOR - 1, `base${side}`);
  }
  unit(g, x, top + 1, FLOOR - 2 - top, w, 'near', NEAR.length, seed);
}

function lamp(g, x, drop = 5) {
  for (let y = 1; y < drop; y++) put(g, x, y, 'chain');
  put(g, x - 1, drop, 'shadel');
  put(g, x, drop, 'shade');
  put(g, x + 1, drop, 'shader');
  put(g, x, drop + 1, 'bulb');
}

// A cone of light on BG3 from tile (cx, top) down to `bottom`, fading out to the sides and down.
function cone(g, cx, top, bottom, rate, pre = 'g') {
  const steps = [[0.75, '3'], [0.58, '23'], [0.42, '2'], [0.28, '12'], [0.15, '1'], [0.05, '01']];
  for (let y = top; y <= bottom; y++) {
    const d = y - top;
    const half = 0.9 + d / rate;
    const fade = 1 - (d / (bottom - top + 1)) * 0.55;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const v = (1 - Math.abs(x + 0.5 - cx) / half) * fade;
      const step = steps.find(([t]) => v >= t);
      if (step) put(g, x, y, `${pre}${step[1]}`);
    }
  }
}

const floorHdma = floorTable({ top: FLOOR * 8, horizon: FLOOR * 8 - 128 });

// --- area 1: Archive Access ------------------------------------------------------------------

function access() {
  const W = 64;
  const g = room(W);
  bookcase(g, 20, 2, 6, 1);
  bookcase(g, 52, 3, 6, 3);
  for (const x of [10, 42]) lamp(g, x);
  for (let x = 7; x <= 13; x++) put(g, x, 17, x === 7 ? 'deskl' : x === 13 ? 'deskr' : 'desk');
  for (let y = 18; y < FLOOR; y++) { put(g, 7, y, 'legl'); put(g, 13, y, 'legr'); }
  for (const x of [9, 11]) put(g, x, 16, 'papers');
  const glow = grid(W);
  for (const x of [10, 42]) cone(glow, x + 0.5, 7, FLOOR - 1, 1.7);
  return {
    backdrop: c(1, 1, 3), palettes, tiles,
    layers: [stacks(48), layer(1, g, [1, 0], { hdma: floorHdma }), layer(3, glow, [1, 0])],
  };
}

// --- area 2: Retention Order -----------------------------------------------------------------

def('post', 5, ['12344321', '12344321', '12394321', '12344321', '12344321', '12344321', '12394321', '12344321']);
def('lintel', 5, ['11111111', '44444444', '49444944', '33333333', '33333333', '22222222', '11111111', '77777777']);
def('slat', 5, ['44444444', '33333333', '33333333', '11111111', '44444444', '33333333', '22222222', '11111111']);
def('hazard', 5, draw((x, y) => (y === 0 || y === 7 ? '1' : (x + y) % 8 < 4 ? '6' : '7')));
def('alarml', 5, ['00001111', '00015555', '00158855', '00155555', '00015555', '00001111', '00000011', '00000011']);
def('alarmr', 5, mirror(tiles.alarml.pixels));
def('leanp', 1, draw((x, y) => (x + y === 7 ? '4' : x + y === 8 ? '2' : x + y === 9 ? '1' : '5273'[Math.floor((x - y + 16) / 2) % 4])));
def('leanb', 1, draw((x, y) => '5273'[Math.floor((x - y + 16) / 2) % 4]));
def('shard', 1, ['00000000', '00000044', '00004433', '00443322', '44332211', '33221100', '22110000', '11000000']);
def('book', 1, ['00000000', '00055000', '00555500', '05575550', '00557500', '00057000', '00000000', '00000000']);
def('debris', 1, ['00000000', '00000000', '00000000', '00000000', '00009990', '09990999', '44999944', '11111111']);

function fireDoor(g, x, shut) {
  put(g, x + 3, 3, 'alarml');
  put(g, x + 4, 3, 'alarmr');
  for (let i = 0; i < 8; i++) put(g, x + i, 4, 'lintel');
  for (let y = 5; y < FLOOR; y++) { put(g, x, y, 'post'); put(g, x + 7, y, 'post'); }
  for (let i = 1; i < 7; i++) {
    for (let y = 5; y < shut; y++) put(g, x + i, y, 'slat');
    put(g, x + i, shut, 'hazard');
  }
}

function retention() {
  const W = 64;
  const g = room(W);
  fireDoor(g, 12, 12);
  fireDoor(g, 44, 17);
  // A case toppling to the right, its shelves leaning at 45 degrees, books falling ahead of it.
  for (let y = 13; y < FLOOR; y++) {
    for (let i = 0; i < 3; i++) {
      const x = 26 + (FLOOR - 1 - y) + i;
      put(g, x, y, (x + y) % 3 === 0 ? 'leanp' : 'leanb');
    }
  }
  put(g, 38, 8, 'shard');
  put(g, 39, 7, 'shard');
  put(g, 37, 6, 'book');
  put(g, 40, 10, 'book');
  for (const x of [29, 31, 32, 36, 38]) put(g, x, FLOOR - 1, 'debris');
  bookcase(g, 56, 2, 6, 2);
  // The wax front, fixed to the left of the screen, a bright ragged edge where it advances.
  const wax = grid(64);
  for (let y = 0; y < H; y++) {
    const edge = 7 + ((y * 5) % 3) - (y % 4 === 0 ? 1 : 0);
    for (let x = 0; x < edge - 2; x++) put(wax, x, y, 'w1');
    put(wax, edge - 2, y, 'w12');
    put(wax, edge - 1, y, 'w2');
    put(wax, edge, y, 'w23');
  }
  return {
    backdrop: c(2, 1, 2), palettes, tiles,
    layers: [stacks(48), layer(1, g, [1, 0], { hdma: floorHdma }), layer(3, wax, [0, 0])],
  };
}

// --- area 3: the Original Copy ---------------------------------------------------------------

def('cabtop', 0, ['DDDDDDDD', 'AAAAAAAA', '99999999', '88888888', '88888888', 'DDDDDDDD', '88888888', 'DDDDDDDD']);
for (let ty = 0; ty < 2; ty++) {
  for (let tx = 0; tx < 3; tx++) {
    def(`drawer${ty}${tx}`, 0, draw((x, y) => {
      const gx = tx * 8 + x;
      const gy = ty * 8 + y;
      if (gx === 23 || gy === 15) return 'D';
      if (gx === 0 || gy === 0) return 'A';
      if (gx === 1 || gy === 1) return '9';
      if (gx >= 8 && gx <= 15 && gy >= 3 && gy <= 6) return gy === 5 && gx > 8 && gx < 15 ? '9' : 'B';
      if (gx >= 9 && gx <= 14 && (gy === 10 || gy === 11)) return 'C';
      if (gx >= 9 && gx <= 14 && gy === 12) return 'D';
      return '8';
    }));
  }
}
def('pill', 2, fill('0').map(() => '14333333'));
def('pilm', 2, ['22222222', '22222222', '22222222', '22222222', '22222222', '22222222', '22222222', '11111111']);
def('pilr', 2, fill('0').map(() => '22222215'));
def('capital', 2, ['11111111', '44444444', '33333333', '22222222', '11111111', '34444443', '22222222', '11111111']);

const LEDGER = picture('ledger', 7, 48, 16, (x, y) => {
  const dist = x < 24 ? 23 - x : x - 24;
  const top = 4 - Math.round(dist / 11);
  if (y >= 12) return y === 15 ? '1' : y === 12 ? '6' : x === 0 || x === 47 ? '1' : '7';
  if (x >= 23 && x <= 24 && y >= 8) return '5';
  if (y < top) return '0';
  if (y === top || x < 2 || x > 45) return '1';
  if (y === 11) return '2';
  if (dist < 3) return '2';
  if (y >= 6 && y % 2 === 0 && dist >= 5 && dist <= 19) return '8';
  return dist > 19 ? '4' : '3';
});
const LECTERN = picture('lectern', 1, 48, 56, (x, y) => {
  if (y < 8) return x === 0 || x === 47 || y === 7 ? '1' : y < 2 ? '4' : y < 6 ? '3' : '2';
  if (y < 48) return x < 16 || x > 31 ? '0' : x === 16 || x === 31 ? '1' : x === 17 ? '4' : x < 23 ? '3' : '2';
  if (x < 4 || x > 43) return '0';
  return x === 4 || x === 43 || y === 48 || y === 55 ? '1' : y === 49 ? '4' : y < 54 ? '3' : '2';
});

function original() {
  const W = 40;
  const g = room(W);
  for (const x of [1, 36]) {
    for (let y = 1; y < FLOOR; y++) {
      const edge = y === 1 || y === FLOOR - 1;
      put(g, x, y, edge ? 'capital' : 'pill');
      put(g, x + 1, y, edge ? 'capital' : 'pilm');
      put(g, x + 2, y, edge ? 'capital' : 'pilr');
    }
  }
  lamp(g, 18, 3);
  stamp(g, 16, 13, LEDGER);
  stamp(g, 16, 15, LECTERN);
  const wall = grid(42);
  for (let x = 0; x < 42; x++) {
    put(wall, x, 1, 'cabtop');
    for (let y = 2; y < FLOOR; y++) put(wall, x, y, `drawer${(y - 2) % 2}${x % 3}`);
  }
  const shaft = grid(W);
  cone(shaft, 18.5, 5, FLOOR - 1, 1.5);
  return {
    backdrop: c(1, 2, 2), palettes, tiles,
    layers: [layer(2, wall, [0.5, 0]), layer(1, g, [1, 0], { hdma: floorHdma }), layer(3, shaft, [1, 0])],
  };
}

// Each area: the scene, which bg layers go to the sub screen, the colour math and how far the
// camera pans (a locked room only sways).
export const AREAS = [
  { key: 'access', name: 'ARCHIVE ACCESS', scene: access(), sub: [3], math: { op: 'add' }, span: 256, descent: descentAt('stage2-area1') },
  { key: 'retention', name: 'RETENTION ORDER', scene: retention(), sub: [3], math: { op: 'add', half: true }, span: 512, descent: descentAt('stage2-area2') },
  { key: 'original', name: 'THE ORIGINAL COPY', scene: original(), sub: [3], math: { op: 'add' }, span: 64, descent: descentAt('stage2-area3') },
];

export default AREAS[0].scene;
