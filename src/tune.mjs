// Every feel number lives in a named table registered here, so `?tune` can put a slider on each one.
// Tables are plain objects the game reads every frame: changing a value changes play immediately.

const TABLES = new Map();

export function registerTuning(name, table, ranges = {}) {
  TABLES.set(name, { table, ranges, defaults: { ...table } });
  return table;
}

export const tuningTables = () => [...TABLES].map(([name, entry]) => ({ name, ...entry }));

export function resetTuning(name) {
  const entry = TABLES.get(name);
  if (entry) Object.assign(entry.table, entry.defaults);
}

// [min, max, step] for a slider when the table gives none: chances run 0-1, counts are whole numbers.
export function sliderRange(key, value, ranges = {}) {
  if (ranges[key]) return ranges[key];
  if (/Chance|At$/.test(key)) return [0, 1, 0.01];
  if (Number.isInteger(value)) return [0, Math.max(4, value * 3), 1];
  return [0, Math.max(1, value * 4), 0.05];
}

// The live slider panel over the running page. Needs a DOM; the pure parts above do not.
export function mountTunePanel(doc = document) {
  const panel = doc.createElement('details');
  panel.open = true;
  panel.style.cssText =
    'position:fixed;top:8px;right:8px;max-height:calc(100vh - 16px);overflow:auto;background:#000c;color:#fff;' +
    'font:11px monospace;padding:6px 8px;z-index:10;border:1px solid #555';
  panel.innerHTML = '<summary>TUNE</summary>';
  for (const { name, table, ranges } of tuningTables()) {
    const head = doc.createElement('div');
    head.textContent = name;
    head.style.cssText = 'margin-top:6px;color:#fc0';
    panel.append(head);
    for (const [key, value] of Object.entries(table)) {
      if (typeof value !== 'number') continue;
      const [min, max, step] = sliderRange(key, value, ranges);
      const row = doc.createElement('label');
      row.style.cssText = 'display:grid;grid-template-columns:9em 8em 3.5em;gap:4px;align-items:center';
      const out = doc.createElement('span');
      out.textContent = value;
      const input = Object.assign(doc.createElement('input'), { type: 'range', min, max, step, value });
      input.addEventListener('input', () => {
        table[key] = Number(input.value);
        out.textContent = input.value;
      });
      row.append(Object.assign(doc.createElement('span'), { textContent: key }), input, out);
      panel.append(row);
    }
  }
  doc.body.append(panel);
  return panel;
}
