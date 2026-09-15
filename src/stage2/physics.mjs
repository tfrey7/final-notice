// Stage 2's platforms as a grid of 16 px tiles: bodies stand on, bump into and fall past solid ones. Pure.
// A body is { x, y, vx, vy, w, h }: x is its centre, y its feet.

export const TILE = 16;

// An area is drawn as text: '#' solid, 'B' a target box, 'P' the start; any other character is air.
export function parseArea(map) {
  const cols = Math.max(...map.map((r) => r.length));
  const rows = map.length;
  const solid = new Uint8Array(cols * rows);
  const targets = [];
  let start = { x: TILE, y: rows * TILE };
  map.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch === '#') solid[row * cols + col] = 1;
      if (ch === 'B') targets.push({ x: col * TILE + TILE / 2, y: (row + 1) * TILE });
      if (ch === 'P') start = { x: col * TILE + TILE / 2, y: (row + 1) * TILE };
    });
  });
  return { cols, rows, width: cols * TILE, height: rows * TILE, solid, targets, start };
}

// Beyond the sides is wall; above is open sky; below is the pit.
export function solidAt(area, col, row) {
  if (col < 0 || col >= area.cols) return true;
  if (row < 0 || row >= area.rows) return false;
  return area.solid[row * area.cols + col] === 1;
}

export const solidPoint = (area, x, y) => solidAt(area, Math.floor(x / TILE), Math.floor(y / TILE));

const span = (a, b) => {
  const out = [];
  for (let i = Math.floor(a / TILE); i <= Math.floor((b - 0.001) / TILE); i++) out.push(i);
  return out;
};

// Moves a body by its velocity, one axis at a time. Answers what it hit.
export function moveBody(b, area) {
  const hw = b.w / 2;
  const hit = { wall: 0, ceiling: false, landed: false };
  if (b.vx) {
    const nx = b.x + b.vx;
    const col = Math.floor((b.vx > 0 ? nx + hw - 0.001 : nx - hw) / TILE);
    if (span(b.y - b.h, b.y).some((row) => solidAt(area, col, row))) {
      b.x = b.vx > 0 ? col * TILE - hw : (col + 1) * TILE + hw;
      hit.wall = Math.sign(b.vx);
      b.vx = 0;
    } else {
      b.x = nx;
    }
  }
  const ny = b.y + b.vy;
  const cols = span(b.x - hw, b.x + hw);
  if (b.vy > 0) {
    const row = Math.floor(ny / TILE);
    if (b.y <= row * TILE && cols.some((col) => solidAt(area, col, row))) {
      b.y = row * TILE;
      b.vy = 0;
      hit.landed = true;
      return hit;
    }
  } else if (b.vy < 0) {
    const row = Math.floor((ny - b.h) / TILE);
    if (b.y - b.h >= (row + 1) * TILE && cols.some((col) => solidAt(area, col, row))) {
      b.y = (row + 1) * TILE + b.h;
      b.vy = 0;
      hit.ceiling = true;
      return hit;
    }
  }
  b.y = ny;
  return hit;
}

// Both feet over solid ground: the ledge a pit fall returns to.
export function fullySupported(b, area) {
  if (b.y % TILE !== 0) return false;
  const row = b.y / TILE;
  return solidPoint(area, b.x - b.w / 2, b.y) && solidPoint(area, b.x + b.w / 2 - 0.001, b.y) && row < area.rows;
}
