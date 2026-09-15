import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { isRgb15 } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { cinemaPages } from '../src/story/cinema.mjs';
import { SPIN_FRAMES, paintPicture, snesWrap } from '../src/snes/cinema.mjs';
import { MOSAIC_OUT_FRAMES, actorAt, hudLevel, mosaicOutStep, stageFrame, stagePages } from '../src/snes/staging.mjs';

const scene2 = (who) => stagePages('incident', cinemaPages('incident', who, snesWrap), who);
const said = (pages, text) => pages.find((p) => p.lines.join(' ').startsWith(text));
const i = (y, x) => y * WIDTH + x;

test('Scene 2 follows the fight with no cut: HUD fading, Vellum slumped, the auditor walking up', () => {
  const [open] = scene2('mercer');
  assert.ok(open.acting && open.fromPlay);
  assert.equal(open.music, 'cut');
  assert.equal(open.backdrop, 'vellum-desk');
  assert.deepEqual(open.actors.map((a) => a.who), ['vellum', 'mercer']);
  const [vellum, auditor] = open.actors.map((a) => a.keys);
  assert.equal(actorAt(vellum, 0).pose, 'slump');
  assert.equal(actorAt(vellum, 197).pose, 'tie');
  assert.equal(actorAt(vellum, open.frames - 1).pose, 'front');
  assert.ok(actorAt(auditor, open.frames).x < actorAt(auditor, 0).x);
  assert.equal(hudLevel(0, open.hud), 15);
  assert.equal(hudLevel(open.hud, open.hud), 0);
  const withHud = stageFrame(paintPicture(screen(), open), open, 0);
  const faded = stageFrame(paintPicture(screen(), open), open, open.hud);
  assert.ok(withHud.every(isRgb15));
  assert.notDeepEqual(withHud.subarray(0, WIDTH * 32), faded.subarray(0, WIDTH * 32));
});

test('the script is spoken word for word, the music stopping just before "What incident?"', () => {
  const raw = cinemaPages('incident', 'ward', snesWrap);
  const staged = scene2('ward');
  assert.deepEqual(staged.filter((p) => p.lines.length).map((p) => p.lines), raw.map((p) => p.lines));
  assert.equal(said(staged, 'The original records').music, 'scene');
  assert.equal(said(staged, 'What incident?').music, 'cut');
  assert.equal(staged.filter((p) => p.music === 'cut').length, 2);
});

test('the RETENTION button insert, then 12 silent frames and the Mode 7 spin with no text box', () => {
  const staged = scene2('ward');
  const button = said(staged, 'This one.');
  assert.equal(button.backdrop, 'archive-button');
  assert.equal(button.sound, 'click');
  const spin = staged[staged.indexOf(button) + 1];
  assert.ok(spin.acting);
  assert.deepEqual(spin.lines, []);
  assert.equal(spin.spinAt, 12);
  assert.ok(spin.frames >= 12 + SPIN_FRAMES);
  assert.ok(!staged.some((p) => p.sound === 'alarm'));
});

test('the ledger glows through the grille by colour add, only inside the grille window', () => {
  const page = said(scene2('ward'), 'The original is downstairs.');
  assert.equal(page.fx, 'ledger');
  assert.equal(page.portrait, null);
  const plain = paintPicture(screen(), page);
  const lit = stageFrame(paintPicture(screen(), page), page, 0);
  assert.ok(lit.every(isRgb15));
  assert.notEqual(lit[i(75, 128)], plain[i(75, 128)]);
  assert.equal(lit[i(75, 20)], plain[i(75, 20)]);
});

test('Bellwether on the radio crackles at each page, and the scene leaves by mosaic', () => {
  const staged = scene2('ward');
  const radio = staged.filter((p) => p.speaker === 'bellwether');
  assert.ok(radio.length > 0);
  assert.ok(radio.every((p) => p.portrait === 'radio' && p.backdrop === 'break-room' && p.sound === 'click'));
  const last = staged.at(-1);
  assert.ok(last.mosaicOut && last.fadeAfter > 0);
  assert.equal(mosaicOutStep(0).mosaic, 1);
  assert.ok(mosaicOutStep(10).mosaic > 1);
  assert.ok(!mosaicOutStep(MOSAIC_OUT_FRAMES - 1).done);
  assert.deepEqual(mosaicOutStep(MOSAIC_OUT_FRAMES), { mosaic: 16, done: true });
});
