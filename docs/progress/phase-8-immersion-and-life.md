# Phase 8 — Immersion & Life

> Goal: Transform the game from a technical demo into an experience that provokes genuine
> curiosity and dread. Every room must feel inhabited, ancient, and dangerous.
> The player must feel small — not lost.
>
> **Status: IMPLEMENTED** — Character redesigned as layered armored adventurer; all enemies
> overhauled; world filled with atmospheric details; room types added; exploration tracking
> live; feedback effects wired; audio stubs in place.

---

## 🧙 Character — Fix the Legless Nun

### Legs & Walk Cycle
- [x] **Add legs** — two `ColorPath` quad shapes as separate leg rectangles drawn at subIndex -2 (behind cape and body); boots at feet
- [x] **Walk animation** — `sin(tick * 0.2) * 5f` oscillation on left leg, opposite phase on right; legs swing while `movementState == WALKING`
- [x] **Feet/Boots** — dark oval boots (`#0A0818`) at bottom of each leg with walk offset
- [x] **Cloak/Cape sway** — `sin(tick * 0.15) * 3f` horizontal wobble applied to cape hem points when walking
- [ ] **Landing squash** — deferred; requires per-frame state delta tracking
- [ ] **Hand reach** — deferred; requires item proximity tracking in render

### Idle & Presence
- [x] **Idle breathing** — `sin(tick * 0.05) * 1f` extra width scale on chest/hood when `movementState == IDLE`
- [x] **Shadow** — flat dark ellipse `64×12px` (shrinks to `52×9px` when airborne) at floor level with no bob
- [x] **Orientation cues** — shoulder width compressed via `shoulderCompress` variable driven by `player.facing`

### Full character redesign (replaces single-polygon nun shape)
- [x] **Shadow** at floor level
- [x] **Legs + Boots** behind everything (subIndex -2)
- [x] **Cape** — short, dramatic triangular sweep (not floor-length), swaying when moving (subIndex -1)
- [x] **Tunic** — waist-to-mid-thigh hexagonal armor skirt (subIndex 0)
- [x] **Chest armor plate** — trapezoidal, compressed/expanded by facing direction (subIndex 1)
- [x] **Belt + Buckle** — horizontal band with small oval buckle (subIndex 2-3)
- [x] **Pauldrons** — angular shoulder armor plates with highlight edge (subIndex 2-3)
- [x] **Arms + Gauntlets** — forearm lines with oval hand ovals (subIndex 2)
- [x] **Neck** — dark rect connector (subIndex 3)
- [x] **Hood** (human) — pointed 7-point angular cowl; face oval + glowing green eyes (subIndex 3-5)
- [x] **Werewulf head** — 9-point snarling wolf shape with ears, snout, glowing red eyes, fur X-lines (subIndex 3-5)
- [x] **Armor banding** — 2 horizontal chest-plate segmentation lines (human only, subIndex 3)
- [x] **Transformation energy burst** — 3 expanding purple diamond rings during transformation, screen flash at start/end

---

## 👾 Enemies — Give Them Bodies

### GUARD
- [x] **3-face isometric torso** — `#6A0000` top, `#3A0000` left, `#4A0000` right; 0.7×0.7×1.1 grid
- [x] **Helmet dome** — `ColorOval(14f, 9f, #555566)` above torso
- [x] **Patrol bob** — `sin(tick * 0.15) * 2f` Y offset
- [x] **Shadow** — `50×10px` dark ellipse at floor level
- [x] **Visor flicker** — alternates `#FF4400`/`#FF8800` every 10 ticks

### GHOST
- [x] **Phase flicker** — alpha alternates between `0xB4` and `0x70` every 11 ticks
- [x] **Tattered hem** — 4 downward spike triangles in `#8888BB` at 40% alpha
- [x] **Trail particles** — 3 fading 2px ovals in wake, `#AAAAEE` at low alpha

### ROBOT
- [x] **Antenna** — 1px vertical line (8px tall, `#888888`) + small oval tip
- [x] **Walk treads** — two 10×4px dark rects at base, alternating ±2px every 6 ticks
- [x] **Scanning eye** — red eye sweeps `sin(tick*0.08)*5f` X offset

### BALL
- [x] **Proper isometric bounce** — `abs(sin(tick * 0.12)) * 20f` height above floor
- [x] **Squash on bounce** — at floor: `24×12`; at peak: `20×20`
- [x] **Bounce shadow** — inversely scales with height; more opaque near floor

### DRUID
- [x] **Staff** — 1.5px line from shoulder to above head in `#6A5020`
- [x] **Crystal tip** — `4×4px ColorOval(#AAAAFF)` at staff top
- [x] **Ritual glow halo** — pulsing `#7744FF15` oval at feet, 36-44px radius over 90 ticks

---

## 🌍 World — Make Rooms Feel Real

### Floor
- [x] **Large stone slab variation** — every 3rd tile (`(gridX+gridY)%3==0`) uses lighter dither `#1E1E2E/#2A2A3E`
- [x] **Blood smears** — 1-in-30 tiles: asymmetric 5-point `ColorPath` blob in `#3A0000` + 3 splatter dots
- [x] **Bones** — 1-in-40 tiles: two crossed `Line` segments in `#5A5A4A`
- [x] **Rubble** — 1-in-15 tiles near walls: 2-3 tiny `ColorPath` triangle chips in `#2A2A3A`

