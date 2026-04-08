# Claude Brief — Phase 2A: Authored Player Human Form

**Session goal:** Replace the procedural player human rendering with a single authored silhouette.
**One PR only. Do not touch werewolf, enemies, items, or rooms in this session.**

---

## Context files you must read before starting
- `docs/ART_DIRECTION.md`
- `docs/VISUAL_DO_NOTS.md`
- `docs/AUTHORED_ASSET_PIPELINE.md`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/DrawCommand.kt`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt`
- `domain/src/commonMain/kotlin/com/palacesoft/knightlore/domain/model/PlayerState.kt`

---

## Domain model facts you must use exactly as-is

From `PlayerState.kt`:
- Form enum: `HUMAN`, `WEREWULF`
- MovementState enum: `IDLE`, `WALKING`, `JUMP_ASCENT`, `JUMP_DESCENT`, `LANDING`, `TRANSFORMING`
- Facing: `Direction8` — NW, N, NE, E, SE, S, SW, W
- The player also has `airborne: Boolean` and `damageCooldownTicks`

Do not invent new enums. Map your ActorMotion spec to these existing domain types.

---

## Files to create

### `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/AuthoredSprite.kt`
Define the shared sprite model:
```kotlin
data class AuthoredSprite(
    val id: String,
    val layers: List<SpriteLayer>,
    val anchorOffsetY: Float = 0f,
)

data class SpriteLayer(
    val points: List<Vec2f>,      // screen-space polygon points, relative to anchor
    val fillColor: Int,           // ARGB packed int
    val strokeColor: Int? = null,
    val zOffset: Float = 0f,
)
```

### `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/ActorArtCatalog.kt`
```kotlin
interface ActorArtCatalog {
    fun resolvePlayer(form: Form, motion: MovementState, facing: Direction8, framePhase: Int): AuthoredSprite?
}
```
Returns null = fallback to legacy renderer.

### `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/DefaultActorArtCatalog.kt`
Implement `ActorArtCatalog`.
- Implement `HUMAN + IDLE` and `HUMAN + WALKING` (framePhase 0 and 1) for SW and SE facing first
- All other combinations return null (fallback) until authored
- All path data lives here, NOT in RoomEntityFactory

### `DrawCommand.kt` — add one new payload type
```kotlin
data class AuthoredSprite(
    val sprite: com.palacesoft.knightlore.render.art.AuthoredSprite,
) : DrawPayload
```

---

## Silhouette specification for HUMAN form

Design goal: the player must read as a distinct burdened medieval human character at ~32×48px.

### Required shape logic
- Overall posture: **hunched forward ~20°** — not upright, not neutral
- Head: **small, low** — not a round balloon
- Hat: **dominant** — hat brim width ~1.5× shoulder width; hat crown tall and slightly forward-tilted
- Shoulders: **narrow and dropped**, not square or heroic
- Arms: **hang below hip level**, slightly bent forward — carrying weight posture
- Legs: **short and thick** relative to torso — planted, not athletic
- Total height: approximately **2.5× hat width** — compact and ground-hugging

### What IDLE looks like
- Feet planted
- Slight lean, arms low
- Hat slightly forward of center of mass

### What WALKING framePhase 0 looks like
- Weight shifted to right foot
- Left arm forward, right arm back
- Slight forward lean increase

### What WALKING framePhase 1 looks like
- Mirror of framePhase 0
- Weight shifted to left foot

### Silhouette test — MANDATORY before colorizing
Render the shape as pure black fill on white background.
Ask: does this read as a burdened medieval figure with a dominant hat at 32×48 pixels?
If no: redesign shape before adding any color.

### Color palette (only after silhouette passes)
- Hat: very dark brown `0xFF_1A0F00.toInt()`
- Cloak: dark warm grey `0xFF_2A2420.toInt()`
- Legs: slightly lighter warm grey `0xFF_3D3530.toInt()`
- Hat highlight: `0xFF_2E1E08.toInt()`
- Shadow underside: `0xFF_120A00.toInt()`
- Outline/edge: near-black `0xFF_0D0A08.toInt()`

---

## Wiring into RoomEntityFactory

Find the existing method that builds player draw commands (search for `Form.HUMAN` or `buildPlayer` or the player entity section).

Change it to:
```kotlin
val authoredSprite = actorArtCatalog.resolvePlayer(
    form = playerState.form,
    motion = playerState.movementState,
    facing = playerState.facing,
    framePhase = animFramePhase,
)
if (authoredSprite != null) {
    commands += DrawCommand(
        layer = DrawLayer.PLAYER,
        depthKey = projector.depthKey(playerState.position),
        entityId = "player",
        screenPos = projector.project(playerState.position),
        payload = DrawPayload.AuthoredSprite(authoredSprite),
    )
} else {
    // legacy player rendering — keep existing code here unchanged
}
```

`DefaultActorArtCatalog` must be injected into `RoomEntityFactory` as a constructor parameter.

---

## CanvasSceneRenderer — handle new payload

Find `CanvasSceneRenderer` (or equivalent renderer that executes `DrawCommand` list).
Add a branch for `DrawPayload.AuthoredSprite`:
```kotlin
is DrawPayload.AuthoredSprite -> {
    sprite.layers.forEach { layer ->
        drawPath(layer.points, layer.fillColor, layer.strokeColor)
    }
}
```

---

## Hard constraints

- Art path data must NOT be added to `RoomEntityFactory.kt`
- Do not change any physics, collision, or game logic
- Do not touch werewolf, enemy, or item rendering
- Do not improve or refactor legacy rendering as a side effect
- Commit must not include `.DS_Store` or `.kotlin/` files
- Commit message: `feat(render): Phase 2A authored player human silhouette`

---

## Done criteria

- [ ] Game runs without crash
- [ ] Player renders using authored paths for IDLE and WALKING in all facings that are implemented
- [ ] Unimplemented facings/states fall back to legacy renderer silently
- [ ] Silhouette reads as a burdened medieval human figure with dominant hat at game scale
- [ ] No art data in RoomEntityFactory.kt
- [ ] No junk files in commit
