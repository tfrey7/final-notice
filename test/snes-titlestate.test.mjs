import test from 'node:test';
import assert from 'node:assert/strict';
import { INTRO_FRAMES } from '../src/snes/lights.mjs';
import {
  ATTRACT_AFTER, ATTRACT_FADE, CONFIRM_HOLD, PROMPT_AT, SETTLED, fadeLevel, newTitle, promptLevel, titleTick,
} from '../src/snes/titlestate.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });
const idle = pad();

test('PUSH START shows one second after the logo lands and pulses 15 to 9 and back each second', () => {
  assert.equal(SETTLED, INTRO_FRAMES);
  assert.equal(PROMPT_AT, SETTLED + 60);
  assert.equal(promptLevel(PROMPT_AT - 1), null);
  assert.equal(promptLevel(PROMPT_AT), 15);
  assert.equal(promptLevel(PROMPT_AT + 30), 9);
  assert.equal(promptLevel(PROMPT_AT + 60), 15);
  const levels = Array.from({ length: 60 }, (_, i) => promptLevel(PROMPT_AT + i));
  assert.equal(Math.min(...levels), 9);
  assert.equal(Math.max(...levels), 15);
  for (let i = 1; i < 60; i++) assert.ok(Math.abs(levels[i] - levels[i - 1]) <= 1, `a step at ${i}`);
});

test('Start during the lights-out or the logo press jumps straight to the settled title', () => {
  for (const at of [0, 100, SETTLED - 1]) {
    const t = titleTick(newTitle(at), pad('start'));
    assert.equal(t.event, 'skip');
    assert.equal(t.frame, SETTLED);
    assert.equal(t.confirm, null);
  }
  assert.equal(titleTick(newTitle(10), pad('a')).event, null);
});

test('Start on the settled title confirms, holds six frames, then enters the menu', () => {
  let t = titleTick(newTitle(SETTLED), pad('start'));
  assert.equal(t.event, 'confirm');
  const events = [];
  for (let i = 0; i < CONFIRM_HOLD; i++) events.push((t = titleTick(t, pad('start'))).event);
  assert.deepEqual(events, [null, null, null, null, null, 'enter']);
});

test('twenty idle seconds after the logo settles fade to the attract loop; a press resets the count', () => {
  let t = newTitle(SETTLED);
  for (let i = 0; i < ATTRACT_AFTER - 1; i++) t = titleTick(t, idle);
  assert.equal(t.fade, null);
  t = titleTick(t, pad('b'));
  assert.equal(t.idle, 0);
  for (let i = 0; i < ATTRACT_AFTER - 1; i++) t = titleTick(t, idle);
  t = titleTick(t, idle);
  assert.equal(t.event, 'fading');
  const events = [];
  for (let i = 0; i < ATTRACT_FADE; i++) events.push((t = titleTick(t, idle)).event);
  assert.equal(events.at(-1), 'attract');
  assert.equal(events.filter(Boolean).length, 1);
});

test('the reveal does not count as idle, and a press during the fade keeps the title', () => {
  let t = newTitle(0);
  for (let i = 0; i < SETTLED; i++) t = titleTick(t, idle);
  assert.equal(t.idle, 0);
  t = { ...newTitle(SETTLED), fade: 10 };
  t = titleTick(t, pad('a'));
  assert.equal(t.fade, null);
  assert.equal(t.event, null);
});

test('the attract fade runs the screen from full brightness to black', () => {
  assert.equal(fadeLevel(null), 15);
  assert.equal(fadeLevel(0), 15);
  assert.equal(fadeLevel(ATTRACT_FADE), 0);
  assert.ok(fadeLevel(ATTRACT_FADE / 2) > 0 && fadeLevel(ATTRACT_FADE / 2) < 15);
});
