# Knight Lore — Modern Android Implementation Plan (Kotlin)

## Purpose
This document is a practical foundation for building a modern Android implementation of **Knight Lore** in Kotlin. The goal is to preserve the original game's core identity—an isometric room-based action-adventure where Sabreman explores a 128-room castle, collects requested items, and manages a human/werewulf transformation on a day-night cycle—while using a maintainable Android architecture and modern Kotlin tooling.[page:1][page:2]

The original game was released in 1984 by Ultimate Play the Game, written by Tim and Chris Stamper, and became famous for its Filmation-style isometric presentation and room-based puzzle-platform gameplay.[page:1][page:2] In the original design, the player has forty days to gather potion ingredients from a castle, return them to Melkhior's cauldron, and break Sabreman's curse.[page:1][page:2]

## Project goals
The Android version should aim for four things:
- Preserve the feel of room-based isometric traversal, object interaction, timing, and hazard avoidance from the original game.[page:1][page:2]
- Replace hardware-era constraints with clean systems, better controls, accessibility options, and consistent frame pacing.
- Keep the original structure of 128 discrete rooms, inventory-driven puzzle solving, and transformation-based traversal differences.[page:1]
- Build the game so Claude Code can extend it incrementally without rewriting core systems.

This first version should focus on a **faithful core remake**, not a genre reinvention. That means one player, offline play, deterministic gameplay systems, and data-driven content definitions before visual polish.

## Source facts to preserve
These are the gameplay facts that should anchor the remake:

| Topic | Original behavior to preserve |
|---|---|
| Protagonist | Sabreman, cursed to transform into a werewolf at night.[page:1][page:2] |
| Objective | Find Melkhior, retrieve requested objects, and drop 14 sequential objects into the cauldron to complete the cure.[page:1][page:2] |
| World structure | 128 flip-screen castle rooms, each acting as a self-contained traversal and puzzle space.[page:1] |
| Time pressure | The quest must be completed within 40 days and nights.[page:1][page:2] |
| Transformation | Human by day, werewulf by night, with transformation affecting movement and enemy behavior.[page:1][page:2] |
| Failure model | Contact hazards and enemies cost lives; running out of lives ends the run.[page:1] |
| Puzzle language | Jump arcs, moving/falling blocks, object carrying, and object stacking to access otherwise unreachable places.[page:1] |

## Product definition
The product should be a premium-feeling single-player Android game built in Kotlin. It should work offline, support phones and tablets, and target portrait menus with landscape gameplay as the default, though full landscape-first support is preferable for actual play.

The implementation should use a hybrid approach:
- Android app shell for lifecycle, navigation, saves, settings, haptics, and platform integration.
- Custom game loop and renderer for gameplay.
- Jetpack Compose for menus, HUD overlays where appropriate, settings, debugging tools, and developer utilities.

## Technical direction
Use Kotlin as the only application language. The simplest durable stack for this project is:

- Kotlin
- Android Studio + Gradle Kotlin DSL
- Jetpack Compose for UI shell
- A custom Canvas-based renderer or LibGDX-on-Android only if performance or tooling clearly demands it
- Coroutines and Flow for state/event pipelines
- Room or Proto DataStore for saves/settings
- kotlinx.serialization or Moshi for data-driven game definitions

### Rendering recommendation
Start with a **custom Android renderer** instead of a cross-platform engine. Knight Lore is room-based, grid-driven, and system-heavy rather than physics-heavy, so a purpose-built renderer can stay smaller, more testable, and easier for Claude Code to modify.

Recommended order:
1. Use a fixed-step simulation loop.
2. Render isometric tiles, actors, props, and overlays in correct depth order.
3. Keep room, actor, collision, and puzzle logic completely independent from rendering.
4. Add sprite animation, particles, and post-effects only after game rules are stable.

## Architecture
Use clean boundaries from the beginning.

### Layers
- `app`: Android entry points, DI wiring, navigation, settings screens.
- `core`: math, geometry, timing, result types, utilities.
- `game-domain`: pure game rules and state transitions.
- `game-data`: room definitions, item definitions, enemy definitions, serializers, save mapping.
- `game-render`: isometric projection, sprite composition, camera, draw ordering.
- `game-input`: touch controls, gamepad support, gesture mapping.
- `feature-debug`: room viewer, collision overlay, spawn tools, profiling panel.

