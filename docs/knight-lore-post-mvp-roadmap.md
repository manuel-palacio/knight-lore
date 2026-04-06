# Knight Lore — Post-MVP Roadmap and Vertical Slice Production Plan

## Purpose
This document defines the phase **after** the Android MVP for a modern Kotlin remake of **Knight Lore**. The MVP proves the technical foundation; the next phase must prove that the game is fun, scalable, content-complete, and faithful to the original's structure of 128 single-screen rooms, 40 in-game days, five starting lives, and 14 sequential cauldron deliveries required to break Sabreman's curse.[web:18][web:21][web:28]

The post-MVP phase should not jump straight to full production. The right next milestone is a **vertical slice** that is polished enough to validate gameplay feel, puzzle readability, room authoring workflow, routing pressure, visual style, and production cost before the team commits to building the full castle.[web:18][web:9][web:27]

## What post-MVP means
After the MVP, the codebase should already support a small playable set of rooms, deterministic simulation, movement, jumping, item pickup/drop, transformation logic, and a prototype cauldron loop. The post-MVP plan expands that into a real game slice that reflects the original design more honestly: room-based navigation, object manipulation, enemy pressure, transformation constraints, and long-horizon route planning under a time limit.[web:18][web:9][web:21]

In simple terms:
- **MVP proves the engine.**
- **Vertical slice proves the game.**
- **Production proves the product.**

## Post-MVP objectives
The next phase should pursue six concrete goals:

1. Prove that the modern movement and controls feel fair while preserving the deliberate precision of the original game.[web:18][web:27]
2. Prove that isometric readability remains strong once multiple room themes, hazards, stacked objects, and moving elements exist at the same time.[web:18][web:35]
3. Prove that a data-driven room pipeline can support medium-scale content authoring without brittle code forks.
4. Prove that the item and cauldron progression loop creates meaningful routing and tension, especially under the day-night cycle and life pressure.[web:21][web:28]
5. Prove that the team's visual and audio direction can modernize the experience without destroying its identity as a monochrome-room, isometric puzzle adventure.[web:18][web:9]
6. Prove that the project can scale from a handful of rooms to a full castle without major architectural rewrite.

## Success criteria for the vertical slice
The vertical slice should be considered successful only if it delivers **all** of the following:

- 10 to 20 interconnected rooms with final-quality structure, not placeholder test chambers.
- At least 3 distinct room archetypes, for example traversal, hazard, and puzzle-object rooms.[web:27][web:35]
- A real cauldron progression loop with multiple requested items in sequence.[web:21][web:28]
- Human and werewulf forms both matter to traversal or risk.[web:18][web:9]
- A small but representative enemy and hazard set.
- Distinct room visuals and sound treatment.
- Full save/resume reliability.
- Clear onboarding and controls.
- Debug tools sufficient to author and test rooms efficiently.

If any of these are missing, the slice is still a prototype, not a production validator.

## Vertical slice scope
Do **not** attempt the full 128-room game immediately. The vertical slice should be deliberately small but representative.

### Recommended scope
- 10 to 20 rooms.
- 1 central hub or cauldron-adjacent anchor room.
- 2 to 3 branches with different puzzle styles.
- 4 to 6 item pickups.
- 2 to 4 hazards.
- 2 to 3 enemy behaviors.
- 1 to 2 moving/falling block mechanics.
- 1 genuine transformation-pressure scenario.
- 1 route optimization decision where timing matters.[web:18][web:21][web:27]

### Why this scope works
A slice of this size is large enough to expose repetition, control frustration, room readability issues, and data-pipeline pain, but still small enough to iterate quickly. It also mirrors the original game's core identity, where most rooms are not throwaway corridors but bespoke spaces with their own puzzle or traversal logic.[web:35][web:27]

## Vertical slice content design
The slice should contain a representative mix of content, not random rooms.

### Recommended room mix
- **Traversal rooms**: clean movement challenges that teach isometric navigation.
- **Puzzle-object rooms**: require item carrying, object repositioning, or block interaction.[web:9][web:27]
- **Hazard rooms**: spikes, crushers, hostile timing windows, or precision routes.[web:18]
- **Transformation rooms**: safer in one form, riskier in another, or explicitly gated by jump capability.[web:18][web:9]
- **Recovery rooms**: lower-pressure transitions that prevent fatigue and improve pacing.
- **Cauldron-facing rooms**: reinforce the larger objective and create navigation memory.[web:21][web:28]

