// Every word the game says. A beat either has one `line`, or `ward` and `mercer` lines when the
// speaker is the chosen auditor; only that auditor ever speaks.

export const AUDITORS = ['ward', 'mercer'];

export const SPEAKERS = {
  bellwether: 'BELLWETHER',
  vellum: 'VELLUM',
  speaker: 'SPEAKER',
  tuesday: 'TUESDAY',
  ward: 'WARD',
  mercer: 'MERCER',
};

export const SCENES = {
  assignment: {
    title: 'THE ASSIGNMENT',
    beats: [
      { picture: 'bellwether-office', speaker: 'bellwether', line: 'The company in the tower billed one of its clerks for forty-seven lifetimes.' },
      { picture: 'bellwether', speaker: 'bellwether', line: 'He died on Tuesday. They still have him at his desk.' },
      { picture: 'auditor', speaker: 'auditor', ward: 'Then his notice is overdue.', mercer: 'So we go and get him.' },
      { picture: 'bellwether', speaker: 'bellwether', line: 'Serve him. Then find their Master File, the original books.' },
      { picture: 'bellwether', speaker: 'bellwether', line: 'Bring it to me. Nobody else.' },
    ],
  },
  incident: {
    title: 'THE INCIDENT',
    beats: [
      { picture: 'vellum-desk', speaker: 'vellum', line: 'The original records were destroyed in the incident.' },
      { picture: 'auditor', speaker: 'auditor', ward: 'What incident?', mercer: 'Which incident?' },
      { picture: 'retention-button', speaker: 'vellum', line: 'This one.', sound: 'alarm' },
      { picture: 'ledger-glow', speaker: 'auditor', ward: 'The original is downstairs.', mercer: "Then I'm going downstairs." },
      { picture: 'ledger-glow', speaker: 'bellwether', line: 'Get yourself out. With the ledger if you can.' },
      { picture: 'vellum-desk', speaker: 'tuesday', line: "You're from the agency? I'm the one they billed. I wrote the billing myself." },
      { picture: 'vellum-desk', speaker: 'tuesday', line: "I'm sorry. Everything that matters is upstairs. Please don't leave me at this desk." },
    ],
  },
  documents: {
    title: 'ORIGINAL DOCUMENTS',
    beats: [
      { picture: 'ledger-page', speaker: 'auditor', ward: 'Every transfer was approved.', mercer: 'Signed off at the top.' },
      { picture: 'wall-speaker', speaker: 'speaker', line: 'Your inspection is suspended. Surrender the original documents.' },
      { picture: 'break-room', speaker: 'auditor', ward: 'An unusually prompt response.', mercer: "That didn't take long." },
      { picture: 'bellwether-phone', speaker: 'bellwether', line: 'You did your job. Now let me do mine. Bring me the ledger.' },
      { picture: 'break-room', speaker: 'auditor', ward: 'The scope has expanded.', mercer: "We're going to need a bigger file." },
    ],
  },
};

export const SCENE_ORDER = ['assignment', 'incident', 'documents'];

// One-line remarks in a small box at three quiet moments of play.
export const REMARKS = {
  reception: { ward: 'They kept the original fittings.', mercer: 'Nice place. Shame about the management.' },
  firstAid: { ward: 'Fully stocked.', mercer: 'Good. Somebody did their job.' },
  vellumOffice: { ward: "This wasn't on the floor plan.", mercer: 'Somebody found the budget.' },
};

// The story beats played DURING a floor (src/stage1/beats.mjs): two or three lines with portraits,
// over the fight, never pausing it. `picture` is the portrait beside the box.
export const FLOOR_TALK = {
  serviceFloor: [
    { picture: 'auditor', speaker: 'auditor', ward: 'Nobody has left their desk.', mercer: "They're all still working." },
    { picture: 'bellwether-phone', speaker: 'bellwether', line: 'They cannot. Their contracts outlived them.' },
  ],
  waitingDoor: [
    { picture: 'auditor', speaker: 'auditor', ward: 'His office is through the waiting room.', mercer: 'Last door. Good.' },
    { picture: 'wall-speaker', speaker: 'speaker', line: 'Mr Vellum will see you now.' },
  ],
  backrooms: [
    { picture: 'break-room', speaker: 'auditor', ward: 'The carpet is wet.', mercer: 'Something down here leaks.' },
    { picture: 'bellwether-phone', speaker: 'bellwether', line: 'Keep going down. The originals are below the water table.' },
  ],
  backrooms2: [
    { picture: 'break-room', speaker: 'auditor', ward: 'This is the same room.', mercer: 'We have been here. Twice.' },
  ],
  chapel: [
    { picture: 'auditor', speaker: 'auditor', ward: 'They built a chapel into the accounts floor.', mercer: 'Who do they pray to up here?' },
    { picture: 'wall-speaker', speaker: 'speaker', line: 'To the shareholder. Kneel or be filed.' },
  ],
  chapel2: [
    { picture: 'auditor', speaker: 'auditor', ward: 'The altar is a desk.', mercer: 'Of course it is.' },
  ],
};

// One floor talk as the chosen auditor hears it.
export const talkFor = (id, auditor) => (FLOOR_TALK[id] ?? []).map((beat) => ({
  picture: beat.picture,
  speaker: SPEAKERS[beat.speaker === 'auditor' ? auditor : beat.speaker],
  line: lineFor(beat, auditor),
}));

export const PROMPTS = ['PUNCH', 'STEP', 'THROW', 'CAST', 'AIM', 'GO'];

export const SELECT = {
  ward: { name: 'ELLIS WARD', line: 'Long reach. Reads every page.' },
  mercer: { name: 'FRANK MERCER', line: 'Short fuse. Hits the margins.' },
};

export const SYSTEM = {
  pushStart: 'PUSH START',
  pause: 'PAUSE',
  gameOver: 'GAME OVER',
  continue: 'CONTINUE',
  end: 'END',
  theEnd: 'THE END',
  evidence: 'EVIDENCE',
};

export const CREDITS = [
  'FINAL NOTICE',
  '',
  'DESIGN',
  'TIM',
  '',
  'BUILT BY',
  'THE FLEET',
  '',
  'NO LEDGER WAS HARMED',
  '',
  'THANK YOU FOR PLAYING',
];

export function lineFor(beat, auditor) {
  return beat.speaker === 'auditor' ? beat[auditor] : beat.line;
}

// A scene as the chosen auditor sees it: every beat with its speaker's name and its one line.
export function beatsFor(scene, auditor) {
  return SCENES[scene].beats.map((beat) => ({
    picture: beat.picture,
    speaker: SPEAKERS[beat.speaker === 'auditor' ? auditor : beat.speaker],
    line: lineFor(beat, auditor),
    sound: beat.sound ?? null,
  }));
}
