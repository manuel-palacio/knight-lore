# Knight Lore — Art Direction and Asset Specification

## Purpose
This document defines the visual production rules for a modern Android implementation of **Knight Lore** in Kotlin. It exists because the first two planning documents provide enough information for gameplay architecture and prototype visuals, but not enough detail for Claude Code to generate a consistent production-ready asset set for characters, rooms, objects, hazards, and UI.[web:18][web:55][web:43]

The goal is to preserve the original game's identity—single-screen isometric rooms, strong silhouette readability, monochrome room atmosphere, Sabreman's human and werewulf forms, object-driven puzzles, and visually clear depth layering—while translating those ideas into a modern asset pipeline.[web:18][web:13][web:3]

## Visual goals
The remake's art direction should follow five top-level goals:

1. **Readable at a glance**: a player must immediately understand floors, climbable blocks, hazards, pickups, and exits in isometric space.[web:51][web:54]
2. **Faithful in spirit**: rooms should feel like Knight Lore rather than a generic fantasy isometric game, especially through room-contained puzzle staging, monochrome-led atmosphere, and strong object silhouettes.[web:18][web:13][web:55]
3. **Modern in execution**: use cleaner animation, richer materials, stronger feedback, and more legible layering than the 1984 original while preserving the original's restraint.[web:18][web:33]
4. **Systematic to produce**: all assets must follow a shared scale, pivot, naming, and palette rule set so Claude Code can generate and place them consistently.
5. **Safe for gameplay**: decoration must never make interactives, collision edges, or hazard timing harder to read than in the source game.[web:35][web:55]

## Style position
The art style should be described as:

**Stylized isometric 2.5D fantasy with monochrome-per-room inspiration, high silhouette contrast, low clutter, and restrained atmospheric detailing.**[web:13][web:55]

This is **not**:
- realistic medieval art,
- painterly diorama art,
- lush overgrown fantasy clutter,
- voxel art,
- anime fantasy,
- neon cyber-isometric styling.

The world should feel strange, ancient, geometric, and slightly hostile. It should suggest a magical castle full of mechanical and mystical puzzles rather than a living inhabited palace.[web:18][web:3]

## Core visual principles

### 1. Silhouette first
Every important object must be identifiable by silhouette before color or texture is considered. This especially applies to:
- Sabreman human form
- Sabreman werewulf form
- Melkhior and cauldron
- carryable items
- hazards
- moving blocks
- enemies[web:18][web:55]

### 2. Monochrome room logic, modernized
The original is strongly associated with monochrome rooms, which helped avoid visual bleed and gave each chamber a distinct atmosphere.[web:13][web:55] The remake should preserve this idea by using a **dominant room hue family** with controlled accent colors rather than fully monochrome modern rendering.

Rule:
- Each room belongs to one primary tonal family, for example stone-grey, swamp-green-grey, moon-blue-grey, ember-brown-grey.
- Only hazards, pickups, special interactives, and UI-critical feedback may break that restraint.
- No more than 1 strong accent hue per room, except special effects.

### 3. Depth must stay legible
Because Knight Lore's identity depends on isometric layering and overlap, depth should remain easy to read even with richer art.[web:33][web:43] Use the following visual aids:
- top surfaces brighter than side faces,
- consistent edge highlights,
- soft projected contact shadows,
- clear floor-grid cues where needed,
- reduced texture noise on collision surfaces.

### 4. Gameplay beats decoration
If a decorative detail conflicts with collision readability, remove the detail. If lighting hides a landing edge, simplify the lighting. If prop clutter obscures pickups, reduce clutter.

## Rendering style decision
For this project, use **hand-authored 2D isometric sprites with modern shading**, not real-time 3D models for the first production version. This fits the original game's spirit, simplifies asset exports, and gives Claude Code a clear pipeline for sprite atlases and layered room rendering.[web:18][web:43]

### Asset style target
- Clean stylized sprite work.
- Sharp silhouette edges.
- Minimal outline use, only where needed for readability.
- Controlled texture detail.
- Light ambient occlusion under feet and objects.
- Limited animation smear.
- No heavy normal-map or shader dependence.

## Projection and grid standards
All art must assume one shared isometric projection standard.

### Logical metric
- 1 floor tile = 1 gameplay unit.
- 1 block footprint = 1x1 tile.
- 1 standard block height = 1 elevation unit.

### Pixel metric recommendation
Choose a consistent base. Recommended:
- Tile footprint: **64 px wide x 32 px tall**.
- Standard block height: **32 px**.
- Half tile width: 32 px.
- Half tile height: 16 px.

This is large enough for mobile readability and small enough for dense rooms.

### Projection rule
All assets should align visually to a 2:1 isometric grid. Screen math can use the standard projection where:
- `screenX = (x - y) * 32`
- `screenY = (x + y) * 16 - z * 32`

