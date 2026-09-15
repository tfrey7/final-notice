// Stage 2 on the SNES: the shared escape logic drawn at 40 px over the archive's parallax shelving, the
// wax front as an add-half tint, the BG3 HUD with enchantment icons; then the Great Seal's locked arena,
// its press a Mode 7 layer swelling toward the floor on each stamp over a colour-subtract shadow, and
// the enemy-free exit run.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { rgb15 } from '../color.mjs';
import { screen, mathPass, mode7Matrix, mode7Pass } from '../fx.mjs';
import { artOr, loadArt, SpriteLayer } from '../art.mjs';
import { bakeArea, composeArea } from '../bgart.mjs';
import { drawString, measure } from '../text.mjs';
import { drainStep, drawHud, fadeFill, hudLayout, postReceipt } from '../hud.mjs';
import { endHold, holdMusic, playSong, sfx } from '../audio/player.mjs';
import { SEAL_SONG, stage2Song } from '../audio/cues.mjs';
import { FrontScreen, bufferFill } from '../scenes/front.mjs';
import { pollPad } from '../../input.mjs';
import { cheapen, fastOn } from '../../fast.mjs';
import { AUDITORS as WHO, jumpTo, next, showFlow } from '../../flow.mjs';
import { mountTunePanel } from '../../tune.mjs';
import { PROFILES } from '../../platform.mjs';
import { createSlowdown, slowdownTick } from '../../nes/slowdown.mjs';
import { HITS_PER_SEGMENT } from '../../injunction.mjs';
import { TILE, solidAt } from '../../stage2/physics.mjs';
import { carry, swapHand } from '../../stage2/pickups.mjs';
import { DIRECTOR, FLOOR_Y, SEAL, createArena, enterExit, poseArena, reachedArena, sealOpen, stepArena } from '../../stage2/greatseal.mjs';
import { BOSS_AREA, areaAt, arenaLocked, createStage, frontsOf, layoutFrom, promptsFor, stepStage } from '../../stage2/areas.mjs';
import { BELT } from '../../stage2/conveyor.mjs';
import { STAGE2, backdropFor, bodySize, camera, hudState, onScreen } from './view.mjs';
import { weighShared } from '../weight.mjs';
import { closePause, holdings, openPause, stepPause } from '../pause.mjs';
import { DIM_TINT, PauseOverlay, drawPause } from '../pausedraw.mjs';
import { mountControls } from '../../controls.mjs';
import { PRESS_IN, SLIP, pressEntrance, skipTo, slipFrame } from '../entrance.mjs';
import { PRESS_H, RAIL, burstSize, headY, mosaicRect, pressTexture, shadowHalf, stampScale, titleCard } from './seal.mjs';

const MS = 1000 / 60;
const SOUNDS = { cast: 'cast', jump: 'jump', hit: 'hit', break: 'waxBreak', pit: 'hit', hurt: 'hit', carbonCopy: 'carbonCopy', redTape: 'redTape', margin: 'margin', pickup: 'pickup', injunction: 'injunction', alarm: 'alarm', doorShut: 'stamp', belt: 'conveyor', tell: 'alarm', stamp: 'stamp', bindingBreak: 'waxBreak', sealOpen: 'alarm' };
const AREA_ART = ['archiveAccess', 'retentionOrder', 'originalCopy', 'disposalLine'];
const C = {
  stone: rgb15(7, 7, 9), stoneDark: rgb15(3, 3, 5), stoneTop: rgb15(12, 11, 13),
  box: rgb15(13, 9, 5), boxEdge: rgb15(21, 18, 12), flash: rgb15(31, 31, 31),
  wax: rgb15(24, 5, 3), waxLit: rgb15(31, 14, 5), ledger: rgb15(28, 26, 19), tab: rgb15(22, 4, 3),
  belt: rgb15(3, 3, 4), bar: rgb15(15, 15, 17), door: rgb15(6, 6, 8), stripe: rgb15(28, 22, 4),
  ink: rgb15(6, 8, 22), inkLit: rgb15(14, 18, 31), tape: rgb15(24, 4, 4), glyph: rgb15(20, 6, 22), burst: rgb15(31, 26, 10),
  brass: rgb15(22, 16, 5), brassDark: rgb15(12, 8, 3), gold: rgb15(31, 26, 12), memo: rgb15(3, 3, 7), sign: rgb15(4, 16, 6),
};
const MENU_SOUNDS = { move: 'pencil', swap: 'stampOk', close: 'paperSlide', thud: 'stamp' };
const TABS = { carbonCopy: C.flash, redTape: C.tape, margin: C.inkLit };
const SPRITE_CAST = { seal: 'notice', paper: 'carbonCopy', page: 'margin' };
const WAX_TOP = 24;
const ARENA_BACKDROP = 3;
// The arena is taller than the screen at 40 px bodies: frame it from just under the rail to the floor.
const ARENA_CAM_Y = 56;

