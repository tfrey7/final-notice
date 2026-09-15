// The kit's eight background palettes, one anchor set per descent band (docs/SNES-DESCENT.md §2).
// Slot order never changes between bands, so drift is a CGRAM write, never new tiles.
//
// Every palette opens with the same five COMMON slots, so shadows, outlines and the wall ramp can
// sit in any tile whatever its material:
//   1 outline   2 shadow   3-5 wall dark, mid, light
// Slots 6-15 are the palette's own materials, named in MATERIALS below. The sky (BG2 only) and the
// overlay (BG3) never share a tile with BG1 materials, so their own slots start at 1.
import { rgb15, channels } from '../color.mjs';

export const BANDS = ['corporate', 'backrooms', 'gothic'];
// The descent a band's anchors are drawn at; between two anchors a slot is a lerp.
export const ANCHORS = { corporate: 10, backrooms: 52, gothic: 90 };

export const bandOf = (d) => (d < 30 ? 'corporate' : d < 75 ? 'backrooms' : 'gothic');

const c15 = (h) => {
  const n = parseInt(h.slice(1), 16);
  return rgb15((n >> 19) & 31, (n >> 11) & 31, (n >> 3) & 31);
};

// Palette index, then its ten own slots (6-15) as [name, steps] in slot order.
export const MATERIALS = {
  sky: [0, [['sky', 3], ['haze', 1], ['star', 1], ['moon', 2], ['far', 2], ['near', 2], ['lit', 2], ['beacon', 1]]],
  floor: [1, [['slab', 3], ['grout', 1], ['vein', 1], ['polish', 1], ['reflect', 1], ['rug', 3]]],
  trim: [2, [['panel', 3], ['cornice', 1], ['ceiling', 2], ['glow', 3], ['spec', 1]]],
  wood: [3, [['wood', 3], ['woodlit', 1], ['brass', 3], ['paper', 2], ['stamp', 1]]],
  metal: [4, [['steel', 3], ['steellit', 1], ['water', 3], ['plastic', 2], ['led', 1]]],
  plant: [5, [['leaf', 3], ['frond', 1], ['pot', 3], ['fabric', 3]]],
  door: [6, [['door', 3], ['gilt', 3], ['canvas', 4]]],
  overlay: [7, [['silhouette', 3]]],
};

