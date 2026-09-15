// Stage 2 with placeholder figures: boxes for Ward, pursuers and platforms, so the feel can be judged now.
/* global Phaser */
import { HEIGHT, SAFE } from '../nes/screen.mjs';
import { nes } from '../nes/palette.mjs';
import { playSong } from '../audio/player.mjs';
import { pollPad } from '../input.mjs';
import { CHECKPOINTS, jumpTo, next } from '../flow.mjs';
import { drawText, showFlow } from '../scenes/placeholder.mjs';
import { mountTunePanel } from '../tune.mjs';
import { BODY_H, BODY_W, SCREEN_W, createWorld, inChase, stepWorld } from './escape.mjs';

const C = {
  sky: nes(0x0f), shelf: nes(0x07), floor: nes(0x17), edge: nes(0x27), ward: nes(0x10), tie: nes(0x16),
  foe: nes(0x02), hurt: nes(0x30), shot: nes(0x28), charge: nes(0x38), spark: nes(0x30), text: nes(0x30),
  warn: nes(0x16), flag: nes(0x2a),
};

export class EscapeScene extends Phaser.Scene {
  constructor() {
    super('stage2');
  }

  create() {
    let state = this.registry.get('flow');
    if (!state || state.screen !== 'stage2') state = jumpTo('stage2');
    this.registry.set('flow', state);
    this.world = createWorld();
    // ?cp=<n> starts at checkpoint n, so a chase can be tried straight away.
    const cp = Math.min(Number(new URLSearchParams(location.search).get('cp')) || 0, this.world.level.checkpoints.length - 1);
    if (cp > 0) {
      this.world.checkpoint = cp;
      this.world.ward.x = this.world.level.checkpoints[cp];
      this.world.camX = this.world.ward.x - 32;
    }
    window.finalNoticeEscape = this.world;
    this.g = this.add.graphics();
    if (new URLSearchParams(location.search).has('tune') && !document.querySelector('details')) mountTunePanel();
    playSong('stage2');
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    const w = stepWorld(this.world, pad);
    window.finalNoticeEscape = w;
    let flow = this.registry.get('flow');
    for (const e of w.events) {
      if (e.type === 'checkpoint') flow = next(flow, { type: 'checkpoint', id: CHECKPOINTS.stage2[e.index] });
      else flow = next(flow, e);
    }
    if (flow !== this.registry.get('flow')) {
      showFlow(this, flow);
      if (flow.screen !== 'stage2') return;
    }
    this.draw(w, flow);
  }

  draw(w, flow) {
    const g = this.g.clear();
    const cx = Math.round(w.camX);
    const x = (v) => Math.round(v) - cx;
    g.fillStyle(C.sky).fillRect(0, 0, SCREEN_W, HEIGHT);
    // Shelving stripes scroll at half speed so motion reads even on flat ground.
    g.fillStyle(C.shelf);
    for (let sx = -((cx >> 1) % 48); sx < SCREEN_W; sx += 48) g.fillRect(sx, SAFE + 40, 32, 120);
    for (const s of w.level.surfaces) {
      const floor = s.y === w.level.floor;
      g.fillStyle(C.floor).fillRect(x(s.x0), s.y, s.x1 - s.x0, floor ? HEIGHT - s.y : 6);
      g.fillStyle(C.edge).fillRect(x(s.x0), s.y, s.x1 - s.x0, 1);
    }
    w.level.checkpoints.forEach((cpx, i) => {
      g.fillStyle(i <= w.checkpoint ? C.flag : C.edge).fillRect(x(cpx), w.level.floor - 24, 2, 24).fillRect(x(cpx) + 2, w.level.floor - 24, 8, 6);
    });
    g.fillStyle(C.flag).fillRect(x(w.level.exit), w.level.floor - 40, 12, 40);
    if (inChase(w.level, w.camX + SCREEN_W / 2) && Math.floor(w.frame / 8) % 2) g.fillStyle(C.warn).fillRect(0, SAFE + 24, 2, HEIGHT - SAFE * 2 - 24);

    for (const p of w.pursuers) {
      g.fillStyle(p.hurt ? C.hurt : C.foe).fillRect(x(p.x - BODY_W / 2), Math.round(p.y - BODY_H), BODY_W, BODY_H);
    }
    const r = w.ward;
    if (!(w.invuln && Math.floor(w.frame / 3) % 2)) {
      const h = r.crouch ? 20 : BODY_H;
      const lean = r.skid ? -r.facing * 2 : 0;
      g.fillStyle(C.ward).fillRect(x(r.x - BODY_W / 2) + lean, Math.round(r.y - h), BODY_W, h);
      g.fillStyle(C.tie).fillRect(x(r.x + r.facing * 4) - 1 + lean, Math.round(r.y - h + 8), 3, 8);
      if (w.cast.charge >= w.t.chargeFrames && Math.floor(w.frame / 4) % 2) g.fillStyle(C.charge).fillRect(x(r.x - BODY_W / 2) - 2, Math.round(r.y - h) - 2, BODY_W + 4, 2);
      if (w.cast.pending) g.fillStyle(C.shot).fillRect(x(r.x + r.facing * 10) - 2, Math.round(r.y - 22), 4, 4);
    }
    for (const s of w.shots) {
      const size = s.charged ? 8 : 4;
      g.fillStyle(s.charged ? C.charge : C.shot).fillRect(x(s.x) - size / 2, Math.round(s.y) - size / 2, size, size);
    }
    for (const sp of w.sparks) {
      const reach = (sp.big ? 10 : 6) * (1 - sp.age / w.t.sparkFrames) + 2;
      g.fillStyle(C.spark);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
        g.fillRect(x(sp.x + dx * reach) - 1, Math.round(sp.y + dy * reach) - 1, 2, 2);
      }
    }

    g.fillStyle(C.sky).fillRect(0, SAFE, SCREEN_W, 16);
    for (let i = 0; i < w.t.health; i++) g.fillStyle(i < w.health ? C.tie : C.shelf).fillRect(8 + i * 6, SAFE + 4, 4, 8);
    drawText(g, `x${flow.lives}`, 64, SAFE + 4, C.text);
    drawText(g, w.paused ? 'PAUSE' : `AREA ${w.checkpoint + 1}`, 176, SAFE + 4, C.text);
  }
}
