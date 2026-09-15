// The SNES attract intro: the eight digitized shots letterboxed on black and held still, faded through
// black between places, with their voiced lines, and the hand-off into the title's logo press. It plays on a first boot and
// whenever the title sits idle; any button goes straight to the settled title. The timeline is
// src/snes/attract.mjs. `&t=<frames>` pins its clock for a screenshot.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { screen } from '../fx.mjs';
import { playSong, sfx, sfxDef, SAMPLES } from '../audio/player.mjs';
import { CHAIN, voiceOf } from '../audio/voice.mjs';
import { brrDecode } from '../audio/spc.mjs';
import { unpack } from '../audio/recorded.mjs';
import INTRO_BRR from '../audio/intro-brr.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, showFlow } from '../../flow.mjs';
import { SEEN_KEY } from '../opening.mjs';
import { drawSubtitle } from '../text.mjs';
import { LINES, SHOTS, SHOT_H, SHOT_W, SUB_BAND, attractAt, attractCues, attractStep, subtitleAt } from '../attract.mjs';
import { FrontScreen, bufferFill } from './front.mjs';

const SHOTS_URL = new URL('../../../assets/intro/', import.meta.url);
const TOP = (HEIGHT - SHOT_H) >> 1;
const LEFT = (WIDTH - SHOT_W) >> 1;
const LINE_VOICE = 5;

const pictures = new Map();
const voices = new Map();

async function loadShot(n) {
  const blob = await (await fetch(new URL(`shot${n}.png`, SHOTS_URL))).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [SHOT_W, SHOT_H];
  const g = canvas.getContext('2d');
  g.drawImage(bitmap, 0, 0);
  const rgba = g.getImageData(0, 0, SHOT_W, SHOT_H).data;
  const px = new Uint16Array(SHOT_W * SHOT_H);
  for (let i = 0; i < px.length; i++) px[i] = rgb15(rgba[i * 4] >> 3, rgba[i * 4 + 1] >> 3, rgba[i * 4 + 2] >> 3);
  pictures.set(n, px);
}

// The lines the intro speaks are the crushed samples baked by tools/voice-crush.mjs --bake. The
// clean masters they were made from stay in assets/voice and are never fetched here.
function loadLine({ who, clip }) {
  const baked = INTRO_BRR[clip];
  if (!baked) return;
  const brr = { blocks: unpack(baked.brr), loop: null };
  SAMPLES[`intro:${clip}`] = { brr, pcm: brrDecode(brr), loop: null, rootHz: baked.rootHz };
  voices.set(clip, { who, frames: baked.frames });
}

let loading = null;
const loadAll = () => (loading ??= Promise.all([
  ...SHOTS.map((_, i) => loadShot(i + 1).catch(() => {})),
  ...LINES.map((line) => Promise.resolve().then(() => loadLine(line)).catch(() => {})),
]));

function sayLine(clip) {
  const v = voices.get(clip);
  if (!v) return;
  const step = [{ sample: `intro:${clip}`, adsr: CHAIN.adsr, vol: CHAIN.vol, echo: false }, 60 + voiceOf(v.who).pitch, v.frames];
  sfxDef({ voice: LINE_VOICE, layers: [{ delay: 0, steps: [step] }] });
}

export class SnesAttractScene extends Phaser.Scene {
  constructor() {
    super('attract');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.frame = this.pinned ?? 0;
    this.done = false;
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private window: the intro plays again */ }
    this.buf = screen();
    this.view = new FrontScreen(this, 'snes-attract');
    this.ready = false;
    loadAll().then(() => { this.ready = true; });
  }

  cue(cues) {
    for (const cue of cues) {
      if (cue === 'music') playSong('scene');
      else if (cue === 'title') playSong(SONGS.title);
      else if (cue === 'punch') sfx('stamp');
      else if (cue.startsWith('line:')) sayLine(cue.slice(5));
    }
  }

  update() {
    if (this.done) return;
    // The clock waits on the pictures and voices, so a line never starts before its take has loaded.
    if (!this.ready) return this.view.show(this.buf.fill(0));
    if (this.pinned == null) {
      const step = attractStep(this.frame, pollPad(this.game.loop.frame));
      if (step.event) return this.toTitle(step.event);
      this.cue(attractCues(this.frame));
      this.frame = step.frame;
    }
    const at = attractAt(this.frame);
    const frame = this.paint(at);
    const sub = subtitleAt(this.frame);
    if (sub) drawSubtitle(bufferFill(frame), sub.lines, SUB_BAND);
    this.view.show(frame, at);
  }

  toTitle(event) {
    this.done = true;
    this.registry.set(event === 'end' ? 'introEnd' : 'attractBack', true);
    showFlow(this, jumpTo('title'));
  }

  paint(at) {
    this.buf.fill(0);
    const px = pictures.get(at.shot);
    if (!px) return this.buf;
    for (let dy = 0; dy < SHOT_H; dy++) this.buf.set(px.subarray(dy * SHOT_W, (dy + 1) * SHOT_W), (TOP + dy) * WIDTH + LEFT);
    return this.buf;
  }
}