### Rule of ownership
The domain layer must know nothing about Android UI, bitmap loading, or Compose. It should expose immutable state snapshots and deterministic update functions so the game can be simulated, replayed, and tested easily.

## Core game loop
Use a fixed simulation step, for example 60 ticks per second. Rendering may interpolate, but gameplay decisions should always run on deterministic ticks.

Pseudo-structure:

```kotlin
while (running) {
    accumulator += frameDelta
    while (accumulator >= fixedStep) {
        gameState = gameEngine.update(gameState, inputState, fixedStep)
        accumulator -= fixedStep
    }
    renderer.render(gameState, interpolation = accumulator / fixedStep)
}
```

This matters because the original game is timing-sensitive: moving platforms, transformation windows, hazards, and jump commitment all depend on predictable updates.[page:1][page:2]

## World model
Represent the castle as a graph of rooms plus local room content.

### Room model
Each room should contain:
- Room id
- Logical dimensions
- Floor/solid block layout
- Interactive blocks, moving blocks, falling blocks
- Hazard definitions
- Enemy spawn definitions
- Item spawn anchors
- Entrance/exit transitions
- Palette/theme id
- Special rules, for example cauldron room logic

Suggested Kotlin model:

```kotlin
data class RoomDefinition(
    val id: String,
    val width: Int,
    val depth: Int,
    val height: Int,
    val tiles: List<TileStack>,
    val actors: List<ActorSpawn>,
    val interactives: List<InteractiveDef>,
    val exits: List<RoomExit>,
    val itemAnchors: List<ItemAnchor>,
    val theme: RoomTheme,
    val special: RoomSpecial? = null,
)
```

### Room transitions
The original uses discrete single-screen rooms rather than scrolling continuous spaces.[page:1] Preserve that. On crossing a valid room edge or doorway trigger, freeze input briefly, run a fast transition, and load the next room state. This keeps the original cadence intact.

## Coordinate systems
Use three coordinate spaces:
- **Grid space**: logical tile/block positions.
- **World space**: sub-tile movement and collision.
- **Screen space**: projected isometric render coordinates.

Recommended baseline:
- Tile footprint: 1x1 logical unit.
- Vertical elevation: integer steps plus sub-step offsets for animation.
- Projection formula:

```kotlin
screenX = (worldX - worldY) * halfTileWidth
screenY = (worldX + worldY) * halfTileHeight - worldZ * tileHeight
```

All simulation should stay in logical/world space. Only the renderer should care about projection math.

## Depth sorting
One of Knight Lore's defining effects was convincing depth in an isometric room via proper sprite overlap ordering.[page:1] The Android version should explicitly model this with stable draw sorting.

Suggested draw key:
1. Base by room layer.
2. Then by `worldX + worldY + worldZ` or a more precise feet-position metric.
3. Then by actor priority override for special effects.

Every renderable should expose a `sortFootprint()` or `sortKey()` so overlap bugs can be debugged systematically.

## Player model
Sabreman needs state beyond simple movement.

```kotlin
data class PlayerState(
    val form: Form,
    val position: Vec3,
    val velocity: Vec3,
    val facing: Direction8,
    val inventory: PersistentList<ItemInstance>,
    val airborne: Boolean,
    val lives: Int,
    val transformState: TransformState,
)
```

### Forms
- `HUMAN`
- `WEREWULF`

The werewulf form should not just be cosmetic. In the original, form changes affect traversal and enemy interaction, including higher jumping and special danger around some enemies and the cauldron.[page:1][page:2] Make form differences first-class data in movement and AI rules.

## Movement and jumping
Knight Lore is not a freeform action game. It is deliberate, grid-aware, and punishing. The remake should keep committed jumps and exact landings, but improve readability and control fairness.

Recommended movement rules:
- 8-direction movement mapped to isometric intent.
- Short acceleration and deceleration, not slippery momentum.
- Committed jump once launched.
- Variable jump distance only if it helps preserve original puzzle logic.[page:2]
- Optional assist mode for jump previews or softened landing forgiveness.

### Input translation
Touch controls should not mirror a physical d-pad literally. Instead:
- Left side virtual stick or swipe pad for movement.
- Right side jump/action cluster.
- Optional tap-to-move accessibility mode for safe tiles.
- Gamepad support from the start.

## Transformation system
The day-night cycle and form transformation are central to the game's identity.[page:1][page:2] Model them as deterministic world systems.

