# Knight Lore — Web 3D Rewrite Design

**Status:** Approved (vertical-slice MVP)
**Date:** 2026-05-01
**Supersedes:** Kotlin/Android multi-module project at `4f4b782`. Existing design documents (`docs/ART_DIRECTION.md`, `docs/VISUAL_DO_NOTS.md`, `docs/PHYSICS_AND_COLLISION.md`, `docs/ROOM_CHALLENGES.md`) remain in force; this spec implements them on a new tech stack.

---

## 1. Goal

Build a browser-based 3D Knight Lore homage using three.js. The MVP is a single polished room ("The Hall, redux") that exercises every core mechanic the full game will need: movement, jump, push, block-as-step, pickup with form-gated carry, werewolf transformation, patrol enemy avoidance, and goal-state win condition.

The point of the slice is to prove the toolchain end-to-end (AI-asset generation → Blender cleanup → three.js scene → playable browser experience) before scaling content.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Engine | three.js | Industry baseline for browser 3D; small footprint; matches AI-asset (GLB) workflow. |
| Build / dev | Vite | Fastest DX; HMR makes shader/material iteration painless. |
| Language | TypeScript | three.js typings are excellent and pay back on the first refactor. |
| Package manager | pnpm | |
| 3D mesh generation | Tripo3D (free tier first; paid only if blocked) | Best fit for hero props in a stylized art direction. |
| Character rigging + animation | Mixamo (free; Adobe account) | Auto-rig + free animation library. |
| Tileable textures + HDRIs | Poly Haven, ambientCG (CC0) | Hand-authored seamless PBR; categorically better than AI-gen for tiling surfaces. |
| Fallback character packs | Quaternius / Kenney (CC0); Synty Polygon Fantasy as paid escape hatch | Used if Tripo+Mixamo cannot deliver the knight or werewolf to the doc's silhouette/asymmetry standard. |
| Testing | Vitest | Fast pure-function tests; no DOM/WebGL needed. |
| CI | GitHub Actions | `pnpm install && pnpm test && pnpm build`. |

**Out of MVP:** physics engine (Rapier), ECS framework, image-gen subscriptions (ChatGPT Plus / Grok / Midjourney), audio, mobile/touch, save/load, multi-room transitions, UI menus.

## 3. Repo migration

The Kotlin/Android scaffolding is replaced in place. Steps:

1. Create branch `legacy-android` from `main` at `4f4b782` and push it. Permanent undo button.
2. One commit titled `chore: remove Kotlin/Android scaffolding ahead of three.js rewrite`. Removes: `app/`, `core/`, `data/`, `desktop/`, `domain/`, `feature-debug/`, `input/`, `render/`, `build/`, `build-logic/`, `config/`, `tools/`, `gradle/`, `.gradle/`, `.kotlin/`, `.idea/`, all `*.gradle.kts`, `gradle.properties`, `gradlew`, `gradlew.bat`, `local.properties`, `settings.gradle.kts`. Keeps: `docs/`, `README.md`, `.gitignore`, `.git/`, `1.png`.
3. Bootstrap: `pnpm create vite . --template vanilla-ts`, customize, install three.js. Commit as `feat: initialize Vite + three.js + TypeScript scaffolding`.

## 4. Repo layout (post-bootstrap)

```
knight-lore/
├── docs/                  ← preserved (art direction, visual-don'ts, physics, rooms, this spec)
├── public/                ← static assets served as-is (favicon, etc.)
├── assets/                ← runtime assets (fetched from /assets/, not bundled)
│   ├── models/            ← GLB exports (knight.glb, werewolf.glb, props/*.glb)
│   ├── textures/          ← PNG/JPG textures from Poly Haven, etc.
│   └── _source/           ← raw, unprocessed AI outputs (pre-Blender cleanup, dated filenames)
├── src/
│   ├── main.ts            ← entry point
│   ├── engine/            ← three.js glue: Renderer, GameLoop, Input, AssetLoader, Collision
│   ├── game/              ← entity classes: Player, PushBlock, Enemy, Pickup, Door, etc.
│   ├── scenes/            ← TheHall.ts (the MVP room)
│   └── shaders/           ← (likely empty for MVP)
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── README.md
```

## 5. Module layout & game loop

