// The SNES debug routes, `?snes&<flag>`: one row per card, a clash is resolved by keeping both.
import { SnesTestScene } from './testscene.mjs';
import { SnesLayersScene } from './layerscene.mjs';
import { SnesFxScene } from './fxscene.mjs';
import { SnesHudScene } from './hudscene.mjs';
import { SnesUiScene } from './uiscene.mjs';

// `value`, when a row has one, must match the flag's value too (?snes&art=ui).
export const DEBUG_ROUTES = [
  { flag: 'hw', scene: SnesTestScene, what: 'hardware test: 16 palettes, 32-per-scanline drop, OAM cutting' },
  { flag: 'layers', scene: SnesLayersScene, what: 'BG1 play layer, BG2 parallax, BG3 fixed HUD, hdma floor perspective' },
  { flag: 'fx', scene: SnesFxScene, what: 'keys 1-7: glass, glow, shadow, 16-step fade, mosaic, window, Mode 7 logo zoom' },
  { flag: 'hud', scene: SnesHudScene, what: 'HUD in scripted play: portrait, health, lives, meter, enchantments, boss bar, idle fade' },
  { flag: 'art', value: 'ui', scene: SnesUiScene, what: 'front end: skyline, Mode 7 logo, select frame, HUD, GAME OVER, THE END' },
];

export const debugScene = (params) => DEBUG_ROUTES.find((r) => params.has(r.flag) && (r.value == null || params.get(r.flag) === r.value))?.scene;
