// The SNES debug routes, `?snes&<flag>`: one row per card, a clash is resolved by keeping both.
import { SnesTestScene } from './testscene.mjs';
import { SnesLayersScene } from './layerscene.mjs';
import { SnesFxScene } from './fxscene.mjs';
import { SnesHudScene } from './hudscene.mjs';
import { SnesUiScene } from './uiscene.mjs';
import { bgArtScene } from './bgartscene.mjs';
import CLAIMS from './bg/claims.mjs';
import CLAIMS2 from './bg/claims2.mjs';
import { AREAS as ARCHIVE } from './bg/archive.mjs';
import { AREAS as DISPOSAL } from './bg/disposal.mjs';

const BACKGROUNDS = { claims: CLAIMS, claims2: CLAIMS2 };
const area = (bg, params) => bg.areas[Math.max(0, Math.min(bg.areas.length - 1, Number(params.get('area') ?? 1) - 1))];

// `value`, when a row has one, must match the flag's value too (?snes&art=ui); `when`, when a row has
// one, must hold as well, so `?snes&art=<bg>` leaves sprite art alone.
export const DEBUG_ROUTES = [
  { flag: 'hw', scene: SnesTestScene, what: 'hardware test: 16 palettes, 32-per-scanline drop, OAM cutting' },
  { flag: 'layers', scene: SnesLayersScene, what: 'BG1 play layer, BG2 parallax, BG3 fixed HUD, hdma floor perspective' },
  { flag: 'fx', scene: SnesFxScene, what: 'keys 1-7: glass, glow, shadow, 16-step fade, mosaic, window, Mode 7 logo zoom' },
  { flag: 'hud', scene: SnesHudScene, what: 'HUD in scripted play: portrait, health, lives, meter, enchantments, boss bar, idle fade' },
  { flag: 'art', value: 'ui', scene: SnesUiScene, what: 'front end: skyline, Mode 7 logo, select frame, HUD, GAME OVER, THE END' },
  {
    flag: 'art',
    when: (params) => params.get('art') in BACKGROUNDS,
    scene: new SnesLayersScene('snes-bg', (params) => area(BACKGROUNDS[params.get('art')], params)),
    what: "a background module scrolling end to end: art=claims (&area=1 Reception, 2 Service Floor) or art=claims2 (1 Internal Review, 2 Executive Waiting, 3 Vellum's office), &x= pins",
  },
  { flag: 'art', value: 'archive', scene: bgArtScene('archive', ARCHIVE), what: 'Stage 2 areas 1-3: keys 1-3, lamp glow by add, wax front by add-half' },
  { flag: 'art', value: 'disposal', scene: bgArtScene('disposal', DISPOSAL), what: 'Stage 2 areas 4-5: keys 1-3 Disposal Line, wax front by add-half, Great Seal arena; animated tiles and palettes, &frame= pins' },
];

export const debugScene = (params) => DEBUG_ROUTES.find((r) => params.has(r.flag)
  && (r.value == null || params.get(r.flag) === r.value)
  && (!r.when || r.when(params)))?.scene;
