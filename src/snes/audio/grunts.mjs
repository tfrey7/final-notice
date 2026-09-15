// Wordless fight sounds (item 2330): a grunt when hit, a heavier one on a big hit or launch, a cry on
// knockdown, an effort on a fighter's own heavy attack or throw, and a death sound. They play on most
// hits, far more often than the spoken barks, so each fighter gets a short cooldown instead of a rest,
// never repeats the variation it made last, and keeps quiet while its own voice line is playing.

export const SOUNDS = ['hurt', 'big', 'knockdown', 'effort', 'death'];
export const VARIATIONS = 3;

// Loudest first: one fighter makes one sound a frame.
export const RANK = { death: 5, knockdown: 4, big: 3, hurt: 2, effort: 1 };
// Frames a fighter stays quiet after a sound it made, so a combo is not a machine gun. A cry that
// ends a fight or floors someone waits for nothing but its own voice line.
export const COOLDOWN = { hurt: 20, big: 20, effort: 30, knockdown: 0, death: 0 };
export const CHANCE = { hurt: 0.8, big: 1, knockdown: 1, effort: 0.7, death: 1 };
// Most fighters sounding at once in one frame: a sweep through a crowd is a chorus of two, not five.
export const PER_FRAME = 2;
// A hit taking this much health is a big one even when it does not floor anyone.
export const BIG_DAMAGE = 3;

const EFFORTS = ['heavy', 'throw', 'grab', 'windup', 'charge', 'slam', 'stamp', 'sweep', 'swing', 'lunge'];

export const gruntId = (who, sound, i) => `${who}-${sound}-${i}`;

export const gruntSnapshot = (fighters) => new Map(fighters.map((f) => [f.id, { hp: f.hp, state: f.state, juggle: !!f.juggle }]));

// The sound each fighter makes between two frames, as { id, who, sound }. `whoOf(f)` names the voice
// a fighter grunts in (its kind, or the auditor for the player), null for one with no voice.
export function gruntMoments(before, fighters, whoOf = (f) => f.kind ?? null) {
  const out = [];
  for (const f of fighters) {
    const was = before.get(f.id);
    const who = was && whoOf(f);
    if (!who) continue;
    const lost = was.hp - f.hp;
    let sound = null;
    if (lost > 0 && f.hp === 0) sound = 'death';
    else if (f.state === 'knockdown' && was.state !== 'knockdown') sound = f.juggle && !was.juggle ? 'big' : 'knockdown';
    else if (lost >= BIG_DAMAGE) sound = 'big';
    else if (lost > 0) sound = 'hurt';
    else if (EFFORTS.includes(f.state) && f.state !== was.state) sound = 'effort';
    if (sound) out.push({ id: f.id, who, sound });
  }
  return out;
}

// Picks the variation for each moment, loudest first, or none while that fighter cools down, its own
// line is playing (`talking(who)`), or the dice say no. `has(id)` says a variation was baked.
export function createGrunter(roll = Math.random) {
  const quiet = new Map();
  const last = new Map();
  return (moments, frame, { talking = () => false, has = () => true } = {}) => {
    const said = [];
    for (const m of [...moments].sort((a, b) => RANK[b.sound] - RANK[a.sound])) {
      if (said.length >= PER_FRAME || said.some((s) => s.id === m.id)) continue;
      if (talking(m.who)) continue;
      if (COOLDOWN[m.sound] && frame < (quiet.get(m.id) ?? -Infinity)) continue;
      if (roll() >= CHANCE[m.sound]) continue;
      const key = `${m.who}:${m.sound}`;
      const ids = Array.from({ length: VARIATIONS }, (_, i) => gruntId(m.who, m.sound, i)).filter((id) => has(id));
      const fresh = ids.length > 1 ? ids.filter((id) => id !== last.get(key)) : ids;
      if (!fresh.length) continue;
      const pick = fresh[Math.floor(roll() * fresh.length) % fresh.length];
      last.set(key, pick);
      quiet.set(m.id, frame + Math.max(COOLDOWN.hurt, COOLDOWN[m.sound]));
      said.push({ ...m, grunt: pick });
    }
    return said;
  };
}
