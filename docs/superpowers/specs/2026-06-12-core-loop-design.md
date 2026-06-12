# Core Loop Design — 5 Rooms, Cure Quest, Days + Lives

Date: 2026-06-12
Status: approved
Prereqs: single-room MVP (`src/scenes/TheHall.ts`), room layout spec in `docs/ROOM_CHALLENGES.md`

## Goal

Turn the single-room engine demo into a winnable, losable game: 5 connected rooms
(per `ROOM_CHALLENGES.md`), an interactive cauldron with a 4-item cure sequence,
a 40-day timer, and 5 lives. Win = deliver all 4 items. Lose = day 40 expires or
lives reach 0.

## Decisions made during brainstorming

- **Room model: cached rooms, swap on transition** (approach C). Rooms are built
  lazily on first entry and kept alive but detached when left. State persists
  across visits (taken items stay gone, pushed blocks stay pushed). This diverges
  from the original game's reset-on-entry behavior — deliberate, friendlier.
- **Room layout: `docs/ROOM_CHALLENGES.md` as written** — 5 rooms, exits, item
  placements, enemy patterns, and the cure order Goblet → Gem → Wine Bottle →
  Crystal Ball are all taken from that doc verbatim.
- **Lose rules: original-style days + lives.** 1 day = one full human→werewolf→human
  cycle (40 s at current 20 s/form). Game over at day 40 (~27 min) or 0 of 5 lives.
- **No start screen, no audio, no distribution tables** in this slice.

## Components

### RoomManager (new — `src/game/RoomManager.ts`)

- `rooms: Map<string, Room>` cache; `builders: Map<string, RoomBuilder>` where
  `RoomBuilder = (loader, state) => Promise<Room>` (async to match existing
  `buildTheHall` signature).
- `transitionTo(roomId, entryX, entryZ)`:
  1. `scene.remove(currentRoom.group)`
  2. build target room if not cached, `scene.add(target.group)`
  3. place player at `(entryX, entryZ)`, ground him, `visual.resetMotion()`
  4. set `state.currentRoomId`; record entry point as the room's respawn point
- Only the active room's `update()` runs each tick. Inactive rooms freeze.
- **Exits**: each room declares `exits: Exit[]` with
  `{ direction: 'north'|'south'|'east'|'west', targetRoomId, entryX, entryZ }`.
  An exit triggers when the player's position crosses the room edge on that side
  (the existing `door.open && z > threshold` check, generalized). Door entities
  remain visual-only (arch + slab).

### Room definitions (new — `src/scenes/rooms/`)

One builder per room, matching `ROOM_CHALLENGES.md`:

| File | Room | Contents |
|---|---|---|
| `Room002Start.ts` | start | goblet, 1 solid block, 1 push block; exit S→001 |
| `Room001Cauldron.ts` | cauldron | cauldron on raised 2×2 platform, 1 patrol guard; exits N→002, E→003 |
| `Room003Hub.ts` | hub | gem at (1.5,1.5), E-W patrol on y=2, N-S patrol on x=4; exits W→001, E→004, S→005 |
| `Room004BlockPuzzle.ts` | puzzle | wine bottle on platform (5,5,z=1), push blocks at (2,5)+(3,2), hazard tile (6,6), slow patrol; exit W→003 |
| `Room005Gauntlet.ts` | gauntlet | crystal ball (6.5,6.5), spike row y=3 (gap x=4), spike row y=5 (gap x=1), ghost; exit N→003 |

Player starts in Room 002. `TheHall.ts` is unwired from `main.ts` but kept on
disk for reference (shared structure helpers stay in `Structure.ts`).

### Cauldron (new — `src/game/Cauldron.ts`)

- `sequence = ['goblet', 'gem', 'wine-bottle', 'crystal-ball']`, `progress = 0`,
  `wantedItem` getter.
- Delivery: action key (E/Enter) within interaction range while `form === 'human'`
  and carrying `wantedItem` → consume item from inventory + player carry visual,
  `progress++`, emit `delivered` via callback.
