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

// Y is the light attack, X the heavy, A Mercer's kick; a route whose dial is 0 is drawn off, and the
// kick's routes (`third`) are only drawn for an auditor who has the kick.
export const ROUTES = [
  { dial: 'routeLLL', keys: ['Y', 'Y', 'Y'], name: 'FINISHER' },
  { dial: 'routeLLH', keys: ['Y', 'Y', 'X'], name: 'KNOCKBACK' },
  { dial: 'routeLH', keys: ['Y', 'X'], name: 'LAUNCHER', mercer: 'POP-UP' },
  { dial: 'routeDazedH', keys: ['DAZED', 'X'], name: 'CRUSH' },
  { dial: 'routeLLA', keys: ['Y', 'Y', 'A'], name: 'LEG SWEEP', third: true },
  { dial: 'routeLA', keys: ['Y', 'A', 'X'], name: 'HOOK CRUSH', third: true },
  { dial: 'routeA', keys: ['A', 'X'], name: 'SNAP CRUSH', third: true },
  { dial: 'routeHA', keys: ['X', 'A'], name: 'SPIN KICK', third: true },
  { dial: 'diveKick', keys: ['JUMP', 'DOWN+Y'], name: 'DIVE KICK', third: true },
];

const HEAVY_SEQ = { launcher: ['Y', 'X'], knockback: ['Y', 'Y', 'X'], crush: ['DAZED', 'X'] };
const KICK_SEQ = { snap: ['A'], hook: ['Y', 'A'], low: ['Y', 'Y', 'A'], spin: ['X', 'A'] };

// The buttons of the chain the auditor is in right now, oldest first.
export function chainKeys(p) {
  if (p.state === 'punch') return Array(p.combo).fill('Y');
  if (p.state === 'kick') return KICK_SEQ[p.route] ?? ['A'];
  if (p.state === 'jump') return p.dive ? ['JUMP', 'DOWN+Y'] : ['JUMP'];
  if (p.state === 'heavy' && p.via) return [...KICK_SEQ[p.via], 'X'];
  if (p.state === 'heavy') return HEAVY_SEQ[p.route] ?? ['X'];
  if (p.chain > 0 && p.lastCombo > 0) return Array(p.lastCombo).fill('Y');
  return [];
}

// How many of each route's buttons the chain has lit: its keys up to where the chain stops matching.
export function routeLights(p, tune) {
  const pressed = chainKeys(p);
  return ROUTES.filter((r) => !r.third || tune.thirdAttack).map(({ mercer, ...r }) => {
    if (mercer && tune.thirdAttack) r.name = mercer;
    const on = Boolean(tune[r.dial]);
    let lit = 0;
    while (on && lit < pressed.length && lit < r.keys.length && r.keys[lit] === pressed[lit]) lit++;
    return { ...r, on, lit: lit === pressed.length ? lit : 0 };
  });
}

// The routes the chain can still finish, or has just finished: what the on-screen combo guide shows.
export const liveRoutes = (p, tune) => routeLights(p, tune).filter((r) => r.on && r.lit > 0);

// The guide's mini-map: the buttons pressed so far along row 0, then the buttons still to press as
// branches, merged where routes share a button. `col` is the step in the chain, `row` the line it sits
// on, `parent` the index of the node it hangs from, and a route's last node carries its name as `end`.
export function guideTree(routes) {
  if (!routes.length) return [];
  const lit = routes[0].lit;
  const nodes = routes[0].keys.slice(0, lit).map((key, col) => ({ key, col, row: 0, parent: col - 1, lit: true, end: null, done: false }));
  let rows = -1;
  for (const r of routes) {
    let parent = lit - 1;
    let row = null;
    for (let col = lit; col < r.keys.length; col++) {
      const at = row == null ? nodes.findIndex((n) => n.parent === parent && n.col === col && n.key === r.keys[col] && !n.end) : -1;
      if (at >= 0) { parent = at; continue; }
      if (row == null) row = Math.max(++rows, nodes[parent]?.row ?? 0);
      nodes.push({ key: r.keys[col], col, row, parent, lit: false, end: null, done: false });
      parent = nodes.length - 1;
    }
    if (parent >= 0 && !nodes[parent].end) Object.assign(nodes[parent], { end: r.name, done: r.lit === r.keys.length });
  }
  return nodes;
}

export const GUIDE_FADE = 20;

// The guide holds the last live routes and fades them out over `fade` frames once the chain ends.
export function guideStep(prev, routes, fade = GUIDE_FADE) {
  if (routes.length) return { routes, t: fade };
  return prev?.t > 1 ? { ...prev, t: prev.t - 1 } : null;
}
