// The prop library. A prop is drawn at its anchor point with a band variant (0 corporate,
// 1 backrooms, 2 gothic): the same object, more wrong band by band (docs/SNES-DESCENT.md §3.2).
//
//   anchor 'floor'   x is the left edge, y 0 is the floor line: the prop stands on it, feet at -1,
//                    and its contact shadow falls down-right onto the floor (never sheared: flat).
//   anchor 'wall'    x left, y the top edge, hung on the upper wall.
//   anchor 'ceiling' x left, y 0 the underside of the cornice.
//
// Each prop keeps to ONE palette of its own plus the common slots (outline, shadow, wall).
// Key light upper left: lit top and left faces, dark right and underside.

const shadowFoot = (q, x, w) => {
  q.checker(x + 2, 0, w, 1, 'shadow');
  q.checker(x + 4, 1, w - 2, 1, 'shadow', 0, 1);
};

function desk(q, band) {
  // Reception desk, 96 x 48: a mahogany front in four raised panels, brass nameplate, papers.
  const W = 96;
  shadowFoot(q, 0, W);
  q.rect(0, -48, W, 48, 'outline');
  q.box(1, -40, W - 2, 39, 'wood');
  q.rect(0, -48, W, 8, 'wood', 1);
  q.rect(0, -48, W, 1, 'woodlit');
  q.rect(0, -47, W, 1, 'wood', 2);
  q.rect(0, -41, W, 1, 'outline');
  for (let i = 0; i < 4; i++) {
    const px = 3 + i * 24;
    q.rect(px, -34, 18, 26, 'wood', 0);
    q.rect(px + 1, -33, 16, 24, 'wood', 1);
    q.rect(px + 1, -33, 16, 1, 'woodlit');
    q.rect(px + 1, -33, 1, 24, 'wood', 2);
    if (band === 1 && i === 2) { q.rect(px, -34, 18, 26, 'outline'); q.rect(px + 2, -12, 14, 4, 'paper', 1); }
  }
  q.rect(2, -4, W - 4, 3, 'wood', 0);
  // Nameplate on the front, off-centre: the focal point takes the brightest brass.
  if (band < 2) {
    q.rect(58, -38, 24, 5, 'brass', 0);
    q.rect(59, -38, 22, 1, 'brass', 2);
    q.rect(60, -36, 18, 1, 'brass', band ? 0 : 1);
  } else {
    // The nameplate is an idol now: a figure with its arms raised.
    q.rect(66, -40, 6, 8, 'brass', 0);
    q.rect(67, -44, 4, 4, 'brass', 1);
    q.set(68, -43, 'stamp');
    q.rect(63, -46, 2, 6, 'brass', 1);
    q.rect(73, -46, 2, 6, 'brass', 0);
    q.rect(64, -32, 10, 2, 'brass', 2);
  }
  // Papers on the counter, a lamp arm, a stamp.
  const sheets = band === 0 ? 2 : band === 1 ? 6 : 3;
  for (let s = 0; s < sheets; s++) {
    q.rect(10 + (s & 1), -50 - s * 2, 16, 2, 'paper', 1);
    q.rect(10 + (s & 1), -50 - s * 2, 16, 1, 'paper', 0);
  }
  if (band === 2) q.rect(14, -54, 6, 4, 'stamp');
  q.rect(84, -58, 2, 10, 'brass', 0);
  q.rect(78, -60, 10, 3, 'brass', 1);
  q.rect(78, -60, 10, 1, 'brass', 2);
}

function cabinet(q, band) {
  // Filing cabinet, 24 x 56: four drawers, pulls and label cards.
  shadowFoot(q, 0, 24);
  q.rect(0, -56, 24, 56, 'outline');
  q.box(1, -55, 22, 54, 'steel');
  for (let i = 0; i < 4; i++) {
    const y = -53 + i * 13;
    const open = band === 1 && i === 1 ? 3 : 0;
    q.rect(3 - open, y, 18 + open, 11, 'outline');
    q.box(3 - open, y, 18 + open, 11, 'steel');
    q.rect(8 - open, y + 2, 8, 3, band === 2 ? 'steellit' : 'plastic', 1);
    q.rect(8 - open, y + 4, 8, 1, 'steel', 0);
    if (band === 2) { q.rect(10 - open, y + 6, 4, 3, 'outline'); q.rect(11 - open, y + 7, 2, 1, 'steellit'); }
    else { q.rect(9 - open, y + 7, 6, 2, 'steel', 0); q.rect(9 - open, y + 7, 6, 1, 'steellit'); }
    if (open) q.checker(1, y + 11, 20, 2, 'shadow');
  }
}

