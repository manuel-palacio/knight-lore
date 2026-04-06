# Knight Lore — Art Direction and Asset Specification

## Purpose
This document defines the visual production rules for a modern Android implementation of **Knight Lore** in Kotlin. It exists so Claude Code can generate consistent graphics for characters, rooms, objects, hazards, UI icons, and sprite sheets without inventing critical visual decisions on its own.

The art direction must preserve the original game's key visual identity: a single-screen isometric castle adventure built around Filmation-style depth ordering, monochrome room readability, Sabreman's human and werewulf forms, object-carry puzzles, and the cauldron-driven quest to break the curse within forty days.[web:18][web:9][web:51]

This document is not only for style. It also defines technical asset rules such as scale, pivot points, layer ordering, sprite atlas structure, naming, animation frame counts, and production-ready file conventions.

## Source visual constraints to preserve
These original visual truths should remain visible in the remake:

| Constraint | Why it matters |
|---|---|
| Single-screen isometric rooms | The original castle is presented room by room, not as a scrolling world.[web:18][web:9] |
| Strong overlap/depth illusion | Filmation's importance came from masked sprites that appeared correctly in front of and behind objects.[web:51][web:43] |
| Monochrome room identity | Each room is traditionally depicted in a single dominant color, which helps readability.[web:18][web:9] |
| Human and werewulf forms must read instantly | Transformation is core gameplay, not cosmetic.[web:18][web:52] |
| Blocks, hazards, and items must be legible from one camera angle | Puzzle solving depends on fast interpretation of spatial relationships.[web:18][web:7] |
| The cauldron request is a visual gameplay signal | The requested item is shown visually above the cauldron.[web:3][web:6][web:34] |

## Art direction summary
The remake should use a **stylized, readability-first isometric sprite aesthetic**. It should feel like a premium reinterpretation of ZX-era Knight Lore rather than a literal upscale or a fully realistic 3D reboot.[web:18][web:9]

### Core aesthetic pillars
- **Readable before beautiful**: the player must understand surfaces, height, danger, and pickup opportunities immediately.
- **Monochrome-inspired room palettes**: each room family gets one dominant hue plus neutral stone support, modernized from the original one-color-per-room presentation.[web:18][web:9]
- **Heavy silhouette separation**: character forms, hazards, and carryable objects should be distinguishable even in grayscale.
- **Crisp isometric geometry**: blocks, platforms, and room structures use a strict angle language.
- **Mythic castle mood**: cold stone, old sorcery, moonlit dread, dusty arcane interiors, and restrained magic accents.

### Style choice
Use **hand-authored 2D isometric sprites with painted-pixel discipline**. That means:
- cleaner than strict 8-bit pixel art,
- sharper and more iconic than painterly concept art,
- lower detail than modern console action games,
- high readability on phone screens.

Do **not** use:
- realistic 3D renders,
- noisy textures,
- photobashing,
- glossy mobile fantasy style,
- overly cute/cartoon proportions,
- heavy particle clutter.

## Visual target
The visual target is: **modern retro-gothic isometric clarity**.

A room should read in this order:
1. Floor and climbable structure.
2. Player position and facing.
3. Hazards and enemies.
4. Carryable or interactive objects.
5. Decorative mood details.

If decoration interferes with that order, reduce decoration.

## Camera and projection rules
The project uses a fixed isometric camera, room by room, following the original presentation.[web:18][web:43]

### Projection rules
- Camera is locked; no rotation in the base version.
- All room assets are authored for one projection angle only.
- Isometric tile shape must remain consistent across rooms and themes.
- Asset art must align to the engine's projection math and sort-foot anchors.

### Authoring assumption
All artists and generation prompts should assume:
- 2:1 isometric diamond footprint.
- Consistent block height increments.
- Sprite depth sorted by feet/base contact point, not by sprite top.

## Asset scale system
A strict scale system is required so Claude can produce graphics that fit together.

