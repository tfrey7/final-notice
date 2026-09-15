// Stage 1's scripted waves, one list per screen. The camera locks on each screen until its last wave
// is down, then GO and it scrolls on (L4: fixed waves, locked screen).
import { CAMERA } from './tuning.mjs';
import { spawnFoe, stepFoes } from './foes.mjs';
import { spawnBoss } from './boss.mjs';

export const SCREEN = 256;

// [type, side it walks in from, floor y]. Each screen's twist remixes pieces the player already knows.
export const STAGE1_SCREENS = [
  { lockAt: 0, twist: 'clerks only: learn the wind-up', waves: [[['clerk', 'right', 172], ['clerk', 'left', 200]], [['clerk', 'right', 160], ['temp', 'right', 204], ['clerk', 'left', 184]]] },
  { lockAt: 256, twist: 'temps dodge: knock one flying into the others', waves: [[['temp', 'right', 170], ['temp', 'left', 196]], [['supervisor', 'right', 182], ['clerk', 'right', 160], ['clerk', 'left', 206]]] },
  { lockAt: 512, twist: 'supervisors block: a thrown clerk breaks the guard', waves: [[['supervisor', 'right', 166], ['supervisor', 'left', 200]], [['temp', 'right', 160], ['temp', 'right', 204], ['clerk', 'left', 176], ['clerk', 'left', 210]]] },
  { lockAt: 768, boss: true, twist: 'his memos and charge flatten his own staff', waves: [[['accountManager', 'right', 186], ['clerk', 'left', 170]]] },
];

export function createStage(world, screens = STAGE1_SCREENS) {
  world.stage = { screens, screen: 0, wave: -1, locked: false, cameraX: 0, go: 0, cleared: false };
  return world.stage;
}

export function spawnWave(world, wave) {
  const { cameraX } = world.stage;
  return wave.map(([type, side, y]) => {
    const x = side === 'right' ? cameraX + SCREEN + 16 : cameraX - 16;
    return type === 'accountManager' ? spawnBoss(world, x, y) : spawnFoe(world, type, x, y);
  });
}

export function stepStage(world) {
  const s = world.stage;
  const p = world.player;
  const last = (s.screens.at(-1)?.lockAt ?? 0);
  if (!s.locked) {
    if (s.go > 0) s.go--;
    s.cameraX = Math.min(last, Math.max(s.cameraX, p.x - CAMERA.lead));
    const next = s.screens[s.screen];
    if (next && s.cameraX >= next.lockAt) {
      s.cameraX = next.lockAt;
      s.locked = true;
      s.wave = -1;
    }
  }
  const right = s.locked ? s.cameraX + SCREEN - CAMERA.edge : last + SCREEN - CAMERA.edge;
  p.x = Math.min(right, Math.max(s.cameraX + CAMERA.edge, p.x));
  world.bounds = { left: s.cameraX, right: s.cameraX + SCREEN };
  if (s.locked && world.foes.length === 0) {
    const screen = s.screens[s.screen];
    if (s.wave + 1 < screen.waves.length) {
      s.wave++;
      spawnWave(world, screen.waves[s.wave]);
    } else {
      s.locked = false;
      s.screen++;
      s.cleared = s.screen >= s.screens.length;
      if (!s.cleared) s.go = CAMERA.goFrames;
    }
  }
}

export function stepWorld(world) {
  stepStage(world);
  stepFoes(world);
}
