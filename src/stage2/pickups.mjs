// Floating ledger pickups and the two enchantments you carry: Seal of Notice plus one. Pure.

export const PICKUP_MARKS = { C: 'carbonCopy', T: 'redTape', M: 'margin' };
export const BOB = 3;

// Every mark of the given characters in a text map, as { ch, x, y } with y the bottom of its tile.
export function marks(map, chars, tile = 16) {
  const out = [];
  map.forEach((line, row) => [...line].forEach((ch, col) => {
    if (chars.includes(ch)) out.push({ ch, x: col * tile + tile / 2, y: (row + 1) * tile });
  }));
  return out;
}

export const createPickups = (map) => marks(map, Object.keys(PICKUP_MARKS)).map(({ ch, x, y }) => ({ name: PICKUP_MARKS[ch], x, baseY: y - 4, y: y - 4, w: 12, h: 12 }));

export function carry(run, name) {
  if (name === 'notice') return;
  // With Seal in hand the new one replaces the other slot; with the extra in hand there is nothing else to
  // replace (Seal is never dropped), so the new one takes its place and stays in hand.
  run.carried[1] = name;
}

export function swapHand(run) {
  if (!run.carried[1 - run.hand]) return false;
  run.hand = 1 - run.hand;
  return true;
}

export const inHand = (run) => run.carried[run.hand] ?? 'notice';

// Contra's rule for the gun: a lost life drops the pickup enchantment and puts Seal back in hand.
export function dropExtra(run) {
  run.carried[1] = null;
  run.hand = 0;
}

// One frame: the ledgers bob, and one the auditor's body touches is taken. Answers the events.
export function stepPickups(run) {
  const p = run.player;
  const events = [];
  run.pickups = run.pickups.filter((k) => {
    k.y = k.baseY + Math.round(Math.sin(run.frame / 10) * BOB);
    const touch = Math.abs(k.x - p.x) < (k.w + p.w) / 2 && k.y > p.y - p.h && k.y - k.h < p.y;
    if (!touch) return true;
    carry(run, k.name);
    events.push({ type: 'pickup', name: k.name });
    return false;
  });
  return events;
}
