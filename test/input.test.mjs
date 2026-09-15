import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPad, updatePad, entered, keysToButtons, gamepadToButtons, scriptedButtons, DEMO_SCRIPT, DOUBLE_TAP_FRAMES, PADS, padFor,
} from '../src/input.mjs';
import { platformFor } from '../src/platform.mjs';
import { MAX_HITS, freeInjunction } from '../src/injunction.mjs';
import { player } from '../src/stage1/moves.mjs';
import { newFloor, stepFloor, tuneFor } from '../src/stage1/player.mjs';
import { STAGE1 } from '../src/stage1/tuning.mjs';
import { scaledTune } from '../src/snes/stage1/finisher.mjs';
import { snesTune, useSnesTables } from '../src/snes/fight.mjs';
import { createRun, stepRun } from '../src/stage2/core.mjs';
import { carry, inHand } from '../src/stage2/pickups.mjs';

const run = (frames) => frames.reduce((pad, down, f) => updatePad(pad, new Set(down), f), createPad());

test('pressed and released last one frame, held lasts while down', () => {
  let pad = updatePad(createPad(), new Set(['a']), 0);
  assert.deepEqual([pad.pressed.has('a'), pad.held.has('a')], [true, true]);
  pad = updatePad(pad, new Set(['a']), 1);
  assert.deepEqual([pad.pressed.has('a'), pad.held.has('a')], [false, true]);
  pad = updatePad(pad, new Set(), 2);
  assert.deepEqual([pad.released.has('a'), pad.held.has('a')], [true, false]);
  assert.equal(updatePad(pad, new Set(), 3).released.size, 0);
});

test('A+B chord fires once, on the frame the second button joins', () => {
  const chords = [['a'], ['a', 'b'], ['a', 'b'], ['b'], ['a', 'b']].map((_, i, all) => run(all.slice(0, i + 1)).chord);
  assert.deepEqual(chords, [false, true, false, false, true]);
  assert.equal(run([['a', 'b']]).chord, true);
});

test('a double tap left or right is a dash; slow taps are not', () => {
  assert.equal(run([['right'], [], ['right']]).dash, 'right');
  const slow = [['left'], ...Array(DOUBLE_TAP_FRAMES + 1).fill([]), ['left']];
  assert.equal(run(slow).dash, null);
  assert.equal(run([['left'], [], ['right']]).dash, null);
  assert.equal(run([['right'], [], ['right'], [], ['right']]).dash, null, 'a third tap starts a new pair');
});

test('press history spells a secret code', () => {
  const pad = run([['up'], [], ['up'], [], ['down'], ['down', 'b'], []]);
  assert.equal(entered(pad, ['up', 'up', 'down', 'b']), true);
  assert.equal(entered(pad, ['down', 'up']), false);
});

test('keyboard maps onto the NES pad as the plan says', () => {
  assert.deepEqual([...keysToButtons(['ArrowLeft', 'KeyD', 'KeyZ', 'KeyK', 'ShiftLeft', 'Enter', 'KeyQ'])].sort(),
    ['a', 'b', 'left', 'right', 'select', 'start']);
});

test('gamepad buttons and the left stick map onto the pad', () => {
  const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: [0, 2, 9, 12].includes(i), value: 0 }));
  assert.deepEqual([...gamepadToButtons({ buttons, axes: [0.9, 0.1] })].sort(), ['a', 'b', 'right', 'start', 'up']);
  assert.equal(gamepadToButtons(null).size, 0);
});

test('the plain page gets the NES pad and ?snes the SNES pad', () => {
  assert.equal(padFor(platformFor(new URLSearchParams(''))), PADS.nes);
  assert.equal(padFor(platformFor(new URLSearchParams('?snes&go=stage1'))), PADS.snes);
  assert.equal(createPad().layout, PADS.nes);
});

const snes = (frames) => frames.reduce((pad, down, f) => updatePad(pad, new Set(down), f), createPad(PADS.snes));

test('keyboard and gamepad map onto the SNES pad as SNES-PLAN section 4 says', () => {
  assert.deepEqual([...keysToButtons(['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyQ', 'KeyE', 'Enter', 'ArrowUp'], PADS.snes)].sort(),
    ['a', 'b', 'l', 'r', 'start', 'up', 'x', 'y']);
  const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: [0, 1, 2, 3, 4, 5, 9].includes(i), value: 0 }));
  assert.deepEqual([...gamepadToButtons({ buttons, axes: [-0.9, 0] }, PADS.snes)].sort(),
    ['a', 'b', 'l', 'left', 'r', 'start', 'x', 'y']);
});

