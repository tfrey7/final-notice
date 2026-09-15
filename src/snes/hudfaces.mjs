// The HUD's 12x12 face icons, each hero's own head: Ward's from his sprite's head, Mercer's cut from
// his idle sprite (assets/sprites/frank-mercer/idle.png, x 49-60, y 35-46). Each row character is a
// palette index in hex, `.` or 0 transparent and i palette[i - 1], as rgb15.
import WARD from './art/ward.mjs';

export const FACE = 12;

const MERCER = {
  palette: [0x0865, 0x10eb, 0x0821, 0x2174, 0x367c, 0x1463, 0x458a, 0x6b7c],
  head: [
    '...111111...',
    '..122222211.',
    '..1222222233',
    '.12222222233',
    '.1222222223.',
    '.1222222243.',
    '..322442243.',
    '..1225544433',
    '..122255543.',
    '...34455543.',
    '...45555443.',
    '..67885533..',
  ],
};

// A head centred in the icon, as rows of rgb15 or null.
function face({ palette, head }) {
  const left = (FACE - head[0].length) >> 1;
  return Array.from({ length: FACE }, (_, y) => Array.from({ length: FACE }, (_, x) => {
    const i = parseInt(head[y]?.[x - left] ?? '0', 16);
    return i > 0 ? palette[i - 1] : null;
  }));
}

export const FACES = { ward: face(WARD), mercer: face(MERCER) };
