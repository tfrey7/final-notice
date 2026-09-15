// What the brawl stages draw over the room: the always-on HUD (health, lives, meter, the boss bar),
// the combo counter and route guide, the teaching prompts, and the two cards — the boss's filed
// memo and the stage-clear panel.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { hex, rgb15 } from '../color.mjs';
import { drainStep, drawHud, hudLayout } from '../hud.mjs';
import { drawString, measure } from '../text.mjs';
import { drawCombo, drawGuide } from '../hitfx.mjs';
import { drawPrompt, measurePrompt } from '../prompt.mjs';
import { PIPS } from '../../stage1/player.mjs';
import { guideStep, liveRoutes } from '../../stage1/combo.mjs';
import { vellum } from '../../stage1/vellum.mjs';
import { CARD, cardFrame, clearLines } from './boss.mjs';

// Reception's teaching words with the SNES button that does each.
const TEACH = { PUNCH: '[Y] PUNCH', STEP: '[R] STEP' };
const MEMO = { paper: rgb15(29, 28, 23), rule: rgb15(18, 16, 12), ink: rgb15(3, 3, 6), stamp: rgb15(26, 3, 3) };
const GOLD = rgb15(31, 26, 8);
const WHITE = rgb15(31, 31, 31);

export function drawBrawlHud(scene, time) {
  const w = scene.world;
  const flow = scene.registry.get('flow');
  const p = w.fighters.find((f) => f.team === 'player');
  const v = scene.office && vellum(w);
  const boss = v && !scene.card && !scene.entrance ? { name: 'Vellum', hp: v.hp, maxHp: v.maxHp } : null;
  if (!scene.paused && !scene.card) scene.drain = drainStep(scene.drain, p.hp);
  const state = { name: scene.who, hp: p.hp, maxHp: PIPS, lives: flow.lives, meter: w.meter, boss };
  const layout = hudLayout({ ...state, pale: scene.drain?.pale ?? p.hp, receipt: scene.receipt, now: time });
  const dim = scene.paused ? 0.5 : 1;
  const fill = scene.fill;
  scene.g.clear();
  // A parry's flash: the whole screen washed white for a few frames while the fight holds still.
  if (w.flash > 0) fill(0, 0, WIDTH, HEIGHT, WHITE, Math.ceil(10 * w.flash / (scene.tune.parryFlash || 1)));
  drawHud(fill, layout);
  if (!scene.paused && !scene.card) {
    drawCombo(scene.g, fill, w.combo, scene.tune, { right: WIDTH - 10, top: 44 });
    scene.guide = guideStep(scene.guide, scene.guideOn ? liveRoutes(p, scene.tune) : []);
    if (scene.guide) drawGuide(scene.g, fill, scene.guide, { x: 8, y: 38 });
  }
  scene.hudSprites.pool.forEach((img) => img.setAlpha(dim).setScrollFactor(0));
  scene.g.setAlpha(dim);

  const run = w.run;
  const teach = TEACH[run?.prompt] ?? run?.prompt;
  if (teach) drawPrompt(fill, teach, (WIDTH - measurePrompt(teach)) >> 1, 64);
  if (run && !run.locked && run.go > 0 && Math.floor(run.go / 10) % 2) {
    drawString(fill, 'GO', WIDTH - 40, 64, GOLD);
    scene.g.fillStyle(hex(GOLD)).fillTriangle(WIDTH - 22, 63, WIDTH - 22, 73, WIDTH - 14, 68);
  }
  if (w.ritual && Math.floor(w.ritualT / 20) % 2 === 0) centred(fill, 'BREAK THE ALTARS', 80, GOLD);
  if (p.state === 'bound') drawString(fill, 'MASH!', Math.round(p.x - w.cameraX) - 16, p.y - 80);
  if (scene.card && !scene.entrance) drawMemoCard(fill, cardFrame(scene.card.t));
  if (scene.clear) drawClearCard(fill, clearLines(scene.registry.get('stage1Frames') ?? 0, flow.lives, scene.def.number));
}

const centred = (fill, text, y, colour) => drawString(fill, text, (WIDTH - measure(text)) >> 1, y, colour);

// The stage-clear card: a plain dark panel over the slumped room, the heading in gold.
export function drawClearCard(fill, [heading, ...rows]) {
  const w = 150;
  const h = 30 + rows.length * 14;
  const x = (WIDTH - w) >> 1;
  const y = 70;
  fill(x + 3, y + 3, w, h, rgb15(0, 0, 0));
  fill(x, y, w, h, rgb15(2, 2, 5));
  fill(x + 6, y + 21, w - 12, 1, GOLD);
  drawString(fill, heading, (WIDTH - measure(heading)) >> 1, y + 8, GOLD);
  rows.forEach((row, i) => drawString(fill, row, (WIDTH - measure(row)) >> 1, y + 28 + i * 14));
}

// The boss title card as a filed memo, in the manner of Sunset Riders' wanted posters: it drops in,
// FILED is stamped across it, and his line runs as a subtitle under it.
export function drawMemoCard(fill, step) {
  const w = 206;
  const h = 104;
  const x = (WIDTH - w) >> 1;
  const y = Math.round(44 + step.rise * 150);
  const ink = (text, tx, ty, colour = MEMO.ink) => drawString(fill, text, tx, ty, colour, null);
  fill(x + 3, y + 3, w, h, rgb15(1, 1, 2));
  fill(x, y, w, h, MEMO.paper);
  fill(x + 8, y + 22, w - 16, 1, MEMO.rule);
  ink('INTEROFFICE MEMORANDUM', x + 8, y + 9);
  ink('RE: FINAL NOTICE', x + 8, y + 30);
  ink('FROM:', x + 8, y + 46);
  ink(CARD.name, x + 8, y + 57);
  ink('DEPT:', x + 8, y + 73);
  ink(CARD.department, x + 8, y + 84);
  if (step.stamped) {
    const sw = measure(CARD.stamp) + 12;
    const sx = x + w - sw - 10;
    const sy = y + 32;
    fill(sx, sy, sw, 16, MEMO.stamp);
    fill(sx + 2, sy + 2, sw - 4, 12, MEMO.paper);
    ink(CARD.stamp, sx + 6, sy + 4, MEMO.stamp);
  }
  if (step.subtitle) {
    const tw = measure(CARD.subtitle);
    fill(((WIDTH - tw) >> 1) - 6, 170, tw + 12, 14, rgb15(1, 1, 2));
    drawString(fill, CARD.subtitle, (WIDTH - tw) >> 1, 173);
  }
}
