// The pad for the active machine, driven by the keyboard and any gamepad: the NES pad
// (docs/NES-PLAN.md section 3) or, under `?snes`, the SNES pad (docs/SNES-PLAN.md section 4).
// The core is pure: feed it the buttons held this frame and it answers pressed, held and released.
import { platformFor } from './platform.mjs';

export const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'select', 'start'];

// KeyboardEvent.code, so the layout does not move the keys.
export const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'b', KeyJ: 'b',
  KeyX: 'a', KeyK: 'a',
  ShiftLeft: 'select', ShiftRight: 'select',
  Enter: 'start', NumpadEnter: 'start',
};

// The browser's standard gamepad layout: bottom face A, left face B, Back, Start, d-pad 12-15.
export const PAD_BUTTONS = { 0: 'a', 2: 'b', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

// Every pad speaks the stages' words: `a` jumps, `b` attacks or casts. The SNES pad's B and Y become
// those two, and its A, X, L and R arrive as the intents `chord`, `swap`, `step` and `aim`.
export const PADS = {
  nes: { name: 'nes', buttons: BUTTONS, keys: KEYS, padButtons: PAD_BUTTONS, game: {} },
  snes: {
    name: 'snes',
    buttons: ['up', 'down', 'left', 'right', 'b', 'a', 'y', 'x', 'l', 'r', 'select', 'start'],
    keys: {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      KeyZ: 'y', KeyJ: 'y',
      KeyX: 'b', KeyK: 'b',
      KeyC: 'a', KeyL: 'a',
      KeyV: 'x', KeyI: 'x',
      KeyQ: 'l', KeyE: 'r',
      ShiftLeft: 'select', ShiftRight: 'select',
      Enter: 'start', NumpadEnter: 'start',
    },
    // Standard layout: bottom B, right A, left Y, top X, shoulders and triggers L/R.
    padButtons: { 0: 'b', 1: 'a', 2: 'y', 3: 'x', 4: 'l', 5: 'r', 6: 'l', 7: 'r', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' },
    game: { b: 'a', y: 'b', a: 'injunction', x: 'swap' },
  },
};

export const padFor = (profile) => PADS[profile?.name] ?? PADS.nes;

export const STICK_DEAD = 0.5;

export const DOUBLE_TAP_FRAMES = 12;
// Y then X (or X then Y) this close together is the room clear; any slower is light then heavy.
export const CLEAR_FRAMES = 3;
export const HISTORY = 16;

export function createPad(layout = PADS.nes) {
  return { layout, frame: -1, held: new Set(), pressed: new Set(), released: new Set(), chord: false, dash: null, step: 0, aim: null, swap: false, taps: {}, history: [] };
}

// Advances the pad one frame. `down` is every button held now, named as on the pad's own machine.
export function updatePad(pad, down, frame = pad.frame + 1) {
  const layout = pad.layout ?? PADS.nes;
  const names = layout.buttons.map((b) => layout.game[b] ?? b);
  const now = new Set([...down].filter((b) => layout.buttons.includes(b)).map((b) => layout.game[b] ?? b));
  const pressed = new Set([...now].filter((b) => !pad.held.has(b)));
  const released = new Set([...pad.held].filter((b) => !now.has(b)));
  const history = [...pad.history, ...names.filter((b) => pressed.has(b))].slice(-HISTORY);
  const taps = { ...pad.taps };
  let dash = null;
  for (const dir of ['left', 'right']) {
    if (!pressed.has(dir)) continue;
    if (taps[dir] !== undefined && frame - taps[dir] <= DOUBLE_TAP_FRAMES) {
      dash = dir;
      delete taps[dir];
    } else {
      taps[dir] = frame;
    }
  }
  // Stage 1 on the SNES: Y light, X heavy, A the auditor's special, L the parry, R a sidestep back,
  // Y and X pressed within CLEAR_FRAMES of each other the room clear. Stage 2 still reads A as
  // `chord` and X as `swap`. The double tap is only a run.
  if (layout.name === 'snes') {
    const at = { ...pad.at };
    for (const b of ['b', 'swap']) if (pressed.has(b)) at[b] = frame;
    const fresh = (b) => now.has(b) && at[b] !== undefined && frame - at[b] <= CLEAR_FRAMES;
    const clear = (pressed.has('b') || pressed.has('swap')) && fresh('b') && fresh('swap');
    if (clear) { delete at.b; delete at.swap; }
    return {
      layout, frame, held: now, pressed, released, taps, history, dash: null, run: dash, at,
      chord: pressed.has('injunction'),
      clear,
      heavy: pressed.has('swap') && !clear,
      special: pressed.has('injunction'),
      step: pressed.has('r') ? -1 : 0,
      aim: now.has('r'),
      swap: pressed.has('swap'),
      parry: pressed.has('l'),
    };
  }
  const chord = now.has('a') && now.has('b') && (pressed.has('a') || pressed.has('b'));
  return { layout, frame, held: now, pressed, released, chord, dash, step: 0, aim: null, swap: pressed.has('select'), taps, history };
}

// True when the last presses spell `code`, e.g. a secret ['up', 'up', 'down', 'down'].
export function entered(pad, code) {
  return code.length > 0 && pad.history.slice(-code.length).join() === code.join();
}

export function keysToButtons(codes, layout = PADS.nes) {
  return new Set([...codes].map((c) => layout.keys[c]).filter(Boolean));
}

export function gamepadToButtons(gamepad, layout = PADS.nes) {
  const out = new Set();
  if (!gamepad) return out;
  gamepad.buttons.forEach((btn, i) => {
    if (layout.padButtons[i] && (btn.pressed || btn.value > 0.5)) out.add(layout.padButtons[i]);
  });
  const [x = 0, y = 0] = gamepad.axes;
  if (x < -STICK_DEAD) out.add('left');
  if (x > STICK_DEAD) out.add('right');
  if (y < -STICK_DEAD) out.add('up');
  if (y > STICK_DEAD) out.add('down');
  return out;
}

// A scripted run for `?demo`: steps of { at, hold, buttons } in frames. Answers what is held at `frame`.
export function scriptedButtons(script, frame) {
  const out = new Set();
  for (const step of script) {
    if (frame >= step.at && frame < step.at + (step.hold ?? 4)) for (const b of step.buttons) out.add(b);
  }
  return out;
}

// The default demo presses Start every 90 frames, which pages through the title, select and scenes.
export const DEMO_SCRIPT = Array.from({ length: 40 }, (_, i) => ({ at: 60 + i * 90, buttons: ['start'] }));

let live = null;

// The page's one pad. Poll once a frame; a second poll in the same frame answers the same pad.
export function pollPad(frame) {
  if (!live) live = startLivePad();
  if (live.pad.frame !== frame) {
    const { layout } = live.pad;
    const down = live.script ? scriptedButtons(live.script, frame - live.startFrame) : keysToButtons(live.keys, layout);
    if (!live.script && typeof navigator !== 'undefined' && navigator.getGamepads) {
      for (const gp of navigator.getGamepads()) for (const b of gamepadToButtons(gp, layout)) down.add(b);
    }
    live.pad = updatePad(live.pad, down, frame);
  }
  return live.pad;
}

function startLivePad() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const layout = padFor(platformFor(params));
  const state = { pad: createPad(layout), keys: new Set(), script: null, startFrame: 0 };
  if (typeof window === 'undefined') return state;
  if (params.has('demo')) state.script = window.finalNoticeDemo ?? DEMO_SCRIPT;
  window.addEventListener('keydown', (e) => {
    if (!layout.keys[e.code]) return;
    state.keys.add(e.code);
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  window.addEventListener('blur', () => state.keys.clear());
  return state;
}
