// `?fast`: a debug flag, off by default, that gives foes and bosses cheap health so a whole run takes minutes.
export const FOE_HP = 1;
export const BOSS_HP = 3;

export const fastOn = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');

// Caps the health of everything in `things` that can be hit; the auditor is never touched.
export function cheapen(things) {
  for (const t of things) {
    if (!t || t.team === 'player' || typeof t.hp !== 'number') continue;
    const cap = t.boss ? BOSS_HP : FOE_HP;
    if (t.hp > cap) t.hp = cap;
    if (t.maxHp > cap) t.maxHp = cap;
  }
  return things;
}
