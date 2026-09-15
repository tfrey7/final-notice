// The brawl lab under ?snes&go=lab: one locked grey-box room on Stage 1's real fighting (moves.mjs,
// player.mjs and staff.mjs, at the SNES weight and scale), with a dial panel for tuning the feel live.
// Boxes stand in for every sprite: foes flash white on a wind-up, and a swing shows its reach.
/* global Phaser */
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString } from '../text.mjs';
import { hex, rgb15 } from '../color.mjs';
import { sfx } from '../audio/player.mjs';
import { pollPad } from '../../input.mjs';
import { AUDITORS } from '../../flow.mjs';
import { DOWNED, fighter, shakeOffset } from '../../stage1/moves.mjs';
import { readLook, turnOwners } from '../../stage1/readout.mjs';
import { drawReadout } from '../readout.mjs';
import { PIPS, newFloor, stepFloor, tuneFor } from '../../stage1/player.mjs';
import { CROWD, KINDS, spawnStaff, thinkStaff } from '../../stage1/staff.mjs';
import { STAGE1 } from '../../stage1/tuning.mjs';
import { MAX_HITS, RING, SEGMENTS, freeInjunction } from '../../injunction.mjs';
import { scaledTune } from '../stage1/finisher.mjs';
import { BRAWL_WEIGHT, weighShared, weighed } from '../weight.mjs';
import { buildDials, labKinds, settingsText, takeTurns, waveKinds } from '../../lab/dials.mjs';
import { mountLabPanel } from '../../lab/panel.mjs';
import { isShortcut, mountControls } from '../../controls.mjs';
import { armWorld, scaledWeapons } from '../../stage1/weapons.mjs';
import { MAX_PER_LINE, boxEntries, frameEntries } from '../limits.mjs';
import { thingPriority } from '../stage1/priority.mjs';
import { drawCombo, drawRouteMap, drawSparks } from '../hitfx.mjs';

// One piece of furniture per weapon, along the back wall; a respawn stands them all back up.
const SMASH = [
  { kind: 'desk', x: 76, y: 160, drop: 'stapler' }, { kind: 'cabinet', x: 132, y: 154, drop: 'binder' },
  { kind: 'cabinet', x: 188, y: 154, drop: 'extinguisher' }, { kind: 'desk', x: 244, y: 160, drop: 'stamp' },
];
const FURNITURE = { desk: { w: 36, h: 22, c: 0x7a6a50 }, cabinet: { w: 20, h: 36, c: 0x6c7480 } };
const WEAPON_BOX = { stapler: { w: 10, h: 5, c: 0x303038 }, binder: { w: 8, h: 11, c: 0x3464b4 }, extinguisher: { w: 6, h: 13, c: 0xd83828 }, stamp: { w: 8, h: 7, c: 0xc02838 } };

const FLOOR = { left: 16, right: WIDTH - 16, top: 150, bottom: 216 };
const START_COUNTS = { associate: 2, manager: 1, counsel: 0, supervisor: 0 };
const RESPAWN_FRAMES = 90;
const REPEAT = { delay: 14, every: 3 };
const SOUND = { punch: 'punch', hit: 'hit', heavy: 'knockdown', jump: 'jump', land: 'land', grab: 'grab', throw: 'throw', step: 'step', redTape: 'redTape', guardBreak: 'knockdown', blocked: 'land', injunction: 'injunction', parry: 'stamp' };
const GREY = { wall: 0x34343a, trim: 0x44444c, floor: 0x5a5a62, line: 0x66666e, shadow: 0x222226 };
const BODY = { player: 0xdcdcdc, associate: 0x9c9c9c, manager: 0xb4ab8c, counsel: 0xa88c8c, supervisor: 0x8894a8 };
// The body shifts toward the look's colour, so kind still reads under the state.
const LOOK_BODY = { open: 0xe8d870, hurt: 0xc87070, down: 0x74747c };
const LYING = [...DOWNED, 'knockdown'];
// ?pose=sheet&n=<0-4>: the picture sheet, every state held still across five frames.
const SHEETS = ['IDLE / WALK', 'WIND-UP', 'ATTACK', 'GUARD / OPEN', 'HURT / DOWN / GETUP'];
const WHITE = rgb15(31, 31, 31);

