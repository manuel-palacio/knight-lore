# Knight Lore — Asset Production Prompt Pack for Claude Code

## Purpose
This document contains practical prompt templates and generation instructions Claude Code can use to create the first production asset batches for a modern Android remake of **Knight Lore**. It is intended to be used together with the art direction and asset specification, not as a replacement for it.[web:18][web:13]

The prompts below assume a stylized 2.5D isometric fantasy look with monochrome-per-room inspiration, strong silhouette readability, and faithful support for Sabreman's human and werewulf forms, room-based puzzles, and cauldron-driven progression.[web:18][web:55][web:3]

## General prompting rules
All prompts should follow these universal instructions:
- Keep the composition clean and gameplay readable.
- Use strong silhouette separation.
- Avoid visual clutter and over-texturing.
- Respect a 2:1 isometric logic where relevant.
- Favor stylized fantasy geometry over realism.
- Keep the atmosphere eerie, ancient, and puzzle-focused.
- Avoid generic RPG inventory-art polish that would clash with room sprites.

## Prompt structure template
Use this reusable pattern:

```text
Create [asset type] for a modern remake of Knight Lore.
Style: stylized isometric 2.5D fantasy, monochrome-room inspiration, strong silhouette readability, low clutter, clean shading, restrained texture detail.
Gameplay requirement: must read clearly at mobile gameplay scale.
Technical requirement: transparent background, centered composition, consistent anchor/pivot for sprite use.
Do not include UI, mockup frames, background scenes, or extra props unless requested.
```

## Prompt 1 — Sabreman human concept sheet

```text
Create a character concept sheet for Sabreman in human form for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, inspired by classic Knight Lore, strong silhouette readability, clean forms, low clutter, restrained medieval-adventurer costume.
Character requirements: compact explorer silhouette, visible boots, clear gloves, adventure hat or helmet silhouette, agile posture, readable from gameplay distance, not bulky, not realistic, not anime.
Output requirements: 4 directional views aligned to isometric gameplay needs (northeast, northwest, southeast, southwest), neutral pose, transparent background or plain light background, no weapons, no scenery.
Technical note: design for a gameplay sprite around 80x96 px standing read.
Avoid: heavy armor, ornate detail, modern fashion, exaggerated cartoon proportions.
```

## Prompt 2 — Sabreman werewulf concept sheet

```text
Create a character concept sheet for Sabreman in werewulf form for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, eerie and cursed but not horror-gore, strong silhouette readability, monochrome-room compatible palette.
Character requirements: clearly transformed from Sabreman, taller read than human form, broader shoulders, longer arms, clawed hands, distinct muzzle/head silhouette, slightly hunched posture, athletic and dangerous rather than monstrous gore.
Output requirements: 4 directional views aligned to isometric gameplay needs (northeast, northwest, southeast, southwest), neutral ready stance, transparent background or plain light background.
Technical note: maintain a consistent feet anchor for sprite use and readable form contrast at gameplay scale.
Avoid: body horror, blood, hyper-detailed fur, generic werewolf horror movie style.
```

## Prompt 3 — Human walk sprite sheet

```text
Create a gameplay sprite sheet for Sabreman in human form walking for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, clean readable animation, strong silhouette, restrained texture detail.
Animation requirements: 6 to 8 frame walk cycle, controlled adventurer stride, readable leg separation, stable feet anchor.
Directions required: northeast, northwest, southeast, southwest.
Output: transparent background, evenly spaced frames, sprite-sheet friendly layout, no environment.
Technical note: must remain readable at mobile gameplay scale and support item-carry variants later.
Avoid: exaggerated squash and stretch, motion blur, cinematic framing.
```

## Prompt 4 — Werewulf walk sprite sheet

```text
Create a gameplay sprite sheet for Sabreman in werewulf form walking for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, cursed creature energy, clean readable animation, low clutter.
Animation requirements: 6 to 8 frame walk cycle, longer stride than human form, more aggressive posture, stable feet anchor, readable claw and shoulder movement.
Directions required: northeast, northwest, southeast, southwest.
Output: transparent background, sprite-sheet friendly layout.
Avoid: gore, realistic fur simulation, excessive blur, exaggerated monster proportions.
```

## Prompt 5 — Transformation sequence sheet

```text
Create a transformation sequence from human Sabreman to werewulf for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, magical curse transformation, readable silhouette progression, eerie but not grotesque.
Sequence requirements: 8 to 12 frames showing clear transition from human silhouette to werewulf silhouette, stable feet anchor, brief aura or curse smoke, readable midpoint frame where the form is obviously changing.
Direction: southeast view first.
Output: transparent background, sprite-sheet ready layout.
Avoid: body horror, blood, chaotic particles that hide the silhouette.
```

## Prompt 6 — Base room block kit

