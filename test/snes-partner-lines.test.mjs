import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BARKS, CHANCE, GAP, KINDS, REST, allLines, bark, barkKind, newBarker } from '../src/snes/barks.mjs';
import BAKED from '../src/snes/audio/barks-brr.mjs';
import { BARK_VOICE, barkEffect, barkFrames, compileSong, createSequencer } from '../src/snes/audio/player.mjs';
import { SFX } from '../src/snes/audio/sfx.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { takePath } from '../tools/voice.mjs';

test('every line is baked from a recorded take, and one partner fits the sound RAM', () => {
  const bytes = { ward: 0, mercer: 0 };
  for (const line of allLines()) {
    assert.equal(BAKED[line.id]?.text, line.text, `${line.id} baked`);
    assert.ok(existsSync(takePath(line.who, line.text)), `${line.id} take recorded`);
    assert.ok(barkFrames(line.id) > 10 && barkFrames(line.id) < 120, `${line.id} lasts ${barkFrames(line.id)} frames`);
    bytes[line.who] += (BAKED[line.id].brr.length * 3) / 4;
  }
  for (const who of Object.keys(bytes)) assert.ok(bytes[who] < 96 * 1024, `${who} lines are ${bytes[who]} bytes`);
});

test('a line holds voice 6 while punches take 7 and 8, and it sounds unclipped', () => {
  const seq = createSequencer();
  seq.play(compileSong({ tempo: 6, loop: 0, echo: { mvol: 70 }, instruments: { k: { sample: 'epiano' } }, v6: { inst: 'k', rows: 'C4 - - -' } }));
  assert.deepEqual(seq.sfx(barkEffect('ward-parry-0')), [BARK_VOICE]);
  assert.deepEqual(seq.sfx(SFX.hit), [7, 6]);
  assert.deepEqual(seq.sfx(SFX.punch), [7]);
  const n = Math.round(DSP_HZ * 0.4);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  seq.render(L, R, n);
  assert.equal(seq.owner(BARK_VOICE), 'sfx');
  let peak = 0;
  for (const x of L) peak = Math.max(peak, Math.abs(x));
  assert.ok(peak > 0.05 && peak < 1, `peak ${peak}`);
});

test('both partners have every kind of line, at least two each, and sound different', () => {
  for (const who of ['ward', 'mercer']) {
    assert.deepEqual(Object.keys(BARKS[who]), KINDS);
    for (const kind of KINDS) assert.ok(BARKS[who][kind].length >= 2, `${who} ${kind}`);
    assert.ok(BARKS[who].parry.includes('Objection!'));
  }
  const ward = new Set(Object.values(BARKS.ward).flat());
  const shared = Object.values(BARKS.mercer).flat().filter((t) => ward.has(t));
  assert.deepEqual(shared, ['Objection!']);
  assert.equal(new Set(allLines().map((l) => l.id)).size, allLines().length);
});

test('never the same line twice in a row, whatever the dice say', () => {
  for (const rand of [() => 0, () => 0.999, Math.random]) {
    const state = newBarker('mercer');
    let prev = null;
    for (let f = 0; f < 400; f++) {
      const id = bark(state, KINDS[f % KINDS.length], f * 200, { rand, roll: () => 0 });
      assert.ok(id);
      assert.notEqual(id, prev);
      prev = id;
    }
  }
});

test('a louder moment cuts in, a quieter one waits for the line to end and a breath after', () => {
  const state = newBarker('ward');
  const frames = () => 30;
  const roll = () => 0;
  assert.ok(bark(state, 'heavy', 0, { frames, roll }));
  assert.equal(bark(state, 'heavy', 10, { frames, roll }), null);
  assert.equal(bark(state, 'hurt', 5, { frames, roll })?.startsWith('ward-hurt'), true);
  assert.equal(bark(state, 'heavy', 20, { frames, roll }), null);
  assert.match(bark(state, 'ko', 21, { frames, roll }), /^ward-ko-/);
  assert.equal(bark(state, 'special', 51 + GAP - 1, { frames, roll }), null);
  assert.match(bark(state, 'heavy', 30 + REST.heavy, { frames, roll }), /^ward-heavy-/);
});

test('a string of parries or blows taken is not a chant', () => {
  const state = newBarker('ward');
  const frames = () => 30;
  const roll = () => 0;
  assert.match(bark(state, 'parry', 0, { frames, roll }), /^ward-parry-/);
  assert.equal(bark(state, 'parry', 200, { frames, roll }), null);
  assert.match(bark(state, 'hurt', 30 + GAP, { frames, roll }), /^ward-hurt-/);
  assert.match(bark(state, 'parry', 30 + REST.parry, { frames, roll }), /^ward-parry-/);
  assert.equal(REST.ko + REST.victory + REST.clear + REST.finisher, 0);
});

test('grunts are left to chance, big moments always spoken, and only big ones talk over a foe', () => {
  const state = newBarker('mercer');
  assert.equal(bark(state, 'heavy', 0, { roll: () => CHANCE.heavy }), null);
  for (const kind of ['finisher', 'clear', 'victory', 'ko']) assert.equal(CHANCE[kind], 1, kind);
  for (const kind of ['heavy', 'hurt']) assert.ok(CHANCE[kind] < 0.5, kind);
  assert.equal(bark(state, 'special', 0, { roll: () => 0, busy: true }), null);
  assert.match(bark(state, 'parry', 0, { roll: () => 0, busy: true }), /^mercer-parry-/);
});

test('the floor events pick the loudest thing to say', () => {
  assert.equal(barkKind(['hit', 'heavy']), 'heavy');
  assert.equal(barkKind(['heavy'], { hurt: true }), 'hurt');
  assert.equal(barkKind(['heavy', 'parry']), 'parry');
  assert.equal(barkKind(['special', 'hit']), 'special');
  assert.equal(barkKind(['heavy'], { finisher: true }), 'finisher');
  assert.equal(barkKind(['go']), 'clear');
  assert.equal(barkKind(['lifeLost', 'heavy'], { hurt: true }), 'ko');
  assert.equal(barkKind(['stageExit']), 'victory');
  assert.equal(barkKind(['punch', 'step']), null);
});