// Band anchors, hex, 5 common then 10 own per palette. BG3's overlay uses only slots 1-3.
const RAW = {
  corporate: {
    common: ['#181838', '#302848', '#804848', '#B07060', '#D89880'],
    sky: ['#102048', '#183060', '#204070', '#305080', '#F8F0D0', '#E8E0B0', '#F8F8E0', '#182038', '#283050', '#101828', '#202840', '#F8D878', '#C89048', '#D83030'],
    floor: ['#A08878', '#C8B0A0', '#E8D8C8', '#705858', '#907070', '#F8F0E8', '#98A8C8', '#501828', '#782838', '#A04848'],
    trim: ['#603020', '#804028', '#A05838', '#E8C8A8', '#A89888', '#C8B8A8', '#C8C8B8', '#E8E8D8', '#F8F8F0', '#C8E0F0'],
    wood: ['#401810', '#603020', '#884030', '#B06040', '#806020', '#D8B050', '#F8E890', '#F8F0D8', '#C8C0A8', '#C03030'],
    metal: ['#484858', '#686878', '#9898A8', '#D0D0D8', '#2858A8', '#4888D8', '#88C8F8', '#B8A888', '#D8C8A8', '#40D860'],
    plant: ['#184828', '#306840', '#58905C', '#806030', '#683828', '#985838', '#C08058', '#283050', '#384878', '#5068A0'],
    door: ['#502818', '#703828', '#904830', '#806020', '#D8B050', '#F8E890', '#305878', '#F0C8A0', '#A04838', '#F8F0E0'],
    overlay: ['#080818', '#181838', '#283050'],
  },
  backrooms: {
    common: ['#282818', '#484028', '#787038', '#A89850', '#C8B868'],
    sky: ['#282818', '#383820', '#484828', '#585830', '#A8A878', '#C8C090', '#D8D0A0', '#202010', '#303018', '#181808', '#282810', '#A89850', '#786838', '#804020'],
    floor: ['#403018', '#604C28', '#806838', '#302410', '#403018', '#A89850', '#C8B868', '#483818', '#584828', '#685830'],
    trim: ['#605028', '#786838', '#908048', '#D8D0A0', '#B8B088', '#D8D0A0', '#A8A878', '#D8D8A0', '#F0F0B8', '#F0F0B8'],
    wood: ['#483818', '#604C28', '#786030', '#907840', '#605020', '#908040', '#B8A860', '#D8D0A0', '#A8A078', '#806838'],
    metal: ['#585838', '#787850', '#989868', '#C8C898', '#887020', '#B8A030', '#D8D060', '#A89868', '#C8B888', '#A8A878'],
    plant: ['#485030', '#687048', '#889068', '#605030', '#604830', '#806040', '#A08050', '#585038', '#787048', '#908858'],
    door: ['#585030', '#706840', '#888050', '#605020', '#908040', '#B8A860', '#686848', '#C8B888', '#786838', '#D8D0A0'],
    overlay: ['#181808', '#282818', '#403820'],
  },
  gothic: {
    common: ['#080810', '#201828', '#302040', '#503860', '#786088'],
    sky: ['#080810', '#140C1C', '#201428', '#302040', '#E0D8B8', '#B83028', '#E05838', '#100818', '#201430', '#080810', '#180C20', '#E05838', '#801818', '#E8B048'],
    floor: ['#281C38', '#382848', '#503C60', '#080810', '#B83028', '#786088', '#E05838', '#401010', '#801818', '#B83028'],
    trim: ['#201428', '#302038', '#483050', '#486850', '#181020', '#281830', '#804018', '#E8B048', '#F8E0A0', '#E0D8B8'],
    wood: ['#180810', '#301420', '#482030', '#683040', '#283828', '#486850', '#88A080', '#E0D8B8', '#A09880', '#B83028'],
    metal: ['#181020', '#302438', '#504058', '#786088', '#080810', '#201428', '#401830', '#483850', '#605068', '#E05838'],
    plant: ['#282018', '#403020', '#605030', '#486850', '#302038', '#504058', '#786088', '#200818', '#401028', '#682040'],
    door: ['#180810', '#301420', '#482030', '#283828', '#486850', '#88A080', '#201428', '#E0C8B8', '#801818', '#E0D8B8'],
    overlay: ['#040408', '#100818', '#201428'],
  },
};

const NAMES = Object.keys(MATERIALS);

function anchor(band) {
  const r = RAW[band];
  return NAMES.map((n) => {
    const own = n === 'overlay' || n === 'sky' ? r[n] : [...r.common, ...r[n]];
    const pal = own.map(c15);
    while (pal.length < 15) pal.push(pal[pal.length - 1]);
    return pal;
  });
}

export const BAND_PALETTES = Object.fromEntries(BANDS.map((b) => [b, anchor(b)]));

const lerp15 = (a, b, t) => {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return rgb15(m(ar, br), m(ag, bg), m(ab, bb));
};

// The eight palettes at descent d: each slot lerped between the anchors either side, snapped to 5 bits.
export function palettesAt(d) {
  const stops = BANDS.map((b) => [ANCHORS[b], BAND_PALETTES[b]]);
  if (d <= stops[0][0]) return BAND_PALETTES.corporate;
  if (d >= stops[2][0]) return BAND_PALETTES.gothic;
  const i = d < stops[1][0] ? 0 : 1;
  const [d0, p0] = stops[i];
  const [d1, p1] = stops[i + 1];
  const t = (d - d0) / (d1 - d0);
  return p0.map((pal, k) => pal.map((c, s) => lerp15(c, p1[k][s], t)));
}

// Material name -> { pal, values: [dark..light] }. COMMON materials carry pal -1: any palette.
export const MAT = { outline: { pal: -1, values: [1] }, shadow: { pal: -1, values: [2] }, wall: { pal: -1, values: [3, 4, 5] } };
for (const [pal, slots] of Object.values(MATERIALS)) {
  let v = 6;
  if (pal === 0 || pal === 7) v = 1;
  for (const [name, n] of slots) {
    MAT[name] = { pal, values: Array.from({ length: n }, (_, i) => v + i) };
    v += n;
  }
}