### 5.1 `src/engine/` — game-agnostic glue

| Module | Responsibility | Approx LOC |
|---|---|---|
| `Renderer.ts` | WebGLRenderer + Scene + OrthographicCamera locked to isometric pose. Owns canvas. | ~80 |
| `GameLoop.ts` | Fixed-timestep update at 60 Hz; variable-rate render; registered system callbacks. | ~60 |
| `Input.ts` | Keyboard state. Exposes `isDown(key)` and `wasPressed(key)` (half-edge). | ~40 |
| `AssetLoader.ts` | GLTFLoader + TextureLoader wrappers, cache, `loadAll(...)` with progress. | ~70 |
| `Collision.ts` | AABB math, grid queries, swept-AABB resolution with axis tracking. Pure functions. | ~80 |

### 5.2 `src/game/` — Knight Lore-specific

`Player`, `PushBlock`, `StaticBlock`, `Pickup`, `Door`, `PatrolEnemy`, `SetPiece`, `Room`, `HUD`. Each class holds its three.js `Object3D` and exposes `update(dt, ctx)`. No ECS. Plain class-based design with a shared `Entity` base.

### 5.3 Game-loop wiring

```ts
const renderer = new Renderer(document.querySelector('#app')!)
const input = new Input()
const assets = new AssetLoader()
await assets.loadAll([...])

const gameState = new GameState()
const room = buildTheHall(renderer.scene, assets)

const loop = new GameLoop()
loop.onUpdate((dt) => {
  input.update()
  room.update(dt, input, gameState)
})
loop.onRender(() => renderer.render())
loop.start()
```

### 5.4 Per-tick movement resolution order

Mandated by `PHYSICS_AND_COLLISION.md` § Movement Resolution Order. Codified:

1. Read input / AI intent.
2. Compute desired horizontal movement.
3. Resolve horizontal collision against solids (axis-tracked).
4. Update jump/gravity vertical intent.
5. Resolve vertical collision / support state.
6. Resolve dynamic block interactions (push attempts).
7. Resolve falling-block state changes.
8. Resolve hazard contact.
9. Resolve triggers: pickups, interactions, exits.
10. Emit gameplay events.

## 6. Asset pipeline

### 6.1 Style anchor (set once)

A reference image and a prompt fragment, pinned in `docs/STYLE_ANCHOR.md`, cited verbatim in every AI generation. Reference candidates: `1.png` from the repo root, a Knight Lore screenshot, or a curated Tripo generation. Prompt fragment example: *"stylized low-poly 3D model, hand-painted texture, warm muted palette, slight cel-shaded edges, fairy-tale storybook feel, fits in a haunted castle diorama."*

### 6.2 Scale & proportion contract

Three.js scene units are metres.

| Element | Size (metres, X × Y × Z) |
|---|---|
| Floor tile | 2 × 0.3 × 2 |
| Wall tile | 2 × 3 × 0.3 |
| Static raised ledge (cube) | 2 × 2 × 2 |
| Knight (human) | 0.8 × 1.6 × 0.8 |
| Werewolf | 1.0 × 1.8 × 1.0 |
| Push-block | 1.6 × 1.6 × 1.6 |
| Goblet | 0.3 × 0.4 × 0.3 |
| Door | 2 × 2.4 × 0.2 |

**Jump-height design intent:** an ungrounded jump rises ~1.0 m above the launch surface. From the floor (y=0), a player can reach y=1.0. From the top of a stationary push-block (y=1.6), a player can reach y=2.6. The raised ledge top is at y=2.0, so it is *unreachable from the floor alone* but *easily reachable from on top of the push-block*. This is the puzzle's load-bearing constraint.

Every Tripo-generated asset is rescaled in Blender to match before export. Origin is centred at the base of the object so `position.y = 0` puts it on the floor.

**Procedural vs authored geometry:** floor tiles, wall tiles, and the static raised ledge are *procedural* three.js `BoxGeometry` boxes with the Poly Haven PBR materials from §6.5 applied. They are not generated by Tripo; they have no GLB. Only the assets listed in §6.7 are authored GLBs. This split is what implements ART_DIRECTION.md's "procedural structure / authored presentation" mandate.

### 6.3 Pipeline (per asset)

