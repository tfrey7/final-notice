// NES slowdown. The 6502 gets one NTSC frame of 29,780 cycles; when a frame's work (moving objects,
// checking collisions, filling the sprite table) overruns it, the game misses the next frame's
// update and runs at half speed until the work fits again, as Double Dragon II and Mega Man 2 did
// when the screen got busy. Music runs off the audio clock, so it keeps its tempo meanwhile. The SNES
// build shares the logic with its own budget (src/platform.mjs `slowdownBudget`).
//
// The per-item costs are estimates in CPU cycles to tune by feel (from memory, unverified): the
// fixed share covers the NMI, the sound driver, the pad and scrolling.

export const FRAME_CYCLES = 29780;
export const COST = { fixed: 9000, object: 900, collision: 120, sprite: 60 };

export function frameCost({ objects = 0, collisions = 0, sprites = 0 }, cost = COST) {
  return cost.fixed + objects * cost.object + collisions * cost.collision + sprites * cost.sprite;
}

// Every pair among `n` objects checked once.
export const pairs = (n) => (n * (n - 1)) / 2;

export function createSlowdown() {
  return { owed: false, lag: false, lagFrames: 0, cost: 0 };
}

// Called once a frame with that frame's work. Answers whether the game logic runs this frame: a
// frame after an overrun is a lag frame, spent finishing the previous one.
export function slowdownTick(sd, work, budget = FRAME_CYCLES) {
  sd.cost = frameCost(work);
  if (sd.owed) {
    sd.owed = false;
    sd.lag = true;
    sd.lagFrames++;
    return false;
  }
  sd.lag = false;
  sd.owed = sd.cost > budget;
  return true;
}
