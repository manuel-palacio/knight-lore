# Knight Lore — Vertical Slice Design Specification

## Purpose
This document defines the first **10–20 room vertical slice** for production of a modern Android remake of **Knight Lore**. It provides concrete room-by-room design for the playable prototype that proves the core loop works: find cauldron, learn request, navigate castle, collect item, return safely under day-night pressure.[web:18][web:21][web:17]

The slice demonstrates:
- isometric readability,
- carry/drop mechanics,
- first hazards,
- transformation pressure,
- cauldron progression,
- room-to-room route planning,
- puzzle variety without overwhelming scope.[web:27][web:34][web:6]

## Slice goals
The vertical slice must prove six things:
1. Player can find the cauldron and understand the request loop.[web:34]
2. Basic traversal, carry, and return feels satisfying.[web:18]
3. Hazards create readable tension.[web:17]
4. Day-night transformation matters to routing.[web:18][web:21]
5. Rooms are mechanically distinct and memorable.
6. Content pipeline supports room authoring without code changes.

## Slice scope
**15 rooms total**, divided into:
- 1 cauldron room,
- 4 connector/traversal rooms,
- 4 item rooms,
- 3 hazard rooms,
- 2 transformation rooms,
- 1 carry puzzle room.

**3 cure requests** to complete the loop:
1. Crystal ball,
2. Goblet,
3. Poison vial.[web:6][web:34]

## Room numbering
Rooms use the pattern `room_001` to `room_015`. IDs are stable for save/load and debugging.

## Cauldron room (room_001)
**Role**: progression hub, tutorial space.
- **Theme**: arcane ritual chamber.
- **Mechanics**: jump on cauldron → shows request icon.
- **Entrances**: north, east, south (west locked until later).
- **Hazards**: none (safe hub).
- **Special**: cauldron accepts correct item, rejects wrong item (modern mode), dangerous in werewulf form (classic mode).[web:34][web:16]
- **Visual cue**: central cauldron dominates, magical glow.

## Starting room (room_002)
**Role**: spawn point, movement tutorial.
- **Theme**: ancient stone entry hall.
- **Mechanics**: teach 8-direction movement, jump arc, basic block climbing.
- **Exit**: south to room_001 (cauldron).
- **Hazards**: none.
- **Item**: none (pure tutorial).

## Connector 1 (room_003)
**Role**: safe navigation, room memory intro.
- **Theme**: ancient stone corridor.
- **Mechanics**: simple block layout, introduce room-flip transitions.
- **Exits**: north to room_002, east to room_004 (first item), south to room_007.
- **Hazards**: none.

