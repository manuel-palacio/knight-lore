# Knight Lore — Isometric Implementation Specification

## Purpose
This document defines the production-level implementation rules for isometric graphics, room rendering, depth ordering, occlusion, and transformation-related scene behavior in a modern Android remake of **Knight Lore**. The goal is to remove ambiguity left by the higher-level architecture and art direction documents so Claude Code can implement a stable, testable, and visually consistent isometric engine.[web:18][web:43][web:45]

The specification also covers the day-night cycle and Sabreman's human-to-werewulf transformation because those systems directly affect rendering, control lock, vulnerability windows, and room readability in the original game.[web:18][web:21][web:16]

## Source behaviors to preserve
The original game is built around three visual/gameplay facts that must remain visible in the remake:
- Sabreman transforms into a werewolf at nightfall and back to human at sunrise, with an onscreen timer showing the day-night cycle.[web:18][web:27]
- The transformation sequence temporarily removes control and leaves the player vulnerable.[web:21]
- Knight Lore's Filmation presentation depends on convincing isometric depth and sprite overlap ordering within single-screen rooms.[web:43][web:45]

## Scope
This specification covers:
- coordinate spaces,
- projection math,
- tile and block metrics,
- draw ordering,
- occlusion,
- shadows,
- animation anchors,
- item carrying and stacking,
- room transitions,
- day-night visual presentation,
- transformation rendering,
- required debug overlays.

It does **not** define the full puzzle catalog or full cure progression design; those belong in the puzzle and cure design document.

## Scene model
Treat each room as a self-contained isometric stage with a fixed camera and deterministic draw pipeline. The camera must not rotate in the initial production version because the original experience relies on players learning room geometry from a stable viewpoint.[web:18][web:45]

### Visual composition layers
Each room should render in this conceptual order:
1. Background void or wall backdrop.
2. Static room geometry.
3. Dynamic blocks and moving geometry.
4. Floor-level props and pickups.
5. Characters and enemies.
6. Overlay effects, for example transformation aura or cauldron pulse.
7. HUD and debug overlays.

## Coordinate spaces
Use four coordinate spaces and never mix their responsibilities.

### 1. Grid space
Discrete room design coordinates.
- Used by room authoring.
- Integer tile positions.
- Best for exits, blocks, spawn points, and logical placement.

### 2. World space
Continuous gameplay coordinates.
- Used by movement, jumping, collision, and simulation.
- Floating point positions allowed.
- Player and moving objects live here.

### 3. Screen space
2D pixel output coordinates.
- Used only by renderer.
- Derived from world space by projection.

### 4. Atlas space
Sprite source coordinates.
- Used only for art metadata and atlas lookup.

## Base metrics
Use one global grid for all rooms and actors.

### Recommended metrics
- Tile width: 64 px.
- Tile height: 32 px.
- Standard block height: 32 px.
- Half tile width: 32 px.
- Half tile height: 16 px.
- Standard room block footprint: 1x1 tile.
- Standard actor footprint: 0.8x0.8 tile.
- Standard pickup footprint: 0.45x0.45 tile.

These numbers should be constants in one place only.

## Projection rules
Use the standard 2:1 isometric projection.

### Projection formula
For a world position `(x, y, z)`:

```kotlin
screenX = (x - y) * HALF_TILE_WIDTH
screenY = (x + y) * HALF_TILE_HEIGHT - z * BLOCK_HEIGHT
```

Where:
- `HALF_TILE_WIDTH = 32f`
- `HALF_TILE_HEIGHT = 16f`
- `BLOCK_HEIGHT = 32f`

### Projection policy
- All gameplay simulation remains in world space.
- All draw sorting uses world-space-derived keys.
- No gameplay logic should depend on screen pixels.

## Origin and room placement
Define a room-local origin at the back-left floor corner of the room in world space. All room blocks, exits, hazards, and item anchors should be authored relative to this origin.

### Room convention
- Positive `x` moves visually down-right.
- Positive `y` moves visually down-left.
- Positive `z` moves upward.

Keep this convention in every tool, test, renderer, and metadata file.

## Tile and block rules
Every block asset must separate three visible faces consistently:
- top face,
- left side face,
- right side face.

### Geometry categories
Support these base block types:
- floor tile,
- full block,
- half-height block,
- tall block,
- moving block,
- falling block,
- pillar,
- exit frame,
- special platform.

