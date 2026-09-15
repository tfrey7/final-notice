// The attract intro's nine voiced lines (docs/shots/item-2279/intro-script.md), acted by Chatterbox
// in each character's cast voice and crushed through their SNES chain. Nothing here is in the game.
//
//   node tools/intro-voices.mjs <out dir>
//
// Chatterbox takes its voice from the character's Kokoro sample-line take, docker cp'd into its
// container (voice cast recipe, Traps). A take is kept in assets/voice/intro and never re-asked; a
// take longer than its line's allowance is retaken up to TRIES times and the shortest kept.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digitize, parseWav, renderLine, voiceOf } from '../src/snes/audio/voice.mjs';
import { take, takePath } from './voice.mjs';
import { wav } from './snes-render.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHATTERBOX = process.env.FINAL_NOTICE_CHATTERBOX_URL ?? 'http://127.0.0.1:8937/speak';
const WHISPER = process.env.FINAL_NOTICE_WHISPER_URL ?? 'http://127.0.0.1:8939/transcribe';
const CONTAINER = process.env.CHATTERBOX_CONTAINER ?? 'jarvis-voice-chatterbox-1';
const REF_DIR = '/tmp/final-notice-intro-refs';
const TRIES = 3;

// shot, the script's second marks for the shot and for the line, and how hard Chatterbox acts it.
export const INTRO_LINES = [
  { shot: 1, shotS: 10, who: 'ward', text: 'Mrs. Kemp. Agency for the Recently Deceased. This is your Final Notice.', lineS: 4.5, exaggeration: 0.5 },
  { shot: 1, shotS: 10, who: 'kemp', text: 'Oh. I was only resting my eyes.', lineS: 2, exaggeration: 0.6 },
  { shot: 2, shotS: 7, who: 'mercer', text: "Pink copy's yours. The one thing you can take with you.", lineS: 3.5, exaggeration: 0.5 },
  { shot: 3, shotS: 8, who: 'ward', text: 'Served, nine fifty-two. Next address.', lineS: 2.5, exaggeration: 0.4 },
  { shot: 4, shotS: 10, who: 'mercer', text: "Another sack back from the tower. Every one of them 'still at work'.", lineS: 4, exaggeration: 0.6 },
  { shot: 4, shotS: 10, who: 'ward', text: "The dead don't go to work, Frank. It isn't permitted.", lineS: 3, exaggeration: 0.5 },
  { shot: 5, shotS: 10, who: 'supervisor', text: 'Nobody on this floor is dead. Back to work.', lineS: 3, exaggeration: 0.7 },
  { shot: 7, shotS: 10, who: 'mercer', text: 'Somebody ought to go up there and hand them over in person.', lineS: 3.5, exaggeration: 0.5 },
  { shot: 7, shotS: 10, who: 'ward', text: 'Somebody will.', lineS: 1, exaggeration: 0.6 },
];

export const clipName = (line) => `shot${line.shot}-${line.who}${INTRO_LINES.filter((l) => l.shot === line.shot && l.who === line.who).length > 1 ? `-${INTRO_LINES.indexOf(line)}` : ''}`;

// Seconds the line sounds in game: the digitized sample played at the character's pitch.
export function spokenSeconds(who, takeData) {
  const v = voiceOf(who);
  return digitize(who, takeData).pcm.length / (v.rate * 2 ** (v.pitch / 12));
}

async function act(line) {
  const res = await fetch(CHATTERBOX, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: line.text, ref: `..${REF_DIR}/${line.who}.wav`, exaggeration: line.exaggeration, cfg_weight: 0.3 }),
  });
  if (!res.ok) throw new Error(`Chatterbox answered ${res.status}: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function heard(bytes) {
  const res = await fetch(WHISPER, { method: 'POST', body: bytes });
  if (!res.ok) return `(whisper ${res.status})`;
  const body = await res.text();
  try {
    return JSON.parse(body).text?.trim() ?? body;
  } catch {
    return body.trim();
  }
}

if (process.argv[1]?.endsWith('intro-voices.mjs')) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: node tools/intro-voices.mjs <out dir>');
  mkdirSync(out, { recursive: true });
  const takes = join(ROOT, 'assets', 'voice', 'intro');
  mkdirSync(takes, { recursive: true });
  execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  const refs = new Set();
  const rows = [];
  for (const line of INTRO_LINES) {
    const name = clipName(line);
    const path = join(takes, `${name}.wav`);
    if (!existsSync(path)) {
      if (!refs.has(line.who)) {
        const { sample } = voiceOf(line.who);
        await take(line.who, sample);
        execFileSync('docker', ['cp', takePath(line.who, sample), `${CONTAINER}:${REF_DIR}/${line.who}.wav`]);
        refs.add(line.who);
      }
      let best = null;
      for (let i = 0; i < TRIES; i++) {
        const bytes = await act(line);
        const s = spokenSeconds(line.who, parseWav(bytes));
        if (!best || s < best.s) best = { bytes, s };
        if (s <= line.lineS * 1.15) break;
      }
      writeFileSync(path, best.bytes);
    }
    const takeData = parseWav(readFileSync(path));
    const clip = wav(renderLine(line.who, takeData));
    writeFileSync(join(out, `${name}.wav`), clip);
    const s = spokenSeconds(line.who, takeData);
    const said = await heard(clip);
    rows.push({ name, shot: line.shot, who: line.who, text: line.text, seconds: Number(s.toFixed(2)), allowance: line.lineS, said });
    console.log(name.padEnd(16), `${s.toFixed(2)} s of ${line.lineS} s`, JSON.stringify(said));
  }
  for (const shot of [...new Set(INTRO_LINES.map((l) => l.shot))]) {
    const lines = rows.filter((r) => r.shot === shot);
    const total = lines.reduce((n, r) => n + r.seconds, 0);
    console.log(`shot ${shot}: ${total.toFixed(2)} s of speech in a ${INTRO_LINES.find((l) => l.shot === shot).shotS} s shot`);
  }
  writeFileSync(join(out, 'lengths.json'), JSON.stringify(rows, null, 2));
  execFileSync('docker', ['exec', CONTAINER, 'rm', '-rf', REF_DIR]);
}