## Sprite anchor and pivot rules
Every sprite must define a gameplay anchor.

### Anchor standard
- **Characters and enemies**: anchor at the center of the feet.
- **Blocks**: anchor at the back-bottom corner or shared tile origin, whichever the renderer standard uses, but keep it consistent globally.
- **Pickups and props**: anchor at the point touching the floor.
- **Hanging or floating objects**: anchor at logical collision origin, not visual center.

### Non-negotiable rule
Every exported asset must include metadata for:
- sprite id,
- width,
- height,
- anchor x/y,
- logical footprint,
- logical height,
- collision category,
- default sort-foot offset.

## Character art specification

## Sabreman — human form
Sabreman is the core readable actor, so his silhouette must be iconic from every angle.[web:18][web:50]

### Human silhouette goals
- Explorer/adventurer profile.
- Slightly oversized helmet or headwear silhouette referencing his classic adventurer identity.[web:50]
- Compact torso.
- Visible boots.
- Readable arm separation when carrying items.
- Distinct from enemies even at small scale.

### Human shape language
- Angles slightly rounded but still geometric.
- Upright posture.
- Silhouette communicates caution and agility rather than brute strength.
- Costume layers simple: helmet, tunic/jacket, gloves, boots, belt/satchel if needed.

### Human color logic
Within any room palette, Sabreman should remain visible. Use a character-local palette that adapts slightly by lighting but preserves identity:
- warm neutral clothing base,
- brighter helmet or hat read,
- darker boots and gloves,
- accent only if it improves readability.

## Sabreman — werewulf form
The werewulf form must read instantly as a transformation, not just a recolor.[web:18][web:3][web:13]

### Werewulf silhouette goals
- Taller visual read than human form.
- Broader shoulders or upper torso.
- Longer arms.
- Clawed or exaggerated hand shape.
- Muzzle/head shape clearly distinct from helmeted human silhouette.
- Slightly hunched posture.

### Werewulf movement read
The werewulf form should appear more explosive and less controlled:
- longer stride,
- stronger landing pose,
- more aggressive idle breathing,
- transformation afterimage or magical distortion.

### Werewulf palette logic
Keep the werewulf in the same world palette family but push contrast in fur, claws, and eyes enough for instant recognition. Avoid horror gore styling; this is mythic curse fantasy, not body horror.

## Character dimensions
Recommended target sprite size for main character frames:
- Standing frame canvas: **80x96 px**.
- Tall jump or transform frame: up to **96x112 px**.
- Feet anchor must remain consistent across all frames.

## Character directions
Minimum production set:
- facing northeast
- facing northwest
- facing southeast
- facing southwest

Optional later:
- mirrored handling by renderer if style allows, but unique hand/item handling frames are preferred for polish.

## Character animation set
Claude should not invent animation scope ad hoc. Use this base set.

### Human animations
- idle
- walk
- jump start
- jump airborne
- jump land
- pickup
- drop
- carry idle
- carry walk
- damage
- death
- transform start

### Werewulf animations
- idle
- walk/run
- jump start
- jump airborne
- jump land
- damage
- death
- transform end

### Frame guidance
- Idle: 4–6 frames.
- Walk: 6–8 frames.
- Jump start: 2–3 frames.
- Airborne: 1–2 frames.
- Land: 2–3 frames.
- Pickup/drop: 3–5 frames.
- Transform sequence: 8–12 frames.

## Enemy art specification
Start with a small enemy family for the slice. Each enemy must have a unique interaction meaning.

### Enemy classes for early production
- **Patrol hazard enemy**: simple moving threat.
- **Form-sensitive enemy**: reacts differently to human vs werewulf form.[web:7]
- **Floating magical threat**: occupies different vertical space.

### Enemy visual rules
- One core silhouette cue per enemy type.
- Avoid over-detailed anatomy.
- Hostile motion should be visible even when sprite size is small.
- Enemy contrast must be slightly lower than pickups but still clear.

## Melkhior and cauldron
The cauldron room is one of the strongest identity anchors in Knight Lore, because it defines the progression loop and reacts to the player's state.[web:18][web:3]

### Melkhior
- Elder wizard silhouette.
- Cloaked, still, ritual posture.
- Must read as non-standard NPC, not enemy.
- Strong triangular robe shape or staff silhouette.

### Cauldron
- Large enough to dominate the room.
- Immediate focal point.
- Clearly interactable from a standing/jumping position.
- Idle magical feedback, for example subtle glow, bubbling, rune vapor, or light pulse.
- Attack-state visuals when approached incorrectly in werewulf form.[web:3]

### Cauldron room tone
The room should feel ceremonially different from standard puzzle rooms:
- higher contrast,
- stronger ambient magical effect,
- visually quieter clutter so the cauldron remains dominant.

