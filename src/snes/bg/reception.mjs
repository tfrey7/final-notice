// Stage 1-1, Reception, built from the background kit (src/snes/kit, docs/SNES-BG-KIT.md).
// ?snes&art=reception. Key light: the midnight windows, upper left. Focal point: the reception
// desk's brass nameplate at about a third of the first screen.
import { buildArea } from '../kit/area.mjs';

export const RECEPTION = {
  name: 'Reception',
  descent: 3,
  cols: 64,
  windows: [24, 120],
  fixtures: [192, 288, 384],
  overlay: { beams: 128 },
  props: [
    { prop: 'cabinet', x: 0 },
    { prop: 'palm', x: 88 },
    { prop: 'desk', x: 192 },
    { prop: 'chair', x: 296 },
    { prop: 'art', x: 304, y: 40 },
    { prop: 'cooler', x: 320 },
    { prop: 'door', x: 352 },
    { prop: 'papers', x: 400 },
    { prop: 'copier', x: 440 },
  ],
};

const area = buildArea(RECEPTION);

export default { ...area, areas: [area] };
