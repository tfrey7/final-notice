// The Claims & Adjustments lobby, first playable cut: a floor band three screens wide in front of
// a back wall, and a flat stand-in box for Ward that walks, jumps and punches. Flat colours only;
// the real sprite drops in by the animation state names in ward.mjs.
/* global Phaser */
import { WIDTH, HEIGHT } from './screen.mjs';
import { PALETTE as P } from './palette.mjs';
import { TICK_MS, createWard, stepWard, punchPhase, isPunch, PUNCHES, cameraX } from './ward.mjs';

export const LOBBY_W = WIDTH * 3;
const FLOOR_TOP = 150; // where the back wall meets the floor
const FLOOR_DEPTH = 60; // how far toward the camera Ward can walk
const WARD_W = 22;
const WARD_H = 60;

// Stand-in colours for the lobby, kept here until the art direction's set lands.
const L = {
  wall: 0x2b2f45,
  wallLow: 0x23263a,
  panel: 0x34395a,
  pillar: 0x3f4466,
  pillarEdge: 0x565d86,
  desk: 0x4a2a24,
  deskTop: 0x7a4a36,
  door: 0x6b6f86,
  doorGap: 0x1a1c2a,
  floor: 0x3a3e52,
  floorLine: 0x31344a,
  floorNear: 0x2f3245,
  shadow: 0x15172a,
  suit: 0x1d2440,
  suitEdge: 0x3a4a80,
  shirt: 0xd8d2c2,
  skin: 0xd9a57a,
  fist: 0xf0c49a,
  flash: 0xfff2c0,
};

const KEYS = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['X', 'K', 'SPACE'],
  punch: ['Z', 'J'],
};

