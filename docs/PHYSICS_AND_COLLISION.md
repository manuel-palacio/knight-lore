# Knight Lore Remake — Physics and Collision Contract

This document defines the non-negotiable behavior for movement, collision detection, collision response, gravity, jumping, push-block interaction, falling hazards, and room transitions.

It is a **behavior contract**, not a general physics tutorial.

The purpose is to make sure the game remains:
- deterministic
- readable
- puzzle-friendly
- retro-feeling
- stable across refactors

If code behavior conflicts with this document, the document wins unless the document is explicitly updated.

---

## Purpose

The game must not drift into vague, frame-dependent, locally-fixed collision behavior.

Movement and collision are central to the game’s feel.
They are not just implementation details.

This document exists to prevent these common failure modes:
- inconsistent movement feel after refactors
- collision fixes that solve one edge case and break another
- frame-rate-dependent physics behavior
- puzzle interactions changing accidentally
- room transition logic becoming unreliable
- authored visuals masking broken movement rules

Collision detection in games is normally treated as a dedicated technical subsystem, with distinct responsibilities for detection, response, and object categories. This spec follows that approach. [web:272][web:279][web:287]

---

## Guiding Principles

### 1. Deterministic first
Simulation behavior must not depend on render frame rate.
Physics and collision must run on a fixed simulation step. Fixed-step simulation is widely used to keep movement and collision stable and avoid frame-dependent tunneling or inconsistent response. [web:290][web:292][web:294]

### 2. Gameplay clarity over physical realism
This game is not a realism simulator.
The goal is reliable, readable, puzzle-friendly movement.

Prefer:
- predictable response
- stable grounding
- clear jump arcs
- consistent push rules
- crisp solid/trigger separation

over fully realistic physics.

### 3. Solids must feel solid
The player, enemies, and push blocks must not visibly phase through solid world geometry.
Collision response exists to preserve world readability and trust. [web:272][web:288]

### 4. Triggers are not solids
Pickups, exits, scripted regions, and some interaction zones may overlap entities intentionally.
They must never be resolved like blocking geometry. Trigger behavior and solid behavior must stay separate. [web:288][web:287]

### 5. Collision behavior is part of design
A collision “fix” can change puzzle solvability, jump feel, block timing, and room navigation.
Therefore collision changes are game design changes, not merely engine cleanups.

---

## Simulation Model

### Fixed timestep
All authoritative game simulation must run at a fixed step.

#### Required rule
- physics
- collision
- gravity
- jump state
- block motion
- falling checks
- room transition eligibility
- collision-triggered event emission

must all update on the fixed tick, not on render delta.

The project already uses a fixed-timestep game loop pattern, which aligns with this requirement. [cite:167]

### Render interpolation
Rendering may interpolate between simulation states for smoothness.
Interpolation must not alter authoritative collision outcomes.
Physics/collision belong to simulation state, not render state. [web:290][web:292]

### No gameplay decisions from interpolated positions
Never use interpolated render positions for:
- overlap tests
- grounded checks
- trigger entry tests
- room transitions
- push decisions

Those decisions must use simulation positions only.

---

## Coordinate and Space Model

The game must distinguish clearly between:
- logical grid space
- continuous world position within a room
- projected render position on screen

### Required rule
Collision must use logical/world simulation coordinates.
Collision must never depend on projected isometric screen coordinates.

### Object model
Every collidable object must define:
- simulation position
- extents / collision volume
- collision category
- response policy
- dynamic or static behavior

A collision system should use simplified collision shapes or bounds rather than render geometry; that keeps detection tractable and consistent. [web:287][web:279][web:291]

---

## Collision Categories

Every entity and tile-adjacent object must belong to one or more collision categories.

### Required categories
- `SOLID_WORLD` — walls, static blocks, structural obstacles
- `SOLID_DYNAMIC` — push blocks, falling blocks, moving obstacles
- `ACTOR_BODY` — player and enemy body colliders
- `SUPPORT_SURFACE` — surfaces that can hold actors/blocks
- `HAZARD` — spikes, pits, dangerous tiles, crushing states
- `PICKUP_TRIGGER` — collectible overlap zone
- `INTERACTION_TRIGGER` — altar, cauldron, scripted interaction areas
- `EXIT_TRIGGER` — room transition zones
- `DECORATIVE` — visuals only, no collision effect

### Required rule
A category must have explicit behavior.
No object should be “kind of solid” based on ad hoc code spread across the renderer or room logic.

---

## Collision Shapes

Use simplified simulation geometry.
Do not use detailed art outlines for collision.

### Approved shape approach
Use simple, stable bounding volumes suitable for the game’s movement model.
For this project that likely means:
- axis-aligned bounds in simulation space
- grid-aligned support checks
- tile/block support occupancy checks

Simple 2D collision systems commonly use simplified bounds such as rectangles/AABBs because they are stable and efficient. [web:287][web:288][web:291]

