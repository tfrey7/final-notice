import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  END_AT, FADE_AT, NAME, SHINE_FROM, SPARKLE_AT, WIPE_FRAMES,
  letterCells, opensWithSplash, ovalPixels, paintSplash, splashLevel, splashLogo, splashStep, sparkleR, wipeEdge, wordmark,
} from '../src/snes/splash.mjs';
import { channels } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { WIDTH } from '../src/snes/screen.mjs';

const pad = (...buttons) => ({ pressed: new Set(buttons) });
const q = (s) => new URLSearchParams(s);

test('the wordmark spells celeryman.ai in lower case and fits inside its oval on screen', () => {
  assert.equal(NAME, 'celeryman.ai');
  assert.equal(NAME, NAME.toLowerCase());
  const oval = ovalPixels();
  assert.ok(oval.length > 200);
  assert.ok(oval.every(([x, y]) => x >= 0 && x < WIDTH && y >= 0 && y < 224));
  const { w } = letterCells();
  const tex = wordmark();
  assert.ok(tex.w > w * 2 && tex.w < WIDTH, `wordmark is ${tex.w} px wide`);
  assert.ok(tex.px.some((c) => c !== 0xffff));
});

test('the logo holds at full brightness, then fades through every level to black before the intro', () => {
  assert.equal(splashLevel(0), 15);
  assert.equal(splashLevel(FADE_AT - 1), 15);
  const levels = Array.from({ length: END_AT - FADE_AT }, (_, i) => splashLevel(FADE_AT + i));
  assert.deepEqual([...new Set(levels)], Array.from({ length: 16 }, (_, i) => 15 - i));
  assert.equal(splashLevel(END_AT - 1), 0);
  assert.ok(FADE_AT >= 120, 'the logo holds about two seconds');
});

test('any button skips the splash; otherwise it runs to its end', () => {
  for (const b of ['start', 'a', 'b', 'select', 'l']) assert.equal(splashStep(40, pad(b)).event, 'skip');
  assert.deepEqual(splashStep(5, pad()), { frame: 6, event: null });
  assert.equal(splashStep(END_AT - 1, pad()).event, 'end');
});

test('the badge wipes on behind a lit edge, is whole by the end of the wipe, and glints once', () => {
  const tex = splashLogo();
  const left = (256 - tex.w) >> 1;
  assert.ok(wipeEdge(0) < left);
  assert.ok(wipeEdge(WIPE_FRAMES) > left + tex.w);
  const lit = (f) => paintSplash(f, screen()).reduce((n, c) => n + (c ? 1 : 0), 0);
  assert.ok(lit(8) > 0 && lit(8) < lit(WIPE_FRAMES) / 2, 'a part of the badge at frame 8');
  assert.equal(lit(WIPE_FRAMES), lit(FADE_AT - 1));
  assert.equal(sparkleR(SPARKLE_AT - 1), 0);
  assert.ok(sparkleR(SPARKLE_AT + 8) > 0);
  assert.equal(sparkleR(SHINE_FROM), 0);
});

test('the wordmark is red, the way Tim asked', () => {
  const settled = paintSplash(FADE_AT - 1, screen()).filter((c) => c);
  const reds = Array.from(settled, (c) => channels(c));
  assert.ok(reds.every(([r, g, b]) => r >= g && r >= b), 'every colour leads on red');
  assert.ok(reds.some(([r, g, b]) => r > 24 && g < 12 && b < 12), 'a bright red in there');
});

test('the splash plays on every bare boot and ?go=splash, never on a boot that names a screen', () => {
  assert.equal(opensWithSplash(q('snes')), true);
  assert.equal(opensWithSplash(q('snes&go=splash')), true);
  assert.equal(opensWithSplash(q('snes&go=stage1')), false);
  assert.equal(opensWithSplash(q('snes&go=opening')), false);
  assert.equal(opensWithSplash(q('snes&t=40')), false);
});
