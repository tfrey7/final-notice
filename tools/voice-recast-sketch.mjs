// Recast sketches (item 2329): each speaking character's most-heard lines as today's Kokoro take and as
// a Chatterbox take in the same cast voice, both through the character's SNES chain, so Tim can pick
// per character who moves to Chatterbox. Nothing here is wired into the game.
//
//   node tools/voice-recast-sketch.mjs <out dir> [<who> ...]
//
// Writes <who>-today.wav and <who>-chatterbox.wav (the lines one after another), raw takes under
// <out>/takes and lengths.json with each line's seconds and what Whisper heard. Today's take is the
// committed one when the game has it; a line the game never voiced gets a fresh Kokoro take in <out>.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseWav, renderLine, takeSpeed, voiceOf } from '../src/snes/audio/voice.mjs';
import { spokenSeconds } from './intro-voices.mjs';
import { kokoroTakePath } from './voice.mjs';
import { wav } from './snes-render.mjs';

const KOKORO = process.env.FINAL_NOTICE_KOKORO_URL ?? 'http://127.0.0.1:8936/speak';
const CHATTERBOX = process.env.FINAL_NOTICE_CHATTERBOX_URL ?? 'http://127.0.0.1:8937/speak';
const WHISPER = process.env.FINAL_NOTICE_WHISPER_URL ?? 'http://127.0.0.1:8939/transcribe';
const CONTAINER = process.env.CHATTERBOX_CONTAINER ?? 'jarvis-voice-chatterbox-1';
const REF_DIR = '/tmp/final-notice-recast-refs';
const GAP_S = 0.5;
// Chatterbox fumbles short lines about half the time, so a take Whisper misreads is retaken.
const TRIES = 4;

// [text, how hard Chatterbox acts it]: fight lines first (their most frequent moments), then cutscenes.
export const SKETCH = {
  ward: [['Objection!', 0.5], ['Case closed.', 0.4], ['Room cleared.', 0.4], ['Not like this...', 0.7]],
  mercer: [['Cute.', 0.5], ['Sit down.', 0.5], ['Well. That was fun.', 0.5], ['Oh, perfect...', 0.6]],
  vellum: [['Your claim is denied.', 0.7], ['Sign here, please.', 0.6], ['My file... they lost my file...', 1.0], ['The original records were destroyed in the incident.', 0.5]],
  bellwether: [['He died on Tuesday. They still have him at his desk.', 0.5], ['Bring it to me. Nobody else.', 0.6], ['Get yourself out. With the ledger if you can.', 0.7], ['You did your job. Now let me do mine. Bring me the ledger.', 0.6]],
  tuesday: [['Forty-seven lifetimes. I helped build it.', 0.8], ["Please... I only filed the forms. Don't leave me here!", 1.0]],
  associate: [['Take a number!', 0.9], ["You're on hold!", 0.8], ['Hey!', 0.5], ['Not on my shift!', 1.0]],
  supervisor: [['Per my last email.', 0.6], ['Back to your desk.', 0.7], ['Hmph.', 0.6], ['Unacceptable.', 0.9]],
  manager: [["Let's circle back.", 0.6], ["You're being let go.", 0.7], ['Hrm.', 0.6], ['This... will be... escalated.', 1.0]],
  counsel: [['See you in court.', 0.7], ['Read the fine print.', 0.6], ['Objection!', 0.8], ["I'll sue...", 0.5]],
};

const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').trim().split(/\s+/);
export const readsBack = (text, said) => words(text).join(' ') === words(said).join(' ');

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text()}`);
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

async function today(who, text, raw, name) {
  if (existsSync(kokoroTakePath(who, text))) return readFileSync(kokoroTakePath(who, text));
  const path = join(raw, `${name}-kokoro.wav`);
  if (!existsSync(path)) {
    const v = voiceOf(who);
    writeFileSync(path, await post(KOKORO, { text, voice: v.voice, speed: takeSpeed(v) }));
  }
  return readFileSync(path);
}

function reel(renders) {
  const gap = Math.round(renders[0].sampleRate * GAP_S);
  const n = renders.reduce((s, r) => s + r.left.length + gap, 0);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  let at = 0;
  for (const r of renders) {
    left.set(r.left, at);
    right.set(r.right, at);
    at += r.left.length + gap;
  }
  return { left, right, sampleRate: renders[0].sampleRate };
}

if (process.argv[1]?.endsWith('voice-recast-sketch.mjs')) {
  const [out, ...only] = process.argv.slice(2);
  if (!out) throw new Error('usage: node tools/voice-recast-sketch.mjs <out dir> [<who> ...]');
  const raw = join(out, 'takes');
  mkdirSync(raw, { recursive: true });
  execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  const rows = [];
  for (const [who, lines] of Object.entries(SKETCH)) {
    if (only.length && !only.includes(who)) continue;
    execFileSync('docker', ['cp', kokoroTakePath(who, voiceOf(who).sample), `${CONTAINER}:${REF_DIR}/${who}.wav`]);
    const sides = { today: [], chatterbox: [] };
    for (const [i, [text, exaggeration]] of lines.entries()) {
      const name = `${who}-${i}`;
      const old = parseWav(await today(who, text, raw, name));
      const actedPath = join(raw, `${name}-chatterbox.wav`);
      if (!existsSync(actedPath)) {
        for (let t = 0; t < TRIES; t++) {
          const bytes = await post(CHATTERBOX, { text, ref: `..${REF_DIR}/${who}.wav`, exaggeration, cfg_weight: 0.3 });
          if (t === 0 || readsBack(text, await heard(wav(renderLine(who, parseWav(bytes)))))) writeFileSync(actedPath, bytes);
          if (readsBack(text, await heard(wav(renderLine(who, parseWav(readFileSync(actedPath))))))) break;
        }
      }
      const acted = parseWav(readFileSync(actedPath));
      const actedRender = renderLine(who, acted);
      sides.today.push(renderLine(who, old));
      sides.chatterbox.push(actedRender);
      const said = await heard(wav(actedRender));
      const row = { who, text, exaggeration, todayS: Number(spokenSeconds(who, old).toFixed(2)), chatterboxS: Number(spokenSeconds(who, acted).toFixed(2)), said, readsBack: readsBack(text, said) };
      rows.push(row);
      console.log(who.padEnd(11), `${row.todayS}s -> ${row.chatterboxS}s`, JSON.stringify(text), 'heard', JSON.stringify(row.said));
    }
    for (const [side, renders] of Object.entries(sides)) writeFileSync(join(out, `${who}-${side}.wav`), wav(reel(renders)));
  }
  writeFileSync(join(out, 'lengths.json'), JSON.stringify(rows, null, 2));
  execFileSync('docker', ['exec', CONTAINER, 'rm', '-rf', REF_DIR]);
}
