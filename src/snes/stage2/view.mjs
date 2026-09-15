// Stage 2 on the SNES as pure numbers: one scale from world units to screen pixels, the camera, the
// archive scene behind each area and the HUD's state. ./scene.mjs draws what these answer.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { registerTuning } from '../../tune.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { ROWS } from '../../stage2/areas.mjs';
import { SCREEN_W, BODY_W, BODY_H, TUNING as ESCAPE } from '../../stage2/escape.mjs';
import { segments } from '../../injunction.mjs';
import { AREAS as ARCHIVE } from '../bg/archive.mjs';

// The world keeps its NES units; the SNES draws it `scale` times larger, so a 32-unit body is 40 px.
export const STAGE2 = registerTuning('stage2', { scale: 1.25 }, { scale: [1, 1.5, 0.05] });

export const bodySize = (scale = STAGE2.scale) => ({ w: Math.round(BODY_W * scale), h: Math.round(BODY_H * scale) });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The screen's top-left in scaled pixels: on the auditor, but never outside the logic's own camera
// (so scroll locks and the auto-scroll still frame play), and low enough to keep the feet in view.
export function camera(run, scale = STAGE2.scale) {
  const worldW = run.area.width ?? run.area.cols * TILE;
  const left = Math.round(run.camX * scale);
  const right = Math.round((run.camX + SCREEN_W) * scale) - WIDTH;
  const x = clamp(Math.round(run.player.x * scale - WIDTH / 2), left, Math.max(left, right));
  const y = Math.round(run.player.y * scale - HEIGHT * 0.7);
  return {
    x: clamp(x, 0, Math.max(0, Math.round(worldW * scale) - WIDTH)),
    y: clamp(y, 0, Math.max(0, Math.round(ROWS * TILE * scale) - HEIGHT)),
  };
}

// A world rectangle on screen, edges rounded separately so neighbouring tiles never gap or overlap.
export function onScreen(cam, scale, x, y, w, h) {
  const x0 = Math.round(x * scale) - cam.x;
  const y0 = Math.round(y * scale) - cam.y;
  return { x: x0, y: y0, w: Math.round((x + w) * scale) - cam.x - x0, h: Math.round((y + h) * scale) - cam.y - y0 };
}

// Areas 1-3 are the archive's own; the Disposal Line borrows Retention Order's stacks until its
// background card lands. BG1 is dropped: the play layer is the logic's solid tiles. A sub screen
// that blends by add-half is the archive's painted wax, dropped because the logic's front is drawn.
const BACKDROP_OF = ['access', 'retention', 'original', 'retention'];

export function backdropFor(index) {
  const a = ARCHIVE.find((x) => x.key === BACKDROP_OF[clamp(index, 0, BACKDROP_OF.length - 1)]);
  const keep = (l) => l.bg === 2 || (l.bg === 3 && !a.math?.half);
  const layers = a.scene.layers.filter(keep);
  return { ...a, sub: a.sub.filter((bg) => layers.some((l) => l.bg === bg)), scene: { ...a.scene, layers } };
}

export function hudState(run, flow) {
  const p = run.player;
  const boss = run.bosses?.find((b) => !b.beaten);
  return {
    name: p.auditor,
    hp: p.health,
    maxHp: ESCAPE.health,
    lives: flow.lives,
    meter: segments(run.meterHits),
    carried: run.carried.map((c) => c ?? null),
    hand: run.hand,
    boss: boss ? { name: 'custodian', hp: boss.hp, maxHp: boss.maxHp ?? boss.hp } : null,
  };
}
