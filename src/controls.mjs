// Which key does what under ?snes: the pad owns every key it maps, and the page's own shortcuts
// (display mode, the labs' dial panel) live on keys no pad uses. controlsFor answers the compact
// list; legendFor labels the SNES controller mountControls draws in the corner, in keyboard keys or
// gamepad buttons, whichever the player touched last.
import { PADS, STICK_DEAD } from './input.mjs';

// KeyboardEvent.code of every page shortcut outside the pads.
export const SHORTCUTS = { Backquote: 'display', F2: 'display', Tab: 'dials', KeyH: 'boxes', KeyG: 'lines', KeyM: 'routes' };

export const isShortcut = (code, action) => SHORTCUTS[code] === action;

const KEY_NAMES = { Backquote: '`', ShiftLeft: 'Shift', ShiftRight: 'Shift', NumpadEnter: null };
const keyName = (code) => (code in KEY_NAMES ? KEY_NAMES[code] : code.replace(/^Key|^Arrow/, ''));

// The keyboard keys for one SNES pad button, e.g. 'x' -> 'V / I'.
export function keysFor(button, layout = PADS.snes) {
  const names = Object.entries(layout.keys).filter(([, b]) => b === button).map(([code]) => keyName(code)).filter(Boolean);
  return [...new Set(names)].join(' / ');
}

const PAD = { y: 'X / left', b: 'A / bottom', a: 'B / right', x: 'Y / top', l: 'LB / LT', r: 'RB / RT', start: 'Start' };
const DOES = {
  stage1: { y: 'light, grab', b: 'jump', a: 'special', x: 'heavy', yx: 'Injunction', l: 'block (Ward) / parry (Mercer)', r: 'sidestep back', start: 'pause' },
  stage2: { y: 'cast', b: 'jump', a: 'Injunction', x: 'swap enchantment', l: 'Objection parry (boss)', r: 'hold: stand and aim', start: 'pause' },
};

// Rows of { pad, keys, gamepad, does } for 'stage1' or 'stage2'.
export function controlsFor(stage) {
  const does = DOES[stage] ?? DOES.stage1;
  return [
    { pad: 'D-pad', keys: 'arrows / WASD', gamepad: 'd-pad / stick', does: 'walk; double tap: run' },
    ...['y', 'b', 'a', 'x'].map((b) => ({ pad: b.toUpperCase(), keys: keysFor(b), gamepad: PAD[b], does: does[b] })),
    ...(stage === 'stage2'
      ? [{ pad: 'L / R', keys: `${keysFor('l')} / ${keysFor('r')}`, gamepad: 'shoulders', does: `${does.l} / ${does.r}` }]
      : [
        { pad: 'Y+X', keys: `${keysFor('y')} + ${keysFor('x')}`, gamepad: 'left + top together', does: does.yx },
        { pad: 'L', keys: keysFor('l'), gamepad: 'LB / LT', does: does.l },
        { pad: 'R', keys: keysFor('r'), gamepad: 'RB / RT', does: does.r },
      ]),
    { pad: 'Start', keys: keysFor('start'), gamepad: PAD.start, does: does.start },
  ];
}

// A standard gamepad's name for each SNES button: its face positions swap letters with Nintendo's.
const GAMEPAD = { y: 'X', x: 'Y', b: 'A', a: 'B', l: 'LB', r: 'RB', start: 'START', select: 'BACK', dpad: 'D-PAD' };
const firstKey = (b) => keysFor(b).split(' / ')[0];

