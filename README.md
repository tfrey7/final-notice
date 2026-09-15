# Final Notice

Two underworld auditors investigate a company-sized discrepancy in the accounts of the dead, over one
long night in a late-1980s corporate office. A browser-only arcade action game in SNES-era pixel art:
one beat-'em-up stage, then one ranged-magic escape.

**Play it:** https://tfrey7.github.io/final-notice/

It is being rebuilt as an NES game (`docs/NES-PLAN.md`). Today PUSH START walks the whole game's order
as labelled placeholder screens: title, select, scene 1, stage 1, scene 2, stage 2, scene 3, ending,
with game over and continue. It is built in small pieces, each one visible on the live page.

## Controls

The game is played on one NES pad; the keyboard and any gamepad both drive it.

| NES pad | Keyboard | Gamepad |
| --- | --- | --- |
| D-pad | arrows or WASD | d-pad or left stick |
| B | Z or J | X / left face |
| A | X or K | A / bottom face |
| Select | Shift | Back / Select |
| Start | Enter | Start |

Under `?snes` the game is played on an SNES pad instead, and the NES double tap and A+B become
real buttons.

| SNES pad | Keyboard | Gamepad | Stage 1 | Stage 2 |
| --- | --- | --- | --- | --- |
| D-pad | arrows or WASD | d-pad or left stick | walk | walk, crouch, aim |
| Y | Z or J | X / left face | punch, grab | cast |
| B | X or K | A / bottom face | jump | jump |
| A | C or L | B / right face | Emergency Injunction | Emergency Injunction |
| X | V or I | Y / top face | Objection parry | swap enchantment |
| L / R | Q / E | shoulders or triggers | step back / forward | R held: stand and aim |
| Start | Enter | Start | pause, skip scene | pause, skip scene |

Double tap left or right to run. Every key above belongs to the pad: the display mode (CRT, sharp
pixels, composite) cycles on backtick or F2, and the labs' dial panel opens on Tab. The pause screen
and both labs list these controls for the stage.

On a placeholder stage, Start clears it, B loses a life and A reaches the next checkpoint.
`?go=<screen>` starts on any screen (`title`, `select`, `scene1`, `stage1`, `scene2`, `stage2`,
`scene3`, `ending`, `gameover`); `?demo` presses the buttons by itself.

## Run it locally

The game is a static page with nothing to install. Browsers refuse ES modules from `file://`, so
serve the folder with any static server and open it:

```bash
py -3.10 -m http.server 8000     # or: npx serve, or any static server
# then open http://localhost:8000/
```

Phaser 4.2.1 is vendored in `vendor/`; there is no package manager, no build and no CDN.

## Tests

```bash
node --test
```

Headless tests of the pure game logic in `src/`, no dependencies, under a second.

## Publishing

GitHub Pages serves `master` from the repository root. Every push to `master` republishes the page.