export class SnesStage2Scene extends Phaser.Scene {
  constructor() {
    super('stage2');
  }

  async create() {
    weighShared();
    this.ready = false;
    this.paused = false;
    this.controls?.remove();
    this.controls = mountControls('stage2');
    this.events.once('shutdown', () => { this.controls?.remove(); this.controls = null; });
    this.slowdown = createSlowdown();
    this.fast = fastOn();
    const params = new URLSearchParams(location.search);
    let flow = this.registry.get('flow');
    if (!flow || flow.screen !== 'stage2') flow = jumpTo('stage2');
    if (WHO.includes(params.get('who'))) flow = { ...flow, auditor: params.get('who') };
    this.registry.set('flow', flow);
    this.holdAt = params.has('hold') ? Number(params.get('hold')) : null;
    const archive = await import('../../art/bg-archive.mjs').then((m) => m.default).catch(() => null);
    this.run = createStage(flow.auditor, layoutFrom(Object.fromEntries(AREA_ART.map((n) => [n, archive?.areas?.[n]?.solid]))), flow.checkpoint);
    if (params.has('at')) this.run.player.x = this.run.player.safe.x = Number(params.get('at'));
    if (params.has('spell')) carry(this.run, params.get('spell')), swapHand(this.run);
    if (params.has('meter')) this.run.meterHits = Number(params.get('meter')) * HITS_PER_SEGMENT;
    // ?paused opens Form 13-B on the first frame, for a screenshot.
    if (params.has('paused')) this.run.paused = true;
    window.finalNoticeStage2 = this.run;

    this.buf = screen();
    this.wax = screen(C.wax);
    this.shade = screen(rgb15(12, 12, 12));
    this.press = pressTexture();
    this.view = new FrontScreen(this, 'snes-stage2');
    this.layer = new SpriteLayer(this, 10);
    this.overlay = new PauseOverlay(this);
    this.menu = null;
    this.backs = new Map();
    if (flow.checkpoint === BOSS_AREA.id) {
      this.enterArena();
      // ?pose=stamp|seal stages the fight for a screenshot; ?exit starts on the exit run.
      if (params.has('pose')) poseArena(this.run, params.get('pose')), this.cardOff = true, this.entrance = null;
      // ?entrance=<frame> holds the press's entrance still, for a screenshot.
      if (this.entrance && params.has('entrance')) this.entrance = { t: Number(params.get('entrance')), still: true };
      if (params.has('exit')) {
        enterExit(this.run);
        this.run.events.length = 0;
        if (params.has('at')) this.run.player.x = Number(params.get('at'));
      }
    } else {
      playSong(this.song = stage2Song(this.run.player.x));
      // ?slip=<frame> holds the Custodian's slip still, for a screenshot.
      if (params.has('slip')) this.slip = { t: Number(params.get('slip')), still: true };
    }
    this.wasLocked = !!this.run.stage && arenaLocked(this.run);
    if (params.has('tune') && !document.querySelector('details')) mountTunePanel();
    await loadArt(`${flow.auditor}-stage2`).catch(() => null);
    await loadArt('greatseal-stage2').catch(() => null);
    this.ready = true;
  }

  // The locked arena replaces the strip; the title card and the Director's line open it once.
  enterArena() {
    this.run = createArena(this.run?.player.auditor ?? this.registry.get('flow').auditor);
    window.finalNoticeStage2 = this.run;
    this.bursts = [];
    this.broken = new WeakSet();
    this.voiced = false;
    this.slip = null;
    this.entrance = { t: 0, still: false };
    playSong(this.song = SEAL_SONG);
  }