### Base metrics
Use these default production metrics:
- **Tile footprint**: 64x32 px.
- **Half tile**: 32x16 px.
- **Height step**: 32 px.
- **Standard block**: 64x32 footprint, 32 px visible height.
- **Player logical footprint**: roughly 32x20 px at the feet.
- **Player full sprite height**: 72 to 88 px human, 80 to 96 px werewulf.
- **Small pickup object**: fits inside 24x24 to 36x36 px visible body.
- **Medium object/prop**: 48x48 to 64x64 px visible body.

These are production defaults. They may be adjusted slightly, but all assets must stay within the same system.

## Character art specification
Sabreman must be the strongest visual anchor in the game.

## Sabreman — human form
### Shape language
- Lean explorer silhouette.
- Upright posture with slight cautious forward lean.
- Broad shoulders, narrow waist, readable boots.
- Distinct head and torso separation.
- Cloak or tunic elements are allowed only if they do not obscure leg movement.

### Visual identity
- Adventurer in a cursed castle, not a heavily armored knight.
- Palette should use muted warm leather, pale skin or neutral stylized skin tones, dark boots, and one accent cloth color that contrasts room palettes.
- Face detail should be minimal; silhouette matters more than portrait features.

### Must-read traits
At gameplay scale, the player must still read:
- head,
- torso,
- arms,
- legs,
- carried item.

## Sabreman — werewulf form
The werewulf must read instantly as the transformed version of the same character.[web:18][web:52]

### Shape language
- Taller and more hunched than human form.
- Longer arms.
- More pronounced claws or hands.
- Extended snout/head profile.
- Stronger leap silhouette.
- Same feet anchor and facing logic as human form.

### Visual rules
- Do not make the werewulf too monstrous or wide for mobile readability.
- Keep the torso and limb separation very clear.
- Use brighter eye or fang accents sparingly.
- Preserve enough shared costume/body cues that the player perceives continuity from Sabreman.

### Transformation readability
During transformation, use a 6 to 10 frame animation with:
- crouch or recoil,
- silhouette distortion,
- magical outline or moonlight pulse,
- final snap into alternate form.

The transformation animation must be readable even if the player is near blocks or hazards.

## Character turn and facing requirements
The player sprite set must support 8-direction movement mapped to isometric intent.

### Required facings
- North-west
- North-east
- South-west
- South-east
- Optional support facings for transition/turn frames if needed

Because the game is isometric, these four diagonal-facing bases usually cover the readable directions, with movement system logic deciding animation reuse. If the final movement feel needs 8 unique facings, those can be added later.

## Required character animation set
The minimum animation set for both human and werewulf forms:

| State | Frames | Notes |
|---|---|---|
| Idle | 4 to 6 | subtle breathing/sway |
| Walk | 6 to 8 | clear leg separation |
| Jump start | 2 to 3 | anticipation |
| Jump ascent | 1 to 2 | held frame acceptable |
| Jump descent | 1 to 2 | readable fall silhouette |
| Land | 2 to 3 | impact recovery |
| Pickup | 3 to 5 | must keep feet anchor stable |
| Drop | 3 to 5 | quick and readable |
| Hurt | 2 to 3 | brief recoil |
| Death | 4 to 6 | collapse/disappear effect acceptable |
| Transform in/out | 6 to 10 | signature animation |

## NPC and enemy design language
Enemies should feel like cursed castle guardians, arcane entities, or embodied trap logic, consistent with descriptions of monsters and deadly defenders in the castle.[web:52][web:53]

### Enemy classes
Create a consistent silhouette family for each class:
- **Stone guardian**: heavy, block-like, slow, angular.
- **Arcane spirit/ghost**: floating, translucent, softer edges.
- **Spike beast or crawler**: low-profile, hazard-adjacent creature.
- **Form-reactive monster**: aggressive only in werewulf conditions, if used.[web:9][web:7]

### Enemy silhouette rules
- One strong shape idea per enemy.
- Distinguishable from blocks at a glance.
- Avoid over-detail and small decorative spikes everywhere.
- Movement animation should clarify intent: patrol, hover, lunge, or wait.

