# Knight Lore — Migration Plan to Authored Art Standards

Based on: ART_DIRECTION.md, VISUAL_DO_NOTS.md, AUTHORED_ASSET_PIPELINE.md, PHYSICS_AND_COLLISION.md

---

## Phase 1 — Foundation (Architecture + Abstractions)

### 1A. Create art pipeline interfaces
- [ ] `render/art/ActorArtCatalog.kt` — interface + ActorArtSpec + enums
- [ ] `render/art/PropArtCatalog.kt` — interface + PropArtSpec + enums
- [ ] `render/art/RoomArtProfile.kt` — data class + supporting types
- [ ] `render/art/AuthoredSprite.kt` — shared sprite model + PaletteRole enum
- [ ] `render/art/DefaultActorArtCatalog.kt` — fallback to legacy rendering
- [ ] `render/art/DefaultPropArtCatalog.kt` — fallback to legacy rendering

### 1B. Physics contract compliance
- [ ] Centralize epsilon constants into `CollisionConstants` object
- [ ] Remove generic `hitWall` flag from `ResolvedMove` (keep only hitWallX/hitWallY)
- [ ] Add block push/fall events to GameEvent sealed interface

---

## Phase 2 — Player Character (Highest Visual Impact)

### 2A. Authored player human form
- [ ] Design as silhouette-first: stooped, burdened, oversized hat, asymmetric
- [ ] Must be instantly recognizable in black-only silhouette test
- [ ] Implement in DefaultActorArtCatalog for PLAYER+HUMAN
- [ ] States: IDLE, WALK_A, WALK_B, JUMP_RISE, LAND

### 2B. Authored player werewolf form
- [ ] Completely different mass logic from human (not a recolor)
- [ ] Hunched, long forearms, wedge head, shoulder hump
- [ ] Must read as dangerous even at small scale
- [ ] States: IDLE, WALK_A, WALK_B, JUMP_RISE, LAND

### 2C. Wire catalog into renderer
- [ ] Modify buildPlayerCommands() to check ActorArtCatalog first
- [ ] Fallback to legacy if no authored asset

---

## Phase 3 — Collectible Items (Readability)

### 3A. Authored item silhouettes
- [ ] Goblet: dramatic cup silhouette with stem
- [ ] Key: exaggerated teeth/bow
- [ ] Crystal ball: orb-on-base
- [ ] Vial: neck/bulb distinction
- [ ] Skull: instant read from outline alone
- [ ] Each must pass monochrome silhouette test

### 3B. Wire PropArtCatalog into renderer
- [ ] Replace item oval rendering with catalog lookup
- [ ] Fallback for unknown items

---

## Phase 4 — Room Staging (Atmosphere)

### 4A. Create profiles for 5 hero rooms
- [ ] Room 001 (Cauldron Hall): chained cauldron anchor, green underglow
- [ ] Room 002 (Start): introductory staging, directional flow to exit
- [ ] Room 003: puzzle room focal point
- [ ] Room 007 (Trap): hazard-centric staging
- [ ] Room 015: multi-enemy room composition

### 4B. Per-room identity elements
- [ ] Each profiled room gets 1 anchor prop (throne, altar, cage, window, etc.)
- [ ] Each gets 1 dominant light idea
- [ ] Each gets 1 quiet zone (area left intentionally sparse)

### 4C. Wire RoomArtProfile into renderer
- [ ] After wall/floor pass, render room-specific decor from profile
- [ ] Render light overlays from profile

---

## Phase 5 — Enemy Silhouettes

### 5A. Authored enemy art
- [ ] Guard: upright pillar, rigid authority silhouette
- [ ] Ghost: tapering drift, floating cloth shape
- [ ] Druid: hooked, branch-like ritual silhouette
- [ ] Robot: angular relic, not generic block-man

### 5B. Wire into renderer
- [ ] buildActorCommands() checks ActorArtCatalog
- [ ] Fallback to current procedural rendering

---

## Phase 6 — Anchor Props + Set-Pieces

- [ ] Throne (authored, oversized)
- [ ] Altar with ritual circle
- [ ] Barred window (moonlight source)
- [ ] Hanging cage cluster
- [ ] Torn banner
- [ ] Chain cluster

---

## Execution Rules

1. **Silhouette test first** — design in black fill, colorize after shape reads
2. **Fallback always** — never break the game while migrating
3. **One phase at a time** — each phase produces a testable, shippable state
4. **Art direction document wins** — if code conflicts with ART_DIRECTION.md, redesign code
5. **Measure by atmosphere** — not by code architecture quality