### Collision rules
- Only the top face is standable unless explicitly marked otherwise.
- Side faces are solid blockers.
- Decorative geometry must not extend beyond collision without explicit metadata.

## Draw ordering
Knight Lore depends on stable overlap ordering.[web:43][web:45] Implement draw order as a first-class system, not an ad hoc sort.

### Sort key strategy
Every renderable must expose:
- base room layer,
- sort-foot world position,
- optional priority override,
- sprite height.

### Default depth key
Use the actor or object's **foot point** as the primary depth source:

```kotlin
depth = floor((x + y + z) * 1000)
```

Then sort by:
1. room layer,
2. depth key,
3. priority override,
4. stable entity id.

### Why feet matter
A sprite's head can extend above nearby blocks, but its relationship to the floor determines whether it is in front of or behind most geometry. Using the feet anchor produces more intuitive overlap than sorting by sprite top or center.[web:43]

## Sort-foot rules by asset type
- **Player/enemy**: center between feet.
- **Pickup on floor**: center of contact patch.
- **Carried item**: inherit player sort-foot with positive local vertical offset.
- **Block**: back-bottom origin or standardized tile origin.
- **Floating effect**: use parent entity foot point unless intentionally above all actors.
- **Cauldron**: fixed room object with its own footprint and height metadata.

## Occlusion model
The original game's masking illusion is essential to its feel.[web:45] The remake should emulate that with stable draw order and selective partial occlusion rather than full transparency tricks.

### Occlusion rules
- When a character's sort foot is behind a solid block footprint, the block should render in front.
- When a character stands on top of a block, the character should render above that top surface.
- Decorative foreground props may partially cover a character only if gameplay readability remains intact.
- Never fully hide the player for more than a brief transition moment.

### Player visibility assist
If the player becomes too occluded behind large geometry:
- fade the obstructing decorative layer slightly, or
- show a subtle silhouette rim on the player,
- but do **not** fade core collision blocks unless accessibility mode is enabled.

## Screen culling and room bounds
Rooms are single-screen and should not scroll in the first version.[web:18] That simplifies culling.

Rules:
- Render only the current room.
- Allow effects and transition overlays to exceed room bounds visually.
- No camera panning during normal play.
- Optional micro-camera easing of 2–4 px may be used only if it never changes gameplay readability.

## Animation anchors
Every animation frame must preserve a stable feet anchor. The renderer should use anchor metadata instead of assuming the bottom center of the frame.

### Animation alignment rules
- Idle, walk, jump, carry, and transformation frames all share the same logical feet anchor.
- Airborne frames may visually move upward, but the anchor remains at the simulated world position.
- If an animation needs temporary visual displacement, use a render offset separate from collision state.

## Character layering
Player and enemies should render as layered sprite assemblies only if necessary. The first production version should prefer single-sheet sprites for simplicity.

If layered assembly is later needed, use this order:
1. shadow,
2. lower body,
3. carried item behind body if applicable,
4. torso/body,
5. carried item in front if applicable,
6. effect overlay.

## Carried items and stack behavior
Knight Lore's object puzzles require items to exist as physical things in the world.[web:18][web:16]

### Carry rules for rendering
- Carried items are attached to a named hand or chest anchor on the character sprite.
- Carried items render with the player, not as world-floor objects.
- Carried items must still preserve their own identity and visual read.

### Dropped item rules
- When dropped, an item snaps to the nearest valid standable placement anchor.
- Dropped items get a floor contact shadow.
- Dropped items can stack only on surfaces explicitly marked as stackable.

### Stack rendering
For stacked items or item-on-block situations:
- compute the item's world `z` from the supporting surface,
- use standard projection and depth sort,
- keep support relationships in simulation state for stable rendering.

## Shadows
Shadows are critical for depth readability in a modernized art style.

### Shadow types
- **Contact shadow**: directly under actors, pickups, and blocks.
- **Projected shadow**: optional for tall actors or strong light moments.
- **Ambient occlusion patch**: subtle darkening where blocks meet floor.

### Shadow rules
- Contact shadow always follows world position on the nearest support surface.
- Airborne jump shadow stays on landing surface below.
- Transformation effect may briefly distort or darken the shadow.
- Shadows must never obscure hazard timing cues.

## Room transitions
Room changes should remain discrete and fast, consistent with the original room-by-room structure.[web:18]

### Transition flow
1. Player crosses a valid exit trigger.
2. Simulation locks directional input briefly.
3. Current room state snapshot is preserved.
4. Target room loads.
5. Player appears at target spawn with a short transition or wipe.