## Melkhior and the cauldron
The cauldron room is a core visual set piece.[web:3][web:6][web:34]

### Melkhior
Melkhior may appear as:
- a visible old wizard figure, or
- an implied magical presence with the cauldron as the focus.

For the first production slice, prioritize the **cauldron** as the gameplay centerpiece and keep Melkhior optional or subdued.

### Cauldron design rules
- Large readable bowl shape visible from the room view.
- Strong magical silhouette.
- Elevated enough to feel important.
- Visual channel for showing requested item icon above or within magical vapor.[web:3][web:6]
- Dangerous/hostile visual state when Sabreman enters in werewulf form.[web:34][web:6]

### Cauldron effects
Need at least three states:
- Idle simmer.
- Request display active.
- Hostile/attack state.

## Room art specification
Rooms are the game's real content. The room art system must be modular.

## Room composition rules
Every room should be built from reusable visual layers:
1. Background void or rear wall atmosphere.
2. Floor plane.
3. Structural blocks/platforms.
4. Interactive blocks.
5. Hazards.
6. Props/ornament.
7. Items and actors.
8. Foreground overlays if required.

### Room readability rule
At gameplay scale, the player must be able to answer these questions in under 2 seconds:
- Where can I stand?
- What can I jump to?
- What can kill me?
- What can I carry or use?
- Where is the exit?

## Room theme families
Use a controlled number of room families for the first version.

### Initial theme set
- **Stone hall**: neutral gray-beige ancient masonry.
- **Moon chamber**: blue-gray cold moonlit stone.
- **Arcane room**: muted purple-blue or teal magical accent, used sparingly.
- **Dungeon/trap room**: dirty olive-gray or iron-brown danger palette.
- **Cauldron sanctum**: deep green-teal or cold mystical blue with strong focus lighting.

Each room family should still feel mostly monochrome, honoring the original room-color readability approach.[web:18][web:9]

## Monochrome-modern palette system
The original often used one dominant color per room.[web:18][web:9] Modernize that with a layered palette rule.

### Palette rule per room
Each room gets:
- 1 dominant hue family,
- 2 to 3 value levels for stone/material,
- 1 accent color for interactives or magic,
- 1 danger color for hazards,
- neutral shadow color.

### Example palette structure
- Base stone midtone
- Base stone highlight
- Base stone shadow
- Accent glow
- Hazard accent
- UI-safe contrast color for item highlights

### Hard rule
Do not exceed **2 non-neutral accent hues** inside a single room viewport unless it is a special magical set-piece. This preserves the spirit of the original monochrome room presentation and keeps small mobile screens readable.[web:18][web:9]

## Block and platform specification
Blocks are the visual grammar of Knight Lore.[web:18][web:7]

### Block categories
- Static stone block
- Pushable block
- Falling block
- Moving block
- Special ritual block/platform

### Shape rules
- Clean beveled isometric edges.
- Top face always more readable than side faces.
- Height differences must be obvious through value contrast.
- Pushable blocks need a subtle distinguishing motif, such as metal corners, rune marks, or handle dents.
- Falling blocks need a warning visual, such as cracks or unstable supports.

### Texture rule
Textures should be **broad and graphic**, not high-frequency noise. Fine detail will disappear on mobile and reduce clarity.

## Floor, wall, and backdrop rules
Because rooms are single-screen, background treatment must help framing without distracting from play.[web:18]

### Floor
- Diamond-aligned stone patterns or flat slab surfaces.
- Subtle edge highlights to reinforce tile perspective.
- Avoid busy grids that compete with gameplay objects.

### Walls and backdrop
- Back walls may be implied rather than fully detailed.
- Torches, chains, runes, arches, and alcoves are allowed as secondary decoration.
- Decorative elements must sit behind gameplay space and never mimic hazards.

## Object and item specification
Items are critical because the cauldron requests them visually and the player carries them physically.[web:3][web:6][web:34]

