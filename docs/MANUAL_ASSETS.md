# Manual Asset Workflow — Phase 6 & 7

This doc covers Tasks 29–38 of `docs/superpowers/plans/2026-05-01-knight-lore-web-3d.md` — the parts that need a human (asset generation, browser playtest, compliance review). Tasks 2–28 (rewrite, engine, scene assembly with placeholder geometry) are already merged on `main`.

**Current state of `main`:** the dev server runs and renders The Hall with placeholder capsules and boxes. The `pnpm build` step will warn if asset files are missing, but the app degrades gracefully (HDR is wrapped in `try/catch`; missing JPGs fail at texture load and three.js logs to the console). Expect a black-textured floor/walls until Task 30 assets are dropped in.

---

## Status by task

| # | Task | Who | State |
|---|---|---|---|
| 29 | Style anchor doc | claude-doable | **DONE in this doc** (see § Style Anchor) |
| 30 | Poly Haven textures + HDRI | **user** | pending |
| 31 | Tripo + Mixamo characters (knight, werewolf) | **user** | pending |
| 32 | Tripo props (push_block, goblet, door, chained_cauldron) | **user** | pending |
| 33 | Replace placeholder meshes with GLBs | claude-doable (after 31, 32) | pending |
| 34 | Werewolf mesh swap on transformation | claude-doable (after 31) | pending |
| 35 | Particle burst on transformation | claude-doable (no asset dep) | pending |
| 36 | Debug overlay (D key, color-coded boxes) | claude-doable (no asset dep) | pending |
| 37 | End-to-end playthrough | **user** | pending |
| 38 | Doc compliance review | **user** | pending |

When you've finished a "user" task, ping Claude and the next "claude-doable" task can be picked up automatically. Tasks 35 and 36 don't depend on assets — they can be done at any time. Tell Claude "do Tasks 35/36" if you want the polish before the assets arrive.

---

## Style Anchor (Task 29)

Pin one reference image to look at every time you generate an asset:
- `1.png` (the existing repo reference, if visually relevant), or
- A curated Tripo3D output you love, or
- A Knight Lore screenshot for spirit reference

**Prompt fragment — paste this verbatim into every Tripo3D prompt:**

> stylized low-poly 3D model, hand-painted texture, warm muted palette, slight cel-shaded edges, fairy-tale storybook feel, fits in a haunted castle diorama, asymmetric silhouette, weighted/burdened pose

**Rules:**
1. Cite this fragment verbatim in every generation. Don't paraphrase.
2. If a generation visually drifts, regenerate. Don't accept "close enough".
3. Update this fragment if your taste shifts, and re-evaluate prior assets against the new anchor.

---

## Task 30 — Poly Haven textures + HDRI

Visit https://polyhaven.com.

**Wall material** — search "castle wall" or "stone wall". Download 2K JPG: diffuse, normal, roughness. Save as:
- `assets/textures/stone_wall_diffuse.jpg`
- `assets/textures/stone_wall_normal.jpg`
- `assets/textures/stone_wall_roughness.jpg`

**Floor material** — same pattern, save as `assets/textures/stone_floor_{diffuse,normal,roughness}.jpg`.

**HDRI** — visit https://polyhaven.com/hdris, pick a dim castle/dungeon mood, download 2K HDR. Save as `assets/textures/castle_dungeon.hdr`.

**Verify:** `pnpm dev` — walls and floor should render properly textured, no missing-asset warnings in the console.

**Commit:**
```bash
git add assets/textures/
git commit -m "assets: add Poly Haven stone wall/floor textures and HDRI"
```

---

## Task 31 — Knight & werewolf via Tripo3D + Mixamo

Visit https://tripo3d.ai.

**Knight prompt:**
> [paste style anchor fragment] knight with stooped weighted posture, oversized helm, asymmetric tabard, ragged hem, no weapon, T-pose for rigging

