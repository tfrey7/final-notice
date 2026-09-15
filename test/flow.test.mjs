import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER, SCREENS, SONGS, CHECKPOINTS, LIVES, CONTINUES, STAGE_CARDS, RUN_STAGES, isStage, newGame, jumpTo, next, sceneFor, stageSelectUrl } from '../src/flow.mjs';
import { LEAVE, climbFlow } from '../src/snes/runflow.mjs';
import { createPad, updatePad, PADS } from '../src/input.mjs';

const play = (state, ...events) => events.reduce((s, e) => next(s, typeof e === 'string' ? { type: e } : e), state);

test('start walks the whole order and the ending goes back to the title', () => {
  let s = newGame();
  const seen = [s.screen];
  for (let i = 0; i < ORDER.length; i++) {
    s = next(s, { type: isStage(s.screen) ? 'stageClear' : 'start' });
    seen.push(s.screen);
  }
  assert.deepEqual(seen, [...ORDER, 'title']);
});

test('start does not skip a stage; only stageClear leaves one', () => {
  const s = jumpTo('stage1');
  assert.equal(next(s, { type: 'start' }), s);
  assert.equal(next(s, { type: 'stageClear' }).screen, 'scene2');
});

test('select keeps the chosen auditor through the run', () => {
  const s = play(newGame(), 'start', { type: 'start', auditor: 'mercer' }, 'start', 'stageClear');
  assert.equal(s.screen, 'scene2');
  assert.equal(s.auditor, 'mercer');
  assert.equal(play(newGame(), 'start', { type: 'start', auditor: 'nobody' }).auditor, 'ward');
});

test('a lost life stays in the stage at its checkpoint; the last one is game over', () => {
  let s = play(jumpTo('stage2'), { type: 'checkpoint', id: 'stage2-area3' }, 'lifeLost');
  assert.equal(s.screen, 'stage2');
  assert.equal(s.lives, LIVES - 1);
  assert.equal(s.checkpoint, 'stage2-area3');
  s = play(s, 'lifeLost', 'lifeLost');
  assert.equal(s.screen, 'gameover');
  assert.equal(s.lives, 0);
});

test('continue restarts the area with full lives until continues run out, then the title', () => {
  let s = play(jumpTo('stage1'), { type: 'checkpoint', id: 'stage1-area4' }, 'gameOver');
  for (let c = CONTINUES - 1; c >= 0; c--) {
    s = next(s, { type: 'continue' });
    assert.deepEqual([s.screen, s.lives, s.continues, s.checkpoint], ['stage1', LIVES, c, 'stage1-area4']);
    s = next(s, { type: 'gameOver' });
  }
  assert.deepEqual(next(s, { type: 'continue' }), newGame());
  assert.deepEqual(next(s, { type: 'end' }), newGame());
});

test('checkpoints belong to their stage and reset on entering one', () => {
  const s = jumpTo('stage1');
  assert.equal(s.checkpoint, CHECKPOINTS.stage1[0]);
  assert.equal(next(s, { type: 'checkpoint', id: 'stage2-area1' }), s);
  assert.equal(play(s, 'stageClear', 'start', 'stageClear').checkpoint, CHECKPOINTS.stage3[0]);
});

test('stage events do nothing outside a stage', () => {
  for (const type of ['lifeLost', 'gameOver', 'stageClear']) {
    assert.equal(next(newGame(), { type }).screen, 'title');
  }
  assert.equal(next(jumpTo('stage1'), { type: 'continue' }).screen, 'stage1');
});

test('?go lands on every screen, unknown names on the title, and every screen has a song', () => {
  for (const screen of SCREENS) {
    assert.equal(jumpTo(screen).screen, screen);
    assert.equal(typeof SONGS[screen], 'string');
  }
  assert.equal(jumpTo('gameover').stage, 'stage1');
  assert.equal(jumpTo('lobby').screen, 'title');
});

test('the run shows each stage its intro card first; continue and ?go skip the card', () => {
  let s = play(newGame(), 'start', 'start', 'start');
  assert.deepEqual([s.screen, sceneFor(s)], ['stage1', 'intro']);
  s = next(s, { type: 'introDone' });
  assert.equal(sceneFor(s), 'stage1');
  s = play(s, 'stageClear', 'start');
  assert.deepEqual([s.screen, sceneFor(s), s.stage], ['archiveclimb', 'intro', 'archiveclimb']);
  s = play(s, 'introDone', 'stageClear');
  assert.deepEqual([s.screen, sceneFor(s), s.stage, s.checkpoint], ['stage3', 'intro', 'stage3', 'stage3-area1']);
  s = play(s, 'introDone', 'gameOver', 'continue');
  assert.deepEqual([s.screen, sceneFor(s)], ['stage3', 'stage3']);
  assert.equal(sceneFor(jumpTo('shaft')), 'shaft');
  assert.deepEqual(RUN_STAGES.map((k) => STAGE_CARDS[k][0]), [1, 2, 3, 4, 5, 6].map((n) => `STAGE ${n}`));
  assert.equal(next(jumpTo('stage2'), { type: 'stageClear' }).screen, 'stage3');
});

test('a climb hands its lost lives to the flow and leaves on Start, or on its own after a while', () => {
  const idle = updatePad(createPad(PADS.snes), new Set());
  const start = updatePad(createPad(PADS.snes), new Set(['start']));
  const s = { lives: 2, events: [{ type: 'death' }], over: null };
  let r = climbFlow(jumpTo('shaft'), s, idle);
  assert.deepEqual([r.flow.lives, r.leave], [LIVES - 1, false]);
  Object.assign(s, { events: [], over: { kind: 'clear', t: LEAVE.wait + 1 } });
  assert.equal(climbFlow(r.flow, s, idle).leave, false);
  r = climbFlow(r.flow, s, start);
  assert.deepEqual([r.leave, r.flow.screen, sceneFor(r.flow), r.flow.lives], [true, 'stage5', 'intro', LIVES - 1]);
  s.over = { kind: 'game over', t: LEAVE.auto };
  assert.equal(climbFlow(jumpTo('capstone'), s, idle).flow.screen, 'gameover');
  s.over = { kind: 'ending', ending: 'bad', t: LEAVE.auto };
  const end = climbFlow(jumpTo('capstone'), s, idle).flow;
  assert.deepEqual([end.screen, end.ending], ['ending', 'bad']);
  assert.deepEqual(next(end, { type: 'start' }), newGame());
});

test('the brawl lab stage select opens stages 1-6 of the run', () => {
  assert.equal(stageSelectUrl('Digit1', 'ward'), '?snes&go=stage1&who=ward');
  assert.equal(stageSelectUrl('Digit4', 'mercer'), '?snes&go=shaft&who=mercer');
  assert.equal(stageSelectUrl('Digit6', 'ward'), '?snes&go=capstone&who=ward');
  assert.equal(stageSelectUrl('Digit7', 'ward'), null);
  assert.equal(stageSelectUrl('KeyH', 'ward'), null);
});

test('a game started from the title is fresh even after a long run', () => {
  const tired = { ...jumpTo('ending'), lives: 1, continues: 0 };
  const s = play(tired, 'start', 'start');
  assert.deepEqual([s.screen, s.lives, s.continues], ['select', LIVES, CONTINUES]);
});
