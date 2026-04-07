# Knight Lore Clone — Refactoring & Feature Implementation Prompt

## Context

You are working on a **Kotlin Multiplatform (KMP)** clone of the ZX Spectrum game *Knight Lore* (1984).
The project lives at: https://github.com/manuel-palacio/knight-lore

### Module Structure
```
core/       → geometry, math (Vec2f, Vec3f), time, IDs
render/     → IsoProjector, DrawCommand, DrawCommandBuilder, RoomEntityFactory
domain/     → game logic (game loop, entities, systems)
data/       → room/state persistence
input/      → input abstraction
app/        → Android entry point
desktop/    → JVM/Desktop entry point
feature-debug/ → debug overlay
```

### Key Existing Classes (do not rewrite without asking)
- `IsoProjector` — correct dimetric isometric projection; `toScreen(Vec3f)` and `depthKey(feetWorld)`
- `DrawCommand` / `DrawPayload` — sealed renderer-agnostic draw instruction with layers: `FLOOR, BLOCK, ITEM, ACTOR, PLAYER, FOREGROUND, EFFECT, HUD`
- `DrawCommandBuilder.sort()` — back-to-front depth sort by `(sceneGroup, depthKey, priority, entityId)`
- `RoomEntityFactory.kt` — currently a 113KB God Object emitting DrawCommands for all rooms (needs splitting)

---

## Task List

Work through these tasks **one at a time**. After each task, pause and ask for confirmation before proceeding.

---

### TASK 1 — Fix Housekeeping Issues

1. Add `.DS_Store` to `.gitignore` (it is currently committed to the repo).
2. In `IsoProjector.roomOffset()`, replace the magic `0.06f` vertical offset with a named constant `TileMetrics.ROOM_VERTICAL_BIAS = 0.06f` and add a KDoc explaining what it corrects.
3. Audit `TileMetrics` and ensure ALL pixel constants (`HALF_TILE_WIDTH`, `HALF_TILE_HEIGHT`, `BLOCK_HEIGHT`, etc.) are documented with their ZX Spectrum reference values.

---

### TASK 2 — Split RoomEntityFactory into a Data-Driven Room System

`RoomEntityFactory.kt` is ~113KB of hardcoded Kotlin. Refactor it as follows:

1. **Define a `RoomDefinition` data model** in `data/` module:
```kotlin
@Serializable
data class RoomDefinition(
    val id: String,
    val width: Int,
    val depth: Int,
    val exits: Map<String, String>,   // direction → roomId
    val entities: List<EntityDef>
)

@Serializable
data class EntityDef(
    val type: String,                 // "BLOCK", "FLOOR", "ITEM", "ENEMY", "DOOR", etc.
    val x: Float, val y: Float, val z: Float,
    val width: Float = 1f, val depth: Float = 1f, val height: Float = 1f,
    val properties: Map<String, String> = emptyMap()
)
```

2. **Create a `RoomLoader`** in `data/` that reads `assets/rooms/<roomId>.json` using `kotlinx.serialization`.

3. **Refactor `RoomEntityFactory`** to accept a `RoomDefinition` and emit `DrawCommand` list from it — no hardcoded room data remains in Kotlin code.

4. **Export current rooms** as JSON files to `app/src/main/assets/rooms/` and `desktop/src/main/resources/rooms/`.

---

### TASK 3 — Implement a Fixed-Timestep Game Loop

Create `domain/src/commonMain/.../GameLoop.kt`:

```kotlin
class GameLoop(
    private val fixedHz: Int = 60,
    private val onUpdate: (deltaSeconds: Float) -> Unit,
    private val onRender: (interpolation: Float) -> Unit
)
```

Requirements:
- Fixed physics update at `fixedHz` (default 60 Hz), uncapped render calls
- Passes `interpolation` (0.0–1.0) to `onRender` for smooth sprite interpolation between physics ticks
- Exposes `start()`, `stop()`, `pause()`, `resume()`
- Uses `kotlinx.datetime` or `kotlin.time.TimeSource` — no platform-specific time calls in `commonMain`
- Wire it into both `app` (Android `GameView`) and `desktop` (Compose `LaunchedEffect` or AWT timer)

---

### TASK 4 — Implement Collision Detection System

Create `domain/src/commonMain/.../collision/CollisionSystem.kt`:

1. **AABB model**: Every entity has a `BoundingBox(minX, minY, minZ, maxX, maxY, maxZ)` in world space.
2. **`CollisionSystem.checkCollision(a: BoundingBox, b: BoundingBox): Boolean`**
3. **`CollisionSystem.resolvePlayerVsWorld(player: PlayerState, room: RoomDefinition): Vec3f`** — returns corrected position after sliding collision response.
4. **Gravity**: Player falls if no solid block below feet (`z -= gravitySpeed * dt`), lands when `z <= 0` or top of a block.
5. Write **unit tests** in `domain/src/jvmTest/` covering:
   - Overlap detection (6 cases: X, Y, Z axis penetration)
   - No-overlap cases
   - Floor landing

---

### TASK 5 — Player Entity & Movement

Create `domain/src/commonMain/.../entity/PlayerState.kt`:

```kotlin
data class PlayerState(
    val position: Vec3f,
    val velocity: Vec3f,
    val facing: Direction,           // NORTH, SOUTH, EAST, WEST
    val transformState: TransformState,
    val health: Int = 3,
    val inventory: List<ItemId> = emptyList()
)

enum class TransformState { HUMAN, TRANSFORMING, WOLF }
enum class Direction { NORTH, SOUTH, EAST, WEST }
```

