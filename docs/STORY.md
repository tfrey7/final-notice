# Final Notice: the story

*Generated from the knowledge base; edit through `kb_update`, not here.*

*`kb_get final-notice-story` · version 1*

Agreed live in the room by Tim and Jarvis, 2026-09-15, 12:53-12:59 EDT. This is the story the game
tells; where another doc or the script disagrees, this one wins. Anything marked *(proposed)* fills a
small gap the conversation left open and waits for Tim's word.

## The premise

The afterlife is a shabby bureaucracy, in the spirit of *Beetlejuice*, and Ellis Ward and Frank Mercer
are caseworkers at the agency that serves the newly dead their Final Notice. A company in a
pyramid-crowned tower has been catching people the moment they die and keeping them at their desks,
working and billed, instead of letting them move on. Ward and Mercer climb the tower to find the
books that prove it and serve the company its own Final Notice.

## The cast

**Ellis Ward** — the by-the-book veteran caseworker, trained by Vellum.
*Wants* the job done properly, by the rules he was taught. *Arc:* the rules he trusts were bent at
the top, first by his old teacher and then by his own boss, and he has to decide what the job is
for once the people who taught it are the problem.

**Frank Mercer** — the newer caseworker who bends the rules.
*Wants* the people on the payroll out, whatever it takes. *Arc:* *(proposed)* the shortcuts he
likes are exactly what the company runs on, and at the top he is the one tempted to keep the Seal
"for good reasons".

Ward and Mercer are odd-couple partners. Two-player co-op is designed in and built later; played
solo, you pick one and only that one speaks.

**The man who died on Tuesday** — a company employee billed for forty-seven lifetimes, who
unknowingly helped build the scheme. *Wants* to put right what he helped make. *Arc:* you find him
trapped early *(proposed: on the Service Floor, Stage 1)*, and out of guilt he guides you up the
tower. Moving him on at the end is the game's emotional payoff.

**Vellum** — a former auditor, now corrupt, and the Stage 1 boss. He died decades ago, the agency
lost his file, and he never got his own notice, so the company offered to keep him existing.
*Wants* not to stop existing: desperate, not greedy. He burned the copies of the records. *Arc:*
beaten, he is what the company does to a person, and the first sign the agency's own paperwork
failed.

**Bellwether** — the head of the agency, who sends Ward and Mercer in. *Wants* the Master File, and
keeps saying "bring me the Master File", because his signature approved it all. "Approved at the
top" means the top of the agency, not the company. *Arc:* his signature turns up in Stage 4; he cuts
their line and turns the agency against them, and at the top he is bound to the Great Seal as the
final boss.

**The office staff you fight** — dead employees who don't know they are dead. The higher the floor,
the longer they have been dead.

## The Master File and the Great Seal

**The Master File** is the original books of the dead: every soul kept on the payroll, and who signed
each one over. A Final Notice is served against it, which is why Vellum burned the copies and why
Bellwether wants it in his hands.

**The Great Seal** is the agency's own seal, the stamp that makes a Final Notice binding. It was
stolen and corrupted into something alive. Whoever holds it decides who moves on.

## Up the tower: six stages

Stages alternate a brawl and an escape climb, and the look drifts from office to Backrooms to gothic
as you rise.

| # | Stage | Kind | Look | Story beat |
| --- | --- | --- | --- | --- |
| 1 | The Service Floor, boss **Vellum** | brawl | corporate | Sent in by Bellwether. You find the man who died on Tuesday trapped *(proposed: here)*. Vellum burned the copies; *(proposed: beaten, he lets slip the original Master File is kept higher up.)* |
| 2 | The Archive, boss **the Custodian** | escape climb | stale | The paper flood rises behind you. *(proposed: the Custodian keeps the archive's index, which shows the Master File was carried further up.)* |
| 3 | The middle floors | brawl | Backrooms | *(proposed: the long-dead staff; the man who died on Tuesday recognises the desks he helped set up.)* |
| 4 | The express elevator shaft | escape climb | Backrooms turning wrong | The floors fold in below you. You find Bellwether's signature on the transfers; he cuts your line and turns the agency on you. |
| 5 | The executive chapel | brawl | gothic | *(proposed: the Master File itself, held by the company's oldest preserved executives; you take it.)* |
| 6 | The Great Seal | escape climb into the final boss | gothic, the top | The Seal's shadow chases you up to the crown of the tower, where Bellwether is bound to the Seal. |

## The two endings

Beaten, the Seal is in your hands, and you choose.

- **Stamp the company's Final Notice (good).** It is served against the Master File, every soul on
  the payroll goes free, and the man who died on Tuesday moves on.
- **Keep the Seal (bad).** You take Bellwether's place at the top.

## Tone

The *Beetlejuice* balance: deadpan office comedy at the bottom of the tower, genuinely creepy at the
top, and the jokes never fully stop.

## Script lines that no longer fit

Listed, not edited: each is for a later card to rewrite.

| File and line | What it says | Why it no longer fits |
| --- | --- | --- |
| `src/story/script.mjs:20` | "Get the original ledger." | The book is the Master File. |
| `src/story/script.mjs:31` | "The original is downstairs." / "Then I'm going downstairs." | The game climbs up the tower. |
| `src/story/script.mjs:32` | "Get yourself out. With the ledger if you can." | They go up for the Master File, not out. |
| `src/story/script.mjs:38-43` | Scene 3 in the break room: "Signed off at the top.", the wall speaker, "Bring me the ledger." | Bellwether's signature is found in Stage 4 and he turns on them there; after the Great Seal comes the final choice, not a phone call. |
| `src/story/script.mjs:82` | "NO LEDGER WAS HARMED" | Ledger again; the Master File. |
| `src/story/script.mjs:59-60` | Ward and Mercer on the select screen | Fits, but neither line says caseworker; worth a look with the rewrite. |
| `README.md:3-5` | "Two underworld auditors ... one long night in a late-1980s corporate office ... one beat-'em-up stage, then one ranged-magic escape." | Caseworkers for the recently deceased, a tower, six stages. |
| `docs/WORKER-BOOTSTRAP.md:8-9` | "two underworld auditors, one night in a late-1980s office run by corporate vampires" | No vampires: the staff are dead employees who don't know it. |
| `docs/research/corporate-wave.md:100` | "one night in a late-1980s office run by corporate vampires" | As above. |
| `docs/SNES-DESCENT.md:1, 12-21` | "The descent", "a step down the building", "the archive downstairs", the Permanent Secretary's seal | The arc is a climb; approval at the top is Bellwether's; the Seal is the agency's own, stolen. |
| `docs/SNES-DESCENT.md:36-37` | "Bellwether is never touched by the descent ... the one clean room on the line." | Bellwether is the final boss, bound to the Seal. |
| `docs/SNES-DESCENT.md:44-60` | The beat map: two stages, Scene 3 in the break room | Six stages; the look now rises with the floors. |
| `docs/NES-PLAN.md:109`, `docs/SNES-PLAN.md:153` | Vellum "shows his fangs" | Vellum is a desperate dead auditor, not a vampire. |
| `docs/NES-PLAN.md:132-135` | The Great Seal is "the Retention Director at the controls of a brass certification press" | The Seal is the agency's stolen seal, alive, with Bellwether bound to it. |
| `docs/NES-PLAN.md:147-149` | Scenes 1-3, word for word as the script | Same lines as above. |
