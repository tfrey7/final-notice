// The Security Associate's sprite sheet, drawn the same way as Ward's (tools/ward-sprite.mjs,
// item 1450): text-grid parts, limbs laid along joints, one pose table, one 5-bit palette.
// He is an ordinary man in a dark security uniform; the only wrong thing about him is the
// stare, which stays wide open and fixed through every frame, the hurt ones included.
//
//   node tools/associate-sprite.mjs          build assets/sprites/associate.png and associate.json
//   node tools/associate-sprite.mjs --look <png> [--scale 6]
//
// Frames are wider than Ward's (80 against 40) because he falls down: a figure lying on the
// floor is as long as a standing one is tall.

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankLayer, stamp, segment, outline, over, joint, measure, encodePng, lookPng, FOOT_Y } from './ward-sprite.mjs';

export const FRAME_W = 80;
export const FRAME_H = 64;
// Standing poses use Ward's coordinates, shifted right so a fall backwards stays in the frame.
const OX = 32;

const five = (v) => Math.round((Math.round((v * 31) / 255) * 255) / 31);
export const PALETTE = {
  k: [16, 16, 25], // outline
  d: [25, 33, 57], // navy uniform, shadow
  s: [41, 49, 82], // navy uniform
  l: [66, 82, 115], // navy uniform, light
  w: [181, 198, 214], // pale blue shirt
  v: [123, 140, 165], // shirt, shadow
  t: [33, 25, 33], // black tie and duty belt
  b: [206, 173, 82], // brass badge and buckle
  f: [214, 165, 132], // skin
  g: [156, 107, 90], // skin, shadow
  x: [239, 198, 165], // skin, light
  h: [66, 49, 41], // crew cut
  H: [107, 82, 66], // crew cut, light
  e: [247, 247, 239], // the whites of his eyes
  m: [115, 66, 66], // mouth
};
for (const c of Object.values(PALETTE)) for (let i = 0; i < 3; i++) c[i] = five(c[i]);

// ---- parts ----

// Head facing right: flat crew cut, heavy level brow, square jaw, and one wide eye whose
// whites show all round the pupil. The mouth is a straight line.
const HEAD = [
  '..kkkkkkkk..',
  '.khHHHHHHhk.',
  'khhhhhhhhhhk',
  'khhhhhhhhhfk',
  'khhgfffffffk',
  'khgfffkkkfk.',
  'khgfffekefk.',
  '.kgfffeeeffk',
  '.kgfffffxffk',
  '.kgffffffgfk',
  '.kgffffffgk.',
  '.kgffkkkkfk.',
  '.kgffffffk..',
  '..kggfffgk..',
  '...kkkkkkk..',
];
// Struck: the mouth drops open, but the eye does not close or even flinch.
const HEAD_HURT = [
  '..kkkkkkkk..',
  '.khHHHHHHhk.',
  'khhhhhhhhhhk',
  'khhhhhhhhhfk',
  'khhgfffffffk',
  'khgfffkkkfk.',
  'khgfffekefk.',
  '.kgfffeeeffk',
  '.kgfffffxffk',
  '.kgffffffgfk',
  '.kgffffkkkk.',
  '.kgfffkmmk..',
  '.kgffffkkk..',
  '..kggfffgk..',
  '...kkkkkkk..',
];
// Torso: a navy uniform jacket a little broader than Ward's, pale blue shirt, black tie,
// a brass badge on the chest and a duty belt with a brass buckle.
const TORSO = [
  '......kgggk.....',
  '...kkkswwwskkk..',
  '..kssssdwtwdsslk',
  '.ksssssdwtwdsslk',
  '.kssssssdtdbbslk',
  '.kdsssssdttbbslk',
  '.kdssssssdtdsslk',
  '.kdssssssdtdsslk',
  '.kdsssssssdtdslk',
  '.kdssssssssddslk',
  '.kdsssssssssssk.',
  '.kttttttttttbbk.',
  '..kdsssssssssk..',
  '..kdddssssssdk..',
  '..kdddssssssdk..',
  '..kddddsssssdk..',
  '..kddddsssssdk..',
  '...kkkkkkkkkk...',
];
const FIST = ['.kkk.', 'kxffk', 'kffgk', '.kkk.'];
const SHOE = ['.kkkk..', 'kttttkk', 'kkkkkkk'];

// ---- drawing ----

const THIGH = 14;
const SHIN = 15;
const UPPER = 10;
const FORE = 10;

