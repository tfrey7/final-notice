// The SNES sound chip, S-SMP style: the S-DSP's eight sample voices, rendered sample by sample at
// 32 kHz in plain JS. Samples are stored as 4-bit BRR-style blocks, read back through a 4-tap
// Gaussian interpolator, shaped by ADSR or GAIN envelopes, and mixed through an echo whose feedback
// runs through an 8-tap FIR filter. Everything here is pure; the player feeds it to WebAudio.

export const DSP_HZ = 32000;
export const VOICES = 8;

// The counter period of each of the 32 envelope and noise rates (0 never fires).
export const RATES = [
  0, 2048, 1536, 1280, 1024, 768, 640, 512, 384, 320, 256, 192, 160, 128, 96, 80,
  64, 48, 40, 32, 24, 20, 16, 12, 10, 8, 6, 5, 4, 3, 2, 1,
];

const clamp16 = (x) => (x > 32767 ? 32767 : x < -32768 ? -32768 : x);

// 512 weights for the four taps, oldest to newest at fraction f of 256: g[255-f], g[511-f], g[256+f], g[f].
export const GAUSS = (() => {
  const sigma = 0.55;
  const raw = Array.from({ length: 512 }, (_, i) => Math.exp(-(((511.5 - i) / 256) ** 2) / (2 * sigma * sigma)));
  let total = 0;
  for (let f = 0; f < 256; f++) total += raw[255 - f] + raw[511 - f] + raw[256 + f] + raw[f];
  const scale = (2048 * 256) / total;
  return Int16Array.from(raw, (w) => Math.round(w * scale));
})();

export function gaussian(s0, s1, s2, s3, f) {
  return clamp16(
    ((GAUSS[255 - f] * s0) >> 11) + ((GAUSS[511 - f] * s1) >> 11) + ((GAUSS[256 + f] * s2) >> 11) + ((GAUSS[f] * s3) >> 11),
  );
}

// BRR's four predictors: the nibble plus a fixed blend of the last two decoded samples.
export function brrPredict(filter, n, p1, p2) {
  if (filter === 1) return n + p1 + ((-p1) >> 4);
  if (filter === 2) return n + 2 * p1 + ((-3 * p1) >> 5) - p2 + (p2 >> 4);
  if (filter === 3) return n + 2 * p1 + ((-13 * p1) >> 6) - p2 + ((3 * p2) >> 4);
  return n;
}

const nibbleValue = (nib, shift) => (nib * (1 << shift)) >> 1;

// Each 16-sample block keeps the shift (0-12) and filter (0-3) that decode it closest. The first
// block and the loop block use filter 0, as the hardware's encoders do, so a loop restarts clean.
export function brrEncode(pcm, loopStart = null) {
  const blocks = [];
  let p1 = 0;
  let p2 = 0;
  for (let b = 0; b * 16 < pcm.length; b++) {
    const input = Array.from({ length: 16 }, (_, i) => pcm[b * 16 + i] ?? 0);
    const plain = b === 0 || (loopStart !== null && b * 16 === loopStart);
    let best = null;
    for (let filter = 0; filter < (plain ? 1 : 4); filter++) {
      for (let shift = 0; shift <= 12; shift++) {
        let q1 = p1;
        let q2 = p2;
        let err = 0;
        const nibbles = new Int8Array(16);
        for (let i = 0; i < 16; i++) {
          const pred = brrPredict(filter, 0, q1, q2);
          const nib = Math.max(-8, Math.min(7, Math.round(((input[i] - pred) * 2) / (1 << shift))));
          const out = clamp16(pred + nibbleValue(nib, shift));
          err += (input[i] - out) ** 2;
          nibbles[i] = nib;
          q2 = q1;
          q1 = out;
        }
        if (!best || err < best.err) best = { err, shift, filter, nibbles, q1, q2 };
      }
    }
    blocks.push({ shift: best.shift, filter: best.filter, nibbles: best.nibbles });
    p1 = best.q1;
    p2 = best.q2;
  }
  return { blocks, loop: loopStart === null ? null : Math.floor(loopStart / 16) };
}

