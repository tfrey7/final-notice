// Which key does what under ?snes: the pad owns every key it maps, and the page's own shortcuts
// (display mode, the labs' dial panel) live on keys no pad uses. controlsFor answers the compact
// list the pause screen and the labs show; mountControls draws it over the page.
import { PADS } from './input.mjs';

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
  stage1: { y: 'light, grab', b: 'jump', a: 'special', x: 'heavy', yx: 'Injunction', l: 'Objection parry', r: 'sidestep back', start: 'pause' },
  stage2: { y: 'cast', b: 'jump', a: 'Injunction', x: 'swap enchantment', l: '—', r: 'hold: stand and aim', start: 'pause' },
};

// Rows of { pad, keys, gamepad, does } for 'stage1' or 'stage2'.
export function controlsFor(stage) {
  const does = DOES[stage] ?? DOES.stage1;
  return [
    { pad: 'D-pad', keys: 'arrows / WASD', gamepad: 'd-pad / stick', does: 'walk; double tap: run' },
    ...['y', 'b', 'a', 'x'].map((b) => ({ pad: b.toUpperCase(), keys: keysFor(b), gamepad: PAD[b], does: does[b] })),
    ...(stage === 'stage2'
      ? [{ pad: 'L / R', keys: `${keysFor('l')} / ${keysFor('r')}`, gamepad: 'shoulders', does: does.r }]
      : [
        { pad: 'Y+X', keys: `${keysFor('y')} + ${keysFor('x')}`, gamepad: 'left + top together', does: does.yx },
        { pad: 'L', keys: keysFor('l'), gamepad: 'LB / LT', does: does.l },
        { pad: 'R', keys: keysFor('r'), gamepad: 'RB / RT', does: does.r },
      ]),
    { pad: 'Start', keys: keysFor('start'), gamepad: PAD.start, does: does.start },
  ];
}

const CSS = `
.controls-card{position:fixed;left:8px;bottom:8px;background:#111d;color:#ccc;font:10px/1.3 monospace;
  padding:4px 6px;z-index:9;border:1px solid #444;pointer-events:none}
.controls-card td{padding:0 6px 0 0;white-space:nowrap}
.controls-card td:first-child{color:#fd6}
.controls-card .foot{color:#888;margin-top:2px}
`;

export function mountControls(stage, doc = document) {
  const style = Object.assign(doc.createElement('style'), { textContent: CSS });
  const root = Object.assign(doc.createElement('div'), { className: 'controls-card' });
  const table = doc.createElement('table');
  for (const r of controlsFor(stage)) {
    const tr = doc.createElement('tr');
    for (const v of [r.pad, r.keys, r.gamepad, r.does]) tr.append(Object.assign(doc.createElement('td'), { textContent: v }));
    table.append(tr);
  }
  root.append(table, Object.assign(doc.createElement('div'), { className: 'foot', textContent: '` or F2: display mode' }));
  root.hidden = true;
  doc.head.append(style);
  doc.body.append(root);
  return {
    show(on = true) { root.hidden = !on; },
    remove() { root.remove(); style.remove(); },
  };
}