### Slice progression pattern
A good slice should teach, test, combine, and then pressure the player:
1. Introduce movement and spatial reading.
2. Introduce carry/drop behavior.
3. Introduce one hazard pattern.
4. Combine object handling with hazard timing.
5. Introduce transformation pressure.
6. Force a short route decision involving time, risk, or inventory.
7. Deliver an item to the cauldron and reveal the next request.[web:21][web:28]

## Post-MVP workstreams
The work after MVP should be split into parallel but coordinated workstreams.

### 1. Gameplay tuning
This is the highest priority. If the controls, jump arcs, landing logic, or room readability feel wrong, content production should pause.

Focus areas:
- Input latency and smoothing.
- Jump commitment and forgiveness window.
- Collision edge behavior.
- Player visibility near overlapping blocks.
- Hazard fairness and telegraphing.
- Human vs werewulf movement differences.[web:18][web:27]

### 2. Content pipeline
The room pipeline must become a proper authoring system, not just hand-written JSON files.

Needed improvements:
- Room schema validation.
- Graph validation for exits and spawn points.
- Item placement validation.
- No-soft-lock checks where possible.
- Debug room browser.
- Hot reload in development builds.
- Export/import tools for room data.

### 3. Art direction and readability
The original used monochrome single-screen rooms with strong silhouette readability.[web:18] A modern version must preserve that clarity even with richer art.

Art tasks:
- Define palette rules per room theme.
- Standardize silhouette shapes for hazards and interactives.
- Finalize player animations for both forms.
- Establish occlusion handling for overlapping objects.
- Create lighting/shadow rules that help depth without obscuring gameplay.

### 4. Audio and atmosphere
The remake can improve this area significantly because the original is often remembered primarily for visuals and mechanics rather than standout audio.[web:18]

Audio tasks:
- Room ambience categories.
- Transformation cue design.
- Hazard warning sounds.
- Pickup/drop feedback.
- Cauldron success and rejection audio.[web:21][web:28]

### 5. UX and onboarding
Classic games often assume too much. A modern release needs clarity without over-explaining.

Add:
- First-run control tutorial.
- Optional movement/jump assist cues.
- Clear item-request presentation.
- Death explanation and recovery clarity.
- Settings for classic vs modern assistance.

### 6. QA and balancing
Room-heavy puzzle games become expensive to debug late. Start structured QA now.

Track:
- Soft locks.
- Unreachable items.
- Save corruption or inconsistent room state.
- Draw-order bugs.
- Transformation edge cases near exits or hazards.
- Difficulty spikes and route traps.

## Production phases after MVP
Use the phases below instead of one giant feature list.

## Phase 1 — Vertical slice pre-production
Purpose: define the slice before building more content.

### Deliverables
- Slice goals and quality bar.
- Final room archetype list.
- First room theme guide.
- Content pipeline rules.
- Tuning checklist.
- Debug feature list.

### Exit criteria
- Everyone agrees what “final-quality slice” means.
- Core movement values are frozen enough for room tuning.
- The asset/data pipeline is ready for several rooms in parallel.

## Phase 2 — Vertical slice production
Purpose: build the 10 to 20 room slice.

### Deliverables
- Final-quality slice rooms.
- Real item/cauldron progression for the slice.
- Initial enemy/hazard roster.
- Save/resume and checkpoint behavior.
- Audio and visual pass.
- Playtest instrumentation.

### Exit criteria
- New testers can understand goals and complete the slice.
- The slice demonstrates tension, clarity, and replay value.
- Tooling supports content iteration without code changes for most rooms.

## Phase 3 — Full production preparation
Purpose: decide whether the project is ready to scale to the full castle.

### Deliverables
- Updated production estimate for all 128 rooms.[web:18]
- Room authoring throughput metrics.
- Bug class inventory.
- Asset production plan.
- Performance budget on representative Android devices.
- Final decision on art scope: retro-faithful vs modern reinterpretation.

### Exit criteria
- The team can estimate full production honestly.
- No major architecture rewrite is required.
- The slice has validated player appeal.

## Phase 4 — Full production
Purpose: build the full game.

### Deliverables
- Complete room graph approaching or matching the original 128-room structure.[web:18]
- Full item distribution.
- Complete 14-step cauldron progression system.[web:21][web:28]
- All required hazards, enemies, and special rooms.
- Final art, audio, menus, onboarding, and accessibility.
- Comprehensive regression suite.

### Exit criteria
- Game is content-complete and completable end-to-end.
- No known progression blockers remain.
- Performance and save integrity are stable.

## Phase 5 — Polish and release prep
Purpose: turn a complete game into a ship-ready product.