test('SNES Y attacks and B jumps in the stages\' words; A, X, L and R are intents', () => {
  const y = snes([['y']]);
  assert.deepEqual([y.pressed.has('b'), y.pressed.has('a')], [true, false]);
  const b = snes([['b']]);
  assert.deepEqual([b.pressed.has('a'), b.pressed.has('b'), b.chord], [true, false, false]);
  assert.equal(snes([['a']]).chord, true, 'A alone is the injunction');
  assert.equal(snes([['a'], ['a']]).chord, false, 'once per press');
  assert.equal(snes([['a', 'b']]).chord, true);
  assert.equal(snes([['y', 'b']]).chord, false, 'no A+B chord on the SNES');
  assert.equal(snes([['a']]).special, true, 'A is the special on Stage 1');
  assert.equal(snes([['x']]).swap, true);
  assert.equal(snes([['x']]).heavy, true);
  assert.equal(snes([['y'], ['y', 'x']]).clear, true, 'Y then X a frame apart is the clear');
  assert.equal(snes([['y'], ['y', 'x']]).heavy, false);
  assert.equal(snes([['y'], [], [], [], [], ['x']]).clear, false, 'a slower light then heavy is not');
  assert.equal(snes([['select']]).swap, false, 'Select is unused in play');
  assert.deepEqual([snes([['l']]).step, snes([['r']]).step, snes([['l']]).parry], [0, -1, true]);
  assert.deepEqual([snes([['r'], ['r']]).aim, snes([['y']]).aim], [true, false]);
  assert.equal(snes([['right'], [], ['right']]).dash, null, 'no double-tap step');
  assert.equal(snes([['right'], [], ['right']]).run, 'right', 'the double tap is a run');
  assert.equal(run([['right'], [], ['right']]).run, undefined, 'the NES double tap stays a step');
});

test('Stage 1 on the SNES pad: right, release, right within 12 frames runs at the weighed runX', () => {
  useSnesTables();
  const tune = scaledTune(snesTune('ward'), STAGE1.scale);
  const world = newFloor('ward', tune);
  const frames = [['right'], ...Array(DOUBLE_TAP_FRAMES - 2).fill([]), ['right'], ['right'], ['right']];
  const xs = [];
  frames.reduce((pad, down, f) => {
    const next = updatePad(pad, new Set(down), f);
    stepFloor(world, next, tune);
    xs.push(player(world).x);
    return next;
  }, createPad(PADS.snes));
  assert.equal(player(world).state, 'run');
  assert.ok(tune.runX > tune.walkX);
  assert.ok(Math.abs(xs.at(-1) - xs.at(-2) - tune.runX) < 1e-9, 'moves at runX');
});

test('the NES pad keeps its double tap, A+B and Select and never answers SNES intents', () => {
  assert.equal(run([['select']]).swap, true);
  assert.deepEqual([run([['right'], [], ['right']]).step, run([['a']]).aim], [0, null]);
  assert.equal(updatePad(createPad(), new Set(['y', 'l', 'r', 'x'])).held.size, 0);
});

test('Stage 1 on the SNES pad: R steps back, Y and X together throw the injunction, A is the special', () => {
  const pressOn = (down, setup = () => {}) => {
    const tune = tuneFor('ward');
    const world = newFloor('ward', tune);
    setup(world);
    stepFloor(world, snes([down]), tune);
    return world;
  };
  const back = player(pressOn(['r']));
  assert.deepEqual([back.state, back.stepDir], ['step', -back.facing]);
  const turned = player(pressOn(['r'], (w) => { player(w).facing = -1; }));
  assert.deepEqual([turned.state, turned.stepDir], ['step', 1], 'back is away from the way the auditor faces');
  const tapped = newFloor('ward');
  ['right', null, 'right'].reduce((pad, b, f) => {
    const next = updatePad(pad, new Set(b ? [b] : []), f);
    stepFloor(tapped, next, tuneFor('ward'));
    return next;
  }, createPad(PADS.snes));
  assert.notEqual(player(tapped).state, 'step', 'no double-tap step');
  const cooled = (w) => { w.cooldown = freeInjunction(); };
  assert.ok(pressOn(['y', 'x'], cooled).events.includes('injunction'));
  assert.ok(!pressOn(['a'], cooled).events.includes('injunction'), 'A alone no longer clears the room');
  assert.equal(player(pressOn(['a'], cooled)).state, 'special');
});

test('Stage 2 on the SNES pad: X swaps, R held plants the feet, A alone throws the injunction', () => {
  const w = createRun('ward');
  carry(w, 'redTape');
  stepRun(w, snes([['x']]));
  assert.equal(inHand(w), 'redTape');

  const walk = (down) => {
    const r = createRun('ward');
    let pad = createPad(PADS.snes);
    for (let i = 0; i < 30; i++) stepRun(r, pad = updatePad(pad, new Set(i < 5 ? [] : down)));
    return r.player.x;
  };
  const start = createRun('ward').player.x;
  assert.ok(walk(['right']) > start + 10, 'walks');
  assert.ok(Math.abs(walk(['r', 'right']) - start) < 1, 'R held stands still to aim');

  const inj = createRun('ward');
  inj.meterHits = MAX_HITS;
  stepRun(inj, snes([['a']]));
  assert.ok(inj.events.some((e) => e.type === 'injunction'));
});

test('a demo script holds its buttons for their frames', () => {
  const script = [{ at: 10, hold: 2, buttons: ['start'] }];
  assert.deepEqual([9, 10, 11, 12].map((f) => scriptedButtons(script, f).has('start')), [false, true, true, false]);
  assert.equal(scriptedButtons(DEMO_SCRIPT, DEMO_SCRIPT[0].at).has('start'), true);
});
