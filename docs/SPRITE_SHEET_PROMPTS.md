# Knight Lore — Sprite Sheet Assets & Midjourney Prompts

**Tool:** Midjourney v6+
**Workflow:**
1. Paste prompt into Midjourney
2. Upscale best result (U1-U4)
3. Crop/resize to exact dimensions in Photoshop/Pixelmator/GIMP
4. Save as PNG with transparency where noted
5. Drop into `desktop/src/main/resources/sprites/`

**Midjourney tips:**
- `--no background` or `--style raw` for cleaner results
- `--ar` sets aspect ratio (crucial for sprite sheets)
- Add `--s 50` for less stylization if results are too artistic
- Use `--tile` for seamless wall/floor textures
- Upscale then downscale to target pixel size for crisp pixel art
- If MJ struggles with exact pixel art, generate at higher res and pixelate in post

---

## 1. PLAYER — Human Form

**File:** `sprites/player_human.png`
**Final size:** 224 × 48 px (7 frames × 32×48)
**Game scale:** 2×

```
Pixel art sprite sheet, 7 separate character frames in a single horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 top-down view adventurer like Knight Lore or Sabreman. Wide-brimmed explorer pith helmet, visible round cartoon face with big eyes under hat shadow, blue-grey tunic with belt, skin-colored hands hanging at sides, short trousers, chunky brown boots with visible soles. Organic rounded proportions, NOT rectangular blocks. Frames left to right: standing idle SE, standing idle SW, walk SE foot forward, walk SE foot back, walk SW foot forward, walk SW foot back, jumping with tucked legs. Each frame on pure black background, hard pixel edges, no anti-aliasing, no gradients, crisp pixel boundaries --ar 14:3 --s 50 --style raw --no gradient smooth shading blur
```

---

## 2. PLAYER — Werewolf Form

**File:** `sprites/player_wolf.png`
**Final size:** 240 × 56 px (6 frames × 40×56)
**Game scale:** 2×

```
Pixel art sprite sheet, 6 separate werewolf frames in a single horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 view humanoid werewolf beast like Knight Lore. Large wolf head with tall pointed ears, fierce amber glowing eyes, visible white fangs and open jaw, wide hunched muscular body with raised shoulder humps, long powerful arms reaching below knees with bone-white claws, thick digitigrade legs in wide power stance, curved tail behind. Dark brown fur with lighter chest. Must look completely different from human — threatening, bestial, heavy. Frames: idle SE, idle SW, walk SE two frames with arm/leg countersweep, walk SW two frames. Pure black background, hard pixel edges, no anti-aliasing, crisp pixel boundaries --ar 30:7 --s 50 --style raw --no gradient smooth blur
```

---

## 3. PLAYER — Transformation Sequence

**File:** `sprites/player_transform.png`
**Final size:** 192 × 56 px (4 frames × 48×56)
**Game scale:** 2×

```
Pixel art sprite sheet, 4 separate transformation frames in a horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 view human-to-werewolf transformation like Knight Lore. Stage 1: explorer with hat, body starting to bulge and expand. Stage 2: hybrid — pointed wolf ears bursting through hat, arms lengthening, shoulders widening, face distorting. Stage 3: nearly full wolf — hat fallen off, full snout, claws formed, hunched posture. Stage 4: dramatic final burst — complete werewolf, human features gone, energy lines radiating. Exaggerated cartoon body horror, pure black background, hard pixel edges, crisp pixel boundaries --ar 10:3 --s 50 --style raw --no gradient smooth blur
```

---

## 4. WALL FACE — South (isometric parallelogram)

**File:** `sprites/wall_south.png`
**Final size:** 96 × 96 px
**IMPORTANT:** The shape must be a PARALLELOGRAM on transparent background — not a rectangle.

```
Single isometric wall face tile, pixel art on pure black background. The shape is a parallelogram leaning right — a south-facing castle wall seen from isometric 3/4 top-down view. Medieval stone brick pattern with horizontal mortar lines between rows of cut stone blocks. Warm olive-tan stone colors with darker mortar gaps. Only the parallelogram shape is filled, rest is black/transparent. Retro 8-bit pixel art like Knight Lore, hard pixel edges --ar 1:1 --s 50 --style raw --no gradient smooth blur
```

## 4b. WALL FACE — East (darker parallelogram)

**File:** `sprites/wall_east.png`
**Final size:** 96 × 96 px

```
Single isometric wall face tile, pixel art on pure black background. Parallelogram shape leaning LEFT — an east-facing wall in isometric view, the shadow side. Same medieval stone brick pattern but darker than the south face. Dark olive-brown with subtle mortar lines. Only the parallelogram filled, rest is black/transparent. Retro 8-bit pixel art like Knight Lore --ar 1:1 --s 50 --style raw --no gradient smooth blur
```

## 4c. FLOOR TILE (isometric diamond)

