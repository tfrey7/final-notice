import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { rgb15 } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { FRONT_H, SHADOW_H, WIPE_FRAMES, drawerPass, skip, wipeEdge, wipeStep } from '../src/snes/drawer.mjs';

test('the drawer edge sweeps down line by line and clears the screen in about 20 frames', () => {
  assert.equal(WIPE_FRAMES, 20);
  assert.equal(wipeEdge(0), 0);
  assert.equal(wipeEdge(WIPE_FRAMES), HEIGHT + FRONT_H);
  assert.equal(wipeEdge(WIPE_FRAMES + 5), HEIGHT + FRONT_H);
  assert.equal(wipeEdge(WIPE_FRAMES / 2), (HEIGHT + FRONT_H) / 2);
  for (let f = 1; f <= WIPE_FRAMES; f++) assert.ok(wipeEdge(f) > wipeEdge(f - 1), `frame ${f} moves on`);
  assert.ok(wipeEdge(1) < wipeEdge(WIPE_FRAMES / 2) - wipeEdge(WIPE_FRAMES / 2 - 1), 'starts heavy');
});

test('a second press skips a transition to its end', () => {
  assert.deepEqual(wipeStep(3), { frame: 4, edge: wipeEdge(4), done: false });
  assert.deepEqual(wipeStep(3, true), { frame: WIPE_FRAMES, edge: HEIGHT + FRONT_H, done: true });
  assert.equal(wipeStep(WIPE_FRAMES).done, true);
  assert.equal(skip(5, 16, false), 6);
  assert.equal(skip(5, 16, true), 16);
  assert.equal(skip(16, 16, false), 16);
});

test('the wipe shows select above the drawer, the front on the edge, and the title under its shadow', () => {
  const old = screen(rgb15(20, 20, 20));
  const fresh = screen(rgb15(3, 9, 5));
  const edge = 120;
  const out = drawerPass(old, fresh, edge);
  const at = (x, y) => out[y * WIDTH + x];
  assert.equal(at(10, edge - FRONT_H - 1), rgb15(3, 9, 5));
  assert.equal(at(0, edge - FRONT_H), rgb15(27, 28, 30));
  assert.equal(at(0, edge - 1), rgb15(1, 1, 2));
  assert.ok((at(10, edge) & 31) < 20, 'shadow darkens the title');
  assert.ok((at(10, edge) & 31) < (at(10, edge + SHADOW_H - 1) & 31), 'shadow fades line by line');
  assert.equal(at(10, edge + SHADOW_H), rgb15(20, 20, 20));
  assert.deepEqual(drawerPass(old, fresh, HEIGHT + FRONT_H), fresh);
  assert.deepEqual(drawerPass(old, fresh, 0), old);
});