```
Generate (Tripo) → Triage (Blender) → Clean (Blender) → Export (GLB)
                       ↑
                  if any of:
                    - topology unsuitable for rigging (characters)
                    - silhouette unreadable in flat-black test
                    - obvious artifacts (floating polys, holes, baked shadows)
                    - style anchor not matched
                  → REGENERATE. Do not retopo a bad mesh.
```

Cleanup is the minimum viable: apply scale to the contract, delete any "platform" base Tripo adds, recentre origin at base, decimate characters to ~3-5k tris for Mixamo. Export GLB with embedded textures, no Draco compression.

### 6.4 Character pipeline (Mixamo branch)

```
Tripo mesh → Blender cleanup → Upload to Mixamo → Auto-rig
  → Download with animations (idle, walk, jump, pick-up, drop)
  → Combine into one GLB → Export to assets/models/
```

If Mixamo's auto-rig deforms the knight or werewolf badly: **30-minute timebox**, then switch to a Quaternius CC0 character or a Synty Polygon Fantasy paid pack (~$15) without ego. Pre-committed fallback. Werewolf is the highest-risk single asset because hunched/quadrupedal rigs are harder for Mixamo than humanoid T-pose.

### 6.5 Tileable textures (no AI)

Poly Haven 2K diffuse + normal + roughness for stone wall and stone floor, applied as `MeshStandardMaterial` with `texture.repeat` and `RepeatWrapping`. No Blender step.

### 6.6 Materials

- **Hero meshes** (knight, werewolf, goblet, push-block, set-pieces) use `MeshToonMaterial` with a 3-step toon ramp. **Never PBR for heroes.**
- **Tileable structure** (walls, floor) uses `MeshStandardMaterial` (PBR). PBR is reserved for the structural canvas, where its physical correctness aids surface variation.
- This split is deliberate visual hierarchy: hand-painted heroes against a quieter PBR world.

### 6.7 MVP asset list

```
Characters (Tripo + Mixamo):
  - knight.glb       (idle, walk, jump, pick-up, drop)
  - werewolf.glb     (idle, walk, jump)

Props (Tripo only, no rig):
  - push_block.glb
  - goblet.glb
  - door.glb
  - chained_cauldron.glb (decorative set-piece — the room's memory hook)

Tileable textures (Poly Haven, no Tripo):
  - stone_wall (diffuse + normal + roughness)
  - stone_floor (diffuse + normal + roughness)

Lighting reference:
  - One Poly Haven dim castle/dungeon HDRI (used for environment reflections only,
    NOT as a sky background)
```

Six meshes, one HDRI, two PBR material sets. Within Tripo's free-tier monthly budget even with 2-3 regenerations per asset.

## 7. Scene/room data model

### 7.1 Rooms as TypeScript modules

The MVP room is `src/scenes/TheHall.ts`, exporting a single function:

```ts
export function buildTheHall(scene: THREE.Scene, assets: AssetLoader): Room { … }
```

Code-as-data, not JSON. Type-safe, refactor-friendly, calls into asset loader helpers.

### 7.2 The `Room` class

```
Room
├── id: string
├── grid: Grid (W × D logical cells; { solid, support, occupant })
├── entities: Entity[]
├── lights: Light[]
├── triggers: Trigger[]
├── spawn: { x, z }
├── update(dt, input, gameState): void
└── dispose(): void   ← seam for room transitions (post-MVP)
```

### 7.3 Entity hierarchy

```
Entity (abstract)
├── position: Vector3 (logical, integer-grid + height)
├── renderPosition: Vector3 (interpolated, smooth, render-only)
├── extents: Box3 (AABB)
├── categories: Category[]
├── object3D: THREE.Object3D
├── update(dt, ctx): void
└── onCollision(other, axis): void

Player      (ACTOR_BODY)
PushBlock   (SOLID_DYNAMIC + SUPPORT_SURFACE — dual category)
StaticBlock (SOLID_WORLD + SUPPORT_SURFACE)
Pickup      (PICKUP_TRIGGER)
Door        (SOLID_WORLD when closed; DECORATIVE when open)
PatrolEnemy (ACTOR_BODY + HAZARD on contact)
SetPiece    (DECORATIVE — never blocks, never collides)
```

