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

// A grunt is cut short by a gap this long after the last one, so a combo reads as a few, not a chatter.
export const HURT_GAP = 14;

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

// Chooses the line for each moment, never the one that character last said for it, and drops a
// grunt that comes too soon after another.
export function createBarker(roll = Math.random) {
  const last = {};
  let quietUntil = -Infinity;
  return (moments, frame) => moments.flatMap(({ who, moment }) => {
    if (moment === 'hurt' && frame < quietUntil) return [];
    if (moment === 'hurt') quietUntil = frame + HURT_GAP;
    const lines = BARKS[who][moment];
    const key = `${who}:${moment}`;
    const fresh = lines.length > 1 ? lines.filter((l) => l !== last[key]) : lines;
    const text = fresh[Math.floor(roll() * fresh.length) % fresh.length];
    last[key] = text;
    return [{ who, moment, text }];
  });
}
