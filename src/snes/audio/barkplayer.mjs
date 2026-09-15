// The brawl barks in the browser: each take is fetched from assets/voice/takes, digitized once, and
// played on an S-DSP voice at its character's pitch.
import { barkLines } from './barks.mjs';
import { CHAIN, digitize, parseWav, takeFile, voiceOf } from './voice.mjs';
import { SAMPLES, sfxDef } from './player.mjs';

const TAKES = new URL('../../../assets/voice/takes/', import.meta.url);

// Enemy barks keep voice 5 to themselves: punches and hits take 7 and 8, the partners' lines 6.
export const FOE_BARK_VOICE = 4;
const loaded = new Map();
let loading = null;

const fetchTake = async (name) => new Uint8Array(await (await fetch(new URL(name, TAKES))).arrayBuffer());

export function loadBarks(read = fetchTake) {
  loading ??= Promise.all(barkLines().map(async ({ who, text }) => {
    try {
      loaded.set(`${who}|${text}`, digitize(who, parseWav(await read(await takeFile(who, text)))));
    } catch {
      // A take that will not load leaves that line silent.
    }
  })).then(() => loaded);
  return loading;
}

export function playBark({ who, text }) {
  const sample = loaded.get(`${who}|${text}`);
  if (!sample) return false;
  const { pitch, rate } = voiceOf(who);
  const key = `bark:${who}|${text}`;
  SAMPLES[key] = sample;
  const frames = Math.ceil((sample.pcm.length / (rate * 2 ** (pitch / 12))) * 60) + 6;
  sfxDef({ voice: FOE_BARK_VOICE, layers: [{ delay: 0, steps: [[{ sample: key, adsr: CHAIN.adsr, vol: CHAIN.vol, echo: true }, 60 + pitch, frames]] }] });
  return true;
}
