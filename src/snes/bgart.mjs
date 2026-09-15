// An area of a background module drawn the way the SNES draws it: the layers it names `sub` go to
// the sub screen, the rest to the main, and the area's colour math blends the two wherever the sub
// screen has a pixel (elsewhere it shows the fixed colour, black, and the main is untouched).
import { WIDTH } from './screen.mjs';
import { bakeScene, composeFrame, sceneProblems } from './layers.mjs';
import { fromRgba, mathPass, screen } from './fx.mjs';

export function screens(area) {
  const sub = new Set(area.sub ?? []);
  const pick = (onSub) => area.scene.layers.filter((l) => sub.has(l.bg) === onSub);
  return { main: { ...area.scene, layers: pick(false) }, sub: { ...area.scene, backdrop: 0, layers: pick(true) } };
}

export function areaProblems(area) {
  const problems = sceneProblems(area.scene);
  const bgs = new Set(area.scene.layers.map((l) => l.bg));
  for (const bg of area.sub ?? []) if (!bgs.has(bg)) problems.push(`sub screen names bg${bg}, the scene has no such layer`);
  if (area.sub?.length && !['add', 'sub'].includes(area.math?.op)) problems.push('a sub screen needs colour math add or sub');
  return problems;
}

export function bakeArea(area) {
  const s = screens(area);
  return { ...s, bakedMain: bakeScene(s.main), bakedSub: bakeScene(s.sub) };
}

// One frame as an rgb15 buffer for a camera x.
export function composeArea(area, baked, camX, out = screen()) {
  const main = fromRgba(composeFrame(baked.main, baked.bakedMain, camX, 0));
  if (!baked.sub.layers.length) return out.set(main), out;
  const sub = fromRgba(composeFrame(baked.sub, baked.bakedSub, camX, 0));
  return mathPass(main, sub, { ...area.math, where: (x, y) => sub[y * WIDTH + x] !== 0 }, out);
}

// The camera sweeps 0..span and back at `speed` pixels a second.
export function sweep(span, ms, speed = 40) {
  if (span <= 0) return 0;
  const t = ((ms * speed) / 1000) % (2 * span);
  return Math.floor(t < span ? t : 2 * span - t);
}
