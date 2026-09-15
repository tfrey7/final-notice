// The SNES attract intro (docs/shots/item-2279/intro-script.md) as a pure timeline in frames: eight
// digitized shots with slow camera moves, mosaic on a change of place and hard cuts inside a
// conversation, nine voiced lines, the punch clock on the beat, and the title melody starting under
// the tower so the title's Mode 7 logo press lands on its downbeat. Any button skips to the title.
import { MAX_MOSAIC, LEVELS } from './fx.mjs';
import { INTRO_FRAMES } from './lights.mjs';
import { ZOOM_FRAMES } from './scenes/front.mjs';
import { wrapText } from './text.mjs';

export const FPS = 60;
export const SHOT_W = 256;
export const SHOT_H = 144;
export const MOSAIC_FRAMES = 32;
export const FADE_FRAMES = 32;
export const OUT_FRAMES = 24;

// seconds, whether the shot mosaics in (a change of place), and the camera: zoom and centre offset
// in shot pixels at its first and last frame.
export const SHOTS = [
  { s: 10, mosaic: false, from: [1, 0, 0], to: [1.14, 0, -4] },
  { s: 7, mosaic: false, from: [1.04, -6, 0], to: [1.16, 6, 2] },
  { s: 8, mosaic: false, from: [1.12, -14, 0], to: [1.12, 14, 0] },
  { s: 10, mosaic: true, from: [1.12, 14, 0], to: [1.12, -14, 0] },
  { s: 10, mosaic: true, from: [1.1, -12, 4], to: [1.18, 12, 0] },
  { s: 8, mosaic: false, from: [1, 0, 0], to: [1.2, 0, 4] },
  { s: 10, mosaic: true, from: [1, 0, 0], to: [1.1, 4, -2] },
  { s: 12, mosaic: true, from: [1, 0, 12], to: [1.35, 0, -22] },
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

// Final Fight's subtitles, not an RPG text box: plain white lines centred in the black band under the
// picture, no window and no name tag; the picture shows who is talking.
export const SUB = { y: 191, w: 240, rows: 2 };
export const SUB_LINGER = 30;

// The subtitle showing on `frame`, or null: from the line's first frame until it has finished sounding
// plus half a second (never into the next line or shot), a long line split into timed pages.
export function subtitleAt(frame) {
  for (const [i, line] of LINES.entries()) {
    const from = lineFrame(line);
    const next = LINES[i + 1]?.shot === line.shot ? lineFrame(LINES[i + 1]) : SHOT_AT[line.shot];
    const until = Math.min(next, from + Math.round(line.s * FPS) + SUB_LINGER);
    if (frame < from || frame >= until) continue;
    const pages = wrapText(line.text, SUB.w, SUB.rows);
    const spoken = Math.round(line.s * FPS);
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

const TOP = LEVELS - 1;
const HALF = MOSAIC_FRAMES >> 1;
const ease = (p) => p * p * (3 - 2 * p);

export const shotAt = (frame) => {
  const f = Math.max(0, Math.min(END_AT - 1, frame));
  return SHOT_AT.findIndex((at, i) => f >= at && f < SHOT_AT[i + 1]) + 1;
};

// Where the intro is at `frame`: the shot, its camera, the mosaic and the brightness.
export function attractAt(frame) {
  const f = Math.max(0, Math.min(END_AT - 1, frame));
  const shot = shotAt(f);
  const def = SHOTS[shot - 1];
  const t = f - SHOT_AT[shot - 1];
  const left = SHOT_AT[shot] - f;
  const p = ease(t / (def.s * FPS - 1));
  const [zoom, x, y] = def.from.map((v, i) => v + (def.to[i] - v) * p);
  let mosaic = 1;
  if (def.mosaic && t < HALF) mosaic = Math.max(1, MAX_MOSAIC - Math.floor((t * MAX_MOSAIC) / HALF));
  const nextShot = SHOTS[shot];
  if (nextShot?.mosaic && left <= HALF) mosaic = Math.max(mosaic, 1 + Math.floor(((HALF - left) * (MAX_MOSAIC - 1)) / (HALF - 1)));
  const fadeIn = Math.min(TOP, Math.floor((f * TOP) / FADE_FRAMES));
  const fadeOut = Math.max(0, Math.ceil(((END_AT - 1 - f) * TOP) / OUT_FRAMES));
  return { shot, zoom, x, y, mosaic, level: Math.min(fadeIn, fadeOut, TOP) };
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

// The source pixel the camera shows at screen pixel (dx, dy) of the letterboxed shot.
export function cameraPixel(cam, dx, dy) {
  const sx = Math.round((dx - SHOT_W / 2) / cam.zoom + SHOT_W / 2 + cam.x);
  const sy = Math.round((dy - SHOT_H / 2) / cam.zoom + SHOT_H / 2 + cam.y);
  return [Math.max(0, Math.min(SHOT_W - 1, sx)), Math.max(0, Math.min(SHOT_H - 1, sy))];
}
