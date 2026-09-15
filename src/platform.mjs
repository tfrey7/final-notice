// The one switch between machines: scenes ask the profile, never src/nes or src/snes directly.
// `?snes` picks the SNES build; without it the page is the NES game.
import * as nesScreen from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { artOr as nesArt } from './nes/art.mjs';
import * as snesScreen from './snes/screen.mjs';
import { hex } from './snes/color.mjs';
import { artOr as snesArt } from './snes/art.mjs';
import { FRAME_CYCLES } from './nes/slowdown.mjs';

export const PROFILES = {
  nes: {
    name: 'nes',
    WIDTH: nesScreen.WIDTH,
    HEIGHT: nesScreen.HEIGHT,
    zoom: nesScreen.integerZoom,
    background: nes(0x0f),
    colour: nes,
    bakeArt: nesArt,
    crtLook: 'nes',
    slowdownBudget: FRAME_CYCLES,
  },
  snes: {
    name: 'snes',
    WIDTH: snesScreen.WIDTH,
    HEIGHT: snesScreen.HEIGHT,
    zoom: snesScreen.integerZoom,
    background: 0x000000,
    colour: hex,
    bakeArt: snesArt,
    crtLook: 'snes',
    // No emulated slowdown (Tim, 09-15): a crowded floor runs at the same speed as an empty one.
    slowdownBudget: Infinity,
  },
};

export const platformFor = (params) => PROFILES[params.has('snes') ? 'snes' : 'nes'];
