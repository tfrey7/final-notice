import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { areaProblems } from '../src/snes/bgart.mjs';
import { hudLayout, hudBoxes, inScreen } from '../src/snes/hud.mjs';
import { createStage } from '../src/stage2/areas.mjs';
import { TILE } from '../src/stage2/physics.mjs';
import { STAGE2, backdropFor, bodySize, camera, hudState, onScreen } from '../src/snes/stage2/view.mjs';

test('the stage 2 scale draws the 32-unit body 40 px tall, the Contra III size', () => {
  assert.equal(STAGE2.scale, 1.25);
  assert.deepEqual(bodySize(), { w: 20, h: 40 });
});

test('the camera stays inside the scaled strip and keeps the auditor on screen', () => {
  const run = createStage('ward');
  for (const x of [0, 400, 1200, 2000, run.area.width - 8]) {
    run.player.x = x;
    run.camX = Math.max(0, Math.min(run.area.width - 256, x - 112));
    const cam = camera(run);
    assert.ok(cam.x >= 0 && cam.x + WIDTH <= Math.round(run.area.width * STAGE2.scale), `x ${x}`);
    const feet = Math.round(run.player.y * STAGE2.scale) - cam.y;
    assert.ok(feet > bodySize().h && feet <= HEIGHT, `feet at ${feet}`);
    const sx = Math.round(x * STAGE2.scale) - cam.x;
    assert.ok(sx >= 0 && sx <= WIDTH, `auditor at ${sx}`);
  }
});

test('neighbouring tiles meet edge to edge at any scale', () => {
  const cam = { x: 37, y: 11 };
  for (const s of [1, 1.15, 1.25, 1.5]) {
    const a = onScreen(cam, s, 3 * TILE, 0, TILE, TILE);
    const b = onScreen(cam, s, 4 * TILE, 0, TILE, TILE);
    assert.equal(a.x + a.w, b.x, `scale ${s}`);
  }
});

test('every area has a parallax backdrop without the painted play layer, within SNES limits', () => {
  for (let i = 0; i < 4; i++) {
    const area = backdropFor(i);
    assert.deepEqual(areaProblems(area), [], `area ${i + 1}`);
    assert.ok(area.scene.layers.some((l) => l.bg === 2), `area ${i + 1} has BG2 shelving`);
    assert.ok(!area.scene.layers.some((l) => l.bg === 1), `area ${i + 1} leaves BG1 to the logic`);
  }
});

test('the HUD shows both enchantments in hand and fits the screen', () => {
  const run = createStage('ward');
  run.carried = ['notice', 'redTape'];
  run.hand = 1;
  const layout = hudLayout(hudState(run, { lives: 3 }));
  assert.deepEqual(layout.enchant.map((e) => [e.icon, e.held]), [['notice', false], ['redTape', true]]);
  assert.ok(hudBoxes(layout).every(inScreen));
});
