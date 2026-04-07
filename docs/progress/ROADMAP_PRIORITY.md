# Knight Lore — Prioritised Fix Roadmap

Assessment date: 2026-04-08. Based on full codebase review of `RoomEntityFactory`, `GameEngine`,
all domain systems, `DesktopHud`, and domain models.

Current scores: Playability 3/10 · Puzzles 2/10 · HUD 7/10 · Graphics 5/10 · Character 6/10

---

## PHASE 1 — Fix the Exits (Graphics foundation) ✅ DONE

**Why first:** Everything else looks bad while exits are broken. Two systems fight each other.
The blue sci-fi portal glow clashes with stone palette. Jambs render at full block width instead
of their narrow 0.35-tile width. Lintel sits at z=3 (above wall cap).

### 1A — Unify exit rendering into a single system

In `RoomEntityFactory.buildWalls()`:

**Remove `drawExitMarker()` entirely for NORTH and WEST exits.** They are already handled by
`doorArchway()`. The current code does not call `drawExitMarker` for N/W — good. Do not add it.

**For SOUTH and EAST exits**, replace `drawExitMarker(withPillars = true)` with a new
`drawWalllessExit()` function that:
1. Draws two narrow stone pillar columns (width = 0.2 tiles) at the gap edges — no full block
2. Draws a flat dark void between them at `z=0..2` — colour `ZXPalette.BLACK` with alpha `0xDD`
3. Draws NO glow line — remove the `0xBB_6666CC` blue shimmer entirely
4. Keeps the lighter floor threshold tile (the `0xFF_4A4A6A` diamond is fine)
5. Keeps the pulsing unexplored marker dots (grey, not blue)

### 1B — Fix `doorArchway()` jamb geometry

Current jamb faces call `blockFaceLeft(gx, gy, ...)` which renders the FULL tile width.
Jambs are declared as `x=[gx, gx+0.35]` for left and `x=[gx+0.65, gx+1]` for right,
but the face quad ignores this and spans the full tile.

**Fix:** Replace each jamb face `DrawPayload.DitheredPath` with a manually constructed
narrow quad:

```kotlin
// Left jamb face (north wall): x from gx to gx+0.30
val jambPts = listOf(
    pt(gx,       gy + 1f, bz,      ox, oy),
    pt(gx + 0.30f, gy + 1f, bz,    ox, oy),
    pt(gx + 0.30f, gy + 1f, bz+1f, ox, oy),
    pt(gx,       gy + 1f, bz+1f,   ox, oy),
)
```

Apply the same pattern for the right jamb (x from `gx+0.70` to `gx+1.0`) and equivalents
for west wall jambs.

### 1C — Fix lintel height

Change `floorDiamond(gx, gy, 3f, ...)` to `floorDiamond(gx, gy, 2f + 1f, ...)` — this is
fine — but the face block must use `blockFaceLeft(gx, gy, 2f, ...)` not `2f` cap at `3f`.
The lintel top diamond at z=3 appears as a floating cap above the wall. Move it to z=2 so it
is flush with the wall top.

### 1D — Remove springer triangles (simplify)

The springer triangles added tonight at `z=1.2→2` are too small at game scale and cause
z-fighting with the void rect. **Remove both `${id}_spr_l` and `${id}_spr_r` commands** from
both north and west `doorArchway()` branches. A clean rectangular opening looks better than a
botched arch at this resolution.

---

## PHASE 2 — Distinct Item Visuals ✅ DONE (basic — colors/sizes per type)

**Why:** The HUD says `NEED: crystal_ball` but every item in the world looks identical
(gold pulsing oval). The player cannot act on the HUD information. This breaks the core loop.

In `RoomEntityFactory.build()`, replace the single generic item oval with type-specific shapes.
The `ItemInstance.type: ItemType` is available — use it.

### Item visual shapes (implement in `buildItemCommands(item, offset, commands, tick)`):