function cooler(q, band) {
  // Water cooler, 16 x 44: steel stand, plastic tap body, bottle on top.
  shadowFoot(q, 0, 16);
  q.rect(1, -24, 14, 24, 'outline');
  q.box(2, -23, 12, 22, 'plastic');
  q.rect(4, -18, 3, 3, 'steel', 0);
  q.rect(9, -18, 3, 3, band === 2 ? 'led' : 'steel', 0);
  q.rect(4, -18, 3, 1, 'steellit');
  q.rect(3, -4, 10, 3, 'steel', 0);
  // Bottle: a rounded shoulder, water up to a level that falls with the band.
  q.rect(2, -44, 12, 20, 'outline');
  q.rect(3, -43, 10, 19, 'steellit');
  q.rect(6, -25, 4, 1, 'steel', 1);
  const level = band === 1 ? -33 : -42;
  for (let y = level; y < -25; y++) q.rect(3, y, 10, 1, 'water', y < level + 3 ? 2 : 1);
  q.rect(3, level, 1, -25 - level, 'water', 2);
  q.rect(12, level, 1, -25 - level, 'water', 0);
  q.rect(4, -42, 2, 6, 'steellit');
  q.clear(2, -44); q.clear(13, -44);
  if (band === 0) { q.set(8, -31, 'water', 2); q.set(9, -36, 'water', 2); q.set(7, -39, 'steellit'); }
  if (band === 1) { q.rect(20, -4, 4, 4, 'outline'); q.rect(21, -4, 2, 3, 'steellit'); }
  if (band === 2) {
    // Something turning in the dark water.
    q.rect(6, -38, 4, 1, 'led'); q.rect(9, -37, 1, 3, 'led'); q.rect(6, -34, 3, 1, 'led'); q.set(6, -35, 'led');
  }
}

function palm(q, band) {
  // Potted palm, 32 x 56: tapered pot, fronds arching out from the crown, lit from the left.
  shadowFoot(q, 4, 24);
  q.rect(8, -16, 16, 16, 'outline');
  for (let y = -15; y < -1; y++) {
    const inset = Math.floor((y + 15) / 6);
    q.rect(9 + inset, y, 14 - inset * 2, 1, 'pot', 1);
    q.set(9 + inset, y, 'pot', 2);
    q.set(22 - inset, y, 'pot', 0);
  }
  q.rect(7, -17, 18, 3, 'pot', 2);
  q.rect(7, -15, 18, 1, 'pot', 0);
  if (band === 2) {
    // A plinth of violet stone where the pot stood, the pot set on it, the palm a bare stick.
    q.rect(6, -20, 20, 3, 'pot', 2);
    q.rect(15, -48, 2, 30, 'frond');
    q.rect(15, -48, 1, 30, 'leaf', 2);
    q.rect(12, -44, 3, 1, 'frond');
    q.rect(17, -38, 4, 1, 'frond');
    return;
  }
  q.rect(15, -34, 2, 18, 'frond');
  const fronds = band === 0
    ? [[-1, -1], [1, -1], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1]]
    : [[-1, -1], [1, 0], [0, -1], [1, 1]];
  fronds.forEach(([dx, dy], i) => {
    for (let t = 0; t < 16; t++) {
      const x = 16 + dx * t;
      const y = -34 + dy * 10 - Math.round(dy <= 0 ? 8 * Math.sin((t / 16) * Math.PI) : -t * 0.5) + (dy === 0 ? t >> 2 : 0);
      const dead = band === 1 && i === 1;
      const m = dead ? 'frond' : 'leaf';
      // Rib lit on top, leaflets hanging below it, longer toward the middle of the frond.
      q.set(x, y, m, dx < 0 ? 2 : 1);
      q.set(x, y + 1, m, 1);
      const hang = t > 2 && t < 14 ? Math.min(3, Math.min(t, 16 - t) >> 2) : 0;
      if (t % 2 === 0) for (let k = 2; k <= hang + 1; k++) q.set(x + (k & 1 ? dx : 0), y + k, m, k > 2 ? 0 : 1);
    }
  });
  if (band === 1) q.checker(9, -34, 14, 6, 'leaf', 0);
}

