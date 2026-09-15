// How each story scene is acted, beside the words in src/story/script.mjs and never changing them.
// `acting` is a wordless page first: the play sprites on keyframes [frame, x, feet, pose] in the room.
// `beats[i]` stages the script's beat i: `music` ('cut', 'pad' or a cue name), `fx`, a `portrait`
// override and `actors`. `cuts` makes every change of picture after the opening a hard cut.
export const STAGING = {
  assignment: {
    cuts: true,
    fadeAfter: 120,
    acting: {
      backdrop: 'bellwether-office',
      frames: 240,
      actors: [
        { who: 'bellwether', keys: [[0, 58, 104, 'back']] },
        { who: 'auditor', keys: [[0, 280, 142, 'front'], [40, 280, 142, 'front'], [170, 226, 142, 'front']] },
      ],
    },
    beats: [
      {},
      { music: 'pad' },
      { music: 'scene', fx: 'bill', portrait: null },
      { fx: 'lamp' },
      {
        portrait: null,
        actors: [
          { who: 'bellwether', keys: [[0, 128, 104, 'front'], [30, 128, 104, 'front'], [60, 104, 104, 'back'], [110, 58, 104, 'back']] },
          { who: 'auditor', keys: [[0, 226, 142, 'front'], [70, 226, 142, 'front'], [130, 290, 142, 'back']] },
        ],
      },
    ],
  },
};
