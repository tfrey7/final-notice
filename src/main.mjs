/* global Phaser */
import { WIDTH, HEIGHT, integerZoom } from './nes/screen.mjs';
import { nes } from './nes/palette.mjs';
import { NesTestScene } from './nes/testscene.mjs';
import { ArtScene } from './nes/artscene.mjs';
import { TitleScene } from './title.mjs';
import { LobbyScene } from './lobby.mjs';

// ?nes is the hardware test screen, ?art=<name> plays an art module, ?lobby skips the title.
const params = new URLSearchParams(location.search);
let scene = [TitleScene, LobbyScene];
if (params.has('nes')) scene = [NesTestScene];
else if (params.has('art')) scene = [ArtScene];
else if (params.has('lobby')) scene = [LobbyScene, TitleScene];

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
  input: { gamepad: true },
  scene,
});
window.finalNotice = game;

window.addEventListener('resize', () => {
  game.scale.setZoom(integerZoom(window.innerWidth, window.innerHeight));
});
