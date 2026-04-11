# Knight Lore — Midjourney Sprite Prompts

**What uses Midjourney:** Characters, enemies, items, props (organic shapes)
**What stays procedural:** Walls, floors, blocks, archways (geometric isometric shapes)

**Workflow:**
1. Paste prompt into Midjourney
2. Upscale best result (U1-U4)
3. Crop/resize to exact dimensions listed
4. Run `RemoveBlackBackground` test to make backgrounds transparent
5. Drop into `desktop/src/main/resources/sprites/`

---

## 1. PLAYER — Human Form

**File:** `sprites/player_human.png`
**Final size:** 224 × 48 px (7 frames × 32×48)

```
Pixel art sprite sheet, 7 separate character frames in a single horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 top-down view adventurer like Knight Lore or Sabreman. Wide-brimmed explorer pith helmet, visible round cartoon face with big eyes under hat shadow, blue-grey tunic with belt, skin-colored hands hanging at sides, short trousers, chunky brown boots with visible soles. Organic rounded proportions, NOT rectangular blocks. Frames left to right: standing idle SE, standing idle SW, walk SE foot forward, walk SE foot back, walk SW foot forward, walk SW foot back, jumping with tucked legs. Each frame on pure black background, hard pixel edges, no anti-aliasing, no gradients, crisp pixel boundaries --ar 14:3 --s 50 --style raw --no gradient smooth shading blur
```

---

## 2. PLAYER — Werewolf Form

**File:** `sprites/player_wolf.png`
**Final size:** 240 × 56 px (6 frames × 40×56)

```
Pixel art sprite sheet, 6 separate werewolf frames in a single horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 view humanoid werewolf beast like Knight Lore. Large wolf head with tall pointed ears, fierce amber glowing eyes, visible white fangs and open jaw, wide hunched muscular body with raised shoulder humps, long powerful arms reaching below knees with bone-white claws, thick digitigrade legs in wide power stance, curved tail behind. Dark brown fur with lighter chest. Must look completely different from human — threatening, bestial, heavy. Frames: idle SE, idle SW, walk SE two frames with arm/leg countersweep, walk SW two frames. Pure black background, hard pixel edges, no anti-aliasing, crisp pixel boundaries --ar 30:7 --s 50 --style raw --no gradient smooth blur
```

---

## 3. PLAYER — Transformation Sequence

**File:** `sprites/player_transform.png`
**Final size:** 192 × 56 px (4 frames × 48×56)

```
Pixel art sprite sheet, 4 separate transformation frames in a horizontal strip, each frame clearly separated by a 2-pixel black gap. Retro 8-bit isometric 3/4 view human-to-werewolf transformation like Knight Lore. Stage 1: explorer with hat, body starting to bulge and expand. Stage 2: hybrid — pointed wolf ears bursting through hat, arms lengthening, shoulders widening, face distorting. Stage 3: nearly full wolf — hat fallen off, full snout, claws formed, hunched posture. Stage 4: dramatic final burst — complete werewolf, human features gone, energy lines radiating. Exaggerated cartoon body horror, pure black background, hard pixel edges, crisp pixel boundaries --ar 10:3 --s 50 --style raw --no gradient smooth blur
```

---

## 4. COLLECTIBLE ITEMS

**File:** `sprites/items.png`
**Final size:** 240 × 24 px (10 items × 24×24)

```
Pixel art item icons sprite sheet, 10 medieval fantasy collectibles in a horizontal row, each separated by 2-pixel black gap, on pure black background: blue crystal ball on stand, gold goblet chalice, dark red wine bottle, pink faceted gem, green poison vial, brown leather boot, blue teacup with handle, gold ornate key, wooden torch with flame, white skull with eye sockets, each item has unique recognizable silhouette, bright colors, retro 8-bit style --ar 10:1 --s 50 --style raw --no gradient background
```

---

## 5. ENEMY — Guard

**File:** `sprites/enemy_guard.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate guard frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Medieval castle guard enemy, isometric 3/4 view like Knight Lore. Dark steel plate armor, sallet helmet with small red plume, carrying tall halberd weapon. Rigid upright military posture, imposing and dangerous. Frames: idle standing with halberd vertical, patrol walk frame 1, patrol walk frame 2, attacking halberd thrust forward. Pure black background, hard pixel edges, no anti-aliasing, crisp pixel boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 6. ENEMY — Ghost

**File:** `sprites/enemy_ghost.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate ghost frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Floating ghost enemy, isometric 3/4 view like Knight Lore. Translucent pale blue-white apparition with tapering wispy body that fades to nothing at bottom, no legs. Two large dark void eyes, trailing ethereal tendrils swaying. Frames show floating bob animation — body drifts up and down, tendrils sway differently. Ethereal, spooky, semi-transparent feel. Pure black background, hard pixel edges, crisp pixel boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 7. ENEMY — Druid

