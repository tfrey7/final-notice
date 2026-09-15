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
    // In the same cost units as the NES: a SlowROM 65816 moving 56-64 px fighters slows once three foes
    // and a few props share the floor, as Final Fight did; a tuning estimate, unverified.
    slowdownBudget: 20000,
  },
};

export const platformFor = (params) => PROFILES[params.has('snes') ? 'snes' : 'nes'];
