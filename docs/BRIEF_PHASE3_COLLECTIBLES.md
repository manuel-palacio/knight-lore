# Claude Brief — Phase 3: Authored Collectible Silhouettes

**Session goal:** Replace oval/circle item rendering with authored silhouettes for KEY, GOBLET, and SKULL.
**Do not touch player, enemies, or rooms.**
**Phase 2A must be merged before this session starts.**

---

## Context files you must read before starting
- `docs/ART_DIRECTION.md`
- `docs/VISUAL_DO_NOTS.md`
- `docs/AUTHORED_ASSET_PIPELINE.md`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/DrawCommand.kt`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt`
- `domain/src/commonMain/kotlin/com/palacesoft/knightlore/domain/model/ItemState.kt`

---

## Domain model facts

From `ItemState.kt`, the ItemType enum values are:
`CRYSTAL_BALL, GOBLET, WINE_BOTTLE, GEM, POISON_VIAL, BOOT, TEACUP, KEY, TORCH, SKULL, CAULDRON_INGREDIENT, ORNAMENT`

Implement authored art for: **KEY, GOBLET, SKULL** only this session.
Return null for all other ItemType values (fallback to legacy rendering).

---

## Files to create

### `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/PropArtCatalog.kt`
```kotlin
interface PropArtCatalog {
    fun resolveItem(type: ItemType): AuthoredSprite?
}
```

### `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/DefaultPropArtCatalog.kt`
Implement `PropArtCatalog`.
All path data lives here, NOT in RoomEntityFactory.

---

## Silhouette specifications

Each item must pass a monochrome silhouette test before colorizing.
At game scale (~16×20px for floor items), the outline alone must identify the object.

### KEY
- Bow (top loop): **round and dominant** — large relative to shaft
- Shaft: **straight and long** — at least 2× bow diameter
- Teeth: **2–3 rectangular notches** at shaft end — visible even at small scale
- Orientation: isometric-friendly diagonal, bow upper-left
- Must not read as a stick or rod without the bow and teeth visible

### GOBLET
- Base: **wide, flat foot** — distinct from body
- Stem: **narrow neck** between base and cup — visible pinch
- Cup: **flared outward** at top — wider than stem, not a cylinder
- Total silhouette: recognizable as a drinking vessel, not a vase or pot
- Must not share geometry logic with cauldron, pot, or vial

### SKULL
- Cranium: **large dome**, upper half dominant
- Jaw: **square lower third** — distinct from cranium
- Eye sockets: **two dark voids** — can be negative space or filled dark
- Read at tiny scale: dome + jaw is enough — eye sockets are bonus clarity
- Must not read as a ball, rock, or helmet

---

## Color palettes (only after silhouette passes)

### KEY
- Metal body: `0xFF_8C7A4A.toInt()`
- Metal shadow: `0xFF_4A3E24.toInt()`
- Metal highlight: `0xFF_C4AA6A.toInt()`

### GOBLET
- Cup body: `0xFF_8C6A2A.toInt()`
- Interior shadow: `0xFF_3A2A0E.toInt()`
- Rim highlight: `0xFF_D4A84A.toInt()`
- Base: `0xFF_6A5020.toInt()`

### SKULL
- Bone: `0xFF_C8C0A0.toInt()`
- Shadow: `0xFF_706850.toInt()`
- Eye void: `0xFF_181410.toInt()`
- Jaw: `0xFF_B4AC8C.toInt()`

---

## Wiring into RoomEntityFactory

Find the method that renders floor items (search for `ItemType`, `ColorOval`, or the item rendering section).

Change it to:
```kotlin
val authoredSprite = propArtCatalog.resolveItem(item.type)
if (authoredSprite != null) {
    commands += DrawCommand(
        layer = DrawLayer.ITEM,
        depthKey = projector.depthKey(item.position),
        entityId = item.id.value,
        screenPos = projector.project(item.position),
        payload = DrawPayload.AuthoredSprite(authoredSprite),
    )
} else {
    // legacy item oval rendering — keep unchanged
}
```

`DefaultPropArtCatalog` must be injected into `RoomEntityFactory` as a constructor parameter.

---

## Hard constraints

- Only implement KEY, GOBLET, SKULL — return null for everything else
- Art data must NOT be in RoomEntityFactory.kt
- Do not change player, enemy, or room rendering
- Do not change physics or game logic
- No junk files in commit
- Commit message: `feat(render): Phase 3 authored collectible silhouettes key/goblet/skull`

---

## Done criteria

- [ ] KEY, GOBLET, SKULL render using authored paths
- [ ] Each item is identifiable by silhouette alone at game scale
- [ ] No two items share the same geometric template
- [ ] All other item types fall back to legacy rendering silently
- [ ] No art data in RoomEntityFactory.kt
- [ ] Game runs without crash