**File:** `sprites/enemy_druid.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate druid frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Dark druid sorcerer enemy, isometric 3/4 view like Knight Lore. Hunched figure in dark hooded robe, holding crooked wooden staff with glowing green magic orb at top. Skull-like bone face visible under deep hood with dark eye sockets. Asymmetric leaning posture. Frames: idle leaning on staff, shuffling walk frame 1, shuffling walk frame 2, casting spell with orb glowing brighter. Dark brown/black robe, bone-colored face, green magic glow. Pure black background, hard pixel edges, crisp boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 8. ENEMY — Robot/Construct

**File:** `sprites/enemy_robot.png`
**Final size:** 192 × 48 px (4 frames × 48×48)

```
Pixel art sprite sheet, 4 separate robot frames in horizontal strip, each frame clearly separated by 2-pixel black gap. Mechanical golem construct enemy, isometric 3/4 view like Knight Lore. Boxy angular body made of dark metal plates with visible panel seams and rivets, square head with glowing green scanning eye/visor slit, segmented arms with piston joints, blocky armored legs, small antenna on head. Geometric, angular, NOT organic — a cursed automaton. Frames: idle with eye scanning, walking frame 1 with piston motion, walking frame 2, eye glow intensified alert mode. Dark steel grey, green eye accent. Pure black background, hard pixel edges, crisp boundaries --ar 4:1 --s 50 --style raw --no gradient smooth blur
```

---

## 9. PROPS — Individual pieces

Generate each as a separate image, then resize to 48×48.

### Cauldron
```
Pixel art isometric bubbling cauldron, medieval fantasy, iron pot with green glowing liquid, bubbles rising, warm orange firelight underneath, on pure black background, retro 8-bit Knight Lore style --ar 1:1 --s 50 --style raw
```

### Throne
```
Pixel art isometric stone throne, medieval castle, crumbling worn ancient seat of power, dark stone with carved details, on pure black background, retro 8-bit Knight Lore style --ar 1:1 --s 50 --style raw
```

### Altar
```
Pixel art isometric ritual altar, medieval fantasy, stone slab with glowing magic circle etched on top, dark mysterious, on pure black background, retro 8-bit style --ar 1:1 --s 50 --style raw
```

### Barred Window
```
Pixel art isometric barred castle window, iron bars with pale moonlight beam streaming through, stone frame, on pure black background, retro 8-bit Knight Lore style --ar 1:1 --s 50 --style raw
```

### Hanging Cage
```
Pixel art isometric hanging iron cage, medieval dungeon, suspended from chain, dark rusted metal, on pure black background, retro 8-bit style --ar 1:1 --s 50 --style raw
```

### Brazier
```
Pixel art isometric standing brazier, medieval castle, iron bowl on tripod stand with orange crackling fire, warm glow, on pure black background, retro 8-bit style --ar 1:1 --s 50 --style raw
```

### Chain Cluster
```
Pixel art isometric cluster of hanging chains, medieval dungeon, dark iron chains hanging from ceiling, on pure black background, retro 8-bit style --ar 1:1 --s 50 --style raw
```

### Torn Banner
```
Pixel art isometric torn medieval banner on pole, tattered crimson red fabric, hanging from wall bracket, on pure black background, retro 8-bit style --ar 1:1 --s 50 --style raw
```

### Torch Sconce
```
Pixel art wall-mounted torch sconce, medieval castle, iron bracket with flickering orange flame, warm glow halo, on pure black background, retro 8-bit style --ar 1:2 --s 50 --style raw
```

---

## 10. HAZARDS

**File:** `sprites/hazards.png`
**Final size:** 192 × 48 px

```
Pixel art isometric hazard tiles, 2 dangerous floor traps side by side separated by 2-pixel black gap on black background: left is spike pit with sharp metallic silver spikes on dark red base as isometric diamond, right is cluster of blue crystal spikes on gold amber base like Knight Lore GBC, both read as instant danger, retro 8-bit style --ar 4:1 --s 50 --style raw --no gradient smooth
```

---

## Post-Processing

1. **Upscale** best variant (U1-U4)
2. **Crop/resize** to exact dimensions above
3. **Remove black background** — run `RemoveBlackBackground` test in the project
4. **Drop** into `desktop/src/main/resources/sprites/`

Tools: Aseprite ($20), Piskel (free, piskelapp.com), GIMP (free)

---

## Quick Reference

| # | Asset | Filename | Size | Frames |
|---|-------|----------|------|--------|
| 1 | Player Human | `player_human.png` | 224×48 | 7 |
| 2 | Player Wolf | `player_wolf.png` | 240×56 | 6 |
| 3 | Transformation | `player_transform.png` | 192×56 | 4 |
| 4 | Items | `items.png` | 240×24 | 10 |
| 5 | Guard | `enemy_guard.png` | 192×48 | 4 |
| 6 | Ghost | `enemy_ghost.png` | 192×48 | 4 |
| 7 | Druid | `enemy_druid.png` | 192×48 | 4 |
| 8 | Robot | `enemy_robot.png` | 192×48 | 4 |
| 9 | Props | individual PNGs | 48×48 | 1 each |
| 10 | Hazards | `hazards.png` | 192×48 | 2 |

**NOT in Midjourney** (stays procedural): walls, floors, blocks, archways
