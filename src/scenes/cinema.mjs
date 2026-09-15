// Ninja Gaiden-style cinema screens: a backdrop and portrait in the top two thirds, a 3-line box
// beneath typing the chosen auditor's script. `?page=<n>` opens a scene on its nth page.
/* global Phaser */
import { WIDTH, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { artOr, loadArt, bakeBackground } from '../nes/art.mjs';
import { CELL, BOX_COLS, wrap, drawText } from '../text/font.mjs';
import { playSong, sfx } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { SONGS, jumpTo, next, showFlow } from '../flow.mjs';
import { REMARKS, SPEAKERS } from '../story/script.mjs';
import { SCENE_IDS, FRAMES_PER_FADE_STEP, startPlayer, tick, press, visibleLines, fadeIndex, fadeSteps } from '../story/cinema.mjs';

const PICTURE = { x: SAFE, y: SAFE, w: WIDTH - 2 * SAFE, h: 144 };
const PORTRAIT = { x: 96, y: SAFE + 48, w: 64, h: 96 };
const BOX = { x: SAFE, y: 160, w: WIDTH - 2 * SAFE, h: 64 };

// Stand-in colours until src/art/scenes.mjs lands: edge, fill, mark as NES indices.
const STAND_IN = {
  backdrop: [0x01, 0x0c, 0x1c],
  bellwether: [0x07, 0x17, 0x27],
  vellum: [0x04, 0x14, 0x24],
  ward: [0x0b, 0x1a, 0x2a],
  mercer: [0x06, 0x16, 0x26],
  speaker: [0x00, 0x10, 0x20],
};

const WHITE = 0x30;
const GOLD = 0x28;

function fadeBg(bg, step) {
  return { ...bg, backdrop: fadeIndex(bg.backdrop, step), palettes: bg.palettes.map((p) => p.map((i) => fadeIndex(i, step))) };
}

export class CinemaScene extends Phaser.Scene {
  constructor(key) {
    super(key);
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== this.scene.key) state = jumpTo(this.scene.key);
    this.registry.set('flow', state);
    this.player = startPlayer(SCENE_IDS[this.scene.key], state.auditor);
    const open = Number(new URLSearchParams(location.search).get('page'));
    if (open > 0) this.player = { ...this.player, page: Math.min(open, this.player.pages.length - 1) };
    this.def = null;
    this.shown = '';
    this.finished = false;
    this.picture = this.add.container(0, 0);
    this.box = this.add.graphics().setDepth(20);
    this.label = this.add.graphics().setDepth(5);
    loadArt('scenes').then((def) => { this.def = def; this.shown = ''; }, () => {});
    playSong(SONGS[this.scene.key]);
    this.enterPage(null);
  }

  enterPage(prev) {
    const page = this.player.pages[this.player.page];
    const from = prev === null ? null : this.player.page - 1;
    this.fade = prev === null || prev.backdrop !== page.backdrop ? fadeSteps(from, this.player.page) : [[this.player.page, 0]];
    this.fadeFrame = 0;
    this.soundDue = page.sound;
  }

  update() {
    if (this.finished) return;
    const pad = pollPad(this.game.loop.frame);
    if (pad.pressed.has('start')) return this.finish();

    const fading = this.fadeFrame < this.fade.length * FRAMES_PER_FADE_STEP;
    const [pageNo, step] = this.fade[Math.min(Math.floor(this.fadeFrame / FRAMES_PER_FADE_STEP), this.fade.length - 1)];
    this.drawPicture(this.player.pages[pageNo], step);
    if (fading) {
      this.fadeFrame++;
      this.drawBox(null);
      return;
    }
    if (this.soundDue) { sfx(this.soundDue); this.soundDue = null; }

    for (const b of ['a', 'b']) {
      if (!pad.pressed.has(b)) continue;
      const before = this.player;
      this.player = press(before, b);
      if (this.player.done) return this.finish();
      if (this.player.page !== before.page) this.enterPage(before.pages[before.page]);
      break;
    }
    const typed = tick(this.player);
    this.player = typed.player;
    if (typed.blip) sfx('blip');
    this.drawBox(this.player);
  }

  finish() {
    this.finished = true;
    showFlow(this, next(this.registry.get('flow'), { type: 'start' }));
  }

  // One picture at one fade step, rebuilt only when either changes.
  drawPicture(page, step) {
    const id = `${page.backdrop}|${page.portrait}|${step}`;
    if (id === this.shown) return;
    this.shown = id;
    this.picture.removeAll(true);
    const label = this.label.clear();
    const faded = (pal) => pal.map((i) => fadeIndex(i, step));
    const place = (name, area, standIn, labelY) => {
      const bg = this.def?.backgrounds?.[name];
      if (bg) {
        const key = bakeBackground(this, `cinema:${name}:${step}`, this.def, fadeBg(bg, step));
        this.picture.add(this.add.image(area.x, area.y, key).setOrigin(0));
        return;
      }
      const art = artOr(this, `${name}:${step}`, { w: area.w, h: area.h, palette: faded(standIn) });
      for (const p of art.frame(null, 0, area.x, area.y)) this.picture.add(this.add.image(p.x, p.y, p.key).setOrigin(0));
      const x = Math.max(PICTURE.x + 4, area.x + Math.floor((area.w - name.length * CELL) / 2));
      drawText(label, name.toUpperCase(), x, labelY, nes(fadeIndex(WHITE, step)));
    };
    place(`backdrop.${page.backdrop}`, PICTURE, STAND_IN.backdrop, PICTURE.y + 4);
    if (page.portrait) place(`portrait.${page.portrait}`, PORTRAIT, STAND_IN[page.portrait] ?? STAND_IN.speaker, PICTURE.y + PICTURE.h - 12);
  }

  drawBox(player) {
    const g = this.box.clear();
    g.fillStyle(nes(WHITE));
    g.fillRect(BOX.x, BOX.y, BOX.w, 1).fillRect(BOX.x, BOX.y + BOX.h - 1, BOX.w, 1);
    g.fillRect(BOX.x, BOX.y, 1, BOX.h).fillRect(BOX.x + BOX.w - 1, BOX.y, 1, BOX.h);
    if (!player) return;
    const page = player.pages[player.page];
    const name = SPEAKERS[page.speaker];
    g.fillStyle(nes(0x0f)).fillRect(BOX.x + 6, BOX.y - 4, (name.length + 1) * CELL, CELL);
    drawText(g, name, BOX.x + 10, BOX.y - 4, nes(GOLD));
    visibleLines(page, player.typed).forEach((line, i) => drawText(g, line, BOX.x + 8, BOX.y + 12 + i * 16, nes(WHITE)));
    const done = player.typed >= page.lines.join('').length;
    if (done && Math.floor(this.time.now / 400) % 2) drawText(g, '▼', BOX.x + BOX.w - 14, BOX.y + BOX.h - 12, nes(WHITE));
  }
}

