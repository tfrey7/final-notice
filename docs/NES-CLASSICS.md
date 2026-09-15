# What made the NES classics the classics

Tim, 00:43 EDT 2026-09-15: *"make sure you do a ton of research on what made the NES classics THE
CLASSICS"*.

A working study for epic 1785 (`docs/NES-PLAN.md`). Ten games, the parts of each that Final Notice
can use, and a checklist at the end. Lessons are numbered **L1-L20** so cards can name them. Nothing
here copies a game's art, music or text: we take the rules, not the content.

Numbers marked *(verified)* come from the cited reverse-engineering sources; numbers marked
*(from memory, unverified)* are commonly quoted but were not confirmed during this research, so
treat them as starting points to tune, not facts.

## The hardware every one of them fought

- **8 sprites on one scanline, 64 on screen.** Past 8 on a line the PPU drops sprites; games rotate
  which ones are dropped so they flicker instead of vanishing. Each 8x8 sprite has 3 colours plus
  transparent. *(verified: [nesdev forum][nesdev-8], [kindatechnical][flicker])*
- **Sound is four useful voices** (two pulses, triangle, noise; a fifth sample channel we do not use).
  Composers faked chords with the "Famichord" (a seventh chord with the fifth removed, used in *Super
  Mario Bros.* and *Mega Man 2*), very fast arpeggios on one channel, and drum kits made from the
  noise channel alone. *(verified: [Ludomusicology][ludo])*

Every classic below is, first, a clever answer to those two lines.

## Beat-'em-ups

### Double Dragon (Technōs, 1988)

- **The limit became the rhythm.** The NES version shows at most **two enemies at once, and both are
  the same character** *(verified: [Double Dragon wiki][dd1])*. Fights become readable duels:
  you always know who is about to swing.
- **Grab, knee, throw** is the hook: getting in close to a reeling foe is rewarded with the most
  satisfying moves in the game. The sequel's strongest moves are timed, crouch-then-rise attacks
  *(verified: [Hardcore Gaming 101][hg101-dd2])*.
- **Progression inside a brawler:** the first NES game starts you with basic punches and kicks and
  unlocks moves over **seven skill levels** *(verified: [Double Dragon wiki][dd1])*. The sequel
  dropped it, added two-player co-op and three difficulty modes (Practice ends at stage 3).
- **What it teaches Final Notice:** L4 (few foes, same type), L17 (grab and throw are the payoff).

### River City Ransom (Technōs, 1989)

- **Gangs are read by shirt colour.** Nine gangs, each a palette swap with its own behaviour
  *(verified: [Wikipedia][rcr])*. One sprite set, many enemies, instantly readable: the cheapest
  variety on the machine.
- **Everything is a weapon** (chains, crates, tyres, trash cans) and foes pick them up too.
- **Personality in one word.** Beaten foes groan a line in the text strip ("BARF!"): tiny text,
  huge character.
- **Money drops, shops sell moves and food** that heal and raise stats.
- **What it teaches Final Notice:** L3 (palette swaps carry behaviour), L17 (props), L20 (a
  one-word line per knock-out sells the world).

### Teenage Mutant Ninja Turtles II: The Arcade Game (Konami, 1990)

- **Colour = ability** again: yellow Foot Soldiers throw boomerangs, purple ones throw dynamite
  *(verified: [Take on the NES Library][tmnt2])*.
- **Screen locks until the wave is gone**; the NES port uses **fixed waves** rather than the
  arcade's performance-scaled ones, with more in two-player *(verified: [Nintendo wiki][tmnt2-wiki])*.
- **A+B together is the power move** (jump attack, kills basic foes in one hit); B in the air is a
  jump kick. **Pizza restores full health**. Three continues, each back to the start of the stage.
- **Its known weakness:** "hundreds of enemies in one sitting" with little change. Heavy flicker when
  crowds gather *(verified: [Take on the NES Library][tmnt2])*.
- **What it teaches Final Notice:** L4 (fixed waves, locked screens), L5 (flicker is tolerated in a
  crowd but costs clarity), L12 (vary or it drags).

### Battletoads (Rare, 1991)

- **Every stage changes the verbs:** brawling, abseiling, speeder bikes, surfing, climbing. The
  infamous Turbo Tunnel starts as a brawler and becomes a memorisation run on bikes, introducing one
  obstacle per course, then speeding up *(verified: [Battletoads wiki][bt-tunnel])*.
- **Smash Hits:** the last blow of a combo becomes a cartoon-exaggerated finisher (giant fist,
  ram horns) *(verified: [Wikipedia][bt])*. The finisher is the reward you feel.
