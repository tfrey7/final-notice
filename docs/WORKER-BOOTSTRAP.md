# Worker bootstrap — read this first

You were spawned with a working directory that is **not this repo**, so you inherited some other
project's `CLAUDE.md` and none of ours. Read this, then your brief.

## 1. What this repo is

Final Notice is Tim's browser game: two underworld auditors, one night in a late-1980s office run by
corporate vampires, drawn as late-SNES pixel art in Phaser. Today it is only a title screen, live on
GitHub Pages at https://tfrey7.github.io/final-notice/. Everything else is still to be built.

**The design** lives outside this public repo, in `G:/Claude Stuff/final-notice-design/Final-Notice-Handoff/`.
`GAME-DESIGN.md` is authoritative; `STORYBOARD.md`, `ART-DIRECTION.md` and two concept paintings in
`art/` sit beside it. Never copy the design into this repo unless Tim says so.

**The plan, design and story docs in `docs/` are generated** from the fleet's knowledge base, which
is their source of truth: `BATTLEPLAN.md`, `GAMEPLAY-DESIGN.md`, `STORY.md`, the `SNES-*` and
`NES-ART-BIBLE` bibles and `docs/research/`. Never hand-edit one. Change it with `kb_update`, then
re-export with `py -3.10 scripts/kb_export.py --project final-notice --repo <worktree>` from the
fleet console and commit the result.

**Tim's rulings (2026-09-13, 17:08):**

- The escape stage uses different, smaller sprites at Contra III scale, not the design's large ones.
- Ward and Mercer each get a distinct twist in stage two.
- Art starts from the Pong project's 16-bit lessons in `G:/Claude Stuff/super-ultra-pong-64/docs/lessons/`,
  especially `era3-genesis.md`, `era4-snes.md` and `sprites.md`.
- Work comes in small chunks that Tim can see and decide on.
- Engine is Phaser (17:10). Tests stay light: this is a toy project, a few pure-logic tests, no browser tests.

## 2. Cut your own worktree

From anywhere:

```bash
py -3.10 "G:/Claude Stuff/fleet-console/scripts/start_worker.py" --name <branch> --repo "G:/Claude Stuff/final-notice"
```

It cuts `G:/Claude Stuff/final-notice-<branch>` off `master` and reserves a port. If it refuses and
you cannot clear what it named, run `git worktree add "G:/Claude Stuff/final-notice-<branch>" -b <branch> master`
from the main checkout. Work only in your own worktree. Quote every path (the space in
"Claude Stuff" breaks unquoted ones). `python` is not on PATH, so every Python command starts
`py -3.10`.

## 3. How to run it

A static page, nothing to build. ES modules do not load from `file://`, so serve the worktree on the
port `start_worker.py` reserved and open `index.html` there:

```bash
py -3.10 -m http.server <port> --directory "G:/Claude Stuff/final-notice-<branch>"
```

The native composition is 298x224 (4:3), zoomed by a whole number to fit the window
(`src/screen.mjs`). Phaser 4.2.1 is vendored as one file in `vendor/`: no npm, no CDN at runtime.

## 4. How to test it

`node --test` from the worktree root: headless, no dependencies, under a second. One file:
`node --test test/logic.test.mjs`. Only pure logic is tested; Phaser scenes are checked by screenshot.
Locally the headless-Chrome start test skips, and song renders whose sources match their last clean
pass skip (`test/*.clean.json`, rewritten by a local run: commit it with the song). The fleet's CI and
landing run `FINAL_NOTICE_FULL=1 node --test` from `fleet.json`, which runs and renders everything.

## 5. What never to commit

`.state/` and `.ci/` (the fleet's port claims and CI logs), `node_modules/`, logs, anything with a
key or an email. All of those are gitignored. The repo is **public**: no machine paths beyond this
doc, no design files, no secrets. Commits use the repo-local identity `Claude <noreply@anthropic.com>`.

## 6. Ports this repo owns

None. Your static server takes the port `start_worker.py` reserved. 8790 is Tim's live fleet console
and is never yours.

## 7. Screenshots (leave this section exactly as it is)

Every screenshot comes from one tool, in the fleet console:

```bash
py -3.10 "G:/Claude Stuff/fleet-console/scripts/shot.py" <url> <png> [--selector css]
py -3.10 "G:/Claude Stuff/fleet-console/scripts/shot.py" --url-file <local .html> <png>
```

It drives headless Chrome with a throwaway profile per shot, works on any URL including a plain
`file:///` page, and prints the PNG path. Open that with `Read`. Its flags are in the fleet
console's `docs/WORKER-BOOTSTRAP.md`, section 7.

**Do not use the Browser pane:** no `tabs_create`, `navigate`, `computer`, `resize_window` or
`preview_start`. It is one shared surface, and another worker's page can end up in your shot.

## 8. The tripwire hook (leave this section exactly as it is)

This repo's `.claude/settings.json` registers the fleet's tripwire guard, pointing by absolute path
at the one copy in the fleet console. The guard reads each shell command before it runs and logs
the ones that cross a line (Tim's game port, the human's ledger, master in a live checkout). It is
**log-only** and blocks nothing.

If the file is missing, restore it from the console rather than writing one by hand:

```bash
py -3.10 "G:/Claude Stuff/fleet-console/scripts/tripwire.py" --hooks     # which repos are registered
py -3.10 "G:/Claude Stuff/fleet-console/scripts/tripwire.py" --install   # write it where it is missing
```

`--install` never overwrites an existing settings file. It writes the file machine-locally and hides
it from `git status`, so in a fleet project, **commit it** anyway.

## 9. Traps

- **Publishing is a push.** GitHub Pages serves `master` from the root; the integrator's landing
  pushes `master` to `origin`, and that push is the redeploy. Nothing else publishes.
- **The shared global git email is private.** This checkout sets its own `user.email`; a fresh clone
  must do the same before committing.
- `*.mjs` everywhere, so `node --test` and the browser read the same modules without a `package.json`.
