import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH } from '../src/snes/screen.mjs';
import { isRgb15 } from '../src/snes/color.mjs';
import { screen } from '../src/snes/fx.mjs';
import { cinemaPages } from '../src/story/cinema.mjs';
import { paintPicture, snesWrap } from '../src/snes/cinema.mjs';
import { BILL_FRAMES, LEDGER_SCROLL, actorAt, billStep, ledgerOffset, stageFrame, stagePages } from '../src/snes/staging.mjs';
import { SFX } from '../src/snes/audio/sfx.mjs';
import { STILLS } from '../src/snes/stills.mjs';

const scene1 = (who) => stagePages('assignment', cinemaPages('assignment', who, snesWrap), who);
const scene3 = (who) => stagePages('documents', cinemaPages('documents', who, snesWrap), who);

test('Scene 3 opens on 5 s of silence in the break room with only the buzz, then the script word for word', () => {
  const raw = cinemaPages('documents', 'mercer', snesWrap);
  const staged = scene3('mercer');
  const [sit] = staged;
  assert.ok(sit.acting);
  assert.equal(sit.frames, 300);
  assert.equal(sit.backdrop, 'break-room');
  assert.equal(sit.music, 'cut');
  assert.equal(sit.sound, 'buzz');
  assert.equal(sit.fx, 'table');
  assert.deepEqual(sit.actors.map((a) => [a.who, a.keys[0][3]]), [['mercer', 'sit']]);
  assert.deepEqual(staged.slice(1).map((p) => p.lines), raw.map((p) => p.lines));
  for (const name of ['buzz', 'phone', 'bassNote']) assert.ok(SFX[name], name);
});

test('Scene 3: ledger scroll, the speaker under a cut and a dim, the phone whole, a hard cut out', () => {
  const staged = scene3('ward');
  const beat = (n) => staged.filter((p) => p.beat === n);
  assert.equal(beat(0)[0].fx, 'ledgerScroll');
  assert.equal(beat(0)[0].music, 'scene');
  assert.equal(beat(1)[0].music, 'cut');
  assert.ok(beat(1).every((p) => p.fx === 'dim' && p.portrait === 'speaker'));
  assert.equal(beat(2)[0].music, 'pad');
  const phone = beat(3)[0];
  assert.deepEqual([phone.backdrop, phone.portrait, phone.music, phone.sound, phone.cut], ['bellwether-office', 'bellwether', 'scene', 'phone', false]);
  const last = staged.at(-1);
  assert.equal(last.portrait, null);
  assert.equal(last.cut, false);
  assert.ok(last.endCut && last.fadeAfter > 0);
  assert.equal(actorAt(last.actors[0].keys, 0).pose, 'sit');
  assert.equal(actorAt(last.actors[0].keys, 60).pose, 'hold');
  assert.equal(scene1('ward').at(-1).endCut, undefined);
});

test('the ledger page scrolls a pixel a frame and stops on ACCOUNT ZERO', () => {
  assert.equal(ledgerOffset(0), 0);
  assert.equal(ledgerOffset(40), 40);
  assert.equal(ledgerOffset(10_000), LEDGER_SCROLL);
  const page = scene3('ward').find((p) => p.fx === 'ledgerScroll');
  const top = stageFrame(paintPicture(screen(), page), page, 0);
  const foot = stageFrame(paintPicture(screen(), page), page, LEDGER_SCROLL);
  assert.ok(foot.every(isRgb15));
  const i = (y, x) => y * WIDTH + x;
  assert.deepEqual(foot.subarray(i(0, 0), i(144 - LEDGER_SCROLL, 0)), top.subarray(i(LEDGER_SCROLL, 0), i(144, 0)));
});

test('the speaker dims the picture by colour subtract and leaves the text box alone', () => {
  const page = scene3('ward').find((p) => p.fx === 'dim');
  const plain = paintPicture(screen(), page);
  const dim = stageFrame(paintPicture(screen(), page), page, 0);
  const i = (y, x) => y * WIDTH + x;
  assert.ok(dim[i(60, 20)] < plain[i(60, 20)]);
  assert.equal(dim[i(180, 20)], plain[i(180, 20)]);
});

test('Scene 1 opens on a wordless 4 s shot of Bellwether at his window, then the script word for word', () => {
  const raw = cinemaPages('assignment', 'ward', snesWrap);
  const staged = scene1('ward');
  assert.equal(staged.length, raw.length + 1);
  assert.ok(staged[0].acting);
  assert.equal(staged[0].frames, 240);
  assert.deepEqual(staged[0].lines, []);
  assert.equal(staged[0].still, 'window');
  assert.equal(staged[0].actors, null);
  assert.deepEqual(staged.slice(1).map((p) => p.lines), raw.map((p) => p.lines));
  assert.ok(staged.slice(1).every((p) => p.cut));
});

test('every Scene 1 page is a still of the named cast, the same for either partner', () => {
  for (const auditor of ['ward', 'mercer']) {
    const staged = scene1(auditor);
    assert.ok(staged.every((p) => STILLS[p.still] && !p.actors));
    assert.deepEqual([...new Set(staged.map((p) => p.still))], ['window', 'bill', 'partners', 'orders']);
  }
});

test('the music drops to the pad under the bill and comes back with the orders', () => {
  const staged = scene1('ward');
  const at = (text) => staged.find((p) => p.lines.join(' ').startsWith(text));
  assert.equal(at('He died on Tuesday.').music, 'pad');
  assert.equal(at('He died on Tuesday.').portrait, null);
  assert.equal(at('Serve him.').music, 'scene');
  const last = staged[staged.length - 1];
  assert.equal(last.portrait, null);
  assert.ok(last.fadeAfter > 0);
});

test('actors ease between keyframes and take the pose of the last key passed', () => {
  const keys = [[0, 100, 140, 'front'], [10, 200, 140, 'front'], [20, 200, 140, 'back']];
  assert.deepEqual(actorAt(keys, 0), { x: 100, feet: 140, pose: 'front' });
  assert.deepEqual(actorAt(keys, 5), { x: 150, feet: 140, pose: 'front' });
  assert.equal(actorAt(keys, 20).pose, 'back');
  assert.deepEqual(actorAt(keys, 99), { x: 200, feet: 140, pose: 'back' });
});

test('the bill slides toward the camera in 8 frames, growing', () => {
  assert.ok(billStep(0).w < billStep(BILL_FRAMES).w);
  assert.ok(billStep(0).x > billStep(BILL_FRAMES).x);
  assert.ok(!billStep(BILL_FRAMES - 1).done);
  assert.ok(billStep(BILL_FRAMES).done);
});

test('staged frames paint SNES colours; the lamp only brightens its own side', () => {
  const page = { ...scene1('ward')[1], still: null, portrait: null, backdrop: 'bellwether-office', fx: 'lamp' };
  const plain = paintPicture(screen(), page);
  const lit = stageFrame(paintPicture(screen(), page), page, 0);
  assert.ok(lit.every(isRgb15));
  const i = (y, x) => y * WIDTH + x;
  assert.notEqual(lit[i(96, 200)], plain[i(96, 200)]);
  assert.equal(lit[i(30, 40)], plain[i(30, 40)]);
  const acting = scene3('ward')[0];
  const empty = paintPicture(screen(), acting);
  const acted = stageFrame(paintPicture(screen(), acting), acting, 0);
  assert.ok(acted.some((c, k) => c !== empty[k]));
});
