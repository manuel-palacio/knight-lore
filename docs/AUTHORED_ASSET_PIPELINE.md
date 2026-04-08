# Knight Lore Remake — Authored Asset Pipeline Implementation Spec

This document defines the implementation plan for the three core authored-art classes:
- `ActorArtCatalog`
- `PropArtCatalog`
- `RoomArtProfile`

The purpose of these classes is to separate **procedural spatial logic** from **authored visual identity**.

This spec is an implementation companion to:
- `ART_DIRECTION.md`
- `VISUAL_DO_NOTS.md`

All graphics work should use these three documents together.

---

## Why This Exists

The current rendering direction has been over-reliant on procedural shape generation, material tweaks, and palette iteration. That can improve clarity, but it does not reliably produce memorable silhouettes, staged rooms, or emotionally specific visuals.

The new pipeline preserves the strengths of the current engine:
- isometric projection
- room/block logic
- z sorting
- puzzle structure
- dynamic object placement

But it moves visual identity into an authored layer.

Compose supports direct canvas drawing and resource-driven images/graphics, including vectors and animated vectors, so the engine can continue placing things procedurally while asset definitions become curated and reusable. [web:257][web:258][web:259][web:239]

---

## Design Goal

The renderer must stop inventing major visuals from generic geometric primitives as its default behavior.

Instead:
- engine systems decide **where things are**
- art catalogs decide **what things look like**
- room profiles decide **how rooms are staged**

This is the main architectural shift.

---

## Core Responsibilities

| Class | Responsibility | What it must not do |
|---|---|---|
| `ActorArtCatalog` | Return authored actor visuals for state, facing, form, and mood | Must not know game physics or collision [web:257][web:258] |
| `PropArtCatalog` | Return authored props, collectibles, puzzle markers, set-pieces, and decor assets | Must not decide room composition |
| `RoomArtProfile` | Define room-specific focal staging, overlays, light logic, and quiet zones | Must not contain physics or puzzle simulation |

---

## High-Level Architecture

### Before
The likely current flow is close to this:
- room systems produce world state
- render factory inspects world state
- render factory generates most art procedurally from geometry and palette rules

### After
The new flow must become:
1. domain systems produce room state and entity state
2. projector computes screen placement
3. `RoomArtProfile` describes room mood, focal elements, and decor placements
4. `ActorArtCatalog` supplies authored actor assets
5. `PropArtCatalog` supplies authored prop and item assets
6. renderer composes these assets into layers

This preserves your current engine investment while fixing the artistic pipeline.

---

## Recommended Package Structure

Create a dedicated authored-art package in `render`:

```text
render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/
  ActorArtCatalog.kt
  DefaultActorArtCatalog.kt
  PropArtCatalog.kt
  DefaultPropArtCatalog.kt
  RoomArtProfile.kt
  DefaultRoomArtProfiles.kt
  AuthoredSprite.kt
  DecorPlacement.kt
  LightPlacement.kt
  PaletteRole.kt
  ArtVariants.kt
```

Optional Android-only resource helpers if you use vector drawables:

```text
render/src/androidMain/kotlin/com/palacesoft/knightlore/render/art/android/
  AndroidVectorAssetLoader.kt
  AndroidPainterCache.kt
```

---

## Rendering Strategy

Use authored vectors or curated path definitions, not generated primitive mannequins.

Recommended supported asset sources:
- Kotlin-defined `ImageVector` / path templates
- Android vector drawables loaded as painters/resources [web:259][web:260][web:262]
- animated vector resources for simple state transitions where appropriate [web:239][web:267]
- pre-baked bitmap atlases later if needed, but not required for the first migration

Important rule:
The catalog API must be resource-agnostic. It should not force the rest of the renderer to care whether an asset came from XML vector resources, code-defined vectors, or cached bitmaps.

---

# ActorArtCatalog

## Purpose

`ActorArtCatalog` provides authored visuals for all moving characters:
- player human
- player werewolf
- guards
- ghosts
- druids
- robots / cursed constructs
- future actor classes

It is responsible for silhouette identity and animation pose selection.

It is **not** responsible for movement logic, hitboxes, or state simulation.

---

## Core Requirements

### Functional requirements
- return an asset for actor type, form, facing, and animation state
- support authored pose variants
- support room/theme palette adaptation without destroying silhouette identity
- support optional overlays, for example curse glow, damage flash mask, torch-light variant
- allow future caching

