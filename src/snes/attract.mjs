// The SNES attract intro (docs/shots/item-2279/intro-script.md) as a pure timeline in frames: eight
// digitized shots held still, a stepped fade through black on a change of place and hard cuts inside a
// conversation, nine voiced lines, the punch clock on the beat, and the title melody starting under
// the tower so the title's Mode 7 logo press lands on its downbeat. Any button skips to the title.
import { dipLevel } from './fx.mjs';
import { INTRO_FRAMES } from './lights.mjs';
import { ZOOM_FRAMES } from './scenes/front.mjs';
import { WIDTH, HEIGHT } from './screen.mjs';
import { wrapText } from './text.mjs';

export const FPS = 60;
export const SHOT_W = 256;
export const SHOT_H = 144;

// seconds, and whether the shot fades in through black (a change of place) or hard cuts.
export const SHOTS = [
  { s: 10, fade: true },
  { s: 7, fade: false },
  { s: 8, fade: false },
  { s: 10, fade: true },
  { s: 10, fade: true },
  { s: 8, fade: false },
  { s: 10, fade: true },
  { s: 12, fade: true },
];

export const SHOT_AT = SHOTS.reduce((at, shot) => [...at, at.at(-1) + shot.s * FPS], [0]);
export const END_AT = SHOT_AT.at(-1);

// Each line's clip in assets/voice/intro, when it starts in its shot and how long it sounds (item 2281).
export const LINES = [
  { shot: 1, who: 'ward', clip: 'shot1-ward', at: 0.6, s: 4.35, text: 'Mrs. Kemp. Agency for the Recently Deceased. This is your Final Notice.' },
  { shot: 1, who: 'kemp', clip: 'shot1-kemp', at: 6, s: 2.56, text: 'Oh. I was only resting my eyes.' },
  { shot: 2, who: 'mercer', clip: 'shot2-mercer', at: 1.5, s: 3.5, text: "Pink copy's yours. The one thing you can take with you." },
  { shot: 3, who: 'ward', clip: 'shot3-ward', at: 4, s: 2.8, text: 'Served, nine fifty-two. Next address.' },
  { shot: 4, who: 'mercer', clip: 'shot4-mercer', at: 1, s: 3.4, text: "Another sack back from the tower. Every one of them 'still at work'." },
  { shot: 4, who: 'ward', clip: 'shot4-ward', at: 5.6, s: 2.9, text: "The dead don't go to work, Frank. It isn't permitted." },
  { shot: 5, who: 'supervisor', clip: 'shot5-supervisor', at: 5, s: 3.4, text: 'Nobody on this floor is dead. Back to work.' },
  { shot: 7, who: 'mercer', clip: 'shot7-mercer', at: 2, s: 3, text: 'Somebody ought to go up there and hand them over in person.' },
  { shot: 7, who: 'ward', clip: 'shot7-ward', at: 7, s: 1, text: 'Somebody will.' },
];
export const lineFrame = (line) => SHOT_AT[line.shot - 1] + Math.round(line.at * FPS);

// Subtitles are bare outlined text centred in the black band under the picture, Final Fight style:
// no window, no name, no portrait. `wrap` keeps a line inside the picture's width.
export const SUB_BAND = { x: 0, y: (HEIGHT + SHOT_H) >> 1, w: WIDTH, h: (HEIGHT - SHOT_H) >> 1, rows: 2, wrap: 248 };

// The subtitle showing on `frame`, or null: exactly while the line sounds (never into the next line
// or shot), a long line split into timed pages.
export function subtitleAt(frame) {
  for (const [i, line] of LINES.entries()) {
    const from = lineFrame(line);
    const next = LINES[i + 1]?.shot === line.shot ? lineFrame(LINES[i + 1]) : SHOT_AT[line.shot];
    const spoken = Math.round(line.s * FPS);
    if (frame < from || frame >= Math.min(next, from + spoken)) continue;
    const pages = wrapText(line.text, SUB_BAND.wrap, SUB_BAND.rows);
    const page = Math.min(pages.length - 1, Math.floor(((frame - from) * pages.length) / spoken));
    return { who: line.who, lines: pages[page] };
  }
  return null;
}

// Shot 6: the manager's hand punches a card on every beat.
export const PUNCH_FROM = SHOT_AT[5] + FPS;
export const PUNCH_EVERY = 30;
export const PUNCH_TO = SHOT_AT[6] - FPS;

// The title takes over this many frames into its own clock, 40 frames before the logo press, and its
// melody starts that long before the intro ends so both clocks agree.
export const TITLE_FROM = INTRO_FRAMES - ZOOM_FRAMES - 40;
export const TITLE_SONG_AT = END_AT - TITLE_FROM;

export const shotAt = (frame) => {
  const f = Math.max(0, Math.min(END_AT - 1, frame));
  return SHOT_AT.findIndex((at, i) => f >= at && f < SHOT_AT[i + 1]) + 1;
};

// Where the intro is at `frame`: the shot and the master brightness. The last shot fades out into
// the title as if a change of place followed it.
export function attractAt(frame) {
  const f = Math.max(0, Math.min(END_AT - 1, frame));
  const shot = shotAt(f);
  const sinceCut = SHOTS[shot - 1].fade ? f - SHOT_AT[shot - 1] : Infinity;
  const toCut = (SHOTS[shot]?.fade ?? true) ? SHOT_AT[shot] - f : Infinity;
  return { shot, level: dipLevel(sinceCut, toCut), crush: true };
}

// The cues on `frame`: 'music' at the start, 'line:<clip>' as each line starts, 'punch' on the beat
// in shot 6 and 'title' when the title melody comes in under the tower.
export function attractCues(frame) {
  const cues = [];
  if (frame === 0) cues.push('music');
  for (const line of LINES) if (lineFrame(line) === frame) cues.push(`line:${line.clip}`);
  if (frame >= PUNCH_FROM && frame < PUNCH_TO && (frame - PUNCH_FROM) % PUNCH_EVERY === 0) cues.push('punch');
  if (frame === TITLE_SONG_AT) cues.push('title');
  return cues;
}

// One frame: any button skips to the settled title; the last frame hands over to the logo press.
export function attractStep(frame, pad) {
  if (pad.pressed.size > 0) return { frame, event: 'skip' };
  if (frame + 1 >= END_AT) return { frame, event: 'end' };
  return { frame: frame + 1, event: null };
}