### Forbidden approach
- pixel-perfect collision from art assets
- screen-space overlap checks
- using decorative geometry as collision geometry
- shape rules that vary by palette or visual theme

---

## Detection Model

### Broad phase
Use a cheap broad phase to identify nearby candidates.
This can be as simple as room-local filtering, tile neighborhood checks, or occupancy-based candidate selection.
Broad phase / narrow phase separation is a standard collision design pattern for performance and clarity. [web:289][web:276]

### Narrow phase
Use the authoritative overlap test only on relevant candidates.
For this project, the narrow phase should answer:
- would the actor overlap a solid after motion?
- would the actor or block leave support?
- did the entity enter a trigger?
- did a moving block begin intersecting a hazard/fall condition?

### Detection rule
Detection must be deterministic and order-consistent.
The same state and input must produce the same result every time.

---

## Movement Resolution Order

Movement resolution order must be explicit and stable.

### Required per-tick update order
1. Read input / AI intent.
2. Compute desired horizontal movement.
3. Resolve horizontal collision against solids.
4. Update jump/gravity vertical intent.
5. Resolve vertical collision / support state.
6. Resolve dynamic block interactions.
7. Resolve falling-block state changes.
8. Resolve hazard contact.
9. Resolve triggers: pickups, interactions, exits.
10. Emit gameplay events.

### Why this matters
Order changes can alter:
- whether a jump succeeds
- whether a block push occurs
- whether a fall starts this tick or next tick
- whether room transition happens before or after hazard contact
- whether landing sound/UI events fire correctly

---

## Axis Resolution

The project has already moved toward axis-specific wall hit handling instead of a single ambiguous wall collision flag. That is the right direction and should become the documented rule. [cite:169]

### Required rule
Horizontal collision resolution must preserve axis-specific intent.
Do not collapse all collision results into one generic `hitWall` behavior if the system needs directional distinction.

### Recommended behavior
- resolve movement by component or by explicit intended displacement checks
- preserve which axis was blocked
- allow sliding only when design explicitly wants it

### Forbidden behavior
- single catch-all collision flag with no axis context
- collision response that erases useful information needed for puzzle feel or animation

---

## Grounding and Support

Grounding rules are critical for jump feel and puzzle trust.

### Grounded definition
An actor is grounded only when standing on valid support geometry or valid supporting block state.

### Required support behaviors
- grounded state must be explicit
- landing must be detectable as a transition from airborne to grounded
- stepping off support must reliably transition to falling/airborne state
- support checks must work for static blocks and valid dynamic blocks

### Forbidden support behavior
- grounded inferred loosely from lack of vertical motion
- floating one tick above surfaces
- inconsistent landing on moving/falling block states

---

## Jump Contract

Jumping must feel deliberate and dependable.

### Required jump rules
- jump can begin only from valid grounded state unless future mechanics explicitly allow otherwise
- jump start must emit a distinct event
- jump arc must be simulation-driven, not render-driven
- jump must be canceled or blocked correctly if no legal launch condition exists

### Landing rules
- landing occurs on the simulation tick when grounded state becomes true after airborne motion
- landing must emit exactly one landing event per landing
- landing should not double-fire because of interpolation or noisy support checks

### Forbidden jump behavior
- frame-rate-sensitive jump height
- jump triggering from ambiguous near-ground states
- multiple landing events from one contact

---

## Gravity and Falling

Gravity exists to create readable platform and puzzle behavior, not realistic rigid-body simulation.

### Required gravity rules
- gravity affects airborne actors and falling blocks predictably
- vertical motion is advanced on fixed tick only
- collision/support checks determine when falling starts and ends

### Falling actor rules
- leaving support starts falling immediately or on a documented next-tick rule; this must be consistent
- entering support ends falling and may emit landing if appropriate

### Falling block rules
- a block that loses support must enter a documented pre-fall or falling state
- warning/crumbling states must be deterministic and tick-based
- once committed to fall, a block must not visually or logically “hover” inconsistently

---

## Push-Block Contract

Push blocks are puzzle logic, not generic rigid bodies.

### Required push rules
- the player can push only from valid contact and intent direction
- a push only succeeds if the target destination is legal
- a block may not pass through solids, actors, or illegal support states
- push resolution order must be deterministic

### Legal push destination must consider
- solid occupancy
- dynamic occupancy
- support / fall rules
- room bounds
- special tile constraints if any

### Event rules
Push behavior should emit explicit events for:
- push start
- ongoing scrape / movement if supported later
- push blocked
- block fall start
- block landed / settled

### Forbidden push behavior
- block moves because visuals overlap, not because simulation permits it
- block enters invalid half-overlap state and gets corrected later visually
- push success depends on render timing

---

## Hazards

Hazards must be unambiguous.

### Required hazard rules
- hazards are triggers with gameplay consequence, not solids unless explicitly documented
- player and actor hazard response must be consistent
- falling blocks interacting with hazards must follow explicit rules

