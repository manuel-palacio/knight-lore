# Phase 8 — Immersion & Life

> Goal: Transform the game from a technical demo into an experience that provokes genuine
> curiosity and dread. Every room must feel inhabited, ancient, and dangerous.
> The player must feel small — not lost.
>
> **The central problem right now:** the character is a legless trapezoid floating across a
> tiled floor. Enemies are rectangles and cubes. There is no weight, no shadow, no sound,
> no sense that anything actually *moves* through the world. Fix that first.

---

## 🧙 Character — Fix the Legless Nun

### Legs & Walk Cycle
- [ ] **Add legs** — two thin isometric quad shapes below the cloak hem, color `#2A1840`;
  left leg at `ox-2`, right leg at `ox+14`, each `4px wide × 10px tall`, drawn as `ColorPath`
  behind cloak (`DrawLayer.PLAYER, subIndex = -1`)
- [ ] **Walk animation** — when `player.velocity` is non-zero, oscillate left/right leg Y
  with a `sin((tick * 0.2 + legOffset).toFloat()) * 5f` offset; legs swing opposite phase
- [ ] **Feet** — tiny 4×3px flat ovals at the bottom of each leg in `#1A0A30`; they should
  angle slightly with each step (rotate 15° at peak swing)
- [ ] **Cloak sway** — when moving, apply a `sin(tick * 0.15) * 3f` horizontal wobble
  to `hemLeft` and `hemRight` points only; hood stays still — cloak billows
- [ ] **Landing squash** — on first tick after `player.onGround` becomes true, compress
  legs by 3px and widen cloak by 4px; restore over 4 frames
- [ ] **Hand reach** — when player is near an item (within 1.5 grid units), extend a small
  arm/hand `ColorPath` (oval 6×4px, color `#C8A882`) from shoulder toward the item

### Idle & Presence
- [ ] **Idle breathing** — when velocity is zero, add a slow `sin(tick * 0.05) * 1f`
  scale on head + shoulder width (the bob already handles Y, this adds X life)
- [ ] **Shadow** — draw a flat dark ellipse `70×14px, #00000050` at player feet pos
  (always at `gz=0`, floor level, no bob); size scales with player height above floor:
  shrinks as player jumps
- [ ] **Orientation cues** — currently facing only shifts eyes. Also shift shoulder
  width: facing NE/SE = compress left shoulder; facing NW/SW = compress right shoulder

---

## 👾 Enemies — Give Them Bodies

### GUARD (currently a flat red rectangle)
- [ ] **3-face isometric torso** — replace `ColorRect` body with a 3-face block in
  `#6A0000` (top), `#3A0000` (left), `#4A0000` (right); dimensions 0.7×0.7×1.1 grid
- [ ] **Helmet dome** — `ColorOval(14f, 9f, #555566)` above torso
- [ ] **Patrol step animation** — bob Y ±2px at pace matched to patrol speed
- [ ] **Shadow** — same floor shadow ellipse as player, 50×10px
- [ ] **Attack telegraph** — when guard is within 2 grid units of player, flash visor
  from `#FF4400` → `#FFAA00` → `#FF4400` over 20 ticks before damage lands

### GHOST (currently a plain oval)
- [ ] **Tattered hem** — add 3–4 downward spikes beneath the oval base:
  irregular `ColorPath` triangles in `#8888BB` at 40% alpha
- [ ] **Phase flicker** — every `11 ticks` invert ghost alpha between `0xB4` and `0x70`
- [ ] **Trail particles** — emit 2px `ColorOval` particles in ghost's wake, fading over
  30 ticks, color `#AAAAEE20`

### ROBOT (currently a plain cube)
- [ ] **Antenna** — 1px vertical `Line` from top-center, height 8px, color `#888888`;
  small `ColorOval(3×3)` at tip
- [ ] **Walk treads** — two small dark rectangles `10×4px` at base, alternating horizontal
  offset ±2px each 6 ticks
- [ ] **Scanning eye** — red eye sweeps left/right using `sin(tick*0.08)*5f` X offset

### BALL (currently a circle with one spin line)
- [ ] **Proper isometric bounce** — derive screen Y from `abs(sin(tick * 0.12)) * -20f`
  *above* normal floor position; don't just float at floor level
- [ ] **Squash on bounce** — at bounce peak (Y near 0), scale oval `20×20`;
  at floor contact scale `24×12` (squash)
- [ ] **Bounce shadow** — same floor shadow ellipse as player; scale inversely with
  height (bigger + more opaque when near floor)

