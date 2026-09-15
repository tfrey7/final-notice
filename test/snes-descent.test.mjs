import test from 'node:test';
import assert from 'node:assert/strict';
import { channels, hex, rgb15 } from '../src/snes/color.mjs';
import { HEIGHT, WIDTH } from '../src/snes/screen.mjs';
import { bakeScene, composeFrame, driftLuts, sceneProblems } from '../src/snes/layers.mjs';
import { buildArea } from '../src/snes/kit/area.mjs';
import CLAIMS from '../src/snes/bg/claims.mjs';
import CLAIMS2 from '../src/snes/bg/claims2.mjs';
import { AREAS as ARCHIVE } from '../src/snes/bg/archive.mjs';
import { AREAS as DISPOSAL } from '../src/snes/bg/disposal.mjs';
import { CARD } from '../src/snes/stage1/boss.mjs';
import { SLIP } from '../src/snes/entrance.mjs';
import { ANCHORS, BAND_PALETTES, palettesAt } from '../src/snes/kit/palettes.mjs';
import { CHECKPOINTS, SCREENS } from '../src/flow.mjs';
import {
  BEATS, BOSSES, DRIFT_SLOTS, MAX_DRIFT_BANDS, MAX_DRIFT_SLOTS, descentAt, descentOf, driftTable, slotAt, timedDrift,
} from '../src/snes/descent.mjs';

test('every screen and every stage area names its descent, rising along the arc', () => {
  const beats = [...SCREENS.filter((s) => s !== 'gameover' && !s.startsWith('stage')), ...CHECKPOINTS.stage1, ...CHECKPOINTS.stage2];
  for (const b of beats) assert.ok(b in BEATS, `${b} has a beat`);
  const arc = ['scene1', ...CHECKPOINTS.stage1, 'scene2', ...CHECKPOINTS.stage2, 'scene3'];
  for (let i = 1; i < arc.length; i++) assert.ok(BEATS[arc[i]][0] >= BEATS[arc[i - 1]][1], `${arc[i]} starts no lower than ${arc[i - 1]} ends`);
  assert.deepEqual([descentAt('title'), descentAt('stage1-area2'), descentAt('stage1-area2', 1), descentAt('scene3')], [0, 8, 18, 100]);
  assert.equal(descentAt('ending', 1), 0, 'the walk out drains to 0');
  assert.deepEqual(Object.keys(BOSSES).map((b) => descentAt(b)), [35, 65, 85]);
  assert.equal(descentOf({ screen: 'stage2', checkpoint: 'stage2-area2' }, 0.5), 56);
  assert.equal(descentOf({ screen: 'gameover', checkpoint: 'stage1-area5' }), 35, 'game over keeps the fallen beat');
  assert.throws(() => descentAt('nowhere'), RangeError);
});

test('the SNES area modules and boss cards carry their beat', () => {
  assert.deepEqual([...CLAIMS.areas, ...CLAIMS2.areas].map((a) => a.descent), [0, 8, 20, 30, 35]);
  assert.deepEqual([...ARCHIVE, ...DISPOSAL].map((a) => a.descent), [40, 50, 65, 78, 84, 85]);
  assert.deepEqual([CARD.descent, SLIP.descent], [35, 75]);
});

test('a slot lerps between the anchors either side, snapped to 5 bits a channel', () => {
  const a = [[10, rgb15(0, 0, 0)], [52, rgb15(31, 10, 20)], [90, rgb15(31, 31, 31)]];
  assert.equal(slotAt(a, 0), a[0][1]);
  assert.equal(slotAt(a, 100), a[2][1]);
  assert.equal(slotAt(a, 52), a[1][1]);
  assert.deepEqual(channels(slotAt(a, 31)), [16, 5, 10]);
  assert.deepEqual(channels(slotAt(a, 71)), [31, 21, 26]);
  for (let d = 0; d <= 100; d++) channels(slotAt(a, d)).forEach((v) => assert.ok(Number.isInteger(v) && v >= 0 && v <= 31));
  const pal = BAND_PALETTES.corporate[2][9];
  const anchors = Object.entries(ANCHORS).map(([band, at]) => [at, BAND_PALETTES[band][2][9]]);
  assert.equal(slotAt(anchors, 40), palettesAt(40)[2][9], 'the kit palettes agree slot by slot');
  assert.equal(slotAt(anchors, 3), pal);
});

test('the drift table rewrites at most 4 slots in 6 bands, the top a few points further along', () => {
  const table = driftTable({ d: 55 });
  assert.equal(table.length, MAX_DRIFT_BANDS);
  assert.equal(table.reduce((n, [lines]) => n + lines, 0), HEIGHT);
  for (const [lines, writes] of table) {
    assert.ok(lines >= 1 && lines <= 127);
    assert.equal(writes.length, DRIFT_SLOTS.length);
    assert.ok(writes.length <= MAX_DRIFT_SLOTS);
  }
  const top = palettesAt(59);
  const floor = palettesAt(55);
  assert.deepEqual(table[0][1], DRIFT_SLOTS.map(({ pal, slot }) => [pal, slot, top[pal][slot - 1]]));
  assert.deepEqual(table.at(-1)[1], DRIFT_SLOTS.map(({ pal, slot }) => [pal, slot, floor[pal][slot - 1]]));
  assert.notDeepEqual(table[0][1], table.at(-1)[1]);
  assert.deepEqual(driftTable({ d: 100 })[0][1], driftTable({ d: 100 }).at(-1)[1], 'clamped at the top of the arc');
  assert.throws(() => driftTable({ d: 10, slots: [...DRIFT_SLOTS, DRIFT_SLOTS[0]] }), RangeError);
  assert.throws(() => driftTable({ d: 10, bands: 7 }), RangeError);
});

test('a kit area carries its drift, and the compositor draws the top band further along', () => {
  const desc = { name: 'probe', descent: 55, cols: 40, fixtures: [64] };
  const scene = buildArea(desc);
  assert.deepEqual(sceneProblems(scene), []);
  assert.deepEqual(scene.drift, driftTable({ d: 55 }));
  const luts = driftLuts(scene);
  const [p, s, top] = scene.drift[0][1][0];
  assert.equal(luts[0][p * 16 + s], hex(top) + 1);
  assert.equal(luts[HEIGHT - 1][p * 16 + s], hex(scene.palettes[p][s - 1]) + 1);
  const drifted = composeFrame(scene, bakeScene(scene), 0, 0);
  const flat = composeFrame({ ...scene, drift: undefined }, bakeScene({ ...scene, drift: undefined }), 0, 0);
  assert.equal(drifted.length, flat.length);
  assert.notDeepEqual(drifted.subarray(0, WIDTH * 37 * 4), flat.subarray(0, WIDTH * 37 * 4), 'the top band differs');
  const last = (HEIGHT - 20) * WIDTH * 4;
  assert.deepEqual(drifted.subarray(last), flat.subarray(last), 'the bottom band is the scene at d');
});

test('the timed drifts: RETENTION 35 to 38 in a second, the Seal 95 to 100', () => {
  assert.deepEqual([0, 30, 60, 90].map((f) => timedDrift('retention', f)), [35, 37, 38, 38]);
  assert.deepEqual([0, 120].map((f) => timedDrift('sealDefeat', f)), [95, 100]);
});
