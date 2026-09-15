// Everything the brawl stages sound like: the stage-start sting into the stage's song, the enemy
// voices the fight throws up, the partner's barks over them, and the hit and weapon effects.
import { bark, barkFrames, playSong, sfx } from '../audio/player.mjs';
import { brawlSound } from '../audio/brawl.mjs';
import { bark as pickBark, barkKind, newBarker } from '../barks.mjs';
import { VELLUM_PINCH, VELLUM_SONG } from '../audio/cues.mjs';
import { barkMoments, createBarker, snapshot } from '../audio/barks.mjs';
import { barkLength, loadBarks, playBark } from '../audio/barkplayer.mjs';
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
  return { partner: newBarker(who), barker: createBarker() };
}

// Who was saying what before the fight stepped, so a new line can be told from a continuing one.
export const voiceState = (world) => snapshot(world.fighters);

// The enemy voices, straight after the fight steps: the partner talking holds them back.
export function speakVoices(voices, world, before, frames, loopFrame) {
  const busy = loopFrame < voices.partner.until;
  for (const said of voices.barker(barkMoments(before, world.fighters), frames, { frames: barkLength, busy })) playBark(said);
}

// The frame's hit, weapon and crowd effects, and the partner's line over them.
export function soundFrame(voices, world, { frames, loopFrame, target, hurt }) {
  const sound = !target && brawlSound(world.events);
  if (sound) sfx(sound);
  const kind = barkKind(world.events, { hurt, finisher: !!target });
  const line = kind && pickBark(voices.partner, kind, loopFrame, { frames: barkFrames, busy: voices.barker.speaking(frames) });
  if (line) bark(line);
}