### Requirements
- World clock advances in simulation ticks.
- A day-night meter is always visible.
- Transition thresholds trigger a temporary transformation state.
- During transformation, player control may be partially locked and vulnerability may increase, reflecting the original risk window.[page:2]
- Room rules and enemies can branch on current form.

```kotlin
data class TimeState(
    val dayIndex: Int,
    val timeOfDay: Float,
    val phase: DayPhase,
)
```

## Inventory and item flow
The original game revolves around fetching requested objects and bringing them to the cauldron.[page:1][page:2] Inventory should therefore be small, explicit, and puzzle-relevant.

Recommended basics:
- Up to 3 carried items, matching the original behavior described in the reference material.[web:3]
- Items can be picked up, dropped, carried, and in some cases stood upon.
- Item instances should have both logical identity and physical presence.
- The cauldron request queue should be deterministic per run, with a configurable seed.

Suggested item model:

```kotlin
data class ItemInstance(
    val id: String,
    val type: ItemType,
    val roomId: String?,
    val position: Vec3?,
    val carriedByPlayer: Boolean,
)
```

## Puzzle systems
The remake should treat puzzles as emergent interactions between a few reusable systems, not bespoke scripts for every room.

Core reusable systems:
- Pushable blocks
- Falling blocks
- Moving platforms
- Timed hazards
- Weight-triggered blocks
- Item-as-platform behavior
- Switches and gates
- Enemy patrol pressure
- Form-gated traversal, for example werewulf jump advantage

That system mix mirrors the original's platforming and object-usage emphasis, where blocks and collected objects can create new routes.[page:1][page:2]

## Enemy and hazard model
Start simple. Each enemy should use a compact behavior state machine.

Suggested categories:
- Static hazards: spikes, crushers, trap tiles.
- Patrol enemies: guards, moving threats.
- Reactive enemies: ghosts or form-sensitive enemies.
- Special room logic: cauldron hostility when entered in werewulf state.[page:2]

Behavior contract:
```kotlin
interface ActorBrain {
    fun tick(context: ActorContext): ActorCommand
}
```

This keeps AI deterministic and testable.

## Lives, fail states, and run structure
The original starts the player with five lives and ends the game when all are lost.[page:1] Preserve that as the default mode.

For a modern Android release, also add optional settings:
- Classic mode: original-style lives and limited forgiveness.
- Modern mode: checkpoints, rewind-on-room-entry, or unlimited retries.
- Accessibility mode: slower hazards, extended transformation warning, visual jump guides.

These should be product options, not code forks.

## Save model
You need three save layers:
- **Profile settings**: controls, audio, graphics, assists.
- **Campaign save**: world clock, current room, lives, current inventory, item placements, request order, discovered states.
- **Run snapshot**: quick resume when Android suspends the app.

Use Proto DataStore for settings and either Room or serialized file snapshots for campaign state. The domain model should serialize from a single authoritative `GameState` aggregate.

## Visual style
Do not simply upscale ZX Spectrum graphics. Build a modernized visual language that respects the original silhouette logic and room readability.

### Art pillars
- Strong room silhouettes.
- Readable height separation.
- Clear hazard language.
- Distinct human vs werewulf silhouettes.
- Limited but atmospheric palette shifts by room theme, inspired by the original's monochrome-per-room readability approach.[page:1]

### Camera
Keep a fixed isometric camera per room. Avoid free rotation in the first implementation because it changes puzzle readability and the original mental model.

### Animation priorities
Start with:
1. Idle
2. Walk
3. Jump ascent/descent
4. Transform human to werewulf
5. Damage/death
6. Pickup/drop

## Audio direction
The original was often praised more for visuals and atmosphere than sound, and some reviews called sound its weakest area.[page:1] That gives the remake room to improve.

Recommended audio plan:
- Minimal ambient room loops.
- Strong transformation cue.
- Precise movement, landing, pickup, and hazard sounds.
- Distinct cauldron feedback for valid and invalid item delivery.
- Dynamic tension layer near nightfall.

## UI and HUD
Use Compose overlays or a dedicated HUD renderer.

HUD essentials:
- Lives
- Current carried items
- Day-night meter
- Current requested item
- Room name/id in debug mode
- Optional assist indicators