## First item room — Crystal ball (room_004)
**Role**: first pickup success.
- **Theme**: dusty relic vault.
- **Mechanics**: pickup tutorial, short carry return to cauldron.
- **Item**: crystal ball (request #1).
- **Exits**: west to room_003.
- **Hazards**: none.
- **Placement**: on raised platform, simple jump access.

## Hazard intro — Spike room (room_005)
**Role**: first danger, jump rhythm.
- **Theme**: trap corridor.
- **Mechanics**: spike field with safe jump timing.
- **Exits**: north to room_007, south to room_008.
- **Hazards**: spike tiles (jump over).
- **Item**: none.

## Second connector (room_006)
**Role**: route choice intro.
- **Theme**: ancient stone stairs.
- **Mechanics**: two paths to next item — safe long vs risky short.
- **Exits**: north to room_003, east to room_005, south to room_009.
- **Hazards**: none.

## Second item room — Goblet (room_007)
**Role**: carry puzzle intro.
- **Theme**: banquet vault.
- **Mechanics**: goblet on high shelf, requires block stack or precise jump.
- **Item**: goblet (request #2).
- **Exits**: north to room_006, west to room_005.
- **Hazards**: none.
- **Placement**: requires standing on movable block to reach.

## Transformation pressure room (room_008)
**Role**: first day-night consequence.
- **Theme**: moonlit curse chamber.
- **Mechanics**: long narrow path, transformation likely during crossing.
- **Exits**: north to room_005.
- **Hazards**: falling blocks activated during werewulf form.
- **Item**: none.
- **Special**: dusk phase warning prominent.

## Carry puzzle room (room_009)
**Role**: object-as-tool mechanics.
- **Theme**: alchemist lab.
- **Mechanics**: poison vial behind hazard gap, requires carrying block or item to bridge.
- **Item**: poison vial (request #3).
- **Exits**: north to room_006.
- **Hazards**: ember vents (timed).
- **Placement**: vial on ledge, requires carried object to access.

## Enemy intro room (room_010)
**Role**: first moving threat.
- **Theme**: guard hall.
- **Mechanics**: patrol enemy blocks simple path.
- **Exits**: east to room_011, west to room_012.
- **Hazards**: patrol guard (contact damage).
- **Item**: none.

## Branching route room (room_011)
**Role**: route optimization.
- **Theme**: crossroads chamber.
- **Exits**: west to room_010, north to room_013 (safe long), south to room_014 (risky short).
- **Hazards**: none.
- **Special**: split paths to recovery room.

## Recovery room (room_012)
**Role**: safe breather.
- **Theme**: quiet alcove.
- **Exits**: east to room_010.
- **Hazards**: none.
- **Item**: extra life pickup (optional).

## Late slice hazard — Crusher room (room_013)
**Role**: advanced hazard timing.
- **Theme**: mechanical trap.
- **Mechanics**: moving crusher blocks, requires rhythm jumping.
- **Exits**: south to room_011.
- **Hazards**: crushers (vertical motion).
- **Item**: none.

## Risky shortcut (room_014)
**Role**: high-reward route.
- **Theme**: unstable ledge.
- **Mechanics**: short cut to room_015, but spike-heavy.
- **Exits**: north to room_011, east to room_015.
- **Hazards**: spike field.

## Slice capstone — Return challenge (room_015)
**Role**: full loop test.
- **Theme**: gauntlet antechamber.
- **Mechanics**: combines jump rhythm, enemy dodge, block carry.
- **Exits**: west to room_014, south back to room_001 path.
- **Hazards**: patrol enemy + timed spikes.
- **Item**: none.

## Progression flow
```
Start → room_002 (tutorial) → room_001 (cauldron #1: crystal ball)
       ↓
room_003 → room_004 (crystal ball pickup) → return
       ↓
room_006 → room_007 (goblet pickup) → return via room_005 spikes
       ↓
room_009 (poison via carry puzzle) → return via room_008 transformation
       ↓
room_010 enemy → room_011 branch → room_013 crushers OR room_014 spikes
       ↓
room_015 gauntlet → back to cauldron for #3
```

## Room theme assignments
- Rooms 001–003, 006: ancient stone.
- Room 004: dusty relic.
- Room 005, 013: trap corridor.
- Room 007: banquet vault.
- Room 008: moonlit curse.
- Room 009: alchemist lab.
- Rooms 010–012, 014–015: guard hall variants.

## Mechanics checklist
- ✅ Movement/jump tutorial
- ✅ Cauldron request loop (3 items)
- ✅ Item pickup/carry/drop
- ✅ Block stacking
- ✅ Spike hazards
- ✅ Enemy contact
- ✅ Transformation pressure
- ✅ Route choice (safe vs risky)
- ✅ Combined challenge room

## Validation criteria
The slice is production-ready when:
- New player completes first 3 requests without hints.
- Transformation creates meaningful route decisions.
- Every room has a unique mechanical purpose.
- No soft locks possible.
- Save/load preserves exact state.
- Day-night meter guides without handholding.
- Art assets fit and read clearly.[web:18][web:21][web:17]

## Content production steps
1. Author JSON for these 15 rooms using puzzle spec.
2. Validate exits and item placements.
3. Test full 3-request loop.
4. Tune hazard timing and jump forgiveness.
5. Polish art for slice rooms.
6. Add debug room selector.

## Next expansion
After slice validation, expand to 30–40 rooms by adding:
- More item duplicates,
- Advanced transformation puzzles,
- Multi-room retrieval chains,
- Shortcut unlocks.

This slice proves the remake works before full production commitment.[web:27][web:34]
