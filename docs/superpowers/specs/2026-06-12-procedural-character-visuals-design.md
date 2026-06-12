# Procedural Character Visuals — Design

**Date:** 2026-06-12
**Status:** Approved
**Replaces:** Task 31, Task 34, and the character portion of Task 33 from the 2026-05-01 plan (Tripo/Mixamo GLB pipeline — abandoned for characters in favor of procedural rigs). Prop assets (Task 32 / rest of 33) are unaffected.

## Goal

Replace the placeholder player capsule with procedurally built knight and werewolf
characters, including walk/jump/idle animation and the Knight Lore transformation
sequence. Everything is authored in code (Three.js geometry + code-driven poses) —
no external asset pipeline.

All visual decisions are subordinate to `docs/ART_DIRECTION.md` and
`docs/VISUAL_DO_NOTS.md`. Where this spec and those docs conflict, the art docs win.

## Approach

Hierarchical puppet rig: each character is a `THREE.Group` tree of authored meshes
parented in a joint hierarchy, animated by code-driven pose interpolation on the
group nodes. Chosen over `SkinnedMesh` (procedural skin weights are painful and
smooth deformation fights the chunky style) and shader-only animation (cannot
deliver the required walk-cycle shape change).

## Architecture

New directory `src/game/characters/`:

| File | Responsibility |
|---|---|
| `KnightRig.ts` | Builds the knight `THREE.Group`: authored geometry (lathe/extrude/custom profiles, not plain primitive boxes) in a joint hierarchy (pelvis → torso → head/arms/legs). Exposes named joints. |
| `WerewolfRig.ts` | Same contract, entirely separate body construction — no shared geometry or proportions with the knight. |
| `CharacterAnimator.ts` | Pure pose logic: `pose(state, time, phase, facing) → {jointName: Euler}`. No scene-graph dependencies; fully unit-testable. |
| `CharacterVisual.ts` | Owns both rigs, the animator, and the transform flash sequence. Its `group` is assigned as `player.object3D`. |

### Integration

- `src/scenes/TheHall.ts` replaces the capsule mesh (currently line ~152) with
  `CharacterVisual.group`.
- Per-frame, the scene feeds `CharacterVisual` data that already exists:
  `player.state` (`grounded`/`jumping`/`airborne`), the movement direction, and
  `GameState.form`.
- `GameState.onTransformed` (existing callback) triggers the transform sequence.
- `Player.ts` gameplay logic is untouched. Existing `onJumped`/`onLanded`
  callbacks drive jump/land poses.

## Character silhouettes

### Knight (human form)

Cursed, weary pilgrim-adventurer. Mapping to `ART_DIRECTION.md` required qualities:

- **Oversized headgear:** wide-brimmed pilgrim hat, brim drooping lower on one
  side (LatheGeometry with displaced rim vertices, then tilted).
- **Stooped posture:** torso joint baked at ~12° forward lean; head juts forward
  from the shoulders.
- **Heavy upper body:** thick travel-cloak mass (lathe profile, wide shoulders,
  ragged hem) over thin legs.
- **Distinctive lower silhouette:** irregular zigzag cloak hem; chunky boots.
- **Asymmetric detail:** satchel on the left hip + the one-sided hat tilt.
- **Burden:** one shoulder higher; idle pose sags.

### Werewolf

Different mass distribution — not a recolor:

- **Hunched silhouette:** dominant shoulder hump; spine is a forward-tipped arc
  (~35° body axis) giving diagonal energy.
- **Long forearms:** arms reach nearly to the ground, oversized claw-block hands.
- **Snout wedge:** low, forward-thrusting head wedge with back-swept ears.
- **Digitigrade legs + tail:** bent-back haunches, short tail completing the arc.

### Materials

`makeToonMaterial` from `src/game/Materials.ts` (cel-shaded, shadow step lifted so
heroes stay readable in the dim dungeon — already tuned for exactly this use), in
muted desaturated tones. Only torches glow under bloom.

### Acceptance test (silhouette-first)

Filled with solid black, the two forms must be instantly distinguishable, and the
knight must not read as a generic upright hero. One-glance identifiers: hat brim
(knight), shoulder hump (werewolf).

## Animation

`CharacterAnimator` derives state from existing gameplay signals — no new state in
gameplay code.

- **Idle:** breathing sway + weight shift; knight sag deepens over time; werewolf
  restless twitch.
- **Walk:** phase accumulator (`phase += speed * dt`) drives limb swing plus torso
  roll and vertical bob (shape change, not just leg alternation). Werewolf lopes —
  lower, longer, stronger forward lunge.
- **Jump:** anticipation squash on `onJumped`, stretch at apex.
- **Land:** heavy squash on `onLanded`, ~0.2 s recovery.
- **Facing:** rig yaw lerps toward the 8-direction movement vector.

## Transform sequence (~0.9 s)

Triggered by `GameState.onTransformed`:

1. Existing `ParticleBurst` fires at the character position.
2. Visibility flashes alternate between the two rigs at increasing frequency
   (slow flicker → strobe). No smooth crossfade.
3. Each flash applies a small random asymmetric scale/tilt jitter — uncanny and
   asymmetrical per the motion rules.
4. Ends locked on the new form. Player keeps control throughout (as in the
   original game).
5. If re-triggered mid-sequence (timer flips again), the running sequence restarts
   toward the new target form.

## Testing

Vitest, following the existing `tests/game/` pattern:

- `tests/game/CharacterAnimator.test.ts` — state derivation from player state;
  walk phase advances with speed and is periodic; jump/land squash timing; facing
  converges to the movement direction.
- `tests/game/TransformSequence.test.ts` — total duration; flash frequency
  increases over time; ends on the correct form; mid-sequence re-trigger restarts
  cleanly.
- Rig smoke test — both rigs construct, expose the expected joint names, and share
  no geometry/material instances.

Visual verification: dev server screenshots of both forms and the transform,
reviewed against `ART_DIRECTION.md` and `VISUAL_DO_NOTS.md`.

## Out of scope

- Enemy visuals (guard/ghost/druid rigs) — same technique, future work item.
- Sound effects for the transformation.
- Any change to gameplay logic, collision extents, or room content.

## Error handling

None required — all code is local, deterministic visual code with no I/O.
