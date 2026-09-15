// A minimal SoundFont 2 reader: presets, their instrument zones and the sample each key plays.

const GEN = { keyRange: 43, velRange: 44, instrument: 41, sampleID: 53, sampleModes: 54, rootKey: 58, coarse: 51, fine: 52 };

function chunks(buf, from, to) {
  const out = {};
  for (let p = from; p + 8 <= to; ) {
    const id = buf.toString('latin1', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    const body = p + 8;
    if (id === 'LIST') out[buf.toString('latin1', body, body + 4)] = chunks(buf, body + 4, body + size);
    else out[id] = buf.subarray(body, body + size);
    p = body + size + (size & 1);
  }
  return out;
}

const cstr = (b, at, len) => b.toString('latin1', at, at + len).replace(/\0.*$/s, '').trim();

function gens(buf) {
  const list = [];
  for (let i = 0; i + 4 <= buf.length; i += 4) list.push({ op: buf.readUInt16LE(i), lo: buf[i + 2], hi: buf[i + 3], amount: buf.readInt16LE(i + 2) });
  return list;
}

function zones(headers, bags, genList, nameLen, recLen, bagAt) {
  const out = [];
  for (let h = 0; h + recLen < headers.length; h += recLen) {
    const bagFrom = headers.readUInt16LE(h + bagAt);
    const bagTo = headers.readUInt16LE(h + recLen + bagAt);
    const zs = [];
    for (let b = bagFrom; b < bagTo; b++) {
      const gFrom = bags.readUInt16LE(b * 4);
      const gTo = bags.readUInt16LE((b + 1) * 4);
      zs.push(genList.slice(gFrom, gTo));
    }
    out.push({ name: cstr(headers, h, nameLen), header: headers.subarray(h, h + recLen), zones: zs });
  }
  return out;
}

export function readSf2(buf) {
  const riff = chunks(buf, 12, buf.length);
  const pdta = riff.pdta;
  const smpl = riff.sdta.smpl;
  const presets = zones(pdta.phdr, pdta.pbag, gens(pdta.pgen), 20, 38, 24).map((p) => ({
    ...p, program: p.header.readUInt16LE(20), bank: p.header.readUInt16LE(22),
  }));
  const instruments = zones(pdta.inst, pdta.ibag, gens(pdta.igen), 20, 22, 20);
  const samples = [];
  for (let s = 0; s + 46 <= pdta.shdr.length; s += 46) {
    const h = pdta.shdr;
    samples.push({
      name: cstr(h, s, 20), start: h.readUInt32LE(s + 20), end: h.readUInt32LE(s + 24),
      loopStart: h.readUInt32LE(s + 28), loopEnd: h.readUInt32LE(s + 32), rate: h.readUInt32LE(s + 36),
      pitch: h[s + 40], cents: h.readInt8(s + 41),
    });
  }
  return { presets, instruments, samples, smpl };
}

const inRange = (zone, op, v) => {
  const g = zone.find((x) => x.op === op);
  return !g || (v >= g.lo && v <= g.hi);
};
const genOf = (zone, op) => zone.find((x) => x.op === op);

// The sample a preset plays for one key at one velocity, with its PCM, loop and root.
export function pick(sf, { bank = 0, program, key, vel = 100, name }) {
  const preset = sf.presets.find((p) => p.bank === bank && p.program === program);
  if (!preset) throw new Error(`no preset ${bank}:${program}`);
  for (const pz of preset.zones) {
    const ig = genOf(pz, GEN.instrument);
    if (!ig || !inRange(pz, GEN.keyRange, key) || !inRange(pz, GEN.velRange, vel)) continue;
    const inst = sf.instruments[ig.amount];
    for (const iz of inst.zones) {
      const sg = genOf(iz, GEN.sampleID);
      if (!sg || !inRange(iz, GEN.keyRange, key) || !inRange(iz, GEN.velRange, vel)) continue;
      const s = sf.samples[sg.amount];
      if (name && !s.name.includes(name)) continue;
      const root = genOf(iz, GEN.rootKey)?.amount ?? s.pitch;
      const tune = (genOf(iz, GEN.coarse)?.amount ?? 0) * 100 + (genOf(iz, GEN.fine)?.amount ?? 0) + s.cents;
      const pcm = new Float64Array(s.end - s.start);
      for (let i = 0; i < pcm.length; i++) pcm[i] = sf.smpl.readInt16LE((s.start + i) * 2);
      return {
        preset: preset.name, instrument: inst.name, sample: s.name, rate: s.rate, pcm,
        loopStart: s.loopStart - s.start, loopEnd: s.loopEnd - s.start,
        loops: (genOf(iz, GEN.sampleModes)?.amount ?? 0) & 1,
        rootMidi: root - tune / 100,
      };
    }
  }
  throw new Error(`preset ${preset.name} has no zone for key ${key}`);
}
