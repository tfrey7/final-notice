// Every spoken line of the three story cutscenes, one row per beat, as the chosen auditor hears it.
// The cinema wraps a long line onto a second page, but the take is the whole beat, so the rows are
// beats and the player speaks one on the beat's first page.
import { AUDITORS, SCENES, SCENE_ORDER, lineFor } from './script.mjs';

export function sceneVoiceLines(sceneId, auditor) {
  return SCENES[sceneId].beats.map((beat, n) => ({
    scene: sceneId,
    beat: n,
    who: beat.speaker === 'auditor' ? auditor : beat.speaker,
    text: lineFor(beat, auditor),
  }));
}

// Every take the cutscenes need: each beat once per auditor it can be spoken by.
export function allVoiceLines() {
  const out = [];
  const seen = new Set();
  for (const scene of SCENE_ORDER) {
    for (const auditor of AUDITORS) {
      for (const line of sceneVoiceLines(scene, auditor)) {
        const key = `${line.who}|${line.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(line);
      }
    }
  }
  return out;
}
