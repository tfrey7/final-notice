// Stage 6 as a grey-box finale under ?snes&go=capstone: the auditor climbs the inside of the pyramid capstone
// by girder and cable ahead of the Seal's breathing shadow and its reaching hand, fights Bellwether bound to
// the Great Seal at the crown, and makes the final choice. Boxes stand in for every sprite, and there is no
// sound yet. &at=crown starts at the fight; ?bot lets the finale bot play; ?frames=<n> plays that many
// frames first (with the bot under ?bot), for a screenshot.
import { WIDTH, HEIGHT } from '../screen.mjs';
import { drawString, measure } from '../text.mjs';
import { rgb15 } from '../color.mjs';
import { TILE } from '../../stage2/physics.mjs';
import { PHASES, slamBox, stampBox } from '../../stage6/bellwether.mjs';
import {
  ARENA, CAPSTONE, CHECKPOINT_LEDGE, CHOICES, CHOICE_DELAY, ENDINGS, FLOORS, HAND, TOP_LEDGE,
  createCapstone, floorsClimbed, handReach, inhaling, startAtCrown, stepCapstone,
} from '../../stage6/capstone.mjs';
import { botButtons, createBot } from '../../stage6/finalebot.mjs';
import { playSong } from '../audio/player.mjs';
import { bellwetherSong } from '../audio/cues.mjs';
import { ClimbStageScene, DIM, RED, WHITE } from '../climb/scene.mjs';

const GREY = { back: 0x24222a, course: 0x2e2b36, tile: 0x6a6872, edge: 0x8a8892, cable: 0x9a9aa2 };
const SHADE = { body: 0x1a1024, edge: 0x5a3a78, swell: 0x8a5ab0, hand: 0x2a1838, warn: 0xc080ff };
const VIOLET = rgb15(24, 16, 31);
const INK = rgb15(6, 6, 8);
const PLUM = rgb15(12, 6, 18);
const centreX = (text) => Math.round((WIDTH - measure(text)) / 2);

export class SnesCapstoneScene extends ClimbStageScene {
  constructor() {
    super('capstone');
    Object.assign(this, { retryAfter: 60, bots: { botButtons, createBot } });
  }

  setup(params) {
    this.crown = params.get('at') === 'crown';
  }

  fresh() {
    const s = createCapstone(this.who);
    if (this.crown) startAtCrown(s);
    return s;
  }

  step(s, pad) {
    stepCapstone(s, pad);
  }

  // Bellwether's theme from the moment the crown is reached, a harder song at each phase, and the
  // stage-clear jingle once the Seal is taken.
  cue() {
    const { s } = this;
    const song = s.fight?.beaten ? 'stageClear' : s.part === 'climb' || !s.fight ? null : bellwetherSong(s.fight.phase);
    if (song && song !== this.playing) playSong(this.playing = song);
  }

  draw() {
    const { s } = this;
    const { area } = s.run;
    const camY = Math.round(s.camY);
    const g = this.frameView(area, camY);
    g.fillStyle(GREY.back).fillRect(-32, camY - 8, area.width + 64, HEIGHT + 16);
    this.drawSlope(g, area, camY);
    this.drawTiles(g, area, camY, GREY.tile, GREY.edge);
    if (s.part === 'climb') this.drawClimb(g, camY);
    else this.drawCrown(g);
    this.drawPlayer(g);
    if (s.part === 'climb') this.drawShadow(g, area, camY);
    this.drawHud();
  }

  // The capstone's walls lean in as the climb rises: dark stone courses outside a narrowing line.
  drawSlope(g, area, camY) {
    const lean = this.s.part === 'climb' ? (y) => 8 + 64 * (1 - y / area.height) : () => 72;
    for (let y = Math.floor(camY / 8) * 8; y < camY + HEIGHT + 8; y += 8) {
      const inset = Math.round(lean(y));
      g.fillStyle(GREY.course).fillRect(-32, y, 32 + inset, 8).fillRect(area.width - inset, y, inset + 32, 8);
      if (y % 32 === 0) g.fillStyle(0x3a3644).fillRect(-32, y, 32 + inset, 1).fillRect(area.width - inset, y, inset + 32, 1);
    }
  }

  drawClimb(g, camY) {
    const { s } = this;
    this.drawCables(g, CAPSTONE.cables, [camY - 8, camY + HEIGHT + 8], GREY.cable);
    this.drawFlag(g, CHECKPOINT_LEDGE, s.checkpoint);
    const gate = ((TOP_LEDGE.c0 + TOP_LEDGE.c1 + 1) / 2) * TILE;
    const top = TOP_LEDGE.row * TILE;
    g.fillStyle(0x8a7a40).fillRect(gate - 16, top - 44, 32, 44);
    g.fillStyle(0x100c14).fillRect(gate - 12, top - 40, 24, 40);
  }

