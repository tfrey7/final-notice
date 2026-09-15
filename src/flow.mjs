// The game's order of screens, the chosen auditor, lives, continues and checkpoints.
// Every event returns a new state, and the scenes only ever show `state.screen`.

// The whole run: Stage 2 is the Archive climb, Stage 4 the shaft and Stage 6 the capstone finale.
export const ORDER = ['title', 'select', 'scene1', 'stage1', 'scene2', 'archiveclimb', 'stage3', 'shaft', 'stage5', 'scene3', 'capstone', 'ending'];
// The first Stage 2 brawl to the Great Seal stays reachable by ?go and clears into Stage 3.
export const SCREENS = [...ORDER, 'stage2', 'gameover'];
export const STAGES = ['stage1', 'stage2', 'archiveclimb', 'stage3', 'shaft', 'stage5', 'capstone'];
export const RUN_STAGES = STAGES.filter((s) => ORDER.includes(s));
export const AUDITORS = ['ward', 'mercer'];

export const LIVES = 3;
export const CONTINUES = 3;

// The card shown before each stage of the run: its number and the floor it is on.
export const STAGE_CARDS = {
  stage1: ['STAGE 1', 'CLAIMS'],
  stage2: ['STAGE 2', 'THE GREAT SEAL'],
  archiveclimb: ['STAGE 2', 'THE ARCHIVE'],
  stage3: ['STAGE 3', 'THE BACKROOMS'],
  shaft: ['STAGE 4', 'THE EXPRESS SHAFT'],
  stage5: ['STAGE 5', 'THE EXECUTIVE CHAPEL'],
  capstone: ['STAGE 6', 'THE CAPSTONE'],
};

// A checkpoint at the start of every area of the brawl stages; area 5 of each is the boss room.
// The climbs keep their own checkpoints inside the stage.
export const CHECKPOINTS = {
  stage1: ['stage1-area1', 'stage1-area2', 'stage1-area3', 'stage1-area4', 'stage1-area5'],
  stage2: ['stage2-area1', 'stage2-area2', 'stage2-area3', 'stage2-area4', 'stage2-area5'],
  stage3: ['stage3-area1', 'stage3-area2', 'stage3-area3', 'stage3-area4'],
  stage5: ['stage5-area1', 'stage5-area2', 'stage5-area3', 'stage5-area4'],
};

export const SONGS = {
  title: 'title',
  select: 'title',
  scene1: 'scene',
  stage1: 'stage1',
  scene2: 'scene',
  stage2: 'stage2',
  archiveclimb: 'stage2',
  stage3: 'backrooms',
  shaft: 'shaft',
  stage5: 'stage5',
  scene3: 'scene',
  capstone: 'boss',
  ending: 'ending',
  gameover: 'gameOver',
};

export const isStage = (screen) => STAGES.includes(screen);

// The brawl lab's stage select: keys 1-6 open that stage of the run, which plays on from there.
export function stageSelectUrl(code, who) {
  const n = /^Digit([1-6])$/.exec(code)?.[1];
  return n ? `?snes&go=${RUN_STAGES[n - 1]}&who=${who}` : null;
}

// What the game over screen offers: CONTINUE only while continues remain.
export const gameOverChoices = (state) => (state.continues > 0 ? ['continue', 'end'] : ['end']);

// The scene a state shows: a stage entered from the run opens on its intro card first.
export const sceneFor = (state) => (state.intro && isStage(state.screen) ? 'intro' : state.screen);

// The flow state lives in the game registry; showing a state starts the scene for its screen.
export function showFlow(scene, state) {
  scene.registry.set('flow', state);
  const key = sceneFor(state);
  if (scene.scene.key !== key) scene.scene.start(key);
}

export function newGame() {
  return { screen: 'title', auditor: 'ward', lives: LIVES, continues: CONTINUES, stage: null, checkpoint: null };
}

function enter(state, screen) {
  if (isStage(screen)) return { ...state, screen, stage: screen, checkpoint: CHECKPOINTS[screen]?.[0] ?? null };
  return { ...state, screen };
}

const after = (screen) => (screen === 'stage2' ? 'stage3' : ORDER[ORDER.indexOf(screen) + 1]);

// Moving on through the run: a stage reached this way shows its intro card.
const advance = (state, screen) => ({ ...enter(state, screen), intro: isStage(screen) });

// Where `?go=<screen>` lands: a fresh game already standing on that screen.
export function jumpTo(screen) {
  const game = newGame();
  if (!SCREENS.includes(screen)) return game;
  if (screen === 'gameover') return { ...enter(game, 'stage1'), screen: 'gameover', lives: 0 };
  return enter(game, screen);
}

export function next(state, event) {
  switch (event.type) {
    case 'start': {
      if (state.screen === 'ending') return newGame();
      if (isStage(state.screen) || state.screen === 'gameover') return state;
      const auditor = state.screen === 'select' && AUDITORS.includes(event.auditor) ? event.auditor : state.auditor;
      const fresh = state.screen === 'title' ? newGame() : state;
      return advance({ ...fresh, auditor }, after(state.screen));
    }
    case 'introDone':
      return { ...state, intro: false };
    case 'stageClear': {
      if (!isStage(state.screen)) return state;
      const ending = event.ending ?? state.ending;
      const to = after(state.screen);
      const moved = isStage(to) ? advance(state, to) : { ...advance(state, to), stage: null, checkpoint: null };
      return ending ? { ...moved, ending } : moved;
    }
    case 'checkpoint':
      if (!isStage(state.screen) || !CHECKPOINTS[state.screen]?.includes(event.id)) return state;
      return { ...state, checkpoint: event.id };
    case 'lifeLost':
      if (!isStage(state.screen)) return state;
      if (state.lives > 1) return { ...state, lives: state.lives - 1 };
      return { ...state, lives: 0, screen: 'gameover' };
    case 'gameOver':
      if (!isStage(state.screen)) return state;
      return { ...state, lives: 0, screen: 'gameover' };
    case 'continue':
      if (state.screen !== 'gameover') return state;
      if (state.continues < 1) return newGame();
      return { ...state, screen: state.stage, lives: LIVES, continues: state.continues - 1, intro: false };
    case 'end':
      return state.screen === 'gameover' ? newGame() : state;
    default:
      return state;
  }
}
