// Speaks a line in a cast member's voice (src/snes/audio/voice.mjs): the Kokoro take is recorded
// once into assets/voice/takes (the local Kokoro on 127.0.0.1:8936, or FINAL_NOTICE_KOKORO_URL),
// then digitized for the S-DSP and written as a 32 kHz WAV. A take already on disk is never re-asked.
//
//   node tools/voice.mjs <character> "<line>" <out.wav>
//   node tools/voice.mjs --sheet <dir>      every cast member saying their sample line
//   node tools/voice.mjs --barks <dir>      each fighter's brawl barks, one WAV per character
//   node tools/voice.mjs --cast             the cast and their settings
//   node tools/voice.mjs --partners [<dir>] bakes Ward and Mercer's fight lines (src/snes/barks.mjs)
//                                           into src/snes/audio/barks-brr.mjs, and writes <who>-barks.wav reels

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { castNames, digitize, parseWav, renderLine, takeKey, takePrefix, takeSpeed, voiceOf } from '../src/snes/audio/voice.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { allLines } from '../src/snes/barks.mjs';
import { BARKS, barkLines } from '../src/snes/audio/barks.mjs';
import { pack } from './snes-bank.mjs';
import { wav } from './snes-render.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const KOKORO = process.env.FINAL_NOTICE_KOKORO_URL ?? 'http://127.0.0.1:8936/speak';
const CHATTERBOX = process.env.FINAL_NOTICE_CHATTERBOX_URL ?? 'http://127.0.0.1:8937/speak';
const WHISPER = process.env.FINAL_NOTICE_WHISPER_URL ?? 'http://127.0.0.1:8939/transcribe';
const CONTAINER = process.env.CHATTERBOX_CONTAINER ?? 'jarvis-voice-chatterbox-1';
const REF_DIR = '/tmp/final-notice-voice-refs';
// Chatterbox fumbles short lines about half the time, so a take Whisper misreads is retaken.
const TRIES = 4;

const fileFor = (v, text) => join(ROOT, 'assets', 'voice', 'takes', `${takePrefix(v)}-${createHash('sha1').update(takeKey(v, text)).digest('hex').slice(0, 10)}.wav`);

export const takePath = (who, text) => fileFor(voiceOf(who), text);
// The Kokoro take whoever acts the character; a Chatterbox character borrows its voice from the sample line's.
export const kokoroTakePath = (who, text) => fileFor({ ...voiceOf(who), actor: 'kokoro' }, text);

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function heard(bytes) {
  const res = await fetch(WHISPER, { method: 'POST', body: bytes });
  if (!res.ok) return `(whisper ${res.status})`;
  const body = await res.text();
  try {
    return JSON.parse(body).text?.trim() ?? body;
  } catch {
    return body.trim();
  }
}

const words = (s) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').trim().split(/\s+/);

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

// Whisper writes a number as digits however it was said, so both sides count as numbers first:
// "forty-seven" and "47" are the same word.
export function numerals(list) {
  const out = [];
  for (const w of list) {
    const n = TENS[w] ?? (ONES.includes(w) ? ONES.indexOf(w) : null);
    const last = Number(out.at(-1));
    if (n != null && n < 10 && last >= 20 && last <= 90 && last % 10 === 0) out[out.length - 1] = String(last + n);
    else out.push(n == null ? w : String(n));
  }
  return out;
}

export const readsBack = (text, said) => numerals(words(text)).join(' ') === numerals(words(said)).join(' ');

async function kokoroTake(who, text) {
  const path = kokoroTakePath(who, text);
  if (!existsSync(path)) {
    const v = voiceOf(who);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, await post(KOKORO, { text, voice: v.voice, speed: takeSpeed(v) }));
  }
  return path;
}

// A Chatterbox take of the line, retaken until Whisper hears it through the chain; the first take if none is.
async function act(who, text) {
  const v = voiceOf(who);
  const ref = await kokoroTake(who, v.sample);
  execFileSync('docker', ['exec', CONTAINER, 'mkdir', '-p', REF_DIR]);
  execFileSync('docker', ['cp', ref, `${CONTAINER}:${REF_DIR}/${who}.wav`]);
  let first = null;
  for (let t = 0; t < TRIES; t++) {
    const bytes = await post(CHATTERBOX, { text, ref: `..${REF_DIR}/${who}.wav`, exaggeration: v.exaggeration, cfg_weight: 0.3 });
    first ??= bytes;
    if (readsBack(text, await heard(wav(renderLine(who, parseWav(bytes)))))) return bytes;
  }
  return first;
}

