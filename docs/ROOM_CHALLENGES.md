# Room Challenges — Playtest Guide

## Controls

- **Arrow keys** — Move (8 directions with diagonals)
- **Space** — Jump
- **E** or **Enter** — Action (pick up item / drop item / deliver to cauldron)

## Goal

Collect 4 items and deliver them to the cauldron in order: **Goblet → Gem → Wine Bottle → Crystal Ball**. You must be in HUMAN form to deliver items. The werewolf transformation happens on a timer — plan your trips.

> **You start in Room 002.** Room numbers don't match play order — follow the Optimal Route at the bottom.

---

## Room 002 — START (Castle/Yellow) ← YOU START HERE

**Challenge:** None — this is the tutorial room.

- You spawn here. No enemies, no hazards.
- A **Goblet** sits on the floor at the far corner — walk over and press action to pick it up.
- One solid block in the center to walk around (teaches movement).
- One pushable block near the wall (teaches pushing — walk into it).
- Exit: **SOUTH** to Room 001 (Cauldron).

**Test:** Can you pick up the Goblet and walk south to room 001?

---

## Room 001 — CAULDRON (Castle/Yellow)

**Challenge:** Deliver items while dodging the guard.

- The cauldron sits on a raised 2×2 platform at center.
- A **patrol guard** circles the cauldron area. You must time your approach.
- Walk up to the cauldron and press action with the correct item in inventory.
- Must be HUMAN form to deliver (werewolf gets damaged in this room).
- Exits: **NORTH** to Room 002, **EAST** to Room 003.

**Test:** Can you deliver the Goblet while avoiding the guard? Does the HUD show "CURE: 1/4"?

---

## Room 003 — HUB (Tower/Blue)

**Challenge:** Cross the room while dodging two patrol enemies.

- A **Gem** sits in the top-left corner (1.5, 1.5).
- Two patrol enemies cross paths:
  - One patrols **east-west** (y=2 line)
  - One patrols **north-south** (x=4 line)
- You must time your movement to slip between their patrol patterns to reach the Gem.
- No hazards, no blocks — pure enemy avoidance.
- Exits: **WEST** to Room 001, **EAST** to Room 004, **SOUTH** to Room 005.

**Test:** Can you grab the Gem without getting hit? Do the two enemies create a timing challenge at their crossing point?

---

## Room 004 — BLOCK PUZZLE (Dungeon/Green)

**Challenge:** Push a block to create a step, then jump up to reach the item.

- A **Wine Bottle** sits on a raised SOLID_BLOCK platform at (5,5, z=1).
- You can't jump high enough to reach it from the floor alone.
- Two pushable blocks on the floor: one at (2,5) and one at (3,2).
- **Solution:** Push one block adjacent to the platform (to position 4,5 or 5,4), then jump onto the block, then jump onto the platform to grab the Wine Bottle.
- One hazard tile at (6,6) near the platform — don't fall off the wrong side.
- One slow patrol enemy adds pressure.
- Exit: **WEST** to Room 003.

**Test:** Can you push a block next to the platform and use it as a stepping stone? Is the jump from block → platform achievable?

---

## Room 005 — HAZARD GAUNTLET (Dungeon/Green)

**Challenge:** Navigate through a field of spike hazards to reach the item.

- A **Crystal Ball** sits at (6.5, 6.5) on the far side of the room.
- Two rows of hazard tiles block the path:
  - **Row y=3:** Spikes at x=1,2,3,5,6 — safe passage at **x=4**
  - **Row y=5:** Spikes at x=2,3,4,5,6 — safe passage at **x=1**
- You must weave through the narrow safe gaps — requires precise diagonal movement.
- A **ghost** enemy pursues you (especially aggressive in werewolf form).
- Exit: **NORTH** to Room 003.

**Test:** Can you navigate the hazard maze without dying? Is the ghost adding pressure without making it impossible? Are the safe passages (x=4 at y=3, x=1 at y=5) clearly navigable?

---

## Map

```
        Room 002 (START)
            |
          south
            |
        Room 001 (CAULDRON) ── east ── Room 003 (HUB)
                                         |         \
                                       south      east
                                         |           \
                                     Room 005      Room 004
                                    (GAUNTLET)   (BLOCK PUZZLE)
```

## Optimal Route

1. Start in Room 002 → pick up Goblet → go south
2. Room 001 → deliver Goblet to cauldron → go east
3. Room 003 → dodge enemies, pick up Gem → go west
4. Room 001 → deliver Gem → go east
5. Room 003 → go east
6. Room 004 → push block, jump up, get Wine Bottle → go west
7. Room 003 → go west
8. Room 001 → deliver Wine Bottle → go east
9. Room 003 → go south
10. Room 005 → navigate hazards, get Crystal Ball → go north
11. Room 003 → go west
12. Room 001 → deliver Crystal Ball → **QUEST COMPLETE**
