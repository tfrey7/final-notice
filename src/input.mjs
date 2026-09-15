// One NES pad, driven by the keyboard and any gamepad (docs/NES-PLAN.md section 3).
// The core is pure: feed it the buttons held this frame and it answers pressed, held and released.

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
export const STICK_DEAD = 0.5;

export const DOUBLE_TAP_FRAMES = 12;
export const HISTORY = 16;

export function createPad() {
  return { frame: -1, held: new Set(), pressed: new Set(), released: new Set(), chord: false, dash: null, taps: {}, history: [] };
}

// Advances the pad one frame. `down` is every button held now.
export function updatePad(pad, down, frame = pad.frame + 1) {
  const now = new Set([...down].filter((b) => BUTTONS.includes(b)));
  const pressed = new Set([...now].filter((b) => !pad.held.has(b)));
  const released = new Set([...pad.held].filter((b) => !now.has(b)));
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
  const history = [...pad.history, ...BUTTONS.filter((b) => pressed.has(b))].slice(-HISTORY);
  const chord = now.has('a') && now.has('b') && (pressed.has('a') || pressed.has('b'));
  return { frame, held: now, pressed, released, chord, dash, taps, history };
}

// True when the last presses spell `code`, e.g. a secret ['up', 'up', 'down', 'down'].
export function entered(pad, code) {
  return code.length > 0 && pad.history.slice(-code.length).join() === code.join();
}

export function keysToButtons(codes) {
  return new Set([...codes].map((c) => KEYS[c]).filter(Boolean));
}

export function gamepadToButtons(gamepad) {
  const out = new Set();
  if (!gamepad) return out;
  gamepad.buttons.forEach((btn, i) => {
    if (PAD_BUTTONS[i] && (btn.pressed || btn.value > 0.5)) out.add(PAD_BUTTONS[i]);
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

// The default demo presses Start every 90 frames, which walks the placeholder flow on its own.
export const DEMO_SCRIPT = Array.from({ length: 40 }, (_, i) => ({ at: 60 + i * 90, buttons: ['start'] }));

let live = null;

// The page's one pad. Poll once a frame; a second poll in the same frame answers the same pad.
export function pollPad(frame) {
  if (!live) live = startLivePad();
  if (live.pad.frame !== frame) {
    const down = live.script ? scriptedButtons(live.script, frame - live.startFrame) : keysToButtons(live.keys);
    if (!live.script && typeof navigator !== 'undefined' && navigator.getGamepads) {
      for (const gp of navigator.getGamepads()) for (const b of gamepadToButtons(gp)) down.add(b);
    }
    live.pad = updatePad(live.pad, down, frame);
  }
  return live.pad;
}

function startLivePad() {
  const state = { pad: createPad(), keys: new Set(), script: null, startFrame: 0 };
  if (typeof window === 'undefined') return state;
  if (new URLSearchParams(window.location.search).has('demo')) {
    state.script = window.finalNoticeDemo ?? DEMO_SCRIPT;
  }
  window.addEventListener('keydown', (e) => {
    if (!KEYS[e.code]) return;
    state.keys.add(e.code);
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  window.addEventListener('blur', () => state.keys.clear());
  return state;
}