### Deliverables
- Balance pass for time pressure, route viability, and life economy.[web:18][web:21]
- Device compatibility pass.
- Store listing assets.
- Achievement and analytics decisions if desired.
- Final accessibility review.
- Launch candidate build.

## Content pipeline upgrades needed after MVP
The single biggest multiplier after MVP is better authoring tooling.

### Room authoring requirements
Each room should support:
- Unique room id.
- Theme and palette.
- Static block set.
- Dynamic block definitions.
- Hazard placements.
- Enemy spawns.
- Item anchors.
- Exit definitions.
- Special rules and scripting hooks.
- Test metadata, expected route, difficulty label.

### Validation checks
Automate as much as possible:
- Broken exit links.
- Invalid spawn coordinates.
- Missing assets.
- Overlapping solids.
- Item anchors inside hazards.
- Cauldron-request mismatch data.
- Room graph disconnected from critical path.

### Recommended next tooling step
Build a **developer room inspector** before mass room production. It should allow quick room loading, collision overlays, spawn editing, item placement checks, and transformation simulation. That tool will pay for itself quickly.

## Tuning checklist for post-MVP
Before scaling content, lock down the feel of the game.

### Movement
- Is directional intent easy to predict in isometric space?
- Are jump start and landing positions readable?
- Do players understand edge behavior?
- Can skilled players move precisely without fighting controls?

### Transformation
- Does the player get enough warning before transformation?[web:18]
- Does the form change create interesting decisions rather than annoyance?
- Are form-dependent movement differences meaningful?
- Is the cauldron-room danger clear in the wrong form?[web:21][web:28]

### Hazards and enemies
- Are deaths understandable?
- Are enemy hitboxes fair?
- Is hazard timing legible?
- Do retries feel immediate enough on mobile?

### Item loop
- Is the requested item always clear?[web:21][web:28]
- Can players understand where they made a route mistake?
- Is carrying and dropping friction low enough to be strategic, not tedious?

## Quality bar for the vertical slice
The slice should look and feel close to shipping quality in the following dimensions:

| Area | Required quality bar |
|---|---|
| Controls | Stable, responsive, readable in isometric space |
| Room design | Intentional, distinct, and replayable |
| Visuals | Final or near-final direction, not placeholder art |
| Audio | Representative final-quality feedback and ambience |
| UX | Clear objective, clear requests, clear death/retry flow |
| Performance | Stable frame pacing on target Android devices |
| Saves | Reliable suspend/resume and manual save load |
| Debugging | Fast iteration tools for room tuning and bug reproduction |

If the slice still relies heavily on temp art, missing sounds, or manual debugging, it may hide real production costs.

## Suggested team workflow after MVP
Even if Claude Code is doing most of the implementation, organize work like a small production pipeline.

### Weekly loop
1. Select one gameplay or content theme for the week.
2. Implement or refine only the systems needed for that theme.
3. Add or tune 1 to 3 rooms that exercise it.
4. Playtest the slice repeatedly.
5. Log issues under controls, readability, pacing, and progression.
6. Fix structural issues before adding more rooms.

### Practical rule
Never add five new rooms before validating one new mechanic. Knight Lore-style content multiplies quickly, and bad rules become expensive when copied across many rooms.

## Risks after MVP
These are the biggest post-MVP risks:

- **Control drift**: modernizing movement too much and losing the original's precise puzzle identity.[web:18][web:27]
- **Visual over-decoration**: making rooms prettier but harder to read than the original monochrome spaces.[web:18][web:35]
- **Content brittleness**: too many bespoke scripts per room.
- **Soft locks**: item placement or room-state bugs breaking progression.
- **Transformation annoyance**: the curse becomes frustrating instead of strategically interesting.[web:18][web:21]
- **Production blow-up**: underestimating how long 128 handcrafted rooms take to author and tune.[web:18][web:27]

## Recommended next deliverables after this document
The best sequence after this roadmap is:

1. **Vertical slice design spec** — exact 10 to 20 room plan, room purposes, mechanics, and progression beats.
2. **Room authoring specification** — JSON schema, validation rules, and editor/debug workflow.
3. **Gameplay tuning guide** — movement constants, transformation timings, hazard fairness rules, and assist options.
4. **Art direction guide** — palettes, silhouettes, animation rules, and room readability standards.
5. **QA matrix** — progression, save/load, controls, collision, transformation, and room connectivity test cases.

## Best immediate next step
The most useful next file is the **Vertical Slice Design Spec**. It should name the actual rooms in the first 10 to 20 room production slice, define what each room teaches or tests, assign hazards and items, and map the intended player route through the slice.
