import test from 'node:test';
import assert from 'node:assert/strict';
import { basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { BARKS, CHANCE, GAP, REST, barkLines, barkMoments, createBarker, snapshot } from '../src/snes/audio/barks.mjs';
import { ACTING, actingOf, parseWav, renderLine, takeFile } from '../src/snes/audio/voice.mjs';
import { takePath } from '../tools/voice.mjs';

test('each moment is acted at its own emotion, and a hit or a death is bigger than a taunt', () => {
  for (const who of Object.keys(BARKS)) {
    const dial = (moment) => actingOf(who, moment).exaggeration;
    assert.ok(dial('hurt') > dial('taunt'), `${who} yelps harder than he sneers`);
    assert.ok(dial('death') > dial('taunt'), `${who} dies bigger than he sneers`);
    assert.ok(actingOf(who, 'death').cfg < actingOf(who, 'taunt').cfg, `${who} dies looser than he sneers`);
    for (const moment of Object.keys(ACTING)) assert.ok(dial(moment) <= 1.4, `${who} ${moment} stays in range`);
  }
  assert.equal(actingOf('associate', 'nothing').exaggeration, actingOf('associate').exaggeration);
});

test('each enemy type has two or three grunts, two taunts and a death cry; Vellum hurt, taunt and defeat', () => {
  for (const who of ['associate', 'supervisor', 'manager', 'counsel']) {
    assert.ok(BARKS[who].hurt.length >= 2 && BARKS[who].hurt.length <= 3, who);
    assert.equal(BARKS[who].taunt.length, 2, who);
    assert.equal(BARKS[who].death.length, 1, who);
  }
  for (const moment of ['hurt', 'taunt', 'death']) assert.ok(BARKS.vellum[moment].length, moment);
});

test('every bark has its take recorded, named the same in the browser as by the tool, and sounds', async () => {
  for (const { who, text, moment } of barkLines()) {
    const path = takePath(who, text, moment);
    assert.equal(await takeFile(who, text, moment), basename(path), text);
    assert.ok(existsSync(path), `${who} "${text}" take recorded`);
    const { left } = renderLine(who, parseWav(readFileSync(path)));
    const peak = left.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    assert.ok(peak > 0.05 && peak < 1, `${who} "${text}" peaks at ${peak}`);
  }
});

test('the game loads every bark by its take name and can play it', async () => {
  const { loadBarks, playBark } = await import('../src/snes/audio/barkplayer.mjs');
  const loaded = await loadBarks((name) => readFileSync(new URL(`../assets/voice/takes/${name}`, import.meta.url)));
  assert.equal(loaded.size, barkLines().length);
  assert.ok(playBark({ who: 'manager', text: BARKS.manager.taunt[0] }));
  assert.equal(playBark({ who: 'manager', text: 'Not a line.' }), false);
});

test("enemy barks keep a voice of their own, clear of the partners' lines", async () => {
  const { FOE_BARK_VOICE } = await import('../src/snes/audio/barkplayer.mjs');
  const { BARK_VOICE } = await import('../src/snes/audio/player.mjs');
  assert.notEqual(FOE_BARK_VOICE, BARK_VOICE);
  assert.ok(FOE_BARK_VOICE >= 0 && FOE_BARK_VOICE < 6);
});

test('hit, finishing blow, a fresh taunt and a boss summon are each read as their bark', () => {
  const act = { kind: 'circle' };
  const fighters = [
    { id: 1, kind: 'associate', hp: 5, act },
    { id: 2, kind: 'counsel', hp: 1, act },
    { id: 3, kind: 'manager', hp: 6, act },
    { id: 4, kind: 'vellum', boss: true, hp: 20, state: 'guard' },
    { id: 5, team: 'player', hp: 8 },
  ];
  const before = snapshot(fighters);
  fighters[0].hp = 3;
  fighters[1].hp = 0;
  fighters[2].act = { kind: 'taunt', t: 0 };
  fighters[3].state = 'summon';
  fighters[4].hp = 4;
  assert.deepEqual(barkMoments(before, fighters).map((m) => `${m.who}:${m.moment}`), ['associate:hurt', 'counsel:death', 'manager:taunt', 'vellum:taunt']);
  assert.deepEqual(barkMoments(snapshot(fighters), fighters), [], 'a taunt already under way says nothing more');
});

test('no character says the same bark twice in a row', () => {
  const bark = createBarker(() => 0);
  let last = null;
  for (let i = 0; i < 20; i++) {
    const [said] = bark([{ who: 'supervisor', moment: 'taunt' }], i * 1000);
    assert.notEqual(said.text, last);
    last = said.text;
  }
});

test('nobody talks over a line, a type rests between lines, and a death cry skips the rest', () => {
  const frames = () => 30;
  const bark = createBarker(() => 0);
  assert.equal(bark([{ who: 'associate', moment: 'hurt' }, { who: 'counsel', moment: 'hurt' }], 0, { frames }).length, 1);
  assert.equal(bark([{ who: 'counsel', moment: 'hurt' }], 30 + GAP - 1, { frames }).length, 0);
  assert.equal(bark([{ who: 'counsel', moment: 'hurt' }], 30 + GAP, { frames }).length, 1);
  const at = 60 + 2 * GAP;
  assert.equal(bark([{ who: 'associate', moment: 'hurt' }], at, { frames }).length, 0, 'still resting');
  assert.equal(bark([{ who: 'associate', moment: 'death' }], at, { frames }).length, 1);
  assert.ok(bark.speaking(at + 29) && !bark.speaking(at + 30));
  assert.equal(bark([{ who: 'manager', moment: 'taunt' }], at + 500, { frames, busy: true }).length, 0, 'the partner is talking');
  assert.equal(bark([{ who: 'associate', moment: 'hurt' }], at + 30 + REST, { frames }).length, 1);
});

test('the dice keep most grunts and taunts unsaid', () => {
  let seed = 7;
  const bark = createBarker(() => (seed = (seed * 16807) % 2147483647) / 2147483647);
  let said = 0;
  for (let f = 0; f < 3600; f++) said += bark([{ who: ['associate', 'supervisor', 'manager'][f % 3], moment: 'hurt' }], f, { frames: () => 40 }).length;
  assert.ok(said > 0 && said <= 3 * Math.ceil(3600 / REST), `a minute of blows, ${said} grunts`);
  assert.ok(CHANCE.hurt < 0.5 && CHANCE.taunt < 1);
});

test('enemy voice lines play dry, with no stage echo', async () => {
  const { barkDef, loadBarks } = await import('../src/snes/audio/barkplayer.mjs');
  await loadBarks((name) => readFileSync(new URL(`../assets/voice/takes/${name}`, import.meta.url)));
  const [[inst]] = barkDef({ who: 'counsel', text: BARKS.counsel.taunt[0] }).layers[0].steps;
  assert.equal(inst.echo, false);
});
