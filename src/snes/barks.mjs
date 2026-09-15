// What Ward and Mercer shout in the brawl, in their cast voices (src/snes/audio/voice.mjs): grunts on
// heavies and finishers, an Objection on a parry, a call when a room is cleared, a shout on the special,
// hurt and KO sounds, and a quip at stage clear. Ward is clipped and by the book, Mercer loose and cocky.
// tools/voice.mjs --barks records every line and bakes it into src/snes/audio/barks-brr.mjs.

export const BARKS = {
  ward: {
    heavy: ['Hup!', 'Hah!', 'Down.'],
    finisher: ['Case closed.', 'Filed.'],
    parry: ['Objection!', 'Overruled.'],
    clear: ['Room cleared.', 'Next file.'],
    special: ['By the book!', 'Stand aside!'],
    hurt: ['Ngh!', 'Oof!'],
    ko: ['Not like this...', 'Ugh... filed... late.'],
    victory: ['Notice served.', 'All accounted for.'],
  },
  mercer: {
    heavy: ['Hmph!', 'Hnh!', 'There.'],
    finisher: ['Sit down.', 'And stay down.'],
    parry: ['Objection!', 'Cute.'],
    clear: ['Well. That was fun.', 'Next.'],
    special: ['Pardon me!', 'Excuse me!'],
    hurt: ['Agh!', 'Ow. Rude.'],
    ko: ['Oh, perfect...', 'Worth it...'],
    victory: ['Oh good. Paperwork\'s done.', 'Told you. Good reasons.'],
  },
};

export const KINDS = Object.keys(BARKS.ward);

// A louder moment cuts a quieter line off; a quieter one waits for the line to finish.
export const RANK = { heavy: 1, hurt: 2, finisher: 3, clear: 3, special: 4, parry: 5, victory: 6, ko: 7 };

// Frames a kind stays quiet after it is said, and the share of its moments it is said on, so a string of
// parries or blows taken is not a chant and a grunt stays an event.
export const REST = { heavy: 600, hurt: 480, finisher: 0, clear: 0, special: 300, parry: 480, victory: 0, ko: 0 };
export const CHANCE = { heavy: 0.3, hurt: 0.35, finisher: 1, clear: 1, special: 0.6, parry: 0.7, victory: 1, ko: 1 };
// Frames after a line ends before one no louder starts.
export const GAP = 90;
// A line this loud is said even over someone else talking.
const OVER = RANK.parry;

export const lineId = (who, kind, i) => `${who}-${kind}-${i}`;

// Every line as { id, who, kind, text }.
export const allLines = () => Object.entries(BARKS).flatMap(([who, kinds]) =>
  Object.entries(kinds).flatMap(([kind, texts]) => texts.map((text, i) => ({ id: lineId(who, kind, i), who, kind, text }))));

export const newBarker = (who) => ({ who, last: null, rank: 0, until: 0, quiet: {} });

// The one kind worth saying this frame, loudest first, from the floor's events. `hurt` is true when
// the auditor lost health this frame, `finisher` when an area's last foe was sent at the screen.
export function barkKind(events, { hurt = false, finisher = false } = {}) {
  const has = (e) => events.includes(e);
  const kinds = [];
  if (has('lifeLost')) kinds.push('ko');
  if (has('stageExit') || has('bossDown')) kinds.push('victory');
  if (has('parry')) kinds.push('parry');
  if (has('special') || has('injunction')) kinds.push('special');
  if (finisher) kinds.push('finisher');
  if (has('go')) kinds.push('clear');
  if (hurt) kinds.push('hurt');
  else if (has('heavy')) kinds.push('heavy');
  return kinds.sort((a, b) => RANK[b] - RANK[a])[0] ?? null;
}

// The line to say for `kind` on `frame`, or null while a louder or equal line is still being said or
// has just ended, the kind is resting, the dice say no, or someone else is `busy` talking. Never the
// line said last. `frames(id)` is how long a line lasts; `rand` picks the line, `roll` the chance.
export function bark(state, kind, frame, { frames = () => 40, rand = Math.random, roll = Math.random, busy = false } = {}) {
  const texts = kind && BARKS[state.who]?.[kind];
  if (!texts) return null;
  if (busy && RANK[kind] < OVER) return null;
  if (frame < state.until + GAP && RANK[kind] <= state.rank) return null;
  if (frame < (state.quiet[kind] ?? 0)) return null;
  if (roll() >= CHANCE[kind]) return null;
  const ids = texts.map((_, i) => lineId(state.who, kind, i)).filter((id) => id !== state.last);
  const id = ids[Math.min(ids.length - 1, Math.floor(rand() * ids.length))];
  const until = frame + frames(id);
  Object.assign(state, { last: id, rank: RANK[kind], until });
  state.quiet[kind] = until + REST[kind];
  return id;
}