function copier(q, band) {
  // Copier, 40 x 40: beige body, steel lid, a paper tray and a status light.
  shadowFoot(q, 0, 40);
  q.rect(0, -36, 40, 36, 'outline');
  q.box(1, -35, 38, 34, 'plastic');
  q.rect(1, -40, 38, 6, 'outline');
  q.box(2, -39, 36, 5, 'steel');
  q.rect(4, -28, 20, 3, 'steel', 0);
  q.rect(26, -29, 10, 5, 'steel', 1);
  q.set(34, -27, 'led');
  q.rect(1, -18, 38, 1, 'steel', 0);
  q.rect(1, -8, 38, 1, 'steel', 0);
  if (band === 0) { q.rect(38, -22, 8, 2, 'steellit'); q.rect(38, -22, 8, 1, 'plastic', 1); }
  if (band === 1) {
    for (let i = 0; i < 4; i++) q.rect(36 + i * 2, -22 + i * 5, 8, 2, 'steellit');
    q.rect(30, -41, 6, 2, 'steellit');
  }
  if (band === 2) for (let y = -22; y < -1; y++) q.rect(38 + ((y & 4) ? 1 : 0), y, 6, 1, (y & 1) ? 'steellit' : 'plastic', 1);
}

function chair(q, band) {
  // Office chair, 16 x 28 (32 tall in gothic): seat, back, gas stem, five-star base.
  shadowFoot(q, 0, 16);
  q.rect(1, -2, 14, 2, 'outline');
  q.rect(7, -10, 2, 8, 'shadow');
  q.rect(7, -10, 1, 8, 'wall', 2);
  if (band === 1) {
    // Turned to face the wall: only the back shows.
    q.rect(2, -28, 12, 18, 'outline');
    q.box(3, -27, 10, 16, 'fabric');
    return;
  }
  q.rect(1, -14, 14, 4, 'outline');
  q.box(2, -13, 12, 3, 'fabric');
  const top = band === 2 ? -40 : -28;
  q.rect(9, top, 6, -13 - top, 'outline');
  q.box(10, top + 1, 4, -15 - top, 'fabric');
  if (band === 2) { q.set(11, top - 1, 'outline'); q.set(12, top - 2, 'outline'); q.set(12, top - 1, 'fabric', 2); }
}

function fixture(q, band) {
  // Ceiling fixture, 40 x 8: housing and a tube; backrooms one tube dead, gothic a candle bracket.
  if (band === 2) {
    q.rect(19, 0, 2, 4, 'panel', 0);
    q.rect(8, 4, 24, 2, 'panel', 1);
    q.rect(8, 4, 24, 1, 'cornice');
    for (const cx of [8, 19, 30]) {
      q.rect(cx, 1, 2, 3, 'ceiling', 1);
      q.set(cx, 0, 'glow', 2);
      q.set(cx + 1, -1, 'glow', 1);
    }
    return;
  }
  q.rect(0, 0, 40, 6, 'outline');
  q.rect(1, 0, 38, 5, 'panel', 1);
  q.rect(1, 0, 38, 1, 'cornice');
  q.rect(3, 3, 34, 2, 'glow', 2);
  q.rect(3, 4, 34, 1, 'glow', 1);
  if (band === 1) { q.rect(20, 3, 17, 2, 'glow', 0); q.checker(3, 3, 17, 2, 'glow', 1); }
  q.checker(2, 6, 36, 2, 'glow', 0);
}

function door(q, band) {
  // Door, 40 wide, 72 tall (64 in the backrooms: 8 px too short), on the floor line.
  const h = band === 1 ? 64 : 72;
  shadowFoot(q, 0, 40);
  q.rect(0, -h, 40, h, 'outline');
  q.rect(1, -h + 1, 38, h - 1, 'door', 2);
  q.rect(37, -h + 1, 2, h - 1, 'door', 0);
  q.rect(4, -h + 4, 32, h - 4, 'outline');
  q.box(5, -h + 5, 30, h - 5, 'door');
  for (const [py, ph] of [[-h + 9, 24], [-h + 38, h - 42]]) {
    q.rect(9, py, 22, ph, 'door', 0);
    q.rect(10, py + 1, 20, ph - 2, 'door', 1);
    q.rect(10, py + 1, 20, 1, 'door', 2);
  }
  q.rect(30, -38, 3, 3, 'gilt', 1);
  q.set(30, -38, 'gilt', 2);
  if (band === 2) {
    // A pointed head and a brass ring instead of a knob.
    for (let y = 0; y < 12; y++) { q.rect(1, -h + y, 17 - Math.round(y * 1.4), 1, 'wall', 1); q.rect(22 + Math.round(y * 1.4), -h + y, 17 - Math.round(y * 1.4), 1, 'wall', 0); }
    q.rect(29, -40, 5, 5, 'gilt', 0); q.rect(30, -39, 3, 3, 'outline');
  }
  // A plate over the door.
  q.rect(10, -h - 8, 20, 6, 'gilt', 0);
  q.rect(11, -h - 7, 18, 4, band === 2 ? 'canvas' : 'gilt', band === 2 ? 2 : 1);
}

