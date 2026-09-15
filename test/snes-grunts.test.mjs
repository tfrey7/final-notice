import test from 'node:test';
import assert from 'node:assert/strict';
import { BIG_DAMAGE, COOLDOWN, PER_FRAME, createGrunter, gruntMoments, gruntSnapshot } from '../src/snes/audio/grunts.mjs';

const sounds = (moments) => moments.map((m) => `${m.who}:${m.sound}`);

test('a hit, a big hit, a launch, a knockdown, a death and a heavy swing each read as their sound', () => {
  const fighters = [
    { id: 1, kind: 'associate', hp: 6, state: 'idle' },
    { id: 2, kind: 'supervisor', hp: 6, state: 'idle' },
    { id: 3, kind: 'manager', hp: 6, state: 'idle' },
    { id: 4, kind: 'counsel', hp: 6, state: 'idle' },
    { id: 5, kind: 'vellum', boss: true, hp: 2, state: 'guard' },
    { id: 6, kind: 'associate', hp: 6, state: 'walk' },
    { id: 7, team: 'player', hp: 8, state: 'idle' },
  ];
  const before = gruntSnapshot(fighters);
  Object.assign(fighters[0], { hp: 5, state: 'hurt' });
  Object.assign(fighters[1], { hp: 6 - BIG_DAMAGE, state: 'hurt' });
  Object.assign(fighters[2], { hp: 4, state: 'knockdown', juggle: true });
  Object.assign(fighters[3], { hp: 4, state: 'knockdown' });
  Object.assign(fighters[4], { hp: 0, state: 'knockdown' });
  fighters[5].state = 'windup';
  Object.assign(fighters[6], { hp: 7, state: 'hurt' });
  const whoOf = (f) => (f.team === 'player' ? 'ward' : f.kind);
  assert.deepEqual(sounds(gruntMoments(before, fighters, whoOf)), ['associate:hurt', 'supervisor:big', 'manager:big', 'counsel:knockdown', 'vellum:death', 'associate:effort', 'ward:hurt']);
  assert.deepEqual(gruntMoments(gruntSnapshot(fighters), fighters, whoOf), [], 'nothing new, nothing said');
});

test('a fighter with no voice makes no sound', () => {
  const fighters = [{ id: 1, kind: 'clerk', hp: 3 }];
  const before = gruntSnapshot(fighters);
  fighters[0].hp = 2;
  assert.deepEqual(gruntMoments(before, fighters, () => null), []);
});

test('a combo grunts on most hits but a fighter cools down between grunts', () => {
  const grunt = createGrunter(() => 0);
  let said = 0;
  for (let f = 0; f < 60; f += 6) said += grunt([{ id: 1, who: 'associate', sound: 'hurt' }], f).length;
  assert.equal(said, Math.ceil(60 / (Math.ceil(COOLDOWN.hurt / 6) * 6)));
  assert.ok(said >= 3, `${said} grunts in a second of blows`);
  assert.equal(grunt([{ id: 1, who: 'associate', sound: 'knockdown' }], 61).length, 1, 'a knockdown cry ignores the cooldown');
});

test('never the same variation twice in a row', () => {
  const grunt = createGrunter(() => 0);
  let last = null;
  for (let f = 0; f < 20; f++) {
    const [s] = grunt([{ id: 1, who: 'ward', sound: 'hurt' }], f * 100);
    assert.notEqual(s.grunt, last);
    last = s.grunt;
  }
});

test('never over the character\'s own voice line, and one sound per fighter a frame, loudest first', () => {
  const grunt = createGrunter(() => 0);
  assert.equal(grunt([{ id: 1, who: 'mercer', sound: 'hurt' }], 0, { talking: (who) => who === 'mercer' }).length, 0);
  const [s] = grunt([{ id: 2, who: 'manager', sound: 'hurt' }, { id: 2, who: 'manager', sound: 'death' }], 0);
  assert.equal(s.sound, 'death');
  const crowd = [1, 2, 3, 4].map((id) => ({ id: 10 + id, who: 'associate', sound: 'hurt' }));
  assert.equal(grunt(crowd, 50).length, PER_FRAME);
});

test('a sound with no baked variation is skipped', () => {
  const grunt = createGrunter(() => 0);
  assert.equal(grunt([{ id: 1, who: 'ward', sound: 'hurt' }], 0, { has: () => false }).length, 0);
  const [s] = grunt([{ id: 1, who: 'ward', sound: 'hurt' }], 100, { has: (id) => id.endsWith('-2') });
  assert.equal(s.grunt, 'ward-hurt-2');
});
