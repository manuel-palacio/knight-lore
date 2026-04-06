# Knight Lore — Puzzle and Cure Design Specification

## Purpose
This document defines the puzzle structure, cure progression, item taxonomy, cauldron request logic, room archetypes, and anti-soft-lock rules for a modern Android remake of **Knight Lore**. It exists to turn the high-level gameplay concept into a content-authoring spec Claude Code can implement without inventing the actual game design as it goes.[web:18][web:21][web:34]

The original game centers on Sabreman's curse, the 40-day time limit, the need to gather objects across the castle, and the requirement to deliver 14 requested items to the cauldron in the correct sequence.[web:18][web:19][web:34]

## Source behaviors to preserve
The remake should preserve these original progression facts:
- Sabreman has 40 days to break the curse.[web:18][web:16][web:27]
- The cauldron requires 14 items in total.[web:19][web:34][web:62]
- The request order is sequential rather than fully random, though starting position within the sequence can vary by run.[web:6][web:34]
- Day-night transformation changes how rooms and enemies behave, adding route pressure and puzzle complexity.[web:18][web:16][web:21]

## Design goals
The puzzle and cure design should achieve five things:
1. Preserve the feeling of a mysterious hostile castle full of interconnected object puzzles.[web:18][web:35]
2. Make the cure loop understandable enough for modern players without trivializing discovery.[web:27][web:21]
3. Ensure item routes create meaningful time pressure under the day-night cycle.[web:18][web:27]
4. Prevent unfair soft locks while keeping the original's planning tension.
5. Support both classic-faithful and modernized modes through configuration, not separate content forks.

## Cure progression overview
The core game loop is:
1. Reach the cauldron safely.
2. Learn or view the currently requested item.[web:34]
3. Navigate to rooms holding relevant items.
4. Survive hazards and form changes.
5. Carry and return the requested item.
6. Deliver it at the cauldron.
7. Receive the next request.
8. Repeat until 14 items are delivered and the curse is broken.[web:19][web:34]

## Canonical request sequence
A useful reference sequence documented by later guides is:

1. Crystal ball
2. Goblet
3. Wine bottle
4. Gem
5. Crystal ball
6. Poison
7. Boot
8. Teacup
9. Gem
10. Poison
11. Boot
12. Goblet
13. Teacup
14. Wine bottle[web:6]

### Production rule
Use this sequence as the default **classic-faithful** request chain. The run may begin at a variable point in the sequence if desired, but the sequence itself should remain fixed in classic mode.[web:6][web:34]

### Modern mode option
In modern mode, allow one of these controlled variants:
- same sequence but always start at step 1,
- same sequence with stronger request preview/help,
- same sequence plus route hints after repeated failure.

## Item taxonomy
The cure loop requires item identities that are visually distinct and design-relevant.

### Required core cure item families
- Crystal ball
- Goblet
- Wine bottle
- Gem
- Poison vial
- Boot
- Teacup[web:6]

### Quantities
Because the request sequence repeats some item types, the content set must support multiple instances of the same item family across the castle.[web:6] At minimum, place enough instances to satisfy the full sequence without forced impossible backtracking.

### Recommended item model
Each item instance should include:
- unique item id,
- item family,
- room id,
- world position,
- accessibility tags,
- respawn behavior,
- whether it is cure-relevant or decorative.

## Item placement strategy
Do not place cure items arbitrarily. Use placement tiers.

### Tier 1: Early-route items
- closer to the cauldron or early accessible branches,
- teach carrying and return routes,
- limited hazard density.

### Tier 2: Mid-route items
- require stronger room memory,
- use moving blocks or hazard timing,
- may require transformation-aware routing.

### Tier 3: Late-route items
- farther travel cost,
- denser hazard chains,
- greater route optimization pressure,
- more punishment if night arrives during return.

## Duplicate item placement rules
Because some requested types appear twice, use these rules:
- never place all duplicates of a required type behind the same puzzle mechanic,
- avoid putting both copies in equally punishing late-game rooms,
- allow at least one safer and one riskier route for repeated item families,
- in modern mode, ensure one duplicate remains reasonably recoverable late in a run.

## Cauldron behavior
The cauldron is the progression validator and should be explicit in its rules.[web:34]

### Required behavior
- When Sabreman enters as a human, the requested item is visible above or near the cauldron.[web:34]
- Delivering the correct item advances progression.
- Delivering the wrong item should fail clearly and safely in modern mode, and optionally punish in classic mode.
- Entering in werewulf form may be dangerous or lethal, reflecting original guidance to avoid doing so.[web:16][web:34]

### Feedback states
- idle request display,
- accept correct item,
- reject incorrect item,
- react to werewulf intrusion,
- final cure completion.

## Day-night and transformation as puzzle systems
The day-night cycle is not just a timer; it is a puzzle pressure layer.[web:18][web:21]

### Core rules
- Human during day.
- Werewulf during night.[web:18]
- Transformation at nightfall and sunrise interrupts control and can create danger windows.[web:21]
- Different forms alter movement, enemy behavior, or room safety.[web:16]

### Puzzle uses of transformation
Use the form change in these ways:
- **Traversal gating**: one form jumps or moves differently.
- **Enemy routing**: some enemies flee or attack differently.[web:16]
- **Cauldron restriction**: the hub is safer or only usable in human form.[web:34]
- **Timing pressure**: long return route becomes dangerous if sunset arrives mid-trip.
- **Risk-reward routing**: shortest route may cross rooms that are much worse in werewulf form.