- Wrong item or werewolf form → no delivery; HUD shows what it wants.
- `progress === 4` → `state.won = true`.
- **Werewolf danger**: while the player is in the cauldron room in werewolf form,
  a 1.5 s grace timer runs; on expiry, `loseLife()`. Timer resets on leaving the
  room or returning to human.

### SpikeGrid (new — `src/game/SpikeGrid.ts`)

- Constructor takes a list of tile coords; places a spike cone mesh per tile and
  marks each as `Category.HAZARD`.
- Contact handled by the generic hazard pass in main.ts (below).

### GhostEnemy (new — `src/game/GhostEnemy.ts`)

- Pursues the player: velocity toward player at base speed; speed ×1.6 when
  `state.form === 'werewolf'`.
- Floats at fixed height, ignores grid collision (passes through walls/blocks).
- Marked `Category.HAZARD`.

### GameState extensions (`src/game/GameState.ts`)

- `lives = 5`; `loseLife()` decrements, fires `onLifeLost` (main.ts respawns
  player at current room's entry point); at 0 → `gameOver = true`,
  `gameOverReason = 'lives'`.
- `dayCount = 1`; increments inside `tickTransform` each time form returns to
  `'human'` (one full cycle). `dayCount > 40` → `gameOver = true`,
  `gameOverReason = 'days'`. Day count derives from the transform cycle — one
  clock, no drift.
- `cureProgress` mirrors cauldron progress for HUD/tests.
- Existing drop-item-on-transform behavior unchanged.

### main.ts generalization

Replace the goblet/enemy-specific blocks with generic passes over the active
room's entities:

- **Pickup pass**: proximity + action key against all `PICKUP_TRIGGER` entities
  (replaces hardcoded goblet block; carry-attach logic moves into a helper).
- **Hazard pass**: AABB overlap against all `HAZARD` entities → `state.loseLife()`
  + respawn (replaces hardcoded enemy check).
- **Exit pass**: edge-zone check against active room's exits →
  `roomManager.transitionTo(...)`.
- **Cauldron pass**: action-key delivery attempt when in the cauldron room.

Target: main.ts contains wiring only — no per-item or per-enemy names.

### HUD + overlays (`src/game/HUD.ts`)

- New lines (textContent only, same DOM style): `CURE: n/4`, `WANTS: <item>`,
  `DAY: n/40`, `LIVES: n`.
- Game-over overlay showing the reason (out of days / out of lives) and
  "press R to restart"; win overlay gets the same restart hint. Restart = full
  page reload.

## Error handling

- Transitioning to an unknown roomId throws (builder map is authoritative;
  a typo in an exit definition should fail loudly in dev).
- Delivery attempts with empty hands or wrong item are silent no-ops in state;
  HUD communicates what's wanted.

## Testing

Vitest units (acceptance-criteria coverage):

| Area | Test file | Covers |
|---|---|---|
| Cauldron | `tests/Cauldron.test.ts` | sequence order, wrong item rejected, werewolf delivery rejected, progress → won, danger grace timer |
| Days/lives | `tests/GameState.test.ts` (extend) | day advances per full cycle, game over at day 40, loseLife, game over at 0 lives |
| Rooms | `tests/RoomManager.test.ts` | lazy build, cache reuse on re-entry, state persists (collected pickup stays collected), exit-zone detection, unknown room throws |
| Spikes | `tests/SpikeGrid.test.ts` | tiles marked HAZARD, mesh per tile |
| Ghost | `tests/GhostEnemy.test.ts` | pursuit direction, werewolf speed boost, wall pass-through |

Manual browser playtest: the 12-step optimal route from `ROOM_CHALLENGES.md`,
verifying each room's "Test:" line, plus one deliberate death (spike) and one
werewolf-in-cauldron-room damage.

## Out of scope

Start screen, audio, distribution tables A–H, item duplication (2 of each),
werewolf jump boost, enemy-as-platform, save/load, additional rooms beyond the 5.
