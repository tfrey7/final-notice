/* global Phaser */
// What both builds' start-up files share: reading where the run starts from the address, and booting Phaser.
import { installCrt } from './crt/display.mjs';
import { AUDITORS, CHECKPOINTS, SCREENS, jumpTo, next, sceneFor } from './flow.mjs';

// ?fast gives foes and bosses cheap health, ?go=<screen> starts on any screen, ?who=<auditor> picks who is
// playing; ?go=vellum and ?go=greatseal are each stage at its boss room's checkpoint, and ?go=stage1&area=<1-5>,
// ?go=stage2&area=<1-5> ?go=stage3&area=<1-4> or ?go=stage5&area=<1-4> starts that stage at the area's checkpoint.
const BOSSES = { vellum: ['stage1', 'stage1-area5'], greatseal: ['stage2', 'stage2-area5'] };

export function startFrom(params) {
  const boss = BOSSES[params.get('go')];
  const start = boss
    ? next(jumpTo(boss[0]), { type: 'checkpoint', id: boss[1] })
    : jumpTo(params.get('go') ?? 'title');
  const area = start.stage && CHECKPOINTS[start.stage]?.[Number(params.get('area')) - 1];
  if (area) Object.assign(start, next(start, { type: 'checkpoint', id: area }));
  if (AUDITORS.includes(params.get('who'))) start.auditor = params.get('who');
  // ?go=<stage>&intro opens that stage on its intro card.
  if (params.has('intro')) start.intro = true;
  return start;
}

// Every screen's scene, the one the run starts on first.
export function sceneOrder(scenes, start) {
  const first = scenes[sceneFor(start)];
  return [first, ...[...SCREENS, 'intro'].map((k) => scenes[k]).filter((s) => s !== first)];
}

export function boot(profile, scene, start, params) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: profile.WIDTH,
    height: profile.HEIGHT,
    backgroundColor: profile.background,
    pixelArt: true,
    roundPixels: true,
    // Every scene steps one 60 fps frame per update, so a 120 or 144 Hz screen would play at double speed.
    fps: { limit: 60 },
    render: { preserveDrawingBuffer: true },
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: profile.zoom(window.innerWidth, window.innerHeight),
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
  });
  game.registry.set('flow', start);
  window.finalNotice = game;
  window.finalNoticeCrt = installCrt(game, params);

  window.addEventListener('resize', () => {
    game.scale.setZoom(profile.zoom(window.innerWidth, window.innerHeight));
  });
  return game;
}
