# Code health review, 2026-09-15

Tim (17:55 EDT): "can we get someone to take a look at the final notice game code and review and see
if it needs to be cleaned up at all? so far game is running good, just want to stay on top of it".

A report only: no game code was changed. Measured on master at `d2c8105` (Intro and title screen,
#2283): 369 code files, 47,340 lines, 110 test files, 197 commits on 2026-09-15 alone.

**Verdict: the game is in good shape for how fast it grew.** Game rules are kept apart from the
drawing, so most of them are tested without a browser, and there is very little dead code. The
cost of today's pace shows in four places: where the fight numbers live, one scene everybody edits,
copied climb stages, and two slow tests. The fifth item is the frozen NES build still sharing the
SNES start-up file.

## The five cleanups, most useful first

Ordered by how much each speeds up the next month of gameplay work (Mercer's kit, the boss roster,
more brawl and climb stages).

### 1. One place for the SNES fight numbers (about 60 min)

**Problem.** A move's feel is two numbers in two files that you add or multiply in your head. The
NES base values sit in `src/stage1/moves.mjs` (`TUNING`), `src/stage1/tuning.mjs` (five tables),
`src/stage1/staff.mjs` (`KINDS`, `CROWD`), `src/stage1/vellum.mjs`, `src/stage1/weapons.mjs` and
`src/stage2/escape.mjs` / `foes.mjs`. The SNES then scales them and adds frames in
`src/snes/weight.mjs` (`BRAWL_WEIGHT`, `STAFF_WEIGHT` and friends, "Only the SNES scenes read it, so
the NES keeps its numbers"). Stage 5 has its own `RITUAL` table in `src/snes/stage5/chapel.mjs`, and
the brawl lab keeps a third copy of ranges in `src/lab/dials.mjs`.

**Evidence.** Seven files declare tuning tables. `BRAWL_WEIGHT` is read by 4 source files and 11
test files. Both pacing cards today (#2271 slow brawls, #2278 heavier weights) had to change the
weight layer and then repair stage bots; lessons 542 and 654 are both about timing counts flipping.
A punch's real recovery is `TUNING.punchRecovery + BRAWL_WEIGHT.frames.punchRecovery`, which no one
can read off a single line.

**Fix.** Resolve the weighed numbers once into SNES tables (one per fighter, foe kind and boss),
registered with `?tune` as today, and let the NES keep its untouched base tables. The multiplier
layer goes away for the SNES.

**Parallel?** Collides with Mercer's kit (#2288, running) and any boss card. Run it right after
Mercer's kit lands, before the boss roster starts.

### 2. Split the Stage 1/3/5 brawl scene (about 45 min)

**Problem.** `src/snes/stage1/scene.mjs` (539 lines, 30 kB) is the single most-edited game file:
29 commits in 7 days, second only to `src/main.mjs`. One class plays Stages 1, 3 and 5
(`SnesStage3Scene` and `SnesStage5Scene` are 7-line subclasses). It imports about 50 modules, sets
41 fields, and its `create`, `update` and `draw` run 79, 85 and 73 lines.

**Evidence.** Pacing, barks, enemy voices, Ward's kit, the HUD, the Vellum fight, the chapel and the
finisher all landed in this one file today, which is where landing clashes come from when two brawl
cards run together.

**Fix.** Move the sound and bark wiring, the HUD and title-card drawing, and Vellum's office into
their own modules beside the scene, and give Stages 3 and 5 a per-stage hook file each so their
bosses don't have to be written into Stage 1's scene.

**Parallel?** Collides with every brawl card (Mercer's kit, HUD art pass #2313). Needs a quiet
window: file it as the first card after Mercer's kit, or run it together with item 1 as one card.

### 3. One shared climb stage instead of three copies (about 40 min)

**Problem.** Stages 2 (archive climb), 4 (elevator shaft) and 6 (capstone) and the climb lab were
each built by copying the last one.

**Evidence.** Identical lines, ignoring imports and comments:

| Pair | Identical lines |
| --- | --- |
| `src/stage4/shaft.mjs` vs `src/stage6/capstone.mjs` (rules: grid, ledges, lives, respawn) | 71 of 162 |
| `src/snes/stage2/climb.mjs` vs `src/snes/stage4/shaft.mjs` (scene: HUD, bot, controls, titles) | 66 of 129 |
| `src/snes/lab/climb.mjs` vs `src/snes/stage2/climb.mjs` | 64 of 154 |
| `src/stage2/summit.mjs` vs `src/stage6/bellwether.mjs` (boss rooms) | 17 shared 4-line runs |

A climb fix today has to be made three or four times, and the copies have already started to drift.

**Fix.** A climb builder (grid, ledge, cable, respawn) in one rules module and one base climb scene
the three stages and the lab extend, each keeping only its own layout, hazards and boss.

**Parallel?** Safe to run now. No running or queued card touches the climb stages.

### 4. Cut the test suite from 30 s to a few seconds (about 20 min)

**Problem.** `node --test` takes **30 s** wall time, not the "under a second" the bootstrap
promises, and the fleet's CI runs the whole suite on every request (scoped runs do not narrow in
this repo), several times per card.

**Evidence.** Timed file by file:

| Test file | Time | Why |
| --- | --- | --- |
| `test/snes-clipping.test.mjs` | 18.1 s | renders all 28 songs for a whole pass plus 4 s, sample by sample |
| `test/snes-start-e2e.test.mjs` | 12.1 s | launches headless Chrome and presses Enter from title to Stage 1 |
| `test/snes-cues.test.mjs` | 5.4 s | |
| the other 107 files | 0.5-2.4 s each | |

The browser test also cuts against Tim's 2026-09-13 ruling ("a few pure-logic tests, no browser
tests"), though it has caught real stalls in the start-up path.

**Fix.** Let the clipping test skip a song whose file hash matches its last clean render (a small
committed table), so only changed songs render; run the browser test only when the landing tool
runs the full suite (an environment flag), or make it a tool.

**Parallel?** Safe to run now; it touches only tests.

### 5. Give the frozen NES build its own start-up file (about 30 min)

**Problem.** The NES build is "frozen, playable and kept" (`docs/SNES-PLAN.md`), but it still shares
`src/main.mjs` with the SNES game. That file was changed 35 times in 7 days, more than any other,
and every new SNES screen has to thread through its `snes ? SnesX : X` choices.

**Evidence.** `src/main.mjs` imports eight NES-only scenes (`src/nes/testscene.mjs`,
`src/nes/artscene.mjs`, `src/stage1/scene.mjs`, `src/stage2/scene.mjs`, `src/scenes/title.mjs`,
`select.mjs`, `gameover.mjs`, `ending.mjs`), so every SNES page load also downloads them. Both SNES
stage scenes import frame slowdown from `src/nes/slowdown.mjs`. The NES-only sound sets (`-v1` songs,
`src/audio/sfx-v1.mjs`) and NES pixel data (`src/art/staff2.mjs` 1,500 lines, `ward.mjs` 1,482,
`cast.mjs` 1,068) are loaded by name and still work; they just sit beside the live code.

**Fix.** A separate NES start-up file for `?nes` pages, a slimmer SNES `main.mjs`, and slowdown moved
to a shared module. Nothing is deleted.

**Parallel?** Collides with the intro and title cards (#2311 running, #2310, #2312 queued), which
edit `main.mjs` and the start-up path. Run it after those land.

## What is healthy: leave it alone

- **Rules apart from drawing.** Moves, players, areas, foes, weapons and the climb physics are plain
  modules tested without Phaser, and the stage bots play whole stages in tests (Stages 1, 3 and 5
  in under a second each). This is what lets many cards land a day; keep every new fight rule there.
- **Live tuning.** `registerTuning` and `?tune`, and the brawl lab's dials. The mechanism is right;
  item 1 only changes where the numbers live.
- **The SNES sound engine.** `src/snes/audio/` (DSP, sample bank, sequencer, one file per song) is
  well tested and cleanly split.
- **No build step.** Vendored Phaser, plain `.mjs` modules and a service worker that only
  revalidates. Don't add a bundler.
- **Dead code is scarce.** Almost every file that no import reaches is loaded by name (the sound
  test's songs, `?art=<name>`, the debug screens). Nothing is worth a deletion card.
- **Big data files.** Background and pixel-art modules (`src/snes/bg/claims2.mjs`,
  `src/snes/art/ward.mjs`) are large because they are pictures; splitting them buys nothing.

## Also noticed, not ranked

- `docs/shots/` holds 414 committed screenshots, 76 MB, and the packed repository is 94 MB. It does
  not slow gameplay work (a worktree still cuts in 2 s) but every one ships to GitHub Pages.

## Which can run beside the gameplay cards

| Cleanup | Beside gameplay cards? |
| --- | --- |
| 3. Shared climb stage | yes, now |
| 4. Faster tests | yes, now |
| 1. One place for fight numbers | after Mercer's kit (#2288) lands |
| 2. Split the brawl scene | after Mercer's kit; not beside any brawl or HUD card |
| 5. NES start-up file | after the intro and title cards (#2310, #2311, #2312) land |