- **Timing to the music** makes the tunnel manageable: obstacles sit on the beat.
- **Notorious for difficulty:** no passwords, a co-op game over for both when one runs out, friendly
  fire. Admired for its presentation, not its fairness.
- **What it teaches Final Notice:** L12 (new verb per area), L6 (make the finisher big), L10 (never
  borrow its cruelty).

## Ranged action

### Mega Man 2 (Capcom, 1988)

- **Physics you can trust** *(verified: [TASVideos Rockman data][rockman])*: walk **1.375 px/frame**
  (so a 256 px screen takes about 3 s), jump starts at **4.87 px/frame up** with gravity
  **0.25 px/frame²**, which gives about **19-20 frames of rise and a ~47 px apex (three 16 px tiles)**,
  and fall speed capped at **12 px/frame**. Ladders at **0.75 px/frame**. Same numbers every jump.
- **Choice with a hidden answer:** eight stages in any order, each boss weak to another's weapon
  *(verified: [StrategyWiki][mm2-walk])*. Players discover the chain by trying weapons.
- **Kindness added for the West:** the US release added a "Normal" difficulty beside the original
  ("Difficult"), and it is the first Mega Man with passwords *(verified: [Mega Man Wiki][mm2-wiki])*.
- **Boss telegraphs and patterns:** each Robot Master has 2-3 moves on a readable loop; a boss room
  is a single screen with a health bar opposite yours.
- **Music with a hook in the first bars:** Takashi Tateishi's score, Dr. Wily Stage 1 the fan
  favourite *(verified: [VGMPF][vgmpf-mm2])*.
- **Getting hit:** knock-back a few pixels, the player blinks and is untouchable for roughly a second
  *(from memory, unverified: often quoted as about 60 frames)*.
- **What it teaches Final Notice:** L1 and L2 (numbers), L8 (bosses), L14 (hook), L19 (a kinder mode).

### Contra (Konami, 1988)

- **Eight-way aim on a two-button pad**, shoot while running, jumping or lying prone *(verified:
  [Contra wiki][contra-dir])*. Walking aims only forward or diagonal; standing still aims anywhere.
- **One hit kills, balanced by generous weapons.** Letters on falcon pickups (M, F, S, L, R, B) read
  from across the screen; **Spread (S) fires 5 bullets in a fan and is the game breaker**; dying
  returns you to the default gun *(verified: [Contrapedia][contrapedia], [StrategyWiki][contra-sw])*.
- **Respawn on the spot** from the top of the screen after a death, so pace never breaks. A continue
  restarts the stage. Three lives by default; the famous code gives 30, and was nearly essential
  *(verified: [Wikipedia: Konami Code][konami])*.
- **Variety inside one game:** side-scrolling stages alternate with into-the-screen base stages.
- **NES port beat the arcade** on controls, colour and music *(verified: [Contrapedia][contrapedia])*.
- **What it teaches Final Notice:** L13 (pickups), L10 (respawn fast), L11 (a secret code), L12.

### Ninja Gaiden (Tecmo, 1988)

- **Cinema Display:** over 20 minutes of anime-styled cutscenes between acts, the first on NES
  *(verified: [Wikipedia][ng])*. Picture above, text below, typed out.
- **Wall cling** changes every room: Ryu grabs any wall and can hop up between two
  *(verified: [StrategyWiki][ng-act6])*.
- **Infinite continues that restart the current section**, not the act; the exception, the final
  boss sending you back to 6-1, is the most hated rule in the game *(verified: [AtariAge thread][ng-61])*.
- **Knock-back into pits** (the birds) is its other infamy. Director Hideo Yoshizawa based stage design
  on Castlevania *(verified: [Bloody Disgusting][ng-cv])*.
- **What it teaches Final Notice:** L18 (cinema), L10 (continue at the section, never further back),
  L7 (knock-back must not kill).

### Castlevania (Konami, 1986)

- **Commitment is the game:** the jump is a fixed arc; you cannot steer or shorten it, and the whip
  has a visible wind-up *(verified: [Medium analysis][cv-jumps], [NaOH][cv-controls])*. Enemies and
  platforms are placed for exactly those arcs, so every jump is a decision.
- **Stairs** gate vertical movement, and you cannot jump off them *(verified: [VGG level study][cv-stairs])*.
- **Knock-back on hit** throws Simon back a few widths and into pits; the Famicom easy mode removed
  knock-back and lowered damage, which shows it was a deliberate difficulty dial *(verified:
  [Medium analysis][cv-jumps])*.
