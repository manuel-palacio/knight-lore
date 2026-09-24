# Playtest log

## 2026-09-25: automated pass

Two Playwright suites stand in for a player, both on the real keyboard:

- `tests/e2e/reachability.spec.ts` enters every room through its first door and walks to the charm and out of every other door. All 30 rooms pass.
- `tests/e2e/playthrough.spec.ts` (`npm run test:playthrough`) plays a whole game from the start room on the real day clock: routes to each wanted charm, carries it back, waits out the night, delivers.

### Blockers found and fixed

| Room | Problem | Fix |
|---|---|---|
| every room | Doors dropped Sabreman at x=8, half a tile off the doorway axis (door centre is x=9) | `entryFor` puts him on the axis |
| map--1--3 | Off-axis entry pinned him against the block beside the north door: the room could not be crossed | same |
| any | A charm dropped at nightfall vanished from the room and reappeared in its home room | the charm moves to the room it is dropped in |
| any | A charm dropped on a block went inside the block | dropped at Sabreman's height |
| any | A continued game put delivered charms back on the floor | delivered charms are left out when rooms are built |

### Day length

The first full-game run showed a charm could never be carried to the cauldron in one day: the far charms are about ten rooms from the cauldron, a room takes three to five seconds to cross, and a day was 20 seconds. The bot ferried the gem a few rooms per day, dropping it at every nightfall. Day is now 60 s and night 30 s (the wolf can neither pick up nor deliver, so night is mostly waiting); 40 days come to about an hour. Dusk warning 2 s → 5 s so there is time to put a charm down somewhere sensible.

### Fourteen charms

As the original: seven kinds, each asked for twice, so fourteen deliveries. The second copies went into rooms that were empty. The extra life is no longer part of the cure: E takes it at once, +1 life. Saves from the eight-charm version are refused at load because their cure asked for the life.

### Charm placement

Charms were bunched one to three rooms from the start, all on the start side of the castle; the cauldron side had none. They now sit at the ends of the far branches, none beside the start and none within two rooms of the cauldron (`RoomSpecs.test.ts`).

### Empty rooms

The start room is empty as in the original. map--1-1, a four-way crossroads the map read left bare, has spike beds in its diagonals so the cross paths stay open.

### Cauldron room at night

Nothing stopped the wolf loitering by the cauldron. A spirit now rises from it at nightfall and hunts the wolf (`CauldronSpirit`). It takes 3 s to rise, longer than the 2.2 s seizure, so a man caught delivering at dusk gets a moment to run.

### What the bot runs taught

- A wolf who idles in a ghost room loses every life in about fifteen seconds: each death respawns him at the door with two seconds' grace and the ghost back at its post. A player who moves on is safe (the wolf outruns a ghost), so this is left as is, but it is the harshest thing in the game. If playtesters trip on it, give the respawn grace until the wolf first moves.
- Night falls mid-leg often enough that anything scripted (and any player) must expect the two-second seizure at any moment.
- Run 9 reached day 12 with 8 charms delivered and found a softlock: a room was built without its charm whenever the other copy of that kind had been delivered first (the builder counted deliveries per kind). With every kind asked for twice, the game could not be won. Rooms now remember whose charm was used up (`GameState.emptiedRooms`), which also keeps a taken extra life from coming back after continue.
- The guard in map--1-2 takes a life from the bot on the way out with the poison: a timing puzzle, left as is.
- **Run 10 won**: fourteen charms delivered on day 20 of 40 with four lives left, 30 minutes of real time, keyboard only. The game is winnable as a player plays it.