  // An entrance holds the fight: the press lowering before the Great Seal's card, or the Custodian's
  // slip as his screen locks. Start jumps to its last frame, where the pad comes back.
  stepIntro(pad) {
    const press = !!this.entrance;
    const e = press ? this.entrance : this.slip;
    e.t = skipTo(e.t, pad, press ? PRESS_IN.end : SLIP.leave);
    const f = press ? pressEntrance(e.t) : slipFrame(e.t);
    if (f.landNow) sfx('stamp');
    if (f.slamNow) sfx('knockdown');
    if (f.done) this.entrance = this.slip = null;
    else if (!e.still) e.t++;
  }

  backdrop(index) {
    if (!this.backs.has(index)) {
      const area = backdropFor(index);
      this.backs.set(index, { area, baked: bakeArea(area) });
    }
    return this.backs.get(index);
  }

  update() {
    if (!this.ready) return;
    if (this.holdAt !== null && this.run.frame >= this.holdAt) { this.draw(this.registry.get('flow')); return; }
    const pad = pollPad(this.game.loop.frame);
    let { run } = this;
    if (this.entrance || this.slip) { this.stepIntro(pad); this.draw(this.registry.get('flow')); return; }
    if (this.fast) cheapen([...run.foes, ...(run.bosses ?? []), run.boss, run.boss?.seal, ...(run.boss?.bindings ?? [])].filter(Boolean));
    const count = (list) => list?.length ?? 0;
    const others = count(run.pickups) + count(run.glyphs) + count(run.locks);
    const work = {
      objects: 1 + run.foes.length + count(run.bosses) + count(run.casts) + others + count(run.boss?.bindings) + count(run.boss?.shots),
      collisions: count(run.casts) * (run.foes.length + count(run.locks) + count(run.targets) + count(run.boss?.bindings)) + run.foes.length + others,
      sprites: this.layer.stats?.count ?? 0,
    };
    if (!slowdownTick(this.slowdown, work, PROFILES.snes.slowdownBudget)) { this.draw(this.registry.get('flow')); return; }
    if (run.boss) {
      stepArena(run, pad);
    } else {
      stepStage(run, pad);
      if (reachedArena(run)) {
        this.enterArena();
        run = this.run;
      }
    }
    if (run.paused !== this.paused) {
      this.paused = run.paused;
      this.controls?.show(this.paused);
      sfx('pause');
      if (this.paused) {
        holdMusic();
        const hud = hudState(run, this.registry.get('flow'));
        this.menu = openPause(performance.now(), this.menu, { rows: holdings(hud), carried: hud.carried, hand: hud.hand });
      } else {
        this.menu = closePause(this.menu, performance.now());
        endHold();
      }
    } else if (this.paused) {
      const { menu, action } = stepPause(this.menu, pad);
      this.menu = menu;
      if (action === 'close') run.paused = false;
      if (action === 'swap') { swapHand(run); menu.hand = run.hand; }
      if (MENU_SOUNDS[action]) sfx(MENU_SOUNDS[action]);
    }
    let flow = this.registry.get('flow');
    for (const e of run.events) {
      if (SOUNDS[e.type]) sfx(SOUNDS[e.type]);
      if (e.type === 'pickup') this.receipt = postReceipt(this.receipt, run.frame * MS);
      if (e.type === 'bossDown') playSong(this.song = 'stageClear');
      if (e.type === 'stageClear') { showFlow(this, next(flow, e)); return; }
      if (e.type === 'checkpoint') this.registry.set('flow', flow = next(flow, e));
      if (e.type === 'lifeLost') {
        flow = next(flow, e);
        if (flow.screen !== 'stage2') { showFlow(this, flow); return; }
        this.registry.set('flow', flow);
      }
    }
    if (run.boss) {
      if (titleCard(run.frame)?.subtitle && !this.voiced) { this.voiced = true; sfx('sealLine'); }
      for (const b of run.boss.bindings) {
        if (b.hp > 0 || this.broken.has(b)) continue;
        this.broken.add(b);
        this.bursts.push({ x: b.x, y: b.y - b.h / 2, age: 0 });
      }
      for (const burst of this.bursts) burst.age++;
      this.bursts = this.bursts.filter((burst) => burstSize(burst.age) > 0);
    }
    const locked = !!run.stage && arenaLocked(run);
    if (locked && !this.wasLocked) this.slip = { t: 0, still: false };
    this.wasLocked = locked;
    const song = run.boss ? this.song : arenaLocked(run) ? 'boss' : stage2Song(run.player.x);
    if (!this.paused && song !== this.song) playSong(this.song = song);
    this.draw(flow);
  }