// A one-line remark in a small box near the top of play, typed out, gone after `ms`.
export function remark(scene, id, ms = 3000) {
  const auditor = scene.registry.get('flow')?.auditor ?? 'ward';
  const text = REMARKS[id]?.[auditor];
  if (!text) return null;
  const [lines] = wrap(text, BOX_COLS, 2);
  const w = Math.max(...lines.map((l) => l.length)) * CELL + 16;
  const h = lines.length * 12 + 12;
  const x = Math.floor((WIDTH - w) / 2);
  const y = SAFE + 8;
  const total = lines.join('').length;
  const g = scene.add.graphics().setDepth(100);
  let typed = 0;
  const draw = () => {
    g.clear().fillStyle(nes(WHITE)).fillRect(x, y, w, h).fillStyle(nes(0x0f)).fillRect(x + 1, y + 1, w - 2, h - 2);
    visibleLines({ lines }, typed).forEach((line, i) => drawText(g, line, x + 8, y + 7 + i * 12, nes(WHITE)));
  };
  draw();
  const typing = scene.time.addEvent({
    delay: 33,
    repeat: total - 1,
    callback: () => { typed++; if (typed % 2) sfx('blip'); draw(); },
  });
  const gone = scene.time.delayedCall(ms, () => g.destroy());
  return { destroy: () => { typing.remove(); gone.remove(); g.destroy(); } };
}
