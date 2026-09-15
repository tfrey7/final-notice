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
// `match` is that run of buttons whether or not the route survived it, so a route the chain has ruled
// out still knows where it parted company; `live` is a route the chain can still finish, and `lit`
// counts buttons only on those. `done` is a route the chain has just finished.
export function routeLights(p, tune) {
  const pressed = chainKeys(p);
  return ROUTES.filter((r) => !r.third || tune.thirdAttack).map(({ mercer, ...r }) => {
    if (mercer && tune.thirdAttack) r.name = mercer;
    const on = Boolean(tune[r.dial]);
    let match = 0;
    while (on && match < pressed.length && match < r.keys.length && r.keys[match] === pressed[match]) match++;
    const live = match === pressed.length;
    const lit = live ? match : 0;
    return { ...r, on, match, live, lit, done: on && lit > 0 && lit === r.keys.length };
  });
}

// Every route this chain opened: the ones it can still finish, and the ones its later buttons ruled
// out, which stay on the map dimmed so the guide's shape holds steady for the whole chain.
export function guideRoutes(lights) {
  const rows = lights.filter((r) => r.on && r.match > 0);
  return rows.some((r) => r.live) ? rows : [];
}

export const liveRoutes = (p, tune) => guideRoutes(routeLights(p, tune));

export const NAME_HOLD = 40;

// The word the combo counter shouts when a route completes, held for a beat and then cleared.
export function comboName(prev, routes, hold = NAME_HOLD) {
  const done = routes.find((r) => r.done);
  if (done) return prev?.on && prev.name === done.name ? prev : { name: done.name, t: hold, on: true };
  const t = (prev?.t ?? 0) - 1;
  return t > 0 ? { name: prev.name, t, on: false } : null;
}

// The guide's mini-map: the buttons pressed so far along row 0, then the buttons still to press as
// branches, merged where routes share a button. `col` is the step in the chain, `row` the line it sits
// on, `parent` the index of the node it hangs from, and a route's last node carries its name as `end`.
// A ruled-out route hangs off the button where the chain left it, so its branch keeps its place on the
// map while the live ones carry on; `live` on a node is false down such a branch, and the guide dims it.
export function guideTree(routes) {
  const first = routes.find((r) => r.live);
  if (!first) return [];
  const lit = first.match;
  const nodes = first.keys.slice(0, lit).map((key, col) => ({ key, col, row: 0, parent: col - 1, lit: true, live: true, end: null, done: false }));
  // A branch takes the first line at or below the button it hangs from with nothing already on it from
  // that column on, so branches never write over each other however early a ruled-out route parted.
  const free = (row, col) => !nodes.some((n) => n.row === row && n.col >= col);
  for (const r of routes) {
    let parent = r.match - 1;
    let row = null;
    const from = nodes.length;
    for (let col = r.match; col < r.keys.length; col++) {
      const at = row == null ? nodes.findIndex((n) => n.parent === parent && n.col === col && n.key === r.keys[col] && n.live === r.live && !n.end) : -1;
      if (at >= 0) { parent = at; continue; }
      if (row == null) for (row = nodes[parent]?.row ?? 0; !free(row, col); row++);
      nodes.push({ key: r.keys[col], col, row, parent, lit: false, live: r.live, end: null, done: false });
      parent = nodes.length - 1;
    }
    if (parent >= 0 && !nodes[parent].end && (r.live || nodes.length > from)) Object.assign(nodes[parent], { end: r.name, done: r.done, live: r.live || nodes[parent].live });
  }
  return nodes;
}

export const GUIDE_FADE = 20;

// The guide holds the last live routes and fades them out over `fade` frames once the chain ends.
export function guideStep(prev, routes, fade = GUIDE_FADE) {
  if (routes.length) return { routes, t: fade };
  return prev?.t > 1 ? { ...prev, t: prev.t - 1 } : null;
}
