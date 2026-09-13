// Ellis Ward's sprite sheet, drawn the Pong lessons' way (super-ultra-pong-64
// docs/lessons/sprites.md and era3-genesis.md, item 1280): the figure is a set of parts
// written as text grids (one letter a pixel, one row a line) plus limbs laid along joints,
// and one pose table places the parts per frame. Colours sit on the Super Nintendo's
// 5-bit grid, in one 15-colour sprite palette.
//
//   node tools/ward-sprite.mjs          build assets/sprites/ward.png and ward.json
//   node tools/ward-sprite.mjs --look <png> [--scale 6]   every frame, enlarged, to look at
//
// The grids here are the source; the PNG is built from them and the test fails if the
// committed sheet drifts.

import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FRAME_W = 40;
export const FRAME_H = 64;
export const FOOT_Y = 62; // the row the soles stand on

// One sprite palette, Super Nintendo 5-bit colour (each channel a multiple of 255/31).
const five = (v) => Math.round((Math.round((v * 31) / 255) * 255) / 31);
export const PALETTE = {
  k: [16, 16, 25], // outline
  d: [49, 49, 58], // charcoal suit, shadow
  s: [82, 82, 90], // charcoal suit
  l: [123, 123, 132], // charcoal suit, light
  w: [239, 230, 206], // ivory shirt
  v: [181, 173, 148], // ivory shirt, shadow
  t: [148, 33, 49], // burgundy tie
  T: [90, 16, 33], // burgundy tie, shadow
  f: [222, 165, 123], // skin
  g: [165, 107, 82], // skin, shadow
  x: [247, 206, 165], // skin, light
  h: [41, 33, 25], // cropped dark hair
  H: [82, 66, 49], // hair, light
  m: [132, 66, 58], // mouth
};
for (const c of Object.values(PALETTE)) for (let i = 0; i < 3; i++) c[i] = five(c[i]);

// ---- parts, as text grids ('.' is clear) ----

// Head facing right: cropped dark hair, long face, a prominent nose, tired brow.
const HEAD = [
  '..kkkkkkk...',
  '.kHhhhhhhk..',
  'khHhhhhhhhk.',
  'khhhhhhhhfk.',
  'khhgffffxfk.',
  'khgffffhhfk.',
  'khgfffgkffk.',
  '.kgffffgfffk',
  '.kgfffffxffk',
  '.kgffffffgfk',
  '.kgffffffgk.',
  '.kgfffffkk..',
  '..kgfffggfk.',
  '...kgfffffk.',
  '....kkkkkk..',
];
// The same head knocked back: eyes screwed shut, mouth open.
const HEAD_HURT = [
  '..kkkkkkk...',
  '.kHhhhhhhk..',
  'khHhhhhhhhk.',
  'khhhhhhhhfk.',
  'khhgffffxfk.',
  'khgfffhhhfk.',
  'khgffffggfk.',
  '.kgffffgfffk',
  '.kgfffffxffk',
  '.kgffffffgfk',
  '.kgfffffkkk.',
  '.kgffffkmk..',
  '..kgfffkkfk.',
  '...kgfffffk.',
  '....kkkkkk..',
];
// Torso: jacket, ivory shirt and burgundy tie, lit from the front (right).
const TORSO = [
  '......kgggk.....',
  '....kkswwwskk...',
  '...ksssdwtwdssk.',
  '..kssssdwtwdslk.',
  '..ksssssdttdslk.',
  '..kssssssdtTdlk.',
  '..kdsssssdtTdlk.',
  '..kdssssssdtdlk.',
  '..kdssssssdtdlk.',
  '..kdsssssssdtlk.',
  '..kdssssssssdlk.',
  '..kdssssssssslk.',
  '..kdssssssssslk.',
  '..kdsssssssssk..',
  '..kdddsssssssk..',
  '..kdddssssssdk..',
  '..kddddsssssdk..',
  '...kkkkkkkkkk...',
];
const FIST = ['.kkk.', 'kxffk', 'kffgk', '.kkk.'];
const SHOE = ['.kkkk..', 'kdddskk', 'kkkkkkk'];

// ---- drawing ----

function blankLayer() {
  return Array.from({ length: FRAME_H }, () => Array(FRAME_W).fill('.'));
}

