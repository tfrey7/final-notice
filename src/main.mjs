/* global Phaser */
import { platformFor } from './platform.mjs';
import { debugScene } from './snes/debug.mjs';
import { installCrt } from './crt/display.mjs';
import { NesTestScene } from './nes/testscene.mjs';
import { ArtScene } from './nes/artscene.mjs';
import { AUDITORS, CHECKPOINTS, SCREENS, jumpTo, next } from './flow.mjs';
import { CinemaScene } from './scenes/cinema.mjs';
import { EscapeScene } from './stage2/scene.mjs';
import { Stage1Scene } from './stage1/scene.mjs';
import { TitleScene } from './scenes/title.mjs';
import { SelectScene } from './scenes/select.mjs';
import { GameOverScene } from './scenes/gameover.mjs';
import { EndingScene } from './scenes/ending.mjs';
import { SnesTitleScene } from './snes/scenes/title.mjs';
import { SnesSelectScene } from './snes/scenes/select.mjs';
import { SnesGameOverScene } from './snes/scenes/gameover.mjs';
import { SnesCinemaScene } from './snes/scenes/cinema.mjs';
import { SnesEndingScene } from './snes/scenes/ending.mjs';
import { SnesOpeningScene } from './snes/scenes/opening.mjs';
import { opensWithOpening } from './snes/opening.mjs';
import { SnesStage1Scene, SnesStage3Scene, SnesStage5Scene } from './snes/stage1/scene.mjs';
import { SnesStage2Scene } from './snes/stage2/scene.mjs';
import { SnesLabScene } from './snes/lab/scene.mjs';
import { SnesClimbLabScene } from './snes/lab/climb.mjs';
import { SnesArchiveClimbScene } from './snes/stage2/climb.mjs';
import { SnesShaftScene } from './snes/stage4/shaft.mjs';

const params = new URLSearchParams(location.search);
const profile = platformFor(params);
const snes = profile.name === 'snes';

// One scene per screen of the game, keyed by its flow name; the SNES build swaps in its own screens.
const SCENES = {
  title: snes ? new SnesTitleScene() : new TitleScene(),
  select: snes ? new SnesSelectScene() : new SelectScene(),
  stage1: snes ? new SnesStage1Scene() : new Stage1Scene(),
  stage2: snes ? new SnesStage2Scene() : new EscapeScene(),
  // Stages 3 and 5 exist only as SNES grey boxes, so the NES build plays those too.
  stage3: new SnesStage3Scene(),
  stage5: new SnesStage5Scene(),
  gameover: snes ? new SnesGameOverScene() : new GameOverScene(),
  ending: snes ? new SnesEndingScene() : new EndingScene(),
};
for (const key of ['scene1', 'scene2', 'scene3']) SCENES[key] = snes ? new SnesCinemaScene(key) : new CinemaScene(key);

// ?snes runs the SNES profile (?snes&hw and the other rows of src/snes/debug.mjs are its test screens),
// ?fast gives foes and bosses cheap health, ?nes is the hardware test screen, ?art=<name> plays an art module, ?go=<screen> starts on any screen,
// ?who=<auditor> picks who is playing; ?go=vellum and ?go=greatseal are each stage at its boss room's
// checkpoint, and ?go=stage1&area=<1-5>, ?go=stage2&area=<1-5> ?go=stage3&area=<1-4> or ?go=stage5&area=<1-4> starts that stage at the area's checkpoint.
const BOSSES = { vellum: ['stage1', 'stage1-area5'], greatseal: ['stage2', 'stage2-area5'] };
const boss = BOSSES[params.get('go')];
const start = boss
  ? next(jumpTo(boss[0]), { type: 'checkpoint', id: boss[1] })
  : jumpTo(params.get('go') ?? 'title');
const area = start.stage && CHECKPOINTS[start.stage]?.[Number(params.get('area')) - 1];
if (area) Object.assign(start, next(start, { type: 'checkpoint', id: area }));
if (AUDITORS.includes(params.get('who'))) start.auditor = params.get('who');
let scene = [SCENES[start.screen], ...SCREENS.filter((k) => k !== start.screen).map((k) => SCENES[k])];
// ?snes plays the opening before the title once a session; ?snes&go=opening plays it every time.
const session = () => { try { return sessionStorage; } catch { return null; } };
// The opening is also the title's attract loop, so it is always registered under ?snes.
if (snes) scene = opensWithOpening(params, session()) ? [new SnesOpeningScene(), ...scene] : [...scene, new SnesOpeningScene()];
const debug = snes && debugScene(params);
// ?snes&go=lab is the brawl lab: Stage 1's fighting in a grey-box room with live dials.
if (snes && params.get('go') === 'lab') scene = [new SnesLabScene()];
// ?snes&go=climblab is the climb lab: Stage 2's running and casting up a grey-box shaft ahead of a flood.
else if (snes && params.get('go') === 'climblab') scene = [new SnesClimbLabScene()];
// ?snes&go=archive is Stage 2 as a grey-box escape climb, floor to the Custodian; ?bot lets the climb bot play.
else if (snes && params.get('go') === 'archive') scene = [new SnesArchiveClimbScene()];
// ?snes&go=shaft is Stage 4 as a grey-box escape climb up the elevator shaft; ?bot lets the shaft bot play.
else if (snes && params.get('go') === 'shaft') scene = [new SnesShaftScene()];
else if (debug) scene = [debug];
else if (params.has('nes')) scene = [NesTestScene];
else if (params.has('art')) scene = [ArtScene];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: profile.WIDTH,
  height: profile.HEIGHT,
  backgroundColor: profile.background,
  pixelArt: true,
  roundPixels: true,
  render: { preserveDrawingBuffer: true },
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: profile.zoom(window.innerWidth, window.innerHeight),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene,
});
game.registry.set('flow', start);
window.finalNotice = game;
window.finalNoticeCrt = installCrt(game, params);

window.addEventListener('resize', () => {
  game.scale.setZoom(profile.zoom(window.innerWidth, window.innerHeight));
});
