import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { screen } from '../src/snes/fx.mjs';
import { SEAL, FLOOR_Y } from '../src/stage2/greatseal.mjs';
import { BURST_FRAMES, CARD, REST_SCALE, burstSize, headY, mosaicRect, pressDrop, pressTexture, shadowHalf, stampScale, titleCard } from '../src/snes/stage2/seal.mjs';

const stampAt = (t) => ({ x: 120, y: FLOOR_Y, shadow: SEAL.shadow[0], t });

test('the press hangs small through the shadow, swells to full size as it lands and lifts back', () => {
  const s = SEAL.shadow[0];
  assert.equal(stampScale(null), REST_SCALE);
  assert.equal(stampScale(stampAt(0)), REST_SCALE);
  assert.equal(stampScale(stampAt(s - 9)), REST_SCALE);
  let last = REST_SCALE;
  for (let t = s - 8; t <= s; t++) {
    const k = stampScale(stampAt(t));
    assert.ok(k > last || t === s - 8, `grows at ${t}`);
    last = k;
  }
  assert.equal(stampScale(stampAt(s)), 1);
  assert.equal(stampScale(stampAt(s + SEAL.slam * 2 - 1)), 1);
  assert.ok(stampScale(stampAt(s + SEAL.slam * 2 + 4)) < 1);
  assert.equal(stampScale(stampAt(s + SEAL.slam * 3)), REST_SCALE);
});

test('the swell is eased: the last frames before impact grow the most', () => {
  const s = SEAL.shadow[0];
  const steps = [];
  for (let t = s - 7; t <= s; t++) steps.push(stampScale(stampAt(t)) - stampScale(stampAt(t - 1)));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1]);
});

test('the head lands exactly on the floor it stamps and never goes through it', () => {
  for (let t = 0; t < SEAL.shadow[0] + SEAL.slam * 3; t++) {
    const y = headY(stampAt(t));
    assert.ok(y <= FLOOR_Y, `frame ${t}`);
    assert.equal(pressDrop(stampAt(t)) === 1, y === FLOOR_Y);
  }
});

test('the shadow warns the whole shadow window and is gone once the head is down', () => {
  const s = SEAL.shadow[2];
  const stamp = (t) => ({ ...stampAt(t), shadow: s });
  assert.ok(shadowHalf(stamp(0)) > 0);
  assert.ok(shadowHalf(stamp(s - 1)) > shadowHalf(stamp(0)));
  assert.equal(shadowHalf(stamp(s)), 0);
});

test('a broken binding bursts to 16 px mosaic and settles within its frames', () => {
  assert.equal(burstSize(0), 1);
  assert.equal(Math.max(...Array.from({ length: BURST_FRAMES }, (_, i) => burstSize(i))), 16);
  assert.equal(burstSize(BURST_FRAMES), 0);
  const buf = screen();
  buf[10 * WIDTH + 10] = 7;
  mosaicRect(buf, 10, 10, 8, 8, 4);
  assert.equal(buf[13 * WIDTH + 13], 7);
  assert.equal(buf[14 * WIDTH + 14], 0);
  mosaicRect(buf, WIDTH - 3, HEIGHT - 3, 20, 20, 8);
});

test('the title card slides in, voices the line once with its subtitle, and leaves', () => {
  const frames = Array.from({ length: 400 }, (_, f) => titleCard(f));
  assert.equal(frames[0].slide, 1);
  assert.equal(frames[CARD.in].slide, 0);
  assert.equal(frames.filter((c) => c?.voice).length, 1);
  assert.ok(frames[CARD.voiceAt].subtitle);
  assert.equal(titleCard(CARD.in + CARD.hold + CARD.out), null);
});

test('the press texture is SNES colours with a transparent chamfer', () => {
  const tex = pressTexture();
  assert.equal(tex.px.length, tex.w * tex.h);
  assert.equal(tex.px[0], 0xffff);
  assert.ok([...tex.px].every((c) => c === 0xffff || c < 0x8000));
});
