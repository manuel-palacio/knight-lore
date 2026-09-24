# Map

Rooms are read off `map.png`, Paul Dunn's complete map of the original. Grid coordinates are room steps from the cauldron room: `map-<rx>-<rz>` is rx rooms east and rz rooms south of `room-001`. The castle has 62 of the original's 128 rooms, all connected; the start room is `map--4-4`.

```
rz\rx  -8 -7 -6 -5 -4 -3 -2 -1  0  1  2  3  4  5  6  7
   -5   .  .  .  .  .  .  .  #  .  .  .  .  .  .  .  .
   -4   .  .  .  .  .  .  .  #  .  .  .  .  .  .  .  #
   -3   .  .  .  .  .  .  .  #  .  .  .  .  .  .  .  #
   -2   .  .  .  .  .  .  .  #  #  .  .  #  #  .  .  #
   -1   .  .  .  #  .  .  .  #  #  .  .  #  #  .  .  #
    0   .  .  .  #  #  #  #  #  C  #  #  #  #  #  #  #
    1   .  .  .  .  #  #  #  #  #  #  #  .  .  .  .  .
    2   .  .  .  .  #  .  .  #  .  .  #  #  #  .  .  .
    3   .  .  .  .  #  .  .  #  .  .  .  .  .  .  .  .
    4   #  #  #  #  S  #  #  #  .  .  .  .  .  .  .  .
    5   #  .  .  .  #  .  .  #  .  .  .  .  .  .  .  .
    6   #  #  #  .  #  .  .  #  .  .  .  .  .  .  .  .
    7   .  .  .  .  #  .  .  .  .  .  .  .  .  .  .  .
    8   .  .  .  #  #  .  .  .  .  .  .  .  .  .  .  .
```

## How rooms are read (`tools/map`)

The scripts need Python 3 with numpy, Pillow and scipy, and run from `tools/map`.

- **The lattice.** A floor cell steps (+16, +8) px east and (-16, +8) px south; a block is 12 px tall. A room's origin is its far floor corner; the cauldron room's is (2495, 981).
- **Doors** (`arches.py`, `graph.py`). The map draws only a room's two back walls, so every arch is the west or north door of the room it stands in and, at the same time, the east or south door of the neighbour. Arches are found by template matching the cauldron room's two back arches (lit pixels and the gaps between them). The map is drawn in strips shifted up or down against each other by about 48 px (never sideways), so a room's column is exact but its row is not: a neighbour is paired with the room drawn in the same column nearest where the lattice expects it, and rooms are then named by walking the doorways from the cauldron. Two doorways the matcher cannot pair are confirmed by eye in `graph.py` (`CONFIRMED`).
- **Blocks and spike beds** (`read.py`). Block tops are solid 30 px diamonds; a top in the room's own colour that sits on its lattice gives a column (x, z, height). Spike beds are counted as short vertical strokes of the room's colour over each floor cell. `column.py` measures a stack whose top is hidden under a statue or a charm.
- **Checking** (`crop.py`). Every room was checked by eye: the reading is drawn over a magnified crop of the map (blocks as wire cubes, spikes as crosses) and corrected where they disagree. The checked reading is `rooms.json`.
- **Specs** (`emit.py`). Generates the `ROOM_SPECS` entries from `rooms.json`, placing the charms (`CHARM_ROOMS`), dropping spike cells beside a doorway (the game keeps doorways safe) and checking that every door and charm can be walked to over the floor.

Blocks with spikes on top and gargoyle pedestals are read as spikes and blocks. The grilles of the two cages (`map--1-0`, `map-4-0`) are 2-high blocks. The following are on the map but left out because the game has nothing like them or they could not be read confidently: floating blocks and stepping stones (`map-2-0`, `map-5-0`, `map--1--4`, `map--4-7`, `map--3-0`; the two floating blocks at the back wall of `map-2-1` are read as columns and the spikes under them left out), hanging spiked balls (`map-4-2`, `map--3-4`), the raised yellow platform in `map--2-1`, the furniture of `map--7-6`, the flames of `map-3-2`, `map--1--5` and `map--7-4`, and most of the guards, balls and ghosts. Spike cells dropped beside doorways: `map-0-1`, `map--3-0`, `map--1-5`, `map--4-6`, `map-7--3`, `map--4-7`, `map--8-5`.

## Still missing

- Six rooms found but not placed, because their doorways lead to two different grid positions: the rooms drawn at (320, 853), (175, 877), (320, 950), (465, 1023), (465, 1071) and (610, 998) south-west of `map--8-6`. `map--8-6`'s south door and `map--5-8`'s west door lead there and are closed for now. `map--5--1`'s north door leads to a room drawn at about (2060, 615) whose origin could not be pinned, also closed.
- Rooms with arches that are not joined to the castle by an arch: the group north of `map--1--2` (map x 2050 to 2790, y 100 to 620, about 12 rooms), the group south-east of `map-2-2` (x 1910 to 2790, y 1720 to 2020, about 10 rooms), the group east of `map-7--4` (x 3940 to 4530, y 880 to 1180, about 8 rooms), and a short chain below `map--1-3` (x 1320 to 2210, y 1120 to 1300). They join through garden rooms or through doorways drawn in strips the matcher cannot pair.
- The garden rooms: their walls are hedges and trees and their doors are gaps in them, not arches, so the arch detector does not see them. Only `map--1--5` is in, through its one arched door.

## Facts about the original still to match

The wolf jumps higher than the man, some monsters only attack the wolf, some blocks fall under Sabreman's weight, and the cauldron asks for 14 charms.