function limbArm(layer, shoulder, hand, bend, back) {
  const elbow = joint(shoulder, hand, UPPER, FORE, bend);
  const [fill, shade] = back ? ['d', 'k'] : ['s', 'd'];
  segment(layer, shoulder, elbow, 4.4, fill, shade);
  const cx = hand[0] - (hand[0] - elbow[0]) * 0.22;
  const cy = hand[1] - (hand[1] - elbow[1]) * 0.22;
  segment(layer, elbow, [cx, cy], 3.8, fill, shade);
  segment(layer, [cx, cy], [cx + (hand[0] - cx) * 0.4, cy + (hand[1] - cy) * 0.4], 3, back ? 'v' : 'w', 'v');
}

function limbLeg(layer, hip, ankle, back) {
  const knee = joint(hip, ankle, THIGH, SHIN, -1);
  const [fill, shade] = back ? ['d', 'k'] : ['s', 'd'];
  segment(layer, hip, knee, 4.8, fill, shade);
  segment(layer, knee, ankle, 4.2, fill, shade);
}

const shift = (p) => [p[0] + OX, p[1]];

// A standing pose, in Ward's 40-wide coordinates, drawn into the wide frame.
function drawStanding(p) {
  const frame = blankLayer(FRAME_W, FRAME_H);
  const bx = p.body?.[0] ?? 0;
  const by = p.body?.[1] ?? 0;
  const shB = shift([15 + bx, 18 + by]);
  const shF = shift([22 + bx, 18 + by]);
  const hipB = shift([17 + (p.hip?.[0] ?? bx), 31 + (p.hip?.[1] ?? by)]);
  const hipF = shift([21 + (p.hip?.[0] ?? bx), 31 + (p.hip?.[1] ?? by)]);
  const handB = shift(p.handB);
  const handF = shift(p.handF);
  const footB = shift(p.footB);
  const footF = shift(p.footF);

  const backArm = blankLayer(FRAME_W, FRAME_H);
  limbArm(backArm, shB, handB, p.bendB ?? 1, true);
  stamp(backArm, FIST, Math.round(handB[0]) - 2, Math.round(handB[1]) - 2);
  over(frame, outline(backArm));

  const backLeg = blankLayer(FRAME_W, FRAME_H);
  limbLeg(backLeg, hipB, footB, true);
  stamp(backLeg, SHOE, Math.round(footB[0]) - 2, Math.round(footB[1]));
  over(frame, outline(backLeg));

  const frontLeg = blankLayer(FRAME_W, FRAME_H);
  limbLeg(frontLeg, hipF, footF, false);
  stamp(frontLeg, SHOE, Math.round(footF[0]) - 2, Math.round(footF[1]));
  over(frame, outline(frontLeg));

  const body = blankLayer(FRAME_W, FRAME_H);
  stamp(body, TORSO, 10 + OX + bx, 15 + by);
  stamp(body, p.hurt ? HEAD_HURT : HEAD, 13 + OX + bx + (p.head?.[0] ?? 0), 1 + by + (p.head?.[1] ?? 0));
  over(frame, body);

  const frontArm = blankLayer(FRAME_W, FRAME_H);
  limbArm(frontArm, shF, handF, p.bendF ?? 1, false);
  stamp(frontArm, FIST, Math.round(handF[0]) - 2, Math.round(handF[1]) - 2);
  over(frame, outline(frontArm));
  return frame;
}

// Flat on his back: the standing figure turned a quarter-turn anticlockwise, so his head lies
// behind him (left), his face is up and his heels sit where he stood. A grid quarter-turn loses
// no pixels, which is why the fall is built this way rather than rotated by an angle.
function drawLying(p) {
  const standing = drawStanding(p);
  const frame = blankLayer(FRAME_W, FRAME_H);
  let low = 0;
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) if (standing[y][x] !== '.') low = Math.max(low, FRAME_W - 1 - x);
  const lift = p.lift ?? 0;
  const dy = FOOT_Y - low - lift;
  const dx = 4; // his crown clears the left edge, his heels end near where he stood
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const ch = standing[y][x];
      if (ch === '.') continue;
      const X = y + dx;
      const Y = FRAME_W - 1 - x + dy;
      if (X >= 0 && Y >= 0 && X < FRAME_W && Y < FRAME_H) frame[Y][X] = ch;
    }
  }
  return frame;
}

const drawPose = (p) => (p.lying ? drawLying(p) : drawStanding(p));

// ---- the pose table ----

// He stands square and upright, guard low: a man paid to stand in a lobby.
const STANCE = { footB: [13, 59], footF: [25, 59], handB: [22, 26], handF: [27, 28] };
const at = (base, change) => ({ ...base, ...change });