// The ?demo script, by frame: walk right and toward the camera, a three-hit combo, a jump.
function demoInput(frame) {
  const f = frame % 240;
  return {
    right: f < 100,
    down: f >= 60 && f < 90,
    up: f >= 200 && f < 230,
    punch: f === 110 || f === 118 || f === 126,
    jump: f === 180,
  };
}

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super('lobby');
  }

  create() {
    this.drawLobby(this.add.graphics());
    this.wardGfx = this.add.graphics();
    this.ward = createWard(80, 30);
    this.bounds = { minX: WARD_W / 2, maxX: LOBBY_W - WARD_W / 2, depth: FLOOR_DEPTH };
    this.acc = 0;
    this.pending = { jump: false, punch: false };
    this.padPrev = { jump: true, punch: true }; // a button still held from PRESS START is not a press
    this.impact = null;

    this.keys = {};
    for (const [action, names] of Object.entries(KEYS)) {
      this.keys[action] = names.map((n) => this.input.keyboard.addKey(n));
    }
    this.input.keyboard.on('keydown', (e) => {
      if (e.repeat) return;
      const code = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (['x', 'k', ' '].includes(e.key.toLowerCase())) this.pending.jump = true;
      if (['Z', 'J'].includes(code)) this.pending.punch = true;
    });

    // ?demo plays itself (walk, combo, jump) so a headless screenshot catches Ward mid-move.
    this.demo = new URLSearchParams(location.search).has('demo');
    this.demoTick = 0;

    this.cameras.main.setBounds(0, 0, LOBBY_W, HEIGHT);
    this.camX = 0;
  }

  drawLobby(g) {
    // Back wall: two tones, recessed panels, and a seafoam fluorescent strip along the top.
    g.fillStyle(L.wall).fillRect(0, 0, LOBBY_W, FLOOR_TOP);
    g.fillStyle(L.wallLow).fillRect(0, FLOOR_TOP - 22, LOBBY_W, 22);
    g.fillStyle(P.seafoam).fillRect(0, 10, LOBBY_W, 2);
    g.fillStyle(P.seafoamDark).fillRect(0, 12, LOBBY_W, 1);
    for (let x = 0; x < LOBBY_W; x += 120) {
      g.fillStyle(L.panel).fillRect(x + 22, 30, 76, 90);
      g.fillStyle(L.pillar).fillRect(x, 16, 14, FLOOR_TOP - 16);
      g.fillStyle(L.pillarEdge).fillRect(x, 16, 2, FLOOR_TOP - 16);
    }
    // Amber wall lamps, so the scroll reads.
    for (let x = 60; x < LOBBY_W; x += 120) g.fillStyle(P.window).fillRect(x - 2, 40, 4, 6);

    // Reception desk in the middle screen, elevator doors on the far right.
    const deskX = WIDTH + 90;
    g.fillStyle(L.desk).fillRect(deskX, FLOOR_TOP - 34, 120, 34);
    g.fillStyle(L.deskTop).fillRect(deskX - 4, FLOOR_TOP - 38, 128, 5);
    g.fillStyle(P.brass).fillRect(deskX + 50, FLOOR_TOP - 24, 20, 3);
    for (const doorX of [LOBBY_W - 200, LOBBY_W - 110]) {
      g.fillStyle(P.brassDark).fillRect(doorX - 3, 52, 56, FLOOR_TOP - 52);
      g.fillStyle(L.door).fillRect(doorX, 56, 50, FLOOR_TOP - 56);
      g.fillStyle(L.doorGap).fillRect(doorX + 24, 56, 2, FLOOR_TOP - 56);
      g.fillStyle(P.window).fillRect(doorX + 21, 46, 8, 3);
    }

    // Floor band: stone with tile seams, darker toward the camera.
    g.fillStyle(L.floor).fillRect(0, FLOOR_TOP, LOBBY_W, HEIGHT - FLOOR_TOP);
    g.fillStyle(L.floorNear).fillRect(0, FLOOR_TOP + FLOOR_DEPTH + 4, LOBBY_W, HEIGHT);
    for (let y = FLOOR_TOP + 12; y < HEIGHT; y += 16) g.fillStyle(L.floorLine).fillRect(0, y, LOBBY_W, 1);
    for (let x = 0; x < LOBBY_W; x += 40) g.fillStyle(L.floorLine).fillRect(x, FLOOR_TOP, 1, HEIGHT - FLOOR_TOP);
  }

  readInput() {
    const held = (action) => this.keys[action].some((k) => k.isDown);
    const input = {
      left: held('left'),
      right: held('right'),
      up: held('up'),
      down: held('down'),
      jump: this.pending.jump,
      punch: this.pending.punch,
    };
    const pad = this.input.gamepad && this.input.gamepad.total ? this.input.gamepad.getPad(0) : null;
    if (pad) {
      const b = (i) => Boolean(pad.buttons[i] && pad.buttons[i].pressed);
      const ax = (i) => (pad.axes[i] ? pad.axes[i].getValue() : 0);
      input.left ||= b(14) || ax(0) < -0.4;
      input.right ||= b(15) || ax(0) > 0.4;
      input.up ||= b(12) || ax(1) < -0.4;
      input.down ||= b(13) || ax(1) > 0.4;
      const jump = b(0); // A / Cross
      const punch = b(2) || b(1); // X / Square, or B / Circle
      if (jump && !this.padPrev.jump) this.pending.jump = input.jump = true;
      if (punch && !this.padPrev.punch) this.pending.punch = input.punch = true;
      this.padPrev = { jump, punch };
    }
    if (this.demo) Object.assign(input, demoInput(this.demoTick++));
    return input;
  }

  update(time, delta) {
    const input = this.readInput();
    this.acc = Math.min(this.acc + delta, TICK_MS * 5);
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      for (const e of stepWard(this.ward, input, this.bounds)) this.onContact(e);
      // A press is spent on the first tick that sees it.
      input.jump = input.punch = false;
      this.pending.jump = this.pending.punch = false;
    }
    if (this.impact) {
      this.impact.ticks -= delta / TICK_MS;
      if (this.impact.ticks <= 0) this.impact = null;
    }

    this.camX = cameraX(this.camX, this.ward.x, WIDTH, LOBBY_W);
    this.cameras.main.scrollX = Math.round(this.camX);
    this.drawWard();
  }

  onContact(e) {
    const w = this.ward;
    this.impact = { x: w.x + w.facing * (WARD_W / 2 + e.reach), ticks: PUNCHES[e.punch].freeze + 3, big: e.punch === 'punch3' };
    if (e.punch === 'punch3') this.cameras.main.shake(110, 0.012);
  }

  drawWard() {
    const w = this.ward;
    const g = this.wardGfx.clear();
    const feetY = Math.round(FLOOR_TOP + w.z);
    const x = Math.round(w.x);
    const bob = w.state === 'walk' ? Math.floor(w.t / 6) % 2 : 0;
    const top = feetY - WARD_H - Math.round(w.y) - bob;
    const left = x - WARD_W / 2;

    // Shadow on the floor, shrinking as he rises.
    const sw = Math.max(8, 26 - Math.round(w.y / 3));
    g.fillStyle(L.shadow).fillEllipse(x, feetY, sw, 6);

    // The punching arm sits behind the body on wind-up, and far out in front on contact.
    let arm = null;
    if (isPunch(w.state)) {
      const phase = punchPhase(w.state, w.t) || 'recover';
      const reach = PUNCHES[w.state].reach;
      const len = { windup: -8, contact: reach, recover: Math.round(reach / 3) }[phase];
      arm = { len, phase, shoulderY: top + (w.state === 'punch2' ? 22 : 18) };
    }
    if (arm && arm.len < 0) this.drawArm(g, x, arm, w.facing);

    // Body: suit, shirt collar and head as flat boxes.
    const flash = arm && arm.phase === 'contact' && w.freeze > 0;
    g.fillStyle(flash ? L.suitEdge : L.suit).fillRect(left, top + 12, WARD_W, WARD_H - 12);
    g.fillStyle(L.suitEdge).fillRect(w.facing > 0 ? left + WARD_W - 2 : left, top + 12, 2, WARD_H - 12);
    g.fillStyle(L.shirt).fillRect(x - 3, top + 12, 6, 10);
    g.fillStyle(L.skin).fillRect(x - 6, top, 12, 12);
    g.fillStyle(P.outline).fillRect(x + w.facing * 3 - 1, top + 4, 2, 2);
    g.fillStyle(P.outline).fillRect(left + 3, feetY - Math.round(w.y) - bob - 3, WARD_W - 6, 3);

    if (arm && arm.len >= 0) this.drawArm(g, x, arm, w.facing);

    if (this.impact) {
      const r = this.impact.big ? 7 : 4;
      const iy = top + 20;
      g.fillStyle(L.flash).fillRect(this.impact.x - r, iy - 1, r * 2, 2);
      g.fillStyle(L.flash).fillRect(this.impact.x - 1, iy - r, 2, r * 2);
    }
  }

  drawArm(g, x, arm, facing) {
    const from = x + facing * (WARD_W / 2 - 4);
    const to = from + facing * (arm.len + 4);
    const lo = Math.min(from, to);
    g.fillStyle(L.suit).fillRect(lo, arm.shoulderY, Math.abs(to - from), 6);
    g.fillStyle(arm.phase === 'contact' ? L.fist : L.skin).fillRect(to - 3, arm.shoulderY - 1, 6, 8);
  }
}
