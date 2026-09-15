// Slow audio renders skip locally when nothing they read has changed since they last passed. Each test
// file keeps a committed table beside it (<name>.clean.json) of render key -> hash of every module the
// render imports, followed transitively, plus the test file itself. FINAL_NOTICE_FULL=1, which the
// fleet's CI and landing run through fleet.json, renders everything and writes nothing.
import { after } from 'node:test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FULL = process.env.FINAL_NOTICE_FULL === '1';

const ROOT = new URL('..', import.meta.url).href;
const IMPORT = /(?:^|[\s;])(?:import|export)\b[^'"`;]*?\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]|\bimport\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g;
const bytes = new Map();

function source(url) {
  if (!bytes.has(url)) bytes.set(url, readFileSync(new URL(url)).toString('utf8').replace(/\r\n/g, '\n'));
  return bytes.get(url);
}

export function closureHash(entries) {
  const seen = new Set();
  const todo = entries.map((u) => String(u));
  while (todo.length) {
    const url = todo.pop();
    if (seen.has(url) || !existsSync(new URL(url))) continue;
    seen.add(url);
    for (const m of source(url).matchAll(IMPORT)) todo.push(new URL(m[1] ?? m[2], url).href);
  }
  const hash = createHash('sha256');
  for (const url of [...seen].sort()) hash.update(`${url.replace(ROOT, '')}\n${source(url)}\n`);
  return hash.digest('hex').slice(0, 16);
}

export function cleanRenders(testUrl) {
  const path = fileURLToPath(testUrl).replace(/\.test\.mjs$/, '.clean.json');
  const table = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const passed = {};
  after(() => {
    if (FULL || !Object.keys(passed).length) return;
    const next = { ...table, ...passed };
    const text = `${JSON.stringify(Object.fromEntries(Object.keys(next).sort().map((k) => [k, next[k]])), null, 2)}\n`;
    if (!existsSync(path) || readFileSync(path, 'utf8') !== text) writeFileSync(path, text);
  });
  return {
    // The hash when this render must run, or null when it passed on exactly these sources before.
    due(key, entries) {
      const hash = closureHash([testUrl, ...entries]);
      return FULL || table[key] !== hash ? hash : null;
    },
    passed(key, hash) {
      passed[key] = hash;
    },
  };
}