export async function take(who, text) {
  const path = takePath(who, text);
  if (!existsSync(path)) {
    if (voiceOf(who).actor !== 'chatterbox') await kokoroTake(who, text);
    else writeFileSync(path, await act(who, text));
  }
  return parseWav(readFileSync(path));
}

// A brawl line as the game plays it: the BRR sample, the note that sounds it at the character's pitch
// and how many frames it lasts there.
export function bakeBark(who, takeData) {
  const v = voiceOf(who);
  const s = digitize(who, takeData);
  const midi = 60 + v.pitch;
  const frames = Math.ceil((s.pcm.length / (DSP_HZ * (261.6256 / s.rootHz) * 2 ** (v.pitch / 12))) * 60) + 2;
  return { midi, frames, rootHz: Number(s.rootHz.toFixed(4)), brr: pack(s.brr) };
}

async function bakeBarks(dir) {
  const rows = [];
  const reels = {};
  let bytes = 0;
  for (const line of allLines()) {
    const t = await take(line.who, line.text);
    const b = bakeBark(line.who, t);
    bytes += (b.brr.length * 3) / 4;
    rows.push(`  '${line.id}': { text: ${JSON.stringify(line.text)}, midi: ${b.midi}, frames: ${b.frames}, rootHz: ${b.rootHz}, brr: '${b.brr}' },`);
    if (dir) {
      const r = renderLine(line.who, t);
      writeFileSync(join(dir, `${line.id}.wav`), wav(r));
      (reels[line.who] ??= []).push(r);
    }
    console.log(line.id.padEnd(18), JSON.stringify(line.text), `${b.frames} frames`);
  }
  const head = '// Generated by tools/voice.mjs --partners from the Kokoro takes in assets/voice/takes, digitized in each\n// partner\'s cast voice. Each brr string is 9-byte BRR blocks: shift<<4 | filter<<2, then 16 nibbles.\n\nexport default {\n';
  writeFileSync(join(ROOT, 'src', 'snes', 'audio', 'barks-brr.mjs'), `${head}${rows.join('\n')}\n};\n`);
  for (const [who, parts] of Object.entries(reels)) {
    const gap = Math.round(DSP_HZ * 0.25);
    const len = parts.reduce((n, p) => n + p.left.length + gap, 0);
    const left = new Float32Array(len);
    const right = new Float32Array(len);
    let at = 0;
    for (const p of parts) {
      left.set(p.left, at);
      right.set(p.right, at);
      at += p.left.length + gap;
    }
    writeFileSync(join(dir, `${who}-barks.wav`), wav({ left, right, sampleRate: DSP_HZ }));
  }
  console.log('total', Math.round(bytes), 'B');
}

if (process.argv[1]?.endsWith('voice.mjs')) {
  const [first, ...rest] = process.argv.slice(2);
  if (first === '--cast') {
    for (const who of castNames()) {
      const { name, notes, sample, echo, fir, ...settings } = voiceOf(who);
      console.log(`${who}: ${name} (${notes}) ${JSON.stringify(settings)}`);
    }
  } else if (first === '--sheet') {
    mkdirSync(rest[0], { recursive: true });
    for (const who of castNames()) {
      const out = join(rest[0], `${who.replace(':', '-')}.wav`);
      writeFileSync(out, wav(renderLine(who, await take(who, voiceOf(who).sample))));
      console.log(out, JSON.stringify(voiceOf(who).sample));
    }
  } else if (first === '--partners') {
    if (rest[0]) mkdirSync(rest[0], { recursive: true });
    await bakeBarks(rest[0]);
  } else if (first === '--barks') {
    mkdirSync(rest[0], { recursive: true });
    const gap = new Float32Array(Math.round(32000 * 0.2));
    for (const who of Object.keys(BARKS)) {
      const parts = [];
      for (const { text } of barkLines().filter((l) => l.who === who)) parts.push(renderLine(who, await take(who, text)), { left: gap, right: gap });
      const glue = (side) => Float32Array.from(parts.flatMap((p) => [...p[side]]));
      const out = join(rest[0], `${who}.wav`);
      writeFileSync(out, wav({ left: glue('left'), right: glue('right'), sampleRate: 32000 }));
      console.log(out);
    }
  } else if (first && rest.length === 2) {
    writeFileSync(rest[1], wav(renderLine(first, await take(first, rest[0]))));
    console.log(rest[1]);
  } else {
    console.error(`usage: node tools/voice.mjs <character> "<line>" <out.wav> | --sheet <dir> | --cast | --partners [<dir>]\ncast: ${castNames().join(', ')}`);
    process.exit(1);
  }
}
