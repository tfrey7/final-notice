import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capLabel, capWidth, drawCap, drawPrompt, isButton, measurePrompt } from '../src/snes/prompt.mjs';
import { inputDevice } from '../src/controls.mjs';
import { rgb15 } from '../src/snes/color.mjs';

const canvas = () => {
  const px = new Map();
  return { px, fill: (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px.set(`${i},${j}`, c); } };
};

test('a cap names the SNES button on a pad and the bound key on the keyboard', () => {
  assert.deepEqual(['Y', 'X', 'A', 'B', 'L', 'R', 'START', 'JUMP'].map((k) => capLabel(k, 'gamepad')), ['Y', 'X', 'A', 'B', 'L', 'R', 'START', 'B']);
  assert.deepEqual(['Y', 'X', 'A', 'B', 'L', 'R', 'START', 'JUMP'].map((k) => capLabel(k, 'keyboard')), ['Z', 'V', 'C', 'X', 'Q', 'E', 'ENTER', 'X']);
  assert.equal(capLabel('DOWN+Y', 'keyboard'), 'DOWN+Z');
  assert.equal(capLabel('DAZED', 'keyboard'), 'DAZED');
  assert.ok(isButton('DOWN+X') && !isButton('DAZED'));
});

test('a cap is as wide as it draws, and the keyboard one wears a darker side', () => {
  for (const device of ['keyboard', 'gamepad']) {
    const { px, fill } = canvas();
    const w = drawCap(fill, 'START', 0, 0, { device });
    assert.equal(w, capWidth('START', device));
    assert.equal(Math.max(...[...px.keys()].map((k) => +k.split(',')[0])) + 1, w);
  }
  const key = canvas();
  drawCap(key.fill, 'A', 0, 0, { device: 'keyboard' });
  const pad = canvas();
  drawCap(pad.fill, 'A', 0, 0, { device: 'gamepad' });
  assert.notEqual(key.px.get('0,5'), pad.px.get('0,5'));
});

test('a prompt measures what it draws, caps and words alike', () => {
  for (const device of ['keyboard', 'gamepad']) {
    const text = '[START] RESUME   [Y] FILE AWAY';
    const { fill } = canvas();
    assert.equal(drawPrompt(fill, text, 0, 1, { device }), measurePrompt(text, device));
  }
  assert.ok(measurePrompt('PUSH [START]', 'keyboard') > measurePrompt('PUSH [START]', 'gamepad') - 1);
});

test('tone reaches every colour a prompt draws', () => {
  const { px, fill } = canvas();
  drawPrompt(fill, '[A] SIGN OUT FILE', 0, 1, { device: 'gamepad', tone: () => rgb15(1, 2, 3) });
  assert.deepEqual([...new Set(px.values())], [rgb15(1, 2, 3)]);
});

test('the shared device starts on the keyboard off the page', () => {
  assert.equal(inputDevice({}), 'keyboard');
});