- **Sub-weapons on Up+B**, fed by hearts: a second verb without a third button.
- **Music:** "Vampire Killer" set the house sound *(verified: [Ludomusicology][ludo] names the game
  as a model of limited-polyphony writing)*.
- **What it teaches Final Notice:** L1 (a fixed arc suits the brawler), L7, L17 (a second verb on a
  direction + B).

## The touchstones

### Super Mario Bros. 3 (Nintendo, 1988)

- **Speed tiers you can feel** *(verified: [TASVideos SMB3][smb3-tas])*: walk **1.5 px/frame**, run
  **2.5**, full P-meter **3.5**. Faster running also means a higher jump.
- **Floaty rise, firm fall:** while A is held and Mario is still rising, gravity is a fraction of
  normal; releasing A or passing a speed restores full gravity *(reported by
  [Data Crystal SMB3 notes][smb3-dc]; exact values unverified)*. That split is why the jump feels both
  controllable and snappy.
- **Short stages:** most have **300 timer units, about 204 real seconds**; only three have 400
  *(verified: [Mario Wiki][smb3-time])*.
- **Teach, develop, twist:** each world introduces an idea safely, repeats it, then twists it (the
  P-switch turns bricks to coins, later coins to bricks) *(verified: [Game Developer][smb3-gd])*.
- **Secrets that the level invites:** a long runway suggests a run and a hidden block; the world map
  shows optional stages *(verified: [Game Developer][smb3-gd])*.
- **Title screen as a demo:** the curtain rises on Mario and Luigi playing with enemies and
  power-ups, previewing the rules before you press Start *(verified: [accordion sprout][smb3-map]
  search summary)*.
- **What it teaches Final Notice:** L9, L10, L15, L16.

### The Legend of Zelda (Nintendo, 1986)

- **The first screen teaches by choice:** three exits and one dark cave with the sword; no tutorial
  *(verified: [3+1 Design][zelda-first])*.
- **Dungeons feel open but the critical path is almost linear;** optional rooms and shortcuts give
  exploration without getting lost; each encounter on the path is harder than the last and none
  repeats *(verified: [Game Developer][zelda-gd])*.
- **Secrets everywhere:** bombable walls and burnable bushes hide caves, all by design
  *(verified: [TheGamer][zelda-bomb])*. Miyamoto wanted players to think about where to go
  *(verified: [VGC][zelda-vgc])*.
- **Warnings the player can miss:** the silver arrow needed for the last boss is not on the
  critical path, which modern design would gate.
- **What it teaches Final Notice:** L9, L16, L8.

## The lessons