### 7.4 Logical vs render position discipline

- **`position`** — integer grid + height. Updated only on the fixed simulation tick. **All collision and gameplay logic reads this.**
- **`renderPosition`** — `Vector3` lerping toward `position` (~80 ms). **Only the renderer reads this.** Never used for any gameplay decision.
- Any reference to `renderPosition` outside `Renderer.ts` is a bug. Enforced by a CI grep rule.

### 7.5 GameState (above the room)

```
GameState (singleton, owned by main.ts)
├── inventory: Item[]
├── form: 'human' | 'werewolf'
├── transformTimer: number (seconds until next transformation)
├── delivered: Item[]   (post-MVP)
└── currentRoomId: string
```

Inventory and form live above the room so adding rooms post-MVP is mechanical.

### 7.6 The MVP room: "The Hall, redux"

8 × 8 logical grid. Stone-castle theme.

| Element | Logical position (x, z) | Notes |
|---|---|---|
| Player spawn | (1, 3) | |
| Push-block | (3, 5) | `SOLID_DYNAMIC` + `SUPPORT_SURFACE`. Top at y=1.6 m. |
| Static raised ledge | (5, 5) | `SOLID_WORLD` + `SUPPORT_SURFACE`. Top at y=2.0 m. Procedural `BoxGeometry`. |
| Goblet | (5, 5), y=2.0 | Sits on top of the ledge. |
| Door | (4, 7), south wall | Closed at start; opens when goblet enters inventory. |
| Chained cauldron (set-piece) | (1, 1) | Decorative memory hook (ART_DIRECTION §4). `DECORATIVE` only. |
| Patrol enemy | linear path `(2, 4) ↔ (6, 4)` | Crosses the player's main movement corridor (y=4) so the player must time their crossing. |

Three lights (see §9). HDRI for goblet reflections only.

**Solution path:** spawn at (1, 3) → time enemy to cross y=4 → walk south to push-block at (3, 5) → push block east to (4, 5) → jump onto block at (4, 5) (player y goes 0 → 1.6) → jump from block top onto ledge at (5, 5) (player y goes 1.6 → 2.0) → pick up goblet → jump down → re-cross y=4 with timing → walk south through door at (4, 7) = win.

**Failure modes:** enemy contact → respawn at spawn. Transforming to werewolf while holding the goblet → goblet drops at current position; player must re-collect after returning to human. Falling off the ledge → no death, walk back. Trying to pick up the goblet while in werewolf form → silently rejected.

## 8. Werewolf & gameplay logic

### 8.1 Transformation

```
state: 'human' | 'werewolf'
HUMAN_DURATION = 20s
WEREWOLF_DURATION = 20s

every tick:
  transformTimer -= dt
  if transformTimer <= 0: transform()

transform():
  if state == 'human' and player.carrying: dropItemAt(player.position)
  particles.burst(player.position, 'transform')
  hud.flashPulse()
  player.swapMesh(state == 'human' ? werewolfMesh : knightMesh)
  state = (state == 'human') ? 'werewolf' : 'human'
  transformTimer = (state == 'human') ? HUMAN_DURATION : WEREWOLF_DURATION
  events.emit('PlayerTransformed', { newForm: state })
```

The MVP transform animation (particle burst + mesh swap) is below the ART_DIRECTION bar of "uncanny and asymmetrical". This is acknowledged polish-debt for post-MVP.

### 8.2 Form-gated pickup (α-asymmetry)

Only `human` form can pick up items. Werewolf attempting to pick up: rejected silently. Transforming while carrying: drop at current position (covered above).

### 8.3 Door logic

```
update():
  if !this.open and gameState.inventory.has('goblet'):
    this.open = true
    this.removeCategory(SOLID_WORLD)
    this.playOpenAnimation()  // 0.5s rotation
```

## 9. Lighting design (for "The Hall")

Three lights total, plus one HDRI for environment reflections only.

