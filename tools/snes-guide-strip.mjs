// Lays out one Stage 1 chain frame by frame as #strip for shot.py, to show the combo guide following a
// route: load index.html?snes&go=stage1&crt=sharp with
//   --seed-js "addEventListener('load',()=>import('/tools/snes-guide-strip.mjs'))" --ready #strip --selector #strip
// The driver stands the auditor next to a foe and presses the route in `?route` (Y Y X by default),
// snapping the screen a few frames after each press, so the strip reads as the chain happening.
import { pollPad } from '/src/input.mjs';

const W = 256;
const H = 224;
const COLS = 3;
const LABEL = 14;

let game;
while (!(game = window.finalNotice)?.isBooted) await new Promise((r) => setTimeout(r, 50));

const stage = () => game.scene.getScene('stage1');
const frames = (n) => new Promise((resolve) => {
  let k = 0;
  const tick = () => {
    if (++k < n) return;
    game.events.off('postrender', tick);
    resolve();
  };
  game.events.on('postrender', tick);
});

const codeFor = (button) => Object.entries(pollPad(-1).layout.keys).find(([, b]) => b === button)?.[0];
const key = (type, button) => window.dispatchEvent(new KeyboardEvent(type, { code: codeFor(button), bubbles: true }));
async function press(button) {
  key('keydown', button);
  await frames(3);
  key('keyup', button);
}

const params = new URLSearchParams(location.search);
const route = (params.get('route') ?? 'y,y,x').split(',');

let strip;
let ctx;
let n = 0;
function snap(label) {
  const x = (n % COLS) * W;
  const y = Math.floor(n / COLS) * (H + LABEL);
  ctx.drawImage(game.canvas, 0, 0, game.canvas.width, game.canvas.height, x, y + LABEL, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.fillText(`${++n} ${label}`, x + 4, y + 11);
}

// Stands the auditor at punching range of the nearest foe still standing, facing him.
function squareUp(s) {
  const w = s.world;
  const p = w.fighters.find((f) => f.team === 'player');
  const foe = w.fighters.filter((f) => f.team !== 'player' && f.hp > 0).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!foe) return p;
  foe.y = p.y;
  p.x = foe.x - 20;
  p.facing = 1;
  return p;
}

const s = stage();
while (!s.ready) await frames(1);
s.guideOn = true;
await frames(90);
while (s.entrance || s.card) await frames(10);

const shots = 2 + route.length;
strip = document.createElement('canvas');
strip.width = COLS * W;
strip.height = Math.ceil(shots / COLS) * (H + LABEL);
ctx = strip.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, strip.width, strip.height);

squareUp(s);
await frames(4);
snap('before the chain');
// Holds the foe in reach until the blow connects, so the next button of the route buffers off it.
async function landed(s, max = 40) {
  for (let k = 0; k < max; k++) {
    const p = squareUp(s);
    if (k > 3 && p.landed) return;
    await frames(1);
  }
}
for (let i = 0; i < route.length; i++) {
  squareUp(s);
  await press(route[i]);
  await landed(s);
  snap(`${i + 1}. ${route[i].toUpperCase()} pressed`);
}
for (let k = 0; k < 60 && !s.comboName; k++) { squareUp(s); await frames(1); }
await frames(2);
snap('the counter names it');

strip.id = 'strip';
document.body.append(strip);
