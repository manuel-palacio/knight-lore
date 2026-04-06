# Phase 5 — Identity Systems

**Status:** ⏳ Pending (requires Phase 4 complete)

## Tasks

- [ ] **5.1** Implement `ItemSystem` — pickup radius, snap-to-anchor drop, anti-soft-lock guarantees, max 3 carried
- [ ] **5.2** Implement `CauldronSystem` — correct/wrong item handling (Classic vs Modern modes), werewulf hostility, cure completion
- [ ] **5.3** Implement `HazardSystem` — static hazards, patrol enemies (GUARD_PATROL, GHOST), dynamic block activation
- [ ] **5.4** Extend `TransformationSystem` — recovery phase, form-dependent physics, visual state
- [ ] **5.5** Wire `GameEventHandler` — domain events → audio stubs and UI state
- [ ] **5.6** Add transformation visual rendering — sprite selection by TransformPhase, damage blink, form indicator HUD

## Cauldron Rules
- Player must be HUMAN to deliver items
- Correct item: advances deliveredCount, emits CauldronRequestAdvanced
- Wrong item in Classic: punishment (configurable)
- Wrong item in Modern: rejected safely
- Werewulf entering cauldron room: hostile/lethal
- Quest complete: all 14 items delivered