### Art requirements
- each actor class must have unique silhouette logic
- player human and werewolf must not share the same body template
- different actors must not be palette swaps of one mannequin base
- motion states must change shape attitude, not just translation

---

## Proposed API

```kotlin
interface ActorArtCatalog {
    fun resolve(spec: ActorArtSpec): AuthoredSprite
}

data class ActorArtSpec(
    val actorKind: ActorKind,
    val form: ActorForm? = null,
    val facing: Facing,
    val motion: ActorMotion,
    val mood: ActorMood = ActorMood.Default,
    val paletteContext: PaletteContext,
    val framePhase: Int = 0,
)
```

### Suggested enums

```kotlin
enum class ActorKind {
    PLAYER,
    GUARD,
    GHOST,
    DRUID,
    ROBOT,
}

enum class ActorForm {
    HUMAN,
    WEREWOLF,
}

enum class ActorMotion {
    IDLE,
    WALK_A,
    WALK_B,
    JUMP_RISE,
    JUMP_APEX,
    LAND,
    DAMAGE,
    TRANSFORM_START,
    TRANSFORM_LOOP,
    TRANSFORM_END,
    ATTACK,
}

enum class ActorMood {
    Default,
    Enraged,
    Weakened,
    Cursed,
}
```

---

## AuthoredSprite Model

Use a reusable sprite model for both actors and props.

```kotlin
data class AuthoredSprite(
    val id: String,
    val viewportWidth: Float,
    val viewportHeight: Float,
    val anchor: SpriteAnchor,
    val layers: List<AuthoredLayer>,
    val bounds: SpriteBounds,
)

data class AuthoredLayer(
    val id: String,
    val drawData: DrawData,
    val fillRole: PaletteRole,
    val strokeRole: PaletteRole? = null,
    val alpha: Float = 1f,
    val zOffset: Float = 0f,
    val tags: Set<String> = emptySet(),
)
```

`DrawData` can wrap:
- path instructions
- `ImageVector`
- vector resource reference
- bitmap reference later if needed

This keeps the system flexible. Compose drawing APIs support layered custom drawing, transforms, and painter-based rendering, which fits this abstraction well. [web:257][web:258][web:260]

---

## Implementation Plan for ActorArtCatalog

### Phase 1 — Player and werewolf only
Implement only:
- `PLAYER + HUMAN`
- `PLAYER + WEREWOLF`

States required at minimum:
- `IDLE`
- `WALK_A`
- `WALK_B`
- `JUMP_RISE`
- `LAND`
- `TRANSFORM_START`
- `TRANSFORM_END`

This should replace the current procedural player assembly first.

### Phase 2 — Guards and ghosts
Implement authored silhouettes for major enemy classes.

### Phase 3 — Full actor library
Complete all actor families.

---

## Implementation Rules for Actor Assets

- Start with silhouette-only black-fill tests before colorizing.
- Build the player as a deliberately asymmetrical, stooped, burdened shape.
- Build the werewolf as a different mass logic, not a modified human.
- Every actor asset should have 3–6 draw layers max in v1 to keep iteration manageable.
- Use palette roles, not hardcoded colors, so room themes can tint surfaces while preserving identity.

### Recommended palette roles

```kotlin
enum class PaletteRole {
    BODY_MAIN,
    BODY_SHADOW,
    BODY_HIGHLIGHT,
    METAL,
    CLOTH,
    TRIM,
    EYE_ACCENT,
    CURSE_GLOW,
    OUTLINE_SOFT,
}
```

---

# PropArtCatalog

## Purpose

`PropArtCatalog` provides all authored non-character visuals that need identity.

This includes:
- collectibles
- static props
- room set-pieces
- puzzle blocks with special visual treatment
- decorative overlays
- hanging objects
- altars, braziers, thrones, banners, chains, windows, cages

This class exists because props are currently at high risk of becoming “the same object language with recolors.”

---

## Core Requirements

### Functional requirements
- return authored art for all key prop families
- distinguish gameplay-critical props from decorative props
- allow small variants for repetition without losing style
- support room-theme palette mapping
- support front/back layering when necessary

### Art requirements
- each collectible must read by silhouette first
- set-pieces must be room anchors, not just big furniture
- puzzle-critical objects must be readable under motion and overlap
- not every prop should share the same bevel, edge, or block logic

---

## Proposed API

