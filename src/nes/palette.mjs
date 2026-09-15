// The 2C02 master palette (FCEUX values), indexed 0x00-0x3F.
export const MASTER = [
  0x747474, 0x24188c, 0x0000a8, 0x44009c, 0x8c0074, 0xa80010, 0xa40000, 0x7c0800,
  0x402c00, 0x004400, 0x005000, 0x003c14, 0x183c5c, 0x000000, 0x000000, 0x000000,
  0xbcbcbc, 0x0070ec, 0x2038ec, 0x8000f0, 0xbc00bc, 0xe40058, 0xd82800, 0xc84c0c,
  0x887000, 0x009400, 0x00a800, 0x009038, 0x008088, 0x000000, 0x000000, 0x000000,
  0xfcfcfc, 0x3cbcfc, 0x5c94fc, 0xcc88fc, 0xf478fc, 0xfc74b4, 0xfc7460, 0xfc9838,
  0xf0bc3c, 0x80d010, 0x4cdc48, 0x58f898, 0x00e8d8, 0x787878, 0x000000, 0x000000,
  0xfcfcfc, 0xa8e4fc, 0xc4d4fc, 0xd4c8fc, 0xfcc4fc, 0xfcc4d8, 0xfcbcb0, 0xfcd8a8,
  0xfce4a0, 0xe0fca0, 0xa8f0bc, 0xb0fccc, 0x9cfcf0, 0xc4c4c4, 0x000000, 0x000000,
];

export function isIndex(idx) {
  return Number.isInteger(idx) && idx >= 0 && idx < MASTER.length;
}

// A master palette index as a Phaser colour (0xRRGGBB).
export function nes(idx) {
  if (!isIndex(idx)) throw new RangeError(`not an NES palette index: ${idx}`);
  return MASTER[idx];
}

export function rgb(idx) {
  const c = nes(idx);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

// A palette set: one shared backdrop, 4 background and 4 sprite palettes of 3 indices each.
export function paletteSet({ backdrop, bg, sprite }) {
  const set = { backdrop, bg, sprite };
  const problems = paletteSetProblems(set);
  if (problems.length) throw new Error(problems.join('; '));
  return set;
}

export function paletteSetProblems({ backdrop, bg, sprite }) {
  const problems = [];
  if (!isIndex(backdrop)) problems.push(`backdrop ${backdrop} is not an NES index`);
  for (const [kind, list] of [['bg', bg], ['sprite', sprite]]) {
    if (!Array.isArray(list) || list.length !== 4) {
      problems.push(`${kind} needs 4 palettes`);
      continue;
    }
    list.forEach((pal, i) => {
      if (!Array.isArray(pal) || pal.length !== 3) problems.push(`${kind}[${i}] needs 3 colours`);
      else if (!pal.every(isIndex)) problems.push(`${kind}[${i}] has a colour outside the NES palette`);
    });
  }
  return problems;
}