## Room art specification
Rooms in Knight Lore are effectively gameplay stages with their own visual and collision logic.[web:35][web:55] The room set must be modular enough to build many chambers, but strong enough to avoid looking repetitive.

## Room composition rules
Each room should be built from:
- floor plane
- boundary walls or implied void edges
- climbable block structures
- special interactives
- hazards
- exits
- optional atmospheric props

### Room clarity rules
- Traversable floor must always read clearly from blocked volume.
- Vertical stacks must separate top face, left face, and right face consistently.
- Exits must be recognizable at a glance.
- Decorative props cannot occupy the same contrast tier as pickups.

## Room theme families
Start with 4 production-ready theme families:

### 1. Ancient stone
- cool greys
- moss-muted accents
- worn edges
- low magical presence

### 2. Arcane chamber
- blue-grey or violet-grey tonal family
- stronger magical highlights
- ritual markings
- brighter interactives

### 3. Furnace or ember vault
- warm ash-brown tonal family
- subdued ember accents
- stronger hazard telegraphing

### 4. Moonlit curse rooms
- cold desaturated blue-grey family
- transformation-heavy atmosphere
- more severe shadow contrast

These themes should be applied by palette, decal choice, prop selection, and effects, not by changing core geometry language.

## Block and architecture kit
The room kit needs a standardized block family.

### Required structural assets
- floor tile
- full cube block
- half-height block
- tall pillar block
- ramp or stepped block if used
- moving block
- falling block
- edge trim variants
- corner wall segments
- doorway/exit frame

### Face treatment rules
- Top face: lightest local value.
- Left side face: medium value.
- Right side face: darkest value, or vice versa if a global light direction is chosen. Keep it consistent.
- Contact shadow where block meets floor.
- Minimal texturing to avoid visual noise.

## Object and pickup specification
The original game uses distinct collectible objects and allows multiple items to be carried or used as stepping tools.[web:3] Therefore pickups must be readable both as collectible identities and as physical puzzle objects.

## Pickup categories
- ingredient artifacts for cauldron requests
- utility objects used as stepping aids
- decorative duplicates of collectible classes where needed
- special key or relic equivalents if the remake expands progression

### Pickup readability rules
- Each pickup type needs a unique silhouette.
- Each pickup must read correctly when on floor, carried, or stacked.
- Pickups cannot visually merge into block textures.
- Important pickups get a subtle idle shimmer, bob, or rune pulse, but never enough to suggest arcade loot excess.

### Recommended object families
Inspired by the source game's repeated ingredient/object loop:[web:3]
- bottle or flask
- goblet or chalice
- book or grimoire
- skull or bone relic
- crystal or gem cluster
- herb bundle or root
- idol, mask, or carved fetish

These can map to the request system while staying consistent with the castle's magical theme.

## Hazard specification
Hazards must be readable instantly even in monochrome-led rooms.

### Hazard types for first full production pass
- spike field
- crusher block
- fire or ember vent
- curse field or magical orb lane
- unstable falling platform

### Hazard visuals
- Hazard color contrast may break room monochrome rules more than standard geometry.
- Hazard active states must be more obvious than inactive states.
- Animation must telegraph timing windows.
- Collision bounds should never exceed the visible danger zone by much.

## Interactive objects
Interactive objects need stronger visual signaling than static props.

Classes:
- movable blocks
- switches
- gates
- transformation-sensitive triggers
- pressure plates
- cauldron request feedback indicators

Visual cues:
- slightly cleaner materials,
- repeated rune motif,
- edge glow or reflective trim,
- clearer silhouette separation from background.

## Effects specification
Effects should reinforce interaction and state changes without overwhelming the clean isometric read.

### Required effect families
- jump dust or landing puff
- item pickup sparkle
- transformation aura
- cauldron acceptance burst
- cauldron rejection attack cue
- hazard activation pulse
- death burst or curse dissolve

### Effects rules
- Keep particle counts low.
- Use effects to signal logic, not spectacle.
- Effects must not cover feet anchors or landing surfaces.
- Transformation effect is the one place where visual intensity can spike.[web:18][web:13]

## UI visual specification
Even though this file is asset-focused, the HUD must align with the art direction.

### HUD elements
- day-night meter, based on sun/moon progression from the original concept.[web:18][web:32]
- lives display
- carried item display
- current cauldron request display
- pause/settings overlay

### HUD style rules
- Minimal fantasy ornament.
- Geometric panels inspired by room architecture.
- Strong icon silhouettes.
- Muted framing so gameplay remains primary.

## Asset resolution and export rules
Claude needs explicit production constraints.

### Base export rules
- Final sprite assets: PNG with transparency.
- Optional master source: layered PSD, Aseprite, or Krita files if available.
- Atlases for runtime use.
- No JPEG for gameplay sprites.