  drawShadow(g, area, camY) {
    const { s } = this;
    const sh = s.shadow;
    const sy = Math.round(sh.y);
    const bottom = camY + HEIGHT + 8;
    const swell = sh.clock > 0 && inhaling(sh);
    g.fillStyle(SHADE.body).fillRect(8, sy, area.width - 16, Math.max(0, bottom - sy));
    for (let x = 8; x < area.width - 8; x += 8) {
      const lift = Math.round(2 + 2 * Math.sin((x + sh.clock * (swell ? 3 : 1)) / 10));
      g.fillStyle(swell ? SHADE.swell : SHADE.edge).fillRect(x, sy - lift, 8, lift + 2);
    }
    const hand = sh.hand;
    if (hand) {
      const reach = Math.round(handReach(hand) * HAND.height);
      if (reach) {
        g.fillStyle(SHADE.hand).fillRect(hand.x - HAND.w / 2, sy - reach, HAND.w, reach);
        for (let i = 0; i < 4; i++) g.fillStyle(SHADE.swell).fillRect(hand.x - HAND.w / 2 + i * 6, sy - reach - 6, 3, 8);
      } else if (hand.t % 8 < 4) g.fillStyle(SHADE.warn).fillRect(hand.x - HAND.w / 2, sy - 4, HAND.w, 4);
    }
    if (sy > camY + HEIGHT - 4) {
      const near = Math.max(0, 1 - (sy - camY - HEIGHT) / 120);
      for (let x = 8; x < area.width - 8; x += 16) g.fillStyle(swell ? SHADE.warn : SHADE.swell, 0.3 + 0.7 * near).fillRect(x, camY + HEIGHT - 3, 8, 3);
    }
  }

  // Bellwether chained to the Great Seal, which hangs over the crown and comes down on the slam.
  drawCrown(g) {
    const { s } = this;
    const b = s.fight;
    const t = s.boss;
    const { x0, x1, y } = ARENA;
    let [sx, sy] = [(x0 + x1) / 2, 44];
    if (b.state === 'tell' && b.attack === 'slam') {
      const k = 1 - b.timer / t.slamTell[b.phase - 1];
      sx += (b.slamX - sx) * Math.min(1, k * 2);
      g.fillStyle(0x000000, 0.3 + 0.5 * k).fillEllipse(b.slamX, y - 2, t.slamW * (0.5 + 0.5 * k), 6);
    }
    if (b.state === 'slam') [sx, sy] = [slamBox(b, t).x, y - 22];
    if (!b.beaten) {
      g.lineStyle(1, 0x807060).lineBetween(sx - 6, sy + 18, b.x - 4, b.y - b.h + 10).lineBetween(sx + 6, sy + 18, b.x + 4, b.y - b.h + 10);
    }
    g.fillStyle(b.beaten ? 0xe8d890 : 0x8a7040).fillCircle(sx, sy, 22);
    g.fillStyle(0x3a2a18).fillCircle(sx, sy, 15);
    g.fillStyle(b.state === 'roar' ? 0xff6040 : 0xc0a060).fillCircle(sx, sy, 6);

    if (b.beaten) g.fillStyle(0x3a3440).fillRect(b.x - 18, b.y - 8, 36, 8);
    else {
      const colour = b.flash % 2 ? 0xffffff : b.state === 'reel' ? 0x6080c0 : b.state === 'roar' ? 0xa04040 : 0x5a4a6a;
      g.fillStyle(colour).fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
      g.fillStyle(0xe0e0e0).fillRect(b.facing > 0 ? b.x + 2 : b.x - 6, b.y - b.h + 8, 4, 3);
      if (b.guard) g.lineStyle(1, 0xc0b080, 0.8).strokeRect(b.x - b.w / 2 - 3, b.y - b.h - 3, b.w + 6, b.h + 6);
      if (b.state === 'tell' && b.timer % 6 < 3) g.fillStyle(0xffe040).fillRect(b.x - 3, b.y - b.h - 12, 6, 6);
      const box = stampBox(b, t);
      if (b.state === 'tell' && b.attack === 'stamp') g.lineStyle(1, 0xffe040, 0.7).strokeRect(box.x - box.w / 2, box.y - box.h, box.w, box.h);
      if (b.state === 'stamp') g.fillStyle(0xd04040).fillRect(box.x - box.w / 2, box.y - box.h, box.w, box.h);
    }
    for (const w of b.waves) g.fillStyle(0xe0c060).fillRect(w.x - w.w / 2, w.y - w.h, w.w, w.h);
    for (const d of b.drops) g.fillStyle(0xb03040).fillRect(d.x - d.w / 2, d.y - d.h, d.w, d.h);
  }

