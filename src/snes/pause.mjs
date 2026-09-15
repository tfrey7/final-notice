// Pause as Form 13-B, Holdings: the menu's state as pure numbers. Items are ledger rows with a pencil
// cursor, the two enchantments are attachments A and B (left and right swap on that row), and the ON
// HOLD stamp lands once in four frames unless pause reopens within three seconds of closing.
// ./pausedraw.mjs draws what this answers.

export const STAMP_FRAMES = 4;
export const RESTAMP_MS = 3000;

export const ATTACHMENTS = {
  notice: { name: 'SEAL OF NOTICE', effect: 'STAMPS WHAT IT HITS' },
  carbonCopy: { name: 'CARBON COPY', effect: 'EACH SHOT FILED TWICE' },
  redTape: { name: 'RED TAPE', effect: 'TIES A FOE IN PLACE' },
  margin: { name: 'MARGIN NOTE', effect: 'INK BURSTS ROUND YOU' },
};

export const attachment = (key) => (key ? ATTACHMENTS[key] ?? { name: key.toUpperCase(), effect: '' } : null);

// The ledger rows, from what a run actually holds: lives as case files, full Notice segments as stamps.
export function holdings({ lives = 0, meter = 0 }) {
  return [['CASE FILES', lives], ['NOTICE STAMPS', meter]];
}

// `last` is the previous pause (or null): its closedMs decides whether the stamp lands again.
// `routes` (the combo-route lights, on a brawl stage) takes the attachments section's place.
export function openPause(now, last, { rows, carried = ['notice', null], hand = 0, routes = null }) {
  const skip = last?.closedMs != null && now - last.closedMs < RESTAMP_MS;
  return { rows, carried: [carried[0] ?? 'notice', carried[1] ?? null], hand, routes, cursor: 0, stampT: skip ? STAMP_FRAMES : 0, closedMs: null };
}

export const closePause = (menu, now) => ({ ...menu, closedMs: now });

// The attachments row sits under the last item row; a form showing routes has none.
export const onAttachments = (menu) => !menu.routes && menu.cursor === menu.rows.length;
const lastRow = (menu) => (menu.routes ? menu.rows.length - 1 : menu.rows.length);

// One paused frame. Answers the menu and what happened: 'resume' (Start), 'close' (B), 'swap',
// 'move', 'thud' (the stamp landing) or null.
export function stepPause(menu, pad) {
  const has = (b) => pad.pressed.has(b);
  if (has('start')) return { menu, action: 'resume' };
  if (has('b')) return { menu, action: 'close' };
  let { cursor, hand, stampT } = menu;
  let action = null;
  if (stampT < STAMP_FRAMES) {
    stampT++;
    if (stampT === STAMP_FRAMES) action = 'thud';
  }
  if (has('up') && cursor > 0) cursor--, action = 'move';
  else if (has('down') && cursor < lastRow(menu)) cursor++, action = 'move';
  else if ((has('left') || has('right')) && onAttachments({ ...menu, cursor }) && menu.carried[1 - hand]) {
    hand = 1 - hand;
    action = 'swap';
  }
  return { menu: { ...menu, cursor, hand, stampT }, action };
}

// Where the stamp sits while it lands: high and faint on its first frame, down and full at the fourth.
export function stampPose(stampT) {
  const k = Math.min(STAMP_FRAMES, stampT);
  return { drop: (STAMP_FRAMES - k) * 6, ink: k / STAMP_FRAMES, landed: k >= STAMP_FRAMES };
}