| Light | Type | Color / intensity | Purpose | ART_DIRECTION mapping |
|---|---|---|---|---|
| Moonbeam | `SpotLight`, narrow cone | Cool blue ~`#7090c0`, intensity 1.2 | Dominant theatrical light falling across the goblet ledge | "moonbeam from barred window", "altar spotlight" |
| Torch | `PointLight`, low decay | Warm orange ~`#ff8030`, intensity 1.0 | Single warm pool on one wall; rest of room stays in shadow | "torch pools on one wall only" |
| Ambient fill | `AmbientLight` | White, intensity 0.08 | Floor under deep shadow stays barely visible (readability) | Compromise between "deep shadow" (Composition §) and Principle 7 (Readability) |

**HDRI**: one Poly Haven dim castle/dungeon HDRI for `scene.environment` (reflections on the metal goblet only). The visible "sky" through the door opening is a black-to-deep-blue gradient on a far back-plane, NOT the HDRI.

**Forbidden** (per VISUAL_DO_NOTS § Lighting): even illumination, hemisphere lights, bloom postprocessing, screen-space ambient occlusion, blue line glow on exits.

## 10. Testing strategy

### 10.1 Principle

Test the rules, not the rendering. All gameplay logic lives on plain TS fields, not three.js objects. Tests construct entities with stub `Object3D`s and assert on logical state.

### 10.2 Required tests (~20 total, all Vitest, all pure-function)

```
src/engine/Collision.test.ts       (6 tests)
  - X-axis-only blocking
  - Z-axis-only blocking
  - diagonal-into-corner: both axes resolve, no slip-through
  - swept AABB: high-speed motion still resolves (no tunnelling)
  - support-surface query returns correct entity at given tile
  - hazard overlap detected at tile boundary

src/game/Player.test.ts            (5 tests)
  - jump fires only from grounded state
  - landing emits exactly one Landed event
  - stepping off support starts falling on next tick
  - werewolf form rejects pickup attempt
  - human form accepts pickup attempt

src/game/PushBlock.test.ts         (4 tests)
  - push succeeds when target tile is empty floor
  - push fails when target tile is solid wall
  - push fails when target tile holds another block
  - block top is SUPPORT_SURFACE while at rest, not while moving

src/game/Werewolf.test.ts          (3 tests)
  - timer transforms at t = HUMAN_DURATION
  - transforming while carrying drops item at current position
  - transform emits PlayerTransformed exactly once

src/game/GameState.test.ts         (2 tests)
  - inventory persists across simulated transformations
  - door opens-when triggers exactly once when condition becomes true
```

All run in <1 second. Total under 1000 LOC of test code.

### 10.3 Manual rituals

1. **Silhouette test** at asset triage: render with `MeshBasicMaterial({ color: 0x000000 })` against white. ~30 s per asset.
2. **End-to-end playthrough** per session: one clean run, one breakage attempt. ~90 s total.
3. **Doc compliance check** per visible change: scan the relevant doc's "Forbidden" section. Revert if any pattern matches.

### 10.4 CI

GitHub Actions, single workflow: `pnpm install && pnpm test && pnpm build`. Branch protection requires it before merge to `main`. No deploy step for MVP.

### 10.5 Out of scope

No screenshot/visual-regression tests. No headless WebGL runner. No Playwright E2E. No coverage targets.

## 11. The 18 explicit rules (consolidated contracts)

These are the rules drawn directly from `PHYSICS_AND_COLLISION.md`, `VISUAL_DO_NOTS.md`, and `ART_DIRECTION.md`. They are non-negotiable in this implementation.

### From PHYSICS_AND_COLLISION.md

1. **Collision categories are explicit and exhaustive.** Every entity declares one or more of: `SOLID_WORLD`, `SOLID_DYNAMIC`, `ACTOR_BODY`, `SUPPORT_SURFACE`, `HAZARD`, `PICKUP_TRIGGER`, `INTERACTION_TRIGGER`, `EXIT_TRIGGER`, `DECORATIVE`. No "kind of solid" objects.
2. **Swept AABB with axis tracking.** Horizontal collision resolves X and Z independently; preserves which axis blocked. No single `hitWall` flag.
3. **Explicit grounded state.** `Grounded | Airborne | Jumping`. Single landing event per landing.
4. **10-step movement resolution order** (per §5.4). Codified per-tick. Order is part of the contract.
5. **Centralized epsilon constants.** One `epsilons.ts` file, named tolerances, no magic numbers in entity code.
6. **Debug overlay capability.** Wireframe collision shapes, grounded state, trigger zones. Toggle key.
7. **Solids ≠ triggers, ever.** Pickup, interaction, exit categories never block movement.
8. **Pure-function collision tests with Vitest.** All ~11 doc-required cases covered.