Create `domain/src/commonMain/.../system/MovementSystem.kt`:
- Reads `InputState` (from `input` module)
- Applies velocity based on `Direction` and `TransformState` (wolf is faster)
- Delegates to `CollisionSystem` for position correction
- Emits updated `PlayerState`

---

### TASK 6 — Animation State Machine

Create `domain/src/commonMain/.../animation/AnimationStateMachine.kt`:

```kotlin
class AnimationStateMachine(
    val entityId: String,
    val clips: Map<String, AnimationClip>   // clipName → clip
) {
    fun update(dt: Float): SpriteFrame
    fun transition(toClip: String)
    val currentFrame: SpriteFrame
}

data class AnimationClip(
    val frames: List<SpriteFrame>,
    val fps: Float,
    val loop: Boolean = true
)

data class SpriteFrame(
    val sheetRow: Int,
    val sheetCol: Int,
    val flipX: Boolean = false
)
```

Define clips for the player:
- `"idle_human"`, `"walk_human_north/south/east/west"` (4 frames each)
- `"transform_to_wolf"` (8 frames, no loop)
- `"idle_wolf"`, `"walk_wolf_north/south/east/west"` (4 frames each)
- `"die"` (4 frames, no loop)

---

### TASK 7 — Enemy AI (Mummy Patrol)

Create `domain/src/commonMain/.../entity/EnemyState.kt` and `system/EnemyAiSystem.kt`:

1. **Mummy enemy**: Follows a waypoint patrol path. If player enters detection radius (2.5 tiles), switches to chase mode.
2. **Chase mode**: Moves toward player position at `MUMMY_SPEED`. Returns to patrol if player exits 5-tile radius.
3. **Contact damage**: Reduces `PlayerState.health` by 1 on AABB overlap, with 2-second invincibility window.
4. AI updates run on the **domain fixed-timestep loop** (Task 3), not the render loop.

---

### TASK 8 — Room Navigation & Map

1. Create `domain/src/commonMain/.../map/RoomMap.kt` — loads all `RoomDefinition` JSON files, builds a graph of `roomId → exits → roomId`.
2. Create `domain/src/commonMain/.../map/NavigationSystem.kt` — detects when player crosses an exit boundary, triggers room transition, repositions player at entry point of new room.
3. The original Knight Lore has **128 rooms** — ensure the JSON room format supports all of them. Start with at least 5 rooms connected in a loop for testing.

---

### TASK 9 — HUD & Game State

1. Add a `HUD` `DrawLayer` command set:
   - Health display (3 hearts or ZX Spectrum-style blocks)
   - Current room name / coordinates (debug mode only)
   - Inventory item slots (up to 4 items)
   - Timer (player has limited time before permanent wolf transformation — faithful to original)

2. Create `domain/src/commonMain/.../GameState.kt`:
```kotlin
data class GameState(
    val player: PlayerState,
    val currentRoomId: String,
    val timeRemainingSeconds: Float,   // countdown to permanent wolf
    val phase: GamePhase
)

enum class GamePhase { PLAYING, PAUSED, TRANSFORMING, GAME_OVER, WIN }
```

---

### TASK 10 — Code Quality & CI

1. **Add `detekt`** static analysis to `build-logic` with a rule set appropriate for a game project (disable `MagicNumber` for render constants, enable complexity rules).
2. **Add GitHub Actions workflow** `.github/workflows/ci.yml`:
   - Trigger on `push` and `pull_request` to `main`
   - Steps: `./gradlew detekt`, `./gradlew jvmTest`, `./gradlew assembleDebug`
3. **Expand `jvmTest`** coverage:
   - `IsoProjector` — test `toScreen` against known ZX Spectrum pixel coordinates
   - `DrawCommandBuilder` — test sort order correctness
   - `CollisionSystem` — see Task 4
   - `AnimationStateMachine` — test frame cycling and transition

---

## Coding Standards

- **Kotlin idioms**: prefer `data class`, `sealed interface`, `object`, extension functions; avoid mutable state outside `System` classes.
- **No platform code in `commonMain`**: use `expect`/`actual` for anything platform-specific.
- **Immutable state**: `PlayerState`, `EnemyState`, `GameState` must be immutable `data class`; systems return new copies.
- **No rendering logic in `domain`**: domain emits state, render module reads it — strict separation.
- **KDoc** all public API: classes, functions, and non-obvious constants.
- **Test everything in `jvmTest`**: pure domain logic must have unit tests.

---

## What NOT to change (without discussion)

- `IsoProjector` projection math — it is correct.
- `DrawCommand` / `DrawPayload` sealed hierarchy — it is well-designed.
- `DrawCommandBuilder.sort()` — sort order is correct.
- The KMP module structure — do not flatten into a single module.

---

## Reference

- Original Knight Lore (1984) by Ultimate Play The Game (now Rare/Microsoft) — **do not use original assets**; all art must be original or placeholder colored shapes (current `DrawPayload.ColorRect`/`ColorPath` approach is correct for now).
- ZX Spectrum screen: 256×192px, 15 colors; target a 3× or 4× scaled canvas for modern screens.
- Target platforms: **Android** (API 26+) and **Desktop JVM** (Compose Multiplatform).
