// The SNES cinema: each story scene mosaics in on its first picture, types the chosen auditor's script
// in the BG3 text box, mosaics between pictures, spins the room by Mode 7 when Scene 2's alarm goes off
// and fades out. Start skips. `?page=<n>` opens on the nth page; `&t=<frames>` pins that page's clock
// for a screenshot.
/* global Phaser */
import { screen, mode7Pass, mode7Matrix, mathPass, fromRgba } from '../fx.mjs';
import { drawTextBox } from '../text.mjs';
import { loadArt } from '../art.mjs';
import { bakeScene, composeFrame } from '../layers.mjs';
import { screens } from '../bg/ui.mjs';
import { currentSong, playSong, sfx, soloSong, stopSong } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../../flow.mjs';
import { SPEAKERS } from '../../story/script.mjs';
import { SCENE_IDS, FRAMES_PER_LETTER, startPlayer, tick, press, letters } from '../../story/cinema.mjs';
import { FrontScreen, IN_FRAMES, bufferFill, inStep } from './front.mjs';
import {
  ADVANCE, ALARM_FLASH, SPIN_CENTRE, changeStep, fadeOutStep, paintPicture, pictureId, snesWrap, spinStep, spinTexture,
} from '../cinema.mjs';
import { PAD_VOICES, mosaicOutStep, stageFrame, stagePages } from '../staging.mjs';

// The fluorescent buzz is a 56-frame effect, played again while its page lasts.
const BUZZ_FRAMES = 56;

