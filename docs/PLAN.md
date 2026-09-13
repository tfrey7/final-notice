# Plan — stage one up to the Reception beat

Small pieces, each one ending in something visible on the live page. Card numbers are the fleet's
work items. Art goes one character sheet at a time, and Tim judges each sheet before the next is
drawn. This plan stops at the Reception beat; the Service Floor gets planned later.

## Milestones

| # | Milestone | What Tim sees | Cards |
|---|---|---|---|
| 0 | Title screen | The title on the live page | 1449 (landed) |
| 1 | Ward moves | PRESS START, then a box walks, jumps and punches across a scrolling lobby; Ward's sheet on its own preview page | 1450 Ward's sheet, 1451 movement |
| 2 | Ward looks like Ward | The real Ward sprite walking and punching in the lobby | 1456 |
| 3 | First fight | A Security Associate walks up, punches, reels and falls; a health bar | 1457 fight (stand-in), 1460 his sheet, 1462 his sprite on the fight |
| 4 | The room | The lobby becomes the night-time Reception room, scrolling in layers | 1458 |
| 5 | Pick your auditor | A select screen for Ward or Mercer before the lobby | 1459 select, 1463 Mercer's sheet, 1464 Mercer playable |
| 6 | New moves | An evasive step that dodges a punch, and grab-and-throw | 1465 |
| 7 | Reception beat | Title → select → the whole Reception beat as either auditor: camera lock, three teaching prompts, two associates, GO arrow, cleared card, free retries | 1466 |

## Order and what runs together

```
1450 Ward's sheet ─┬─ 1456 Ward's sprite ─────────────────────┐
1451 movement ─────┤                                          │
                   ├─ 1457 fight ─┬─ 1462 associate's sprite ─┤
                   │              └─────────────┐             │
                   ├─ 1458 Reception room ──────┼─────────────┤
                   └─ 1459 select ──┐           │             │
1450 ─ 1460 associate's sheet ─ 1463 Mercer's sheet           │
                   1459 + 1463 + 1456 ─ 1464 Mercer playable  │
                                  1457 + 1464 ─ 1465 step/throw
                                    1458 + 1462 + 1464 + 1465 ─ 1466 Reception beat
```

Once 1450 and 1451 land, four cards run side by side (1456, 1457, 1458, 1459) because each touches
a different part: Ward's drawing, the enemy, the background, the menus. The three sheets (1460,
1463) touch only art files and run alongside any code card.