| ItemType | Shape | Colour |
|----------|-------|--------|
| CRYSTAL_BALL | Oval 20×20 + inner glow oval 10×10 | `0xFF_88CCFF` outer, `0xFF_FFFFFF` inner |
| GOBLET | Trapezoid (wide top, narrow base) + stem line | `0xFF_CCAA44` gold |
| WINE_BOTTLE | Tall narrow rect + oval neck | `0xFF_4A2200` brown |
| GEM | Diamond polygon (4-point) | `0xFF_FF44AA` magenta |
| POISON_VIAL | Small rect body + round top | `0xFF_44FF44` acid green |
| BOOT | L-shaped polygon | `0xFF_6A4A28` leather |
| TEACUP | Wide oval + small handle line | `0xFF_EEEECC` cream |
| KEY | Line + oval bow + 2 tooth lines | `0xFF_CCAA44` gold |
| TORCH | Rect body + flame oval | `0xFF_AA6600` + `0xCC_FF8800` |
| SKULL | Oval + 2 dark eye ovals | `0xFF_DDDDCC` bone |
| CAULDRON_INGREDIENT | Small pentagon | `0xFF_228822` herb green |
| ORNAMENT | Star polygon (6 points) | `0xFF_FFDD44` |

All items retain the pulsing glow halo (`sin(tick * 0.07)`) but in their own colour family.

---

## PHASE 3 — Enemy Spawning in All Rooms ✅ DONE

**Why:** `actorStates` is hard-coded to `emptyList()` in `GameEngine.initialize()`.
Guards, Ghosts, Robots, Druids all exist as beautiful render code but are never spawned.
`PatrolEnemy` spawns only from the start room.

### 3A — Wire `ActorSpawn` data into engine initialisation

In `GameEngine.initialize()`, replace:
```kotlin
val actorStates: List<ActorState> = emptyList()
```
with:
```kotlin
val actorStates: List<ActorState> = content.rooms.values.flatMap { room ->
    room.actors.map { spawn ->
        ActorState(
            id = ActorId("${room.id.value}_${spawn.actorType.name}_${spawn.position}"),
            type = spawn.actorType,
            position = spawn.position,
            roomId = room.id,
        )
    }
}
```

### 3B — Extend `PatrolEnemy` spawn to ALL rooms (not just startRoom)

In `GameEngine.initialize()`, change:
```kotlin
val patrolEnemies = startRoom?.patrolSpawns?.map { ... } ?: emptyList()
```
to:
```kotlin
val patrolEnemies = content.rooms.values.flatMap { room ->
    room.patrolSpawns.map { spawn ->
        PatrolEnemy(id = spawn.id, position = Vec3f(spawn.startX, spawn.startY, 0f),
            path = spawn.path, speed = spawn.speed, targetIndex = 0)
    }
}
```

### 3C — Add `PatrolEnemySystem` room filtering

`PatrolEnemySystem` must filter enemies by `currentRoomId` before updating positions.
Currently it updates all patrol enemies every tick regardless of room — enemies in other rooms
still move, wasting CPU and causing position drift.

### 3D — Populate room `actors` and `patrolSpawns` in the room builder/DSL

Each room definition should declare at least 1-2 actors appropriate to its `RoomType`:
- `DUNGEON` rooms → 1 Guard patrol
- `CRYPT` rooms → 1-2 Ghost actors
- `CAVERN` rooms → 1 Druid actor
- `FLOODED` rooms → 1 Ball actor (bouncing hazard)
- `THRONE_ANTECHAMBER` → 1 CauldronGuardian actor

---

## PHASE 4 — Block Puzzles in Rooms ✅ DONE

**Why:** `BlockPhysicsSystem` is fully implemented (push, fall, crack warning, destroy).
`BlockSpawn` data model exists. But `blockSpawns` is only populated for the start room.
The puzzle layer is built — it just has no content.

### 4A — Extend `dynamicBlocks` initialisation to ALL rooms

In `GameEngine.initialize()`, change:
```kotlin
val dynamicBlocks = startRoom?.blockSpawns?.map { ... } ?: emptyList()
```
to:
```kotlin
val dynamicBlocks = content.rooms.values.flatMap { room ->
    room.blockSpawns.map { spawn ->
        BlockState(id = spawn.id, gridX = spawn.gridX, gridY = spawn.gridY,
            gridZ = spawn.gridZ, pushable = spawn.pushable)
    }
}
```

