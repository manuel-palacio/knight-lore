# Knight Lore Remake — Visual Do Nots

This document is the enforcement companion to `ART_DIRECTION.md`.

Its purpose is simple:
**stop the project from drifting back into soulless, generic, procedural-looking art.**

If `ART_DIRECTION.md` describes what the game **must become**, this file describes what it **must never fall back into**.

Any visual implementation that violates these rules should be rejected or reworked.

---

## How to Use This Document

Use this file during:
- PR review
- render refactors
- art implementation
- asset design
- prompt writing for Claude
- screenshot critique
- room-by-room polish passes

If a change feels “better” but still lands in one of these traps, it is not acceptable.

---

## Absolute Visual Failure Modes

These are the highest-priority anti-patterns.
If a feature introduces any of them, stop and redesign.

### 1. Debug-renderer look
The game must not look like a technically correct test scene.

Symptoms:
- every object reads like geometry first and art second
- visible structure but no personality
- neat but emotionally blank rooms
- forms feel assembled, not designed

If a screenshot looks like “the renderer is working” rather than “this world exists”, it fails.

### 2. Procedural sameness
The game must not look like one visual rule was applied everywhere.

Symptoms:
- all rooms use the same stone logic
- all props use the same edge logic
- all items are the same language with recolors
- all actors share the same body logic
- all rooms have similar visual density

Uniformity is death.

### 3. Sterile vector look
Vector is allowed.
Sterility is not.

Symptoms:
- shapes too clean and polite
- no attitude in silhouette
- all curves and corners feel software-default
- everything feels smoothed, centered, balanced, and safe
- art feels like icons scaled up into a game world

The project must feel illustrated, not diagrammed.

---

## Character Do Nots

### Do not build characters as mannequins
Forbidden character construction patterns:
- torso rectangle + arm rectangles + leg rectangles
- head circle/oval dropped on top as default solution
- costume identity carried only by color changes
- resizing the same base body for different actor classes

If the body logic is generic, the character will stay generic.

### Do not make the player a neutral adventurer
The player must not read as:
- basic explorer
- standard knight
- generic hero unit
- upright figurine
- mobile game mascot

Forbidden traits:
- neutral straight spine
- even shoulder line
- identical left/right silhouette
- bland proportions
- no burden, no curse, no tension

### Do not let costume details carry the whole design
Belts, buckles, shorts, trim, gloves, highlights, and little accessories are not the character.

If removing interior details destroys the design, the silhouette is too weak. [web:251]

### Do not make the werewolf a furry human
Forbidden werewolf shortcuts:
- same body with fur color
- same torso and leg proportions as human form
- ears and fangs added to a humanoid base
- same posture with only head swap

The werewolf must have different mass, different posture, and different energy.

### Do not animate mannequins
Forbidden motion patterns:
- leg alternation only
- idle = standing still with tiny bob
- transform = color flash plus resize
- jump = move upward without squash/stretch or body attitude

Animation must change shape language, not just position.

---

## Item Do Nots

### Do not use recolor-only differentiation
Items must not be distinguished mainly by hue.

Forbidden:
- same pickup shape with different palette
- same bottle shape for multiple items
- same blob silhouette for all treasure objects
- tiny details that only read when zoomed in

Each item must be readable by outline first. [web:251]

### Do not design items at realistic scale if readability suffers
If a key becomes tiny, make it larger.
If a goblet needs a bigger cup shape, exaggerate it.

Gameplay readability is more important than literal object proportions. [web:252]

### Do not over-detail pickups
A pickup should not require tiny texture strokes, face details, or subtle inner shading to be identifiable.

If it cannot be recognized in one glance, simplify and exaggerate the outline.

---

## Room Do Nots

### Do not rely on material variation as room identity
A room is not unique just because it has:
- different wall hue
- different floor hue
- different dither spacing
- different brick pattern

Material treatment alone is not composition.

### Do not make every room “stone box + props”
Forbidden room formula:
- same wall treatment
- same empty volume
- same object distribution
- same block emphasis
- same center-weighted composition

Every important room needs a memory hook.

### Do not decorate every inch
Too much detail kills staging.

Forbidden:
- busy wall texture everywhere
- all corners occupied
- grime on every surface
- ornament repeated on every wall
- multiple competing focal elements

Contrast in density is required. [web:245][web:251]

### Do not center everything
A centered room layout is sometimes acceptable for puzzle structure.
A centered **visual composition** everywhere is not.

Forbidden:
- every anchor object in the center
- every dramatic prop aligned symmetrically
- every room equally balanced left-to-right

The eye should be pulled, not merely parked.

### Do not make all walls equally important
Some walls should recede.
Some should frame.
One should often dominate.

