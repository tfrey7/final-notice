// The brawl lab's dial panel over the page: hidden until Tab or Select, driven by the pad (up and
// down pick a row, left and right turn it, jump presses a button) or by the mouse.
import { MAX_OF_KIND, nudge } from './dials.mjs';

const CSS = `
.lab-panel{position:fixed;top:8px;right:8px;width:22em;max-height:calc(100vh - 16px);overflow:auto;
  background:#111c;color:#ddd;font:11px/1.35 monospace;padding:6px 8px;z-index:10;border:1px solid #444}
.lab-panel h2{font-size:11px;margin:8px 0 2px;color:#aaa;font-weight:normal;text-transform:uppercase}
.lab-panel .hint{color:#888;margin-bottom:4px}
.lab-row{display:grid;grid-template-columns:10em 1fr 3.5em;gap:4px;align-items:center;padding:1px 3px}
.lab-row.sel{background:#fff2;outline:1px solid #888}
.lab-row.planned{color:#777}
.lab-row input{width:100%;margin:0}
.lab-row .n{text-align:right}
.lab-row.changed .n{color:#fd6}
.lab-btn{grid-column:1/-1;background:#333;color:#eee;border:1px solid #666;font:inherit;padding:2px}
.lab-panel textarea{width:100%;height:8em;background:#000;color:#bbb;font:10px monospace;border:1px solid #444;margin-top:4px}
.lab-flash{color:#8d8;min-height:1.2em}
`;

export function mountLabPanel({ dials, counts = {}, kinds = [], onRespawn, onCopy, onReset, respawnLabel = 'Respawn wave' }, doc = document) {
  const style = Object.assign(doc.createElement('style'), { textContent: CSS });
  const root = Object.assign(doc.createElement('div'), { className: 'lab-panel' });
  root.hidden = true;
  root.innerHTML = '<div class="hint">Tab / Select: back to the fight. Up/down pick, left/right turn, jump presses.</div>';
  const rows = [];
  let sel = 0;

  const section = (title) => root.append(Object.assign(doc.createElement('h2'), { textContent: title }));
  const row = (cls = '') => {
    const el = Object.assign(doc.createElement('div'), { className: `lab-row ${cls}` });
    root.append(el);
    return el;
  };
  const addRow = (el, turn = () => {}, press = () => {}, refresh = () => {}) => {
    const r = { el, turn, press, refresh };
    el.addEventListener('mouseenter', () => select(rows.indexOf(r)));
    rows.push(r);
    return r;
  };
  const button = (label, action) => {
    const el = row();
    const b = Object.assign(doc.createElement('button'), { className: 'lab-btn', textContent: label });
    b.addEventListener('click', action);
    el.append(b);
    addRow(el, () => {}, action);
  };

  if (kinds.length) section('Enemies');
  for (const kind of kinds) {
    const el = row();
    const n = Object.assign(doc.createElement('span'), { className: 'n' });
    const input = Object.assign(doc.createElement('input'), { type: 'range', min: 0, max: MAX_OF_KIND, step: 1 });
    input.addEventListener('input', () => { counts[kind] = Number(input.value); refresh(); });
    el.append(Object.assign(doc.createElement('span'), { textContent: kind }), input, n);
    addRow(el, (dir) => { counts[kind] = Math.min(MAX_OF_KIND, Math.max(0, counts[kind] + dir)); }, onRespawn, () => {
      input.value = counts[kind];
      n.textContent = counts[kind];
    });
  }
  button(respawnLabel, onRespawn);
  button('Copy settings', () => {
    const text = onCopy();
    area.value = text;
    area.hidden = false;
    const done = () => flash('Copied to the clipboard.');
    const fallback = () => { area.select(); try { doc.execCommand('copy'); done(); } catch { flash('Select the text below and copy it.'); } };
    if (globalThis.navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });
  button('Reset dials', onReset);
  const flashEl = Object.assign(doc.createElement('div'), { className: 'lab-flash' });
  const area = Object.assign(doc.createElement('textarea'), { readOnly: true });
  area.hidden = true;
  root.append(flashEl, area);
  const flash = (text) => { flashEl.textContent = text; };

  let group = null;
  for (const dial of dials) {
    if (dial.group !== group) {
      group = dial.group;
      section({ lab: 'Lab', moves: 'Stage 1 moves', weapons: 'Office weapons', planned: 'Planned (not wired yet)' }[group] ?? group);
    }
    const el = row(group === 'planned' ? 'planned' : '');
    const n = Object.assign(doc.createElement('span'), { className: 'n' });
    const input = Object.assign(doc.createElement('input'), { type: 'range', min: dial.min, max: dial.max, step: dial.step });
    input.addEventListener('input', () => { dial.value = Number(input.value); refresh(); });
    el.append(Object.assign(doc.createElement('span'), { textContent: dial.key, title: `${dial.min} to ${dial.max}` }), input, n);
    addRow(el, (dir) => nudge(dial, dir), () => {}, () => {
      input.value = dial.value;
      n.textContent = dial.value;
      el.classList.toggle('changed', dial.value !== dial.start);
    });
  }

  function select(i) {
    rows[sel]?.el.classList.remove('sel');
    sel = (i + rows.length) % rows.length;
    rows[sel].el.classList.add('sel');
    rows[sel].el.scrollIntoView?.({ block: 'nearest' });
  }
  function refresh() { rows.forEach((r) => r.refresh()); }

  doc.head.append(style);
  doc.body.append(root);
  select(0);
  refresh();

  return {
    get visible() { return !root.hidden; },
    toggle(show = root.hidden) {
      root.hidden = !show;
      if (!show) doc.activeElement?.blur?.();
      refresh();
    },
    move: (dir) => select(sel + dir),
    turn(dir) { rows[sel].turn(dir); refresh(); },
    press() { rows[sel].press(); refresh(); },
    refresh,
    flash,
    remove() { root.remove(); style.remove(); },
  };
}
