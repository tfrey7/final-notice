// What the SNES sound test lists: every song, effect and voice line the game plays, the current take
// only, in game order. test/snes-soundtest.test.mjs fails on a cue the game no longer names.

const spaced = (key) => key.replace(/([A-Z])/g, ' $1').toLowerCase();

export const SOUND_TEST = {
  music: [
    ['title', 'Title theme'],
    ['scene', 'Story scenes'],
    ['stageStart', 'Stage start'],
    ['stage1', 'Stage 1 brawl'],
    ['vellum', 'Vellum duel'],
    ['vellum-pinch', 'Vellum duel, pinch'],
    ['stage2', 'Stage 2 escape'],
    ['archive-climb', 'Archive climb'],
    ['disposal', 'Disposal Line'],
    ['stage5', 'Stage 5 chapel brawl'],
    ['seal', 'The Great Seal'],
    ['backrooms', 'Stage 3 Backrooms'],
    ['shaft', 'Stage 4 elevator shaft'],
    ['bellwether', 'Bellwether, phase 1'],
    ['bellwether-2', 'Bellwether, phase 2'],
    ['bellwether-3', 'Bellwether, phase 3'],
    ['boss', 'Boss arena'],
    ['scene3', 'Scene 3 break room'],
    ['ending', 'Ending'],
    ['stageClear', 'Stage clear'],
    ['gameOver', 'Game over'],
    ['hold', 'Pause hold music'],
  ],
  effects: [
    'swing', 'hitLight', 'hitHeavy', 'finisher', 'thud', 'hurt', 'ko', 'block', 'guardSmash', 'objection',
    'roomClear', 'telegraph', 'staplerHit', 'binderHit', 'stampHit', 'deskSmash', 'cabinetSmash', 'weaponPickup',
    'punch', 'hit', 'knockdown', 'jump', 'land', 'grab', 'throw', 'step', 'heal',
    'injunction', 'cast', 'carbonCopy', 'redTape', 'margin', 'waxBreak', 'pickup', 'alarm', 'stamp', 'conveyor',
    'blip', 'menu', 'pause', 'pencil', 'stampOk', 'paperSlide', 'brassHit', 'relay',
    'buzz', 'phone', 'bassNote',
  ].map((key) => [key, spaced(key)]),
  voices: [
    ['vellumLine', 'Vellum'],
    ['sealLine', 'The Great Seal'],
  ],
};
