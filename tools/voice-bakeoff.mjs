// A side-by-side voice acting test (item 2231): the same lines as today's Kokoro take and as a
// Chatterbox take that borrows the character's voice from their Kokoro sample line, each crushed
// through the character's SNES chain. Nothing here is wired into the game.
//
//   node tools/voice-bakeoff.mjs <out dir>
//
// Chatterbox (127.0.0.1:8937, FINAL_NOTICE_CHATTERBOX_URL) reads its reference clip from inside its
// container: the refs are docker cp'd to CHATTERBOX_REF_DIR in CHATTERBOX_CONTAINER, and `ref` is
// that path relative to the container's /refs.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseWav, renderLine, takeSpeed, voiceOf } from '../src/snes/audio/voice.mjs';
import { wav } from './snes-render.mjs';

const KOKORO = process.env.FINAL_NOTICE_KOKORO_URL ?? 'http://127.0.0.1:8936/speak';
const CHATTERBOX = process.env.FINAL_NOTICE_CHATTERBOX_URL ?? 'http://127.0.0.1:8937/speak';
const CONTAINER = process.env.CHATTERBOX_CONTAINER ?? 'jarvis-voice-chatterbox-1';
const REF_DIR = process.env.CHATTERBOX_REF_DIR ?? '/tmp/final-notice-refs';
const F5 = process.env.FINAL_NOTICE_F5_URL ?? 'http://127.0.0.1:8938/speak';
const F5_CONTAINER = process.env.F5_CONTAINER ?? 'jarvis-voice-f5-1';

// The recast enemy voices (voice cast recipe, item 2205) until that branch lands.
const RECAST = { associate: 'af_nova', supervisor: 'af_kore', counsel: 'bf_emma' };

export const LINES = [
  { who: 'ward', moment: 'parry', text: 'Objection!', exaggeration: 0.6 },
  { who: 'mercer', moment: 'knockdown', text: 'Oh, perfect...', exaggeration: 0.6 },
  { who: 'associate', moment: 'taunt', text: 'Take a number!', exaggeration: 0.9 },
  { who: 'manager', moment: 'death', text: 'This... will be... escalated.', exaggeration: 1.0 },
  { who: 'vellum', moment: 'threat', text: 'Your claim is denied.', exaggeration: 0.7 },
  { who: 'tuesday', moment: 'pleading', text: "Please... I only filed the forms. Don't leave me here!", exaggeration: 1.0 },
];

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

const kokoro = (who, text) => {
  const v = voiceOf(who);
  return post(KOKORO, { text, voice: RECAST[who] ?? v.voice, speed: takeSpeed(v) });
};

const writeRender = (path, who, bytes) => writeFileSync(path, wav(renderLine(who, parseWav(bytes))));

if (process.argv[1]?.endsWith('voice-bakeoff.mjs')) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: node tools/voice-bakeoff.mjs <out dir>');
  const raw = join(out, 'takes');
  mkdirSync(raw, { recursive: true });
  execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  for (const line of LINES) {
    const name = `${line.who}-${line.moment}`;
    const ref = join(raw, `${line.who}-ref.wav`);
    writeFileSync(ref, await kokoro(line.who, voiceOf(line.who).sample));
    execFileSync('docker', ['cp', ref, `${CONTAINER}:${REF_DIR}/${line.who}.wav`]);
    const said = await kokoro(line.who, line.text);
    writeFileSync(join(raw, `${name}-kokoro.wav`), said);
    writeRender(join(out, `${name}-kokoro.wav`), line.who, said);
    const acted = await post(CHATTERBOX, { text: line.text, ref: `..${REF_DIR}/${line.who}.wav`, exaggeration: line.exaggeration, cfg_weight: 0.3 });
    writeFileSync(join(raw, `${name}-chatterbox.wav`), acted);
    writeRender(join(out, `${name}-chatterbox.wav`), line.who, acted);
    if (process.argv.includes('--f5')) {
      const refText = join(raw, `${line.who}-ref.txt`);
      writeFileSync(refText, voiceOf(line.who).sample);
      execFileSync('docker', ['exec', F5_CONTAINER, 'mkdir', '-p', REF_DIR]);
      execFileSync('docker', ['cp', ref, `${F5_CONTAINER}:${REF_DIR}/${line.who}.wav`]);
      execFileSync('docker', ['cp', refText, `${F5_CONTAINER}:${REF_DIR}/${line.who}.txt`]);
      const f5 = await post(F5, { text: line.text, ref: `..${REF_DIR}/${line.who}.wav` });
      writeFileSync(join(raw, `${name}-f5.wav`), f5);
      writeRender(join(out, `${name}-f5.wav`), line.who, f5);
    }
    console.log(name, JSON.stringify(line.text));
  }
}
