# Phase 7 — Visual Polish & Feel

> Goal: Make the game look and feel like a professional, atmospheric dungeon game.  
> Reference aesthetic: Knight Lore (1984) · Monkey Island · Bitmap Brothers — gritty, hand-drawn, restricted palette, comic-book outlines.

---

## 🐛 Bug Fixes

### Collision & Movement
- [ ] **Floor not in solids list** — add implicit floor `SolidVolume` covering entire room at Z=0 so player never falls through (`MovementSystem.kt`)
- [ ] **Can't land on top of blocks** — reduce `ENTITY_HEIGHT` from `1.8f` to `0.9f`; ensure block top face at `gridZ+1` is the landing surface
- [ ] **Character disappears into walls** — fix painter's algorithm: merge `DrawLayer` + `depthKey` into unified depth sort; use block top-face Z for depth key
- [ ] **Character head clips through overhead blocks** — for blocks directly above player XY footprint, force block to same `DrawLayer.PLAYER` so depth key alone decides draw order

### Game Loop
- [ ] **Player cannot move after restart** — call `gameEngine.initialize()` on restart, never reuse dead `GameState`
- [ ] **Stale input on restart** — emit one frame of empty `FrameInput` before resuming input after restart
- [ ] **Transformation kills player** — set `damageCooldownTicks = TRANSFORM_TICKS + RECOVERY_TICKS + 10` when transformation begins; player is fully invincible during transform
- [ ] **Respawn on hazard → instant game over loop** — validate `respawnPosition` is not within 2 grid units of any `HAZARD` tile; offset if needed
- [ ] **Damage cooldown too short** — increase default `damageCooldownTicks` from `60` to `120`

### Room & Walls
- [ ] **4 thick wall blocks visible — feels outside the room** — remove South and East wall loops from `buildWalls()`; only North (y=0) and West (x=0) walls are ever camera-visible
- [ ] **Walls too short / squat** — increase wall height loop from `gz in 0 until 2` to `gz in 0 until 3`
- [ ] **Room feels flat** — increase `BLOCK_HEIGHT` from `32f` to `40f` in `TileMetrics.kt`
- [ ] **Room sits too low on screen** — subtract `viewportH * 0.08f` from Y in `IsoProjector.roomOffset()`

---

## 🎨 Visual Overhaul

### Core Rendering Rules
- [ ] **No anti-aliasing** — set `paint.isAntiAlias = false` on all scene draw calls; pixels must be crisp
- [ ] **Dark outline on every shape** — after filling any shape, stroke the same path with `Paint.Style.STROKE`, strokeWidth `2f`, color `#0A0808`
- [ ] **Restricted 6-color palette** — remap all colors to: `#0A0808` · `#1C1C2C` · `#3A3A5A` · `#6A6A8A` · `#AA2200` · `#228822`
- [ ] **Scanline overlay** — draw horizontal lines every 4px across full canvas, 1px tall, `#00000018`, after scene before HUD

### Floor Tiles
- [ ] **Dithered fill** — replace solid fill with checkerboard 2×2px dots alternating `#16161E` / `#252535`
- [ ] **Top-edge highlight only** — draw top-left and top-right diamond edges as 1px `#6A6A8A`; no other edges highlighted
- [ ] **Pixel jitter on edges** — offset each polygon point by seeded random `±1.2f` using `(gridX * 31 + gridY * 17)` seed; stable across frames

### Walls
- [ ] **Brick rows** — horizontal mortar gaps `#0E0E18` 2px; brick face `#1C1C2C`; top highlight `#4A4A6A`
- [ ] **Left face 15% darker than right face**
- [ ] **Inner faces only** — North wall draws south-facing inner face only; West wall draws east-facing inner face only
- [ ] **Wall corner particles** — tiny 2–3px irregular blobs `#2A2A3A`, seep from inner wall face, drift upward very slowly, 2–3 second lifetime, stable spawn from inner face not inside wall geometry

### Solid Blocks
- [ ] **3-face brick shading** — top `#3A3A5A`, left `#1C1C2C`, right `#14141E`
- [ ] **Plague cross on top face** — two rectangles forming `+` in `#3A3A55`
- [ ] **Inner shadow border** — 3px inset `#0A0A14` on all edges