// { button: { label, key, alt, does } } for the controller legend, labelled for 'keyboard' or
// 'gamepad': key is what is drawn inside the button, alt the other keys that do the same.
export function legendFor(stage, device = 'keyboard') {
  const does = DOES[stage] ?? DOES.stage1;
  const pad = device === 'gamepad';
  const entry = (b) => {
    const [key, ...alt] = pad ? [GAMEPAD[b]] : keysFor(b).split(' / ');
    return { label: pad ? GAMEPAD[b] : keysFor(b).replace(/ \/ /g, '/'), key, alt: alt.join('/'), does: does[b] };
  };
  const out = {
    dpad: { label: pad ? GAMEPAD.dpad : 'WASD', key: pad ? '' : 'WASD', alt: pad ? '' : 'arrows', does: 'walk, 2x run' },
    ...Object.fromEntries(['y', 'x', 'b', 'a', 'l', 'r', 'start'].map((b) => [b, entry(b)])),
  };
  if (does.yx) out.yx = { label: pad ? `${GAMEPAD.y}+${GAMEPAD.x}` : `${firstKey('y')}+${firstKey('x')}`, does: does.yx };
  return out;
}

// The device the legend should speak for after one input: any live gamepad button or stick wins,
// then any key, else it stays as it was.
export function deviceAfter(prev, { key = null, gamepads = [] } = {}) {
  const live = (gp) => gp && (gp.buttons.some((b) => b.pressed || b.value > 0.5) || gp.axes.some((a) => Math.abs(a) > STICK_DEAD));
  if ([...gamepads].some(live)) return 'gamepad';
  if (key) return 'keyboard';
  return prev;
}