export function brrDecode({ blocks }) {
  const out = new Int16Array(blocks.length * 16);
  let p1 = 0;
  let p2 = 0;
  blocks.forEach(({ shift, filter, nibbles }, b) => {
    for (let i = 0; i < 16; i++) {
      const s = clamp16(brrPredict(filter, nibbleValue(nibbles[i], shift), p1, p2));
      out[b * 16 + i] = s;
      p2 = p1;
      p1 = s;
    }
  });
  return out;
}

// A sample as the voices read it: BRR blocks, their decoded PCM and the loop point in samples.
export function makeSample(wave, loopStart = null) {
  const pcm = Array.from(wave, (x) => clamp16(Math.round(x)));
  const loop = loopStart === null ? null : Math.floor(loopStart / 16) * 16;
  const brr = brrEncode(pcm, loop);
  return { brr, pcm: brrDecode(brr), loop };
}

// One envelope step. env is 11 bits (0-0x7FF). adsr = [attack 0-15, decay 0-7, sustain 0-7, sustainRate 0-31];
// gain = { mode: 'direct', value 0-127 } or { mode: 'lindec'|'expdec'|'lininc'|'bentinc', rate 0-31 }.
export function stepEnvelope(v, tick) {
  const fires = (rate) => rate > 0 && tick % RATES[rate] === 0;
  if (v.phase === 'release') {
    v.env = Math.max(0, v.env - 8);
    return v.env;
  }
  if (v.gain) {
    const { mode, value = 0, rate = 0 } = v.gain;
    if (mode === 'direct') v.env = value << 4;
    else if (fires(rate)) {
      if (mode === 'lindec') v.env -= 32;
      else if (mode === 'expdec') v.env -= ((v.env - 1) >> 8) + 1;
      else if (mode === 'lininc') v.env += 32;
      else if (mode === 'bentinc') v.env += v.env < 0x600 ? 32 : 8;
    }
    v.env = Math.max(0, Math.min(0x7ff, v.env));
    return v.env;
  }
  const [a, d, s, sr] = v.adsr;
  if (v.phase === 'attack') {
    const rate = a * 2 + 1;
    if (fires(rate)) v.env += rate === 31 ? 1024 : 32;
    if (v.env >= 0x7ff) {
      v.env = 0x7ff;
      v.phase = 'decay';
    }
  } else if (v.phase === 'decay') {
    if (fires(d * 2 + 16)) v.env -= ((v.env - 1) >> 8) + 1;
    if (v.env >> 8 <= s) v.phase = 'sustain';
  } else if (fires(sr)) {
    v.env -= ((v.env - 1) >> 8) + 1;
  }
  v.env = Math.max(0, v.env);
  return v.env;
}

export function noiseStep(lfsr) {
  return (lfsr >> 1) | (((lfsr << 14) ^ (lfsr << 13)) & 0x4000);
}

// The echo filter: taps[0] weighs the newest sample; unity is a tap sum of 128.
export function firStep(history, taps) {
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += history[i] * taps[i];
  return clamp16(sum >> 7);
}

// A tone whose 16-bit pitch plays the sample's root at 0x1000; pitch modulation scales it by the
// previous voice's output.
export function modulatedPitch(pitch, prevOut) {
  return Math.max(0, Math.min(0x7fff, pitch + (((prevOut >> 5) * pitch) >> 10)));
}

