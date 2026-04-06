# Knight Lore — Android MVP Architecture and Module Skeleton (Kotlin)

## Purpose
This document turns the earlier game vision into an implementation-ready MVP architecture for a modern Android remake of **Knight Lore** in Kotlin. The intent is to give Claude Code a concrete project skeleton, module boundaries, interfaces, data models, and a first backlog that can be executed in small safe steps while preserving the original game's defining mechanics: Sabreman's curse, the 40-day limit, the 128-room castle, room-based traversal, and cauldron-driven item progression.[web:18][web:1][web:21]

The MVP is not the full game. It is the minimum architecture that can support one playable room, deterministic simulation, isometric rendering, item interaction, and the beginnings of transformation and time systems without painting the codebase into a corner.[web:18][web:9]

## MVP target
The MVP should produce a small but real vertical slice:
- One connected mini-area of 3 to 5 rooms.
- Sabreman movement and jumping.
- One carryable item.
- One hazard.
- One moving or falling block.
- A visible day-night timer.
- Human to werewulf transformation state.
- A prototype cauldron room that requests an item.[web:18][web:1][web:21]

That slice is enough to validate the hardest parts of the game: input feel, update determinism, isometric draw order, room transitions, puzzle object handling, and form-dependent behavior.[web:18][web:9]

## Architectural principles
Use these rules throughout the codebase:

- **Deterministic domain**: game rules must run the same way for the same input sequence.
- **Immutable state at the domain boundary**: each tick produces a new `GameState` or a structurally shared copy.
- **Android is an adapter**: Activities, Compose, audio backends, and bitmap loading stay outside core rules.
- **Data over hardcoding**: rooms, item placements, exits, and hazards are content definitions.
- **One-way flow**: input enters the engine, systems update state, render layer consumes state.
- **Feature flags for modernizations**: classic and modern assists should be configuration, not divergent code paths.

## Recommended stack
Use a stack that Claude Code can maintain without unnecessary engine complexity:

| Area | Recommendation |
|---|---|
| Language | Kotlin |
| Build | Gradle Kotlin DSL |
| UI shell | Jetpack Compose |
| Game loop | Custom fixed-step loop |
| Rendering | Android Canvas first, OpenGL only if proven necessary |
| Serialization | kotlinx.serialization |
| Settings | Proto DataStore |
| Saves | JSON snapshot or Room-backed save records |
| Dependency injection | Manual DI initially, Hilt only if app shell grows |
| Testing | JUnit, kotest or plain assertions, screenshot/golden tests later |

This keeps the early project small while still aligning with modern Android practices.

## Gradle module layout
Start with a multi-module project from day one.

```text
knight-lore/
  settings.gradle.kts
  build.gradle.kts
  gradle/libs.versions.toml
  app/
  core/
  domain/
  data/
  render/
  input/
  audio/
  debug/
  docs/
```

### Module responsibilities

#### `app`
Android entry layer.
- `MainActivity`
- Compose navigation
- App theme
- Lifecycle integration
- DI composition root
- ViewModels for menus and session shell
- Pause/resume hooks

#### `core`
Pure utility module, no Android dependencies.
- Math vectors
- Directions
- Time helpers
- Result types
- IDs
- Geometry and bounds
- Small collection helpers

#### `domain`
Pure gameplay rules, no Android imports.
- `GameState`
- Systems and reducers
- Rule services
- Collision logic
- Transformation logic
- World clock
- Room transition rules
- Inventory rules
- Victory/failure conditions

#### `data`
Loads and saves content.
- Asset readers
- DTOs and serializers
- Mapping DTO to domain models
- Save repository
- Settings repository bridge
- Room content bundles

#### `render`
Projection and drawing.
- Isometric projection utilities
- Draw commands
- Sprite registry
- Room renderer
- Actor renderer
- HUD renderer
- Theme palette application

#### `input`
Maps device input to domain commands.
- Touch controls
- Gesture areas
- Gamepad mapper
- Keyboard support for emulator/dev use
- Input buffering

#### `audio`
Sound and music abstraction.
- Sound effect ids
- Music cues
- Audio backend adapter
- Event-to-sound mapping