### Rule of fairness
Players should be punished for bad planning, not for hidden transformation timing. Always provide a readable day-night meter and enough warning before form change.[web:18]

## Puzzle archetypes
Build rooms from a reusable set of puzzle archetypes.

### 1. Traversal puzzle
Goal: reach an exit or item through block spacing and jump timing.
- teaches spatial reading,
- low object complexity,
- often used early.

### 2. Carry puzzle
Goal: move an item across hazards or onto a platform.
- item handling matters,
- return path may differ from approach path,
- supports tension under transformation timing.

### 3. Stack or stepping puzzle
Goal: use item or block placement to gain height.
- emphasizes object-as-tool logic,
- should have clear support surfaces.

### 4. Moving block puzzle
Goal: use a kinematic block as temporary support.
- requires timing,
- often combined with jump commitment.

### 5. Hazard rhythm puzzle
Goal: pass through crushers, spikes, or timed hazards safely.
- teaches cadence,
- works well on return trips with item pressure.

### 6. Transformation puzzle
Goal: arrive in the right form or survive a forced form change in a dangerous room.
- signature Knight Lore content,
- should appear in mid and late progression.[web:16][web:21]

### 7. Route puzzle
Goal: choose between safer long path and shorter dangerous path.
- strongest when tied to requested item return.
- gives meaning to map knowledge and time limit.[web:27]

## Room role taxonomy
Every room in the castle should have a declared role. Suggested roles:
- start room,
- cauldron room,
- connector room,
- traversal test,
- item vault,
- hazard gauntlet,
- transformation trap,
- enemy pressure room,
- recovery room,
- optional shortcut room.

This prevents rooms from becoming visually different but mechanically redundant.

## Puzzle sequencing for the vertical slice
For the first 10–20 room slice, sequence mechanics like this:
1. Basic traversal.
2. Basic carry-and-return.
3. First hazard rhythm room.
4. Object stepping puzzle.
5. First transformation-pressure room.
6. Combined carry plus hazard room.
7. Branching route room.
8. Higher-pressure return loop to the cauldron.

## Difficulty curve for full production
The full castle should scale difficulty across three broad bands.

### Early game
- safe teaching spaces,
- short routes,
- fewer enemies,
- one mechanic per room.

### Mid game
- combined mechanics,
- longer return routes,
- more transformation interactions,
- denser hazard timing.

### Late game
- difficult route optimization,
- multi-room retrieval under time pressure,
- more punishing enemy pressure,
- greater cost for failed returns.

## Anti-soft-lock rules
A cure-driven puzzle game is especially vulnerable to soft locks. Enforce these rules.

### Mandatory protections
- No required item can become permanently unreachable.
- Dropped items must snap to safe legal positions.
- Transitioning rooms with carried items must preserve item state safely.
- If an item falls into an invalid zone, relocate it to a fallback anchor.
- Request sequence must never ask for an exhausted or inaccessible item family.
- Save/load must preserve all item placements and delivered-state progression exactly.

### Optional modern protections
- Reset room items from pause menu.
- Show last known location of currently requested item after repeated failure.
- Undo most recent item drop in accessibility mode.

## Route design rules
Route planning is central to the original's tension.[web:27][web:6]

### Good route design
- multiple meaningful branches,
- recognisable landmarks,
- shortcuts that reward skill,
- clear cost difference between safe and risky routes,
- route changes depending on current requested item.

### Bad route design
- one obvious optimal path every time,
- item rooms that are isolated but not memorable,
- long corridors with no gameplay value,
- repeated backtracking through low-engagement spaces.

## Content data model
Use explicit content models so Claude Code can author puzzles as data.

```kotlin
data class CureSequenceDefinition(
    val mode: CureMode,
    val sequence: List<ItemFamily>,
    val variableStartIndex: Boolean,
)

 data class PuzzleRoomTag(
    val roomId: String,
    val roles: List<RoomRole>,
    val mechanics: List<MechanicTag>,
    val difficulty: Int,
 )
```

### Helpful tags
- `TRANSFORMATION_CRITICAL`
- `RETURN_ROUTE_HAZARD`
- `SAFE_DROP_ZONE`
- `ITEM_RECOVERY_ROOM`
- `CAULDRON_APPROACH`
- `OPTIONAL_SHORTCUT`

## Modernization options
Preserve the core loop while offering optional improvements.

### Classic-faithful mode
- original-like request sequence,
- harsher punishment,
- minimal guidance,
- no item hints,
- stronger werewulf/cauldron danger.[web:34]

### Modern mode
- clearer request display,
- gentler wrong-item handling,
- room-level retry support,
- optional item-location memory,
- more readable transformation warnings.

### Accessibility mode
- slower hazard cycles,
- extended dusk warning,
- clearer exits and pickup highlights,
- reset options to avoid dead runs.

## Required content deliverables after this spec
Claude Code should produce these next design artifacts:
1. Full item instance table for the vertical slice.
2. Full room role map for the slice.
3. Cauldron request progression config.
4. Anti-soft-lock validation rules.
5. Route analysis notes for each requested item family.

## Definition of done
Puzzle and cure design is ready for production when:
- every required item family is defined and placed,
- request sequence logic is explicit,
- transformation has clear puzzle uses,
- no critical path item can soft-lock a run,
- every room has a mechanical role,
- classic and modern behavior differences are configuration-based,
- the vertical slice demonstrates the full cure loop in miniature.[web:18][web:21][web:34]
