# Knight Lore — Sprite Sheet Asset List & AI Generation Prompts

**Purpose:** Complete list of every sprite sheet needed, with exact dimensions and copy-paste prompts for ChatGPT/DALL-E image generation.

**Workflow for each asset:**
1. Copy the prompt below into ChatGPT (with DALL-E) or Bing Image Creator
2. Download the generated PNG
3. Crop/resize to the exact dimensions listed
4. Place in `desktop/src/main/resources/sprites/` (Desktop) or `app/src/main/res/drawable/` (Android)
5. The game loads it automatically via `SpriteCache`

**Style reference:** Knight Lore ZX Spectrum / Game Boy Color — chunky pixel art, black outlines, strong silhouettes, 8-bit retro aesthetic.

---

## 1. PLAYER — Human Form

**File:** `sprites/player_human.png`
**Dimensions:** 224 × 48 px (7 frames × 32×48 each)
**Scale in game:** 2×

| Frame | Position | Description |
|-------|----------|-------------|
| idle_se | 0,0 | Standing, facing south-east |
| idle_sw | 32,0 | Standing, facing south-west |
| walk_se_0 | 64,0 | Walking SE, right foot forward |
| walk_se_1 | 96,0 | Walking SE, left foot forward |
| walk_sw_0 | 128,0 | Walking SW, right foot forward |
| walk_sw_1 | 160,0 | Walking SW, left foot forward |
| jump | 192,0 | Jumping (tucked legs) |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 7 character frames in a single horizontal row, each frame exactly 32×48 pixels. The character is a small adventurer/explorer in isometric 3/4 view style like Knight Lore (ZX Spectrum). He wears a wide-brimmed explorer hat (pith helmet), has a visible face with eyes under the hat shadow, a blue-grey tunic/shirt, brown belt, short green-brown trousers, and chunky brown boots. Arms hang freely at his sides with visible skin-colored hands. The style is chunky retro 8-bit pixel art with black outlines. Frames from left to right: 1) idle facing south-east, 2) idle facing south-west (mirrored), 3-4) walk cycle SE (two frames, legs apart then together), 5-6) walk cycle SW (mirrored), 7) jumping with tucked legs. No anti-aliasing, hard pixel edges, retro game aesthetic.
```

---

## 2. PLAYER — Werewolf Form

**File:** `sprites/player_wolf.png`
**Dimensions:** 240 × 56 px (6 frames × 40×56 each)
**Scale in game:** 2×

| Frame | Position | Description |
|-------|----------|-------------|
| idle_se | 0,0 | Standing, facing SE |
| idle_sw | 40,0 | Standing, facing SW |
| walk_se_0 | 80,0 | Walking SE frame 1 |
| walk_se_1 | 120,0 | Walking SE frame 2 |
| walk_sw_0 | 160,0 | Walking SW frame 1 |
| walk_sw_1 | 200,0 | Walking SW frame 2 |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 6 werewolf character frames in a single horizontal row, each frame exactly 40×56 pixels. The werewolf is an upright humanoid beast in isometric 3/4 view style like Knight Lore. It has a large head with pointed ears sticking up, fierce amber/orange eyes, visible fangs, a wide hunched muscular body with raised shoulder humps, long arms reaching below the knees with bone-white claws, thick legs in a wide power stance, and a curved tail behind. Dark brown fur with lighter chest. The style is chunky retro 8-bit pixel art with black outlines. Frames: 1) idle facing SE, 2) idle facing SW, 3-4) walk cycle SE (arms and legs counter-swinging), 5-6) walk cycle SW. Must look completely different from a human — threatening, bestial, heavy. No anti-aliasing.
```

---

## 3. PLAYER — Transformation Sequence

**File:** `sprites/player_transform.png`
**Dimensions:** 192 × 56 px (4 frames × 48×56 each)
**Scale in game:** 2×

