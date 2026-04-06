# Phase 7 — Visual Polish & Feel

> Goal: Make the game look and feel like a professional, atmospheric dungeon game.
> Reference aesthetic: Knight Lore (1984) · Monkey Island · Bitmap Brothers — gritty, hand-drawn, restricted palette, comic-book outlines.

---

## 🐛 Bug Fixes

### Collision & Movement
- [x] **Floor not in solids list** — implicit floor `SolidVolume` at Z=0 in `MovementSystem.kt`
- [x] **Can't land on top of blocks** — `ENTITY_HEIGHT = 0.9f` in `MovementSystem.kt`
- [x] **Character disappears into walls** — block depth key now uses top-face Z (`gz + 1f`) so blocks sort behind player at same XY
- [x] **Character head clips through overhead blocks** — blocks above player XY footprint forced to `DrawLayer.PLAYER`

### Game Loop
- [x] **Player cannot move after restart** — `GameSessionCoordinator` reuses existing coordinator via `reset()`; `GameLoopCoordinator` uses `AtomicReference<PendingReset>` to avoid IO/frame-thread race
- [x] **Stale input on restart** — `GameLoopCoordinator.reset()` sets `currentInput = FrameInput.IDLE` and skips one frame
- [x] **Transformation kills player** — `TransformationSystem` grants `maxOf(existing, TRANSFORM_TICKS + RECOVERY_TICKS + 10)` invincibility at transform start
- [x] **Respawn on hazard → instant game over loop** — `LifeSystem.findSafeRespawn()` walks +1f on X up to 8 times to avoid HAZARD tiles
- [x] **Damage cooldown too short** — `LifeSystem` default is `damageCooldownTicks = 180` (3 seconds)

### Room & Walls
- [x] **4 thick wall blocks visible — feels outside the room** — South and East wall loops removed; only North (y=0) and West (x=0) walls rendered
- [x] **Walls too short / squat** — wall height loop `gz in 0 until 3`
- [x] **Room feels flat** — `BLOCK_HEIGHT = 40f` in `TileMetrics.kt`
- [x] **Room sits too low on screen** — `IsoProjector.roomOffset()` subtracts `viewportH * 0.08f`

---

## 🎨 Visual Overhaul

### Core Rendering Rules
- [x] **No anti-aliasing** — `paint.isAntiAlias = false` on all draw calls in `CanvasSceneRenderer`
- [x] **Dark outline on every shape** — every ColorRect / ColorOval / ColorPath fill followed by 2px `#0A0808` stroke
- [x] **Restricted 6-color palette** — `Colors` object in `RoomEntityFactory` maps to `#0A0808` · `#1C1C2C` · `#3A3A5A` · `#6A6A8A` · `#AA2200` · `#228822`
- [x] **Scanline overlay** — 1px horizontal lines every 4px at `#18000000` after scene in `CanvasSceneRenderer`

### Floor Tiles
- [x] **Dithered fill** — `DrawPayload.DitheredPath` with 2×2 `BitmapShader` checkerboard `#16161E` / `#252535`
- [x] **Top-edge highlight only** — top-left and top-right diamond edges drawn as 1px `#6A6A8A` lines
- [x] **Pixel jitter on edges** — `jitter()` helper applies seeded `±1px` offset per diamond point using `(gridX * 31 + gridY * 17)` seed

### Walls
- [x] **Brick rows** — horizontal mortar lines `#0A0808` at z+0.5 on inner visible face
- [x] **Left face 15% darker than right face** — `WALL_RIGHT = #1C1C2C`, `WALL_LEFT = #181825` (15% darker)
- [x] **Inner faces only** — `wallBlockNorth` draws south-facing (`blockFaceLeft`) only; `wallBlockWest` draws east-facing (`blockFaceRight`) only
- [x] **Wall corner particles** — `buildDustParticles()` spawns 2–3px `#2A2A3A` blobs drifting upward from inner wall corners

### Solid Blocks
- [x] **3-face brick shading** — top `#3A3A5A`, left `#1C1C2C`, right `#141422`
- [x] **Plague cross on top face** — two `Line` commands forming `+` in `#6A6A8A`
- [x] **Inner shadow border** — `ColorPath.shadowColorArgb = #0A0A14`; renderer clips 6px stroke to give 3px inset shadow

### Hazard Tiles
- [x] **Replace X placeholder** — dark pit `#1A0000`, 5 metallic spike triangles `#4A4A4A` with `#888888` tips, red glow `#22FF0000` rim