function art(q, band) {
  // Employee of the Month, 32 x 28: gilt frame, a face on the canvas.
  q.rect(0, 0, 32, 28, 'outline');
  q.rect(1, 1, 30, 26, 'gilt', 1);
  q.rect(1, 1, 30, 1, 'gilt', 2);
  q.rect(1, 1, 1, 26, 'gilt', 2);
  q.rect(30, 2, 1, 25, 'gilt', 0);
  q.rect(4, 4, 24, 20, 'canvas', 0);
  q.checker(4, 4, 24, 20, 'canvas', 0);
  // Head and shoulders.
  q.rect(9, 18, 14, 6, band === 2 ? 'door' : 'canvas', band === 2 ? 0 : 2);
  q.rect(12, 8, 8, 9, 'canvas', 1);
  q.rect(12, 8, 8, 2, band === 2 ? 'door' : 'canvas', band === 2 ? 1 : 2);
  q.rect(19, 9, 1, 8, 'gilt', 0);
  if (band === 0) { q.set(14, 12, 'outline'); q.set(17, 12, 'outline'); q.rect(14, 15, 4, 1, 'canvas', 2); }
  if (band === 1) { q.set(14, 12, 'outline'); q.set(17, 12, 'outline'); q.rect(14, 15, 4, 1, 'outline'); q.checker(4, 4, 24, 20, 'canvas', 3, 1); }
  if (band === 2) { q.set(14, 12, 'canvas', 2); q.set(17, 12, 'canvas', 2); q.rect(14, 15, 4, 1, 'outline'); }
  q.rect(10, 29, 12, 3, 'gilt', 0);
}

function papers(q, band) {
  // Stamped-paper stack, 16 x 12; banker's boxes in the backrooms; wax-sealed in gothic.
  shadowFoot(q, 0, 16);
  if (band === 1) {
    for (const [bx, by] of [[0, -10], [2, -20]]) {
      q.rect(bx, by, 16, 10, 'outline');
      q.box(bx + 1, by + 1, 14, 9, 'paper');
      q.rect(bx + 5, by + 4, 6, 2, 'wood', 1);
    }
    return;
  }
  for (let i = 0; i < 5; i++) {
    q.rect(1 + (i % 2), -2 - i * 2, 14, 2, 'outline');
    q.rect(2 + (i % 2), -2 - i * 2, 12, 1, 'paper', 1);
  }
  q.rect(2, -12, 12, 2, 'paper', 1);
  q.rect(2, -12, 12, 1, 'paper', 0);
  if (band === 0) { q.rect(9, -12, 3, 1, 'stamp'); }
  else { q.rect(7, -14, 4, 4, 'stamp'); q.set(8, -13, 'woodlit'); q.rect(9, -10, 1, 4, 'stamp'); }
}

export const PROPS = {
  desk: { draw: desk, anchor: 'floor', w: 96, h: 60 },
  cabinet: { draw: cabinet, anchor: 'floor', w: 24, h: 56 },
  cooler: { draw: cooler, anchor: 'floor', w: 24, h: 44 },
  palm: { draw: palm, anchor: 'floor', w: 32, h: 56 },
  copier: { draw: copier, anchor: 'floor', w: 46, h: 42 },
  chair: { draw: chair, anchor: 'floor', w: 16, h: 42 },
  fixture: { draw: fixture, anchor: 'ceiling', w: 40, h: 8 },
  door: { draw: door, anchor: 'floor', w: 40, h: 80 },
  art: { draw: art, anchor: 'wall', w: 32, h: 32 },
  papers: { draw: papers, anchor: 'floor', w: 20, h: 20 },
};
