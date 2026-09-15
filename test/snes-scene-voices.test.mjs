import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AUDITORS, SCENES, SCENE_ORDER } from '../src/story/script.mjs';
import { allVoiceLines, sceneVoiceLines } from '../src/story/voicelines.mjs';
import { cinemaPages, FRAMES_PER_LETTER, letters } from '../src/story/cinema.mjs';
import { lineFrames, loadSceneVoices, lineDef, SCENE_VOICE } from '../src/snes/audio/scenevoices.mjs';
import { castNames, takeFile } from '../src/snes/audio/voice.mjs';
import { takePath, numerals } from '../tools/voice.mjs';

const fromDisk = async (name) => new Uint8Array(readFileSync(new URL(`../assets/voice/takes/${name}`, import.meta.url)));

test('every cutscene beat is a voice line in a cast voice', () => {
  for (const scene of SCENE_ORDER) {
    for (const auditor of AUDITORS) {
      const lines = sceneVoiceLines(scene, auditor);
      assert.equal(lines.length, SCENES[scene].beats.length);
      for (const line of lines) {
        assert.ok(castNames().includes(line.who), `${line.who} is cast`);
        assert.ok(line.text.length > 0);
      }
    }
  }
  const auditorBeat = sceneVoiceLines('assignment', 'mercer')[2];
  assert.equal(auditorBeat.who, 'mercer');
  assert.equal(auditorBeat.text, 'So we go and get him.');
  assert.equal(sceneVoiceLines('assignment', 'ward')[2].text, 'Then his notice is overdue.');
});

test('the takes a cutscene needs are recorded, both auditors', async () => {
  const lines = allVoiceLines();
  assert.equal(lines.length, 21);
  for (const line of lines) assert.ok(existsSync(takePath(line.who, line.text)), `${line.who}: ${line.text}`);
});

test('each beat speaks on the cinema voice for as long as its line lasts', async () => {
  await loadSceneVoices('incident', 'ward', fromDisk);
  for (const line of sceneVoiceLines('incident', 'ward')) {
    const frames = lineFrames(line);
    assert.ok(frames > 20, `${line.who} says "${line.text}" in ${frames} frames`);
    assert.equal(lineDef(line).voice, SCENE_VOICE);
  }
  assert.equal(lineFrames({ who: 'ward', text: 'never recorded' }), 0);
  assert.equal(lineDef({ who: 'ward', text: 'never recorded' }), null);
});

test("a beat's text stays up at least as long as its line", async () => {
  await loadSceneVoices('documents', 'mercer', fromDisk);
  const pages = cinemaPages('documents', 'mercer');
  for (const line of sceneVoiceLines('documents', 'mercer')) {
    const typing = pages.filter((p) => p.beat === line.beat).reduce((n, p) => n + letters(p) * FRAMES_PER_LETTER, 0);
    assert.ok(lineFrames(line) >= typing * 0.5, `${line.text}: ${lineFrames(line)} frames of speech, ${typing} of typing`);
  }
});

test('a number said in words reads back as the digits Whisper writes', () => {
  assert.deepEqual(numerals(['forty', 'seven', 'lifetimes']), ['47', 'lifetimes']);
  assert.deepEqual(numerals(['nine', 'fifty', 'two']), ['9', '52']);
  assert.deepEqual(numerals(['the', 'tower']), ['the', 'tower']);
});

test('a take file is named the same in the game as on disk', async () => {
  const line = sceneVoiceLines('assignment', 'ward')[0];
  assert.ok(takePath(line.who, line.text).endsWith(await takeFile(line.who, line.text)));
});
