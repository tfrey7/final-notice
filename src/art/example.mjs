// A wax seal that turns, and a small tiled floor: the smallest module in the art format.
export default {
  palettes: [[0x06, 0x16, 0x27]],
  tiles: {
    seal: ['00011111', '00122222', '01223333', '12233322', '12232222', '12232233', '12233322', '12223333'],
    edge: ['00000111', '00001222', '00012222', '00122222', '01222222', '01222222', '12222222', '12222222'],
    floor: ['11111111', '12222223', '12222223', '12222223', '12222223', '12222223', '12222223', '13333333'],
    grout: ['00000000', '01000000', '00000000', '00000100', '00000000', '00100000', '00000000', '00000000'],
  },
  animations: {
    turn: {
      fps: 4,
      frames: [
        { palette: 0, parts: [
          { tile: 'seal', x: 0, y: 0 }, { tile: 'seal', x: 8, y: 0, flipX: true },
          { tile: 'seal', x: 0, y: 8, flipY: true }, { tile: 'seal', x: 8, y: 8, flipX: true, flipY: true },
        ] },
        { palette: 0, parts: [
          { tile: 'edge', x: 0, y: 0 }, { tile: 'edge', x: 8, y: 0, flipX: true },
          { tile: 'edge', x: 0, y: 8, flipY: true }, { tile: 'edge', x: 8, y: 8, flipX: true, flipY: true },
        ] },
      ],
    },
  },
  backgrounds: {
    floor: {
      backdrop: 0x0f,
      palettes: [[0x07, 0x17, 0x27], [0x0c, 0x1c, 0x2c], [0x00, 0x10, 0x20], [0x08, 0x18, 0x28]],
      cols: 4,
      rows: 4,
      nametable: [
        'floor', 'floor', 'floor', 'grout',
        'grout', 'floor', 'floor', 'floor',
        'floor', 'grout', 'floor', 'floor',
        'floor', 'floor', 'grout', 'floor',
      ],
      attributes: [0, 1, 2, 3],
    },
  },
};