  draw(flow) {
    const { run } = this;
    const s = STAGE2.scale;
    const cam = run.boss && !run.exit ? { ...camera(run, s), y: ARENA_CAM_Y } : camera(run, s);
    const { area, baked } = this.backdrop(run.boss ? ARENA_BACKDROP : Math.max(0, areaAt(run.player.x)));
    const buf = composeArea(area, baked, cam.x, this.buf);
    const fill = bufferFill(buf);
    const rect = (x, y, w, h, c) => { const r = onScreen(cam, s, x, y, w, h); fill(r.x, r.y, r.w, r.h, c); };
    const px = (x) => Math.round(x * s) - cam.x;
    const py = (y) => Math.round(y * s) - cam.y;
    const t = run.frame * MS;

    const a = run.area;
    for (let col = Math.floor(cam.x / s / TILE); col <= Math.floor((cam.x + WIDTH) / s / TILE) && col < a.cols; col++) {
      for (let row = 0; row < a.rows; row++) {
        if (!solidAt(a, col, row)) continue;
        rect(col * TILE, row * TILE, TILE, TILE, C.stone);
        rect(col * TILE, row * TILE + TILE - 2, TILE, 2, C.stoneDark);
        if (!solidAt(a, col, row - 1)) rect(col * TILE, row * TILE, TILE, 2, C.stoneTop);
      }
    }
    if (run.boss) this.drawArena(run, buf, fill, rect, px, py);
    else this.drawParts(run, rect, t);

    const sprites = [];
    const p = run.player;
    const body = bodySize(s);
    if (!(p.invuln && p.invuln % 6 < 3)) {
      const who = artOr(this, `${p.auditor}-stage2`, { w: body.w, h: body.h, palette: [rgb15(2, 2, 6), rgb15(6, 9, 20), rgb15(28, 24, 18)] });
      const flip = p.castPose ? /left/i.test(p.castDir) : p.facing < 0;
      sprites.push(...who.frame(undefined, t, px(p.x) - (body.w >> 1), py(p.y) - body.h, flip));
    }
    if (run.boss && !run.exit) {
      const down = run.boss.state === 'down';
      const director = artOr(this, 'greatseal-stage2', { w: body.w, h: body.h, palette: [rgb15(2, 1, 4), rgb15(14, 12, 4), rgb15(28, 26, 18)] });
      sprites.push(...director.frame(down ? 'director.down' : 'director.idle', t, px(DIRECTOR.x) - (body.w >> 1), py(DIRECTOR.y) - body.h + (down ? 10 : 0)));
    }
    const foe = artOr(this, 'associate-stage2', { w: body.w, h: body.h, palette: [rgb15(2, 2, 4), rgb15(8, 8, 10), rgb15(20, 18, 14)] });
    for (const f of run.foes) {
      if ((f.hp <= 0 && f.down % 4 < 2) || px(f.x) < -body.w || px(f.x) > WIDTH + body.w) continue;
      sprites.push(...foe.frame(undefined, f.frozen ? 0 : t, px(f.x) - (body.w >> 1), py(f.y) - body.h, f.facing > 0));
      if (f.flash) fill(px(f.x) - 8, py(f.y) - body.h - 3, 16, 2, C.flash);
      if (f.frozen) for (const dy of [14, 26]) fill(px(f.x) - (body.w >> 1), py(f.y) - dy, body.w, 2, C.tape);
    }
    const boss = artOr(this, 'custodian-stage2', { w: body.w, h: body.h, palette: [rgb15(2, 1, 4), rgb15(12, 4, 14), rgb15(26, 20, 26)] });
    for (const c of run.bosses ?? []) {
      sprites.push(...boss.frame(undefined, t, px(c.x) - (body.w >> 1), py(c.y) - body.h, c.facing > 0));
      if ((c.phase === 'tell' && run.frame % 6 < 3) || c.flash) fill(px(c.x) - (body.w >> 1) - 2, py(c.y) - body.h - 3, body.w + 4, 2, C.flash);
    }
    const spells = artOr(this, 'spells-stage2', { w: 10, h: 10, palette: [rgb15(20, 4, 4), rgb15(31, 24, 10), rgb15(31, 31, 31)] });
    for (const c of run.casts) {
      if (c.kind === 'burst') {
        const grow = Math.min(1, (c.age + 3) / 6) * c.rule.radius;
        ring(fill, px(c.x), py(c.y), grow * s, 10, 4, c.spell === 'margin' ? C.ink : C.burst);
      } else if (c.kind === 'tape') {
        const len = Math.min(c.age * 3, 14);
        for (let i = 0; i < len; i += 2) fill(px(c.x - Math.sign(c.vx) * i), py(c.y - Math.sign(c.vy) * i), 3, 3, C.tape);
      } else {
        sprites.push(...spells.frame(SPRITE_CAST[c.kind] ?? undefined, 0, px(c.x) - 5, py(c.y) - 5));
      }
    }
    for (const g of run.glyphs) ring(fill, px(g.x), py(g.y - g.h / 2), 4, 6, 3, run.frame % 8 < 4 ? C.glyph : C.burst);

    // The wax front: everything it covers takes the red by add-half, as a sub-screen layer would.
    for (const front of run.stage ? frontsOf(run.stage) : []) {
      const edge = px(front.x);
      if (!front.active || edge <= 0) continue;
      mathPass(buf, this.wax, { op: 'add', half: true, where: (x, y) => x < edge && y >= WAX_TOP }, buf);
      for (let y = WAX_TOP; y < HEIGHT; y += 20) fill(edge - 12 - (((y >> 4) + (run.frame >> 5)) % 3) * 4, y + 4, 8, 10, C.waxLit);
      fill(edge, WAX_TOP, 3, HEIGHT - WAX_TOP, run.frame % 16 < 8 ? C.flash : C.waxLit);
    }

    const hud = hudState(run, flow);
    if (!run.paused) this.drain = drainStep(this.drain, hud.hp);
    const layout = hudLayout({ ...hud, pale: this.drain?.pale ?? hud.hp, receipt: this.receipt, now: run.frame * MS });
    drawHud(fadeFill(buf), layout);
    const hudArt = [...artOr(this, `hud-portrait-${p.auditor}`, { w: 20, h: 20, palette: [rgb15(1, 1, 1), rgb15(11, 13, 21), rgb15(31, 31, 31)] })
      .frame(undefined, 0, layout.portrait.x + 2, layout.portrait.y + 2)];
    for (const e of layout.enchant ?? []) {
      if (!e.icon) continue;
      hudArt.push(...artOr(this, `hud-${e.icon}`, { w: 16, h: 16, palette: [rgb15(1, 1, 1), e.icon === 'notice' ? rgb15(28, 3, 3) : rgb15(15, 15, 15), rgb15(31, 31, 31)] })
        .frame(undefined, 0, e.x + 2, e.y + 2));
    }
    sprites.unshift(...hudArt);
    if (run.stage) {
      promptsFor(run).forEach((text, i) => {
        if (run.frame % 60 < 45) drawString(fill, text, (WIDTH - measure(text)) >> 1, 60 + i * 14);
      });
    }
    if (run.boss && !run.exit && !this.cardOff && !this.entrance) drawCard(fill, titleCard(run.frame));
    if (this.slip) drawSlip(fill, slipFrame(this.slip.t));

    this.layer.draw(sprites);
    const paused = run.paused && this.menu;
    if (paused) drawPause(buf, this.menu, this.game.loop.frame);
    this.layer.pool.forEach((img, i) => img.setTint(paused ? DIM_TINT : 0xffffff).setAlpha(1));
    this.view.show(buf);
    if (paused) this.overlay.show(buf);
    else this.overlay.hide();
  }