// Super Famicom face colours, and a lighter tint of each for its label on the dark card.
const FACE = { x: ['#2c4cc8', '#8aa4ff'], a: ['#d0302c', '#ff8a80'], b: ['#e0b820', '#ffe070'], y: ['#2c9c48', '#80e090'] };
const U = 2;
const W = 280;
const H = 110;
const NS = 'http://www.w3.org/2000/svg';

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
// A circle stepped into U-sized rows, so it reads as pixels at any zoom.
function disc(cx, cy, r, fill) {
  let out = '';
  for (let dy = -r; dy < r; dy += U) {
    const mid = dy + U / 2;
    const half = Math.round(Math.sqrt(Math.max(0, r * r - mid * mid)) / U) * U;
    if (half > 0) out += rect(cx - half, cy + dy, half * 2, U, fill);
  }
  return out;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The controller body and its labels as one SVG string. Every button carries the key or gamepad
// button that presses it; the words beside it say what it does, in the button's own colour.
export function controllerSvg(stage, device = 'keyboard') {
  const g = legendFor(stage, device);
  const [lx, rx, cy] = [104, 176, 56];
  const face = { x: [rx, cy - 11], a: [rx + 11, cy], b: [rx, cy + 11], y: [rx - 11, cy] };
  const inside = (x, y, s, fill, b) => `<text x="${x}" y="${y}" fill="${fill}" text-anchor="middle" data-face="${b}">${esc(s)}</text>`;
  let body = rect(lx - 20, cy - 34, 40, 12, '#44444c') + rect(rx - 20, cy - 34, 40, 12, '#44444c');
  body += rect(lx - 18, cy - 32, 36, 10, '#8c8c96') + rect(rx - 18, cy - 32, 36, 10, '#8c8c96');
  body += disc(lx, cy, 26, '#44444c') + disc(rx, cy, 26, '#44444c') + rect(lx, cy - 22, rx - lx, 44, '#44444c');
  body += disc(lx, cy, 24, '#c4c4cc') + disc(rx, cy, 24, '#c4c4cc') + rect(lx, cy - 20, rx - lx, 40, '#c4c4cc');
  body += disc(rx, cy, 20, '#a8a0b8');
  body += rect(lx - 12, cy - 4, 24, 8, '#2a2a30') + rect(lx - 4, cy - 12, 8, 24, '#2a2a30');
  body += rect(132, cy + 4, 8, 4, '#6c6c74') + rect(144, cy + 4, 8, 4, '#6c6c74');
  for (const [b, [x, y]] of Object.entries(face)) body += disc(x, y, 6, '#2a2a30') + disc(x, y, 5, FACE[b][0]);
  for (const [b, [x, y]] of Object.entries(face)) body += inside(x, y + 2.5, g[b].key, '#fff', b);
  body += inside(lx, cy - 27, g.l.key, '#1a1a20', 'l') + inside(rx, cy - 27, g.r.key, '#1a1a20', 'r');
  if (g.dpad.key) {
    for (const [k, x, y] of [['W', lx, cy - 5.5], ['S', lx, cy + 10.5], ['A', lx - 8, cy + 2.5], ['D', lx + 8, cy + 2.5]]) body += inside(x, y, k, '#c4c4cc', 'dpad');
  }

  const row = (x, y, b, anchor, tint = '#ddd', withAlt = true) => {
    const { does, alt } = g[b];
    const or = alt && withAlt ? ` <tspan fill="#888">or ${esc(alt)}</tspan>` : '';
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" data-button="${b}"><tspan fill="${tint}">${esc(does)}</tspan>${or}</text>`;
  };
  // Start and the Y+X chord have no single button to letter, so their rows keep the key.
  const keyed = (x, y, b, anchor) => {
    const { label, does } = g[b];
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" data-button="${b}"><tspan fill="#fd6">${esc(label)}</tspan> <tspan fill="#ddd">${esc(does)}</tspan></text>`;
  };
  let labels = row(6, 24, 'l', 'start') + row(W - 6, 24, 'r', 'end');
  labels += row(lx - 30, cy - 2, 'dpad', 'end', '#ddd', false);
  if (g.dpad.alt) labels += `<text x="${lx - 30}" y="${cy + 9}" text-anchor="end" fill="#888">or ${esc(g.dpad.alt)}</text>`;
  labels += row(rx + 30, cy - 18, 'x', 'start', FACE.x[1]) + row(rx + 30, cy - 6, 'y', 'start', FACE.y[1]);
  labels += row(rx + 30, cy + 6, 'a', 'start', FACE.a[1]) + row(rx + 30, cy + 18, 'b', 'start', FACE.b[1]);
  labels += keyed(140, cy + 42, 'start', 'middle');
  if (g.yx) labels += keyed(140, cy + 52, 'yx', 'middle');
  return `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}" shape-rendering="crispEdges">${body}${labels}</svg>`;
}

const CSS = `
.controls-card{position:fixed;left:8px;bottom:8px;background:#101018e6;z-index:9;border:2px solid #44444c;
  pointer-events:none;line-height:0;image-rendering:pixelated}
.controls-card svg{display:block;font:bold 7px monospace;letter-spacing:0}
.controls-card .foot{font:10px/1.3 monospace;color:#888;padding:0 6px 3px}
`;

export function mountControls(stage, doc = document) {
  const win = doc.defaultView ?? globalThis;
  const style = Object.assign(doc.createElement('style'), { textContent: CSS });
  const root = Object.assign(doc.createElement('div'), { className: 'controls-card' });
  const art = doc.createElement('div');
  const foot = Object.assign(doc.createElement('div'), { className: 'foot', textContent: '` or F2: display mode' });
  root.append(art, foot);
  let device = new URLSearchParams(win.location?.search ?? '').get('controls') === 'gamepad' ? 'gamepad' : 'keyboard';
  const draw = () => { art.innerHTML = controllerSvg(stage, device); root.dataset.device = device; };
  const switchTo = (next) => { if (next !== device) { device = next; draw(); } };
  const onKey = (e) => switchTo(deviceAfter(device, { key: e.code }));
  let raf = 0;
  const poll = () => {
    if (win.navigator?.getGamepads) switchTo(deviceAfter(device, { gamepads: win.navigator.getGamepads() }));
    raf = win.requestAnimationFrame?.(poll) ?? 0;
  };
  draw();
  win.addEventListener?.('keydown', onKey, true);
  poll();
  root.hidden = true;
  doc.head.append(style);
  doc.body.append(root);
  return {
    show(on = true) { root.hidden = !on; },
    remove() {
      win.removeEventListener?.('keydown', onKey, true);
      win.cancelAnimationFrame?.(raf);
      root.remove(); style.remove();
    },
  };
}