**Silhouette test:** mentally render the result in flat black. If it reads as a generic upright mannequin, regenerate. **Timebox: 3 attempts.** If none work, fall back to Quaternius CC0 characters (https://quaternius.com/).

1. Download Tripo GLB → `assets/_source/knight_2026-05-01_v1.glb`
2. **Blender cleanup:** apply scale to 0.8 × 1.6 × 0.8 m, recentre origin at base, decimate to ~3-5k tris. Export as `assets/_source/knight_cleaned.glb`.
3. **Mixamo auto-rig:** upload to https://mixamo.com, place rig markers, add animations: idle (burdened), walking, jump, pick-up. Use "Pack with skin" download mode.
4. If Mixamo deforms badly, **timebox 30 minutes**, then fall back to Quaternius.
5. **Convert FBX → GLB** in Blender (preserve animations). Save as `assets/models/knight.glb`.

**Werewolf prompt:**
> [paste style anchor fragment] werewolf, hunched silhouette, long forearms, oversized claw mass, snout/head wedge, predatory but tragic, T-pose for rigging

The werewolf is the highest-risk asset. Be willing to fall back to Quaternius or buy Synty Polygon Fantasy ($15) if Tripo + Mixamo don't deliver. Save final as `assets/models/werewolf.glb`.

**Commit:**
```bash
git add assets/_source/ assets/models/knight.glb assets/models/werewolf.glb
git commit -m "assets: knight and werewolf models with Mixamo animations"
```

---

## Task 32 — Tripo props

Each prop in Tripo with the style anchor:
- `push_block.glb` — "stone block, weathered, square edges"
- `goblet.glb` — "ornate goblet with dramatic cup silhouette, tarnished gold"
- `door.glb` — "heavy wooden castle door with iron bands"
- `chained_cauldron.glb` — "bulbous iron cauldron suspended on chains, dark, ominous"

Inspect each against silhouette and style anchor. Regenerate as needed. Cleanup in Blender (apply scale per spec §6.2, recentre origin), export GLB to `assets/models/`.

**Commit:**
```bash
git add assets/_source/ assets/models/push_block.glb assets/models/goblet.glb assets/models/door.glb assets/models/chained_cauldron.glb
git commit -m "assets: prop GLBs (push_block, goblet, door, chained_cauldron)"
```

---

## Task 33 — Replace placeholder meshes (claude-doable after 31, 32)

When the GLBs from 31 & 32 are committed, ask Claude to do this. The change is in `src/scenes/TheHall.ts`:

1. Add an `applyToonToHero` helper near the top that traverses meshes and swaps PBR material to `MeshToonMaterial` (preserving color and `map`).
2. Pre-load all six GLBs at the top of `buildTheHall` via `loader.loadAll([...], [])`.
3. For each placeholder (`blockMesh`, `gobletMesh`, `doorMesh`, `cauldronMesh`, `playerMesh`), replace the `new THREE.Mesh(new THREE.BoxGeometry(...), ...)` line with `loader.cloneModel('/assets/models/<name>.glb')` then `applyToonToHero(...)`. Keep all positioning and scaling.

The full code template is in the source plan, Task 33 (lines 3095-3168 of `docs/superpowers/plans/2026-05-01-knight-lore-web-3d.md`).

---

## Task 34 — Werewolf mesh swap (claude-doable after 31)

In `TheHall.ts`, parent a hidden `werewolfMesh` to `player.object3D`, expose a `swapForm(form)` that toggles visibility between knight and werewolf, return it on `HallBuild`. In `main.ts`, set `state.onTransformed = () => build.swapForm(state.form)`.

Full code in plan Task 34 (lines 3171-3232).

---

## Task 35 — Particle burst (claude-doable, no asset dep)

Pure code. Create `src/game/ParticleBurst.ts` with a `THREE.Points` cloud (40 particles, gravity, 1s lifetime), expose `burst(at: Vector3)` and `update(dt)`. Wire into TheHall and trigger from `state.onTransformed`. Full source in plan Task 35 (lines 3235-3360).

Can be done before assets arrive — particles look the same against placeholder capsules.

---

## Task 36 — Debug overlay (claude-doable, no asset dep)

Pure code. Create `src/engine/DebugOverlay.ts` that draws color-coded `Box3Helper` wireframes for every entity (red = SOLID_WORLD, orange = SOLID_DYNAMIC, green = PICKUP, magenta = HAZARD, blue = SUPPORT). Toggle with `D` key. Full source in plan Task 36 (lines 3363-3458).

Useful for verifying the placeholder scene right now — recommend doing this even before Task 30.

---

## Task 37 — End-to-end playthrough

After all the above, run `pnpm dev` and walk through the spec §13 Definition-of-Done items:

1. The Hall renders with moonbeam + torch + ambient lighting.
2. Arrow keys move the knight smoothly.
3. Space jumps with a parabola; landing fires once.
4. Walking into the push-block pushes it if legal.
5. Jumping on the block then on the static ledge succeeds.
6. Pressing E with goblet on player tile picks it up; HUD shows "CARRY: goblet".
7. Door starts closed, opens automatically once goblet is held.
8. Walking through open door = "YOU WIN".
9. 20s timer transforms knight → werewolf and back; mesh swaps; particles burst.
10. Transforming while carrying drops the goblet at current position.
11. Werewolf form cannot pick up.
12. Patrol enemy contact respawns the player.
13. `pnpm test` passes (currently 31 tests).
14. `pnpm build` succeeds.
15. Compliance check (Task 38).

**Try to break it:** push block off ledge edge, transform mid-jump, hold goblet through a transform cycle, walk into enemy. Anything that crashes is a bug.

Run the full CI suite locally:
```bash
pnpm test
pnpm build
pnpm lint
pnpm lint:no-render-pos
```

---

## Task 38 — Doc compliance review

Walk through:
- `docs/ART_DIRECTION.md` § Review Checklist
- `docs/VISUAL_DO_NOTS.md` § Quick Smell Tests
- `docs/PHYSICS_AND_COLLISION.md` § Review Checklist (most items already test-covered)

For anything that fails, write it into `docs/POLISH_DEBT.md` and commit. That doc becomes the post-MVP backlog.

---

## Plan-vs-implementation drift to know about

While implementing Tasks 2–28, a few small adjustments were made versus the literal plan text. They're already on `main`:

1. **`tileSize=1` in collision tests.** The plan's `Collision.test.ts` set up cells at world-coordinate offsets but called `resolveHorizontal(..., 2)` — inconsistent. Tests now use `tileSize=1` so 1 cell = 1 world unit (the test setup's clear intent).
2. **Swept perpendicular range in `resolveHorizontal`.** The diagonal-into-corner test wanted both axes blocked when sweeping into a corner solid. The X-pass now uses `min/max(start.z, end.z)` for the Z range (and vice versa), so each axis "sees" the corner during diagonal motion.
3. **`pnpm v10` in CI.** The plan specified pnpm 8 for the GitHub Action, but pnpm 10 is current; lockfile is v10.
4. **`vitest passWithNoTests: true`.** Without it, `pnpm test` would fail CI before Phase 1 added test files.
5. **`--no-error-on-unmatched-pattern` on `eslint`.** Same reason — empty `tests/` early on caused ESLint to error.
6. **`lint:no-render-pos` excludes `.renderPosition.copy(`.** The plan's rule was too strict — its own entity `placeOnGrid` methods and scene setup all do `.renderPosition.copy(this.position)` for initialization. The refined rule still flags reads, which was the rule's true intent.
7. **TS literal-narrowing fix in `Player.test.ts`.** The "stepping off support" test had `player.state = 'grounded'` then later `if (player.state === 'airborne')`, which TS narrowed to impossible. Removed the redundant assignment (the constructor sets it) and cast the comparison.
8. **Old `docs/AUTHORED_ASSET_PIPELINE.md`, `BRIEF_PHASE2A/2B/3.md`, `MIGRATION_PLAN.md`, `SPRITE_SHEET_PROMPTS.md`** — Android-era docs, deleted alongside the Kotlin scaffolding.

If any of these surprise you, push back and we'll revisit.
