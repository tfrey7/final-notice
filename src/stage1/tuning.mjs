// Stage 1's enemy numbers, in frames and pixels at 60 fps. Starting points from docs/NES-CLASSICS.md
// (L4 few foes and locked screens, L6 hits land twice, L8 half-second boss telegraphs); tune in `?tune`.
import { registerTuning } from '../tune.mjs';

export const FOES = registerTuning('foes', {
  walkX: 0.75,
  walkY: 0.5,
  circleRadius: 44,
  circleSpeed: 0.012,
  laneTolerance: 3,
  attackTokens: 2,
  tokenCooldown: 45,
  attackReach: 22,
  windupFrames: 18,
  activeFrames: 4,
  recoverFrames: 22,
  attackDamage: 1,
  blockChance: 0.2,
  blockFrames: 16,
  dodgeChance: 0.15,
  dodgeFrames: 12,
  dodgeSpeed: 2,
  staggerFrames: 14,
  knockback: 2,
  launchSpeed: 3,
  gravity: 0.25,
  juggleLimit: 2,
  knockdownFrames: 48,
  getupInvuln: 30,
  deathFlashFrames: 32,
});

// Colour means behaviour (L3): grey clerks are plain, blue temps dodge, red supervisors block and last.
export const FOE_TYPES = registerTuning('foeTypes', {
  clerkHp: 4,
  clerkBlock: 1,
  clerkDodge: 1,
  tempHp: 3,
  tempBlock: 0,
  tempDodge: 3,
  supervisorHp: 7,
  supervisorBlock: 2.5,
  supervisorDodge: 0.3,
});

export const BOSS = registerTuning('accountManager', {
  hp: 30,
  walk: 0.6,
  enrageAt: 0.5,
  restFrames: 40,
  enragedRest: 20,
  windupFrames: 32,
  enragedWindup: 20,
  enrageFrames: 40,
  swingReach: 30,
  swingDamage: 2,
  memoSpeed: 2,
  memoDamage: 1,
  chargeSpeed: 3,
  chargeDamage: 2,
  chargeFrames: 70,
  heavyStagger: 12,
});

// The SNES draws Stage 1 about 1.5x taller: `scale` grows every pixel number of the moves to match,
// and `finisherHitStop` holds the fight still while the last foe of an area flies at the camera.
export const STAGE1 = registerTuning('stage1', {
  scale: 1.5,
  finisherHitStop: 12,
});

export const CAMERA = registerTuning('stage1Camera', {
  lead: 112,
  edge: 8,
  goFrames: 90,
});
