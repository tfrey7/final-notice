// Records every line of the three story cutscenes in its character's cast voice, the way
// tools/intro-voices.mjs records the attract intro: Chatterbox acts the line, the character's SNES
// chain crushes it, and Whisper reads it back. Takes live in assets/voice/takes, so the game fetches
// the same file (src/snes/audio/scenevoices.mjs); a take already on disk is never re-asked.
//
//   node tools/scene-voices.mjs <out dir>          every take, one WAV each plus a reel per scene
//   node tools/scene-voices.mjs <out dir> scene2   one scene only

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderLine } from '../src/snes/audio/voice.mjs';
import { DSP_HZ } from '../src/snes/audio/spc.mjs';
import { SCENE_IDS } from '../src/story/cinema.mjs';
import { AUDITORS } from '../src/story/script.mjs';
import { allVoiceLines, sceneVoiceLines } from '../src/story/voicelines.mjs';
import { heard, readsBack, take } from './voice.mjs';
import { spokenSeconds } from './intro-voices.mjs';
import { wav } from './snes-render.mjs';

export const lineName = (line) => `${line.scene}-${String(line.beat + 1).padStart(2, '0')}-${line.who}`;

// One reel of a scene as the chosen auditor hears it: every beat in order, a beat of room between them.
function reel(parts) {
  const gap = Math.round(DSP_HZ * 0.45);
  const len = parts.reduce((n, p) => n + p.left.length + gap, 0);
  const left = new Float32Array(len);
  const right = new Float32Array(len);
  let at = 0;
  for (const p of parts) {
    left.set(p.left, at);
    right.set(p.right, at);
    at += p.left.length + gap;
  }
  return { left, right, sampleRate: DSP_HZ };
}

if (process.argv[1]?.endsWith('scene-voices.mjs')) {
  const out = process.argv[2];
  if (!out) throw new Error('usage: node tools/scene-voices.mjs <out dir> [<scene>]');
  const only = process.argv[3] ? SCENE_IDS[process.argv[3]] ?? process.argv[3] : null;
  mkdirSync(out, { recursive: true });
  const rows = [];
  const rendered = new Map();
  for (const line of allVoiceLines()) {
    if (only && line.scene !== only) continue;
    const takeData = await take(line.who, line.text);
    const r = renderLine(line.who, takeData);
    rendered.set(`${line.who}|${line.text}`, r);
    const clip = wav(r);
    const name = lineName(line);
    writeFileSync(join(out, `${name}.wav`), clip);
    const said = await heard(clip);
    const seconds = Number(spokenSeconds(line.who, takeData).toFixed(2));
    const ok = readsBack(line.text, said);
    rows.push({ name, scene: line.scene, beat: line.beat, who: line.who, text: line.text, seconds, said, readsBack: ok });
    console.log(name.padEnd(26), `${seconds.toFixed(2)} s`, ok ? 'ok  ' : 'MISREAD', JSON.stringify(said));
  }
  for (const [key, scene] of Object.entries(SCENE_IDS)) {
    if (only && scene !== only) continue;
    for (const auditor of AUDITORS) {
      const parts = sceneVoiceLines(scene, auditor).map((l) => rendered.get(`${l.who}|${l.text}`)).filter(Boolean);
      if (parts.length) writeFileSync(join(out, `${scene}-${auditor}.wav`), wav(reel(parts)));
    }
  }
  const bad = rows.filter((r) => !r.readsBack);
  console.log(`${rows.length} lines, ${rows.length - bad.length} read back word for word`);
  for (const r of bad) console.log('  misread:', r.name, JSON.stringify(r.text), '->', JSON.stringify(r.said));
  writeFileSync(join(out, 'lines.json'), JSON.stringify(rows, null, 2));
}
