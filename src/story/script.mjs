// Every word the game says. A beat either has one `line`, or `ward` and `mercer` lines when the
// speaker is the chosen auditor; only that auditor ever speaks.

export const AUDITORS = ['ward', 'mercer'];

export const SPEAKERS = {
  bellwether: 'BELLWETHER',
  vellum: 'VELLUM',
  speaker: 'SPEAKER',
  ward: 'WARD',
  mercer: 'MERCER',
};

export const SCENES = {
  assignment: {
    title: 'THE ASSIGNMENT',
    beats: [
      { picture: 'bellwether-office', speaker: 'bellwether', line: 'They billed one customer for forty-seven lifetimes.' },
      { picture: 'auditor', speaker: 'auditor', ward: 'He died on Tuesday.', mercer: 'Forty-seven?' },
      { picture: 'bellwether', speaker: 'bellwether', line: "I read it. That's why you're here. Get the original ledger." },
      { picture: 'bellwether', speaker: 'bellwether', line: 'If they lean on you, they answer to me.' },
      { picture: 'bellwether', speaker: 'bellwether', line: 'And call before you make the evening news.' },
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
