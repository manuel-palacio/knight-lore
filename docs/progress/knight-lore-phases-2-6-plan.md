# Knight Lore Android Remake — Phases 2–6 Implementation Plan

## Context

Phase 1 delivered:
- Gradle multi-module project: `app`, `core`, `domain`, `data`, `render`, `input`, `feature-debug`
- Version catalog (`libs.versions.toml`) and convention plugins
- `core` math: `Vec2f`, `Vec3f`, `Aabb`, `Direction8`, `GameClock`, `IsoProjection`, `TileMetrics`
- `domain` models: `GameState`, `PlayerState`, `RoomDefinition`, `ItemInstance`, `ActorState`, `TimeState`, `CauldronState`, `RoomTransitionState`, `GameEvent`, `FrameInput`
- `domain` systems: `TimeSystem` and `TransformationSystem` (both fully implemented); `MovementSystem` and `RoomTransitionSystem` (stubs returning state unchanged)
- `GameEngine` interface + `DefaultGameEngine` (chains systems; `initialize` TODO-stubbed for Phase 2)
- 40 passing unit tests

All domain model types use the package `com.palacesoft.knightlore` (note: deviates from spec's `com.example.knightlore`; follow whichever the codebase has). The plan below refers to the existing package roots.

---

## Phase 2 — Content Bootstrap

**Goal:** Wire the `data` module so the engine can load room definitions from JSON assets, complete `DefaultGameEngine.initialize`, and run the app to a title screen that can start a game session with real content.

### Dependencies
None — builds directly on Phase 1 domain models.

---

### Task 2.1 — Define and expand `GameContent`

**Files to modify:**
- `domain/src/main/kotlin/.../domain/model/GameContent.kt`

**What to do:**
Expand the stub `GameContent` to hold all content the engine needs at runtime:

```kotlin
data class GameContent(
    val rooms: Map<RoomId, RoomDefinition>,
    val itemTypes: Map<String, ItemTypeDefinition>,
    val actorTypes: Map<String, ActorTypeDefinition>,
    val cureSequence: CureSequenceDefinition,
    val progression: ProgressionDefinition,
)

data class ItemTypeDefinition(
    val id: String,
    val family: ItemType,          // maps to existing ItemType enum
    val displayName: String,
    val isCureRelevant: Boolean,
    val tier: Int,                 // 1=early, 2=mid, 3=late
)

data class ActorTypeDefinition(
    val id: String,
    val kind: ActorKind,
    val patrolRadius: Float,
    val contactDamage: Int,
    val formReactive: Boolean,     // true = behaves differently vs werewulf
)

enum class ActorKind { GUARD_PATROL, GHOST, SPIKE_BEAST, FORM_REACTIVE }

data class CureSequenceDefinition(
    val mode: CureMode,
    val sequence: List<ItemType>,  // canonical 14-step sequence
    val variableStartIndex: Boolean,
)

enum class CureMode { CLASSIC, MODERN }

data class ProgressionDefinition(
    val totalRequiredItems: Int,   // always 14 in classic
    val startRoomId: RoomId,
    val cauldronRoomId: RoomId,
)
```

**Acceptance criteria:**
- `GameContent` compiles with zero TODOs.
- Existing domain tests still pass with the expanded model.

---

### Task 2.2 — Define JSON DTOs for room content

**Files to create:**
- `data/src/main/kotlin/.../data/dto/RoomDto.kt`
- `data/src/main/kotlin/.../data/dto/ItemTypeDto.kt`
- `data/src/main/kotlin/.../data/dto/ActorTypeDto.kt`
- `data/src/main/kotlin/.../data/dto/ProgressionDto.kt`

**What to do:**
Create `@Serializable` data transfer objects that mirror the JSON schema. Keep DTOs flat and forward-compatible.

`RoomDto.kt`:
```kotlin
@Serializable
data class RoomDto(
    val id: String,
    val width: Int,
    val depth: Int,
    val height: Int,
    val theme: String,
    val special: String? = null,         // "CAULDRON" | "START" | null
    val tiles: List<TileStackDto> = emptyList(),
    val interactives: List<InteractiveDto> = emptyList(),
    val exits: List<RoomExitDto> = emptyList(),
    val itemAnchors: List<ItemAnchorDto> = emptyList(),
    val actorSpawns: List<ActorSpawnDto> = emptyList(),
)

@Serializable
data class TileStackDto(val x: Int, val y: Int, val z: Int, val type: String)

@Serializable
data class InteractiveDto(val id: String, val x: Float, val y: Float, val z: Float, val kind: String)

@Serializable
data class RoomExitDto(val side: String, val targetRoomId: String, val targetSpawnId: String)

@Serializable
data class ItemAnchorDto(val itemId: String, val x: Float, val y: Float, val z: Float)

@Serializable
data class ActorSpawnDto(val actorType: String, val x: Float, val y: Float, val z: Float)
```

**Acceptance criteria:**
- DTOs serialize/deserialize cleanly with `kotlinx-serialization-json`.
- Unknown fields are ignored (use `@SerialName` or `ignoreUnknownKeys = true`).

---

### Task 2.3 — Create mappers: DTO → domain

**Files to create:**
- `data/src/main/kotlin/.../data/mapper/RoomMapper.kt`
- `data/src/main/kotlin/.../data/mapper/ContentMapper.kt`

**What to do:**
Write pure functions that convert DTOs to domain models. Fail fast on invalid references.

`RoomMapper.kt` must:
- Convert `TileStackDto` → `TileStack` (parse `TileType` from string).
- Convert `RoomExitDto` → `RoomExit` (wrap `targetRoomId` as `RoomId`).
- Convert `ItemAnchorDto` → `ItemAnchor` (wrap `itemId` as `ItemId`, build `Vec3f`).
- Convert `special` string → `RoomSpecial?`.
- Throw `IllegalArgumentException` with a descriptive message if any enum is unknown.

`ContentMapper.kt` must:
- Accept a list of `RoomDto`, `ItemTypeDto`, `ActorTypeDto`, and `ProgressionDto`.
- Validate that every `RoomExit.targetRoomId` references a known room id.
- Return a fully populated `GameContent`.

**Acceptance criteria:**
- Unit test: `RoomMapper_mapsValidDto_toRoomDefinition()` passes.
- Unit test: `ContentMapper_detectsUnknownRoomReference_throwsException()` passes.

---

### Task 2.4 — Write the 15-room vertical-slice JSON assets

**Files to create** (in `data/src/main/assets/rooms/` or `app/src/main/assets/rooms/` — use whichever module holds Android raw assets):
- `room_001.json` through `room_015.json`

**Room designs** (from `knight-lore-vertical-slice-design-spec.md`):

| ID | Role | Theme | Exits | Items | Hazards | Special |
|----|------|-------|-------|-------|---------|---------|
| room_001 | Cauldron hub | arcane_ritual | N→002, E→003, S→(open) | none | none | CAULDRON |
| room_002 | Start / tutorial | stone_hall | S→001 | none | none | START |
| room_003 | Connector | stone_hall | N→002, E→004, S→006 | none | none | — |
| room_004 | Crystal ball vault | dusty_relic | W→003 | crystal_ball_01 on raised platform | none | — |
| room_005 | Spike hazard | trap_corridor | N→007, S→008 | none | spike_field | — |
| room_006 | Route choice | stone_stairs | N→003, E→005, S→009 | none | none | — |
| room_007 | Goblet carry | banquet_vault | N→006, W→005 | goblet_01 on high shelf | none | — |
| room_008 | Transformation trap | moonlit_curse | N→005 | none | falling_blocks | — |
| room_009 | Carry puzzle | alchemist_lab | N→006 | poison_vial_01 on ledge | ember_vents | — |
| room_010 | Enemy intro | guard_hall | E→011, W→012 | none | patrol_guard | — |
| room_011 | Branch choice | crossroads | W→010, N→013, S→014 | none | none | — |
| room_012 | Recovery | quiet_alcove | E→010 | life_pickup (optional) | none | — |
| room_013 | Crusher gauntlet | trap_corridor | S→011 | none | crushers | — |
| room_014 | Risky shortcut | unstable_ledge | N→011, E→015 | none | spike_field | — |
| room_015 | Gauntlet / capstone | guard_hall | W→014, S→(back to 001 path) | none | patrol_guard + timed_spikes | — |

Each JSON must follow the schema from Task 2.2. Place floor tiles as a contiguous grid of `FLOOR` type at `z=0`. Place each block as `SOLID_BLOCK` at appropriate `(x,y,z)`. Set `exits` using the table above.

Also create:
- `data/src/main/assets/items.json` — lists `ItemTypeDefinition` for all 7 cure item families plus KEY, TORCH, SKULL.
- `data/src/main/assets/actors.json` — lists `ActorTypeDefinition` for GUARD_PATROL, GHOST.
- `data/src/main/assets/progression.json` — canonical 14-step cure sequence, `startRoomId: "room_002"`, `cauldronRoomId: "room_001"`.

**Acceptance criteria:**
- All JSON files parse without exceptions through the DTO deserializer.
- Mapper validates the full room graph (all exits link to existing rooms).
- Exactly 15 rooms exist in the slice.

---

### Task 2.5 — Implement `ContentRepository`

**Files to create:**
- `data/src/main/kotlin/.../data/asset/ContentRepository.kt`

**What to do:**
```kotlin
interface ContentRepository {
    suspend fun loadContent(): GameContent
}

class AssetContentRepository(
    private val assetLoader: AssetLoader,
) : ContentRepository {
    override suspend fun loadContent(): GameContent { ... }
}

interface AssetLoader {
    fun readText(path: String): String
}
```

- `AssetLoader` is an interface so the implementation can be swapped: production uses `context.assets.open(path)`, unit tests use a map of in-memory strings.
- `AssetContentRepository.loadContent()` reads each room JSON file, parses DTOs, reads `items.json`, `actors.json`, `progression.json`, then calls `ContentMapper`.
- Rooms are discovered by a manifest file `assets/rooms/manifest.json` that lists room file names, or by globbing a fixed prefix.

**Acceptance criteria:**
- `ContentRepositoryTest` loads the 15 vertical slice rooms in-process using a test `AssetLoader`.
- All 15 `RoomDefinition` objects are present in the returned `GameContent`.
- Missing asset throws `IllegalStateException` with the asset path in the message.

---

### Task 2.6 — Complete `DefaultGameEngine.initialize`

**Files to modify:**
- `domain/src/main/kotlin/.../domain/GameEngine.kt`

**What to do:**
Replace the `TODO` with real initialization logic:
1. Locate start room via `content.progression.startRoomId`.
2. Build initial `PlayerState` at a default spawn position (center front of start room, `z = 1f`), 5 lives, `HUMAN` form, empty inventory, `TransformState(STABLE, 0)`.
3. Build initial `TimeState` with `tick=0`, `dayIndex=0`, `ticksInDay=0`, `ticksPerDay` from an `EngineConfig` parameter (default 3600 ticks ≈ 60 s at 60 Hz).
4. Build initial `CauldronState` with `requestedItems = content.cureSequence.sequence`, `deliveredCount = 0`, `currentRequest = sequence[0]`.
5. Seed item instances from `content.rooms`: for each room's `itemAnchors`, create an `ItemInstance` at `ItemLocation.InRoom`.
6. Build initial `GameState` with empty `actorStates` and `roomTransition = null`.

Also add `EngineConfig` to the `update` signature or as a constructor parameter:
```kotlin
data class EngineConfig(
    val ticksPerDay: Int = 3600,
    val playerLives: Int = 5,
    val cureMode: CureMode = CureMode.MODERN,
    val transformDurationTicks: Int = 60,
)
```

**Acceptance criteria:**
- `DefaultGameEngineTest_initialize_setsStartRoomAndPlayerPosition()` passes.
- `DefaultGameEngineTest_initialize_cauldronHasFirstRequest()` passes.
- `DefaultGameEngineTest_initialize_itemInstancesMatchRoomAnchors()` passes.

---

### Task 2.7 — Add `app` title screen and Start button

**Files to modify / create:**
- `app/src/main/kotlin/.../app/MainActivity.kt`
- `app/src/main/kotlin/.../app/AppRoot.kt` (create)
- `app/src/main/kotlin/.../app/ui/MainMenuScreen.kt` (create)

**What to do:**
- `AppRoot` sets up a simple `NavHost` with two destinations: `"menu"` and `"game"`.
- `MainMenuScreen` shows the title "Knight Lore" and a "New Game" button. No settings yet (Phase 6).
- Pressing "New Game" navigates to `"game"` (composable can be a placeholder black screen for now).
- Wire `AssetContentRepository` with a real Android `AssetLoader` in `MainActivity` or a minimal DI graph.

**Acceptance criteria:**
- App builds and launches to a title screen.
- Pressing "New Game" navigates without crash.
- No domain or data code is imported in `app` beyond calling `ContentRepository` and `GameEngine`.

---

## Phase 3 — Simulation

**Goal:** Implement the full movement simulation so Sabreman can walk, jump, land on blocks, take damage from hazards, transition rooms, and respawn — all on a deterministic fixed-step loop.

### Dependencies
Phase 2 must be complete: `ContentRepository`, `GameContent`, and `DefaultGameEngine.initialize` must work.

---

### Task 3.1 — Implement `CollisionSystem`

**Files to create:**
- `domain/src/main/kotlin/.../domain/system/CollisionSystem.kt`
- `domain/src/main/kotlin/.../domain/rules/CollisionResolver.kt`

**What to do:**
`CollisionResolver` is a pure stateless service that answers spatial queries given a list of `SolidVolume` objects built from the current room's `TileStack` list.

```kotlin
data class SolidVolume(
    val min: Vec3f,
    val max: Vec3f,
    val isTopStandable: Boolean = true,
)

class CollisionResolver {
    fun resolveMove(
        currentPos: Vec3f,
        intendedPos: Vec3f,
        entityFootprint: Aabb,
        solids: List<SolidVolume>,
    ): ResolvedMove

    fun findFloorBelow(pos: Vec3f, solids: List<SolidVolume>): Float?
}

data class ResolvedMove(
    val resolvedPos: Vec3f,
    val hitWall: Boolean,
    val landedOnSurface: Boolean,
    val surfaceZ: Float?,
)
```

Resolution strategy:
- Sweep the entity AABB from `currentPos` to `intendedPos`.
- Resolve x and y axes independently to avoid corner sticking.
- After resolving horizontal, check vertical (gravity) separately.
- Only the top face of a `SolidVolume` with `isTopStandable = true` counts as a landing surface.
- Side faces are always blockers.

`CollisionSystem` builds the `SolidVolume` list from the current room's tiles each tick (cache this if profiling later demands it), then delegates to `CollisionResolver`.

**Acceptance criteria:**
- `CollisionResolver_playerLandsOnBlockTop()` — player descending from above lands exactly at block's `max.z`.
- `CollisionResolver_playerBlockedBySideWall()` — player moving into a full block stops at the face.
- `CollisionResolver_playerFallsThroughFloor_doesNotHappen()` — player at floor level stays at floor level after downward sweep.
- At least 8 unit tests covering edge cases (corner, step-up 1 unit, multiple overlapping solids).

---

### Task 3.2 — Implement `MovementSystem`

**Files to modify:**
- `domain/src/main/kotlin/.../domain/system/MovementSystem.kt`

**What to do:**
Replace the stub with full movement logic.

Movement constants (expose via `EngineConfig` or a `MovementConfig` nested object):
```
WALK_SPEED_HUMAN  = 4.0f  (tiles/second)
WALK_SPEED_WEREWULF = 5.0f
JUMP_FORCE_HUMAN  = 8.0f  (tiles/second upward)
JUMP_FORCE_WEREWULF = 10.0f
GRAVITY           = -20.0f (tiles/second²)
MAX_CARRY_SPEED_PENALTY = 0.8f  (multiplier when carrying 3 items)
```

Each tick, `MovementSystem`:
1. Checks `transformState.phase` — if not `STABLE`, skip all movement, zero velocity.
2. Reads `input.moveVector` (already in isometric intent space from the `input` module).
3. Converts `moveVector` to world-space velocity using the current form's walk speed.
4. If `input.jumpPressed` and `!airborne`, set vertical velocity to `JUMP_FORCE` for the form.
5. Apply gravity to vertical velocity: `vz += GRAVITY * deltaSeconds`.
6. Compute intended position: `pos + velocity * deltaSeconds`.
7. Delegate to `CollisionResolver` with current room solids.
8. Write back resolved position, airborne flag, velocity (zero out whichever axes were blocked).
9. Update `facing` direction from last non-zero horizontal velocity.
10. Emit `GameEvent.JumpStarted` when jump is initiated, `GameEvent.Landed` on landing.

**Acceptance criteria:**
- `MovementSystem_walksInIntendedDirection_onFlatFloor()`.
- `MovementSystem_jumpLandsOnTargetBlock()`.
- `MovementSystem_transformingPlayerIgnoresInput()`.
- `MovementSystem_werewulfJumpsHigherThanHuman()`.
- `MovementSystem_carryPenaltyReducesSpeed()`.

---

### Task 3.3 — Implement jump state tracking in `PlayerState`

**Files to modify:**
- `domain/src/main/kotlin/.../domain/model/PlayerState.kt`

**What to do:**
Add a `jumpLockTicks: Int` field (number of ticks after landing during which another jump is suppressed — prevents instant double jump from held button). Default `0`. `MovementSystem` sets it to `5` on landing and decrements each tick.

Also add:
```kotlin
val movementState: MovementState
```
where:
```kotlin
enum class MovementState { IDLE, WALKING, JUMP_ASCENT, JUMP_DESCENT, LANDING, TRANSFORMING }
```
`movementState` is derived each tick by `MovementSystem` from velocity and airborne flag.

**Acceptance criteria:**
- `MovementSystem` sets correct `MovementState` on each frame (tested via unit tests covering each state transition).

---

### Task 3.4 — Implement `RoomTransitionSystem`

**Files to modify:**
- `domain/src/main/kotlin/.../domain/system/RoomTransitionSystem.kt`

**What to do:**
Replace the stub with full room transition logic.

`RoomTransitionSystem` runs after `MovementSystem` each tick:

1. If `state.roomTransition != null`:
   - Decrement `roomTransition.lockTicks`.
   - When `lockTicks` reaches 0, commit the transition: set `currentRoomId`, set `player.position` to `targetSpawn`, set `roomTransition = null`, emit `GameEvent.EnteredRoom(newRoomId)`.
   - While `lockTicks > 0`, zero out player velocity (input locked).

2. If `state.roomTransition == null`:
   - For each `RoomExit` in the current room, check if the player's AABB overlaps the exit trigger zone (a thin volume along the edge).
   - Exit trigger zone: a band 0.2 tiles wide at the edge, full room width/depth, from floor to ceiling.
   - If triggered: set `roomTransition = RoomTransitionState(targetRoomId, targetSpawnId, lockTicks = 12)`, emit `GameEvent.EnteredRoom` with the new room id.

Exit trigger geometry:
- NORTH exit: `y < 0.1`, all x in `[0, depth]`.
- SOUTH exit: `y > depth - 0.1`, all x in `[0, depth]`.
- EAST exit: `x > width - 0.1`, all y in `[0, width]`.
- WEST exit: `x < 0.1`, all y in `[0, width]`.

`targetSpawn` for the arriving room is looked up from the target room's `exits` list — find the exit whose `side` is the mirror of the entered side and use `targetSpawnId`.

Add a `spawn_positions` map to `RoomDefinition` (or a `spawnPoints: List<SpawnPoint>` list) so the system can resolve named spawn positions:
```kotlin
data class SpawnPoint(val id: String, val position: Vec3f)
```

**Acceptance criteria:**
- `RoomTransitionSystem_triggersTransitionAtEastEdge()`.
- `RoomTransitionSystem_playerAppearsAtCorrectSpawnInTargetRoom()`.
- `RoomTransitionSystem_inputIsLockedDuringTransition()`.
- `RoomTransitionSystem_movesPlayerToMirrorSpawn_forEachSide()`.

---

### Task 3.5 — Implement lives and respawn (`LifeSystem`)

**Files to create:**
- `domain/src/main/kotlin/.../domain/system/LifeSystem.kt`

**What to do:**
`LifeSystem` runs after `RoomTransitionSystem` each tick:

1. Check if any `HazardVolume` in the current room overlaps with the player AABB and `player.damageCooldownTicks == 0`.
2. If so: decrement `player.lives` by 1, set `player.damageCooldownTicks = 90` (1.5 s at 60 Hz), emit `GameEvent.PlayerDamaged`.
3. If `player.lives == 0`: emit `GameEvent.LifeLost` then `GameEvent.GameOver`.
4. Otherwise if `player.lives > 0` and player was just damaged: respawn the player at the current room's default spawn or the last safe position (start room for MVP simplicity).
5. Decrement `damageCooldownTicks` by 1 each tick (clamp at 0).

Add `HazardVolume` to the domain alongside `SolidVolume`:
```kotlin
data class HazardVolume(
    val min: Vec3f,
    val max: Vec3f,
    val damagePerHit: Int = 1,
    val kind: HazardKind,
)
enum class HazardKind { SPIKE, CRUSHER, EMBER, PATROL_ENEMY }
```

Build `HazardVolume` list from room tiles where `TileType == HAZARD`. Actor hazards (patrol enemies) are added by an `ActorSystem` stub in Phase 5.

**Acceptance criteria:**
- `LifeSystem_spikeContactReducesLives()`.
- `LifeSystem_damageCooldDownPreventsDoubleHit()`.
- `LifeSystem_zeroLivesEmitsGameOver()`.
- `LifeSystem_respawnAfterDamage_positionIsStartRoom()`.

---

### Task 3.6 — Fix-step loop coordinator

**Files to create:**
- `app/src/main/kotlin/.../app/session/GameLoopCoordinator.kt`

**What to do:**
```kotlin
class GameLoopCoordinator(
    private val engine: GameEngine,
    private val config: EngineConfig,
) {
    private val fixedStep: Float = 1f / 60f
    private var accumulator: Float = 0f
    private var state: GameState = /* initial state set on startNewGame */

    fun startNewGame(content: GameContent, seed: Long) {
        state = engine.initialize(seed, content)
        accumulator = 0f
    }

    // Called from the render thread / Choreographer callback
    fun onFrame(frameDeltaSeconds: Float, input: FrameInput): FrameSnapshot {
        accumulator += frameDeltaSeconds.coerceAtMost(0.1f)   // cap spiral of death
        val events = mutableListOf<GameEvent>()
        while (accumulator >= fixedStep) {
            val result = engine.update(state, input, fixedStep)
            state = result.state
            events += result.events
            accumulator -= fixedStep
        }
        return FrameSnapshot(
            state = state,
            events = events,
            interpolation = accumulator / fixedStep,
        )
    }
}

data class FrameSnapshot(
    val state: GameState,
    val events: List<GameEvent>,
    val interpolation: Float,
)
```

Tie `GameLoopCoordinator` into a `GameSessionViewModel` (Jetpack ViewModel) using a `Choreographer` or `LaunchedEffect` coroutine loop.

**Acceptance criteria:**
- `GameLoopCoordinatorTest_spiralOfDeathCap_capsAccumulator()` — if `frameDelta` is huge, accumulator is capped.
- `GameLoopCoordinatorTest_ticksAdvanceTime()` — after N frames, `state.time.tick` equals expected N ticks.
- App no longer crashes when navigating to the game screen.

---

### Task 3.7 — Register all Phase 3 systems in `DefaultGameEngine`

**Files to modify:**
- Wherever `DefaultGameEngine` is constructed (likely `app/src/main/kotlin/.../app/di/` or `MainActivity.kt`).

**What to do:**
Build the system list in correct tick order per the architecture spec:
```kotlin
val systems = listOf(
    TimeSystem(),
    TransformationSystem(),
    MovementSystem(collisionResolver),
    CollisionSystem(contentRepository),  // or pass room data via state
    LifeSystem(),
    RoomTransitionSystem(),
    // ItemSystem — Phase 5
    // HazardSystem — Phase 5
    // CauldronSystem — Phase 5
)
val engine = DefaultGameEngine(systems)
```

Note: `CollisionSystem` and `MovementSystem` may be merged if separation proves awkward — keep the decision to the implementer, but document it.

**Acceptance criteria:**
- Integration test: simulate 120 ticks from `initialize`, player on flat floor, no input. Player does not fall through the floor.
- Integration test: simulate walk toward EAST exit, verify `EnteredRoom` event fires.

---

## Phase 4 — Rendering

**Goal:** Produce a visible, correctly depth-sorted isometric scene — room blocks, the player sprite, one item on the floor, and a HUD — all rendered via Android `Canvas` inside a `SurfaceView` or `AndroidView`.

### Dependencies
Phase 3 simulation must be stable. At minimum, `DefaultGameEngine.initialize` and the movement loop must work.

---

### Task 4.1 — Implement `IsoProjector` in the `render` module

**Files to create:**
- `render/src/main/kotlin/.../render/iso/IsoProjector.kt`
- `render/src/main/kotlin/.../render/iso/ScreenPoint.kt`
- `render/src/main/kotlin/.../render/iso/RenderEntity.kt`

**What to do:**
The projection constants must match `core/TileMetrics`:
```kotlin
object IsoProjector {
    const val HALF_TILE_W = 32f
    const val HALF_TILE_H = 16f
    const val BLOCK_H     = 32f

    fun project(world: Vec3f, roomOriginScreen: Vec2f): ScreenPoint {
        val sx = (world.x - world.y) * HALF_TILE_W + roomOriginScreen.x
        val sy = (world.x + world.y) * HALF_TILE_H - world.z * BLOCK_H + roomOriginScreen.y
        return ScreenPoint(sx, sy)
    }

    fun depthKey(world: Vec3f): Int = floor((world.x + world.y + world.z) * 1000f).toInt()
}
```

`RenderEntity`:
```kotlin
data class RenderEntity(
    val id: String,
    val spriteId: String,
    val worldPosition: Vec3f,
    val anchorPx: Vec2f,         // sprite pixel offset from projected screen point to sprite top-left
    val sortFootWorld: Vec3f,    // foot position for depth sort (may differ from worldPosition)
    val layer: Int,              // 0=floor, 1=blocks, 2=interactives, 3=actors, 4=fx
    val priorityOverride: Int = 0,
    val renderOffset: Vec2f = Vec2f.ZERO,
    val tint: Int? = null,
)
```

`roomOriginScreen`: the screen coordinate where world `(0,0,0)` maps. Compute once per frame to center the room horizontally on the screen. Given room dimensions `(w, d)`, the center of the floor diamond is at world `(w/2, d/2, 0)`. Map that to screen center.

**Acceptance criteria:**
- `IsoProjectorTest_projectOrigin_isAtExpectedScreenPosition()`.
- `IsoProjectorTest_depthKey_ordersBackToFront()` — two entities at `(0,0,0)` and `(1,0,0)` produce depth keys where the deeper entity sorts first.
- `IsoProjectorTest_projectSymmetry()` — world `(2,0,0)` and `(0,2,0)` both project to the same screen y but mirrored x.

---

### Task 4.2 — Implement `DrawCommandBuilder`

**Files to create:**
- `render/src/main/kotlin/.../render/scene/DrawCommandBuilder.kt`
- `render/src/main/kotlin/.../render/scene/DrawCommand.kt`

**What to do:**
```kotlin
data class DrawCommand(
    val spriteId: String,
    val screenX: Float,
    val screenY: Float,
    val depthKey: Int,
    val layer: Int,
    val tint: Int? = null,
    val alpha: Float = 1f,
)
```

`DrawCommandBuilder.build(entities: List<RenderEntity>, roomOrigin: Vec2f): List<DrawCommand>`:
- Project each entity's `sortFootWorld` via `IsoProjector`.
- Assign `depthKey` from `IsoProjector.depthKey(entity.sortFootWorld)`.
- Sort the resulting list by `(layer ASC, depthKey ASC, priorityOverride ASC, id ASC)`.
- Return sorted `DrawCommand` list.

**Acceptance criteria:**
- `DrawCommandBuilderTest_blockBehindPlayerRendersBefore()` — a block at `(0,0,0)` and player at `(1,1,0)` produce the block as an earlier draw command.
- `DrawCommandBuilderTest_stableSort_sameDepthUsesId()`.

---

### Task 4.3 — Implement `RoomEntityFactory`

**Files to create:**
- `render/src/main/kotlin/.../render/scene/RoomEntityFactory.kt`

**What to do:**
Converts a `GameState` + `GameContent` into a `List<RenderEntity>` ready for `DrawCommandBuilder`.

For each tile in the current room's `tiles`:
- `TileType.FLOOR` → layer 0, `spriteId = "block_floor_${theme}"`.
- `TileType.SOLID_BLOCK` → layer 1, `spriteId = "block_solid_${theme}"`.
- `TileType.HAZARD` → layer 1, `spriteId = "hazard_spike"` (hard-coded for MVP).
- `sortFootWorld` = back-bottom corner of tile = `Vec3f(tile.gridX.toFloat(), tile.gridY.toFloat(), tile.gridZ.toFloat())`.

For each `ItemInstance` in `state.itemInstances` where `location is InRoom(currentRoomId)`:
- Layer 2, `spriteId = "item_${type.name.lowercase()}_world"`.
- `sortFootWorld` = item's `position`.

For the player:
- Layer 3, `spriteId = resolvePlayerSprite(player)`.
- `sortFootWorld` = `player.position` (feet anchor).
- Sprite lookup: `"sabreman_human_idle_se_01"` placeholder until animations exist.

Carried items:
- Layer 3 with `priorityOverride = 1` (renders above player base but in same depth sort bucket).
- `sortFootWorld` = player's `sortFootWorld`.

**Acceptance criteria:**
- `RoomEntityFactory_roomWithThreeBlocks_producesThreeBlockEntities()`.
- `RoomEntityFactory_playerCarryingItem_itemInEntityList()`.
- `RoomEntityFactory_floorEntitiesHaveLayerZero()`.

---

### Task 4.4 — Implement `CanvasSceneRenderer`

**Files to create:**
- `render/src/main/kotlin/.../render/scene/CanvasSceneRenderer.kt`
- `render/src/main/kotlin/.../render/sprite/SpriteRegistry.kt`

**What to do:**
`SpriteRegistry` maps `spriteId` strings to `android.graphics.Bitmap` (or `Drawable`) loaded from assets. Provide a `PlaceholderSpriteRegistry` that draws colored rectangles keyed by layer for use before real art exists:
- Layer 0 (floor): dark gray filled diamond shape.
- Layer 1 (solid block): lighter gray filled rect.
- Layer 3 (player): blue filled rect 20×40 px.
- Layer 2 (item): yellow circle 16 px radius.

`CanvasSceneRenderer`:
```kotlin
class CanvasSceneRenderer(
    private val spriteRegistry: SpriteRegistry,
    private val factory: RoomEntityFactory,
    private val builder: DrawCommandBuilder,
) {
    fun render(canvas: Canvas, frame: RenderFrame)
}

data class RenderFrame(
    val state: GameState,
    val content: GameContent,
    val interpolation: Float,
    val canvasWidth: Int,
    val canvasHeight: Int,
    val debugFlags: DebugFlags,
)
```

`render()` flow:
1. Compute `roomOriginScreen` to center the room on canvas.
2. Call `factory.build(state, content)` → `List<RenderEntity>`.
3. Call `builder.build(entities, roomOriginScreen)` → sorted `List<DrawCommand>`.
4. For each `DrawCommand`, look up sprite/placeholder and draw at `(screenX, screenY)`.
5. Draw HUD on top (delegated to `HudRenderer`).

**Acceptance criteria:**
- `CanvasSceneRendererTest` renders to an in-memory `Bitmap` without throwing.
- At least one block entity is visible (pixel at expected screen position is non-black).
- Player entity is above (in draw order) the floor tile at same x/y.

---

### Task 4.5 — Integrate renderer into the app with `GameSurfaceView`

**Files to create:**
- `app/src/main/kotlin/.../app/ui/GameSurfaceView.kt`
- `app/src/main/kotlin/.../app/ui/GameScreen.kt`

**What to do:**
`GameSurfaceView` extends `SurfaceView` and holds a render thread. On each `Choreographer.FrameCallback`:
1. Collect current `FrameInput` from `TouchInputMapper` (Phase 6 full impl; placeholder `FrameInput.NONE` for now).
2. Call `GameLoopCoordinator.onFrame(delta, input)` → `FrameSnapshot`.
3. Lock canvas, call `CanvasSceneRenderer.render(canvas, frame)`, unlock and post.

`GameScreen` is a Compose composable that wraps `GameSurfaceView` via `AndroidView`.

**Acceptance criteria:**
- Navigating to game screen shows an isometric room with colored placeholder blocks.
- Game loop runs at ~60 fps without ANR on a mid-tier device.
- No domain module imports inside `GameSurfaceView`.

---

### Task 4.6 — Implement `HudRenderer`

**Files to create:**
- `render/src/main/kotlin/.../render/hud/HudRenderer.kt`

**What to do:**
`HudRenderer.draw(canvas: Canvas, state: GameState, canvasW: Int, canvasH: Int)`:

1. **Lives counter**: top-left. Draw `state.player.lives` heart icons (placeholder: small filled red circles). Label with a number as fallback.

2. **Day-night meter**: top-right horizontal bar, 160 dp wide × 12 dp tall.
   - Full bar background: dark gray.
   - Fill: progress is `(state.time.ticksInDay / ticksPerDay).toFloat()`.
   - Color: DAY=amber, DUSK=orange, NIGHT=deep blue, DAWN=purple.
   - Icon: sun (DAY/DUSK) or moon (NIGHT/DAWN) at the fill tip.
   - If `state.time.ticksUntilTransform != null` and within 15% of transform, pulse (alpha oscillation).
   - Show day number as text below: "Day N / 40".

3. **Carried items**: bottom-center. Up to 3 item slots (placeholder: small colored squares per `ItemType`).

4. **Current cauldron request**: bottom-right. Show `state.cauldron.currentRequest` as text if non-null.

**Acceptance criteria:**
- `HudRendererTest_drawsLivesCount_withCorrectValue()`.
- `HudRendererTest_dayNightBar_fillsProportionally()`.
- HUD is visible in the running app without overlapping the room center.

---

## Phase 5 — Game Identity Systems

**Goal:** Implement the remaining gameplay systems that define Knight Lore's identity: item pickup/drop/carry, cauldron request validation, hazard actors, and the complete transformation experience with form-dependent movement tuning.

### Dependencies
Phase 4 rendering must be working so all systems can be validated visually. Phase 3 simulation must be fully functional.

---

### Task 5.1 — Implement `ItemSystem`

**Files to create:**
- `domain/src/main/kotlin/.../domain/system/ItemSystem.kt`
- `domain/src/main/kotlin/.../domain/rules/ItemRules.kt`

**What to do:**
`ItemSystem` runs after `LifeSystem` each tick:

**Pickup logic:**
1. If `input.actionPressed` and `player.inventory.size < 3`:
   - Find all `ItemInstance` in the current room within pickup radius (0.7 tiles of player position).
   - Pick the closest one.
   - If found: remove it from world (change `ItemLocation` to `CarriedByPlayer`), add `ItemId` to `player.inventory`, emit `GameEvent.ItemPickedUp(itemId)`.

**Drop logic:**
2. If `input.dropPressed` and `player.inventory.isNotEmpty()`:
   - Pop the last item from `player.inventory` (or the one selected via `cycleInventoryPressed`).
   - Find the nearest valid drop anchor: the nearest `ItemAnchor` position in the current room that is unoccupied and reachable from current position (Manhattan distance ≤ 2 tiles).
   - If valid anchor: set `ItemLocation.InRoom(currentRoomId, anchorPosition)`, emit `GameEvent.ItemDropped(itemId)`.
   - If no valid anchor: use player position directly (anti-soft-lock rule from spec: items always land somewhere valid).

**Anti-soft-lock rules:**
- When player exits a room while carrying items, items remain carried (state is preserved).
- If a carried item's `ItemId` is no longer in `player.inventory` at initialization, ensure the item's `ItemLocation` is set to `InRoom` at its original anchor (validate in `ContentRepository` load).

`ItemRules.isPickupable(item: ItemInstance, playerPos: Vec3f, radius: Float): Boolean` — pure function, separately testable.

**Acceptance criteria:**
- `ItemSystem_pickupNearbyItem_addsToInventory()`.
- `ItemSystem_dropItem_snapsToNearestAnchor()`.
- `ItemSystem_inventoryFull_doesNotPickUp()`.
- `ItemSystem_exitRoom_carriedItemsPreserved()`.
- `ItemSystem_antiSoftLock_itemLandsOnValidPosition()`.

---

### Task 5.2 — Implement `CauldronSystem`

**Files to create:**
- `domain/src/main/kotlin/.../domain/system/CauldronSystem.kt`
- `domain/src/main/kotlin/.../domain/rules/CauldronRules.kt`

**What to do:**
`CauldronSystem` runs after `ItemSystem` each tick:

1. If `state.currentRoomId != cauldronRoomId`, return unchanged.
2. If player is in the cauldron room and `input.actionPressed`:
   - Check if player is within interaction range of the cauldron block (0.8 tiles from cauldron center).
   - Check `player.form`. In `CLASSIC` mode: if `WEREWULF`, apply damage immediately (cauldron hostility), emit `GameEvent.PlayerDamaged`, return.
   - In `MODERN` mode: werewulf presence is flagged but non-lethal.
3. Find if any carried item matches `state.cauldron.currentRequest` (match by `ItemType` family).
4. If match: remove item from inventory and world, advance `cauldron.deliveredCount++`, update `cauldron.currentRequest` to `requestedItems[deliveredCount]`, emit `GameEvent.CauldronRequestAdvanced(newRequest)`.
5. If `deliveredCount == 14`: emit `GameEvent.CureComplete`.
6. If wrong item: in `CLASSIC` mode emit `GameEvent.ItemDropped` (item bounces out). In `MODERN` mode do nothing (no penalty, player keeps item).

`CauldronState` changes needed:
```kotlin
data class CauldronState(
    val requestedItems: List<ItemType>,   // full sequence
    val deliveredCount: Int,
    val currentRequest: ItemType?,        // requestedItems[deliveredCount] or null if done
    val hostileUntilTick: Long,          // tick until cauldron hostility expires (0 = not hostile)
)
```

Add `GameEvent.CureComplete` and `GameEvent.CauldronRequestAdvanced` to the event sealed interface.

**Acceptance criteria:**
- `CauldronSystem_correctItem_advancesDeliveredCount()`.
- `CauldronSystem_wrongItem_modernMode_doesNothing()`.
- `CauldronSystem_wrongItem_classicMode_emitsDropEvent()`.
- `CauldronSystem_werewulfEntry_classicMode_damagesPlayer()`.
- `CauldronSystem_14Deliveries_emitsCureComplete()`.
- `CauldronSystem_outOfRange_doesNothing()`.

---

### Task 5.3 — Implement `HazardSystem` (actor-based hazards)

**Files to create:**
- `domain/src/main/kotlin/.../domain/system/HazardSystem.kt`
- `domain/src/main/kotlin/.../domain/model/ActorState.kt` (extend existing)

**What to do:**
Extend `ActorState` with patrol behavior fields:
```kotlin
data class ActorState(
    val id: ActorId,
    val type: ActorKind,
    val position: Vec3f,
    val velocity: Vec3f,
    val patrolOrigin: Vec3f,
    val patrolRadius: Float,
    val facingDir: Direction8,
    val isActive: Boolean,
)
```

`HazardSystem` runs after `CollisionSystem` each tick:

1. For each `ActorState` in `state.actorStates` where `type == GUARD_PATROL`:
   - Move actor along a simple back-and-forth patrol within `patrolRadius` of `patrolOrigin`.
   - Reverse direction when boundary reached.
   - Check player AABB overlap → if overlap and `player.damageCooldownTicks == 0`, delegate to `LifeSystem` logic (or call shared `DamageRules`).

2. For `GHOST` actors: move in a sinusoidal path; react to `player.form == WEREWULF` (increase speed in classic mode).

3. Dynamic block hazards (falling blocks in room_008): add `DynamicBlockSystem` stub that activates falling blocks when player is in WEREWULF form in that room.

`HazardVolume` list for `LifeSystem` now includes actor bounding boxes.

**Acceptance criteria:**
- `HazardSystem_patrolActorDamagesPlayerOnContact()`.
- `HazardSystem_patrolReversesAtBoundary()`.
- `HazardSystem_ghostSpeedIncreases_inWerewulfForm()`.

---

### Task 5.4 — Complete `TransformationSystem` with form-dependent physics

**Files to modify:**
- `domain/src/main/kotlin/.../domain/system/TransformationSystem.kt`
- `domain/src/main/kotlin/.../domain/system/MovementSystem.kt`

**What to do:**
`TransformationSystem` already correctly drives the transformation state machine. Add:
- `RECOVERY` phase: after `TRANSFORMING_TO_*` completes, set a 30-tick recovery phase during which movement is suppressed but the player is no longer locked.
- Emit `GameEvent.TransformationStarted` at the beginning (already done) and `GameEvent.TransformationCompleted` at end (already done).

In `MovementSystem`, read `player.form` to select movement constants:
- HUMAN: `WALK_SPEED_HUMAN`, `JUMP_FORCE_HUMAN`.
- WEREWULF: `WALK_SPEED_WEREWULF`, `JUMP_FORCE_WEREWULF`.

Add a `RECOVERY` state to `TransformPhase`:
```kotlin
enum class TransformPhase { STABLE, TRANSFORMING_TO_WEREWULF, TRANSFORMING_TO_HUMAN, RECOVERY }
```
Recovery lasts 30 ticks, then transitions to `STABLE`.

**Acceptance criteria:**
- `TransformationSystem_recoveryPhaseFollowsTransformation()`.
- `TransformationSystem_recoveryPhaseAllowsMovement()`.
- `MovementSystem_werewulfHasHigherJump_afterTransformation()`.

---

### Task 5.5 — Wire `GameEvent` handling for audio cues (event bus)

**Files to create:**
- `app/src/main/kotlin/.../app/session/GameEventHandler.kt`

**What to do:**
`GameSessionViewModel` exposes `events: StateFlow<List<GameEvent>>`. `GameEventHandler` subscribes to this flow and maps events to audio cues (Phase 6 audio stubs) and UI state changes:

| Event | Handler action |
|-------|---------------|
| `JumpStarted` | Play jump SFX |
| `Landed` | Play land SFX |
| `TransformationStarted` | Play transform start SFX, begin HUD pulsing |
| `TransformationCompleted` | Play transform end SFX |
| `ItemPickedUp` | Play pickup SFX, update HUD carry slots |
| `ItemDropped` | Play drop SFX |
| `PlayerDamaged` | Play hurt SFX, flash player sprite |
| `LifeLost` | Play life-lost SFX |
| `EnteredRoom` | Play room-enter SFX |
| `CauldronRequestAdvanced` | Play success SFX |
| `CureComplete` | Play victory SFX, transition to victory screen |
| `GameOver` | Transition to game-over screen |

For Phase 5 deliverable, stubs are acceptable (log each event + TODO comment). Real audio in Phase 6.

**Acceptance criteria:**
- `GameEventHandler` compiles and subscribes without crashing.
- Game-over event triggers navigation to a game-over screen composable.
- CureComplete event triggers navigation to a victory screen composable.

---

### Task 5.6 — Render transformation visual states

**Files to modify:**
- `render/src/main/kotlin/.../render/scene/RoomEntityFactory.kt`
- `render/src/main/kotlin/.../render/hud/HudRenderer.kt`

**What to do:**
In `RoomEntityFactory`, choose the correct sprite for the player based on `player.transformState.phase`:
- `STABLE + HUMAN` → `sabreman_human_*`.
- `STABLE + WEREWULF` → `sabreman_werewulf_*`.
- `TRANSFORMING_TO_WEREWULF` → `sabreman_transform_to_werewulf_XX` where XX is frame index derived from `progressTicks / TRANSFORM_TICKS * frameCount`.
- `TRANSFORMING_TO_HUMAN` → `sabreman_transform_to_human_XX`.
- `RECOVERY` → current form's idle sprite with a mild tint applied.

Apply a red tint (`tint = 0x80FF0000`) when `player.damageCooldownTicks > 0` and `tickCount % 4 < 2` (blink effect).

In `HudRenderer`, add a form indicator:
- Small icon top-left below lives: human silhouette or werewulf silhouette.
- During transformation: show a morphing progress bar below the icon.

**Acceptance criteria:**
- Manually navigating to game screen and observing: player changes sprite at nightfall.
- Transformation blink is visible after spike contact.

---

## Phase 6 — Product Shell

**Goal:** Complete the full product shell — save/resume, settings screen, polished touch controls, audio stubs wired to events, and the debug overlay — so the vertical slice is a shippable prototype.

### Dependencies
Phases 2–5 must be complete. All domain systems must work. Rendering must be stable.

---

### Task 6.1 — Implement `SaveRepository` and `SaveSnapshot`

**Files to create:**
- `data/src/main/kotlin/.../data/save/SaveRepository.kt`
- `data/src/main/kotlin/.../data/save/SaveSnapshot.kt`

**What to do:**
```kotlin
@Serializable
data class SaveSnapshot(
    val version: Int = 1,
    val timestampUtc: String,     // ISO-8601
    val gameState: GameState,
    val engineConfigSnapshot: EngineConfigSnapshot,
)

@Serializable
data class EngineConfigSnapshot(
    val ticksPerDay: Int,
    val cureMode: String,
)
```

`SaveRepository` interface:
```kotlin
interface SaveRepository {
    suspend fun save(snapshot: SaveSnapshot)
    suspend fun load(): SaveSnapshot?
    suspend fun clear()
}
```

Implementation: `FileSaveRepository` writes JSON to `context.filesDir/save.json` using `kotlinx-serialization-json`. Use `AtomicFile` (from `androidx.core`) to prevent corruption on interrupted write.

**Migration strategy:** If `snapshot.version != currentVersion`, clear the save and start fresh (log a warning). Add version-specific migration later.

**Acceptance criteria:**
- `SaveRepositoryTest_saveAndLoad_restoresExactState()`.
- `SaveRepositoryTest_loadMissing_returnsNull()`.
- `SaveRepositoryTest_versionMismatch_returnsNull()`.
- Unit tests use an in-memory implementation, not the file system.

---

### Task 6.2 — Implement `GameSessionCoordinator`

**Files to create / modify:**
- `app/src/main/kotlin/.../app/session/GameSessionCoordinator.kt`
- `app/src/main/kotlin/.../app/session/GameSessionViewModel.kt`

**What to do:**
`GameSessionCoordinator` wraps the loop and save logic:
```kotlin
class GameSessionCoordinator(
    private val engine: GameEngine,
    private val contentRepository: ContentRepository,
    private val saveRepository: SaveRepository,
    private val config: EngineConfig,
) {
    suspend fun startNewGame(seed: Long): GameState
    suspend fun resumeFromSave(): GameState?
    fun onFrame(input: FrameInput, deltaSeconds: Float): FrameSnapshot
    suspend fun saveCurrentState()
    fun pause()
    fun resume()
}
```

`GameSessionViewModel` holds a `GameSessionCoordinator` instance and exposes:
```kotlin
val state: StateFlow<GameState>
val events: SharedFlow<List<GameEvent>>
val isPaused: StateFlow<Boolean>
```

Wire `onPause`/`onResume` lifecycle events from `MainActivity` to `GameSessionCoordinator.pause()`/`resume()`. On `onPause`, call `saveCurrentState()` in a coroutine.

**Acceptance criteria:**
- App saves state on backgrounding and resumes exactly where left off.
- `GameSessionViewModelTest_pauseAndResume_statePreserved()`.
- Killing and restarting the app offers a "Continue" option on the menu if a save exists.

---

### Task 6.3 — Add "Continue" flow to `MainMenuScreen`

**Files to modify:**
- `app/src/main/kotlin/.../app/ui/MainMenuScreen.kt`

**What to do:**
- At screen load, check `SaveRepository.load() != null`.
- If save exists: show "Continue" button above "New Game".
- "Continue" calls `GameSessionCoordinator.resumeFromSave()`.
- "New Game" with a save present shows a confirmation dialog ("Start new game? Current save will be lost.").
- Add a `SettingsButton` icon top-right that navigates to `"settings"`.

**Acceptance criteria:**
- Continue button appears only when save exists.
- Resume correctly restores player position, inventory, cauldron state, and time.
- New game overwrite prompts for confirmation.

---

### Task 6.4 — Implement settings screen

**Files to create:**
- `app/src/main/kotlin/.../app/ui/SettingsScreen.kt`
- `data/src/main/kotlin/.../data/settings/SettingsRepository.kt`

**What to do:**
`SettingsRepository` uses `Proto DataStore` (or `Preferences DataStore` for simplicity in this phase) to persist:
```kotlin
data class AppSettings(
    val cureMode: CureMode = CureMode.MODERN,
    val sfxVolume: Float = 1.0f,
    val musicVolume: Float = 0.5f,
    val controlLayout: ControlLayout = ControlLayout.DEFAULT,
    val showDebugOverlay: Boolean = false,
    val accessibilitySlowHazards: Boolean = false,
)
enum class ControlLayout { DEFAULT, FLIPPED, COMPACT }
```

`SettingsScreen` composable renders:
- Mode toggle: "Classic" / "Modern" (maps to `cureMode`).
- SFX volume slider.
- Music volume slider.
- Control layout picker.
- Debug overlay toggle (visible only in debug builds).
- Accessibility section: slow hazards toggle.

**Acceptance criteria:**
- Settings persist across app restarts.
- Changing `cureMode` is reflected on the next new game.
- Debug overlay toggle only appears in debug build variant.

---

### Task 6.5 — Implement `TouchInputMapper`

**Files to create:**
- `input/src/main/kotlin/.../input/touch/TouchInputMapper.kt`
- `input/src/main/kotlin/.../input/touch/VirtualStick.kt`
- `input/src/main/kotlin/.../input/touch/ActionButtonZone.kt`

**What to do:**
`TouchInputMapper` converts `MotionEvent` streams into `FrameInput`. The layout uses two zones:
- **Left zone** (left 45% of screen): virtual stick for movement.
- **Right zone** (right 45%): action button cluster.
- **Center strip**: reserved / passive.

`VirtualStick`:
- On `ACTION_DOWN` in left zone: record stick origin at touch point.
- On `ACTION_MOVE`: compute `delta = currentPoint - origin`.
- If `delta.magnitude < deadzone (24 px)`: output `Vec2f.ZERO`.
- Otherwise: normalize and scale to `[0..1]`, quantize to 8 directions for isometric intent.
- On `ACTION_UP`: reset to zero.

Isometric direction mapping: convert raw 2D stick direction to an isometric intent direction:
```
Up-right touch  → NE world movement
Up-left  touch  → NW world movement
Down-right touch → SE world movement
Down-left  touch → SW world movement
(and 4 cardinal directions as mid-points)
```

`ActionButtonZone`: four buttons arranged in a diamond in the right zone:
- Top: Jump.
- Bottom: Drop item.
- Right: Action (pickup / cauldron interact).
- Left: Cycle inventory.

`FrameInput` fields map directly to these buttons.

**Acceptance criteria:**
- `TouchInputMapperTest_stickNorthEast_producesNEMoveVector()`.
- `TouchInputMapperTest_deadZone_producesZeroVector()`.
- `TouchInputMapperTest_jumpButton_setsJumpPressed()`.
- Touch controls visible and functional in the running app.

---

### Task 6.6 — Implement the debug overlay

**Files to create / modify:**
- `feature-debug/src/main/kotlin/.../debug/DebugOverlayRenderer.kt`
- `feature-debug/src/main/kotlin/.../debug/DebugFlags.kt`

**What to do:**
`DebugFlags` is passed via `RenderFrame`:
```kotlin
data class DebugFlags(
    val showGrid: Boolean = false,
    val showCollisionVolumes: Boolean = false,
    val showDepthKeys: Boolean = false,
    val showSortFoot: Boolean = false,
    val showExitTriggers: Boolean = false,
    val showRoomId: Boolean = false,
    val showTimeState: Boolean = false,
    val showTransformState: Boolean = false,
)
```

`DebugOverlayRenderer.draw(canvas, state, content, projector, flags)` renders on top of the scene:

- **Grid**: for each tile in room, draw the isometric diamond outline.
- **Collision volumes**: yellow wireframe boxes for `SolidVolume` list.
- **Depth keys**: small text label at sort-foot of each entity.
- **Sort-foot anchors**: small red cross at sort-foot of each entity.
- **Exit triggers**: green translucent band along each exit edge.
- **Room ID**: top-left label.
- **Time state panel**: day, phase, phaseProgress, ticksUntilTransform.
- **Transform state panel**: player form + `TransformPhase`.

`DebugOverlayRenderer` lives in `feature-debug` and is excluded from release builds via `BuildConfig.DEBUG` guard in the `app` module.

**Acceptance criteria:**
- Enabling `showCollisionVolumes` visually matches block positions.
- `showDepthKeys` labels match the depth-sorted draw order.
- `showExitTriggers` highlights correct room edges.
- Debug overlay flag toggle works via settings screen.

---

### Task 6.7 — Implement room transition visual effect

**Files to modify:**
- `render/src/main/kotlin/.../render/scene/CanvasSceneRenderer.kt`

**What to do:**
When `state.roomTransition != null`:
- Overlay a full-screen directional wipe in the direction of travel.
- Wipe progress = `1f - (roomTransition.lockTicks / TRANSITION_LOCK_TICKS.toFloat())`.
- Wipe is a black rectangle sweeping from the exit edge, covering the full screen by midpoint, then revealing the new room from the opposite edge.
- Total duration: 12 ticks = 200 ms at 60 Hz. This satisfies the spec's "<200 ms" requirement.

**Acceptance criteria:**
- Room transition is visually smooth without flicker.
- Wipe direction matches exit direction (e.g., EAST exit = wipe from right).
- No gameplay-visible gap between rooms (player reappears immediately in new room when wipe fully reveals).

---

### Task 6.8 — Implement pause screen

**Files to create:**
- `app/src/main/kotlin/.../app/ui/PauseScreen.kt`

**What to do:**
`PauseScreen` is a Compose overlay (rendered above the game Canvas) when `GameSessionViewModel.isPaused == true`:
- "Resume" button.
- "Settings" button (opens `SettingsScreen` as a bottom sheet).
- "Quit to Menu" button (calls `saveCurrentState()` then navigates to menu).

Pause is triggered by `input.pausePressed` from `TouchInputMapper` (a small pause icon button at the top-center of the screen) or hardware back button.

**Acceptance criteria:**
- Game loop pauses (no ticks advance) while pause screen is visible.
- Resuming returns exact state.
- Settings changes take effect immediately.

---

### Task 6.9 — Audio stubs module

**Files to create:**
- `audio/src/main/kotlin/.../audio/AudioManager.kt`
- `audio/src/main/kotlin/.../audio/SoundId.kt`

**What to do:**
```kotlin
enum class SoundId {
    JUMP, LAND, TRANSFORM_START, TRANSFORM_END,
    ITEM_PICKUP, ITEM_DROP, PLAYER_HURT, LIFE_LOST,
    ENTER_ROOM, CAULDRON_SUCCESS, CAULDRON_REJECT,
    CURE_COMPLETE, GAME_OVER,
}

interface AudioManager {
    fun playSfx(id: SoundId)
    fun stopSfx(id: SoundId)
    fun setMusicVolume(volume: Float)
    fun setSfxVolume(volume: Float)
}

class NoopAudioManager : AudioManager { /* all methods are no-ops */ }
```

Wire `NoopAudioManager` as the default implementation. `GameEventHandler` from Task 5.5 maps events to `AudioManager.playSfx(id)` calls.

Full `SoundPool`-backed implementation is a post-Phase-6 task.

**Acceptance criteria:**
- `NoopAudioManager` compiles and does not crash.
- `GameEventHandler` calls the correct `SoundId` for each event (verified by unit test with a mock `AudioManager`).

---

## Phase Dependencies

```
Phase 2: Content Bootstrap
  └─ Phase 1 (complete)

Phase 3: Simulation
  └─ Phase 2 (ContentRepository + GameEngine.initialize)

Phase 4: Rendering
  └─ Phase 3 (GameState + game loop running)

Phase 5: Identity Systems
  └─ Phase 3 (all simulation systems needed)
  └─ Phase 4 (visual feedback required for validation)

Phase 6: Product Shell
  └─ Phase 5 (all systems complete)
  └─ Phase 4 (render pipeline established)
```

Phases 4 and 5 can be partially parallelized: `IsoProjector`, `DrawCommandBuilder`, and `RoomEntityFactory` (Tasks 4.1–4.3) can be implemented independently of Phase 5 systems and merged together.

---

## Test Coverage Summary

| Phase | Minimum new tests |
|-------|------------------|
| 2 | RoomMapper, ContentMapper, AssetContentRepository, GameEngine.initialize, GameLoopCoordinator |
| 3 | CollisionResolver (8+), MovementSystem (5+), RoomTransitionSystem (4+), LifeSystem (4+) |
| 4 | IsoProjector (3+), DrawCommandBuilder (2+), RoomEntityFactory (3+), HudRenderer (2+) |
| 5 | ItemSystem (5+), CauldronSystem (6+), HazardSystem (3+), TransformationSystem additions (3+) |
| 6 | SaveRepository (3+), GameSessionCoordinator (2+), TouchInputMapper (4+) |

---

## Acceptance Criteria for Phase Completion

### Phase 2 done when:
- All 15 rooms load without errors.
- `DefaultGameEngine.initialize` returns a valid `GameState` with player in room_002.
- App launches to title screen with New Game button.

### Phase 3 done when:
- Player walks and jumps on flat floor, lands on block tops.
- Room transition moves player to room_002 and back to room_001.
- Spike contact reduces lives; zero lives emits GameOver.
- Fixed-step loop runs at 60 Hz without spiral of death.

### Phase 4 done when:
- Isometric room with colored placeholders is visible.
- Depth sort is correct: blocks behind player render before player.
- HUD shows lives count and day-night bar that advances over time.

### Phase 5 done when:
- Player can pick up crystal ball, carry it to cauldron, and deliver it.
- Cauldron advances to second request.
- Transformation occurs at nightfall with visual feedback.
- Patrol enemy contacts cause damage and respawn.

### Phase 6 done when:
- Save on background + resume restores exact game state.
- Settings screen persists cureMode and volume across restarts.
- Touch controls allow complete playthrough of 3-request loop.
- Debug overlay shows collision volumes and depth keys correctly.
- Pause/resume works from touch and back button.

---

## Open Decisions to Resolve Before Each Phase

**Phase 2:** Where do Android assets live — `data/src/main/assets` or `app/src/main/assets`? Resolve by choosing `app/src/main/assets` and passing an `AssetLoader` abstraction so `data` remains Android-free. If `data` needs to be a JVM module (for tests), use the interface pattern described in Task 2.5.

**Phase 3:** Should `CollisionSystem` and `MovementSystem` be a single system? The spec recommends separation, but tight coupling between intended movement and collision resolution may warrant merging. Default recommendation: keep separate but pass `CollisionResolver` as a constructor dependency to `MovementSystem`.

**Phase 4:** Canvas vs OpenGL. The spec recommends starting with Canvas. If frame time exceeds 8 ms on mid-tier devices due to too many `drawBitmap` calls, switch the `CanvasSceneRenderer` to a `GLSurfaceView` backed renderer — but do not pre-optimize.

**Phase 5:** Item-as-platform behavior (standing on carried items to gain height) is described in the spec but is mechanically complex. Include as a deferred feature flag; do not block Phase 5 completion on it.

**Phase 6:** `Preferences DataStore` vs `Proto DataStore`. Use `Preferences DataStore` first; migrate to Proto only if type safety becomes a problem.