### Hazard Tiles
- [ ] **Replace X placeholder** — draw dark pit `#1A0000`, 5–7 metallic spike triangles `#4A4A4A` with tips `#888888`, red glow `#FF000022` around edge

### Doors / Exits
- [ ] **Remove solid door block** — delete `doorBlock()` function entirely
- [ ] **Draw open archway** — two thin stone pillars either side of gap, dark void `#050508` between them, faint threshold glow `#3A3A6033` at floor level

### Atmosphere
- [ ] **Vignette** — radial gradient from transparent center to `#000000BB` at edges, centered on player, drawn after scene before HUD
- [ ] **5% floor puddles** — faint green overlay `#00FF0010` on randomly selected floor tiles (seeded per room)

---

## 🧙 Character & Actors

### Player Character
- [ ] **Replace rectangle+oval+triangle** — draw player as single connected isometric cloak silhouette using one `ColorPath` polygon (hood peak, shoulders, flare, hem)
- [ ] **Cloak fill** — `#1A0A2A` with 3px stroke outline `#0A0808` drawn first
- [ ] **Face** — small pale oval `#C8A882`, hollow dark eye sockets
- [ ] **Glowing eyes** — 2px dots `#7FFF00` with 4px soft glow halo
- [ ] **Bob animation** — all character parts share single `bobY` offset, ±2px over 1 second
- [ ] **Facing eye shift** — eye positions shift ±3px based on `player.facing`
- [ ] **Damage blink** — flash `#FF4444` tint when `damageCooldownTicks > 0`

### Werewolf Form
- [ ] **Distinct silhouette** — same cloak shape but `#2A0A4A`, 10% wider
- [ ] **Wolf ears** — two upward triangles at hood peak
- [ ] **Orange-red eyes** — `#FF4400` replacing green

### Actors (all types)
- [ ] **Actors render at all** — draw `actorStates` in painter's algorithm sort alongside tiles and player
- [ ] **GUARD** — tall rectangle `#8B0000`, shoulder pads (two small squares top sides), visor slit `#FF4400`
- [ ] **GHOST** — tall oval `#AAAAEE` at 70% alpha, no legs, faint trail below
- [ ] **ROBOT** — blocky 3-face cube `#444466`, single red eye `#FF0000`
- [ ] **DRUID** — hooded figure `#2A1A00`, yellow eyes `#FFAA00`
- [ ] **BALL** — circle `#CC4400`, spin line, bounces vertically

### Items
- [ ] **Glowing oval** — `#FFDD44` with outer glow ring `#FFDD4433`
- [ ] **Pulse animation** — ±2px scale over 1.5 seconds

---

## 📊 HUD

- [ ] **Semi-transparent bars** — full-width `#000000AA` rectangles top 52px and bottom 52px before drawing any HUD text
- [ ] **Top-left: Day counter** — `DAY N` white 22px + orange progress bar `120×6px` below using `time.phaseProgress`
- [ ] **Top-center: Transformation warning** — `⚠ NIGHT FALLS IN Ns` orange `#FF8800` 26px, pulsing alpha, only during DUSK/DAWN; `ticksUntilTransform / 60` for seconds
- [ ] **Top-right: Lives** — skull diamonds `#CC2222`, 20px each, 26px spacing
- [ ] **Bottom-left: Cure progress** — `CURE: X/7` green `#44FF88` 20px + `NEED: [item]` `#AAAAAA` below
- [ ] **Bottom-right: Form label** — `HUMAN` or `WEREWULF` always visible in matching color
- [ ] **Inventory empty outlines** — show empty slot outlines even when inventory count is 0

---

## ⏱ Day Cycle

- [ ] **Shorten day for testing** — set default `ticksPerDay = 1800` (30 seconds at 60fps) in `EngineConfig.kt`
- [ ] **Transformation canvas flash** — on `GameEvent.TransformationStarted`, overlay `#8844CC44` fading over 20 frames

---

## 🗺 Start Room Design

- [ ] **Remove HAZARD tiles from start room** — replace with FLOOR; player must never die during first transformation
- [ ] **Add GUARD actor** — patrol between two points, immediately visible threat
- [ ] **Add HERB item** — glowing, near spawn, teaches item pickup
- [ ] **Cauldron visible** — place at room center, glowing green `#00FF44`, animated bubbles
- [ ] **Room teaches the game loop** — move → avoid enemy → pick up item → find cauldron
