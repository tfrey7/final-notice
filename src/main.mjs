/* global Phaser */
import { WIDTH, HEIGHT, integerZoom } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { NesTestScene } from './nes/testscene.mjs';
import { ArtScene } from './nes/artscene.mjs';
import { SCREENS, jumpTo } from './flow.mjs';
import { PlaceholderScene } from './scenes/placeholder.mjs';

// One scene per screen of the game, keyed by its flow name; a real scene replaces its placeholder here.
const SCENES = Object.fromEntries(SCREENS.map((key) => [key, new PlaceholderScene(key)]));

// ?nes is the hardware test screen, ?art=<name> plays an art module, ?go=<screen> starts on any screen.
const params = new URLSearchParams(location.search);
const start = jumpTo(params.get('go') ?? 'title');
let scene = [SCENES[start.screen], ...SCREENS.filter((k) => k !== start.screen).map((k) => SCENES[k])];
if (params.has('nes')) scene = [NesTestScene];
else if (params.has('art')) scene = [ArtScene];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: nes(0x0f),
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: integerZoom(window.innerWidth, window.innerHeight),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene,
});
game.registry.set('flow', start);
window.finalNotice = game;

window.addEventListener('resize', () => {
  game.scale.setZoom(integerZoom(window.innerWidth, window.innerHeight));
});