```text
Create an isometric room block kit for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, monochrome-room inspiration, strong top/side face readability, minimal clutter, ancient magical castle.
Assets required: floor tile, full cube block, half-height block, tall pillar block, moving block, falling block, doorway or exit frame.
Technical requirements: align to a 2:1 isometric grid, designed for a 64x32 floor tile footprint and 32 px standard block height, transparent background, separated assets, consistent lighting direction.
Gameplay requirements: top surfaces clearly readable as standable, side faces clearly blocked, low texture noise.
Avoid: heavy realism, ornate fantasy carvings everywhere, inconsistent perspective.
```

## Prompt 7 — Ancient stone room theme sheet

```text
Create a room theme sheet for an ancient stone chamber in a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, monochrome-per-room inspiration, cool grey and moss-muted tonal family, eerie ancient castle atmosphere.
Assets required: floor variants, wall segments, corner pieces, decorative trim, exit frame accents, subtle atmospheric prop suggestions.
Gameplay requirement: must preserve clean collision readability and avoid cluttering the room.
Output: separated isometric asset sheet on plain background.
Avoid: bright saturated colors, heavy moss overgrowth, realistic grime overload.
```

## Prompt 8 — Cauldron room concept sheet

```text
Create a concept sheet for the cauldron room in a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, ritual chamber, strong focal point, monochrome-room inspiration with magical accent restraint.
Required elements: large central cauldron, ritual platform or stand, readable wizard presence or station for Melkhior, room geometry supporting puzzle readability, subtle magical glow, clear focal hierarchy.
Gameplay requirement: the cauldron must immediately read as the main objective object in the room.
Output: isometric room concept sheet plus separated cauldron asset if possible.
Avoid: overcrowded props, generic potion-shop look, excessive glowing VFX.
```

## Prompt 9 — First pickup set

```text
Create a pickup item sheet for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, clean silhouettes, readable at small gameplay scale, low clutter.
Required items: crystal ball, goblet, wine bottle, gem, poison vial, boot, teacup.
Technical requirements: each item on transparent background, consistent pseudo-isometric angle, suitable for floor placement and carry use, distinct silhouette for each item family.
Gameplay requirement: items must remain identifiable without text labels during play.
Avoid: excessive ornament, realistic material rendering, inventory UI framing.
```

## Prompt 10 — Hazard set

```text
Create a hazard asset sheet for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, gameplay-first readability, monochrome-room compatible with selective danger accents.
Required hazards: spike field, crusher block, ember vent, magical curse orb or lane, unstable platform.
Technical requirements: separated isometric assets, transparent background, active and inactive visual states where appropriate.
Gameplay requirement: danger must be readable before contact, timing cues must be visually telegraphed.
Avoid: chaotic particle overload, excessive gore, dark-on-dark unreadable contrast.
```

## Prompt 11 — Enemy starter set

```text
Create a starter enemy concept sheet for a modern Knight Lore remake.
Style: stylized isometric 2.5D fantasy, eerie magical castle threats, low clutter, strong silhouette readability.
Required enemy classes: patrol threat, floating magical threat, form-reactive threat.
Output requirements: each enemy shown in a neutral gameplay pose at isometric-friendly angle, separated on a plain background, with visually distinct silhouette cues.
Gameplay requirement: enemies must remain readable and distinct from pickups and from Sabreman at gameplay scale.
Avoid: generic RPG monsters, overdesigned armor, highly detailed anatomy.
```

## Prompt 12 — HUD icon set

```text
Create a minimal HUD icon set for a modern Knight Lore remake.
Style: geometric fantasy UI, clean and restrained, compatible with monochrome room palettes.
Required icons: day, night, transformation warning, lives, carried item slots, cauldron request indicator, pause, settings.
Gameplay requirement: must remain readable on small mobile screens.
Output: transparent background, individual icons and atlas-friendly sheet version.
Avoid: glossy mobile game UI style, ornate fantasy filigree, neon effects.
```

## Prompt refinement rules
If first-pass outputs are weak, refine prompts using these levers:
- Add “stronger silhouette separation.”
- Add “less texture detail.”
- Add “clearer top-face vs side-face readability.”
- Add “more cursed ancient castle, less generic fantasy RPG.”
- Add “must remain readable at small gameplay scale.”
- Add explicit palette family, for example “cool stone-grey with muted moss accents.”

## Batch generation order
Generate assets in this order:
1. Sabreman human concept sheet.
2. Sabreman werewulf concept sheet.
3. Base room block kit.
4. One room theme sheet.
5. Pickup set.
6. Hazard set.
7. Cauldron room concept.
8. Human walk sheet.
9. Werewulf walk sheet.
10. Transformation sheet.
11. Enemy starter set.
12. HUD icon set.

## Review checklist
Approve generated assets only if:
- silhouettes are readable,
- isometric angle is consistent,
- assets fit the monochrome-room visual logic,
- Sabreman human and werewulf forms are instantly distinguishable,
- pickups are identifiable without labels,
- hazards read as danger before interaction,
- cauldron room feels like a primary objective space.[web:18][web:34][web:55]