  // The arena under the sprites: rail, bindings, the contract seal, tape and shots, the shadow taken out
  // of the floor by colour subtract, the press as a Mode 7 layer, and a mosaic over each fresh break.
  drawArena(run, buf, fill, rect, px, py) {
    if (run.exit) {
      const x = run.exit.end;
      rect(x - 12, FLOOR_Y - 60, 36, 14, C.sign);
      drawString(fill, 'EXIT', px(x - 12) + 8, py(FLOOR_Y - 60) + 4);
      return;
    }
    const b = run.boss;
    rect(TILE, RAIL - 4, 14 * TILE, 4, C.brassDark);
    rect(TILE, RAIL, 14 * TILE, 2, C.brass);
    rect(DIRECTOR.x - 24, DIRECTOR.y, 40, 4, C.brassDark);
    rect(DIRECTOR.x - 22, DIRECTOR.y + 4, 3, FLOOR_Y - DIRECTOR.y - 4, C.brassDark);
    for (const x of b.bindings) {
      rect(x.x - 1, RAIL + 2, 2, x.y - x.h - RAIL - 2, C.brassDark);
      if (x.hp <= 0) { rect(x.x - 3, x.y - x.h, 6, 4, C.wax); continue; }
      rect(x.x - x.w / 2, x.y - x.h, x.w, x.h, x.flash ? C.flash : C.wax);
      rect(x.x - 3, x.y - x.h + 5, 6, 6, C.waxLit);
    }
    const seal = b.seal;
    const cy = seal.y - seal.h / 2;
    if (b.state !== 'down') {
      if (sealOpen(b)) {
        rect(seal.x - 7, cy - 5, 14, 10, seal.flash ? C.flash : C.gold);
        rect(seal.x - 3, cy - 3, 6, 6, run.frame % 16 < 8 ? C.flash : C.waxLit);
      } else {
        rect(seal.x - 5, cy - 5, 10, 10, C.wax);
        rect(seal.x - 1, cy - 5, 2, 10, C.brass);
      }
    }
    if (b.tape) {
      const tape = b.tape;
      if (tape.t <= SEAL.tapeWarn) {
        if (tape.t % 8 < 4) rect(tape.dir > 0 ? TILE : 15 * TILE - 6, FLOOR_Y - 12, 6, 12, C.tape);
      } else {
        for (let i = 0; i < 24; i += 2) rect(tape.x - tape.dir * i, FLOOR_Y - 8 + ((i + (run.frame >> 1)) % 4 < 2 ? 0 : 2), 2, 3, C.tape);
      }
    }
    for (const shot of b.shots) {
      rect(shot.x - 4, shot.y - 7, 8, 6, shot.flash ? C.flash : C.wax);
      rect(shot.x - 1, shot.y - 5, 2, 2, C.gold);
    }

    if (this.entrance) { this.drawPressEntrance(buf, fill, rect, px, py); return; }
    const stamp = b.stamp;
    const x = stamp ? stamp.x : 128;
    const half = shadowHalf(stamp);
    if (half && (stamp.t > stamp.shadow - 12 || stamp.t % 8 < 6)) {
      const [sx, sy, rx, ry] = [px(x), py(stamp.y) - 2, half * STAGE2.scale, 5];
      mathPass(buf, this.shade, { op: 'sub', where: (u, v) => ((u - sx) / rx) ** 2 + ((v - sy) / ry) ** 2 < 1 }, buf);
    }
    const k = stampScale(stamp);
    const bottom = py(headY(stamp));
    const h = PRESS_H * k;
    rect(x - 12, RAIL - 6, 24, 10, C.brassDark);
    fill(px(x) - 3, py(RAIL + 4), 6, Math.max(0, Math.round(bottom - h) - py(RAIL + 4)), C.brass);
    mode7Pass(this.press, mode7Matrix(k, 0), [px(x), Math.round(bottom - h / 2)], buf, buf);
    if (stamp && stamp.t >= stamp.shadow && stamp.t < stamp.shadow + 4) {
      for (const d of [-1, 1]) rect(x + d * 22 - 4, stamp.y - 8, 8, 2, C.flash);
    }
    for (const burst of this.bursts) {
      const size = burstSize(burst.age);
      mosaicRect(buf, px(burst.x) - 24, py(burst.y) - 24, 48, 48, size);
    }
  }