### Walls
- [x] **Torch sconce** — every 4th north/west wall column: bracket line + flickering flame oval `#FF8800CC` + glow halo
- [x] **Torch flicker** — flame Y offset `sin(tick * 0.3 + seed) * 1.5f`; glow alpha oscillates
- [x] **Torch light cast** — warm `#FF660008` tint overlay on 2-3 nearby floor tiles
- [x] **Chains** — 1-in-8 wall columns: two `Line` segments hanging from `gz=2.8` + oval link
- [x] **Cracks** — 1-in-6 wall columns: narrow 6-point `ColorPath` polygon in `#0A0808`
- [x] **Water seep** — 1-in-10 wall columns: thin vertical line `#1A2A2A` + puddle oval `#1A3A2A`

### Blocks
- [x] **Worn edge variant** — 1-in-4 blocks: inset top-face outline (`0.06f` bevel) in `#2E2E4A`
- [x] **Carved rune on left face** — 1-in-6 blocks: 3 `Line` segments in `#4A4A6A`
- [x] **Lichen spots** — 1-in-8 blocks: 2-3 `ColorOval(4×3, #2A4A2A)` blobs on top face

---

## 🏚 Room Variety — Multiple Room Types

- [x] **`RoomType` enum** — `DUNGEON`, `CRYPT`, `CAVERN`, `FLOODED`, `THRONE_ANTECHAMBER` added to `RoomDefinition`
- [x] **CRYPT** — darker floor tiles `#101018/#1A1A28`; coffin-lid shapes every 5th tile with inset cross
- [x] **CAVERN** — stalactite triangles hanging from wall top (`#2A2A3A`) every 5th column
- [x] **FLOODED** — semi-transparent `#88_002244` water plane over all floor tiles + animated ripple lines
- [x] **THRONE_ANTECHAMBER** — two decorative 3-block-tall column markers; raised dais platform tiles at `gz=1`

---

## 🗺 Exploration — Sense of Space Beyond the Room

- [x] **`visitedRooms: Set<RoomId>`** — tracked in `GameState`; populated by `RoomTransitionSystem` and initialized with start room
- [x] **Room naming** — `roomNameTicks` (240t) with 3-phase alpha (fade-in 60t → hold 120t → fade-out 60t); name displayed below top HUD bar in `#6A6A8A`
- [x] **Unexplored door marker** — 3 pulsing dots near archway when target room not yet visited; clears on visit
- [x] **Explored counter** — `EXP: N` shown in top-right HUD below day counter
- [ ] **Full map overlay** — deferred to Phase 9 (requires room layout data in UI layer)

---

## ⚡ Feedback — Make Actions Feel Real

- [x] **Footstep marks** — small 4×2px dark oval (`#1A1A2A`) alternates left/right every 8 ticks when walking, offset behind player by facing, fades per cycle
- [x] **Item pickup burst** — `itemPickupFlashTicks: 20` golden `#FFDD44` shimmer overlay at 15% alpha on `ItemPickedUp`
- [x] **Damage screen crack** — `damageScreenCrackTicks: 30` draws 4 red diagonal `drawLine` segments across viewport fading to 12% alpha on `PlayerDamaged`
- [x] **Transformation energy burst** — 3 expanding purple diamond rings around player during transformation sequence
- [x] **Transformation screen flash** — white-to-dark flash at transformation start/end via `ScreenFill`
- [x] **Door transition flash** — `doorTransitionTicks: 11` — white flash (3t) then black fill (8t) on `EnteredRoom`
- [ ] **Transformation warning shudder** — deferred (requires viewport X offset in render pipeline)

---

## 🔊 Audio Groundwork (stub only — full impl Phase 9)

- [x] **`NoopAudioManager.onEvent()`** — stub `when` block mapping all game events to commented audio calls: `PlayerDamaged → SFX_DAMAGE`, `ItemPickedUp → SFX_ITEM_PICKUP`, `TransformationStarted → SFX_TRANSFORM`, `EnteredRoom → AMBIENT_DUNGEON`, `JumpStarted → SFX_JUMP`, `Landed → SFX_LAND`
- [x] **Event wiring** — all audio-relevant events flow through `GameSessionCoordinator → GameEventHandler` already; `SoundManager.onEvent()` confirmed comprehensive

---

## 🌙 Day/Night Cycle Fix

- [x] **`ticksPerDay` increased** — from `1800` (30s) to `10800` (3 minutes) per day
- [x] **Transformation trigger moved** — from DUSK start to NIGHT start; DUSK is now correctly a warning-only phase; DAWN triggers werewulf→human return at DAY start
- [x] **`TransformationStarted` event** — fires at NIGHT/DAY phase boundaries (not DUSK/DAWN)

---

## Desktop HUD

- [x] **Scene/HUD split** — scene commands rendered inside 2× scale transform; HUD commands rendered at native resolution
- [x] **`DesktopHud` composable** — top bar (DAY counter + orange progress bar + night warning + lives) and bottom bar (CURE count + next item + inventory slots + form label)
