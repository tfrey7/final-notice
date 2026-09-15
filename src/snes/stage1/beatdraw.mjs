// What a beat looks like on the SNES screen: the floor talk's portrait and text box, and the three
// pace-changers' scenery. Stand-in art (item 2336 is about rhythm): the portrait is a framed panel
// with the speaker's picture named in it until the portrait set lands.
import { rgb15 } from '../color.mjs';
import { drawTextBox, drawWindow, drawString, wrapText, windowGradient } from '../text.mjs';
import { talkFor } from '../../story/script.mjs';
import { TALK_FRAMES } from '../../stage1/beats.mjs';
import { WIDTH, HEIGHT } from '../screen.mjs';

export const TALK_BOX = { x: 72, y: 164, w: 176, h: 44, pad: 7, rows: 2 };
export const PORTRAIT = { x: 10, y: 156, w: 56, h: 56 };
const FLAME = [rgb15(31, 28, 14), rgb15(31, 18, 2), rgb15(22, 5, 0)];
const LICK = [0, 2, -1, 3, 1, -2, 2, 0, -1, 1];
const GLASS = rgb15(22, 26, 31);
const NIGHT = rgb15(1, 1, 4);

// A portrait panel: the window, then the picture's name across it, until real portraits exist.
function drawPortrait(fill, picture) {
  drawWindow(fill, PORTRAIT, windowGradient(PORTRAIT.h, rgb15(6, 8, 14), rgb15(1, 2, 6)));
  wrapText(picture.replace(/-/g, ' ').toUpperCase(), PORTRAIT.w - 10, 3)[0]
    .forEach((l, i) => drawString(fill, l, PORTRAIT.x + 5, PORTRAIT.y + 8 + i * 12));
}

// The talk, one line at a time, typed out over the fight; the fight never stops for it.
export function drawTalk(fill, talk, auditor) {
  const lines = talkFor(talk.id, auditor);
  const beat = lines[talk.line];
  if (!beat) return false;
  drawPortrait(fill, beat.picture);
  drawTextBox(fill, {
    speaker: beat.speaker,
    lines: wrapText(beat.line, TALK_BOX.w - 2 * TALK_BOX.pad, TALK_BOX.rows)[0],
    shown: Math.round((talk.t / TALK_FRAMES) * 3 * beat.line.length),
    blink: false,
  }, TALK_BOX);
  return true;
}

// Scenery, in screen pixels: the copier's fire column, the wind's streaks, the failed lights' night.
export function drawScenery(fill, scenery, cam, frame) {
  const x = Math.round(scenery.x - cam);
  if (scenery.id === 'fire') {
    if (x < -20 || x > WIDTH + 20) return;
    // The burning copier: a dark body, a glow on the floor, and a flame that licks about.
    fill(x - 11, 182, 22, 18, rgb15(6, 6, 8));
    fill(x - 9, 186, 18, 3, rgb15(11, 11, 13));
    fill(x - 14, 198, 28, 2, FLAME[2]);
    for (let i = 0; i < 12; i++) {
      const lick = LICK[(i + (frame >> 3)) % LICK.length];
      const w = Math.max(2, 13 - i + lick);
      const c = FLAME[i < 3 ? 2 : i < 8 ? 1 : 0];
      fill(x - (w >> 1) + (lick >> 1), 180 - i * 4, w, 4, c);
    }
  } else if (scenery.id === 'wind') {
    for (let i = 0; i < 6; i++) {
      const y = 40 + i * 26;
      const sx = ((frame * 4) + i * 53) % (WIDTH + 40) - 20;
      fill(sx, y, 18, 1, GLASS);
    }
  } else if (scenery.id === 'dark') {
    const flicker = (frame >> 3) % 7 === 0;
    if (!flicker) fill(0, 0, WIDTH, HEIGHT, NIGHT, 9);
  }
}

// One call from the scene each frame, after the HUD.
export function drawBeat(fill, world, auditor, cam, frame) {
  const b = world?.beats;
  if (!b) return;
  if (b.scenery) drawScenery(fill, b.scenery, cam, frame);
  if (b.talk) drawTalk(fill, b.talk, auditor);
}