## Known item identities to support
Based on source material, the cauldron request sequence uses recognizable item types such as:
- crystal ball,
- goblet,
- wine bottle,
- gem,
- poison,
- boot,
- teacup.[web:6][web:3]

These should become the first canonical item set.

## Item design rules
Each item must be:
- readable in room view,
- recognizable as a unique silhouette,
- distinguishable when carried,
- distinguishable when displayed as a cauldron request icon,
- consistent across world sprite, inventory icon, and request icon.

### Item silhouette guide
- **Crystal ball**: sphere on stand.
- **Goblet**: tall cup stem silhouette.
- **Bottle/poison**: narrow neck and flask body, poison variant may have dangerous accent color.
- **Gem**: faceted diamond form.
- **Boot**: obvious footwear profile with heel.
- **Teacup**: cup with handle and saucer optional.

## Object classes beyond requested items
Also define these object groups:
- Carryable puzzle blocks.
- Decorative props, non-interactive.
- Hazard props, visually dangerous.
- Platform helper items, if item-standing is preserved from the original.[web:3][web:7]

### Interactive cue rules
Interactive objects should have one or more of these:
- slightly brighter outline,
- distinct base shadow,
- idle shimmer for magical objects,
- clear pickup pose compatibility.

## Hazard visual language
Hazards must be identified faster than any decorative prop.

### Hazard categories
- Spikes.[web:9][web:52]
- Crushing blocks.
- Fire or magical burst.
- Dangerous cauldron response.
- Enemy-adjacent traps.

### Hazard readability rules
- Hazard shapes should use sharper geometry than safe surfaces.
- Hazard color should be more saturated than room stone.
- Animation should telegraph active windows.
- Contact zones should align with visible dangerous parts.

## Lighting and shadow rules
Lighting exists for form clarity, not realism.

### Global lighting assumptions
- Soft top-left or top-front key light across most rooms.
- Ambient fill low but readable.
- Cast shadows simplified and consistent.
- Magical objects may emit local glow, but glow cannot obscure sprite edges.

### Shadow usage
- Use contact shadows under characters and items to anchor them.
- Use side-face shading to make elevation readable.
- Avoid heavy dynamic shadow systems in the first pass; baked style is enough.

## Outline and edge treatment
To keep sprites readable on mobile:
- Use selective dark edge definition, not full black outlines on everything.
- Character silhouettes may have stronger contrast than environment props.
- Hazard edges should be crisp.
- Very dark outlines are acceptable for item request icons and UI-facing sprites.

## Occlusion and overlap rules
Filmation-style overlap is essential to the game's visual identity.[web:51][web:43]

### Production rule
Every actor and object sprite must define a **sort-foot anchor**.

### Sort-foot anchor definition
The anchor is the point where the sprite touches the floor. Rendering order is based on this position, not full sprite bounds.

### Occlusion rules
- Player may pass visually behind tall blocks if sort anchor is behind them.[web:51]
- Tall decorative props should be limited if they cause frequent hidden-state problems.
- The top 25 percent of a large sprite may overlap room edges, but the feet area must remain visually understandable.

## Asset resolution and export formats
### Source creation
- Master artwork may be created at 2x production resolution.
- Final exported sprite sheets should target the in-game base scale.

### Export formats
- PNG for sprite sheets and icons.
- JSON atlas metadata if packing is used.
- Lossless storage only.

### Recommended scale workflow
- Author at 128x64 tile-equivalent or 2x sprite size.
- Export down to 64x32 tile-equivalent game size after clarity check.

## Sprite sheet and atlas rules
Claude needs explicit atlas rules.

### Folder structure
```text
art/
  characters/
    sabreman_human/
    sabreman_werewulf/
    enemies/
    melkhior/
  rooms/
    blocks/
    floors/
    walls/
    props/
    hazards/
    themes/
  items/
    world/
    icons/
    cauldron_request/
  fx/
  ui/
  atlases/
```