  // B3: the room darkened by colour subtract, lifting as the press lowers out of it by Mode 7 (scale
  // 0.6 to 1.4) with its shadow taken out of the floor, growing under it.
  drawPressEntrance(buf, fill, rect, px, py) {
    const f = pressEntrance(this.entrance.t);
    const dark = Math.round(14 * (1 - f.shadow));
    if (dark > 0) mathPass(buf, screen(rgb15(dark, dark, dark)), { op: 'sub' }, buf);
    const x = px(128);
    const floor = py(FLOOR_Y);
    const [rx, ry] = [(8 + 26 * f.shadow) * STAGE2.scale, 3 + 4 * f.shadow];
    mathPass(buf, this.shade, { op: 'sub', where: (u, v) => ((u - x) / rx) ** 2 + ((v - floor + 2) / ry) ** 2 < 1 }, buf);
    const h = PRESS_H * f.scale;
    const bottom = Math.round(py(RAIL) + h + (floor - 4 - py(RAIL) - h) * f.shadow ** 2);
    fill(x - 3, py(RAIL + 4), 6, Math.max(0, Math.round(bottom - h) - py(RAIL + 4)), C.brass);
    mode7Pass(this.press, mode7Matrix(f.scale, 0), [x, Math.round(bottom - h / 2)], buf, buf);
  }