// A measured, even march: no bob, arms barely swinging.
function walkPose(i) {
  const a = (i / 6) * Math.PI * 2;
  const stride = 6;
  const lift = (s) => 59 - Math.max(0, Math.sin(s)) * 2;
  return {
    body: [1, 0],
    hip: [1, 0],
    footF: [19 + Math.cos(a) * stride, lift(a + Math.PI)],
    footB: [19 - Math.cos(a) * stride, lift(a)],
    handF: [27 - Math.cos(a) * 1.5, 29],
    handB: [21 + Math.cos(a) * 1.5, 27],
  };
}

// Lying flat: arms by his sides, legs straight, in standing coordinates before the turn.
const FLAT = { lying: true, footB: [17, 59], footF: [22, 59], handB: [16, 38], handF: [24, 38], bendB: -1, bendF: 1 };

export const ANIMATIONS = {
  walk: { fps: 8, repeat: -1, poses: [0, 1, 2, 3, 4, 5].map(walkPose) },
  windup: {
    // the tell: he rocks back and cocks his rear fist behind him, slow enough to read
    fps: 8,
    repeat: 0,
    poses: [
      at(STANCE, { body: [-1, 0], hip: [0, 0], handF: [28, 24], handB: [14, 26], bendB: -1 }),
      at(STANCE, { body: [-3, 1], hip: [-1, 0], footF: [26, 59], handF: [29, 22], handB: [5, 17], bendB: -1 }),
      at(STANCE, { body: [-3, 1], hip: [-1, 0], footF: [26, 59], handF: [29, 22], handB: [4, 16], bendB: -1 }),
    ],
  },
  punch: {
    // one straight, heavy cross from the rear hand: the whole body follows the fist
    fps: 14,
    repeat: 0,
    poses: [
      at(STANCE, { body: [3, 0], hip: [2, 0], footB: [15, 59], footF: [28, 59], handB: [30, 19], handF: [25, 26] }),
      at(STANCE, { body: [5, 0], hip: [3, 0], footB: [16, 59], footF: [29, 59], handB: [40, 18], handF: [25, 27] }),
      at(STANCE, { body: [4, 0], hip: [2, 0], footB: [15, 59], footF: [29, 59], handB: [37, 19], handF: [25, 27] }),
      at(STANCE, { body: [1, 0], hip: [1, 0], footF: [27, 59], handB: [28, 24] }),
    ],
  },
  reel: {
    // struck: head snaps back, arms drop, the stare stays on you
    fps: 10,
    repeat: 0,
    poses: [
      at(STANCE, { hurt: true, body: [-3, 1], hip: [-1, 1], head: [-1, 1], handB: [9, 34], bendB: -1, handF: [21, 32], footF: [24, 59] }),
      at(STANCE, { hurt: true, body: [-4, 2], hip: [-2, 2], head: [-1, 1], handB: [8, 36], bendB: -1, handF: [19, 33], footF: [23, 59], footB: [11, 59] }),
      at(STANCE, { hurt: true, body: [-2, 1], hip: [-1, 1], handB: [18, 28], handF: [24, 30] }),
    ],
  },
  knockdown: {
    // thrown back off his feet: stagger, knees go, he lands flat and bounces once
    fps: 10,
    repeat: 0,
    poses: [
      at(STANCE, { hurt: true, body: [-5, 2], hip: [-3, 2], head: [-1, 1], handB: [6, 30], bendB: -1, handF: [30, 16], footF: [23, 59], footB: [10, 59] }),
      at(STANCE, { hurt: true, body: [-6, 12], hip: [-5, 12], head: [-1, 1], handB: [6, 36], bendB: -1, handF: [31, 26], footF: [27, 59], footB: [17, 59] }),
      { ...FLAT, hurt: true, lift: 3, handF: [34, 24], handB: [30, 20], bendB: 1 },
      { ...FLAT, hurt: true },
    ],
  },
  down: {
    // he lies still, eyes open; the fingers of his near hand twitch
    fps: 3,
    repeat: -1,
    poses: [{ ...FLAT }, { ...FLAT, handF: [25, 37] }],
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
    image: 'associate.png',
    frameWidth: FRAME_W,
    frameHeight: FRAME_H,
    columns: cols,
    origin: { x: 19 + OX, y: FOOT_Y },
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
    writeFileSync(path.join(dir, 'associate.png'), encodePng(sheet.width, sheet.height, sheet.rgba));
    writeFileSync(path.join(dir, 'associate.json'), JSON.stringify(sheet.meta, null, 2) + '\n');
  }
  const heights = Object.entries(sheet.frames).map(
    ([n, fs]) => `${n} ${fs.map((g) => measure(g).height).join('/')}`,
  );
  console.log(`LOOK ${sheet.width}x${sheet.height} colours ${Object.keys(PALETTE).length} heights ${heights.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
