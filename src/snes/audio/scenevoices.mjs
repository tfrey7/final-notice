// The cutscene lines in the browser: each beat's take is fetched from assets/voice/takes, digitized
// once in its character's cast voice, and played on its own S-DSP voice as the beat's text types out.
// The same takes tools/scene-voices.mjs records.
import { sceneVoiceLines } from '../../story/voicelines.mjs';
import { CHAIN, digitize, parseWav, takeFile, voiceOf } from './voice.mjs';
import { SAMPLES, sfxDef } from './player.mjs';

const TAKES = new URL('../../../assets/voice/takes/', import.meta.url);

// The cinema keeps voice 3 for the cast: the alarm, the buzz and the typing blips take the others.
export const SCENE_VOICE = 3;
const loaded = new Map();
const loading = new Map();

const key = ({ who, text }) => `${who}|${text}`;
const fetchTake = async (name) => new Uint8Array(await (await fetch(new URL(name, TAKES))).arrayBuffer());

// Every take one scene needs for one auditor. A take that will not load leaves its beat silent.
export function loadSceneVoices(sceneId, auditor, read = fetchTake) {
  const id = `${sceneId}|${auditor}`;
  loading.set(id, loading.get(id) ?? Promise.all(sceneVoiceLines(sceneId, auditor).map(async (line) => {
    try {
      loaded.set(key(line), digitize(line.who, parseWav(await read(await takeFile(line.who, line.text)))));
    } catch {
      // silent beat
    }
  })).then(() => loaded));
  return loading.get(id);
}

// Frames the line sounds for, 0 when its take did not load.
export function lineFrames(line) {
  const sample = loaded.get(key(line));
  if (!sample) return 0;
  const { pitch, rate } = voiceOf(line.who);
  return Math.ceil((sample.pcm.length / (rate * 2 ** (pitch / 12))) * 60) + 6;
}

// The line as a sound, with the cast chain's echo: a cutscene is a room, not a fight.
export function lineDef(line) {
  const sample = loaded.get(key(line));
  if (!sample) return null;
  const name = `scene:${key(line)}`;
  SAMPLES[name] = sample;
  const v = voiceOf(line.who);
  return { voice: SCENE_VOICE, layers: [{ delay: 0, steps: [[{ sample: name, adsr: v.adsr, vol: v.vol, echo: true }, 60 + v.pitch, lineFrames(line)]] }] };
}

// Speaks the line and answers how many frames it lasts; 0 when there is no take for it.
export function speak(line) {
  const def = lineDef(line);
  if (!def) return 0;
  sfxDef(def);
  return lineFrames(line);
}