| Frame | Position | Description |
|-------|----------|-------------|
| phase_1 | 0,0 | Human body starting to bulge |
| phase_2 | 48,0 | Hybrid — ears emerging, arms lengthening |
| phase_3 | 96,0 | Nearly wolf — wide shoulders, claws visible |
| phase_4 | 144,0 | Full wolf emerging from human shell |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 4 transformation frames in a horizontal row, each 48×56 pixels. Shows a human explorer morphing into a werewolf in isometric 3/4 view like Knight Lore. Frame 1: human body starts bulging, hat still on, body expanding. Frame 2: hybrid form — pointed ears emerging through hat, arms getting longer, shoulders widening. Frame 3: nearly complete wolf — hat fallen off, full snout visible, claws formed, body hunched. Frame 4: dramatic final burst — wolf fully emerged, human features gone. Chunky retro 8-bit pixel art, black outlines, exaggerated cartoon transformation. No anti-aliasing.
```

---

## 4. WALL TILESET

**File:** `sprites/tileset_walls.png`
**Dimensions:** 192 × 96 px (grid of tiles)
**Scale in game:** 1× (tiles match isometric grid)

**Layout (each cell 96×48 — one isometric tile face):**

| Position | Tile |
|----------|------|
| 0,0 | Wall south face — brick dither pattern (light) |
| 96,0 | Wall east face — brick dither pattern (darker shadow) |
| 0,48 | Wall top cap — diamond shape |
| 96,48 | Floor tile — dark stone slab |

**Prompt:**
```
Pixel art tileset on pure black background, 192×96 pixels total, arranged as a 2×2 grid of isometric tiles (each 96×48 pixels). Medieval castle dungeon style like Knight Lore. Top-left: wall face with horizontal brick/stone pattern in warm olive-tan colors with dark mortar lines. Top-right: same wall face but darker (shadow side). Bottom-left: isometric diamond shape for wall top cap in lighter stone color. Bottom-right: dark floor tile with subtle stone slab texture and thin grout lines. Retro 8-bit pixel art style, no anti-aliasing. Colors: warm olive/brown stone (not grey, not blue).
```

---

## 5. ARCHWAY TILES

**File:** `sprites/tileset_archway.png`
**Dimensions:** 288 × 96 px (3 tiles wide × 2 tall)

| Position | Tile |
|----------|------|
| 0,0 | Left jamb (wall column with arch start) |
| 96,0 | Arch keystone / lintel top |
| 192,0 | Right jamb (wall column with arch end) |
| 0,48 | Dark void (passage behind archway) |
| 96,48 | Threshold floor tile (lighter stone) |
| 192,48 | Arch curve segment |

**Prompt:**
```
Pixel art tileset on pure black background, 288×96 pixels total, 3×2 grid of isometric tiles (each 96×48). Medieval castle archway pieces like Knight Lore. Top row: left stone pillar/jamb with arch beginning to curve, center keystone/lintel block, right pillar with arch curve ending. Bottom row: pure black void (the passage through the door), lighter threshold floor stone, curved arch segment piece. Warm olive-tan stone colors with brick texture. Retro 8-bit style. These tiles compose together to form a complete rounded archway in the castle wall.
```

---

## 6. BLOCK TILESET

**File:** `sprites/tileset_blocks.png`
**Dimensions:** 288 × 48 px (3 tiles × 96×48 each)

| Position | Tile |
|----------|------|
| 0,0 | Block top face (isometric diamond) |
| 96,0 | Block left/south face |
| 192,0 | Block right/east face (darker) |

**Prompt:**
```
Pixel art tileset on pure black background, 288×48 pixels, 3 isometric block faces each 96×48 pixels. Medieval castle stone block like Knight Lore. Left: top face as an isometric diamond in light warm stone. Center: south-facing side with brick texture in medium olive-tan. Right: east-facing side in darker shadow stone. These three pieces compose to form a complete 3D isometric stone cube. Retro 8-bit pixel art, chunky stone texture, no anti-aliasing.
```

---

## 7. COLLECTIBLE ITEMS

**File:** `sprites/items.png`
**Dimensions:** 240 × 24 px (10 items × 24×24 each)

| Position | Item |
|----------|------|
| 0,0 | Crystal Ball — blue sphere on small base |
| 24,0 | Goblet — gold cup with stem |
| 48,0 | Wine Bottle — tall dark red bottle |
| 72,0 | Gem — pink diamond shape |
| 96,0 | Poison Vial — green bottle with skull label |
| 120,0 | Boot — brown leather boot |
| 144,0 | Teacup — blue cup with handle |
| 168,0 | Key — gold key with teeth |
| 192,0 | Torch — stick with flame |
| 216,0 | Skull — bone white with eye sockets |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 10 collectible item icons in a horizontal row, each 24×24 pixels. Medieval fantasy items for a dungeon game like Knight Lore. From left to right: 1) blue crystal ball on a small stand, 2) gold goblet/chalice with stem, 3) dark red wine bottle, 4) pink faceted gem/diamond, 5) green poison vial with cork, 6) brown leather boot, 7) blue and white teacup with handle, 8) gold key with circular bow and teeth, 9) wooden torch with orange flame, 10) white skull with dark eye sockets. Each item must be recognizable by silhouette alone. Chunky retro 8-bit pixel art, bright colors on black, no anti-aliasing.
```

