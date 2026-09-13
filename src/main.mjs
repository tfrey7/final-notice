/* global Phaser */
import { WIDTH, HEIGHT, integerZoom } from './screen.mjs';
import { PALETTE } from './palette.mjs';
import { TitleScene } from './title.mjs';
import { LobbyScene } from './lobby.mjs';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: PALETTE.outline,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: integerZoom(window.innerWidth, window.innerHeight),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { gamepad: true },
  // ?lobby skips the title, for screenshots and quick checks.
  scene: new URLSearchParams(location.search).has('lobby') ? [LobbyScene, TitleScene] : [TitleScene, LobbyScene],
});
window.finalNotice = game;

window.addEventListener('resize', () => {
  game.scale.setZoom(integerZoom(window.innerWidth, window.innerHeight));
});