export function createDsp() {
  const voices = Array.from({ length: VOICES }, () => ({
    sample: null, pos: 0, counter: 0, pitch: 0x1000, hist: [0, 0, 0, 0],
    env: 0, phase: 'release', adsr: [15, 7, 7, 0], gain: null,
    volL: 0, volR: 0, echo: false, noise: false, pmod: false, out: 0, peak: 0, tick: 0,
  }));
  const reg = { mvol: 127, evol: 0, efb: 0, edl: 4, fir: [127, 0, 0, 0, 0, 0, 0, 0], noiseRate: 20 };
  let echoL = new Int16Array(4 * 512);
  let echoR = new Int16Array(4 * 512);
  let echoPos = 0;
  const firL = new Array(8).fill(0);
  const firR = new Array(8).fill(0);
  let lfsr = 0x4000;
  let tick = 0;

  function setEcho({ mvol = reg.mvol, evol = reg.evol, efb = reg.efb, edl = reg.edl, fir = reg.fir } = {}) {
    Object.assign(reg, { mvol, evol, efb, fir });
    if (edl !== reg.edl) {
      reg.edl = edl;
      echoL = new Int16Array(Math.max(1, edl * 512));
      echoR = new Int16Array(Math.max(1, edl * 512));
      echoPos = 0;
    }
  }

  // inst: { sample, adsr | gain, volL, volR, echo, noise, pmod }; pitch is 16-bit, 0x1000 = the root.
  function keyOn(i, inst, pitch) {
    const v = voices[i];
    Object.assign(v, {
      sample: inst.sample ?? null, pos: 0, counter: 0, pitch, hist: [0, 0, 0, 0], env: 0, phase: 'attack',
      adsr: inst.adsr ?? [15, 7, 7, 0], gain: inst.gain ?? null, volL: inst.volL ?? 100, volR: inst.volR ?? 100,
      echo: !!inst.echo, noise: !!inst.noise, pmod: !!inst.pmod,
    });
    if (inst.noise) reg.noiseRate = inst.noiseRate ?? reg.noiseRate;
  }

  const keyOff = (i) => {
    voices[i].phase = 'release';
  };
  const setPitch = (i, pitch) => {
    voices[i].pitch = pitch;
  };

  function voiceSample(v, prevOut) {
    if (v.env === 0 && v.phase === 'release') return 0;
    const pitch = v.pmod ? modulatedPitch(v.pitch, prevOut) : v.pitch;
    v.counter += pitch;
    const pcm = v.sample?.pcm;
    while (v.counter >= 0x1000) {
      v.counter -= 0x1000;
      let s = 0;
      if (pcm) {
        if (v.pos >= pcm.length) {
          if (v.sample.loop === null) {
            v.phase = 'release';
            v.env = 0;
            return 0;
          }
          v.pos = v.sample.loop;
        }
        s = pcm[v.pos++];
      }
      v.hist.shift();
      v.hist.push(s);
    }
    const raw = v.noise ? ((lfsr << 17) >> 16) : gaussian(v.hist[0], v.hist[1], v.hist[2], v.hist[3], (v.counter >> 4) & 0xff);
    return (raw * stepEnvelope(v, tick)) >> 11;
  }

  // Renders n samples into Float32 arrays, -1 to 1.
  function render(left, right, offset, n) {
    for (let k = 0; k < n; k++) {
      tick++;
      if (tick % RATES[reg.noiseRate] === 0) lfsr = noiseStep(lfsr);
      let mainL = 0;
      let mainR = 0;
      let inL = 0;
      let inR = 0;
      let prev = 0;
      for (const v of voices) {
        const out = voiceSample(v, prev);
        v.out = out;
        prev = out;
        const a = Math.abs(out);
        v.peak = a > v.peak ? a : v.peak * 0.9997;
        const l = (out * v.volL) >> 7;
        const r = (out * v.volR) >> 7;
        mainL += l;
        mainR += r;
        if (v.echo) {
          inL += l;
          inR += r;
        }
      }
      firL.pop();
      firL.unshift(echoL[echoPos]);
      firR.pop();
      firR.unshift(echoR[echoPos]);
      const fl = firStep(firL, reg.fir);
      const fr = firStep(firR, reg.fir);
      echoL[echoPos] = clamp16(clamp16(inL) + ((fl * reg.efb) >> 7));
      echoR[echoPos] = clamp16(clamp16(inR) + ((fr * reg.efb) >> 7));
      echoPos = (echoPos + 1) % echoL.length;
      left[offset + k] = clamp16(((clamp16(mainL) * reg.mvol) >> 7) + ((fl * reg.evol) >> 7)) / 32768;
      right[offset + k] = clamp16(((clamp16(mainR) * reg.mvol) >> 7) + ((fr * reg.evol) >> 7)) / 32768;
    }
  }

  return { voices, reg, setEcho, keyOn, keyOff, setPitch, render };
}