function stamp(layer, grid, x0, y0) {
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const X = x0 + x;
      const Y = y0 + y;
      if (ch !== '.' && X >= 0 && Y >= 0 && X < FRAME_W && Y < FRAME_H) layer[Y][X] = ch;
    });
  });
}

// A limb segment: a round-ended bar `width` wide, lit on one side and shaded on the other.
function segment(layer, a, b, width, fill, shade) {
  const r = width / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  const nx = -dy / Math.sqrt(len2);
  const ny = dx / Math.sqrt(len2);
  for (let y = Math.floor(Math.min(a[1], b[1]) - r - 1); y <= Math.max(a[1], b[1]) + r + 1; y++) {
    for (let x = Math.floor(Math.min(a[0], b[0]) - r - 1); x <= Math.max(a[0], b[0]) + r + 1; x++) {
      if (x < 0 || y < 0 || x >= FRAME_W || y >= FRAME_H) continue;
      const px = x + 0.5 - a[0];
      const py = y + 0.5 - a[1];
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
      const ex = px - t * dx;
      const ey = py - t * dy;
      if (ex * ex + ey * ey > r * r) continue;
      // the side facing down and back (left) is in shadow
      const side = ex * nx + ey * ny;
      const toward = nx * -0.5 + ny * 1 > 0 ? 1 : -1;
      layer[y][x] = side * toward > r * 0.25 ? shade : fill;
    }
  }
}

// Every clear pixel touching the part gets the outline letter.
function outline(layer) {
  const out = layer.map((row) => row.slice());
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (layer[y][x] !== '.') continue;
      const n = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, b]) => {
        const v = layer[y + b]?.[x + a];
        return v && v !== '.' && v !== 'k';
      });
      if (n) out[y][x] = 'k';
    }
  }
  return out;
}

function over(frame, layer) {
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) if (layer[y][x] !== '.') frame[y][x] = layer[y][x];
}

// Two-bone reach: where the middle joint sits for a start, an end and two bone lengths.
// `bend` picks the side the joint folds to (+1 or -1).
export function joint(a, c, l1, l2, bend) {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01) || 0.01;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const ux = dx / d;
  const uy = dy / d;
  return [a[0] + ux * along - uy * h * bend, a[1] + uy * along + ux * h * bend];
}

const THIGH = 14;
const SHIN = 15;
const UPPER = 10;
const FORE = 10;

function limbArm(layer, shoulder, hand, bend, back) {
  const elbow = joint(shoulder, hand, UPPER, FORE, bend);
  const [fill, shade] = back ? ['d', 'k'] : ['s', 'd'];
  segment(layer, shoulder, elbow, 4, fill, shade);
  // the forearm stops short of the fist and shows an ivory cuff
  const cx = hand[0] - (hand[0] - elbow[0]) * 0.22;
  const cy = hand[1] - (hand[1] - elbow[1]) * 0.22;
  segment(layer, elbow, [cx, cy], 3.4, fill, shade);
  segment(layer, [cx, cy], [cx + (hand[0] - cx) * 0.4, cy + (hand[1] - cy) * 0.4], 3, back ? 'v' : 'w', 'v');
}

function limbLeg(layer, hip, ankle, back) {
  const knee = joint(hip, ankle, THIGH, SHIN, -1);
  const [fill, shade] = back ? ['d', 'k'] : ['s', 'd'];
  segment(layer, hip, knee, 4.6, fill, shade);
  segment(layer, knee, ankle, 4, fill, shade);
}