export class SnesCinemaScene extends Phaser.Scene {
  constructor(key) {
    super(key);
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== this.scene.key) state = jumpTo(this.scene.key);
    this.registry.set('flow', state);
    const params = new URLSearchParams(location.search);
    this.pinned = params.has('t') ? Number(params.get('t')) : null;
    const sceneId = SCENE_IDS[this.scene.key];
    this.player = startPlayer(sceneId, state.auditor, snesWrap);
    this.player = { ...this.player, pages: stagePages(sceneId, this.player.pages, state.auditor) };
    this.clock = 0;
    this.held = 0;
    const open = Number(params.get('page'));
    if (open > 0) this.player = { ...this.player, page: Math.min(open, this.player.pages.length - 1) };
    this.art = null;
    this.pic = screen();
    this.old = screen();
    this.out = screen();
    this.black = screen();
    this.red = screen(ALARM_FLASH);
    this.frames = 0;
    this.intro = 0;
    this.change = null;
    this.spin = null;
    this.leaving = null;
    this.finished = false;
    this.view = new FrontScreen(this, `snes-${this.scene.key}`);
    this.paint(this.pic, this.page());
    loadArt('portraits').then((def) => { this.art = def; this.paint(this.pic, this.page()); }, () => {});
    if (this.page().fromPlay) {
      this.intro = IN_FRAMES;
      this.arrive();
    } else if (this.page().music !== 'cut') playSong(SONGS[this.scene.key]);
    if (this.pinned != null) this.pin(this.pinned);
  }

  page() {
    return this.player.pages[this.player.page];
  }

  paint(buf, page) {
    const bg = screens[`cinema.${page.backdrop}`];
    const backdrop = bg ? fromRgba(composeFrame(bg, bakeScene(bg), 0, 0)) : null;
    paintPicture(buf, page, { art: this.art, backdrop });
  }

  pin(t) {
    const page = this.page();
    this.intro = this.player.page === 0 && !page.fromPlay ? t : IN_FRAMES;
    this.clock = t;
    this.player = { ...this.player, typed: Math.min(letters(page), Math.floor(t / FRAMES_PER_LETTER)) };
    if (page.sound === 'alarm') this.spin = t;
    if (page.spinAt != null && t >= page.spinAt) this.spin = t - page.spinAt;
  }

  update() {
    if (this.finished) return;
    this.frames++;
    const live = this.pinned == null;
    const pad = live ? pollPad(this.game.loop.frame) : null;
    if (live && this.leaving == null && pad.pressed.has('start')) this.leaving = 0;

    if (this.leaving != null) {
      if (this.player.pages.at(-1).mosaicOut) {
        const step = mosaicOutStep(this.leaving++);
        if (step.done) return this.finish();
        return this.render(15, step.mosaic);
      }
      const step = fadeOutStep(this.leaving++);
      if (step.done) return this.finish();
      return this.render(step.level);
    }
    if (this.intro < IN_FRAMES) {
      const step = inStep(this.intro);
      if (live && ++this.intro >= IN_FRAMES) this.arrive();
      return this.view.show(this.pic, step);
    }
    if (this.change != null) {
      const step = changeStep(this.change++);
      if (!step.done) return this.view.show(step.swap ? this.pic : this.old, { mosaic: step.mosaic });
      this.change = null;
      this.arrive();
    }
    if (live) {
      const page = this.page();
      const typedOut = this.player.typed >= letters(page);
      if (page.fadeAfter != null && typedOut && this.held++ >= page.fadeAfter) {
        if (page.endCut) return this.finish();
        this.leaving = 0;
        return this.render(15);
      }
      const acted = page.acting && this.clock >= page.frames;
      if (acted || ADVANCE.some((b) => pad.pressed.has(b))) {
        const before = this.player;
        this.player = press(before, 'a');
        if (this.player.done) {
          if (page.endCut) return this.finish();
          this.leaving = 0;
          return this.render(15);
        }
        if (this.player.page !== before.page) {
          this.turn(before.pages[before.page]);
          if (this.change != null) return this.view.show(this.old, { mosaic: 1 });
        }
      }
      if (page.sound === 'buzz' && this.clock > 0 && this.clock % BUZZ_FRAMES === 0) sfx('buzz');
      const typed = tick(this.player);
      this.player = typed.player;
      if (typed.blip) sfx('blip');
    }
    this.render(15);
  }

  turn(prev) {
    const page = this.page();
    if (pictureId(prev) === pictureId(page)) return this.arrive();
    this.old.set(this.pic);
    this.paint(this.pic, page);
    if (page.cut) return this.arrive();
    this.change = 0;
  }

  arrive() {
    const page = this.page();
    this.clock = 0;
    this.held = 0;
    if (page.music === 'cut') stopSong();
    else if (page.music === 'pad') {
      if (currentSong()) soloSong(PAD_VOICES);
      else playSong(SONGS[this.scene.key]).then(() => soloSong(PAD_VOICES));
    }
    else if (page.music) {
      if (currentSong() === page.music) soloSong(null);
      else playSong(page.music);
    }
    if (page.sound) sfx(page.sound);
    if (page.sound === 'alarm') this.spin = 0;
  }

  render(level, mosaic = 1) {
    const frame = this.out;
    const page = this.page();
    if (page.spinAt != null && this.clock === page.spinAt && this.pinned == null) {
      sfx('alarm');
      this.spin = 0;
    }
    const s = this.spin == null ? null : spinStep(this.spin);
    if (page.spinAt != null && this.clock < page.spinAt) {
      frame.set(this.old);
    } else if (s && !s.done) {
      mode7Pass(spinTexture(this.pic), mode7Matrix(s.scale, s.angle), SPIN_CENTRE, this.black, frame);
      if (s.flash) mathPass(frame, this.red, { op: 'add' }, frame);
      if (this.pinned == null) this.spin++;
    } else {
      this.spin = null;
      frame.set(this.pic);
    }
    stageFrame(frame, page, this.clock);
    if (this.pinned == null) this.clock++;
    if (page.acting) return this.view.show(frame, { level, mosaic });
    drawTextBox(bufferFill(frame), {
      speaker: SPEAKERS[page.speaker],
      lines: page.lines,
      shown: this.player.typed,
      blink: Math.floor(this.frames / 24) % 2 === 0,
    });
    this.view.show(frame, { level, mosaic });
  }

  finish() {
    this.finished = true;
    showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
  }
}
