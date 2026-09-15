import test from 'node:test';
import assert from 'node:assert/strict';
import { VELLUM } from '../src/stage1/vellum.mjs';
import { BOSS_STOP, CARD_TIMES, FANG_RED, bossHitStop, cardFrame, fangFlash } from '../src/snes/stage1/boss.mjs';

test('the title card drops in, is stamped, speaks, holds and leaves in order', () => {
  const { drop, stamp, voice, hold, leave } = CARD_TIMES;
  assert.ok(drop < stamp && stamp < voice && voice < hold && hold < leave);
  assert.equal(cardFrame(0).rise, 1);
  assert.equal(cardFrame(drop).rise, 0);
  assert.equal(cardFrame(stamp - 1).stamped, false);
  assert.equal(cardFrame(stamp).stampNow, true);
  assert.equal(cardFrame(voice).voiceNow, true);
  assert.equal(cardFrame(voice - 1).subtitle, false);
  assert.equal(cardFrame(hold - 1).subtitle, true);
  assert.equal(cardFrame(leave - 1).done, false);
  assert.equal(cardFrame(leave).done, true);
  assert.equal(cardFrame(leave).rise, -1);
});

test('the stamp and the voice each fire on exactly one frame', () => {
  const frames = Array.from({ length: CARD_TIMES.leave + 10 }, (_, t) => cardFrame(t));
  assert.equal(frames.filter((f) => f.stampNow).length, 1);
  assert.equal(frames.filter((f) => f.voiceNow).length, 1);
});

test('the red flash only shows once his fangs are out at half health', () => {
  const v = { fangs: false, hp: VELLUM.hp, state: 'guard' };
  for (let f = 0; f < 120; f++) assert.equal(fangFlash(v, f), null);
  Object.assign(v, { hp: VELLUM.fangsAt + 1, fangs: true });
  assert.equal(fangFlash(v, 0), null, 'above half, no flash even if flagged');
  Object.assign(v, { hp: VELLUM.fangsAt, state: 'fangs' });
  assert.equal(fangFlash(v, 0), FANG_RED);
  assert.equal(fangFlash(v, 2), null);
  v.state = 'guard';
  const lit = Array.from({ length: 120 }, (_, f) => fangFlash(v, f)).filter(Boolean).length;
  assert.ok(lit > 0 && lit < 30);
  v.hp = 0;
  assert.equal(fangFlash(v, 0), null, 'no flash once beaten');
});

test('his landed rush or sweep and his fall hold the fight longer', () => {
  const p = { hp: 6 };
  const world = { hitStop: 4 };
  assert.equal(bossHitStop(world, { state: 'rush', hp: 10 }, 10, 8, p), BOSS_STOP.hit);
  assert.equal(bossHitStop(world, { state: 'guard', hp: 10 }, 10, 8, p), 4);
  assert.equal(bossHitStop(world, { state: 'sweep', hp: 10 }, 10, 6, p), 4);
  assert.equal(bossHitStop(world, { state: 'down', hp: 0 }, 1, 6, p), BOSS_STOP.down);
  assert.equal(bossHitStop({ hitStop: 30 }, { state: 'down', hp: 0 }, 1, 6, p), 30);
});