Menus in Compose:
- Title screen
- Continue/new game
- Settings
- Control remapping/help
- Accessibility
- Debug tools in developer builds

## Data-driven content
Claude Code will work much better if rooms, items, hazards, and requests are described as data instead of hardcoded in gameplay classes.

Use JSON or Kotlinx-serializable asset files for:
- Room layouts
- Enemy spawns
- Item spawn pools
- Cauldron request sequences
- Room adjacency graph
- Palette/theme definitions

Folder idea:

```text
assets/
  rooms/
    room_001.json
    room_002.json
  items.json
  enemies.json
  progression.json
  themes.json
```

## Suggested package structure

```text
com.example.knightlore
  app/
  core/
    math/
    time/
    collections/
  domain/
    model/
    systems/
    rules/
  data/
    rooms/
    saves/
    assets/
  render/
    iso/
    sprites/
    hud/
  input/
  audio/
  debug/
```

## Testing strategy
A project like this should lean heavily on automated tests for rules.

### Unit tests
Test these first:
- Isometric projection math
- Collision and landing logic
- Jump arc validity
- Day-night progression
- Transformation timing
- Cauldron request progression
- Item pickup/drop rules
- Room transition rules
- Enemy contact and damage

### Golden tests
Capture reference room renders and verify draw ordering and palette correctness.

### Simulation tests
Run fixed input sequences and assert final deterministic state. This is especially useful for puzzle rooms and transformation edge cases.

## Milestone plan
Build this in narrow slices.

### Milestone 1: Engine skeleton
- App launches into a test room.
- Fixed-step loop works.
- One actor renders in isometric projection.
- Collision with floor blocks works.
- Touch and gamepad movement work.

### Milestone 2: Traversal core
- 8-direction movement.
- Jumping.
- Depth sorting.
- Room transitions.
- HUD with day-night meter placeholder.

### Milestone 3: Core game identity
- Human/werewulf transformation.
- Lives.
- Hazards.
- Item pickup/drop/carry.
- Cauldron room prototype.

### Milestone 4: Content framework
- JSON-driven room loading.
- Several connected rooms.
- Save/resume.
- Basic enemies.

### Milestone 5: Vertical slice
- One small castle segment.
- Real request progression.
- Audio.
- Menus/settings.
- Accessibility options.

### Milestone 6: Full remake production
- 128-room content set.
- Tuning and balancing.
- Art/audio polish.
- Regression suite.
- Release prep.

## Claude Code implementation guidance
Claude Code should work from explicit constraints.

### Working rules for Claude Code
- Never place Android framework code in the domain module.
- Keep `GameState` immutable; produce new state from systems each tick.
- Prefer data-driven definitions over switch-heavy hardcoded room logic.
- Add tests for each new rule before adding polish.
- Avoid premature ECS complexity unless actor counts prove the need.
- Build one room perfectly before adding many rooms.

### First coding tasks Claude Code should take
1. Create the multi-module Gradle project structure.
2. Implement vector math, directions, and isometric projection helpers.
3. Implement `GameState`, `RoomDefinition`, and `PlayerState` models.
4. Build a fixed-step loop and test renderer showing one room.
5. Add collision, movement, and jumping.
6. Add room transition logic.
7. Add day-night progression and transformation.
8. Add item pickup/drop and cauldron request prototype.

## Non-goals for the first phase
To keep scope controlled, do **not** start with:
- Online leaderboards
- Procedural generation
- Full 3D free camera
- Combat-heavy redesign
- Live service features
- Monetization systems
- Multiple character classes

## Open design decisions
These should be resolved before implementation expands:
- Pure retro-faithful art vs modern stylized reinterpretation
- Exact movement forgiveness level
- Portrait support during gameplay or menus only
- Whether room layouts are recreated exactly or re-authored from the original structure
- Whether to support speedrun tools like timer splits and replays

## Recommended first deliverable
The best first deliverable is a **single playable prototype room** with:
- Isometric rendering
- Human movement and jump
- One hazard
- One carryable object
- One room exit
- Day-night meter mock
- Stub transformation event

That prototype will validate the hardest foundational choices: projection, controls, collision, update loop, and draw ordering. Once that feels right, the rest of the remake becomes systematic rather than speculative.

## Next document
The next step should be a second markdown document that defines the **minimum viable architecture and module skeleton**, including Gradle modules, key interfaces, data classes, and the first implementation backlog for Claude Code.