---

## 8. ENEMIES — Guard

**File:** `sprites/enemy_guard.png`
**Dimensions:** 192 × 48 px (4 frames × 48×48 each)

| Frame | Position | Description |
|-------|----------|-------------|
| idle | 0,0 | Standing with halberd |
| walk_0 | 48,0 | Walk frame 1 |
| walk_1 | 96,0 | Walk frame 2 |
| attack | 144,0 | Halberd thrust |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 4 frames of a medieval castle guard in a row, each 48×48 pixels, isometric 3/4 view like Knight Lore. The guard wears dark steel armor, a sallet helmet with a small red plume, and carries a tall halberd weapon. Rigid upright military posture. Frames: 1) standing idle with halberd vertical, 2-3) walking patrol (two frames), 4) thrusting halberd forward. Dark metallic grey armor, red plume accent. Chunky 8-bit pixel art, black outlines, retro game style. No anti-aliasing.
```

---

## 9. ENEMIES — Ghost

**File:** `sprites/enemy_ghost.png`
**Dimensions:** 192 × 48 px (4 frames × 48×48 each)

| Frame | Position | Description |
|-------|----------|-------------|
| float_0 | 0,0 | Floating frame 1 |
| float_1 | 48,0 | Floating frame 2 (bobbing) |
| float_2 | 96,0 | Floating frame 3 |
| fade | 144,0 | Fading/transparent |

**Prompt:**
```
Pixel art sprite sheet on pure black background. 4 frames of a ghost enemy in a row, each 48×48 pixels, isometric 3/4 view like Knight Lore. The ghost is a translucent pale blue-white floating apparition with a tapering wispy body that fades to nothing at the bottom (no legs). It has two dark void eyes and trailing ethereal tendrils. Frames show a subtle floating bob animation — body drifts up and down, tendrils sway. Frame 4 is more transparent/faded. Semi-transparent, ethereal, spooky but retro. 8-bit pixel art style, no anti-aliasing.
```

---

## 10. ENEMIES — Druid

**File:** `sprites/enemy_druid.png`
**Dimensions:** 192 × 48 px (4 frames × 48×48 each)

**Prompt:**
```
Pixel art sprite sheet on pure black background. 4 frames of a dark druid/sorcerer in a row, each 48×48 pixels, isometric 3/4 view. Hunched figure in a dark hooded robe, holding a crooked wooden staff with a glowing green orb at the top. Skull-like face visible under the hood with dark eye sockets. Asymmetric posture — leaning on the staff. Frames: 1) idle, 2-3) shuffling walk, 4) casting spell (orb glows brighter). Dark brown/black robe, bone-colored face, green magic glow. Retro 8-bit pixel art. No anti-aliasing.
```

---

## 11. ENEMIES — Robot/Construct

**File:** `sprites/enemy_robot.png`
**Dimensions:** 192 × 48 px (4 frames × 48×48 each)

**Prompt:**
```
Pixel art sprite sheet on pure black background. 4 frames of a mechanical golem/construct in a row, each 48×48 pixels, isometric 3/4 view like Knight Lore. Boxy angular body made of dark metal plates with visible panel seams, a square head with a glowing green scanning eye/visor, segmented arms with piston joints, and blocky legs. Has a small antenna on the head. Frames: 1) idle with eye scanning, 2-3) walking with piston movement, 4) eye glow intensified. Dark steel grey, green eye accent. Geometric, angular, not organic. Retro 8-bit pixel art. No anti-aliasing.
```

---

## 12. PROPS — Room Set-Pieces

**File:** `sprites/props.png`
**Dimensions:** 288 × 96 px (various props in a grid)

| Position | Prop | Size |
|----------|------|------|
| 0,0 | Cauldron (bubbling, green glow) | 48×48 |
| 48,0 | Throne (stone, worn) | 48×48 |
| 96,0 | Altar (ritual circle on top) | 48×48 |
| 144,0 | Barred window (moonlight) | 48×48 |
| 192,0 | Hanging cage | 48×48 |
| 240,0 | Brazier (fire) | 48×48 |
| 0,48 | Chain cluster (hanging) | 48×48 |
| 48,48 | Torn banner (crimson) | 48×48 |
| 96,48 | Broken column | 48×48 |
| 144,48 | Torch sconce (wall-mounted) | 24×48 |
| 168,48 | Cobweb | 24×24 |
| 192,48 | Puddle | 48×24 |

**Prompt:**
```
Pixel art prop sprite sheet on pure black background, 288×96 pixels total. Medieval fantasy dungeon props in isometric 3/4 view like Knight Lore. Top row (each 48×48): 1) bubbling cauldron with green glow, 2) crumbling stone throne, 3) ritual altar with magic circle on top, 4) barred window with pale moonlight beam, 5) hanging iron cage, 6) standing brazier with orange fire. Bottom row: 7) cluster of hanging chains (48×48), 8) torn crimson banner on pole (48×48), 9) broken stone column (48×48), 10) wall-mounted torch sconce with flame (24×48), 11) corner cobweb (24×24), 12) floor water puddle (48×24). Warm stone colors, atmospheric, retro 8-bit pixel art. No anti-aliasing.
```

---

## 13. HAZARDS

**File:** `sprites/hazards.png`
**Dimensions:** 192 × 48 px

| Position | Hazard | Size |
|----------|--------|------|
| 0,0 | Spike pit (metallic spikes on red base) | 96×48 |
| 96,0 | Crystal spike cluster (blue, on gold base) | 96×48 |

**Prompt:**
```
Pixel art hazard sprites on pure black background, 192×48 pixels. Two isometric floor hazard tiles, each 96×48 pixels. Left: spike pit with sharp metallic silver spikes rising from a dark red blood-stained base (isometric diamond shape). Right: cluster of blue crystal spikes on a gold/amber base (like Knight Lore GBC). Both must read as "danger — don't step here" at a glance. Retro 8-bit pixel art. No anti-aliasing.
```

---

## Summary

| # | Asset | File | Dimensions | Frames |
|---|-------|------|-----------|--------|
| 1 | Player Human | `sprites/player_human.png` | 224×48 | 7 |
| 2 | Player Wolf | `sprites/player_wolf.png` | 240×56 | 6 |
| 3 | Transform | `sprites/player_transform.png` | 192×56 | 4 |
| 4 | Wall Tileset | `sprites/tileset_walls.png` | 192×96 | 4 |
| 5 | Archway | `sprites/tileset_archway.png` | 288×96 | 6 |
| 6 | Blocks | `sprites/tileset_blocks.png` | 288×48 | 3 |
| 7 | Items | `sprites/items.png` | 240×24 | 10 |
| 8 | Guard | `sprites/enemy_guard.png` | 192×48 | 4 |
| 9 | Ghost | `sprites/enemy_ghost.png` | 192×48 | 4 |
| 10 | Druid | `sprites/enemy_druid.png` | 192×48 | 4 |
| 11 | Robot | `sprites/enemy_robot.png` | 192×48 | 4 |
| 12 | Props | `sprites/props.png` | 288×96 | 12 |
| 13 | Hazards | `sprites/hazards.png` | 192×48 | 2 |

**Total: 13 sprite sheets, ~60 individual frames**

Once generated, drop each PNG into `desktop/src/main/resources/sprites/` and the game will use them automatically.
