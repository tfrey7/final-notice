/* global Phaser */
import { WIDTH, HEIGHT, integerZoom } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { NesTestScene } from './nes/testscene.mjs';
import { ArtScene } from './nes/artscene.mjs';
import { AUDITORS, SCREENS, jumpTo, next } from './flow.mjs';
import { PlaceholderScene } from './scenes/placeholder.mjs';
import { CinemaScene } from './scenes/cinema.mjs';
import { EscapeScene } from './stage2/scene.mjs';
import { Stage1Scene } from './stage1/scene.mjs';
import { TitleScene } from './scenes/title.mjs';
import { SelectScene } from './scenes/select.mjs';

// One scene per screen of the game, keyed by its flow name; a real scene replaces its placeholder here.
const SCENES = Object.fromEntries(SCREENS.map((key) => [key, new PlaceholderScene(key)]));
SCENES.title = new TitleScene();
SCENES.select = new SelectScene();
SCENES.stage1 = new Stage1Scene();
SCENES.stage2 = new EscapeScene();
for (const key of ['scene1', 'scene2', 'scene3']) SCENES[key] = new CinemaScene(key);

// ?nes is the hardware test screen, ?art=<name> plays an art module, ?go=<screen> starts on any screen,
// ?who=<auditor> picks who is playing; ?go=vellum is Stage 1 at the boss room's checkpoint, and
// ?go=stage1&area=<1-5> starts Stage 1 at that area's checkpoint.
const params = new URLSearchParams(location.search);
const start = params.get('go') === 'vellum'
  ? next(jumpTo('stage1'), { type: 'checkpoint', id: 'stage1-area5' })
  : next(jumpTo(params.get('go') ?? 'title'), { type: 'checkpoint', id: `stage1-area${params.get('area')}` });
if (AUDITORS.includes(params.get('who'))) start.auditor = params.get('who');
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