### Required design decision per hazard type
For each hazard define:
- does it block movement?
- does it damage on overlap?
- does it kill instantly?
- can blocks cover it?
- does a block fall through it or onto it?

### Forbidden hazard behavior
- hazard meaning inferred room-by-room with no shared rule
- same hazard tile doing different things because of ad hoc code

---

## Pickups and Interaction Triggers

Triggers must remain non-blocking.

### Pickup rules
- pickups should trigger on valid overlap
- pickup collection must happen once
- pickup must not interfere with movement resolution

### Interaction trigger rules
- interactions such as cauldron zones or altar zones may require overlap plus explicit action
- interaction triggers must not behave like walls

### Forbidden trigger behavior
- pickup prevents movement
- trigger activation depends on render-layer overlap
- pickups collected multiple times because overlap persisted across multiple ticks without state change

---

## Room Transition Contract

Room transitions are collision-adjacent and must be defined precisely.

The repo already contains explicit room transition state/system logic, so this behavior should be documented rather than left implicit. [cite:170]

### Required room transition rules
- exits are trigger zones, not magic visual portals
- transition eligibility depends on explicit overlap and direction conditions
- transition state must define when movement is frozen, transformed, or continued
- actor spawn position in new room must be deterministic and safe

### Transition sequence should define
- entry condition
- pre-transition lock or not
- room swap timing
- spawn position/orientation in destination room
- post-transition grace / stabilization if any

### Forbidden transition behavior
- room changes because the player looked visually close to an opening
- exit behavior depends on art placement instead of trigger geometry
- transition and hazard/pickup ordering changes unpredictably

---

## Event Emission Contract

Collision and physics drive many downstream systems:
- audio
- UI effects
- animation state
- debug overlays
- save/load correctness

### Required event discipline
Emit clear domain events for transitions in simulation state, not for raw render conditions.

Examples:
- `JumpStarted`
- `Landed`
- `PlayerDamaged`
- `LifeLost`
- `EnteredRoom`
- `ItemPickedUp`
- push/fall events if introduced

The domain already uses event-based state changes, and those events feed UI and audio systems. [cite:166][cite:160][cite:162]

### Required rule
Events must be emitted on authoritative state transitions only.
Never emit them from render interpolation.

---

## Error Tolerance and Epsilon Rules

Tiny tolerances may be necessary, but they must be centralized.

### Required rule
If epsilon values exist for overlap, grounding, or doorway detection:
- document them
- name them clearly
- keep them centralized
- do not scatter magic numbers across systems

### Forbidden behavior
- different subsystems using different invisible fudge factors
- solving clipping issues by ad hoc offsetting in render space

---

## Debugging Requirements

The collision system must be observable.

### Required debug capabilities
Support optional debug overlays or logs for:
- collider bounds
- grounded state
- support surfaces
- hazard zones
- trigger zones
- blocked axis
- room transition triggers
- falling block states

A collision system that cannot be visualized is much harder to stabilize.

---

## Testing Requirements

Physics and collision rules must be protected by tests.

### Required test coverage
At minimum, tests should cover:
- actor blocked by wall
- axis-specific blocking correctness
- jump only from grounded state
- landing event emitted once
- stepping off support begins falling correctly
- push succeeds when destination valid
- push fails when destination blocked
- falling block state changes as expected
- hazard overlap produces correct consequence
- pickup trigger collects once
- room transition triggers only under intended conditions

The presence of room transition tests in the repo shows this style of rule-based testing is already appropriate for the codebase. [cite:170]

---

## Forbidden Implementation Patterns

Reject collision/physics changes that do any of the following:

- tie simulation outcomes to render delta
- use projected screen coordinates for authoritative collision
- mix trigger and solid logic without explicit categories
- solve collision bugs by moving art instead of simulation geometry
- use “feels better” as justification without documenting behavior change
- introduce one-off special cases with no systemic rule
- hide collision meaning in renderer-specific code
- make puzzle behavior depend on floating-point accidents or ordering ambiguity

---

## Review Checklist

Any future gameplay/physics PR should answer “yes” to all of these:

- Is the behavior fixed-step deterministic? [web:290][web:292]
- Are collision categories explicit? [web:287][web:288]
- Are solids and triggers kept separate? [web:288]
- Is axis-specific resolution preserved where needed? [cite:169]
- Are jump and landing transitions explicit and stable?
- Are push-block rules documented and testable?
- Are room transitions governed by trigger geometry, not art?
- Are events emitted from simulation state transitions only? [cite:166][cite:162]
- Are epsilon values centralized and named?
- Are new edge cases covered by tests? [cite:170]

---

## Final Rule

Physics and collision are not background plumbing.
They define whether the world feels trustworthy.

If the player cannot trust:
- what is solid
- when a jump will work
- when a push will succeed
- when a fall will begin
- when a doorway will transition

then the game will never feel good, no matter how strong the art becomes.
