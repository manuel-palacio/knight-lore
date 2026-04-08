# Claude Brief — Phase 2B: Authored Player Werewolf Form

**Session goal:** Add authored werewolf form to `DefaultActorArtCatalog`. 
**Do not touch human form, enemies, items, or rooms.**
**Phase 2A must be merged before this session starts.**

---

## Context files you must read before starting
- `docs/ART_DIRECTION.md`
- `docs/VISUAL_DO_NOTS.md`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/DefaultActorArtCatalog.kt`
- `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/art/AuthoredSprite.kt`
- `domain/src/commonMain/kotlin/com/palacesoft/knightlore/domain/model/PlayerState.kt`

---

## Domain model facts

Form enum value: `WEREWULF` (note spelling — from PlayerState.kt, do not rename)

---

## Silhouette specification for WEREWULF form

The werewolf must have completely different mass logic from the human.
It must NOT be a scaled, recolored, or slightly modified version of the human form.

### Required shape logic
- Overall mass: **wide, low, and forward-threatening** — not upright
- Shoulders: **much wider than human** — dominant feature, hunched upward
- Head: **wedge-shaped**, low between raised shoulders — not round, not human-proportioned
- Jaw: **prominent forward protrusion** — visible from side and diagonal views
- Forearms: **long**, reaching below knee level — disproportionately extended
- Hands: **clawed and enlarged** — silhouette termination points
- Torso: **barrel-shaped and low**, not rectangular
- Legs: **digitigrade implied** — weight on balls of feet, crouched power stance
- Total read: dangerous, barely contained, heavy

### What IDLE looks like
- Shoulders hunched, head slightly lowered
- Arms hanging forward and outward, not at sides
- Weight low and distributed — coiled but still

### What WALKING framePhase 0 looks like
- Right foreleg forward, body rotated slightly
- Left arm countersweep back
- Head low and tracking forward

### What WALKING framePhase 1 looks like
- Mirror of framePhase 0

### Silhouette test — MANDATORY before colorizing
Render as pure black fill on white background.
Ask: does this read as something threatening and inhuman at 32×48 pixels?
Ask: is it immediately different from the human form by outline alone?
If no to either: redesign before colorizing.

### Color palette (only after silhouette passes)
- Fur body: dark desaturated brown `0xFF_1E1510.toInt()`
- Fur shadow: near-black `0xFF_100B07.toInt()`
- Fur highlight: warm dark `0xFF_2E2018.toInt()`
- Eye accent: amber point `0xFF_CC7700.toInt()`
- Claw tips: dirty ivory `0xFF_C8B89A.toInt()`

---

## Implementation

Add `WEREWULF` cases to `DefaultActorArtCatalog.resolvePlayer()`.
Return null for unimplemented combinations (fallback).

Implement for SW and SE facing first (most visible in isometric view).
Implement IDLE and WALKING (framePhase 0 and 1) minimum.

---

## Hard constraints

- Do not modify human form paths
- Do not change physics or game logic
- Art data stays in `DefaultActorArtCatalog.kt`
- No junk files in commit
- Commit message: `feat(render): Phase 2B authored player werewolf silhouette`

---

## Done criteria

- [ ] Werewolf renders using authored paths for IDLE and WALKING
- [ ] Werewolf silhouette is unambiguously different from human by outline alone
- [ ] Human form still works correctly
- [ ] Unimplemented states fall back silently
- [ ] No art data in RoomEntityFactory.kt
