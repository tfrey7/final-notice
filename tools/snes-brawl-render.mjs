// Renders a bot playing Stage 1's brawl on the SNES to a WAV: the stage song, the fight's sounds and
// every bark, one seeded fight so two checkouts can be heard side by side.
//
//   node tools/snes-brawl-render.mjs <out.wav> [seconds] [--root <checkout>] [--seed n]
//
// --root renders another checkout's game logic (master, for a "before"); the lines said go to stdout.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { wav } from './snes-render.mjs';

const lcg = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Heads for the nearest foe, lines up in its lane and jabs, with a heavy now and then.
function botButtons(w, frame) {
  const p = w.fighters.find((f) => f.team === 'player');
  const foe = w.fighters.filter((f) => f.kind && f.hp > 0 && f.state !== 'ko').sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!foe) return new Set(frame % 2 ? ['right'] : []);
  const down = new Set();
  const dx = foe.x - p.x;
  if (Math.abs(dx) > 30) down.add(dx > 0 ? 'right' : 'left');
  if (Math.abs(foe.y - p.y) > 3) down.add(foe.y > p.y ? 'down' : 'up');
  if (Math.abs(dx) <= 34 && frame % 8 < 2) down.add(frame % 96 < 8 ? 'x' : 'y');
  return down;
}

export async function renderBrawl({ root = new URL('../', import.meta.url), seconds = 40, seed = 3 } = {}) {
  const M = (path) => import(new URL(path, root));
  const [floor, areas, tuning, finisher, waves, weapons, input, player, sfx, brawl, partner, foes, bp, voice, song] = await Promise.all([
    'src/stage1/player.mjs', 'src/stage1/areas.mjs', 'src/stage1/tuning.mjs', 'src/snes/stage1/finisher.mjs', 'src/snes/stage1/waves.mjs',
    'src/stage1/weapons.mjs', 'src/input.mjs', 'src/snes/audio/player.mjs', 'src/snes/audio/sfx.mjs', 'src/snes/audio/brawl.mjs',
    'src/snes/barks.mjs', 'src/snes/audio/barks.mjs', 'src/snes/audio/barkplayer.mjs', 'src/snes/audio/voice.mjs', 'src/snes/audio/songs/stage1.mjs',
  ].map(M));
  const loaded = await bp.loadBarks((name) => readFileSync(new URL(`assets/voice/takes/${name}`, root)));
  const foeDef = bp.barkDef ?? (({ who, text }) => {
    const sample = loaded.get(`${who}|${text}`);
    if (!sample) return null;
    const { pitch, rate } = voice.voiceOf(who);
    const key = `bark:${who}|${text}`;
    player.SAMPLES[key] = sample;
    const frames = Math.ceil((sample.pcm.length / (rate * 2 ** (pitch / 12))) * 60) + 6;
    return { voice: bp.FOE_BARK_VOICE, layers: [{ delay: 0, steps: [[{ sample: key, adsr: voice.CHAIN.adsr, vol: voice.CHAIN.vol, echo: true }, 60 + pitch, frames]] }] };
  });
  const foeLength = (line) => foeDef(line)?.layers[0].steps[0][2] ?? 0;
  // A checkout from before the fight grunts (item 2330) renders without them.
  const [grunts, gp] = await Promise.all(['src/snes/audio/grunts.mjs', 'src/snes/audio/gruntplayer.mjs'].map((path) => M(path).catch(() => null)));
  const grunter = grunts && gp && grunts.createGrunter(lcg(seed + 2));
  let foeTalk = { who: null, until: 0 };

  const random = Math.random;
  Math.random = lcg(seed);
  const dice = lcg(seed + 1);
  const tune = finisher.scaledTune(floor.tuneFor('ward'), tuning.STAGE1.scale);
  const w = areas.newStage(floor.newFloor('ward', tune), tune, 0, waves.SNES_STAGE1);
  weapons.armWorld(w, weapons.stageSmash(w.stage.starts), weapons.scaledWeapons(weapons.defaultWeapons(), tuning.STAGE1.scale));
  const seq = player.createSequencer();
  seq.play(player.compileSong(song.default));
  const ward = partner.newBarker('ward');
  const barker = foes.createBarker(dice);
  let pad = input.createPad(input.PADS.snes);

  const rate = 32000;
  const n = Math.round(seconds * rate);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  const said = [];
  let at = 0;
  for (let frame = 0; at < n; frame++) {
    const p = w.fighters.find((f) => f.team === 'player');
    if (p.hp <= 2) p.hp = p.maxHp ?? 12;
    pad = input.updatePad(pad, botButtons(w, frame), frame);
    const voices = foes.snapshot(w.fighters);
    const playerHp = p.hp;
    const before = finisher.livingFoes(w);
    const bodies = grunter && grunts.gruntSnapshot(w.fighters);
    floor.stepFloor(w, pad, tune);
    for (const line of barker(foes.barkMoments(voices, w.fighters), frame, { frames: foeLength, busy: frame < ward.until })) {
      const def = foeDef(line);
      if (def) seq.sfx(def), said.push(`${(frame / 60).toFixed(1)}s ${line.who}: ${line.text}`);
      foeTalk = { who: line.who, until: frame + foeLength(line) };
    }
    const target = finisher.finisherTarget(w, before);
    areas.stepAreas(w, tune);
    const sound = !target && brawl.brawlSound(w.events);
    if (sound) seq.sfx(sfx.atVolume(sfx.SFX[sound], sfx.SFX_VOLUME[sound]));
    const kind = partner.barkKind(w.events, { hurt: p.hp < playerHp, finisher: !!target });
    const id = kind && partner.bark(ward, kind, frame, { frames: player.barkFrames, rand: dice, roll: dice, busy: barker.speaking?.(frame) ?? false });
    if (id) seq.sfx(player.barkEffect(id)), said.push(`${(frame / 60).toFixed(1)}s ward: ${id}`);
    if (grunter) {
      const talking = (who) => (who === 'ward' ? frame < ward.until : who === foeTalk.who && frame < foeTalk.until);
      for (const g of grunter(grunts.gruntMoments(bodies, w.fighters, (f) => (f.team === 'player' ? 'ward' : f.kind)), frame, { talking, has: gp.hasGrunt })) {
        seq.sfx(gp.gruntDef(g.grunt, { partner: g.who === 'ward' }));
        said.push(`${(frame / 60).toFixed(1)}s ${g.who}: (${g.grunt})`);
      }
    }
    const len = Math.min(n - at, Math.round(((frame + 1) * rate) / 60) - at);
    seq.render(left.subarray(at), right.subarray(at), len);
    at += len;
  }
  Math.random = random;
  return { left, right, sampleRate: rate, said };
}

if (process.argv[1]?.endsWith('snes-brawl-render.mjs')) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args.splice(i, 2)[1];
  };
  const root = opt('--root', null);
  const seed = Number(opt('--seed', '3'));
  const [out, seconds = '40'] = args;
  const take = await renderBrawl({ root: root ? pathToFileURL(`${resolve(root)}/`) : undefined, seconds: Number(seconds), seed });
  writeFileSync(out, wav(take));
  console.log(take.said.join('\n'));
  console.log(`${take.said.length} lines -> ${out}`);
}
