# 2D Filmation Renderer — Design Spec

**Date:** 2026-06-20
**Status:** Draft — awaiting user review
**Goal:** Pivot the Knight Lore remake from a Three.js 3D renderer to a faithful 2D
isometric "Filmation" renderer (Canvas 2D), reusing the entire existing simulation.

---

## 1. Context

Knight Lore (1984) was not 3D. It used the **Filmation engine**: flat monochrome
isometric sprites — blocks, character, doorways — drawn back-to-front with a
painter's algorithm plus a masking trick so the character correctly passes behind
and in front of blocks. The "3D" is an illusion from consistent iso projection +
depth sorting.

The current remake builds the world in real 3D and films it with an ortho camera,
then runs a mono-tint post-process to fake the ZX look. Most of the reported bugs
(body cut-off, black-on-black, painful sprite extraction, wireframe blocks, doors
looking wrong) are friction from **3D pretending to be 2D**. Building a true 2D
Filmation renderer ends that friction.

## 2. Decisions (settled with the user)

- **Clone meaning:** keep the game already built (cure quest, 40 days, lives, the
  5 rooms) but render it in faithful 2D Filmation style. Only the renderer + assets
  change.
- **World geometry:** drawn **procedurally** as monochrome iso cubes (no ripped
  block sprites).
- **Character + items:** authentic ripped ZX sprites (pixel-perfect), where pixel
  detail matters most.
- **Tech:** Canvas 2D. Three.js removed entirely.
- **Integration:** Approach A — build a new `IsoRenderer` that reads the existing
  simulation each frame; strip 3D mesh creation from the room-builder helpers.

## 3. What stays vs. what's replaced

**Stays (zero or minimal change — all 111 sim tests keep passing):**
`GameState`, `Grid`, `Collision` (`resolveHorizontal`), `Player`, `PushBlock`,
`StaticBlock`, `Pickup`, `Cauldron`, `SpikeGrid`, `GhostEnemy`/`PatrolEnemy`,
`RoomManager` + room graph/exits/spawns, `Input`, `GameLoop` (fixed timestep),
the cure quest, the HUD's data. `CharacterAnimator`'s direction/facing math is
reused to pick sprite frames.

**Replaced / removed:**
Three.js `Renderer`, `EffectComposer`, `UnrealBloomPass`, `MonoTintShader`,
lighting, HDR, `PixelSprite` (billboard), `CharacterVisual` rigs (`KnightRig`,
`WerewolfRig`), and all 3D mesh creation inside `shell.ts` / room builders /
`Structure.ts`. The new renderer is smaller than what it replaces.

## 4. Renderer design

### 4.1 `IsoProjection` (pure math, unit-tested)
World (continuous, 2-unit tiles) → screen:
- `sx = originX + (wx − wz) · (TILE_W / 2)`
- `sy = originY + (wx + wz) · (TILE_H / 2) − wy · HEIGHT_SCALE`

Depth key for painter's sort ≈ `wx + wz + wy`. Round-trip (world↔screen) and
ordering are testable without a canvas.

### 4.2 `IsoRenderer` (Canvas 2D)
Owns the canvas + 2D context. Per frame:
1. Clear to black.
2. Build a draw list: floor tiles, solid grid cells (as cubes sized by
   `supportHeight`), dynamic entities (player, push-blocks, pickups, cauldron,
   spikes, enemies, doors).
3. Sort back-to-front by the iso depth key.
4. Paint each: procedural iso cubes for architecture; sprites for character/items.
5. Render everything in the active `room.tint` hue on black (ZX one-attribute
   look). Integer-scale the canvas for crisp pixels.

Uses simulation positions (with the existing `renderPosition` lerp for smoothing).

### 4.3 Procedural iso blocks
A solid cell draws as a stacked iso cube: diamond **top** + **left/right** side
faces with brick-hatch lines, in three brightness steps of the room hue (top
brightest → sides darker). Floor = pure-black void (kept).

### 4.4 Sprites (`Sprite2D`, `CharacterSprites`)
`Sprite2D` blits a frame from a monochrome ZX sheet, tinted bright.
`CharacterSprites` selects the frame from **form × facing-direction × walk-phase**.
This is where true 4-direction facing lives — the sim already computes movement
direction (`atan2(moveX, moveZ)` in `CharacterAnimator`). Items/cauldron use ripped
sprites.

### 4.5 Occlusion (Filmation masking)
Painter's algorithm: sort the per-frame draw list back-to-front by iso depth, then
paint. For axis-aligned grid blocks + a single actor this resolves
character-behind/in-front-of correctly. If artifacts appear when the actor straddles
two cells, split the actor's footprint per cell (standard Filmation refinement).
Start simple; refine only if needed.

### 4.6 Per-room color
Reuse `room.tint`; everything renders in that single hue on black.

## 5. Milestones

- **M1 — vertical slice:** room-002 in 2D iso — black floor, procedural blocks
  (platform + push-block), character walking in 4 directions + jump, correct depth
  occlusion, room tint, scroll HUD. Proves the pipeline end-to-end.
- **M2 — content:** port the other 4 rooms (reuse existing grid/exit data),
  brick-arch doors as iso art, wolf form + transform animation, items / cauldron /
  spikes / enemies, scroll HUD redesign (3.png/5.png style).
- **M3 — cleanup:** remove Three.js + dead 3D code; polish.

## 6. Testing

- `IsoProjection`: unit tests (round-trip, depth ordering).
- Simulation: existing tests unchanged, stay green.
- Visual: Playwright canvas screenshots per room.

## 7. Assets / risks

The one real dependency is the authentic Sabreman/Sabrewulf sprite set (4 directions
× walk frames + wolf + transform). Sourcing these is the critical path; line them up
early. Procedural blocks need no assets. The renderer itself is low-risk (a few
hundred lines of Canvas 2D).

## 8. Out of scope

Full reproduction of the original game's map/monsters; new gameplay mechanics;
audio. This pivot changes the renderer and assets only — the game design is
unchanged.
