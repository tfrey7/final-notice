// The cinema player's rules, without Phaser: which picture each page shows, how the text types out,
// what A, B and Start do, and the NES palette fade between pictures.
import { SCENES } from './script.mjs';
import { wrap } from '../text/font.mjs';

export const SCENE_IDS = { scene1: 'assignment', scene2: 'incident', scene3: 'documents' };

export const FRAMES_PER_LETTER = 2;
export const FADE_STEPS = 4;
export const FRAMES_PER_FADE_STEP = 4;

// Script pictures as a backdrop plus the speaker's portrait (art names `backdrop.*`, `portrait.*`).
const BACKDROPS = {
  'bellwether-office': 'bellwether-office',
  bellwether: 'bellwether-office',
  'bellwether-phone': 'break-room',
  'vellum-desk': 'vellum-desk',
  'retention-button': 'archive-button',
  'ledger-glow': 'archive-button',
  'ledger-page': 'ledger-page',
  'wall-speaker': 'break-room',
  'break-room': 'break-room',
};
const HOME = { assignment: 'bellwether-office', incident: 'vellum-desk', documents: 'break-room' };
const NO_PORTRAIT = new Set(['retention-button', 'ledger-page']);

// Every page of a scene as the chosen auditor sees it; a line too long for one box runs onto a second.
// `wrapper(text)` answers pages of lines: the NES font's columns by default, the SNES its pixel widths.
export function cinemaPages(sceneId, auditor, wrapper = wrap) {
  const out = [];
  for (const [n, beat] of SCENES[sceneId].beats.entries()) {
    const who = beat.speaker === 'auditor' ? auditor : beat.speaker;
    const text = beat.speaker === 'auditor' ? beat[auditor] : beat.line;
    wrapper(text).forEach((lines, i) => out.push({
      backdrop: BACKDROPS[beat.picture] ?? HOME[sceneId],
      portrait: NO_PORTRAIT.has(beat.picture) ? null : who,
      speaker: who,
      lines,
      sound: i === 0 ? beat.sound ?? null : null,
      beat: n,
      part: i,
    }));
  }
  return out;
}

export const letters = (page) => page.lines.reduce((n, line) => n + line.length, 0);

export function startPlayer(sceneId, auditor, wrapper = wrap) {
  return { pages: cinemaPages(sceneId, auditor, wrapper), page: 0, typed: 0, clock: 0, done: false };
}

// One frame of typing; `blip` on every other letter that is not a space.
export function tick(player) {
  const page = player.pages[player.page];
  if (player.done || player.typed >= letters(page)) return { player, blip: false };
  const clock = player.clock + 1;
  if (clock < FRAMES_PER_LETTER) return { player: { ...player, clock }, blip: false };
  const typed = player.typed + 1;
  const ch = page.lines.join('')[typed - 1];
  return { player: { ...player, clock: 0, typed }, blip: typed % 2 === 1 && ch !== ' ' };
}

// A or B finishes the page being typed, then turns it; past the last page the scene is done. Start skips.
export function press(player, button) {
  if (player.done) return player;
  if (button === 'start') return { ...player, done: true };
  if (button !== 'a' && button !== 'b') return player;
  const page = player.pages[player.page];
  if (player.typed < letters(page)) return { ...player, typed: letters(page), clock: 0 };
  if (player.page + 1 >= player.pages.length) return { ...player, done: true };
  return { ...player, page: player.page + 1, typed: 0, clock: 0 };
}

// The lines of a page with only `typed` letters showing.
export function visibleLines(page, typed) {
  let left = typed;
  return page.lines.map((line) => {
    const shown = line.slice(0, Math.max(0, left));
    left -= line.length;
    return shown;
  });
}

// One step darker on the NES: down a brightness row, and black below the darkest row.
export function fadeIndex(idx, steps) {
  let out = idx;
  for (let i = 0; i < steps; i++) out = out < 0x10 || (out & 0x0f) >= 0x0d ? 0x0f : out - 0x10;
  return out;
}

// The [page, step] pictures a change of backdrop passes through: out from the old one, in to the new.
export function fadeSteps(from, to) {
  const out = [];
  if (from !== null) for (let s = 1; s <= FADE_STEPS; s++) out.push([from, s]);
  for (let s = FADE_STEPS - 1; s >= 0; s--) out.push([to, s]);
  return out;
}
