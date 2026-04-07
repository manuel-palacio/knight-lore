# Phase 9 — Morning Critical Fixes (Apr 7, 2026)

> Discovered during playtest: core prototype unplayable due to missing/broken visuals & mechanics.
> No puzzles, character unrecognizable, enemies nonexistent.

---

## 🔥 Priority 1: Visual Disasters (2hr)

### Character (Legless Armless Trapezoid)
- [ ] **Arms** — 2 `ColorPath` quads extending from shoulders: left `ox-14,oy-42 → ox-18,oy-32 → ox-20,oy-34 → ox-16,oy-44`, mirror right
- [ ] **Legs** — 2 `ColorPath` quads below hem: left `ox-6,oy-8 → ox-2,oy+2 → ox-6,oy+8 → ox-10,oy+2`, mirror right
- [ ] **Feet** — 2 `ColorOval(5×3)` at leg bottoms, angle with walk cycle
- [ ] **Walk cycle** — `walkFrame = (tick * 0.25f % 4f)`: leg/arm swing opposite phase, ±6px leg, ±4px arm
- [ ] **Jump pose** — When `!player.onGround`: arms raise to `oy-52`, legs compress to 70% height
- [ ] **Werewolf silhouette** — Distinct 12-pt polygon: hunched shoulders, claws at hem, tail stub, fur `DitheredPath(#2A0A4A, #1A081E)`, `ws = 1.25f`
- [ ] **Werewolf snout** — `ColorPath` wedge replacing oval face; fangs: 2px white triangles inside

### Enemies (Green Blocks)
- [ ] **PatrolEnemy → goblin** — Replace 3-face block with: `ColorOval(16×20, #228822)` body, ear triangles, `ColorOval(2×2, #FFAA44)` eyes
- [ ] **Spawn in start room** — 1 goblin circling center 4 tiles + 1 `ActorType.GUARD` near north wall
- [ ] **ActorType.GUARD visuals** — Helmet `ColorOval(16×10, #4A0000)` + body `ColorRect(12×20, #6A0000)` + visor `Line(#FF4400)`
- [ ] **GHOST** — Tattered hem triangles `#8888BB40`, phase flicker every 11 ticks, trail particles
- [ ] **BALL** — Proper bounce `abs(sin(tick*0.12))*-20f`, squash on landing `24×12`, bounce shadow

### Perspective (Ceiling Effect)
- [x] **Wall height** — Change `for (gz in 0 until 3)` → `for (gz in 0 until 2)` in both `wallBlockNorth()` and `wallBlockWest()`
- [x] **Block depth layer** — Implemented via depth key comparison: `if (dk > playerDk) FOREGROUND else BLOCK` (applied to both static and dynamic blocks)
- [ ] **Room Y-offset** — `IsoProjector.roomOffset()`: change `viewportH * 0.08f` → `viewportH * 0.12f`

---

## 🐛 Priority 2: Polish Bugs (45min)

### Hazard Tiles
- [ ] **Remove all "X" tiles** — Grep `input/` JSON for `"X"` or `symbol: "X"`; all hazards must be `TileType.HAZARD` with spike pit rendering, no legacy cross-line renderer
- [ ] **Hazard density** — Start room: 0 hazards; rooms 2–5: 1–2 max; later rooms: 4–6 max (≤15% of tiles)

### Desktop HUD
- [ ] **Split scene/HUD draw passes** — Filter `DrawLayer.HUD` out of `withTransform { scale(2f) }` block; render HUD commands at native resolution after
- [ ] **Add `DesktopHud` composable** — Day counter + transformation warning + lives + cure progress + form label

### Door / Exit
- [x] **South/East exits missing** — All 4 sides have exit markers: arch pillars, bright threshold floor tile, glow line (75% opacity), void rectangle

---

## 🧩 Priority 3: Puzzles (60min)

### Block Physics
- [x] **`BlockState`** — Added to `GameState`: `gridX/Y/Z`, `velocityZ`, `fallingTicks`, `pushable`; dynamic blocks rendered via `buildDynamicBlockCommands()` with pushable arrow glyph and falling crack/glow
- [x] **Push** — Player walks into adjacent pushable block → block moves 1 grid in direction if destination empty (`BlockPhysicsSystem`)
- [x] **Fall** — Block with player on top: `fallingTicks++`; at 120 ticks → `velocityZ` grows until `gridZ == 0` (`BlockPhysicsSystem`)
- [ ] **Werewolf jump** — `jumpHeight = if (werewulf) 1.4f else 1.0f`

### Start Room Puzzle
- [ ] **Layout** — 4 pushable blocks around center ✓ (room_001.json), spike pit center ✗, herb elevated on block above pit ✗
- [ ] **Teaches** — Push block → stand → it falls → use fallen block as stair → grab herb
- [ ] **No hazards in start room** — Ensure spawn position never within 2 grid units of any hazard

---

## ✅ Success Criteria

```
[ ] Character has visible arms, legs, feet at all times
[ ] Werewolf looks like a feral beast, not a palette swap
[ ] 1 goblin + 1 guard visible and moving in start room
[ ] No X-tile placeholders anywhere
[ ] Push block → climb → grab herb loop works
[ ] HUD visible on desktop (day, lives, cure)
[x] Walls no longer clip player head (depth key fix)
```
