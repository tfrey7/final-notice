// The game's order of screens, the chosen auditor, lives, continues and checkpoints.
// Pure: every event returns a new state, and the scenes only ever show `state.screen`.

export const ORDER = ['title', 'select', 'scene1', 'stage1', 'scene2', 'stage2', 'scene3', 'ending'];
export const SCREENS = [...ORDER, 'gameover'];
export const STAGES = ['stage1', 'stage2'];
export const AUDITORS = ['ward', 'mercer'];

export const LIVES = 3;
export const CONTINUES = 3;

// A checkpoint at the start of every area; area 5 of each stage is the boss room.
export const CHECKPOINTS = {
  stage1: ['stage1-area1', 'stage1-area2', 'stage1-area3', 'stage1-area4', 'stage1-area5'],
  stage2: ['stage2-area1', 'stage2-area2', 'stage2-area3', 'stage2-area4', 'stage2-area5'],
};

export const SONGS = {
  title: 'title',
  select: 'title',
  scene1: 'scene',
  stage1: 'stage1',
  scene2: 'scene',
  stage2: 'stage2',
  scene3: 'scene',
  ending: 'ending',
  gameover: 'gameOver',
};

export const isStage = (screen) => STAGES.includes(screen);

export function newGame() {
  return { screen: 'title', auditor: 'ward', lives: LIVES, continues: CONTINUES, stage: null, checkpoint: null };
}

function enter(state, screen) {
  if (isStage(screen)) return { ...state, screen, stage: screen, checkpoint: CHECKPOINTS[screen][0] };
  return { ...state, screen };
}

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
      return enter({ ...fresh, auditor }, ORDER[ORDER.indexOf(state.screen) + 1]);
    }
    case 'stageClear':
      if (!isStage(state.screen)) return state;
      return { ...enter(state, ORDER[ORDER.indexOf(state.screen) + 1]), stage: null, checkpoint: null };
    case 'checkpoint':
      if (!isStage(state.screen) || !CHECKPOINTS[state.screen].includes(event.id)) return state;
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
      return { ...state, screen: state.stage, lives: LIVES, continues: state.continues - 1 };
    case 'end':
      return state.screen === 'gameover' ? newGame() : state;
    default:
      return state;
  }
}
