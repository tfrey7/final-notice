// What the fighters shout mid-brawl, in their cast voices (voice.mjs): a grunt when hit, an
// office-speak taunt while they wait their turn, a cry on the blow that finishes them. The moments
// are read off the fighters themselves, one frame against the last, so the fight logic stays silent.

export const BARKS = {
  associate: {
    hurt: ['Ow!', 'Hey!', 'Ugh!'],
    taunt: ['Take a number!', "You're on hold!"],
    death: ['Not on my shift!'],
  },
  supervisor: {
    hurt: ['Oof.', 'Hmph.', 'Gah.'],
    taunt: ['Per my last email.', 'Back to your desk.'],
    death: ['Unacceptable.'],
  },
  manager: {
    hurt: ['Hrm.', 'Ugh.'],
    taunt: ["Let's circle back.", "You're being let go."],
    death: ["This... will be... escalated."],
  },
  counsel: {
    hurt: ['Objection!', 'Assault!', 'Ow, hey!'],
    taunt: ['See you in court.', 'Read the fine print.'],
    death: ["I'll sue..."],
  },
  vellum: {
    hurt: ['Ah!', 'How rude.'],
    taunt: ['Your claim is denied.', 'Sign here, please.'],
    death: ['My file... they lost my file...'],
  },
};

export const barkLines = () => Object.entries(BARKS).flatMap(([who, moments]) => Object.entries(moments).flatMap(([moment, lines]) => lines.map((text) => ({ who, moment, text }))));

// Frames a character type stays quiet after speaking, and the share of its moments it speaks on, so a
// room of associates barks a few times, not on every blow. A death cry skips the rest but not the dice.
export const REST = 540;
export const CHANCE = { hurt: 0.2, taunt: 0.5, death: 0.4 };
// Frames of quiet after any line ends before the next one starts.
export const GAP = 60;

export const snapshot = (fighters) => new Map(fighters.map((f) => [f.id, { hp: f.hp, act: f.act, state: f.state }]));

// The bark moments between two frames: hp lost (death when it reached 0), a fresh taunt act, and a
// boss's summon or fangs, which are his taunts.
export function barkMoments(before, fighters) {
  const out = [];
  for (const f of fighters) {
    const was = before.get(f.id);
    if (!was || !BARKS[f.kind]) continue;
    if (f.hp < was.hp) out.push({ id: f.id, who: f.kind, moment: f.hp === 0 ? 'death' : 'hurt' });
    else if (f.act?.kind === 'taunt' && f.act !== was.act) out.push({ id: f.id, who: f.kind, moment: 'taunt' });
    else if (f.boss && ['summon', 'fangs'].includes(f.state) && was.state !== f.state) out.push({ id: f.id, who: f.kind, moment: 'taunt' });
  }
  return out;
}

// Chooses the line for each moment, never the one that character last said for it. Nobody speaks over
// a line still being said (`busy` is the partner talking), and each type rests between lines.
// `frames(line)` is how long a line lasts; `speaking(frame)` tells the partner to hold their tongue.
export function createBarker(roll = Math.random) {
  const last = {};
  const rested = {};
  let until = -Infinity;
  const barker = (moments, frame, { frames = () => 60, busy = false } = {}) => moments.flatMap(({ who, moment }) => {
    if (busy || frame < until + GAP) return [];
    if (moment !== 'death' && frame < (rested[who] ?? -Infinity)) return [];
    if (roll() >= CHANCE[moment]) return [];
    const lines = BARKS[who][moment];
    const key = `${who}:${moment}`;
    const fresh = lines.length > 1 ? lines.filter((l) => l !== last[key]) : lines;
    const text = fresh[Math.floor(roll() * fresh.length) % fresh.length];
    last[key] = text;
    until = frame + frames({ who, moment, text });
    rested[who] = until + REST;
    return [{ who, moment, text }];
  });
  barker.speaking = (frame) => frame < until;
  return barker;
}
