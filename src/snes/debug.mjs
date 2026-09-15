// The SNES debug routes, `?snes&<flag>`: one row per card, a clash is resolved by keeping both.
import { SnesTestScene } from './testscene.mjs';
import { SnesLayersScene } from './layerscene.mjs';

export const DEBUG_ROUTES = [
  { flag: 'hw', scene: SnesTestScene, what: 'hardware test: 16 palettes, 32-per-scanline drop, OAM cutting' },
  { flag: 'layers', scene: SnesLayersScene, what: 'BG1 play layer, BG2 parallax, BG3 fixed HUD, hdma floor perspective' },
];

export const debugScene = (params) => DEBUG_ROUTES.find((r) => params.has(r.flag))?.scene;
