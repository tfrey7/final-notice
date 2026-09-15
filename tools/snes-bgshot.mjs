// Writes a contact sheet of background areas as a PNG, each frame at native 298x224, scaled.
//
//   node tools/snes-bgshot.mjs <out.png> <module>[:area][@camX] ... [--scale 2] [--cols 1]
//   node tools/snes-bgshot.mjs sheet.png claims:0@0 reception@0
//   node tools/snes-bgshot.mjs bands.png --descents reception 3,52,90
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { WIDTH, HEIGHT } from '../src/snes/screen.mjs';
import { bakeScene, composeFrame } from '../src/snes/layers.mjs';
import { buildArea } from '../src/snes/kit/area.mjs';

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

export function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function sheet(frames, { scale = 2, cols = 1, gap = 4 } = {}) {
  const rows = Math.ceil(frames.length / cols);
  const w = cols * WIDTH * scale + (cols - 1) * gap;
  const h = rows * HEIGHT * scale + (rows - 1) * gap;
  const out = new Uint8ClampedArray(w * h * 4);
  frames.forEach((f, i) => {
    const ox = (i % cols) * (WIDTH * scale + gap);
    const oy = Math.floor(i / cols) * (HEIGHT * scale + gap);
    for (let y = 0; y < HEIGHT * scale; y++) for (let x = 0; x < WIDTH * scale; x++) {
      const s = (Math.floor(y / scale) * WIDTH + Math.floor(x / scale)) * 4;
      const d = ((oy + y) * w + ox + x) * 4;
      out[d] = f[s]; out[d + 1] = f[s + 1]; out[d + 2] = f[s + 2]; out[d + 3] = 255;
    }
  });
  return { w, h, out };
}

export const frameOf = (scene, camX = 0) => composeFrame(scene, bakeScene(scene), camX, 0);

if (process.argv[1]?.endsWith('snes-bgshot.mjs')) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : Number(args.splice(i, 2)[1]); };
  const scale = opt('--scale', 2);
  const cols = opt('--cols', 1);
  const camX = opt('--x', 0);
  const [out, ...specs] = args;
  let frames;
  if (specs[0] === '--descents') {
    const { RECEPTION } = await import('../src/snes/bg/reception.mjs');
    frames = specs[2].split(',').map((d) => frameOf(buildArea({ ...RECEPTION, descent: Number(d) }), camX));
  } else {
    frames = [];
    for (const spec of specs) {
      const [, mod, area = '0', x = String(camX)] = spec.match(/^([\w-]+)(?::(\d+))?(?:@(\d+))?$/);
      const def = (await import(`../src/snes/bg/${mod}.mjs`)).default;
      frames.push(frameOf(def.areas?.[Number(area)] ?? def, Number(x)));
    }
  }
  const s = sheet(frames, { scale, cols });
  writeFileSync(out, png(s.w, s.h, s.out));
  console.log(out);
}