### Naming rules
Use lowercase snake_case:
- `sabreman_human_idle_ne_01.png`
- `sabreman_werewulf_walk_sw_04.png`
- `block_pushable_stone_a.png`
- `item_goblet_world.png`
- `item_goblet_request_icon.png`
- `cauldron_hostile_03.png`

### Atlas grouping
Pack atlases by usage domain:
- `atlas_character_player`
- `atlas_character_enemies`
- `atlas_room_blocks`
- `atlas_room_props`
- `atlas_items_world`
- `atlas_ui_icons`
- `atlas_fx_magic`

## Pivot, anchor, and bounds specification
Every asset must define these values in metadata:
- `pivot_x`
- `pivot_y`
- `sort_foot_x`
- `sort_foot_y`
- `collision_width`
- `collision_depth`
- `visual_height`

### Example
```json
{
  "asset": "sabreman_human_walk_ne_01",
  "pivot_x": 36,
  "pivot_y": 78,
  "sort_foot_x": 36,
  "sort_foot_y": 76,
  "collision_width": 20,
  "collision_depth": 12,
  "visual_height": 82
}
```

## UI-linked art assets
Besides world sprites, the game needs UI-safe variants.

### Required UI asset groups
- Requested item icons for the cauldron.[web:3][web:6]
- Lives indicator.
- Day-night meter elements using sun/moon symbolism.[web:18][web:52]
- Form indicator for human/werewulf.
- Touch control icons.
- Pause/settings/debug icons.

These should use the same silhouette language as world assets.

## Animation effects specification
FX should be restrained and functional.

### Needed FX families
- Transformation aura.
- Pickup sparkle.
- Cauldron steam and magical request projection.
- Hazard activation flashes.
- Death puff or vanish effect.
- Light dust/mist in special rooms.

### FX rule
Effects should support gameplay clarity, not overwhelm it. The original game's strength was clear spatial logic, not spectacle.[web:18][web:9]

## Accessibility and readability requirements
Art must support mobile play and accessibility.

### Hard requirements
- Character and hazard silhouettes must remain readable at phone scale.
- Important items must survive grayscale conversion.
- Color alone must not indicate danger vs safety.
- UI icons need strong contrast.
- Optional accessibility mode may add higher outlines or highlight glows for items and hazards.

## Prompting guidance for Claude-generated art
When Claude creates prompts or generation instructions, use this structure:

1. Asset type and exact identity.
2. Projection and camera constraints.
3. Silhouette and readability goals.
4. Palette rules tied to room family.
5. Material cues.
6. What to avoid.
7. Output format and framing.

### Example prompt template
"Create a stylized isometric sprite for a crystal ball item from a modern Knight Lore remake, fixed 2:1 isometric view, readability-first mobile game art, monochrome-room compatible palette, strong silhouette with glass sphere on dark stand, subtle arcane glow, minimal noise, transparent background, centered for sprite sheet export."

## Production priorities
Claude should generate assets in this order:

1. Player human form.
2. Player werewulf form.
3. Standard block set.
4. Floor and wall kit.
5. Requested item set.
6. Cauldron and cauldron-room FX.
7. Core hazard set.
8. One enemy family.
9. HUD and request icons.
10. Room theme variants.

## Definition of done for art pre-production
Art pre-production is complete when:
- Sabreman human and werewulf both exist in approved exploratory sheets.
- One room theme exists with modular blocks, floor, and hazard assets.
- All requested cauldron items exist as both world sprites and request icons.[web:3][web:6]
- The cauldron room can be rendered with readable request feedback and hostile state.[web:34][web:6]
- Sorting and overlap work correctly with actual sprites.[web:51][web:43]
- Assets remain readable on a phone-sized viewport.

## Immediate next file
The best next document after this one is a **Sprite Production Backlog and Prompt Pack**. That file should list the exact first assets Claude should generate, one by one, with standardized prompts, naming, size targets, and acceptance criteria for each asset batch.
