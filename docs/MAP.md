# Map

Rooms are read off `map.png`, Paul Dunn's complete map of the original, by two detectors: door arches (template-matched, one arch template and its mirror) vote each room's far floor corner, and solid block top faces are snapped to the isometric lattice with their side-face heights. Grid coordinates are room steps from the cauldron room; the map places rooms 145 px apart in x and 73 px in y per step.

The detector currently places 85 of the original's 128 rooms with their doors. Specs exist for the 11 rooms within two steps of the cauldron; the rest are generated the same way as they are needed. Blocks and doors only so far: spikes, tables, items, and enemies in mapped rooms still have to be read (they are visible on the map, the detectors for them are not written yet).

| rz \ rx | -1 | 0 | 1 | 2 |
|---|---|---|---|---|
| -2 | map--1--2 |  |  |  |
| -1 | map--1--1 | map-0--1 |  |  |
| 0 | map--1-0 | room-001 (cauldron) | map-1-0 |  |
| 1 | map--1-1 | map-0-1 | map-1-1 | map-2-1 |
| 2 | map--1-2 |  |  | map-2-2 |

Start room is `map--1-0` (west of the cauldron) until the original's start room is identified. Charms are spread one or two per mapped room.

## Facts about the original still to match

The wolf jumps higher than the man, some monsters only attack the wolf, some blocks fall under Sabreman's weight, and the cauldron asks for 14 charms.