```kotlin
interface PropArtCatalog {
    fun resolve(spec: PropArtSpec): AuthoredSprite
}

data class PropArtSpec(
    val propKind: PropKind,
    val variant: String? = null,
    val state: PropVisualState = PropVisualState.Default,
    val paletteContext: PaletteContext,
)
```

### Suggested enum

```kotlin
enum class PropKind {
    CAULDRON,
    THRONE,
    ALTAR,
    BRAZIER,
    BANNER,
    CHAIN_CLUSTER,
    HANGING_CAGE,
    BARRED_WINDOW,
    CRUMBLING_BLOCK,
    PUZZLE_BLOCK,
    PEDESTAL,
    GOBLET,
    VIAL,
    CRYSTAL_BALL,
    KEY,
    SKULL,
    GEM,
    TORCH_ITEM,
    BOOT,
    TEACUP,
}

enum class PropVisualState {
    Default,
    Active,
    Damaged,
    Glowing,
    Collected,
    Crumbling,
}
```

---

## Prop Categories

### Category A — Collectibles
Every collectible gets its own silhouette template.
Do not reuse one generic item body.

### Category B — Anchor props
These define room identity.
Examples:
- throne
- altar
- giant window
- cauldron
- cage cluster

### Category C — Support props
These reinforce room story without stealing focus.
Examples:
- banners
- chains
- grime plaques
- broken columns
- wall hooks

### Category D — Gameplay props
These need especially clear readability.
Examples:
- push blocks
- crumbling blocks
- pedestals
- hazard markers

---

## Implementation Plan for PropArtCatalog

### Phase 1 — Collectibles + 3 anchor props
Implement first:
- goblet
- key
- vial
- crystal ball
- throne
- cauldron
- barred window

These assets will immediately improve room identity and item readability.

### Phase 2 — Puzzle objects
Implement:
- puzzle block
- crumbling block
- pedestal
- ritual altar

### Phase 3 — Support decor library
Implement repeating decor assets with controlled variation.

---

## Prop Asset Rules

- Collectibles must be readable in monochrome silhouette.
- Anchor props may be oversized relative to realism.
- Support decor must be visually quieter than anchor props.
- Decorative assets must not turn every wall into a billboard.
- Puzzle props must pop by silhouette/value, not only by color.

---

# RoomArtProfile

## Purpose

`RoomArtProfile` defines room-specific staging.
This is where authored composition enters the procedural room system.

The room profile tells the renderer:
- what the focal object is
- where decor belongs
- what light idea dominates the room
- which parts of the room stay quiet
- how clutter density is distributed

This is the class that stops rooms from feeling like interchangeable stone boxes.

---

## Core Requirements

### Functional requirements
- map each room id to an art profile
- support room-specific anchor props
- support decorative placements with depth metadata
- support light and shadow overlays
- support quiet zones to prevent overfilling
- support future theme inheritance

### Art requirements
- each important room must have one memory hook
- room identity must not rely only on palette or wall texture
- composition must create hierarchy and asymmetry
- clutter must be selective

---

## Proposed API

```kotlin
data class RoomArtProfile(
    val roomId: String,
    val theme: RoomTheme,
    val anchor: DecorPlacement? = null,
    val decor: List<DecorPlacement> = emptyList(),
    val lightSources: List<LightPlacement> = emptyList(),
    val shadowOverlays: List<OverlayPlacement> = emptyList(),
    val quietZones: List<GridZone> = emptyList(),
    val notes: String = "",
)
```

Supporting types:

```kotlin
data class DecorPlacement(
    val propKind: PropKind,
    val gridX: Int,
    val gridY: Int,
    val gridZ: Int = 0,
    val facing: Facing = Facing.SOUTH,
    val scale: Float = 1f,
    val layerMode: DecorLayerMode = DecorLayerMode.WORLD,
    val variant: String? = null,
)

data class LightPlacement(
    val kind: LightKind,
    val gridX: Float,
    val gridY: Float,
    val gridZ: Float,
    val intensity: Float,
    val radius: Float,
    val tintRole: PaletteRole,
)

data class OverlayPlacement(
    val kind: OverlayKind,
    val area: GridZone,
    val opacity: Float,
)

data class GridZone(
    val x0: Int,
    val y0: Int,
    val x1: Int,
    val y1: Int,
)
```

---

## Room Profile Examples

### Example: Cauldron Hall

