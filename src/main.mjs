// The SNES game's start-up: every ?snes page. The frozen NES build starts from src/nes/main.mjs.
import { PROFILES } from './platform.mjs';
import { boot, sceneOrder, startFrom } from './boot.mjs';
import { debugScene } from './snes/debug.mjs';
import { SnesTitleScene } from './snes/scenes/title.mjs';
import { SnesSelectScene } from './snes/scenes/select.mjs';
import { SnesGameOverScene } from './snes/scenes/gameover.mjs';
import { SnesCinemaScene } from './snes/scenes/cinema.mjs';
import { SnesEndingScene } from './snes/scenes/ending.mjs';
import { SnesAttractScene } from './snes/scenes/attract.mjs';
import { opensWithOpening } from './snes/opening.mjs';
import { SnesSplashScene } from './snes/scenes/splash.mjs';
import { opensWithSplash } from './snes/splash.mjs';
import { SnesStage1Scene, SnesStage3Scene, SnesStage5Scene } from './snes/stage1/scene.mjs';
import { SnesStage2Scene } from './snes/stage2/scene.mjs';
import { SnesLabScene } from './snes/lab/scene.mjs';
import { SnesClimbLabScene } from './snes/lab/climb.mjs';
import { SnesArchiveClimbScene } from './snes/stage2/climb.mjs';
import { SnesShaftScene } from './snes/stage4/shaft.mjs';
import { SnesCapstoneScene } from './snes/stage6/capstone.mjs';
import { SnesIntroScene } from './snes/scenes/intro.mjs';

const params = new URLSearchParams(location.search);

// One scene per screen of the game, keyed by its flow name.
const SCENES = {
  title: new SnesTitleScene(),
  select: new SnesSelectScene(),
  stage1: new SnesStage1Scene(),
  stage2: new SnesStage2Scene(),
  stage3: new SnesStage3Scene(),
  stage5: new SnesStage5Scene(),
  archiveclimb: new SnesArchiveClimbScene(),
  shaft: new SnesShaftScene(),
  capstone: new SnesCapstoneScene(),
  intro: new SnesIntroScene(),
  gameover: new SnesGameOverScene(),
  ending: new SnesEndingScene(),
};
for (const key of ['scene1', 'scene2', 'scene3']) SCENES[key] = new SnesCinemaScene(key);

// ?snes&hw and the other rows of src/snes/debug.mjs are the SNES test screens; the rest of the address is src/boot.mjs.
const start = startFrom(params);
let scene = sceneOrder(SCENES, start);
// The attract intro plays before the title once a session, and ?go=opening plays it every time.
const session = () => { try { return sessionStorage; } catch { return null; } };
// The intro is also the title's attract loop, so it is always registered.
const opening = opensWithOpening(params, session());
scene = opening ? [new SnesAttractScene(), ...scene] : [...scene, new SnesAttractScene()];
// Every power-on opens on the Celeryman.ai logo first, then on whatever the boot would have shown.
if (opensWithSplash(params)) scene = [new SnesSplashScene(opening ? 'attract' : 'flow'), ...scene];
const debug = debugScene(params);
// ?go=lab is the brawl lab: Stage 1's fighting in a grey-box room with live dials.
if (params.get('go') === 'lab') scene = [new SnesLabScene()];
// ?go=climblab is the climb lab: Stage 2's running and casting up a grey-box shaft ahead of a flood.
else if (params.get('go') === 'climblab') scene = [new SnesClimbLabScene()];
// ?go=archive is Stage 2 as a grey-box escape climb, floor to the Custodian; ?bot lets the climb bot play.
// ?go=archiveclimb is the same stage inside the run.
else if (params.get('go') === 'archive') scene = [new SnesArchiveClimbScene()];
// ?go=shaft is Stage 4, the elevator shaft climb, and ?go=capstone Stage 6, the capstone climb, Bellwether
// and the final choice (&at=crown starts at the fight); both play on through the run, and ?bot lets their bots play.
else if (debug) scene = [debug];

boot(PROFILES.snes, scene, start, params);
