// The frozen NES build's start-up: every page without ?snes.
import { PROFILES } from '../platform.mjs';
import { boot, sceneOrder, startFrom } from '../boot.mjs';
import { NesTestScene } from './testscene.mjs';
import { ArtScene } from './artscene.mjs';
import { CinemaScene } from '../scenes/cinema.mjs';
import { EscapeScene } from '../stage2/scene.mjs';
import { Stage1Scene } from '../stage1/scene.mjs';
import { TitleScene } from '../scenes/title.mjs';
import { SelectScene } from '../scenes/select.mjs';
import { GameOverScene } from '../scenes/gameover.mjs';
import { EndingScene } from '../scenes/ending.mjs';
import { SnesStage3Scene, SnesStage5Scene } from '../snes/stage1/scene.mjs';
import { SnesArchiveClimbScene } from '../snes/stage2/climb.mjs';
import { SnesShaftScene } from '../snes/stage4/shaft.mjs';
import { SnesCapstoneScene } from '../snes/stage6/capstone.mjs';
import { SnesIntroScene } from '../snes/scenes/intro.mjs';

const params = new URLSearchParams(location.search);

const SCENES = {
  title: new TitleScene(),
  select: new SelectScene(),
  stage1: new Stage1Scene(),
  stage2: new EscapeScene(),
  // Stages 3 and 5 and the climbs exist only as SNES scenes, so the NES build plays those too.
  stage3: new SnesStage3Scene(),
  stage5: new SnesStage5Scene(),
  archiveclimb: new SnesArchiveClimbScene(),
  shaft: new SnesShaftScene(),
  capstone: new SnesCapstoneScene(),
  intro: new SnesIntroScene(),
  gameover: new GameOverScene(),
  ending: new EndingScene(),
};
for (const key of ['scene1', 'scene2', 'scene3']) SCENES[key] = new CinemaScene(key);

const start = startFrom(params);
let scene = sceneOrder(SCENES, start);
// ?nes is the hardware test screen, ?art=<name> plays an art module.
if (params.has('nes')) scene = [NesTestScene];
else if (params.has('art')) scene = [ArtScene];

boot(PROFILES.nes, scene, start, params);