#### `debug`
Developer-only tools.
- Room selector
- Collision overlay
- FPS/tick meter
- Spawn inspector
- State dump viewer

## Dependency direction
Keep dependencies flowing inward only.

```text
app -> input, data, render, audio, debug, domain, core
input -> domain, core
data -> domain, core
render -> domain, core
audio -> domain, core
debug -> domain, render, core
domain -> core
core -> (nothing)
```

The domain module must not depend on Android, Compose, Canvas, MediaPlayer, or asset loading APIs.

## Package structure
Suggested package layout inside modules:

```text
core/src/main/kotlin/com/example/knightlore/core/
  math/
  geometry/
  time/
  ids/
  collections/

 domain/src/main/kotlin/com/example/knightlore/domain/
  model/
  system/
  rules/
  service/
  event/
  config/

 data/src/main/kotlin/com/example/knightlore/data/
  asset/
  dto/
  mapper/
  save/
  settings/

 render/src/main/kotlin/com/example/knightlore/render/
  iso/
  sprite/
  scene/
  hud/
  theme/

 input/src/main/kotlin/com/example/knightlore/input/
  touch/
  gamepad/
  mapping/

 app/src/main/kotlin/com/example/knightlore/app/
  ui/
  navigation/
  session/
  di/
```

## Minimum domain model
The MVP needs a small but complete domain shape.

### Root game state

```kotlin
@Serializable
data class GameState(
    val runState: RunState,
    val world: WorldState,
    val player: PlayerState,
    val actors: PersistentList<ActorState>,
    val looseItems: PersistentList<ItemState>,
    val time: TimeState,
    val cauldron: CauldronState,
    val transient: TransientState,
)
```

### Run and world state

```kotlin
@Serializable
data class RunState(
    val mode: GameMode,
    val status: RunStatus,
    val livesRemaining: Int,
    val dayNumber: Int,
    val rngSeed: Long,
)

@Serializable
data class WorldState(
    val currentRoomId: RoomId,
    val discoveredRooms: PersistentSet<RoomId>,
    val roomStates: PersistentMap<RoomId, RoomRuntimeState>,
)
```

### Player state

```kotlin
@Serializable
data class PlayerState(
    val form: PlayerForm,
    val position: Vec3f,
    val velocity: Vec3f,
    val facing: IsoDirection,
    val movementState: MovementState,
    val carrySlots: PersistentList<ItemId>,
    val isAirborne: Boolean,
    val isAlive: Boolean,
    val transformState: TransformState,
)
```

### Time and transformation

```kotlin
@Serializable
data class TimeState(
    val tick: Long,
    val day: Int,
    val phase: DayPhase,
    val phaseProgress: Float,
    val ticksUntilTransform: Int?,
)
```

### Room definitions

```kotlin
@Serializable
data class RoomDefinition(
    val id: RoomId,
    val size: GridSize3,
    val staticBlocks: List<BlockDef>,
    val dynamicBlocks: List<DynamicBlockDef>,
    val hazards: List<HazardDef>,
    val actorSpawns: List<ActorSpawnDef>,
    val itemSpawns: List<ItemSpawnDef>,
    val exits: List<ExitDef>,
    val specialRoomType: SpecialRoomType = SpecialRoomType.NONE,
)
```

### Cauldron progression

```kotlin
@Serializable
data class CauldronState(
    val requestedItems: PersistentList<ItemType>,
    val deliveredCount: Int,
    val currentRequest: ItemType?,
)
```

## Domain enums and small types
The first pass should define these small but important types:

```kotlin
enum class PlayerForm { HUMAN, WEREWULF }
enum class RunStatus { RUNNING, PAUSED, DEAD, WON, LOST }
enum class DayPhase { DAY, DUSK, NIGHT, DAWN }
enum class MovementState { IDLE, WALKING, JUMP_ASCENT, JUMP_DESCENT, LANDING, TRANSFORMING }
enum class SpecialRoomType { NONE, CAULDRON, START, TREASURE, TRAP }
enum class GameMode { CLASSIC, MODERN, ACCESSIBLE }
```

Identifiers should be inline value classes where practical:

```kotlin
@JvmInline value class RoomId(val value: String)
@JvmInline value class ItemId(val value: String)
@JvmInline value class ActorId(val value: String)
```

