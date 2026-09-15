// The boot splash: the Celeryman.ai logo on black with its chime, held, then faded through black into
// what the boot opens on. The timeline is src/snes/splash.mjs; `&t=<frames>` with ?go=splash pins its
// clock for a screenshot.
/* global Phaser */
import { screen } from '../fx.mjs';
import { playSong } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { jumpTo, showFlow } from '../../flow.mjs';
import { paintSplash, splashLevel, splashStep } from '../splash.mjs';
import { FrontScreen } from './front.mjs';

export class SnesSplashScene extends Phaser.Scene {
  // `next` is 'attract' for the intro, or 'flow' for the screen the boot's flow state names.
  constructor(next) {
    super('splash');
    this.next = next;
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.frame = this.pinned ?? 0;
    this.done = false;
    this.buf = screen();
    this.view = new FrontScreen(this, 'snes-splash');
  }

  update() {
    if (this.done) return;
    if (this.pinned == null) {
      const step = splashStep(this.frame, pollPad(this.game.loop.frame));
      if (step.event) return this.leave();
      if (this.frame === 0) playSong('splash');
      this.frame = step.frame;
    }
    this.view.show(paintSplash(this.frame, this.buf), { level: splashLevel(this.frame), crush: true });
  }

  leave() {
    this.done = true;
    if (this.next === 'attract') this.scene.start('attract');
    else showFlow(this, this.registry.get('flow') ?? jumpTo('title'));
  }
}
