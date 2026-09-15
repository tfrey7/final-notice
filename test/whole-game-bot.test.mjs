// A bot plays the whole run from Start on the title to an ending and back: the menus and intro cards by
// Start, and the climbs (the Archive, the shaft, the capstone and its final choice) by their own bots on
// the SNES pad, through the same flow hand-off the scenes use. The brawl stages clear by their event here;
// their bots play them whole in snes-stage1-bot, snes-stage3-bot and snes-stage5-bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, updatePad, PADS } from '../src/input.mjs';
import { isStage, newGame, next, sceneFor } from '../src/flow.mjs';
import { LEAVE, climbFlow } from '../src/snes/runflow.mjs';
import { createArchive, stepArchive } from '../src/stage2/climb.mjs';
import * as climbBot from '../src/stage2/climbbot.mjs';
import { createShaft, stepShaft } from '../src/stage4/shaft.mjs';
import * as shaftBot from '../src/stage4/shaftbot.mjs';
import { createCapstone, stepCapstone } from '../src/stage6/capstone.mjs';
import * as finaleBot from '../src/stage6/finalebot.mjs';

// The climb bot reaches the Custodian but does not fight him; his fight is custodian-boss's, so here he falls.
const CLIMBS = {
  archiveclimb: { create: createArchive, step: stepArchive, bot: climbBot, finish: (s) => { if (s.fight && !s.over) s.fight.hp = 0; } },
  shaft: { create: createShaft, step: stepShaft, bot: shaftBot },
  capstone: { create: createCapstone, step: stepCapstone, bot: finaleBot, pick: 'good' },
};

function playClimb(flow, key) {
  const c = CLIMBS[key];
  const s = c.create(flow.auditor);
  s.lives = flow.lives;
  const bot = c.bot.createBot(c.pick);
  let pad = createPad(PADS.snes);
  for (let frames = 0; frames < 60 * 600; frames++) {
    const done = s.over && s.over.t >= LEAVE.wait;
    pad = updatePad(pad, done ? new Set(['start']) : c.bot.botButtons(bot, s));
    c.step(s, pad);
    c.finish?.(s);
    const r = climbFlow(flow, s, pad);
    flow = r.flow;
    if (r.leave) {
      if (s.over.kind !== 'game over') assert.equal(flow.lives, s.lives, `${key} carries its lives on`);
      return { flow, frames, over: s.over.kind };
    }
  }
  assert.fail(`${key} never ended (${s.lives} lives)`);
}

test('a bot plays from Start on the title through all six stages to the good ending, then back to the title', () => {
  let flow = next(newGame(), { type: 'start' });
  const seen = ['title'];
  const log = [];
  let ending = null;
  while (flow.screen !== 'title') {
    assert.ok(seen.length < 40, seen.join(' > '));
    const scene = sceneFor(flow);
    seen.push(scene === 'intro' ? `intro:${flow.screen}` : flow.screen);
    if (scene === 'intro') flow = next(flow, { type: 'introDone' });
    else if (CLIMBS[flow.screen]) {
      const { flow: after, frames, over } = playClimb(flow, flow.screen);
      assert.notEqual(over, 'game over', `the bot lost ${flow.screen}`);
      log.push(`${flow.screen} ${(frames / 60).toFixed(0)} s`);
      flow = after;
    } else if (isStage(flow.screen)) flow = next(flow, { type: 'stageClear' });
    else {
      if (flow.screen === 'ending') ending = flow.ending;
      flow = next(flow, { type: 'start', auditor: 'ward' });
    }
  }
  console.log(`whole game: ${log.join(', ')}`);
  assert.deepEqual(seen, [
    'title', 'select', 'scene1', 'intro:stage1', 'stage1', 'scene2', 'intro:archiveclimb', 'archiveclimb',
    'intro:stage3', 'stage3', 'intro:shaft', 'shaft', 'intro:stage5', 'stage5', 'scene3', 'intro:capstone', 'capstone', 'ending',
  ]);
  assert.equal(ending, 'good');
  assert.deepEqual(flow, newGame());
});
