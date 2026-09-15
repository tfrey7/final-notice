// The enemy test bench: Stage 1's waves against a stand-in auditor, drawn as flat NES-coloured figures.
// ?tune adds live sliders, ?strip draws a frame strip of the first screen's waves played by a bot.
import { WIDTH, HEIGHT } from '../nes/screen.mjs';
import { MASTER } from '../nes/palette.mjs';
import { CELL, glyph } from '../text/font.mjs';
import { pollPad } from '../input.mjs';
import { mountTunePanel } from '../tune.mjs';
import { FLOOR_TOP, FLOOR_BOTTOM, createWorld, hitFoe, telegraphing, visible } from './foes.mjs';
import { createStage, stepWorld } from './waves.mjs';

const css = (idx) => `#${MASTER[idx].toString(16).padStart(6, '0')}`;
const COLOURS = { clerk: 0x10, temp: 0x21, supervisor: 0x16, accountManager: 0x27 };

function text(ctx, str, x, y, colour) {
  ctx.fillStyle = colour;
  [...str].forEach((ch, i) => glyph(ch).forEach((row, r) => {
    for (let c = 0; c < CELL; c++) if (row[c] === '#') ctx.fillRect(x + i * CELL + c, y + r, 1, 1);
  }));
}

export function createBench(seed = 1) {
  const world = createWorld({ seed, player: { x: 64, y: 184, facing: 1, punch: 0, chain: 0, lastPunch: -99, flash: 0 } });
  createStage(world);
  return world;
}

// The stand-in auditor: B punches (the third in quick succession is heavy), A is a launching kick.
export function playerAct(world, input) {
  const p = world.player;
  if (p.punch > 0) p.punch--;
  if (p.flash > 0) p.flash--;
  if (p.punch === 0) {
    p.x += (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.y = Math.min(FLOOR_BOTTOM, Math.max(FLOOR_TOP, p.y + ((input.down ? 0.75 : 0) - (input.up ? 0.75 : 0))));
    if (input.right) p.facing = 1;
    if (input.left) p.facing = -1;
  }
  if ((input.b || input.a) && p.punch === 0) {
    p.chain = world.frame - p.lastPunch < 24 ? p.chain + 1 : 1;
    p.lastPunch = world.frame;
    p.punch = 8;
    const heavy = input.a || p.chain >= 3;
    if (p.chain >= 3) p.chain = 0;
    const target = world.foes.find((f) => Math.sign(f.x - p.x) === p.facing && Math.abs(f.x - p.x) < 24 && Math.abs(f.y - p.y) <= 6);
    if (target) hitFoe(world, target, { damage: heavy ? 2 : 1, heavy, knockback: heavy ? 2 : 1, dir: p.facing });
  }
  for (const e of world.events) if (e.type === 'playerHit') p.flash = 20;
}

export function draw(ctx, world, ox = 0, oy = 0) {
  const { stage, player: p } = world;
  const cam = stage.cameraX;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.beginPath();
  ctx.rect(0, 0, WIDTH, HEIGHT);
  ctx.clip();
  ctx.fillStyle = css(0x0f);
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = css(0x0c);
  ctx.fillRect(0, 40, WIDTH, FLOOR_TOP - 60);
  ctx.fillStyle = css(0x2d);
  for (let x = -(cam % 64); x < WIDTH; x += 64) ctx.fillRect(x + 8, 56, 40, 50);
  ctx.fillStyle = css(0x00);
  ctx.fillRect(0, FLOOR_TOP - 20, WIDTH, FLOOR_BOTTOM - FLOOR_TOP + 40);

  const figures = [...world.foes.map((f) => ({ f })), { p }].sort((a, b) => (a.f ?? a.p).y - (b.f ?? b.p).y);
  for (const { f } of figures) {
    if (!f) {
      const x = Math.round(p.x - cam);
      if (!(p.flash % 4 >= 2)) {
        ctx.fillStyle = css(0x30);
        ctx.fillRect(x - 5, p.y - 28, 10, 28);
        if (p.punch > 4) ctx.fillRect(x + (p.facing > 0 ? 5 : -15), p.y - 20, 10, 3);
      }
      continue;
    }
    if (!visible(f)) continue;
    const x = Math.round(f.x - cam);
    const big = f.boss ? 1.4 : 1;
    const w = Math.round(10 * big);
    const h = Math.round(28 * big);
    ctx.fillStyle = css(0x1d);
    ctx.fillRect(x - w / 2, f.y - 1, w, 2);
    ctx.fillStyle = f.state === 'dying' ? css(0x30) : css(COLOURS[f.type]);
    const y = Math.round(f.y - f.z);
    if (f.state === 'down' || f.state === 'dying') ctx.fillRect(x - h / 2, y - w, h, w);
    else if (f.state === 'air') ctx.fillRect(x - h / 2, y - w - 6, h, w);
    else {
      const shake = f.state === 'stagger' ? (f.timer % 4 < 2 ? -1 : 1) : 0;
      ctx.fillRect(x - w / 2 + shake, y - h, w, h);
      if (f.state === 'attack') ctx.fillRect(x + f.facing * (w / 2), y - h + 8, f.facing * 12, 4);
      if (f.state === 'block') {
        ctx.fillStyle = css(0x38);
        ctx.fillRect(x + f.facing * (w / 2 + 1) - 1, y - h + 4, 3, 14);
      }
      if (telegraphing(f) && f.timer % 6 < 4) {
        ctx.strokeStyle = css(0x30);
        ctx.strokeRect(x - w / 2 - 1.5, y - h - 1.5, w + 3, h + 3);
        text(ctx, '!', x - 4, y - h - 11, css(0x28));
      }
      if (f.state === 'enrage' && f.timer % 4 < 2) {
        ctx.fillStyle = css(0x16);
        ctx.fillRect(x - w / 2, y - h, w, h);
      }
    }
    if (f.boss) {
      ctx.fillStyle = css(0x30);
      ctx.fillRect(152, 22, 82, 6);
      ctx.fillStyle = css(f.phase === 2 ? 0x16 : 0x27);
      ctx.fillRect(153, 23, Math.round((80 * f.hp) / f.maxHp), 4);
      text(ctx, 'ACCT MGR', 152, 12, css(0x30));
    }
  }
  ctx.fillStyle = css(0x30);
  for (const s of world.shots) ctx.fillRect(Math.round(s.x - cam) - 3, s.y - 18, 6, 4);

  text(ctx, `SCREEN ${Math.min(stage.screen + 1, stage.screens.length)} WAVE ${stage.wave + 1}`, 16, 12, css(0x30));
  text(ctx, `HITS TAKEN ${p.hits}`, 16, 222, css(0x10));
  if (stage.locked) text(ctx, 'LOCKED', 16, 24, css(0x16));
  if (stage.go > 0 && Math.floor(stage.go / 10) % 2 === 0) text(ctx, 'GO >', 200, 110, css(0x28));
  if (stage.cleared) text(ctx, 'STAGE CLEAR', 84, 110, css(0x28));
  ctx.restore();
}

// A bot that keeps facing the nearest foe, lines up in its lane and punches.
export function botInput(world) {
  const p = world.player;
  const foe = world.foes.filter((f) => f.state !== 'dying').sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!foe) return { right: true };
  const dx = foe.x - p.x;
  const input = { up: foe.y < p.y - 2, down: foe.y > p.y + 2 };
  if (Math.abs(dx) > 18) Object.assign(input, dx > 0 ? { right: true } : { left: true });
  else p.facing = Math.sign(dx) || 1;
  input.b = Math.abs(dx) <= 22 && world.frame % 10 === 0;
  return input;
}