**File:** `sprites/floor_tile.png`
**Final size:** 96 × 48 px
**IMPORTANT:** Diamond/rhombus shape only — all four corners point N/E/S/W.

```
Single isometric floor tile, pixel art on pure black background. Diamond rhombus shape — a flat stone floor slab seen from above in isometric 3/4 view. Very dark worn stone surface with subtle texture, thin grout lines at edges. Nearly black to make floor recede into darkness. Only the diamond shape filled, corners at top/right/bottom/left. Retro 8-bit pixel art like Knight Lore --ar 2:1 --s 50 --style raw --no gradient smooth blur
```

---

## 5. ARCHWAY — Complete south-facing arch

**File:** `sprites/archway_south.png`
**Final size:** 192 × 144 px
**IMPORTANT:** Single complete isometric archway — NOT separate tiles.

```
Single complete isometric archway, pixel art on pure black background. Medieval castle stone doorway seen from isometric 3/4 view — two stone pillar columns on left and right with a curved rounded arch connecting them at top. Dark void passage visible through the opening between the pillars. The arch and pillars are made of warm olive-tan brick matching castle walls. Classic medieval rounded arch shape. Entire archway rendered as one complete piece on transparent/black background. Retro 8-bit pixel art like Knight Lore --ar 4:3 --s 50 --style raw --no gradient smooth blur
```

---

## 6. ISOMETRIC BLOCK — Complete 3D cube

**File:** `sprites/block.png`
**Final size:** 96 × 96 px
**IMPORTANT:** Complete isometric cube showing 3 faces — NOT separate tiles.

```
Single isometric 3D stone cube, pixel art on pure black background. A complete cube seen from isometric 3/4 top-down view showing all three visible faces: bright diamond-shaped top face, medium-lit south-facing left side with brick texture, darker east-facing right side in shadow. Warm olive-tan medieval castle stone. The cube is a pushable puzzle block. Entire cube as one image on black/transparent background. Retro 8-bit pixel art like Knight Lore --ar 1:1 --s 50 --style raw --no gradient smooth blur
```

---

## 7. COLLECTIBLE ITEMS

**File:** `sprites/items.png`
**Final size:** 240 × 24 px (10 items × 24×24)

```
Pixel art item icons sprite sheet, 10 medieval fantasy collectibles in a horizontal row on pure black background: blue crystal ball on stand, gold goblet chalice, dark red wine bottle, pink faceted gem, green poison vial, brown leather boot, blue teacup with handle, gold ornate key, wooden torch with flame, white skull with eye sockets, each item has unique recognizable silhouette, bright colors, retro 8-bit style --ar 10:1 --s 50 --style raw --no gradient background
```

---

## 8. ENEMY — Guard

**File:** `sprites/enemy_guard.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate guard frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Medieval castle guard enemy, isometric 3/4 view like Knight Lore. Dark steel plate armor, sallet helmet with small red plume, carrying tall halberd weapon. Rigid upright military posture, imposing and dangerous. Frames: idle standing with halberd vertical, patrol walk frame 1, patrol walk frame 2, attacking halberd thrust forward. Pure black background, hard pixel edges, no anti-aliasing, crisp pixel boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 9. ENEMY — Ghost

**File:** `sprites/enemy_ghost.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate ghost frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Floating ghost enemy, isometric 3/4 view like Knight Lore. Translucent pale blue-white apparition with tapering wispy body that fades to nothing at bottom, no legs. Two large dark void eyes, trailing ethereal tendrils swaying. Frames show floating bob animation — body drifts up and down, tendrils sway differently. Ethereal, spooky, semi-transparent feel. Pure black background, hard pixel edges, crisp pixel boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 10. ENEMY — Druid

**File:** `sprites/enemy_druid.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate druid frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Dark druid sorcerer enemy, isometric 3/4 view like Knight Lore. Hunched figure in dark hooded robe, holding crooked wooden staff with glowing green magic orb at top. Skull-like bone face visible under deep hood with dark eye sockets. Asymmetric leaning posture. Frames: idle leaning on staff, shuffling walk frame 1, shuffling walk frame 2, casting spell with orb glowing brighter. Dark brown/black robe, bone-colored face, green magic glow. Pure black background, hard pixel edges, crisp boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 11. ENEMY — Robot/Construct

**File:** `sprites/enemy_robot.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate robot frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Mechanical golem construct enemy, isometric 3/4 view like Knight Lore. Boxy angular body made of dark metal plates with visible panel seams and rivets, square head with glowing green scanning eye/visor slit, segmented arms with piston joints, blocky armored legs, small antenna on head. Geometric, angular, NOT organic — a cursed automaton. Frames: idle with eye scanning, walking frame 1 with piston motion, walking frame 2, eye glow intensified alert mode. Dark steel grey, green eye accent. Pure black background, hard pixel edges, crisp boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 12. PROPS — Room Set-Pieces