export class SnesLabScene extends Phaser.Scene {
  constructor() {
    super('lab');
  }

  create() {
    const params = new URLSearchParams(location.search);
    this.who = AUDITORS.includes(params.get('who')) ? params.get('who') : 'ward';
    weighShared();
    this.base = weighed(tuneFor(this.who), BRAWL_WEIGHT);
    this.tune = scaledTune(this.base, STAGE1.scale);
    this.dials = buildDials(this.base);
    this.counts = { ...START_COUNTS };
    // Staff reads KINDS for each foe's own speed and wind-up; the lab turns them and puts them back on exit.
    this.kinds = structuredClone(KINDS);
    this.crowd = { ...CROWD };
    this.world = this.newRoom();
    this.respawn();
    this.clear = 0;
    this.repeat = { dir: 0, t: 0 };

    this.g = this.add.graphics();
    this.fill = (x, y, w, h, c) => this.g.fillStyle(hex(c)).fillRect(x, y, w, h);
    this.panel = mountLabPanel({
      dials: this.dials, counts: this.counts, kinds: Object.keys(KINDS),
      onRespawn: () => this.respawn(),
      onCopy: () => settingsText(this.dials, this.counts, this.who),
      onReset: () => { this.dials.forEach((d) => { d.value = d.start; }); this.panel.flash('Dials reset.'); },
    });
    this.controls = mountControls('stage1');
    this.controls.show();
    this.tabbed = false;
    // H overlays hit and hurt boxes, the attack-turn owners and each fighter's state tag; ?boxes starts it on.
    this.boxes = params.has('boxes');
    // G (or ?lines) shows each scanline's sprite count at Stage 1's limits: green drawn, red dropped.
    // Not L, which is the pad's A button.
    this.showLines = params.has('lines');
    // M (or ?routes) shows the combo-route map, lighting the route the auditor's chain is on.
    this.showRoutes = params.has('routes');
    const onKey = (e) => {
      if (isShortcut(e.code, 'dials')) { e.preventDefault(); this.tabbed = true; }
      if (isShortcut(e.code, 'boxes')) this.boxes = !this.boxes;
      if (isShortcut(e.code, 'routes')) this.showRoutes = !this.showRoutes;
      if (isShortcut(e.code, 'lines')) this.showLines = !this.showLines;
    };
    window.addEventListener('keydown', onKey);
    // ?dials opens the panel on the first frame, for a screenshot.
    if (params.has('dials')) this.panel.toggle(true);
    // ?pose=parry stages an Associate's blow meeting an open parry and holds the frame it lands on,
    // or `&hold=<frames>` that many frames later.
    this.poseHold = Number(params.get('hold') ?? 0);
    if (params.get('pose') === 'parry') this.poseParry();
    if (params.get('pose') === 'sheet') this.poseSheet(Number(params.get('n') ?? 0));
    if (params.get('pose') === 'combo') this.poseCombo();
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.panel.remove();
      this.controls.remove();
      for (const [k, v] of Object.entries(this.kinds)) Object.assign(KINDS[k], v);
      Object.assign(CROWD, this.crowd);
    });
  }

  poseParry() {
    const w = this.world;
    const p = w.fighters.find((f) => f.team === 'player');
    const [a, ...rest] = w.fighters.filter((f) => f.team === 'foe');
    Object.assign(p, { x: 120, parry: this.tune.parryFrames });
    Object.assign(a, { x: p.x + 24, y: p.y, facing: -1, state: 'windup', t: this.tune.kinds.associate.windup - 2, cooldown: 0 });
    rest.forEach((f, i) => Object.assign(f, { x: FLOOR.right - 8 - i * 30, cooldown: 999 }));
    this.posed = true;
  }

  poseSheet(n) {
    const w = this.world;
    const tune = this.tune;
    const p = Object.assign(w.fighters.find((f) => f.team === 'player'), { x: 44, y: 192, facing: 1 });
    const foe = (kind, x, fields) => Object.assign(fighter(`${kind}${x}`, 'foe', x, 192, tune), {
      kind, hp: KINDS[kind].hp, maxHp: KINDS[kind].hp, facing: -1, cooldown: 999, guardDown: 0, guardBreakFrames: KINDS[kind].guard ?? 0,
    }, fields);
    const sheets = [
      () => [foe('associate', 120, {}), foe('manager', 190, { state: 'walk', facing: 1 }), foe('counsel', 256, {})],
      () => { p.parry = 6; return [foe('associate', 120, { state: 'windup', t: 2 }), foe('supervisor', 220, { state: 'windup', t: 33 })]; },
      () => { Object.assign(p, { state: 'punch', combo: 1, t: tune.punchStartup + 1 }); return [foe('manager', 150, {}), foe('associate', 240, { state: 'punch', t: 1 })]; },
      () => [foe('supervisor', 120, { state: 'guard' }), foe('associate', 220, { state: 'hurt', stagger: tune.parryStagger, t: 10 })],
      () => {
        Object.assign(p, { weapon: { kind: 'stapler', uses: 3 } });
        w.cooldown.left = w.cooldown.frames / 2;
        return [foe('manager', 104, { state: 'hurt', t: 4 }), foe('counsel', 170, { state: 'down', t: 5 }), foe('associate', 236, { state: 'getup', t: 5 })];
      },
    ];
    w.fighters = [p, ...sheets[n % sheets.length]()];
    w.bench = [];
    this.sheet = SHEETS[n % SHEETS.length];
    this.held = true;
  }

  // ?pose=combo holds a six-hit chain mid-blow: a struck foe flashing, sparks bursting, the counter
  // popping and the route map lit on the two-light chain.
  poseCombo() {
    const w = this.world;
    const p = Object.assign(w.fighters.find((f) => f.team === 'player'), { x: 110, y: 192, facing: 1, state: 'punch', combo: 2, t: 2 });
    const [a, b] = w.fighters.filter((f) => f.team === 'foe');
    Object.assign(a, { x: p.x + 26, y: p.y, state: 'hurt', t: 1, hitFlash: 4, cooldown: 999 });
    if (b) Object.assign(b, { x: 230, y: 176, state: 'knockdown', z: 12, cooldown: 999 });
    w.sparks = [{ x: a.x - 6, y: a.y, z: 0, weight: 'light', t: 2 }, ...(b ? [{ x: b.x, y: b.y, z: b.z, weight: 'finisher', t: 3 }] : [])];
    w.combo = { hits: 6, t: Math.round(this.tune.comboDrop * 0.7), pop: 2, best: 6 };
    this.showRoutes = true;
    this.held = true;
  }

  dial(key) {
    return this.dials.find((d) => d.key === key).value;
  }

  newRoom() {
    const w = newFloor(this.who, this.tune);
    const p = w.fighters.find((f) => f.team === 'player');
    Object.assign(w, {
      fighters: [p], floor: { ...FLOOR }, locked: true, cameraX: 0, checkpointX: 48, bench: [], tapes: [], cooldown: freeInjunction(),
      props: [{ id: 'chair', kind: 'chair', home: { x: 40, y: 204 }, x: 40, y: 204, z: 0, vx: 0, state: 'floor', t: 0 }],
      think: (world, f, tune) => {
        thinkStaff(world, f, tune);
        takeTurns(world, f, this.dial('maxAttackers'));
      },
    });
    return armWorld(w, SMASH);
  }

  respawn() {
    const w = this.world;
    w.fighters = w.fighters.filter((f) => f.team === 'player');
    w.bench = [];
    w.tapes = [];
    w.spawned = 0;
    for (const s of w.smash) Object.assign(s, { hits: 0, state: 'standing' });
    spawnStaff(w, waveKinds(this.counts), this.tune);
    this.clear = 0;
  }

  applyDials() {
    for (const d of this.dials) if (d.group === 'moves') this.base[d.key] = d.value;
    for (const d of this.dials) if (d.group === 'crowd') CROWD[d.key] = d.value;
    Object.assign(this.tune, scaledTune(this.base, STAGE1.scale));
    const turned = labKinds(this.kinds, { foeWalkScale: this.dial('foeWalkScale'), foeWindupAdd: this.dial('foeWindupAdd') });
    for (const [k, v] of Object.entries(turned)) Object.assign(KINDS[k], v);
    if (this.dial('meterFull')) this.world.meterHits = MAX_HITS;
    this.world.cooldown.frames = this.dial('injunctionCooldown');
    const weapons = Object.fromEntries(this.dials.filter((d) => d.group === 'weapons').map((d) => [d.key, d.value]));
    this.world.weaponTune = scaledWeapons(weapons, STAGE1.scale);
  }

  update() {
    const pad = pollPad(this.game.loop.frame);
    if (this.tabbed || pad.pressed.has('select')) this.panel.toggle();
    this.tabbed = false;
    if (this.panel.visible) this.drivePanel(pad);
    else if (!this.held) this.play(pad);
    this.draw();
  }

  // While the panel is open the fight holds still and the pad works the panel.
  drivePanel(pad) {
    if (pad.pressed.has('up')) this.panel.move(-1);
    if (pad.pressed.has('down')) this.panel.move(1);
    const dir = (pad.held.has('right') ? 1 : 0) - (pad.held.has('left') ? 1 : 0);
    const r = this.repeat;
    if (dir !== r.dir) Object.assign(r, { dir, t: 0 });
    if (dir && (r.t === 0 || (r.t >= REPEAT.delay && (r.t - REPEAT.delay) % REPEAT.every === 0))) this.panel.turn(dir);
    if (dir) r.t++;
    if (pad.pressed.has('a') || pad.pressed.has('b')) this.panel.press();
  }

  play(pad) {
    this.applyDials();
    const w = this.world;
    stepFloor(w, pad, this.tune);
    for (const e of w.events) if (SOUND[e]) sfx(SOUND[e]);
    if (this.posed && w.events.includes('parry')) this.sincePose = 0;
    if (this.sincePose !== undefined && this.sincePose++ >= this.poseHold) this.held = true;
    const foes = w.fighters.some((f) => f.team === 'foe') || w.bench.length;
    this.clear = foes ? 0 : this.clear + 1;
    if (this.clear >= RESPAWN_FRAMES) this.respawn();
  }

  draw() {
    const w = this.world;
    const g = this.g.clear();
    const shake = shakeOffset(w, this.tune);
    this.cameras.main.setScroll(-shake.x, shake.y);

    g.fillStyle(GREY.wall).fillRect(-8, -8, WIDTH + 16, FLOOR.top + 8);
    g.fillStyle(GREY.trim).fillRect(-8, FLOOR.top - 12, WIDTH + 16, 12);
    g.fillStyle(GREY.floor).fillRect(-8, FLOOR.top, WIDTH + 16, HEIGHT - FLOOR.top + 8);
    for (let y = FLOOR.top + 11; y < HEIGHT; y += 11) g.fillStyle(GREY.line).fillRect(-8, y, WIDTH + 16, 1);
    for (let x = 0; x <= WIDTH; x += 32) g.fillStyle(GREY.trim).fillRect(x, 40, 1, FLOOR.top - 52);

    this.turns = turnOwners(w);
    const things = [...w.fighters.map((f) => ({ y: f.y, f })), ...w.props.filter((o) => o.state !== 'gone').map((o) => ({ y: o.y, o })),
      ...(w.tapes ?? []).map((t) => ({ y: t.y, t })), ...w.smash.map((s) => ({ y: s.y, s })), ...w.weapons.map((wp) => ({ y: wp.y, wp }))]
      .sort((a, b) => a.y - b.y);
    for (const { f, o, t, s, wp } of things) {
      if (s) this.drawFurniture(s);
      else if (wp) this.drawWeapon(wp.kind, wp.x, wp.y - wp.z, wp.state === 'floor' && wp.t > w.weaponTune.weaponLife - 90 && wp.t % 8 < 4);
      else if (o) this.drawProp(o);
      else if (t) g.fillStyle(0xc03030).fillRect(Math.round(t.x - 10), t.y - 36, 20, 4);
      else this.drawFighter(f);
    }
    drawSparks(g, w.sparks, 0, this.tune);
    if (w.ring) {
      const k = w.ring.t / RING.frames;
      g.lineStyle(2, 0xe0d0a0, 1 - k).strokeCircle(w.ring.x, w.ring.y, RING.from + (RING.to - RING.from) * (1 - (1 - k) ** 3));
    }
    if (w.flash > 0) g.fillStyle(0xffffff, w.flash / (this.tune.parryFlash || 1) * 0.5).fillRect(-8, -8, WIDTH + 16, HEIGHT + 16);
    this.drawHud();
    if (this.showLines) this.drawLines(things);
  }

  // The room's boxes as stand-in OAM entries through the SNES limits, in Stage 1's priority order.
  drawLines(things) {
    const entries = things.flatMap((t) => {
      const { f, o, s, wp } = t;
      if (s) { const { w, h } = FURNITURE[s.kind]; return boxEntries(s.x - w / 2, s.y - h, w, h, s.kind); }
      if (wp) { const { w, h } = WEAPON_BOX[wp.kind]; return boxEntries(wp.x - w / 2, wp.y - wp.z - h, w, h, wp.kind); }
      if (o) return boxEntries(o.x - 9, o.y - 20 - o.z, 18, 18, 'prop');
      if (!f) return boxEntries(t.t.x - 10, t.t.y - 36, 20, 4, 'tape');
      const bh = f.kind === 'supervisor' ? 62 : 56;
      return boxEntries(f.x - 12, f.y - bh - f.z, 24, bh, f.kind ?? 'player', thingPriority(t));
    });
    const { stats } = frameEntries(entries);
    stats.lines.forEach((n, y) => {
      if (!n) return;
      const drawn = stats.shownLines[y];
      this.g.fillStyle(0x40c060).fillRect(WIDTH - n * 3, y, drawn * 3, 1);
      if (n > drawn) this.g.fillStyle(0xe04040).fillRect(WIDTH - (n - drawn) * 3, y, (n - drawn) * 3, 1);
    });
    drawString(this.fill, `LINE ${Math.max(0, ...stats.lines)}/${MAX_PER_LINE} PAL ${stats.palettes} DROP ${stats.dropped}`, 8, 42, stats.dropped ? rgb15(31, 12, 10) : rgb15(20, 20, 22));
  }

  drawProp(o) {
    const g = this.g;
    g.fillStyle(GREY.shadow).fillRect(Math.round(o.x - 9), o.y - 2, 18, 4);
    g.fillStyle(0x8a7a6a).fillRect(Math.round(o.x - 9), Math.round(o.y - 20 - o.z), 18, 18);
    g.lineStyle(1, 0x222222).strokeRect(Math.round(o.x - 9), Math.round(o.y - 20 - o.z), 18, 18);
  }

  drawFurniture(s) {
    const { w, h, c } = FURNITURE[s.kind];
    const bh = s.state === 'broken' ? 6 : h;
    this.g.fillStyle(GREY.shadow).fillRect(s.x - w / 2, s.y - 2, w, 4);
    this.g.fillStyle(s.state === 'broken' ? 0x4a4238 : c).fillRect(s.x - w / 2, s.y - bh, w, bh);
    this.g.lineStyle(1, s.hits ? 0xe0a040 : 0x18181c).strokeRect(s.x - w / 2, s.y - bh, w, bh);
  }

  drawWeapon(kind, x, y, hidden = false) {
    if (hidden) return;
    const { w, h, c } = WEAPON_BOX[kind];
    this.g.fillStyle(c).fillRect(Math.round(x - w / 2), Math.round(y - h), w, h);
    this.g.lineStyle(1, 0xe8e8e8).strokeRect(Math.round(x - w / 2), Math.round(y - h), w, h);
  }

  drawFighter(f) {
    const g = this.g;
    const x = Math.round(f.x);
    g.fillStyle(GREY.shadow).fillRect(x - 12, f.y - 2, 24, 4);
    const lying = LYING.includes(f.state) && f.state !== 'getup';
    const bw = lying ? 48 : f.team === 'player' ? 22 : 24;
    const bh = lying ? 14 : f.kind === 'supervisor' ? 62 : 56;
    const top = Math.round(f.y - bh - f.z);
    const look = readLook(f);
    const flash = (look === 'windup' && f.t % 8 < 4) || f.hitFlash > 0;
    const colour = flash ? 0xffffff : LOOK_BODY[look] ?? (f.team === 'player' ? BODY.player : BODY[f.kind] ?? BODY.associate);
    const alpha = f.invuln > 0 && f.invuln % 4 < 2 ? 0.35 : 1;
    g.fillStyle(colour, alpha).fillRect(x - bw / 2, top, bw, bh);
    drawReadout(g, this.fill, f, { x, top, w: bw, h: bh, feet: f.y, lying }, {
      tune: this.tune, frame: this.game.loop.frame, cooldown: this.world.cooldown, boxes: this.boxes, turn: this.turns.includes(f),
    });
    if (f.state === 'heavy') g.fillStyle(0xd0d0d0, 0.7).fillRect(f.facing > 0 ? x + bw / 2 : x - bw / 2 - 14, top + 14, 14, 10);
    if (f.state === 'special') {
      const t = this.tune;
      const on = f.t > t.specialStartup && f.t <= t.specialStartup + t.specialActive;
      const reach = f.move === 'sweep' ? t.specialReach / 2 : t.punchReach;
      const x0 = f.move === 'sweep' ? x - reach : f.facing > 0 ? x : x - reach;
      g.fillStyle(0xb8b8c0, on ? 0.6 : 0.2).fillRect(x0, top + 20, f.move === 'sweep' ? reach * 2 : reach, 14);
    }
    if (f.marked > 0) g.fillStyle(0xc02838).fillRect(x + 6, top - 22, 10, 7);
    if (f.weapon) this.drawWeapon(f.weapon.kind, x + f.facing * (bw / 2 + 4), top + 34);
    if (f.state === 'spray') g.fillStyle(0xe8f0f8, 0.5).fillRect(f.facing > 0 ? x + bw / 2 : x - bw / 2 - this.world.weaponTune.extinguisherReach, top + 16, this.world.weaponTune.extinguisherReach, 14);
  }

  drawHud() {
    const w = this.world;
    const g = this.g;
    const p = w.fighters.find((f) => f.team === 'player');
    g.fillStyle(0x111114).fillRect(6, 6, 4 + PIPS * 8, 10);
    for (let i = 0; i < PIPS; i++) g.fillStyle(i < p.hp ? 0xd8d8d8 : 0x3a3a3e).fillRect(8 + i * 8, 8, 6, 6);
    for (let i = 0; i < SEGMENTS; i++) g.fillStyle(i < w.meter ? 0xd8b050 : 0x3a3a3e).fillRect(8 + i * 10, 20, 8, 4);
    drawString(this.fill, 'BRAWL LAB', WIDTH - 72, 8, WHITE);
    drawString(this.fill, this.panel.visible ? 'TAB: FIGHT' : 'TAB: DIALS', WIDTH - 72, 20, rgb15(20, 20, 22));
    drawString(this.fill, this.boxes ? 'H: NO BOXES' : 'H: BOXES', WIDTH - 72, 32, rgb15(20, 20, 22));
    drawString(this.fill, this.showRoutes ? 'M: NO ROUTES' : 'M: ROUTES', WIDTH - 72, 44, rgb15(20, 20, 22));
    if (this.sheet) drawString(this.fill, this.sheet, 8, 44, rgb15(31, 28, 10));
    const foes = w.fighters.filter((f) => f.team === 'foe' && f.state !== 'ko').length + w.bench.length;
    drawString(this.fill, `FOES ${foes}`, 8, 30, rgb15(20, 20, 22));
    drawCombo(g, this.fill, w.combo, this.tune, { right: WIDTH - 12, top: 66 });
    if (this.showRoutes) drawRouteMap(g, this.fill, p, this.tune, { x: 8, y: 58 });
  }
}