### DRUID (currently 70% player shape, looks like a mini-me)
- [ ] **Distinguishing silhouette** — widen shoulders disproportionately to height;
  add a staff: 1px `Line(ox+30, oy, ox+26, oy-80)` color `#6A5020`;
  small crystal `ColorOval(4×4, #AAAAFF)` at staff tip
- [ ] **Ritual glow** — animated `ColorOval` halo at feet, `#7744FF15`, pulsing
  radius `36–44px` over 90 ticks
- [ ] **Different hood** — Druid hood peak is centered (not offset like player);
  adjust polygon peak point to `cx+12*ws` not `cx+12*ws + lateral shift`

---

## 🌍 World — Make Rooms Feel Real

### Floor — More Material, Less Tile Grid
- [ ] **Large stone slab variation** — every 3rd floor tile use a slightly lighter
  dither `#1E1E2E/#2A2A3E` to break up the uniform checkerboard into irregular slabs
- [ ] **Blood smears** — 1-in-30 tiles: draw an asymmetric `ColorPath` blob in
  `#3A0000` (dark dried blood) not aligned to tile grid; small splatter dots around it
- [ ] **Bones** — 1-in-40 tiles: draw 2 thin crossed `Line` segments in `#5A5A4A`,
  width 1px, representing scattered bones
- [ ] **Rubble** — 1-in-15 tiles near walls: draw 2–3 tiny `ColorPath` triangles in
  `#2A2A3A` (broken stone chips)

### Walls — More Architecture
- [ ] **Torch sconce** — every 4th wall column on NORTH wall, at `gz=1.5`:
  draw a small bracket (`Line` in `#5A4020`) + flame oval `ColorOval(6×8, #FF8800CC)`
  with a glow halo `ColorOval(18×14, #FF660011)`
- [ ] **Torch flicker** — flame oval Y offset `sin(tick * 0.3 + sconce_seed) * 1.5f`;
  glow alpha oscillates between `0x11` and `0x22`
- [ ] **Torch light cast** — on floor tiles within 2 grid distance of a torch X position,
  add a warm tint overlay tile: `ColorPath` in `#FF660008`
- [ ] **Chains** — 1-in-8 wall columns: draw two 1px `Line` segments in `#3A3A4A`
  hanging from `gz=2.8` downward ~20px; end with a small oval `6×4px` link
- [ ] **Cracks in walls** — 1-in-6 wall columns: draw an irregular `ColorPath` crack
  polygon (3–4 points, 2px wide strip) in `#0A0808` across the inner wall face
- [ ] **Water seep** — 1-in-10 wall columns: draw a thin vertical `Line` in
  `#1A2A2A` from `gz=1.5` to `gz=0`; small puddle `ColorOval(8×4, #1A3A2A)` at base

### Blocks — Not Just Cubes
- [ ] **Worn edge variant** — 1-in-4 blocks: bevel the top-face outline by offsetting
  corner points 1px inward, giving a worn-stone look
- [ ] **Carved rune on side face** — 1-in-6 blocks: draw a simple 3-line rune shape
  (3 `Line` segments) in `#4A4A6A` on the left (south) face
- [ ] **Lichen spots** — 1-in-8 blocks: 2–3 `ColorOval(4×3, #2A4A2A)` blobs
  scattered across the top face

---

## 🏚 Room Variety — Multiple Room Types

Currently every room looks identical. Rooms need a declared `roomType` that affects rendering.

- [ ] **Add `roomType: RoomType` to `RoomDefinition`** — types: `DUNGEON`, `CRYPT`,
  `THRONE_ANTECHAMBER`, `CAVERN`, `FLOODED`
- [ ] **CRYPT** — floor tiles darker `#101018/#1A1A28`; every 5th tile has a
  coffin-lid shape (flat `ColorPath` rectangle with inset cross); walls have more
  water seep; no torches — lit only by one candelabra object in center
- [ ] **CAVERN** — irregular wall shape (outer wall blocks have jitter on all 4 corners);
  floor tiles use a rounder dither pattern; stalactites hanging from ceiling projection
  (tall narrow triangles from above, color `#2A2A3A`)
- [ ] **FLOODED** — floor has a water-plane overlay: semi-transparent `ColorPath` in
  `#00224499` covering all floor tiles; ripple lines `Line(#002244AA, 1px)` animated
  with `sin(tick * 0.08 + tileX * 0.5)`; character legs clipped at water line
- [ ] **THRONE_ANTECHAMBER** — two large decorative columns (3×3 block clusters)
  either side of room center; a raised dais platform (floor tiles at `gz=1`)

---

