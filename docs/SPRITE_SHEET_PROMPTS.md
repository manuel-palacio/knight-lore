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
Pixel art sprite sheet, retro 8-bit isometric game character, explorer with wide-brimmed pith helmet, blue tunic, brown boots, dark face under hat shadow with visible white eyes, chunky cartoon proportions like Knight Lore ZX Spectrum, 7 animation frames in horizontal row: idle, idle mirrored, walk cycle 4 frames, jump, pure black background, no anti-aliasing, hard pixel edges --ar 7:1.5 --s 50 --style raw --no gradient smooth shading
```

---

## 2. PLAYER — Werewolf Form

**File:** `sprites/player_wolf.png`
**Final size:** 240 × 56 px (6 frames × 40×56)
**Game scale:** 2×

```
Pixel art sprite sheet, retro 8-bit isometric werewolf character, upright humanoid beast with large head, pointed ears, amber glowing eyes, visible fangs, hunched muscular body with shoulder humps, long arms with bone-white claws, wide power stance, dark brown fur, tail behind, 6 animation frames in horizontal row: idle, idle mirrored, walk cycle 4 frames, pure black background, Knight Lore game style --ar 6:1.4 --s 50 --style raw --no gradient smooth background
```

---

## 3. PLAYER — Transformation Sequence

**File:** `sprites/player_transform.png`
**Final size:** 192 × 56 px (4 frames × 48×56)
**Game scale:** 2×

```
Pixel art sprite sheet, retro 8-bit transformation sequence, human explorer morphing into werewolf, 4 stages left to right: human body bulging with hat still on, hybrid form with ears emerging and arms lengthening, nearly wolf with snout and claws formed, full werewolf burst, isometric 3/4 view, exaggerated cartoon body horror, pure black background, Knight Lore ZX Spectrum style --ar 4:1.2 --s 50 --style raw --no gradient
```

---

## 4. WALL TILESET

**File:** `sprites/tileset_walls.png`
**Final size:** 192 × 96 px (2×2 grid of 96×48 tiles)

```
Pixel art isometric wall tileset, medieval castle dungeon, 2x2 grid on black background: top-left warm olive-tan brick wall face with mortar lines, top-right same wall darker shadow side, bottom-left isometric diamond wall cap lighter stone, bottom-right dark floor stone slab with grout lines, retro 8-bit style like Knight Lore, warm earth tones not grey --ar 2:1 --s 50 --style raw --tile --no gradient smooth
```

---

## 5. ARCHWAY TILES

**File:** `sprites/tileset_archway.png`
**Final size:** 288 × 96 px (3×2 grid)

```
Pixel art isometric archway tileset, medieval castle doorway pieces, 3x2 grid on black: top row shows left stone pillar, center keystone lintel, right pillar forming a rounded arch, bottom row shows dark passage void, threshold floor stone, curved arch segment, warm olive-tan stone with brick texture, retro 8-bit Knight Lore style --ar 3:1 --s 50 --style raw --no gradient smooth
```

---

## 6. BLOCK TILESET

**File:** `sprites/tileset_blocks.png`
**Final size:** 288 × 48 px (3 tiles)

```
Pixel art isometric stone block tileset, 3 faces of a medieval dungeon cube in a row on black background: bright top diamond face, medium south-facing brick wall side, darker east-facing shadow side, warm olive-tan stone texture, retro 8-bit Knight Lore style, these three compose into one 3D isometric cube --ar 6:1 --s 50 --style raw --no gradient
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
Pixel art sprite sheet, medieval castle guard enemy, 4 animation frames in row on black background, isometric 3/4 view: idle with halberd, walking frame 1, walking frame 2, attacking thrust, dark steel plate armor, sallet helmet with red plume, rigid upright military posture, retro 8-bit Knight Lore style --ar 4:1 --s 50 --style raw --no gradient smooth
```

---

## 9. ENEMY — Ghost

**File:** `sprites/enemy_ghost.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, ghost enemy, 4 animation frames in row on pure black background, isometric 3/4 view: floating translucent pale blue-white apparition, tapering wispy body fading to nothing at bottom, two dark void eyes, trailing ethereal tendrils, frames show subtle floating bob animation, semi-transparent spooky, retro 8-bit Knight Lore style --ar 4:1 --s 50 --style raw --no gradient
```

---

## 10. ENEMY — Druid

**File:** `sprites/enemy_druid.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, dark druid sorcerer enemy, 4 frames in row on black background, isometric 3/4 view: hunched figure in dark hooded robe, crooked wooden staff with glowing green orb, skull-like face under hood, frames show idle, shuffling walk two frames, casting spell with brighter orb, dark brown robe, bone face, green magic glow, retro 8-bit style --ar 4:1 --s 50 --style raw --no gradient
```

---

## 11. ENEMY — Robot/Construct

**File:** `sprites/enemy_robot.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, mechanical golem construct enemy, 4 frames in row on black background, isometric 3/4 view: boxy angular dark metal body with panel seams, square head with glowing green scanning eye visor, segmented piston arms, blocky legs, small antenna, frames show idle, walking with piston motion two frames, eye glow intensified, dark steel grey, geometric angular not organic, retro 8-bit style --ar 4:1 --s 50 --style raw --no gradient
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

## Asset Priority Order

Generate in this order for maximum gameplay impact:

1. **Player Human** — you see this every second of play
2. **Player Werewolf** — second most visible character
3. **Wall Tileset** — covers most screen area
4. **Items** — core gameplay objects
5. **Floor/Blocks** — environment foundation
6. **Enemies** (Guard → Ghost → Druid → Robot)
7. **Props** — room atmosphere
8. **Archways** — structural detail
9. **Hazards** — gameplay clarity
10. **Transformation** — rare but dramatic moment

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
