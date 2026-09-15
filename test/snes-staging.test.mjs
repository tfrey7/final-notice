import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { isRgb15 } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { cinemaPages } from '../src/story/cinema.mjs';
import { paintPicture, snesWrap } from '../src/snes/cinema.mjs';
import { BILL_FRAMES, actorAt, billStep, stageFrame, stagePages } from '../src/snes/staging.mjs';

const scene1 = (who) => stagePages('assignment', cinemaPages('assignment', who, snesWrap), who);

test('Scene 1 opens on a wordless 4 s acting page, then the script word for word', () => {
  const raw = cinemaPages('assignment', 'ward', snesWrap);
  const staged = scene1('ward');
  assert.equal(staged.length, raw.length + 1);
  assert.ok(staged[0].acting);
  assert.equal(staged[0].frames, 240);
  assert.deepEqual(staged[0].lines, []);
  assert.deepEqual(staged[0].actors.map((a) => a.who), ['bellwether', 'ward']);
  assert.deepEqual(staged.slice(1).map((p) => p.lines), raw.map((p) => p.lines));
  assert.ok(staged.slice(1).every((p) => p.cut));
  assert.deepEqual(scene1('mercer')[0].actors.map((a) => a.who), ['bellwether', 'mercer']);
});

test('the music drops to the pad under the auditor line and comes back with the bill', () => {
  const staged = scene1('ward');
  const at = (text) => staged.find((p) => p.lines.join(' ').startsWith(text));
  assert.equal(at('He died on Tuesday.').music, 'pad');
  assert.equal(at("I read it.").music, 'scene');
  assert.equal(at("I read it.").fx, 'bill');
  assert.equal(at("I read it.").portrait, null);
  assert.equal(at('If they lean').fx, 'lamp');
  const last = staged[staged.length - 1];
  assert.equal(last.portrait, null);
  assert.ok(last.fadeAfter > 0);
  assert.equal(stagePages('incident', cinemaPages('incident', 'ward', snesWrap), 'ward')[0].acting, undefined);
});

test('actors ease between keyframes and take the pose of the last key passed', () => {
  const keys = [[0, 100, 140, 'front'], [10, 200, 140, 'front'], [20, 200, 140, 'back']];
  assert.deepEqual(actorAt(keys, 0), { x: 100, feet: 140, pose: 'front' });
  assert.deepEqual(actorAt(keys, 5), { x: 150, feet: 140, pose: 'front' });
  assert.equal(actorAt(keys, 20).pose, 'back');
  assert.deepEqual(actorAt(keys, 99), { x: 200, feet: 140, pose: 'back' });
  const turn = scene1('ward').at(-1).actors[0].keys;
  assert.equal(actorAt(turn, 0).pose, 'front');
  assert.equal(actorAt(turn, 90).pose, 'back');
});

test('the bill slides toward the camera in 8 frames, growing', () => {
  assert.ok(billStep(0).w < billStep(BILL_FRAMES).w);
  assert.ok(billStep(0).x > billStep(BILL_FRAMES).x);
  assert.ok(!billStep(BILL_FRAMES - 1).done);
  assert.ok(billStep(BILL_FRAMES).done);
});

test('staged frames paint SNES colours; the lamp only brightens its own side', () => {
  const page = scene1('ward').find((p) => p.fx === 'lamp');
  const plain = paintPicture(screen(), page);
  const lit = stageFrame(paintPicture(screen(), page), page, 0);
  assert.ok(lit.every(isRgb15));
  const i = (y, x) => y * WIDTH + x;
  assert.notEqual(lit[i(96, 200)], plain[i(96, 200)]);
  assert.equal(lit[i(30, 40)], plain[i(30, 40)]);
  const acting = scene1('ward')[0];
  const empty = paintPicture(screen(), acting);
  const acted = stageFrame(paintPicture(screen(), acting), acting, 0);
  assert.notEqual(acted[i(70, 58)], empty[i(70, 58)]);
});
