# Final Notice: gameplay design

*Generated from the knowledge base; edit through `kb_update`, not here.*

## Final Notice brawl design: Final Fight and Streets of Rage 2 pillars

*`kb_get final-notice-brawl-design` · version 5*

Agreed live in the room by Tim, 2026-09-15, 12:22-13:00 EDT. The brawl stages are 1, 3 and 5; their pillars are *Final Fight* and *Streets of Rage 2*.

- **Moves.** A punch combo with a finisher, a jump kick, grabbing a stunned foe (knee or throw), a sidestep, and a run on a double tap.
- **Two heroes, two playstyles** (Tim, 2026-09-15 17:14 EDT: "both characters get different playstyles"). Every boss must be beatable with either kit. The on-screen controller legend names the buttons of whichever hero is playing.
  - **Ellis Ward, the balanced default.** Light (Y) and heavy (X) attacks with the light-into-heavy combo routes. **Block on L, held**: a blow from in front costs a quarter of its damage as chip and never the last pip; grabs and binding red tape from in front are stopped too; a blocked light blow rebounds, so its thrower's recovery runs a third of a second longer (a short punish, next to the parry's long reel); a heavy blow, or a hold of about two seconds, breaks the block and leaves him open for a moment. The block covers only his front. **Launcher, up + heavy**: pops the foe into a slow float; jump after him (B, which cancels the launcher's recovery), up to two air lights (Y) keep him up, and the air heavy (X) slams him into the floor. **Room-clear special**: the Emergency Injunction on Y+X, free on a cooldown, plus his lunge on A. *Built, item 2287.*
  - **Frank Mercer, the technical one.** **Objection parry on L**: timed to an incoming hit, it deflects it and the attacker staggers open for a free combo; no block. **Three attack buttons**: light (Y), heavy (X) and a kick (A), eight routes to Ward's four: Y Y Y finisher, Y Y X knockback, Y X pop-up (a knockdown, no juggle), a heavy on a dazed foe crushes, **Y Y A leg sweep** (knockdown), **Y A X hook crush** and **A X snap crush** (the kick alone or after one light dazes the foe, and X on him is the crush), **X A spin kick** (a landed heavy cancels into a kick that sends the foe flying). **No air combo; a dive kick instead**: in a jump, down + any attack drives him down and forward at a fixed angle, knocks the foe down and bounces him off. **Single-target special, the Takedown, on Y+X**: on the same cooldown as Ward's room clear, one hard blow to the nearest foe in front and nobody else. *Built, item 2288.*
- **Office weapons.** Smashed furniture drops short-lived pickups: a stapler, a binder, a fire extinguisher and the red APPROVED stamp.
- **Emergency Injunction.** Ward's, free on a cooldown; Mercer spends the same cooldown on his Takedown.
- **Enemies.** At SNES size, with readable wind-ups, taking turns to attack and walking on from the screen edges.
- **Vellum**, the Stage 1 boss, is bait and punish: his rush and sweep break an ordinary block like any heavy blow, but Ward's block from in front turns them aside for chip and drops Vellum straight into his recovery, his opening; Mercer parries them for the long reel. *Built, item 2287.*
- **Two-player co-op** is designed in and built later.
- **Tuning** happens in the brawl lab, `?snes&go=lab` (add `&who=mercer` for Mercer; M shows the hero's route map); `?snes&go=lab&pose=air` plays Ward's launcher into his air combo, `?snes&go=lab&who=mercer&pose=kit` loops Mercer's Y A X hook crush and his dive kick.

## Bosses and minibosses *(proposed, item 2289, waiting on Tim's verdict)*

Tim, 2026-09-15 17:16 EDT: every brawl stage has at least one miniboss and one boss; earlier bosses come back as minibosses later, classic style; every one has a gimmick, and each hero must be able to beat it with his own kit (no parry-only boss). The kits (items 2287, 2288): **Ward** has light and heavy attacks, block, a launcher into an air combo and a room-clear special; **Mercer** has three attacks, a parry and no block, a dive kick and a single-target special.

| Stage | Who | Role | Personality | Gimmick | Ward beats it | Mercer beats it |
| --- | --- | --- | --- | --- | --- | --- |
| 1, Service Floor | **Pruitt, the Floor Manager** | miniboss | Dead since 1971 and still walking the 9 a.m. rounds with a clipboard, docking you for lateness. | Too heavy to stagger by hand, so fists only chip him; ram one of the floor's wheeled photocopiers into him and he is dazed for a full combo. | A heavy attack sends a copier rolling into him; the room-clear special shoves every copier on the floor at once. | A dive kick sends a copier rolling; or parry his clipboard charge so he stumbles back into one. |
| 1, Service Floor | **Vellum** (built) | boss | The auditor the agency lost, personable and desperate, who will do anything not to stop existing. | Bait and punish: his guard is always up, and he is open only in the recovery after an attack of his misses or is turned aside. | Block the rush or the sweep, then launch him in the recovery and finish in the air. | Parry the sweep for a long reel; or step out of the rush and dive kick his back as he skids past. |
| 3, middle floors | **Vellum, Retained** (returning) | miniboss | Re-stamped and back at a desk that never ends, still sure he's the only one who reads the rules. | His bait-and-punish duel with half the health, and he calls Associates in every loop, so you bait him with staff at your back. | The room-clear special wipes the Associates, then block and launch as before. | Pick the Associates off with dive kicks between his attacks, then parry him open. |
| 3, middle floors | **Carbon and Copy** | boss | One dead clerk filed in duplicate, the white copy and the yellow copy, bickering over which is the original. | You can't hurt either one yourself: they take damage only from each other, so line them up and turn one's attack into the other. | Block in the middle so a charging copy runs through into its twin; launch one so it lands on the other; the room-clear special throws them together. | Parry a charge so the copy reels into its twin; dive kick one into the other; the single-target special hurls one across the room at the other. |
| 5, executive chapel | **The Custodian** (returning, built as Stage 2's) | miniboss | The archive's keeper, who has shelved so much for so long he thinks people are files too. | He is filed away out of reach while any Associate he called is standing; clear the room and he has to come down in person, until he calls the next pair. | The room-clear special empties the room in one go and brings him straight down. | The single-target special and dive kicks pick off his Associates one by one before his next call. |
| 5, executive chapel | **Carbon and Copy, triplicate** (returning) | miniboss | The two copies again, now with a pink third copy who agrees with whoever spoke last. | Their only-hurt-each-other rule, shorter, and the chapel pews stand in the way, so lining them up takes a step; the pink copy is harmless and just gets in the way. | As in Stage 3, using block and the launcher across the pews. | As in Stage 3, with parry and dive kicks across the pews. |
| 5, executive chapel | **Chairman Hargreave** | boss | The oldest preserved executive, waxed at his pew since 1851, holding the Master File like a hymnal and signing in a hand nobody reads anymore. | Shield down first: a wax seal over him is kept up by three hanging censers, one low, two high; put out all three and the seal cracks open for a while, until his board relights them. | Heavy attack on the low censer; launch up and air-combo the two high ones. | Attack the low censer; jump and dive kick down onto the high ones. |

- **Every gimmick is different:** scenery rammed into him (Pruitt), bait and punish (Vellum), clear the adds (the Custodian), only hurt each other (Carbon and Copy), shield down first (Hargreave). A returning boss keeps his own gimmick with one twist and less health.
- **Where the built bosses sit.** Vellum stays Stage 1's boss and returns as Stage 3's miniboss; his block answer for Ward is built (item 2287). The Custodian stays the Archive's boss on the Stage 2 climb and returns as a brawl miniboss in Stage 5. Bellwether stays the final boss on the Stage 6 climb, outside this table; his stamp is met with a parry today and needs a block answer for Ward when Stage 6 is revisited.
- **Nothing else is built from this yet.** Jarvis files the prototype cards once Tim approves; art comes later.

## Final Notice escape design: a vertical climb with a pursuer rising behind

*`kb_get final-notice-escape-design` · version 1*

Agreed live in the room by Tim, 2026-09-15, 12:22-13:00 EDT. The escape stages are 2, 4 and 6.

- **A vertical climbing platformer.** You climb up while a pursuer rises behind you.
- **A different pursuer each stage:** the paper flood in the Archive (2), the Backrooms floors folding in below in the express elevator shaft (4), and the Great Seal's shadow at the top (6).
- **Spells** clear enemies and open the route.
- **Tuning** happens in the climb lab, `?snes&go=climblab`.