### Resolution policy
Work at **1x production scale** first to avoid inconsistent resizing.

Recommended starting sizes:
- character atlas frame region: 96x112 px
- enemy frame region: 80x96 px
- small pickup: 48x48 px to 64x64 px canvas
- standard tile: 64x32 px footprint
- full block: 64x64 px or more depending on vertical extension
- effect burst canvas: 64x64 px to 128x128 px

## Naming convention
Use deterministic file names.

### Pattern
`category_subject_variant_state_direction_frame`

Examples:
- `char_sabreman_human_walk_ne_f03.png`
- `char_sabreman_werewulf_idle_sw_f02.png`
- `obj_goblet_gold_idle_f01.png`
- `roomblock_stone_full_a_toplight.png`
- `haz_spikes_iron_active_f04.png`
- `npc_melkhior_idle_ne_f01.png`
- `fx_transform_start_f06.png`

## Folder structure

```text
assets/
  characters/
    sabreman/
      human/
      werewulf/
    enemies/
    npc/
  rooms/
    blocks/
    walls/
    exits/
    themes/
  objects/
    pickups/
    interactives/
    hazards/
  effects/
  ui/
  atlases/
  metadata/
```

## Metadata specification
Every asset batch should include machine-readable metadata, for example JSON:

```json
{
  "id": "char_sabreman_human_walk_ne_f03",
  "category": "character",
  "anchor": { "x": 40, "y": 88 },
  "footprint": { "w": 0.8, "d": 0.8 },
  "height": 1.8,
  "collision": "player",
  "sortFootOffset": { "x": 0.0, "y": 0.0, "z": 0.0 }
}
```

## Animation readability rules
Animation must preserve gameplay clarity.

- Never move the feet anchor unintentionally between frames.
- Walk cycles should translate weight, not shift collision.
- Pickup animations must not hide the item handoff moment.
- Hazard cycles need a clearly visible anticipation frame.
- Transformation animation must visibly remove human silhouette cues before the werewulf becomes active.[web:18][web:3]

## Color system and palette rules
Because the original game leaned on monochrome rooms, color discipline is essential.[web:13][web:55]

### Global palette strategy
- Neutral stone and shadow backbone.
- One room-family dominant hue.
- One reserved gameplay accent for important pickups or danger.
- One magic accent family for special effects.

### Value hierarchy
Use value first, hue second:
- floor and architecture live in middle-value bands,
- player silhouette must sit in a high-recognition contrast band,
- hazards and pickups use selective contrast spikes,
- UI should not exceed pickup contrast except during alerts.

## Do and don't list

### Do
- Use large simple forms.
- Keep room props sparse.
- Emphasize top/side face separation.
- Make interactives slightly cleaner and more contrasted than architecture.
- Preserve the eerie, puzzle-box feeling of the castle.[web:18][web:13]

### Don't
- Over-texture stone.
- Use realistic perspective distortion.
- Let particles obscure feet or landing edges.
- Make every room colorful.
- Add generic fantasy clutter like banners, barrels, and candles everywhere.
- Make the werewulf grotesque or horror-bloody.

## Production sequence for Claude Code
Claude Code should generate assets in a controlled order.

### Phase 1: scale validation
1. Create one tile, one full block, and one half block.
2. Create Sabreman human idle in 4 directions.
3. Create Sabreman werewulf idle in 4 directions.
4. Create one pickup object and one hazard.
5. Place them together in one test room render.

### Phase 2: movement validation
6. Create human walk and jump frames.
7. Create werewulf walk and jump frames.
8. Create one moving block and one exit doorway.
9. Test readability in motion.

### Phase 3: slice asset set
10. Create the first room theme kit.
11. Create 4 to 6 collectible object families.
12. Create 2 to 3 enemy families.
13. Create cauldron room asset set.
14. Create effects and HUD icons.

### Phase 4: production expansion
15. Add remaining room themes.
16. Add variant architecture pieces.
17. Expand enemy and hazard families.
18. Build atlases and metadata bundles.

## Acceptance checklist
Claude-generated graphics are acceptable only when:
- Sabreman reads clearly in both forms at gameplay scale.
- Pickups are recognizable without UI labels.
- Hazards are readable before they kill the player.
- Top surfaces and collision edges remain clear in every room.
- The cauldron room stands out as a major objective space.[web:18][web:3]
- The overall image still feels like Knight Lore in spirit, not a generic isometric fantasy game.[web:13][web:55]

## Recommended next companion document
The best next file after this one is an **Asset Production Prompt Pack** for Claude Code, containing explicit prompts/templates for:
- Sabreman human sprite sheet
- Sabreman werewulf sprite sheet
- room block kit
- first pickup set
- first hazard set
- cauldron room concept sheet

That would let Claude generate assets directly against this specification rather than improvising from the broader design docs.
