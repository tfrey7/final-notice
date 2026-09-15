// The scene description format and its compositor. An area is data:
//
//   {
//     name: 'Reception',
//     descent: 3,                 // 0-100; picks the band (tileset, prop variants) and the palettes
//     band: 'corporate',          // optional: force a band's architecture at any descent
//     cols: 64,                   // near layer width in 8 px tiles (the map wraps)
//     windows: [24, 120],         // left edges of the window openings in the near wall
//     props: [{ prop: 'desk', x: 192 }, { prop: 'art', x: 304, y: 40 }, { prop: 'cooler', x: 320, band: 'backrooms' }],
//     fixtures: [192, 280],       // ceiling fixtures, a shorthand for ceiling props
//     overlay: { beams: 128 },    // foreground soffit beams on BG3, one every n px
//   }
//
// buildArea() answers a Mode 1 scene for layers.mjs: BG2 far and mid (one skyline, two HDMA speed
// bands), BG1 near (tileset + props, floor bent by HDMA), BG3 overlay (three-colour silhouettes
// above head height, faster than the camera), glass and floor-darkness colour math.
import { rgb15 } from '../color.mjs';
import { floorTable } from '../layers.mjs';
import { floorMath } from '../bg/claims.mjs';
import { BANDS, bandOf, palettesAt } from './palettes.mjs';
import { driftTable } from '../descent.mjs';
import { painter, cut } from './paint.mjs';
import { ROOM, SKY_SPLIT, TILESETS, WINDOW, skyline } from './tilesets.mjs';
import { PROPS } from './props.mjs';

export const SPEEDS = { far: 0.25, mid: 0.5, near: 1, overlay: 1.25 };
const GLASS = { corporate: rgb15(7, 11, 15), backrooms: rgb15(12, 12, 6), gothic: rgb15(14, 3, 3) };

const propY = (prop) => (prop.anchor === 'floor' ? ROOM.floor : prop.anchor === 'ceiling' ? ROOM.cornice : 40);

function overlay(cols, every) {
  const p = painter(cols);
  if (!every) return p;
  // A soffit beam across the top with a bracket dropping every `every` px: the nearest plane.
  p.rect(0, 0, p.w, 6, 'silhouette', 1);
  p.rect(0, 6, p.w, 1, 'silhouette', 0);
  p.checker(0, 5, p.w, 1, 'silhouette', 2);
  for (let x = 0; x < p.w; x += every) {
    p.rect(x, 7, 16, 4, 'silhouette', 1);
    p.rect(x + 2, 11, 12, 3, 'silhouette', 0);
    p.rect(x, 7, 1, 4, 'silhouette', 2);
  }
  return p;
}

export function buildArea(desc) {
  const d = desc.descent ?? 0;
  const band = desc.band ?? bandOf(d);
  const cols = desc.cols ?? 64;
  const tiles = {};

  const sky = painter(32);
  skyline(sky);
  const view = cut(sky, 'kv', tiles, 0);

  const near = painter(cols);
  TILESETS[band](near, { windows: desc.windows ?? [] });
  const placed = [...(desc.fixtures ?? []).map((x) => ({ prop: 'fixture', x })), ...(desc.props ?? [])];
  for (const pl of placed) {
    const prop = PROPS[pl.prop];
    if (!prop) throw new Error(`${desc.name}: no prop ${pl.prop}`);
    prop.draw(near.at(pl.x, pl.y ?? propY(prop)), BANDS.indexOf(pl.band ?? band));
  }
  const play = cut(near, 'kn', tiles, 2);

  const layers = [
    { bg: 2, ...view, scroll: [SPEEDS.mid, 0], hdma: [[SKY_SPLIT, SPEEDS.far], [ROOM.floor - SKY_SPLIT, SPEEDS.mid]] },
    { bg: 1, ...play, scroll: [SPEEDS.near, 0], hdma: floorTable({ top: ROOM.floor, horizon: ROOM.floor - 160 }) },
  ];
  if (desc.overlay) layers.push({ bg: 3, ...cut(overlay(cols, desc.overlay.beams), 'ko', tiles, 7), scroll: [SPEEDS.overlay, 0] });

  const scene = {
    name: desc.name,
    descent: d,
    band,
    backdrop: rgb15(1, 1, 4),
    palettes: palettesAt(d),
    drift: driftTable({ d }),
    tiles,
    layers,
    math: [[WINDOW.top, 'none'], [WINDOW.bottom - WINDOW.top, 'half', GLASS[band], [2]], [ROOM.floor - WINDOW.bottom, 'none'], ...floorMath()],
  };
  return scene;
}