### From VISUAL_DO_NOTS.md

9. **No PBR for hero assets.** `MeshToonMaterial` only. PBR confined to tileable structure textures.
10. **No bloom/glow as shortcut.** Postprocessing bloom is OFF by default. Earns its way in only with documented authored intent.
11. **No texture-as-soul.** Composition (anchor placement, light placement, negative space) over surface detail. Adding more texture is not a fix for a dead room.

### From ART_DIRECTION.md

12. **Style anchor enforced.** Every AI generation cites the same reference image and prompt fragment (`docs/STYLE_ANCHOR.md`).
13. **"Regenerate, don't fix" rule.** Bad Tripo outputs are thrown out, not retopo'd.
14. **Reference image required for character generations.** Knight and werewolf cannot be text-prompted alone.
15. **Werewolf and knight have documented fallbacks.** 30-minute timebox before switching to Quaternius/Synty.
16. **Transform animation is acknowledged polish-debt.** MVP ships with particle burst + swap; full uncanny-asymmetric polish post-MVP.

### From ROOM_CHALLENGES.md

17. **Push-blocks are dual-category.** `SOLID_DYNAMIC` (when being pushed) + `SUPPORT_SURFACE` (when at rest, for jump-from-on-top).
18. **Inventory and form state are world-level, not room-level.** Live on `GameState`, not `Room`. Persist across rooms (post-MVP architecture seam).

## 12. Out of MVP scope (explicit)

Listed so we don't drift into them mid-build:

- Audio (music, SFX)
- Mobile / touch input
- Save/load
- Multi-room transitions
- UI menus, title screen, options
- Cauldron delivery mechanic
- Form-specific damage zones
- Puzzles beyond block-as-step
- Multiple enemy types
- Procedural anything
- Image-gen subscriptions (ChatGPT Plus, Grok, Midjourney)
- Texture atlases, LODs, Draco compression
- Visual regression / screenshot tests
- Playwright E2E

These are deferred, not forgotten. The architecture leaves seams (`Room.dispose()`, `GameState`, category enum, event bus) for clean post-MVP extension.

## 13. Definition of done (the slice)

The vertical slice is complete when all of the following are true on a fresh `pnpm install && pnpm dev`:

1. The browser shows "The Hall" rendered with the moonbeam + torch + ambient lighting.
2. Pressing arrow keys moves the knight on the grid with smooth render interpolation.
3. Space jumps with the parabola arc; landing emits a single event.
4. Walking into the push-block initiates a push; the block moves to the target tile if legal, else does nothing.
5. Jumping onto a stationary push-block places the knight on top; jumping again from there can reach the static ledge.
6. Pressing E on the ledge with the goblet at the player's tile picks it up; HUD shows "carrying: goblet".
7. Door is closed at start; opens automatically once goblet is in inventory.
8. Walking through the open door = win state (simple "YOU WIN" text overlay, freeze game).
9. The 20-second timer transforms human → werewolf and back; mesh swaps; particle burst plays.
10. Transforming while carrying drops the goblet at the player's current position.
11. Werewolf form cannot pick up items.
12. Patrol enemy moves along its linear path back and forth; contact respawns the player at the spawn point.
13. All 20 unit tests pass.
14. `pnpm build` produces a deployable static bundle.
15. Compliance check against `ART_DIRECTION.md`, `VISUAL_DO_NOTS.md`, `PHYSICS_AND_COLLISION.md` review checklists is clean.

## 14. Known polish-debt (post-MVP)

- Werewolf transformation animation does not meet ART_DIRECTION's "uncanny and asymmetrical" bar.
- Knight character may not meet ART_DIRECTION's silhouette/asymmetry bar without 3+ Tripo regeneration cycles.
- HUD is plain DOM text; no atmospheric overlay treatment.
- No audio means no landing thuds, transformation roar, or torch crackle — atmosphere is visual-only.
- Single ambient light prevents the deepest shadows from being pure black, slightly compromising "deep shadow" mandate from the doc.
