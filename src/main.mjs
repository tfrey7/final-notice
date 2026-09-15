/* global Phaser */
import { WIDTH, HEIGHT, integerZoom } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { installCrt } from './crt/display.mjs';
import { NesTestScene } from './nes/testscene.mjs';
import { ArtScene } from './nes/artscene.mjs';
import { AUDITORS, CHECKPOINTS, SCREENS, jumpTo, next } from './flow.mjs';
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
// ?who=<auditor> picks who is playing; ?go=vellum and ?go=greatseal are each stage at its boss room's
// checkpoint, and ?go=stage1&area=<1-5> or ?go=stage2&area=<1-5> starts that stage at the area's checkpoint.
const params = new URLSearchParams(location.search);
const BOSSES = { vellum: ['stage1', 'stage1-area5'], greatseal: ['stage2', 'stage2-area5'] };
const boss = BOSSES[params.get('go')];
const start = boss
  ? next(jumpTo(boss[0]), { type: 'checkpoint', id: boss[1] })
  : jumpTo(params.get('go') ?? 'title');
const area = start.stage && CHECKPOINTS[start.stage]?.[Number(params.get('area')) - 1];
if (area) Object.assign(start, next(start, { type: 'checkpoint', id: area }));
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
  render: { preserveDrawingBuffer: true },
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: integerZoom(window.innerWidth, window.innerHeight),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene,
});
game.registry.set('flow', start);
window.finalNotice = game;
window.finalNoticeCrt = installCrt(game, params);

window.addEventListener('resize', () => {
  game.scale.setZoom(integerZoom(window.innerWidth, window.innerHeight));
});
