# Map

The original castle has 128 rooms on a fixed grid and the wizard asks for 14 charms in sequence. Ours is 23 rooms and 8 charms so far. Rooms are 8x8 cells; doors sit mid-edge. Every door on this grid is reciprocated (enforced by `tests/scenes/RoomSpecs.test.ts`).

Columns run west to east, rows north to south. The start room is 002 and the cauldron is in 001, directly south of it.

| row \ col | -2 | -1 | 0 | 1 | 2 | 3 |
|---|---|---|---|---|---|---|
| -1 | | | 022 Gatehouse | 023 Battlements | | |
| 0 | 014 Buttery | 006 Cellar | **002 Start** | 010 Gallery | 007 Gate | 017 Rampart |
| 1 | 015 Oubliette | 009 Store | **001 Cauldron** | 003 Hub | 004 Block puzzle | 011 Armoury |
| 2 | | 016 Vault | 008 Pit | 005 Gauntlet | 012 Crypt | 018 Kennel |
| 3 | | | 019 Undercroft | 013 Well | 020 Tower foot | |
| 4 | | | | 021 Well bottom | | |

Rooms 001 to 005 are hand-built in `src/scenes/rooms/Room00*.ts`; the rest are data in `src/scenes/rooms/roomSpecs.ts`.

Charm placement: boot 006, goblet 007, poison 008, gem 009, teacup 010, wine bottle 011 (on the high ledge), life 012, crystal ball 013 (top of the stair).

## Toward the original

Grow the grid outward in batches of ten rooms, keeping every door reciprocated. Facts about the original worth matching as rooms are added: the wolf jumps higher than the man, some monsters only attack the wolf, some blocks fall under Sabreman's weight, and the day timer is visible on screen.
