// Plays one SNES run in the page, PUSH START to THE END, and lays ten moments of it out as #strip for
// shot.py: load index.html?snes&fast&crt=sharp with
//   --seed-js "addEventListener('load',()=>import('/tools/snes-strip.mjs'))" --ready #strip --selector #strip
// Every screen change goes through the real flow (next and showFlow). The driver stands in for a
// player: it presses on through menus and scenes, moves each stage to its boss checkpoint, clears
// the stage, forces one game over and continues, and fast-forwards the ending's clock.
import { next, showFlow } from '/src/flow.mjs';
import { CREDITS_AT, endAt } from '/src/snes/ending.mjs';

const W = 256;
const H = 224;
const COLS = 5;
const LABEL = 14;

let game;
while (!(game = window.finalNotice)?.isBooted) await new Promise((r) => setTimeout(r, 50));

const on = (key) => game.scene.getScene(key);
const flow = () => game.registry.get('flow');
const go = (key, event) => showFlow(on(key), next(flow(), event));
const frames = (n) => new Promise((resolve) => {
  let k = 0;
  const tick = () => {
    if (++k < n) return;
    game.events.off('postrender', tick);
    resolve();
  };
  game.events.on('postrender', tick);
});

const strip = document.createElement('canvas');
strip.width = COLS * W;
strip.height = 2 * (H + LABEL);
const ctx = strip.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, strip.width, strip.height);
let n = 0;
function snap(label) {
  const x = (n % COLS) * W;
  const y = Math.floor(n / COLS) * (H + LABEL);
  ctx.drawImage(game.canvas, 0, 0, game.canvas.width, game.canvas.height, x, y + LABEL, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.fillText(`${++n} ${label}`, x + 4, y + 11);
}
const limits = (key) => {
  const s = on(key);
  return `lag ${s.slowdown?.lagFrames ?? 0}, dropped ${s.layer?.stats?.dropped ?? 0}`;
};

await frames(150); snap('title');
go('title', { type: 'start' }); await frames(40);
go('select', { type: 'start', auditor: 'ward' }); await frames(160); snap('scene 1');
go('scene1', { type: 'start' }); await frames(300); snap(`stage 1 (${limits('stage1')})`);
game.registry.set('flow', next(flow(), { type: 'checkpoint', id: 'stage1-area5' }));
on('stage1').scene.restart(); await frames(170); snap('vellum');
go('stage1', { type: 'stageClear' }); await frames(60);
go('scene2', { type: 'start' }); await frames(300); snap(`stage 2 (${limits('stage2')})`);
go('stage2', { type: 'gameOver' }); await frames(100); snap('game over');
go('gameover', { type: 'continue' }); await frames(60);
game.registry.set('flow', next(flow(), { type: 'checkpoint', id: 'stage2-area5' }));
on('stage2').scene.restart(); await frames(220); snap('great seal');
go('stage2', { type: 'stageClear' }); await frames(40);
go('scene3', { type: 'start' }); await frames(110); snap('evidence');
const ending = on('ending');
ending.frame = Math.round(CREDITS_AT + (endAt() - CREDITS_AT) * 0.6); await frames(4); snap('credits, lights going out');
ending.frame = endAt(); await frames(4); snap('the end');

const img = document.createElement('img');
img.id = 'strip';
img.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
img.onload = () => document.body.append(img);
img.src = strip.toDataURL();