## Engine API
Keep the engine surface tiny and explicit.

```kotlin
interface GameEngine {
    fun initialize(seed: Long, content: GameContent): GameState
    fun update(
        previous: GameState,
        input: FrameInput,
        config: EngineConfig,
        deltaSeconds: Float,
    ): GameTickResult
}
```

```kotlin
data class GameTickResult(
    val state: GameState,
    val events: List<GameEvent>,
)
```

### Why this shape
This lets the app layer drive the loop, the renderer consume the returned immutable state, and audio/HUD react to domain events without hidden side effects.

## Input contract
Input should arrive in gameplay terms, not touchscreen terms.

```kotlin
data class FrameInput(
    val moveVector: Vec2f,
    val jumpPressed: Boolean,
    val jumpHeld: Boolean,
    val actionPressed: Boolean,
    val dropPressed: Boolean,
    val cycleInventoryPressed: Boolean,
    val pausePressed: Boolean,
)
```

The `input` module converts touch zones, virtual stick motion, and gamepad events into this structure.

## System breakdown
The update loop should call small systems in a stable order.

Recommended tick order:
1. Input interpretation
2. Time progression
3. Transformation update
4. Player movement and jump resolution
5. Dynamic block updates
6. Item interaction
7. Hazard and enemy resolution
8. Room transition resolution
9. Cauldron/progression checks
10. Event emission and cleanup

This ordering reflects the original game's heavy dependence on timing, form changes, hazards, and room-contained puzzle logic.[web:18][web:21][web:23]

## Domain system interfaces
Keep systems replaceable and testable.

```kotlin
interface GameSystem {
    fun update(state: GameState, input: FrameInput, config: EngineConfig): SystemResult
}

 data class SystemResult(
    val state: GameState,
    val events: List<GameEvent> = emptyList(),
 )
```

Concrete first systems:
- `TimeSystem`
- `TransformationSystem`
- `MovementSystem`
- `CollisionSystem`
- `DynamicBlockSystem`
- `ItemSystem`
- `HazardSystem`
- `RoomTransitionSystem`
- `CauldronSystem`
- `LifeSystem`

## Collision model
Avoid full physics engines. Knight Lore is room-based and block-centric, so collision should be handcrafted and predictable.[web:18]

### Recommended approach
- Use AABB-like logical volumes in world space.
- Floors and block tops are landing surfaces.
- Edges are strict and readable.
- Moving/falling blocks are kinematic objects with scripted behavior.
- Collisions resolve axis by axis or via movement intent slices.

Key interfaces:

```kotlin
interface CollisionWorld {
    fun solidsFor(roomId: RoomId): List<SolidVolume>
    fun hazardsFor(roomId: RoomId): List<HazardVolume>
}
```

## Room content pipeline
Room data should be loaded from JSON assets and mapped into domain definitions.

### Asset example

```json
{
  "id": "room_001",
  "size": { "x": 8, "y": 8, "z": 6 },
  "staticBlocks": [
    { "x": 0, "y": 0, "z": 0, "kind": "STONE" }
  ],
  "dynamicBlocks": [],
  "hazards": [],
  "actorSpawns": [],
  "itemSpawns": [],
  "exits": [
    { "edge": "EAST", "targetRoomId": "room_002", "targetSpawn": { "x": 0.5, "y": 3.5, "z": 1.0 } }
  ]
}
```

### Data loading flow
1. Read asset JSON.
2. Deserialize DTOs.
3. Validate references and room graph integrity.
4. Map DTOs to domain definitions.
5. Build `GameContent` bundle.

## Content root object

```kotlin
data class GameContent(
    val rooms: Map<RoomId, RoomDefinition>,
    val itemTypes: Map<String, ItemTypeDefinition>,
    val actorTypes: Map<String, ActorTypeDefinition>,
    val themeSet: ThemeSet,
    val progression: ProgressionDefinition,
)
```

## Rendering contract
The renderer should not inspect gameplay rules. It should consume state and content and output draw commands.