If all four walls feel equally loud, the room has no hierarchy.

---

## Surface and Texture Do Nots

### Do not treat texture as soul
More texture does not equal more atmosphere.

Forbidden substitute fixes:
- adding dither because the room feels dead
- adding cracks because the room feels generic
- adding more bricks because the wall feels plain
- adding noise because the scene lacks mood

If composition and silhouette are weak, texture will only decorate the problem.

### Do not use one texture language for everything
Forbidden:
- same edge treatment on walls, blocks, props, and items
- same highlight logic on every object
- same damage pattern repeated across all rooms
- same bevel and shading formula everywhere

Different object families need distinct visual logic.

### Do not over-explain forms with surface marks
If the silhouette is weak, no amount of masonry lines, grout lines, or decorative edging will save it.

Shape solves the problem first.
Texture supports after that.

---

## Lighting Do Nots

### Do not light the room evenly
Flat readability is not the same as good lighting.

Forbidden:
- whole room equally visible
- same shadow depth everywhere
- no contrast pockets
- every prop equally lit

The project should feel theatrical, not office-lit.

### Do not use glow as a shortcut to atmosphere
Glow is not mood by itself.

Forbidden:
- blue line glow on exits as generic fantasy signal
- bloom-like highlight used everywhere
- colored halo on objects with no compositional reason
- magical glow replacing actual focal design

Light must serve shape and staging.

### Do not ignore negative space
Darkness is a tool.
If every area is fully described, the scene becomes flat and noisy.

---

## Composition Do Nots

### Do not give everything equal weight
If all elements compete equally, none of them matter.

Forbidden:
- same line weight everywhere
- same contrast everywhere
- same object scale emphasis everywhere
- all elements placed to be equally visible

Hierarchy is mandatory. [web:245][web:251]

### Do not remove quiet zones
A good room needs:
- focus area
- support area
- quiet area

If every surface is active, the eye gets tired and the room loses drama.

### Do not fill the room because “it looked empty”
Emptiness can be dramatic.
Silence can be dramatic.
Negative space can make one object memorable.

Do not patch emotional weakness with clutter.

---

## Color Do Nots

### Do not use palette swaps as identity
A new palette is not a new visual idea.

Forbidden:
- same room logic with different hues
- same actor silhouette with different clothing color
- same collectible shape with different tint
- same material response across all themes

### Do not flatten value structure
If the whole room lives in a narrow mid-tone range, it will feel dead.

Forbidden:
- weak foreground/background separation
- accents too close in value to surroundings
- all surfaces equally visible
- color contrast without value contrast

### Do not oversaturate accents
Accent colors should mean something.
They must not appear everywhere at equal intensity.

Too much saturation makes the world feel toy-like in the wrong way.

---

## Prompting Do Nots for Claude

When prompting Claude, do **not** ask vague requests like:
- improve the graphics
- make it prettier
- make it more retro
- add more atmosphere
- make the character cooler
- make walls less plain

Those prompts invite local procedural tweaks.

Instead, force decisions with constraints:
- redesign the player silhouette to read as cursed and asymmetrical in black fill
- create one authored throne set-piece with crooked shape language and off-center staging
- replace recolor-based item differentiation with unique silhouette templates
- add one dominant light source and one negative-space zone to room 006

Claude must be told what to preserve, what to stop doing, and what emotional outcome to target.

---

## Code Review Do Nots

Reject any graphics PR that mainly does one of these:
- changes colors without changing shapes
- changes dither without changing composition
- changes outlines without changing silhouette
- tweaks dimensions without changing design language
- adds texture to compensate for weak focal hierarchy
- adds detail equally to everything
- cleans geometry while reducing personality

Also reject PRs that make visuals more consistent in the wrong way.
Sometimes stronger art requires **intentional inconsistency**:
- asymmetry
- broken rhythm
- uneven damage
- shape contrast
- varied focal weight

---

## Quick Smell Tests

If the answer to any of these is “yes”, the art is drifting in the wrong direction:

- Could this screenshot pass as a generic prototype?
- Does the room rely mostly on stone treatment for identity?
- Are the player and enemy mostly distinguished by color?
- Would removing interior shading make the design collapse?
- Is every room similarly balanced and similarly busy?
- Are items readable only because of color or labels?
- Does the scene feel more polished than memorable?
- Does the art feel system-generated rather than authored?

If yes, rework it.

---

## Final Enforcement Rule

The team must never confuse these with success:
- cleaner
- more detailed
- more textured
- more polished
- more technically correct

The right success criteria are:
- more memorable
- more eerie
- more readable
- more distinctive
- more hand-authored
- more emotionally specific

If a change improves polish but not identity, it is not enough.
