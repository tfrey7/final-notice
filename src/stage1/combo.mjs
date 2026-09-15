// The combo counter and the combo-route map, the pure half: the rating word a run of hits earns, how
// big the count pops, and which buttons of each light/heavy route (moves.mjs) the auditor has pressed.

export const RATINGS = [[3, 'NICE'], [5, 'GREAT'], [8, 'BRUTAL'], [12, 'AUDITED!']];

export function comboRating(hits) {
  let word = '';
  for (const [n, w] of RATINGS) if (hits >= n) word = w;
  return word;
}

// The count's scale this frame: a pop that settles over `settle` frames, a touch bigger per hit.
export function comboScale({ hits, pop }, settle = 8) {
  const base = 1 + Math.min(hits, 12) / 12;
  const burst = pop < settle ? (settle - pop) / settle : 0;
  return base + burst * 0.6;
}

// Y is the light attack, X the heavy; a route whose dial is 0 is drawn off.
export const ROUTES = [
  { dial: 'routeLLL', keys: ['Y', 'Y', 'Y'], name: 'FINISHER' },
  { dial: 'routeLLH', keys: ['Y', 'Y', 'X'], name: 'KNOCKBACK' },
  { dial: 'routeLH', keys: ['Y', 'X'], name: 'LAUNCHER' },
  { dial: 'routeDazedH', keys: ['DAZED', 'X'], name: 'CRUSH' },
];

const HEAVY_SEQ = { launcher: ['Y', 'X'], knockback: ['Y', 'Y', 'X'], crush: ['DAZED', 'X'] };

// The buttons of the chain the auditor is in right now, oldest first.
export function chainKeys(p) {
  if (p.state === 'punch') return Array(p.combo).fill('Y');
  if (p.state === 'heavy') return HEAVY_SEQ[p.route] ?? ['X'];
  if (p.chain > 0 && p.lastCombo > 0) return Array(p.lastCombo).fill('Y');
  return [];
}

// How many of each route's buttons the chain has lit: its keys up to where the chain stops matching.
export function routeLights(p, tune) {
  const pressed = chainKeys(p);
  return ROUTES.map((r) => {
    const on = Boolean(tune[r.dial]);
    let lit = 0;
    while (on && lit < pressed.length && lit < r.keys.length && r.keys[lit] === pressed[lit]) lit++;
    return { ...r, on, lit: lit === pressed.length ? lit : 0 };
  });
}