### Render pipeline
1. Read current room and visible entities.
2. Project world positions into screen coordinates.
3. Build drawables with sprite/frame metadata.
4. Sort drawables by depth.
5. Draw room base, dynamics, actors, items, overlays.
6. Draw HUD.

### Renderer API

```kotlin
interface SceneRenderer {
    fun render(frame: RenderFrame)
}

 data class RenderFrame(
    val state: GameState,
    val content: GameContent,
    val interpolation: Float,
    val debugFlags: DebugFlags,
 )
```

### Draw command approach
Use an intermediate command list so rendering can be debugged and snapshot-tested.

```kotlin
data class DrawCommand(
    val spriteId: String,
    val screenX: Float,
    val screenY: Float,
    val zIndex: Int,
    val tint: Int? = null,
)
```

## Isometric projection utility
Projection should live in one place only.

```kotlin
interface IsoProjector {
    fun project(position: Vec3f): ScreenPoint
    fun depthKey(position: Vec3f, footprint: Vec3f = Vec3f(0f, 0f, 0f)): Int
}
```

A single tested projector avoids duplicated coordinate math bugs across movement, debug views, and rendering.

## Android app shell
The `app` module should stay thin.

### Main flow
- App starts in Compose.
- User enters title/menu screen.
- Selecting `Start` opens a gameplay host composable.
- Gameplay host owns the loop coordinator and renderer surface.
- Overlay UI shows pause/settings/debug.
- Activity lifecycle suspends and resumes the session safely.

### Suggested shell types

```kotlin
class MainActivity : ComponentActivity()
class GameSessionViewModel(...)
@Composable fun AppRoot()
@Composable fun MainMenuScreen(...)
@Composable fun GameScreen(...)
```

## Session orchestration
Do not let the ViewModel contain gameplay rules. It should orchestrate the engine only.

```kotlin
class GameSessionCoordinator(
    private val engine: GameEngine,
    private val contentRepository: ContentRepository,
    private val saveRepository: SaveRepository,
) {
    fun startNewGame(seed: Long)
    fun resume(snapshot: SaveSnapshot)
    fun onFrame(input: FrameInput, deltaSeconds: Float)
    fun pause()
    fun save()
}
```

## Save and settings model
Separate long-term settings from gameplay snapshots.

### Settings
Store in Proto DataStore:
- Audio volume
- Control layout
- Difficulty/assist toggles
- Preferred language later
- Visual accessibility options

### Save snapshot

```kotlin
@Serializable
data class SaveSnapshot(
    val version: Int,
    val timestampUtc: String,
    val gameState: GameState,
)
```

Version every snapshot early so data migrations are possible later.

## Audio event model
The domain should emit semantic events. Audio maps them to sounds.

```kotlin
sealed interface GameEvent {
    data object JumpStarted : GameEvent
    data object Landed : GameEvent
    data object TransformationStarted : GameEvent
    data object TransformationCompleted : GameEvent
    data class ItemPickedUp(val itemId: ItemId) : GameEvent
    data class ItemDropped(val itemId: ItemId) : GameEvent
    data object PlayerDamaged : GameEvent
    data object LifeLost : GameEvent
    data class EnteredRoom(val roomId: RoomId) : GameEvent
    data class CauldronRequestAdvanced(val itemType: String) : GameEvent
}
```

This is much cleaner than calling sound playback from inside systems.

## Debug tooling
Developer tools will save a lot of time on a puzzle-heavy isometric game.

First debug features:
- Show room id and coordinates.
- Toggle collision volumes.
- Show depth keys.
- Warp to room.
- Freeze time.
- Force transformation.
- Spawn selected item.
- Step one tick at a time.

These should live behind debug build flags and must not leak into domain rules.

## First implementation backlog
Claude Code should implement the project in this exact order.

### Phase 1: Foundation
1. Create Gradle multi-module project.
2. Add version catalog and shared Kotlin conventions.
3. Add `core` math and IDs.
4. Add `domain` models and basic engine interfaces.
5. Add unit test setup in `core` and `domain`.

### Phase 2: Content and bootstrap
6. Add `data` asset DTOs and content repository.
7. Create one room JSON asset and validation.
8. Add engine initialization from content.
9. Add `app` shell with title screen and start button.