// One pose: where each part goes. `body` moves torso, head and shoulders together.
function drawPose(p) {
  const frame = blankLayer();
  const bx = p.body?.[0] ?? 0;
  const by = p.body?.[1] ?? 0;
  const shB = [15 + bx, 18 + by];
  const shF = [21 + bx, 18 + by];
  const hipB = [17 + (p.hip?.[0] ?? bx), 31 + (p.hip?.[1] ?? by)];
  const hipF = [21 + (p.hip?.[0] ?? bx), 31 + (p.hip?.[1] ?? by)];

  const backArm = blankLayer();
  limbArm(backArm, shB, p.handB, p.bendB ?? 1, true);
  stamp(backArm, FIST, Math.round(p.handB[0]) - 2, Math.round(p.handB[1]) - 2);
  over(frame, outline(backArm));

  const backLeg = blankLayer();
  limbLeg(backLeg, hipB, p.footB, true);
  stamp(backLeg, SHOE, Math.round(p.footB[0]) - 2, Math.round(p.footB[1]));
  over(frame, outline(backLeg));

  const frontLeg = blankLayer();
  limbLeg(frontLeg, hipF, p.footF, false);
  stamp(frontLeg, SHOE, Math.round(p.footF[0]) - 2, Math.round(p.footF[1]));
  over(frame, outline(frontLeg));

  const body = blankLayer();
  stamp(body, TORSO, 10 + bx, 15 + by);
  stamp(body, p.hurt ? HEAD_HURT : HEAD, 13 + bx + (p.head?.[0] ?? 0), 1 + by + (p.head?.[1] ?? 0));
  over(frame, body);

  const frontArm = blankLayer();
  limbArm(frontArm, shF, p.handF, p.bendF ?? 1, false);
  stamp(frontArm, FIST, Math.round(p.handF[0]) - 2, Math.round(p.handF[1]) - 2);
  over(frame, outline(frontArm));
  return frame;
}

// ---- the pose table ----

const STANCE = { footB: [12, 59], footF: [26, 59], handB: [23, 20], handF: [29, 23] };
const at = (base, change) => ({ ...base, ...change });

function walkPose(i) {
  const a = (i / 6) * Math.PI * 2;
  const stride = 7;
  const lift = (s) => 59 - Math.max(0, Math.sin(s)) * 3;
  const bob = Math.round(Math.abs(Math.cos(a)) * -1 + 1) - 1; // down on the passing frames
  return {
    body: [1, bob + 1],
    hip: [1, bob + 1],
    footF: [19 + Math.cos(a) * stride, lift(a + Math.PI)],
    footB: [19 - Math.cos(a) * stride, lift(a)],
    handF: [28 - Math.cos(a) * 2, 25 + bob],
    handB: [22 + Math.cos(a) * 2, 21 + bob],
  };
}

export const ANIMATIONS = {
  idle: {
    fps: 6,
    repeat: -1,
    poses: [
      at(STANCE, {}),
      at(STANCE, { body: [0, 0], hip: [0, 0], handF: [29, 24] }),
      at(STANCE, { body: [0, 1], hip: [0, 0], handF: [29, 24], handB: [23, 21] }),
      at(STANCE, { body: [0, 1], hip: [0, 0], handB: [23, 21] }),
    ],
  },
  walk: { fps: 10, repeat: -1, poses: [0, 1, 2, 3, 4, 5].map(walkPose) },
  punch1: {
    // the jab: a quick straight lead hand
    fps: 14,
    repeat: 0,
    poses: [
      at(STANCE, { body: [-1, 0], hip: [0, 0], handF: [27, 22] }),
      at(STANCE, { body: [2, 0], hip: [1, 0], handF: [39, 20], bendF: 1 }),
      at(STANCE, { body: [1, 0], hip: [0, 0], handF: [34, 21] }),
    ],
  },
  punch2: {
    // the cross: the back hand drives through, shoulders turning in
    fps: 14,
    repeat: 0,
    poses: [
      at(STANCE, { body: [-1, 1], hip: [0, 0], handB: [21, 21], handF: [28, 21] }),
      at(STANCE, { body: [4, 0], hip: [2, 0], footB: [14, 59], handB: [38, 20], handF: [25, 24] }),
      at(STANCE, { body: [2, 0], hip: [1, 0], handB: [32, 21], handF: [26, 24] }),
    ],
  },
  punch3: {
    // the finisher: dip, then a long rising uppercut that lifts him onto his toes
    fps: 12,
    repeat: 0,
    poses: [
      at(STANCE, { body: [-1, 4], hip: [-1, 3], footB: [11, 59], footF: [27, 59], handF: [25, 34], handB: [22, 22] }),
      at(STANCE, { body: [2, 1], hip: [1, 1], footF: [28, 59], handF: [31, 16], handB: [21, 25] }),
      at(STANCE, { body: [3, -2], hip: [2, -2], footB: [14, 57], footF: [28, 59], handF: [32, 11], bendF: 1, handB: [20, 26] }),
      at(STANCE, { body: [2, -1], hip: [1, -1], footB: [13, 59], footF: [28, 59], handF: [31, 14], bendF: 1, handB: [21, 25] }),
    ],
  },
  hit: {
    fps: 10,
    repeat: 0,
    poses: [
      at(STANCE, { hurt: true, body: [-3, 1], hip: [-1, 1], head: [-1, 1], handB: [9, 36], bendB: -1, handF: [22, 29], footF: [25, 59] }),
      at(STANCE, { hurt: true, body: [-4, 2], hip: [-2, 2], head: [-1, 1], handB: [8, 37], bendB: -1, handF: [20, 30], footF: [24, 59], footB: [11, 59] }),
      at(STANCE, { hurt: true, body: [-2, 1], hip: [-1, 1], handB: [18, 23], handF: [25, 27] }),
    ],
  },
};