| # | Lesson | From |
| --- | --- | --- |
| L1 | **Pick a jump model per stage and design around it.** Stage 1 (brawler): a short fixed arc, like Double Dragon and Castlevania: commitment reads as weight. Stage 2 (escape): Mega Man-style predictable arc with steering, plus a shorter hop when A is released early (the SMB3 split). | Castlevania, Mega Man 2, SMB3 |
| L2 | **Start from real numbers, then tune.** Stage 2 at Contra size: walk ~1.25-1.375 px/f, jump 4.5-4.87 px/f up, gravity 0.25 px/f², fall cap 6-8 px/f (lower than MM's 12 so falls stay readable at 32 px tall). Stage 1: walk ~1 px/f along, ~0.5-0.75 px/f across the floor band *(brawler speeds from memory, unverified)*. Fixed-point in 1/256 px like the originals. | Mega Man 2, SMB3 |
| L3 | **Silhouette first, then 3 colours; colour means behaviour.** A palette swap is a new foe for free if its colour always predicts what it does. | River City Ransom, TMNT II |
| L4 | **Few foes, fixed waves, locked screen.** 2-3 foes at once, same type where palettes are tight; the screen locks until the wave is down, then GO. | Double Dragon, TMNT II |
| L5 | **Flicker is honest but rationed.** Never flicker the player, the boss or a live projectile aimed at the player; rotate the rest. Design waves so a row of 8 sprites is rare. | NES hardware, TMNT II |
| L6 | **Every hit lands twice: on screen and in the ear.** A 2-4 frame freeze on contact, a knock-back, a hit sound, a flash; the combo's last hit is a big finisher. *(freeze frames from memory, unverified)* | Battletoads, Double Dragon |
| L7 | **Knock-back never kills.** Hits push a few pixels and stop at ledges; pits are for mistakes the player made. | Castlevania, Ninja Gaiden (what not to do) |
| L8 | **Bosses loop 2-3 telegraphed attacks, change at half health, and have a discoverable weakness.** The telegraph is a flash or pose held long enough to react to (about half a second). | Mega Man 2, Zelda |
| L9 | **Teach by doing: introduce, develop, twist.** Prompts only for inputs a player cannot guess; each area introduces one thing safely, then combines it. | SMB3, Zelda |
| L10 | **Short sections, fast respawns, never lose more than an area.** Respawn on the spot or at the area checkpoint within about a second of the death jingle. | Contra, SMB3, Ninja Gaiden |
| L11 | **Continues plus an original secret code for extra lives.** A famous code made Contra beatable and loved. Ours must be our own button sequence. | Contra, Double Dragon II |
| L12 | **Change a verb every area.** A new foe, a prop, a hazard or a moving floor per area; nothing lasts longer than it is interesting. | Battletoads, TMNT II (what not to do) |
| L13 | **Pickups are readable at a glance and matter.** One icon shape per enchantment, visible across the screen; one pickup should feel like the Spread gun. | Contra |
| L14 | **Hook in the first two bars; one channel per job.** Pulse 1 lead, pulse 2 harmony/echo, triangle bass, noise drums; Famichords and fast arpeggios for harmony; effects steal pulse 2, never the lead. | Mega Man 2, Castlevania |
| L15 | **Title and attract sell the game.** Music on the first frame, PUSH START blinking, a demo that shows the core moves within about 20 s. | SMB3, Ninja Gaiden |
| L16 | **Hide something in every area, invited by the level.** A cracked wall, an odd desk, a runway: behind it a first-aid box or a 1-up. | Zelda, SMB3 |
| L17 | **Close range is the payoff.** Grab, knee, throw a foe into foes; props anyone can pick up; a second verb on direction + button. | Double Dragon, River City Ransom, Castlevania |
| L18 | **Cinema is short, typed, skippable, and ends on a hook.** Picture over text, one idea per page, Start skips. | Ninja Gaiden |
| L19 | **Offer a kinder way in.** A Normal mode or extra continues; the West got one in Mega Man 2 and it sold the game to more players. | Mega Man 2, Double Dragon II |
| L20 | **Personality in single words.** A knocked-out foe's one-word groan, a boss's one line; cheap in tiles, huge in character. | River City Ransom |

## Checklist against `docs/NES-PLAN.md`

| Plan section | Check | Lessons | Cards |
| --- | --- | --- | --- |
| §1 limits | Flicker rotation skips the player, active boss and player-bound projectiles | L5 | 1799 (landed), 1827, 1828 |
| §1 limits | Waves are laid out so rarely more than 8 sprites share a row | L4, L5 | 1830, 1840, 1832, 1837 |
| §3 controls | Stage 1 jump is a short fixed arc; Stage 2 jump steers and cuts short on release | L1, L2 | 1827, 1828 |
| §3 controls | Physics constants live in one table in 1/256 px, starting from L2's numbers | L2 | 1827, 1828 |
| §4 shared rules | Invincibility blink after a hit (~60 frames), knock-back stops at ledges | L6, L7 | 1827, 1828 |
| §4 shared rules | Respawn within ~1 s; continue never goes further back than the area | L10 | 1841 |
| §4 shared rules | An original secret code (extra lives) and, if cheap, a Normal/Easy choice | L11, L19 | 1825, 1841 |
| §4 shared rules | Emergency Injunction reads like a Smash Hit: big flash, big sound | L6 | 1839, 1824 |
| §6 Stage 1 | Every hit: freeze frames, sound, knock-back; third punch is a finisher | L6, L17 | 1827, 1830 |
| §6 Stage 1 | Foe types differ by palette and each colour always means one behaviour | L3 | 1806, 1807, 1830 |
| §6 Stage 1 | Each area adds exactly one new thing (foe, prop, prompt) | L9, L12 | 1840 |
| §6 Stage 1 | Knocked-out foes say one word | L20 | 1801, 1830 |
| §6 Vellum | 2-3 telegraphed attacks on a loop, faster at half, the thrown-subordinate weakness shown once | L8 | 1836 |
| §7 Stage 2 | Enchantment pickups readable across the screen; one of them feels like the Spread gun | L13 | 1810, 1831 |
| §7 Stage 2 | Wax front and conveyors each introduced safely before they can kill | L9, L12 | 1832, 1837 |
| §7 Great Seal | Stamp shadow telegraph ≥ ~30 frames; pattern changes per broken binding | L8 | 1838 |
| §7 / §6 areas | One hidden reward per area, invited by the scenery | L16 | 1811, 1813, 1815, 1816, 1840, 1832, 1837 |
| §8 scenes | Pages short, typed with a blip, Start skips, each scene ends on a hook | L18 | 1826, 1801, 1818, 1819 |
| §8 title | Music on the first frame, blinking PUSH START, attract demo shows combo + throw | L15 | 1825, 1819, 1820 |
| §9 music | Hook in the first two bars; channel roles fixed; effects steal pulse 2 only | L14 | 1800, 1820-1824 |
| §10 art | Silhouette test at 1x before colour; 3 colours + transparent per sprite | L3 | 1804, 1843, 1806-1808, 1817, 1818 |
| §12 closer | Play-through checks every row above | all | 1842 |

## Sources

Every source is linked where it is cited above; the link targets follow in the raw file.

[nesdev-8]: https://forums.nesdev.org/viewtopic.php?t=16323
[flicker]: https://kindatechnical.com/retro-nes-game-development/reducing-sprite-flicker.html
[ludo]: https://www.ludomusicology.org/2015/07/16/compositional-strategies-for-programmable-sound-generators-with-limited-polyphony/
[dd1]: https://doubledragon.fandom.com/wiki/Double_Dragon_(NES)
[hg101-dd2]: https://www.hardcoregaming101.net/double-dragon-ii-nes/
[rcr]: https://en.wikipedia.org/wiki/River_City_Ransom
[tmnt2]: https://takeontheneslibrary.com/finished/173-teenage-mutant-ninja-turtles-ii-the-arcade-game/
[tmnt2-wiki]: https://nintendo.fandom.com/wiki/Teenage_Mutant_Ninja_Turtles_II:_The_Arcade_Game
[bt-tunnel]: https://battletoads.fandom.com/wiki/Turbo_Tunnel
[bt]: https://en.wikipedia.org/wiki/Battletoads_(video_game)
[rockman]: https://tasvideos.org/GameResources/NES/Rockman/Data
[mm2-walk]: https://strategywiki.org/wiki/Mega_Man_2/Walkthrough
[mm2-wiki]: https://megamanwiki.com/wiki/Mega_Man_2
[vgmpf-mm2]: https://www.vgmpf.com/Wiki/index.php/Mega_Man_II_(NES)
[contra-dir]: https://contra.fandom.com/wiki/Direction_Lock
[contrapedia]: https://contrapedia.wordpress.com/contra-conversions-nes/
[contra-sw]: https://strategywiki.org/wiki/Contra_(NES)/Gameplay
[konami]: https://en.wikipedia.org/wiki/Konami_Code
[ng]: https://en.wikipedia.org/wiki/Ninja_Gaiden_(NES_video_game)
[ng-act6]: https://strategywiki.org/wiki/Ninja_Gaiden_(NES)/Act_6
[ng-61]: https://forums.atariage.com/topic/241323-ninja-gaiden-starting-you-back-at-6-1-when-you-die-on-the-final-boss/
[ng-cv]: https://bloody-disgusting.com/video-games/3912990/classic-1988-nes-action-title-ninja-gaiden-used-castlevania-for-inspiration/
[cv-jumps]: https://medium.com/@TTTTTsd/whats-the-deal-with-the-jumps-an-analysis-and-study-on-castlevania-95aff6b160d
[cv-controls]: https://nstbayless.github.io/game-design/castlevania/2017/07/26/bad-controls-castlevania.html
[cv-stairs]: https://videogamegeek.com/thread/2115174/studying-nes-castlevania-8-eyes-level-design-the-n
[smb3-tas]: https://tasvideos.org/GameResources/NES/SuperMarioBros3
[smb3-dc]: https://datacrystal.tcrf.net/wiki/Super_Mario_Bros._3/Notes
[smb3-time]: https://www.mariowiki.com/Time_Limit
[smb3-gd]: https://www.gamedeveloper.com/design/super-mario-bros-3-level-design-lessons-part-1
[smb3-map]: https://www.accordionsprout.com/blog/super-mario-bros-3-whats-in-or-on-a-map
[zelda-first]: http://3plus1design.blogspot.com/2012/02/dissecting-first-screen-legend-of-zelda.html
[zelda-gd]: https://www.gamedeveloper.com/design/learning-from-the-masters-level-design-in-i-the-legend-of-zelda-i-
[zelda-bomb]: https://www.thegamer.com/legend-of-zelda-nes-every-bombable-wall/
[zelda-vgc]: https://www.videogameschronicle.com/features/zelda-at-40-how-shigeru-miyamotos-childhood-explorations-inspired-nintendos-legendary-classic/

Some sources were read only through search summaries (the Medium Castlevania study and the Data Crystal
SMB3 page refused a direct fetch); their claims above match several independent summaries.