function start() {
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('bench');
  const ctx = canvas.getContext('2d');
  if (params.has('strip')) {
    // One cell per beat of the fight, each the first frame it happens, so the strip reads left to right.
    const beats = [
      ['WALK IN', () => true],
      ['WIND-UP', (w) => w.foes.some(telegraphing)],
      ['SWING', (w) => w.foes.some((f) => f.state === 'attack')],
      ['STAGGER', (w) => w.foes.some((f) => f.state === 'stagger')],
      ['LAUNCH', (w) => w.foes.some((f) => f.state === 'air')],
      ['DOWN', (w) => w.foes.some((f) => f.state === 'down')],
      ['DEATH FLASH', (w) => w.foes.some((f) => f.state === 'dying')],
      ['WAVE 2', (w) => w.stage.wave >= 1],
    ];
    const cols = 4;
    canvas.width = WIDTH * cols;
    canvas.height = HEIGHT * 2;
    const world = createBench(Number(params.get('seed') ?? 3));
    let i = 0;
    for (let f = 1; f <= 3000 && i < beats.length; f++) {
      playerAct(world, f < 150 ? {} : botInput(world));
      stepWorld(world);
      if (f >= 20 && beats[i][1](world)) {
        const [x, y] = [(i % cols) * WIDTH, Math.floor(i / cols) * HEIGHT];
        draw(ctx, world, x, y);
        text(ctx, beats[i][0], x + 120, y + 24, css(0x28));
        text(ctx, `F${f}`, x + 208, y + 12, css(0x28));
        i++;
      }
    }
    document.body.dataset.ready = '1';
    return;
  }
  if (params.has('tune')) mountTunePanel();
  const world = createBench(Date.now() & 0xffff);
  const bot = params.has('bot');
  let frame = 0;
  const tick = () => {
    const pad = pollPad(frame++);
    const input = bot ? botInput(world) : Object.fromEntries([...pad.held].map((b) => [b, true]));
    if (!bot) {
      input.b = pad.pressed.has('b');
      input.a = pad.pressed.has('a');
    }
    playerAct(world, input);
    stepWorld(world);
    draw(ctx, world);
    requestAnimationFrame(tick);
  };
  tick();
}

if (typeof document !== 'undefined') start();