```kotlin
RoomArtProfile(
    roomId = "001",
    theme = RoomTheme.CASTLE,
    anchor = DecorPlacement(
        propKind = PropKind.CAULDRON,
        gridX = 4,
        gridY = 2,
        gridZ = 0,
        scale = 1.25f,
        variant = "chained"
    ),
    decor = listOf(
        DecorPlacement(PropKind.CHAIN_CLUSTER, 2, 0, 2),
        DecorPlacement(PropKind.BANNER, 7, 0, 2, variant = "torn"),
    ),
    lightSources = listOf(
        LightPlacement(LightKind.CAULDRON_GLOW, 4.5f, 2.5f, 0f, 0.8f, 3.5f, PaletteRole.CURSE_GLOW)
    ),
    quietZones = listOf(GridZone(0, 5, 2, 7)),
    notes = "Anchor the room around the cursed cauldron; leave one rear corner visually sparse."
)
```

This is the type of staging information the procedural renderer cannot infer on its own.

---

## Implementation Plan for RoomArtProfile

### Phase 1 — Hero rooms only
Create profiles for:
- start room
- cauldron hall
- throne room / major castle room
- one dungeon ritual room
- one tower room

### Phase 2 — All rooms
Give each room:
- 1 anchor or clear motif
- 1 dominant light idea
- 1 quiet zone

### Phase 3 — Environmental storytelling variants
Add per-room states if desired:
- post-puzzle solved
- day/night mood shift
- curse escalation

---

## Renderer Integration

## Required changes to renderer flow

Current render orchestration should be changed so that:
- geometry pass remains procedural
- authored room pass reads `RoomArtProfile`
- actor pass reads `ActorArtCatalog`
- prop/item pass reads `PropArtCatalog`

### Recommended render order
1. floor/base structure
2. walls and structural blocks
3. back-wall decor from `RoomArtProfile`
4. shadow overlays
5. world props
6. actors
7. foreground decor silhouettes
8. light overlays/glow accents
9. HUD

Compose’s drawing model supports layered custom rendering, which fits this pass-based strategy. [web:257][web:258]

---

## Migration Plan

### Step 1 — Introduce abstractions without changing visuals
Add the three interfaces/data classes and route the existing renderer through them with fallback implementations.

### Step 2 — Replace player rendering first
Swap current procedural player rendering for `ActorArtCatalog` assets.
This gives the highest immediate visual payoff.

### Step 3 — Replace collectibles
Move item visuals into `PropArtCatalog`.
This is the easiest way to improve readability fast.

### Step 4 — Add profiles to 3–5 key rooms
Introduce `RoomArtProfile` only in rooms where atmosphere matters most.

### Step 5 — Replace major set-pieces
Add authored throne, cauldron, altar, barred window, chain cluster.

### Step 6 — Expand coverage gradually
Do not try to author every prop in one pass.
Start with what the player sees most and what defines identity.

---

## Fallback Strategy

You do not need to remove every procedural visual immediately.
Provide fallback rules:
- if authored asset exists, use it
- otherwise use legacy procedural rendering

This allows incremental adoption without breaking the game.

Example:

```kotlin
val sprite = actorArtCatalog.resolveOrNull(spec)
if (sprite != null) {
    drawAuthoredSprite(sprite, projectedPosition)
} else {
    legacyActorRenderer.draw(actorState)
}
```

This is strongly recommended for safe migration.

---

## Performance Notes

- Cache resolved vector painters or path objects when possible.
- Avoid rebuilding complex vector data every frame.
- If a vector asset becomes too expensive, prerender to bitmap cache at the needed scale.
- Keep asset definitions lightweight and layered.
- Use palette roles to recolor layers instead of duplicating many nearly-identical assets.

Compose resource and painter loading APIs support vector-backed assets, but caching policy should be explicit in the rendering layer rather than hidden in game logic. [web:259][web:260][web:262]

---

## Review Checklist

A change implementing these classes is correct only if:
- `ActorArtCatalog` replaces visual invention with authored actor templates
- `PropArtCatalog` prevents recolor-only props and item sameness
- `RoomArtProfile` gives rooms focal staging and hierarchy
- renderer becomes an orchestrator instead of the source of visual design
- migration path allows fallback to legacy visuals while new authored assets are added

---

## Final Rule

Do not measure success by how much art code was moved.
Measure success by whether the game gains:
- memorable silhouettes
- stronger room identity
- clearer focal hierarchy
- more hand-authored atmosphere
- less procedural deadness

If the architecture changes but the visuals still look like generated geometry, the pipeline has not succeeded.
