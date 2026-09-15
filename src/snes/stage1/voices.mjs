// Everything the brawl stages sound like: the stage-start sting into the stage's song, the enemy
// voices the fight throws up, the partner's barks over them, the wordless grunts every fighter makes
// as it is hit, and the hit and weapon effects.
import { bark, barkFrames, playSong, sfx } from '../audio/player.mjs';
import { brawlSound } from '../audio/brawl.mjs';
import { bark as pickBark, barkKind, newBarker } from '../barks.mjs';
import { VELLUM_PINCH, VELLUM_SONG } from '../audio/cues.mjs';
import { barkMoments, createBarker, snapshot } from '../audio/barks.mjs';
import { barkLength, loadBarks, playBark } from '../audio/barkplayer.mjs';
import { createGrunter, gruntMoments, gruntSnapshot } from '../audio/grunts.mjs';
import { hasGrunt, playGrunt } from '../audio/gruntplayer.mjs';
import { SONGS } from '../../flow.mjs';

const STAGE_START_MS = 2400;

export const MENU_SOUNDS = { move: 'pencil', swap: 'stampOk', close: 'paperSlide', thud: 'stamp' };

// The sting plays at once; the stage's own song (Vellum's, in his office) comes in behind it.
export function startMusic(scene) {
  playSong('stageStart');
  scene.time.delayedCall(STAGE_START_MS, () => {
    const song = scene.pinch ? VELLUM_PINCH : scene.office ? VELLUM_SONG : SONGS[scene.stageKey];
    if (scene.paused) scene.resume = song; else playSong(song);
  });
}

export function newVoices(who) {
  loadBarks();
  return { who, partner: newBarker(who), barker: createBarker(), grunter: createGrunter(), foeTalk: { who: null, until: 0 } };
}

// Who was saying what, and what shape every body was in, before the fight stepped: a new line or a
// fresh wound can then be told from a continuing one.
export const voiceState = (world) => ({ voices: snapshot(world.fighters), bodies: gruntSnapshot(world.fighters) });

// The enemy voices, straight after the fight steps: the partner talking holds them back.
export function speakVoices(voices, world, before, frames, loopFrame) {
  const busy = loopFrame < voices.partner.until;
  for (const said of voices.barker(barkMoments(before.voices, world.fighters), frames, { frames: barkLength, busy })) {
    playBark(said);
    voices.foeTalk = { who: said.who, until: frames + barkLength(said) };
  }
}

// The frame's hit, weapon and crowd effects, the partner's line over them, and last the grunts, which
// know by then whose voice is busy this frame.
export function soundFrame(voices, world, { frames, loopFrame, target, hurt, before }) {
  const sound = !target && brawlSound(world.events);
  if (sound) sfx(sound);
  const kind = barkKind(world.events, { hurt, finisher: !!target });
  const line = kind && pickBark(voices.partner, kind, loopFrame, { frames: barkFrames, busy: voices.barker.speaking(frames) });
  if (line) bark(line);
  grunt(voices, world, before.bodies, frames, loopFrame);
}

// A fighter never grunts over its own spoken line: the auditor's is the partner barker's, and the foes
// share the enemy voice the barker is holding.
function grunt(voices, world, bodies, frames, loopFrame) {
  const talking = (who) => (who === voices.who
    ? loopFrame < voices.partner.until
    : who === voices.foeTalk.who && frames < voices.foeTalk.until);
  const whoOf = (f) => (f.team === 'player' ? voices.who : f.kind);
  const moments = gruntMoments(bodies, world.fighters, whoOf);
  for (const g of voices.grunter(moments, frames, { talking, has: hasGrunt })) playGrunt(g.grunt, { partner: g.who === voices.who });
}