  drawPlayer(g) {
    const { run, dying } = this.s;
    this.drawCasts(g, run.casts);
    const p = run.player;
    const h = this.drawAuditor(g, p, dying);
    if (h && p.parry > 0) g.lineStyle(1, 0x80c0ff).strokeRect(p.x - p.w / 2 - 3, p.y - h - 3, p.w + 6, h + 6);
  }

  drawHud() {
    const { s } = this;
    const p = s.run.player;
    const right = (text, y, c) => drawString(this.fill, text, WIDTH - 4 - measure(text), y, c);
    const centre = (text, y, c) => drawString(this.fill, text, centreX(text), y, c);
    const lines = [[`LIVES ${s.lives}`, DIM]];
    if (s.part === 'climb') {
      const gap = Math.max(0, Math.round((s.shadow.y - p.y) / TILE));
      lines.push([`FLOOR ${floorsClimbed(s)}/${FLOORS}`, DIM], [`SHADOW ${gap}`, gap < 5 ? RED : DIM]);
    }
    const hud = this.drawStatus(p, lines);

    if (s.part === 'climb') {
      right('THE CAPSTONE', 6, WHITE);
      if (!this.noticeCheckpoint(right) && s.shadow.hand && !handReach(s.shadow.hand)) right('IT REACHES', 18, VIOLET);
    } else {
      const b = s.fight;
      right('THE GREAT SEAL', 6, WHITE);
      if (!b.beaten) {
        hud.fillStyle(0x111114).fillRect(WIDTH - 124, 18, 120, 6);
        hud.fillStyle(0xc04040).fillRect(WIDTH - 123, 19, Math.round((118 * b.hp) / b.maxHp), 4);
        right(`${b.phase} ${PHASES[b.phase - 1]}`, 28, DIM);
        if (b.state === 'roar') {
          hud.fillStyle(0x000000, 0.5).fillRect(0, 64, WIDTH, 32);
          centre(`PHASE ${b.phase}`, 70, RED);
          centre(PHASES[b.phase - 1], 82, WHITE);
        }
      }
    }

    if (s.over?.kind === 'ending') return this.drawEnding();
    if (s.part === 'choice') return this.drawChoice();
    const title = s.dying ? (s.dying === 'caught' ? 'THE SHADOW TOOK YOU' : 'WORN DOWN') : s.over && 'GAME OVER';
    if (!title) return;
    this.banner(title, s.over ? 'JUMP TO RETRY' : s.part === 'fight' ? 'BACK TO THE CROWN' : 'BACK TO THE CHECKPOINT', centreX);
  }

  panel(w, h) {
    const [x, y] = [Math.round((WIDTH - w) / 2), Math.round((HEIGHT - h) / 2)];
    this.hud.fillStyle(0x000000, 0.6).fillRect(0, 0, WIDTH, HEIGHT);
    this.hud.fillStyle(0xe8e0c8).fillRect(x, y, w, h);
    this.hud.fillStyle(0x18181c).fillRect(x + 2, y + 2, w - 4, 1);
    return (text, dy, c) => drawString(this.fill, text, centreX(text), y + dy, c);
  }

  // The placeholder final choice, two options and a cursor.
  drawChoice() {
    const c = this.s.choice;
    const line = this.panel(232, 88);
    const top = Math.round((HEIGHT - 88) / 2);
    line('THE SEAL IS IN YOUR HANDS', 8, INK);
    CHOICES.forEach((o, i) => {
      const x = centreX(o.label);
      const y = top + 32 + i * 16;
      if (i === c.pick) this.fill(x - 12, y + 1, 6, 6, PLUM);
      drawString(this.fill, o.label, x, y, i === c.pick ? PLUM : rgb15(16, 16, 18));
    });
    if (c.t >= CHOICE_DELAY) line('JUMP TO CHOOSE', 72, rgb15(10, 10, 12));
  }

  // The stub ending screen for the choice made.
  drawEnding() {
    const { ending, t } = this.s.over;
    const line = this.panel(232, 104);
    line(ending === 'good' ? 'GOOD ENDING' : 'BAD ENDING', 8, ending === 'good' ? rgb15(4, 14, 6) : rgb15(18, 4, 4));
    ENDINGS[ending].forEach((text, i) => line(text, 28 + i * 14, INK));
    line('THE END', 74, PLUM);
    if (t > 60) line('JUMP TO PLAY AGAIN', 88, rgb15(10, 10, 12));
  }
}