## 🗺 Exploration — Sense of Space Beyond the Room

The game must make you *want* to go through the next door.

- [ ] **Exit preview void** — in `doorArchway()`, add a parallax hint:
  behind the void rect draw 2–3 faint floor diamonds at 25% alpha in the
  color of the adjacent room type (`#14141E` for dungeon, `#101018` for crypt)
- [ ] **Distant sound hint** — at room entry, if an adjacent room contains a GUARD,
  play a distant footstep audio cue; if it contains a GHOST, play a distant moan
  (requires `AudioManager` from Phase 6 — add to Phase 9 if audio not ready)
- [ ] **Room naming** — draw room name at the top of viewport (below HUD bar) on
  room entry: fade in over 60 ticks, hold 120 ticks, fade out 60 ticks;
  name in `#6A6A8A` 14sp, styled like a dungeon inscription
- [ ] **Unexplored door marker** — on exits leading to rooms not yet visited by the
  player, draw a small `?` glyph near the archway threshold, pulsing alpha;
  clear it once player has visited that room
- [ ] **Map memory** — track `visitedRooms: Set<RoomId>` in `PlayerState`;
  expose a minimal map overlay toggled by a button: dots for visited rooms,
  lines for connections, highlight current room

---

## ⚡ Feedback — Make Actions Feel Real

- [ ] **Footstep marks** — when player moves, leave a tiny `ColorOval(3×2, #1A1A2A)`
  footprint on the floor that fades over 120 ticks; alternate left/right foot
- [ ] **Item pickup burst** — on item pickup: spawn 6 particles radiating outward
  from item position, color `#FFDD44`, fade over 20 ticks
- [ ] **Damage screen crack** — on player taking damage: draw 4–6 thin diagonal
  `Line` segments across the full viewport in `#FF000020`, fading over 30 ticks;
  distinct from the blink flash
- [ ] **Transformation warning shudder** — when < 5 seconds until transformation:
  apply a ±2px random viewport X offset every 6 ticks (screen shake)
- [ ] **Transformation complete ground shockwave** — on `TransformationStarted`:
  draw an expanding isometric diamond outline at player feet, scale 0→3 grid units
  over 30 ticks, color `#8844CC`, fading alpha
- [ ] **Door transition — not just a wipe** — on room exit: flash the exit void
  to full white `#FFFFFFCC` for 3 ticks, then black fill for 8 ticks, then fade into
  new room; gives a "stepping through" sensation

---

## 🎨 Atmosphere — Commit to the Aesthetic

- [ ] **Consistent outline weight** — every `ColorPath` entity (player, actors, blocks)
  MUST emit a stroke outline `DrawPayload.ColorPath` with the same outline color
  `#0A0808` at `subIndex - 1`; currently outlines are missing on many shapes
- [ ] **Restrict color palette strictly** — audit ALL `Colors.*` constants;
  every color must map to one of the 6 palette entries or a transparent overlay of them;
  remove all "close but different" near-duplicates like `#141422` vs `#141420`
- [ ] **Consistent shadow direction** — all 3-face block highlights and shadows must
  agree on light source: top-left = light; bottom-right = shadow; no exceptions
- [ ] **HUD font flavor** — replace default system font with a pixelated/monospace
  Compose font loaded from assets; suggest `Press Start 2P` or `VT323` from Google Fonts;
  all HUD text uses this font
- [ ] **Background sky** — behind the room (rendered first, `DrawLayer.BACKGROUND`):
  a vertical gradient from `#050508` (top) to `#0A0A12` (bottom) via 4 stacked
  `ColorRect` bands; gives depth without being distracting
- [ ] **Room transition darkness** — between rooms, render the background sky only;
  no room geometry; this prevents geometry pop-in

---

## 🔊 Audio Groundwork (stub only — full impl Phase 9)

- [ ] **Footstep trigger** — call `audioManager.play(SFX.FOOTSTEP)` every 16 ticks
  when player is moving; `SFX.FOOTSTEP` is a stub no-op until Phase 9
- [ ] **Damage trigger** — call `audioManager.play(SFX.DAMAGE)` on `GameEvent.PlayerDamaged`
- [ ] **Item pickup trigger** — call `audioManager.play(SFX.ITEM_PICKUP)` on `GameEvent.ItemCollected`
- [ ] **Transformation trigger** — call `audioManager.play(SFX.TRANSFORM)` on
  `GameEvent.TransformationStarted`
- [ ] **Ambient loop** — `audioManager.startLoop(AMBIENT.DUNGEON)` on room entry;
  stub returns immediately; Phase 9 provides actual audio files