### Phase 3: Simulation
10. Implement fixed-step loop coordinator.
11. Add `MovementSystem` and `CollisionSystem`.
12. Add jump state handling.
13. Add room exit logic.
14. Add lives and respawn rules.

### Phase 4: Rendering
15. Add `render` module and `IsoProjector`.
16. Render room blocks.
17. Render player with depth sorting.
18. Render one item and one hazard.
19. Add simple HUD with lives and day-night bar.

### Phase 5: Identity systems
20. Add `TimeSystem`.
21. Add `TransformationSystem`.
22. Add form-dependent jump tuning.
23. Add cauldron request prototype.
24. Add item pickup/drop/carry cycle.

### Phase 6: Product shell
25. Add pause and resume.
26. Add save snapshot serialization.
27. Add settings screen.
28. Add touch control customization.
29. Add debug overlay.

## Initial file skeleton
Below is the smallest useful starting point.

```text
app/
  src/main/kotlin/com/example/knightlore/app/
    MainActivity.kt
    AppRoot.kt
    GameScreen.kt
    MainMenuScreen.kt
    session/GameSessionCoordinator.kt

core/
  src/main/kotlin/com/example/knightlore/core/
    math/Vec2f.kt
    math/Vec3f.kt
    geometry/Aabb.kt
    ids/Ids.kt
    time/GameClock.kt

domain/
  src/main/kotlin/com/example/knightlore/domain/
    model/GameState.kt
    model/PlayerState.kt
    model/RoomDefinition.kt
    model/ItemState.kt
    model/ActorState.kt
    model/TimeState.kt
    model/CauldronState.kt
    event/GameEvent.kt
    system/GameSystem.kt
    system/MovementSystem.kt
    system/TimeSystem.kt
    system/TransformationSystem.kt
    system/RoomTransitionSystem.kt
    GameEngine.kt

 data/
  src/main/kotlin/com/example/knightlore/data/
    asset/ContentRepository.kt
    dto/RoomDto.kt
    mapper/RoomMapper.kt
    save/SaveRepository.kt

 render/
  src/main/kotlin/com/example/knightlore/render/
    iso/IsoProjector.kt
    scene/SceneRenderer.kt
    scene/DrawCommand.kt
    hud/HudRenderer.kt

input/
  src/main/kotlin/com/example/knightlore/input/
    mapping/FrameInput.kt
    touch/TouchInputMapper.kt
```

## Conventions Claude Code should follow
Claude Code should adopt these conventions immediately:

- Prefer constructor injection.
- Keep functions short and rule-focused.
- No Android imports in `core` or `domain`.
- Use `data class` for immutable state.
- Use sealed hierarchies for events and commands.
- Keep one source of truth for projection math.
- Add tests whenever a rule gains branching behavior.
- Avoid general-purpose ECS until actor complexity proves it necessary.

## Test plan for MVP
The first automated tests should cover:
- Projection math for known coordinates.
- Player movement on flat floor.
- Jump landing on block tops.
- Room exit transfer.
- Time progression from day to night.
- Transformation trigger timing.
- Item pickup/drop slot behavior.
- Cauldron acceptance of correct vs incorrect item.
- Hazard contact causing life loss.[web:18][web:21][web:23]

### Example test names
- `IsoProjector_depthKey_orders_back_to_front()`
- `MovementSystem_jump_lands_on_target_block()`
- `TimeSystem_entersNight_afterConfiguredTicks()`
- `CauldronSystem_acceptsRequestedItem_only()`
- `RoomTransitionSystem_movesPlayerToTargetSpawn()`

## Definition of done for MVP
The MVP is done when all of these are true:
- A new game starts from menu into a playable room set.
- Movement and jumps feel stable on a fixed tick.
- Draw order is correct for blocks, items, and player.
- The clock progresses and transformation occurs visibly.
- One requested item can be collected and delivered.
- Death, respawn, and lives function correctly.
- Save/resume restores exact state.
- Core rules have automated tests.
- Domain remains Android-free.

## Immediate next document
After this architecture file, the best next artifact is a third markdown document with **actual starter code stubs**: Gradle files, module `build.gradle.kts`, key interfaces, and the first Kotlin source files Claude Code should generate in order.