### 4B — Design 3 "push block to reach item" rooms

For 3 rooms in the game, place a `SOLID_BLOCK` tile elevated at `gz=1`, with an `ItemAnchor`
on top of it (`z=2`). Place a `BlockSpawn` (pushable block, `gz=0`) adjacent.
The player must push the block under the elevated tile, jump on the stack, collect item.
This uses: `BlockPhysicsSystem` + `CollisionSystem` + jump + `ItemSystem` — all working.

### 4C — Design 1 "falling block" trap room

Place a `BlockSpawn` with `pushable=false` over a `HAZARD` tile. When the player stands on
the block for > 60 ticks, `fallingTicks` triggers the crack warning, then the block falls.
Player must collect item and escape before block drops. Already implemented — needs room data.

### 4D — Add `InteractiveKind.SWITCH` + `GATE` wiring

`InteractiveDef` and `InteractiveKind` already define SWITCH and GATE — but no system handles
them. Add a `SwitchSystem` that:
1. Detects player proximity to a SWITCH interactive
2. On press (space/action key), toggles a GATE interactive in the same room (removes SOLID_BLOCK tiles)
3. Emits a `GateOpened` event for sound/visual feedback

---

## PHASE 5 — Character Polish ✅ DONE

### 5A — Jump animation
When `player.airborne == true`, change character pose:
- Arms: raise both arms upward (swap arm rect Y by -8f)
- Legs: tuck both legs (reduce legH to 6f, spread X by ±4f)
- Hat: add +2f Y offset (hat floats up slightly)

### 5B — Body facing by direction
Currently only eyes shift ±3px on facing change. The whole character should lean:
- `NORTH/WEST` facing: shift entire body -4f X, skew arm positions
- `EAST/SOUTH` facing: shift +4f X
- This gives the illusion of rotation without a full sprite system

### 5C — Werewolf walk cycle differentiation
Werewolf uses the same `leftLegFwd/rightLegFwd` vars as human but the body is a polygon.
Add distinct arm-swing: front legs should use `bodyPts` offset variation, not the human arm rects.

---

## PHASE 6 — HUD Polish ✅ DONE (6C day/night tint)

### 6A — Item icon in HUD matches in-world item type
The inventory shows `itemId.value.substringBefore("_").uppercase()` as a text label.
Replace with a small Canvas item glyph matching the Phase 2 item shapes (16×16 mini render).

### 6B — Room name on transition
On `RoomTransitionSystem` firing, show a brief (2-second) centred text overlay with the room's
`RoomType` name: e.g. "ENTERING THE CRYPT" in bone-white, fading out.

### 6C — Day/Night sky tint
Add a very subtle full-screen colour overlay (2% alpha) driven by `DayPhase`:
- DAY → no overlay
- DUSK → `0x08_FF6600` warm orange wash
- NIGHT → `0x0A_000044` cold blue wash
- DAWN → `0x06_FFAAAA` pink wash

---

## Implementation Order for Claude

```
Phase 1A → 1B → 1C → 1D   (exits — ~2 hours, one file: RoomEntityFactory.kt)
Phase 2                     (items — ~1 hour, RoomEntityFactory.kt)
Phase 3A → 3B → 3C         (enemy spawn wiring — ~1 hour, GameEngine.kt + PatrolEnemySystem.kt)
Phase 4A → 4B → 4C         (block puzzles — ~2 hours, GameEngine.kt + room data)
Phase 3D + 4D               (room content + switch/gate — ~3 hours, room builder)
Phase 5A → 5B → 5C         (character — ~1 hour, RoomEntityFactory.kt)
Phase 6A → 6B → 6C         (HUD — ~1 hour, DesktopHud.kt + RoomEntityFactory.kt)
```

Each phase is independently testable. Phases 1-3 unblock the core gameplay loop.
Phases 4-6 add depth and polish. Do not start Phase 3D until Phases 1 and 2 are verified
in-game — visual clarity must come before content volume.
