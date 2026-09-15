// The SNES select: Ward and Mercer in their brass-framed wells, a lamp cone by colour math (add) on the
// chosen one and the other well dimmed by subtract. Left and right move, Start or A confirms.
/* global Phaser */
import { WIDTH } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screen, fromRgba, mathPass } from '../fx.mjs';
import { screens } from '../bg/ui.mjs';
import { measure, drawString } from '../text.mjs';
import { loadArt, artOr, SpriteLayer } from '../art.mjs';
import { currentSong, playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { AUDITORS, SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { SELECT } from '../../story/script.mjs';
import { selectStep } from '../../scenes/menu.mjs';
import { FrontScreen, bufferFill, confirmed, inStep, outStep, spotSub } from './front.mjs';

// The wells painted by src/snes/bg/ui.mjs: 88x112 at x 32 and 136, y 56; name plates at y 176.
const WELLS = [32, 136];
const WELL = { y: 56, w: 88, h: 112 };
const FEET = 158;
const HEADING = 'SELECT YOUR AUDITOR';
const DIM = rgb15(5, 5, 5);
const STAND_IN = { w: 40, h: 72, palette: [rgb15(2, 2, 6), rgb15(9, 8, 12), rgb15(20, 18, 24)] };

export class SnesSelectScene extends Phaser.Scene {
  constructor() {
    super('select');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'select') state = jumpTo('select');
    this.registry.set('flow', state);
    if (currentSong() !== SONGS.select) playSong(SONGS.select);
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    this.choice = Math.max(0, AUDITORS.indexOf(state.auditor));
    this.spotX = this.centre(this.choice);
    this.frames = 0;
    this.leaving = null;
    this.defs = {};
    AUDITORS.forEach((a) => loadArt(a).then((d) => { this.defs[a] = d; }).catch(() => {}));
    this.baked = bakeScene(screens.select);
    this.back = screen();
    this.lit = screen();
    this.out = screen();
    this.sub = screen();
    this.dimSub = screen(DIM);
    this.rgba = new Uint8ClampedArray(this.back.length * 4);
    composeFrame(screens.select, this.baked, 0, 0, this.rgba);
    fromRgba(this.rgba, this.back);
    this.view = new FrontScreen(this, 'snes-select');
    this.sprites = new SpriteLayer(this, 10);
  }

  centre(i) {
    return WELLS[i] + (WELL.w >> 1);
  }

  portrait(auditor, i) {
    const cx = this.centre(i);
    const def = this.defs[auditor];
    const on = i === this.choice;
    const ms = on ? this.frames * (1000 / 60) : 0;
    if (!def) return artOr(this, auditor, STAND_IN).frame(null, 0, cx - (STAND_IN.w >> 1), FEET - STAND_IN.h);
    const f = def.frames.idle ?? Object.values(def.frames)[0];
    const [ox] = f.origin ?? [0, 0];
    return artOr(this, auditor).frame('idle', ms, cx - (f.w >> 1) + ox, FEET);
  }

  update() {
    if (this.pinned == null && this.leaving == null) {
      const pad = pollPad(this.game.loop.frame);
      const step = selectStep(this.choice, pad);
      if (step.moved) sfx('menu');
      this.choice = step.choice;
      if (step.confirm || confirmed(pad)) {
        sfx('menu');
        this.leaving = 0;
      }
    }
    const f = this.pinned ?? this.frames++;
    this.spotX += (this.centre(this.choice) - this.spotX) * (this.pinned == null ? 0.3 : 1);

    const other = WELLS[1 - this.choice];
    spotSub(this.spotX, WELL.y + 60, 52, 70, this.sub);
    mathPass(this.back, this.sub, { op: 'add' }, this.lit);
    const frame = mathPass(this.lit, this.dimSub, {
      op: 'sub',
      where: (x, y) => x >= other && x < other + WELL.w && y >= WELL.y && y < WELL.y + WELL.h + 24,
    }, this.out);

    const fill = bufferFill(frame);
    drawString(fill, HEADING, (WIDTH - measure(HEADING)) >> 1, 32, rgb15(31, 27, 14));
    AUDITORS.forEach((a, i) => {
      const { name } = SELECT[a];
      const on = i === this.choice;
      drawString(fill, name, this.centre(i) - (measure(name) >> 1), 180, on ? rgb15(31, 31, 31) : rgb15(16, 15, 14));
    });
    const { line } = SELECT[AUDITORS[this.choice]];
    drawString(fill, line, (WIDTH - measure(line)) >> 1, 197, rgb15(26, 22, 14));

    const entries = [];
    const owners = [];
    AUDITORS.forEach((a, i) => {
      const e = this.portrait(a, i);
      entries.push(...e);
      owners.push(...e.map(() => i));
    });
    this.sprites.draw(entries);
    this.sprites.pool.forEach((img, k) => { img.dim = owners[k] === this.choice ? 1 : 0.5; });

    if (this.leaving != null) {
      const step = outStep(this.leaving++);
      if (step.done) {
        showFlow(this, next(this.registry.get('flow'), { type: 'start', auditor: AUDITORS[this.choice] }));
        return;
      }
      this.view.show(frame, step, this.sprites);
      return;
    }
    this.view.show(frame, inStep(f), this.sprites);
  }
}