### Visual rule
Do not use cinematic camera moves. Use a short directional wipe, blink, or magical flash under 200 ms.

## Day-night meter
The original includes an onscreen timer showing the progression of day into night and back again.[web:18]

### Implementation requirements
- Always visible during gameplay.
- Must show current phase: day, dusk, night, dawn.
- Should communicate time-to-transformation clearly.
- Must remain readable on small mobile screens.

### Recommended design
- Horizontal or circular bar with sun/moon icon.
- Distinct phase colors, but restrained and theme-consistent.
- Final 15–20% before transformation should pulse subtly.

### Timing data model
The renderer reads from domain `TimeState`:
- current day number,
- current phase,
- normalized phase progress,
- ticks until transformation if applicable.

## Transformation specification
Transformation is both a gameplay event and a major rendering event.[web:21][web:16]

### Behavioral requirements
- Trigger at nightfall, reverse at sunrise.[web:18]
- During transformation, control is partially or fully removed.[web:21]
- Player remains vulnerable during the sequence.[web:21]
- The player may ignore some normal movement assumptions during the sequence only if that behavior is intentionally replicated.[web:21]

### Render states
Use explicit transformation states:
- `NONE`
- `STARTING_TO_WEREWULF`
- `WEREWULF`
- `STARTING_TO_HUMAN`
- `RECOVERY`

### Visual sequence
A recommended modernized sequence:
1. world clock warning pulse,
2. brief flicker on player outline,
3. control lock,
4. body distortion frames,
5. aura or curse smoke,
6. silhouette swap midpoint,
7. werewulf or human final pose,
8. recovery frame and control return.

### Rendering rules during transformation
- Anchor remains fixed to world position unless the original-like float behavior is deliberately modeled.[web:21]
- Collision and vulnerability state come from simulation, not animation.
- Effects must not hide hazards or exits completely.
- Transformation must be visually obvious even in monochrome-led rooms.

## Form-dependent visual differences
Human and werewulf form should differ in more than sprite appearance.[web:16][web:18]

### Human visual cues
- tighter posture,
- more controlled idle,
- smaller stride,
- cleaner carry animation.

### Werewulf visual cues
- stronger forward lean,
- longer stride,
- more aggressive jump anticipation,
- brighter eye or claw contrast if needed.

### Environment feedback
Optional but recommended:
- some enemies react visually to werewulf form,
- cauldron room light or hostility cues intensify when entered incorrectly in werewulf form.[web:16][web:34]

## Cauldron room rendering
The cauldron room is a progression hub and must be staged differently from ordinary rooms.[web:34][web:19]

Requirements:
- cauldron is visible focal object,
- requested item indicator appears clearly when player is human,[web:34]
- rejection or attack state is visibly distinct when player enters as werewulf if that rule is used,[web:16][web:34]
- room contrast favors gameplay clarity over decoration.

## Debug visualization requirements
The engine must include debug overlays for isometric correctness.

### Required overlays
- tile grid,
- collision volumes,
- standable surfaces,
- sort-foot anchors,
- depth key labels,
- support surface markers,
- exit triggers,
- item snap anchors,
- day-night state panel,
- transformation state panel.

These tools are mandatory for tuning rooms and solving occlusion bugs.

## Runtime data contract for renderer
Each renderable entity should expose a compact metadata model.

```kotlin
data class RenderEntity(
    val id: String,
    val spriteId: String,
    val worldPosition: Vec3f,
    val anchorPx: Vec2f,
    val footprint: Vec2f,
    val heightUnits: Float,
    val layer: Int,
    val priority: Int,
    val renderOffset: Vec2f = Vec2f.ZERO,
)
```

## Testing checklist
Automated or semi-automated tests should verify:
- projection math for known coordinates,
- depth sort for overlapping entities,
- block-top rendering vs behind-block rendering,
- item carry/drop anchor correctness,
- airborne shadow placement,
- room transition spawn placement,
- transformation control lock timing,
- transformation visual state transitions,
- day-night meter updates.[web:18][web:21][web:43]

## Definition of done
The isometric implementation is production-ready when:
- no recurring draw-order bugs appear in common room setups,
- player position is always readable,
- items and hazards sit correctly on surfaces,
- transitions between rooms are stable,
- day-night progression is clearly communicated,
- transformation is visually obvious and mechanically synchronized,
- debug overlays can explain every visible overlap decision.[web:18][web:45]
