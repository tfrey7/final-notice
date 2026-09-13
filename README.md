# Final Notice

Two underworld auditors investigate a company-sized discrepancy in the accounts of the dead, over one
long night in a late-1980s corporate office. A browser-only arcade action game in SNES-era pixel art:
one beat-'em-up stage, then one ranged-magic escape.

**Play it:** https://tfrey7.github.io/final-notice/

Today it is a title screen. It is built in small pieces, each one visible on the live page.

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