### Doors / Exits
- [x] **Remove solid door block** — `doorBlock()` deleted; replaced by `doorArchway()`
- [x] **Draw open archway** — stone pillar columns either side of gap, `#050508` void face, `#3A3A6033` threshold glow at floor level

### Atmosphere
- [x] **Vignette** — four dark `ColorRect` overlays at screen edges (top/bottom/left/right) for torchlight feel
- [x] **5% floor puddles** — faint green `#30000800` / `#18003300` overlay on `(gridX*11 + gridY*17 + gridX*gridY) % 20 == 0` tiles

---

## 🧙 Character & Actors

### Player Character
- [x] **Replace rectangle+oval+triangle** — 9-point isometric cloak trapezoid polygon via `ColorPath`
- [x] **Cloak fill** — `#14081E` (human) with `#0A0808` outline
- [x] **Face** — small `#6A6A8A` oval, dark eye socket ovals
- [x] **Glowing eyes** — 2px `#228822` dots with larger semi-transparent halo
- [x] **Bob animation** — `sin(tick * 0.10472) * 2f` = ±2px over 1 second applied to all parts
- [x] **Facing eye shift** — eye X offset ±3px based on `player.facing`
- [x] **Damage blink** — cloak, face, eyes all flash `#FF4444` when `damageCooldownTicks % 10 < 5`

### Werewolf Form
- [x] **Distinct silhouette** — same cloak polygon scaled 10% wider, `#100610` fill
- [x] **Wolf ears** — two upward triangles at hood peak
- [x] **Orange-red eyes** — `#AA2200` replacing green

### Actors (all types)
- [x] **Actors render at all** — `buildActorCommands()` included in painter sort via `DrawLayer.ACTOR`
- [x] **GUARD** — tall `#8B0000` rect + two shoulder squares + `#FF4400` visor line
- [x] **GHOST** — semi-transparent `#AAAAEE` tall oval at 70% alpha + faint trail ovals below
- [x] **ROBOT** — 3-face cube `#444466` + `#FF0000` single red eye oval
- [x] **DRUID** — hooded cloak mini-polygon `#2A1A00` + `#FFAA00` yellow eyes
- [x] **BALL** — `#CC4400` circle + spin line, bobbing vertically

### Items
- [x] **Glowing oval** — base `#6A6A8A` oval + outer glow ring `#1AFFDD44`
- [x] **Pulse animation** — `sin(tick * 0.07) * 2f` scale on glow oval

---

## 📊 HUD

- [x] **Semi-transparent bars** — `#AA000000` full-width rects top 52px and bottom 52px
- [x] **Top-left: Day counter** — `DAY N` 22px + `#CC6600` progress bar 120×6px from `time.phaseProgress`
- [x] **Top-center: Transformation warning** — `⚠ NIGHT FALLS IN Ns` / `⚠ DAWN IN Ns`, pulsing alpha, only at DUSK/DAWN
- [x] **Top-right: Lives** — diamond skull paths in `#CC2222`
- [x] **Bottom-left: Cure progress** — `CURE: X/7` green + `NEED: [item]` grey
- [x] **Bottom-right: Form label** — `HUMAN` / `WEREWULF` / `TRANSFORMING` always visible
- [x] **Inventory empty outlines** — 3 fixed slots bottom-center; `#6A6A8A` outline always drawn, `#FFDD44` fill when occupied

---

## ⏱ Day Cycle

- [x] **Shorten day for testing** — `ticksPerDay = 1800` in `EngineConfig.kt` (30 seconds at 60fps)
- [x] **Transformation canvas flash** — `GameUiState.transformFlashTicks = 20` on `TransformationStarted`; `#8844CC` Compose overlay fades over 20 frames in `AppRoot`

---

## 🗺 Start Room Design

- [x] **Remove HAZARD tiles from start room** — start room JSON uses FLOOR tiles only
- [x] **Add GUARD actor** — patrol path `(6,2)→(6,6)` at speed 1.5 in `room_002.json`
- [x] **Add HERB item** — `goblet_r002` item anchor at `(1.5, 2.5, 0)` in start room
- [x] **Cauldron visible** — `RoomSpecial.CauldronRoom` renders pulsing green cauldron with bubble particles
- [x] **Room teaches the game loop** — guard patrol visible immediately; item near spawn; cauldron at center