**File:** `sprites/props.png`
**Final size:** 288 × 96 px

Generate these as **individual images** then compose into the sheet:

### 12a. Cauldron
```
Pixel art isometric bubbling cauldron, medieval fantasy, iron pot with green glowing liquid, bubbles rising, warm orange firelight underneath, on pure black background, retro 8-bit Knight Lore style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12b. Throne
```
Pixel art isometric stone throne, medieval castle, crumbling worn ancient seat of power, dark stone with carved details, on pure black background, retro 8-bit Knight Lore style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12c. Altar
```
Pixel art isometric ritual altar, medieval fantasy, stone slab with glowing magic circle etched on top, dark mysterious, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12d. Barred Window
```
Pixel art isometric barred castle window, iron bars with pale moonlight beam streaming through, stone frame, on pure black background, retro 8-bit Knight Lore style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12e. Hanging Cage
```
Pixel art isometric hanging iron cage, medieval dungeon, suspended from chain, dark rusted metal, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12f. Brazier
```
Pixel art isometric standing brazier, medieval castle, iron bowl on tripod stand with orange crackling fire, warm glow, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12g. Chain Cluster
```
Pixel art isometric cluster of hanging chains, medieval dungeon, dark iron chains hanging from ceiling, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12h. Torn Banner
```
Pixel art isometric torn medieval banner on pole, tattered crimson red fabric, hanging from wall bracket, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12i. Broken Column
```
Pixel art isometric broken stone column, medieval ruins, cracked and crumbling pillar, rubble at base, on pure black background, retro 8-bit style, 48x48 pixels --ar 1:1 --s 50 --style raw
```

### 12j. Torch Sconce
```
Pixel art wall-mounted torch sconce, medieval castle, iron bracket with flickering orange flame, warm glow halo, on pure black background, retro 8-bit style, 24x48 pixels --ar 1:2 --s 50 --style raw
```

### 12k. Cobweb
```
Pixel art corner cobweb, thin white spider web strands in corner, dusty abandoned, on pure black background, retro 8-bit style, 24x24 pixels --ar 1:1 --s 50 --style raw
```

### 12l. Puddle
```
Pixel art floor water puddle, dark reflective surface, subtle ripple, medieval dungeon floor, on pure black background, retro 8-bit style, 48x24 pixels --ar 2:1 --s 50 --style raw
```

---

## 13. HAZARDS

**File:** `sprites/hazards.png`
**Final size:** 192 × 48 px

```
Pixel art isometric hazard tiles, 2 dangerous floor traps side by side on black background: left is spike pit with sharp metallic silver spikes on dark red blood base as isometric diamond, right is cluster of blue crystal spikes on gold amber base like Knight Lore GBC, both read as instant danger, retro 8-bit style --ar 4:1 --s 50 --style raw --no gradient smooth
```

---

## Post-Processing Workflow

After generating in Midjourney:

1. **Upscale** the best variant (U1-U4)
2. **Crop** each frame to exact pixel dimensions listed above
3. **Pixelate** if needed — Image → Mode → Indexed Color in Photoshop, or use nearest-neighbor downscale
4. **Black background** — ensure background is pure `#000000` or transparent
5. **Assemble** frames into horizontal sprite sheet at exact layout positions
6. **Save** as PNG (8-bit with alpha channel)
7. **Drop** into `desktop/src/main/resources/sprites/`

### Recommended tools for post-processing:
- **Aseprite** ($20, best for pixel art editing and sprite sheets)
- **Piskel** (free, browser-based at piskelapp.com)
- **GIMP** (free, for cropping and compositing)
- **TexturePacker** (free tier, assembles sprite sheets from individual frames)

---

## Generation Order

Doesn't matter — generate in any order you like. Each PNG is independent. The game loads whatever exists and falls back to procedural rendering for anything missing.

---

## Quick Reference — All Files

| # | Asset | Filename | Size | Frames |
|---|-------|----------|------|--------|
| 1 | Player Human | `player_human.png` | 224×48 | 7 |
| 2 | Player Wolf | `player_wolf.png` | 240×56 | 6 |
| 3 | Transformation | `player_transform.png` | 192×56 | 4 |
| 4 | Walls | `tileset_walls.png` | 192×96 | 4 |
| 5 | Archways | `tileset_archway.png` | 288×96 | 6 |
| 6 | Blocks | `tileset_blocks.png` | 288×48 | 3 |
| 7 | Items | `items.png` | 240×24 | 10 |
| 8 | Guard | `enemy_guard.png` | 192×48 | 4 |
| 9 | Ghost | `enemy_ghost.png` | 192×48 | 4 |
| 10 | Druid | `enemy_druid.png` | 192×48 | 4 |
| 11 | Robot | `enemy_robot.png` | 192×48 | 4 |
| 12 | Props | `props.png` | 288×96 | 12 |
| 13 | Hazards | `hazards.png` | 192×48 | 2 |
