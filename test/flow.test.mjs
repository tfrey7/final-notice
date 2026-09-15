import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER, SCREENS, SONGS, CHECKPOINTS, LIVES, CONTINUES, newGame, jumpTo, next } from '../src/flow.mjs';

const play = (state, ...events) => events.reduce((s, e) => next(s, typeof e === 'string' ? { type: e } : e), state);

test('start walks the whole order and the ending goes back to the title', () => {
  let s = newGame();
  const seen = [s.screen];
  for (let i = 0; i < ORDER.length; i++) {
    s = next(s, { type: s.screen.startsWith('stage') ? 'stageClear' : 'start' });
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
  assert.equal(play(s, 'stageClear', 'start').checkpoint, CHECKPOINTS.stage2[0]);
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

test('a game started from the title is fresh even after a long run', () => {
  const tired = { ...jumpTo('ending'), lives: 1, continues: 0 };
  const s = play(tired, 'start', 'start');
  assert.deepEqual([s.screen, s.lives, s.continues], ['select', LIVES, CONTINUES]);
});
