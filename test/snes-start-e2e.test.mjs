// A cold load of ?snes, played with real Enter presses from the title into Stage 1 in headless Chrome.
// Runs only in the full suite (FINAL_NOTICE_FULL=1, as the fleet's CI and landing run it through
// fleet.json). Skips where no Chrome is installed; FINAL_NOTICE_CHROME points at one anywhere else.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STALL_MS = 8000;
const TOTAL_MS = 90000;

const CHROMES = [
  process.env.FINAL_NOTICE_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = CHROMES.find((p) => existsSync(p));

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    const file = path.endsWith(sep) ? join(path, 'index.html') : path;
    if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('the SNES art list names exactly the modules in src/snes/art', async () => {
  const { ART_MODULES } = await import('../src/snes/art.mjs');
  const files = readdirSync(join(ROOT, 'src/snes/art')).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4));
  assert.deepEqual([...ART_MODULES].sort(), files.sort());
});

async function devtools(profile) {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(50);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { send, on: (fn) => listeners.push(fn), close: () => ws.close() };
}

test('?snes from a cold load: Enter on every screen reaches Stage 1 with no stall or error', { skip: process.env.FINAL_NOTICE_FULL !== '1' ? 'full suite only: FINAL_NOTICE_FULL=1' : !chrome && 'no Chrome here', timeout: TOTAL_MS + 30000 }, async () => {
  const server = await serve();
  const profile = mkdtempSync(join(tmpdir(), 'fn-e2e-'));
  const browser = spawn(chrome, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1200,900', 'about:blank',
  ], { stdio: 'ignore' });
  let cdp;
  try {
    cdp = await devtools(profile);
    const errors = [];
    cdp.on(({ method, params }) => {
      if (method === 'Runtime.exceptionThrown') errors.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') errors.push(params.args.map((a) => a.value ?? a.description).join(' '));
      if (method === 'Log.entryAdded' && params.entry.level === 'error' && !params.entry.url?.endsWith('/favicon.ico')) errors.push(`${params.entry.text} ${params.entry.url ?? ''}`);
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/?snes` });

    const evaluate = async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;
    // A skipped cinema can come and go between two 250 ms polls, so the page itself notes every screen.
    const RECORD = `(() => {
      const keys = () => window.finalNotice?.scene?.getScenes(true).map((s) => s.sys.settings.key).join(",") ?? "";
      window.screensSeen ??= [];
      window.screensRecorder ??= setInterval(() => { const k = keys(); if (k !== window.screensSeen.at(-1)) window.screensSeen.push(k); }, 4);
      return keys();
    })()`;
    const active = () => evaluate(RECORD);
    const press = async () => {
      for (const type of ['keyDown', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
        await sleep(40);
      }
    };

    const seen = [];
    let since = Date.now();
    const began = Date.now();
    for (;;) {
      const now = await active();
      if (now !== seen.at(-1)) { seen.push(now); since = Date.now(); }
      if (now.split(',').includes('stage1')) break;
      assert.deepEqual(errors, [], `page errors on the way (screens: ${seen.join(' > ')})`);
      assert.ok(Date.now() - since < STALL_MS, `stalled on "${now}" for ${STALL_MS} ms (screens: ${seen.join(' > ')})`);
      assert.ok(Date.now() - began < TOTAL_MS, `no Stage 1 after ${TOTAL_MS} ms (screens: ${seen.join(' > ')})`);
      if (now) await press();
      await sleep(250);
    }
    await sleep(1500);
    // FINAL_NOTICE_E2E_SHOT=<png> keeps a picture of the Stage 1 the run reached.
    if (process.env.FINAL_NOTICE_E2E_SHOT) {
      const { data } = (await cdp.send('Page.captureScreenshot', { format: 'png' })).result;
      writeFileSync(process.env.FINAL_NOTICE_E2E_SHOT, Buffer.from(data, 'base64'));
    }
    assert.deepEqual(errors, [], `page errors in Stage 1 (screens: ${seen.join(' > ')})`);
    seen.push(...(await evaluate('window.screensSeen')));
    for (const screen of ['title', 'select', 'scene1', 'stage1']) {
      assert.ok(seen.some((s) => s.split(',').includes(screen)), `never showed ${screen} (screens: ${seen.join(' > ')})`);
    }
  } finally {
    cdp?.close();
    const exited = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    server.close();
    await Promise.race([exited, sleep(3000)]);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* Chrome's helpers can hold the profile a moment longer */ }
  }
});
