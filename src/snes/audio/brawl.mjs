// Which effect a brawl frame plays. An effect takes the two effect voices, so a second effect in the
// same frame would cut the first dead: the frame plays only its loudest moment, in this order.
export const BRAWL_SOUND = [
  ['go', 'roomClear'], ['parry', 'objection'], ['guardBreak', 'guardSmash'], ['cabinetSmash', 'cabinetSmash'],
  ['deskSmash', 'deskSmash'], ['ko', 'ko'], ['hurt', 'hurt'], ['staplerHit', 'staplerHit'], ['stampHit', 'stampHit'],
  ['binderHit', 'binderHit'], ['heavy', 'hitHeavy'], ['down', 'thud'], ['hit', 'hitLight'], ['blocked', 'block'],
  ['injunction', 'injunction'], ['fangs', 'alarm'], ['telegraph', 'telegraph'], ['heal', 'heal'], ['redTape', 'redTape'],
  ['throw', 'throw'], ['breakFree', 'throw'], ['pickup', 'weaponPickup'], ['grab', 'grab'], ['punch', 'swing'],
  ['jump', 'jump'], ['land', 'land'], ['step', 'step'],
];
const RANK = new Map(BRAWL_SOUND.map(([event], i) => [event, i]));
const SOUND = new Map(BRAWL_SOUND);

export function brawlSound(events) {
  let best = null;
  for (const e of events) if (RANK.has(e) && (best === null || RANK.get(e) < RANK.get(best))) best = e;
  return best && SOUND.get(best);
}
