// How a climb stage (the Archive, the shaft, the capstone) plays inside the run: it starts with the run's
// auditor and lives, hands each life lost to the flow, and leaves through the flow on its clear, its
// ending or its game over once Start is pressed or the card has stood a while. Pure.
import { AUDITORS, next } from '../flow.mjs';

export const LEAVE = { wait: 45, auto: 240 };

export const inRun = (flow, key) => flow?.screen === key;

// The auditor a climb scene plays: the run's, else ?who=, else Ward.
export const climber = (flow, key, params) => {
  if (inRun(flow, key)) return flow.auditor;
  return AUDITORS.includes(params.get('who')) ? params.get('who') : 'ward';
};

// One frame's news for the flow, after the stage has stepped: the flow to keep, and whether to leave.
export function climbFlow(flow, s, pad) {
  let state = flow;
  for (const e of s.events) if (e.type === 'death' && s.lives > 0) state = next(state, { type: 'lifeLost' });
  const o = s.over;
  if (!o || o.t <= LEAVE.wait) return { flow: state, leave: false };
  if (o.t < LEAVE.auto && !pad.pressed.has('a') && !pad.pressed.has('start')) return { flow: state, leave: false };
  const event = o.kind === 'game over' ? { type: 'gameOver' } : { type: 'stageClear', ending: o.ending };
  return { flow: next(state, event), leave: true };
}