  drawParts(run, rect, t) {
    const { stage } = run;
    for (const b of run.targets) {
      if (b.hp <= 0) continue;
      rect(b.x - b.w / 2, b.y - b.h, b.w, b.h, b.flash ? C.flash : C.boxEdge);
      rect(b.x - b.w / 2 + 2, b.y - b.h + 2, b.w - 4, b.h - 4, b.flash ? C.flash : C.box);
    }
    for (const lock of run.locks) {
      if (lock.hp <= 0) continue;
      rect(lock.x - lock.w / 2, lock.y - lock.h, lock.w, lock.h, lock.flash ? C.flash : C.wax);
      rect(lock.x - 4, lock.y - 20, 8, 8, C.waxLit);
    }
    for (const k of run.pickups) {
      rect(k.x - 6, k.y - 12, 12, 12, C.ledger);
      rect(k.x + 3, k.y - 11, 3, 10, TABS[k.name] ?? C.tab);
    }
    const shift = Math.floor(run.frame * BELT.speed) % 8;
    for (const [key, dir] of stage.belts) {
      const [col, row] = key.split(',').map(Number);
      rect(col * TILE, row * TILE, TILE, 4, C.belt);
      for (let i = 0; i < TILE; i += 8) rect(col * TILE + ((i + dir * shift + 16) % TILE), row * TILE + 1, 3, 2, C.bar);
    }
    for (const d of stage.doors) {
      if (!d.closed) continue;
      const h = (d.bottom - d.top + 1) * TILE;
      rect(d.col * TILE, d.top * TILE, TILE, h, C.door);
      for (let y = 6; y < h; y += 12) rect(d.col * TILE + 2, d.top * TILE + y, TILE - 4, 2, C.stripe);
    }
    const { ledger } = stage.arena;
    rect(ledger.x - 6, ledger.baseY, 12, 3, C.door);
    rect(ledger.x - 2, ledger.baseY + 3, 4, 13, C.door);
    if (!ledger.taken) rect(ledger.x - 7, Math.round(ledger.y) - 9 + (Math.floor(t / 400) % 2), 14, 9, C.ledger);
  }
}

// The boss title card on BG3, a filed memo: the name, the department, and the line's subtitle beneath.
function drawCard(fill, card) {
  if (!card) return;
  const y = Math.round(56 - card.slide * 110);
  fill(28, y, 200, 46, C.gold);
  fill(30, y + 2, 196, 42, C.memo);
  fill(30, y + 2, 196, 8, C.brassDark);
  drawString(fill, 'FILE 5', 36, y + 2, C.gold);
  for (const [text, dy] of [['THE GREAT SEAL', 14], ['RETENTION DIRECTOR', 28]]) drawString(fill, text, (WIDTH - measure(text)) >> 1, y + dy);
  if (card.subtitle) drawString(fill, '"SEALED."', (WIDTH - measure('"SEALED."')) >> 1, HEIGHT - 28);
}

// B2: the Records Custodian's slip, shorter than a boss card in the same look, dropped in top-left.
function drawSlip(fill, slip) {
  const w = Math.max(measure(SLIP.name), measure(SLIP.area)) + 16;
  const y = Math.round(36 - slip.rise * 70);
  fill(8, y, w, 30, C.gold);
  fill(10, y + 2, w - 4, 26, C.memo);
  drawString(fill, SLIP.name, 16, y + 4);
  drawString(fill, SLIP.area, 16, y + 16, C.waxLit);
}

function ring(fill, x, y, reach, points, size, colour) {
  for (let i = 0; i < points; i++) {
    const a = (i * 2 * Math.PI) / points;
    fill(Math.round(x + Math.cos(a) * reach) - (size >> 1), Math.round(y + Math.sin(a) * reach) - (size >> 1), size, size, colour);
  }
}