// ---- the sheet ----

export function buildFrames() {
  const out = {};
  for (const [name, anim] of Object.entries(ANIMATIONS)) out[name] = anim.poses.map(drawPose);
  return out;
}

export function buildSheet() {
  const frames = buildFrames();
  const names = Object.keys(ANIMATIONS);
  const cols = Math.max(...names.map((n) => frames[n].length));
  const width = cols * FRAME_W;
  const height = names.length * FRAME_H;
  const rgba = new Uint8Array(width * height * 4);
  const meta = {
    image: 'ward.png',
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    columns: cols,
    origin: { x: 19, y: FOOT_Y },
    animations: {},
  };
  names.forEach((name, row) => {
    frames[name].forEach((grid, col) => {
      grid.forEach((line, y) => {
        line.forEach((ch, x) => {
          if (ch === '.') return;
          const i = ((row * FRAME_H + y) * width + col * FRAME_W + x) * 4;
          rgba.set([...PALETTE[ch], 255], i);
        });
      });
    });
    meta.animations[name] = {
      frames: frames[name].map((_, col) => row * cols + col),
      fps: ANIMATIONS[name].fps,
      repeat: ANIMATIONS[name].repeat,
    };
  });
  return { width, height, rgba, meta, frames };
}

// The figure's measured box in one frame: top row, bottom row, height.
export function measure(grid) {
  let top = FRAME_H;
  let bottom = -1;
  grid.forEach((line, y) => {
    if (line.some((ch) => ch !== '.')) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  });
  return { top, bottom, height: bottom - top + 1 };
}

// ---- PNG ----

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td) >>> 0);
  return Buffer.concat([len, td, crc]);
}

export function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Every frame enlarged on a grey board with a foot line, for looking at.
function lookPng(sheet, scale) {
  const { width, height, rgba, meta } = sheet;
  const W = width * scale;
  const H = height * scale;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      const i = (sy * width + sx) * 4;
      const o = (y * W + x) * 4;
      const edge = x % (meta.frameWidth * scale) === 0 || y % (meta.frameHeight * scale) === 0;
      const foot = sy % meta.frameHeight === FOOT_Y + 1 && y % scale === 0;
      const bg = edge ? [20, 20, 30] : foot ? [60, 140, 120] : (sx + sy) % 2 ? [96, 40, 56] : [90, 26, 44];
      out.set(rgba[i + 3] ? [rgba[i], rgba[i + 1], rgba[i + 2], 255] : [...bg, 255], o);
    }
  }
  return encodePng(W, H, out);
}

export function main(argv) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sheet = buildSheet();
  const look = argv.indexOf('--look');
  if (look >= 0) {
    const scale = Number(argv[argv.indexOf('--scale') + 1]) || 6;
    writeFileSync(argv[look + 1], lookPng(sheet, argv.includes('--scale') ? scale : 6));
  } else {
    const dir = path.join(root, 'assets', 'sprites');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'ward.png'), encodePng(sheet.width, sheet.height, sheet.rgba));
    writeFileSync(path.join(dir, 'ward.json'), JSON.stringify(sheet.meta, null, 2) + '\n');
  }
  const heights = Object.entries(sheet.frames).map(
    ([n, fs]) => `${n} ${fs.map((g) => measure(g).height).join('/')}`,
  );
  console.log(`LOOK ${sheet.width}x${sheet.height} colours ${Object.keys(PALETTE).length} heights ${heights.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
