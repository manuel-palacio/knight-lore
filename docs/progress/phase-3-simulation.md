# Phase 3 — Simulation

**Status:** ✅ Complete

## Tasks

- [x] **3.1** Implement `CollisionSystem` + `CollisionResolver` — AABB sweep, axis-separated resolution, floor/landing detection
- [x] **3.2** Implement `MovementSystem` — 8-direction walk, jump, gravity, form-speed differences, transformation lock
- [x] **3.3** Add jump state tracking to `PlayerState` — `jumpLockTicks`, `MovementState` enum (added in Phase 2)
- [x] **3.4** Implement `RoomTransitionSystem` — exit trigger geometry, spawn lookup, input lock during fade
- [x] **3.5** Implement `LifeSystem` — hazard contact, damage cooldown, respawn, game-over
- [x] **3.6** Wire `GameLoopCoordinator` — fixed-step loop with spiral-of-death cap, `StateFlow<GameState>`
- [x] **3.7** Register all systems in correct tick order via `DefaultGameEngine.create(roomProvider)`

## Movement Constants
- `WALK_SPEED_HUMAN = 4.0f` tiles/sec
- `WALK_SPEED_WEREWULF = 5.0f` tiles/sec
- `JUMP_FORCE_HUMAN = 8.0f` tiles/sec upward
- `JUMP_FORCE_WEREWULF = 10.0f` tiles/sec
- `GRAVITY = -20.0f` tiles/sec²
- `MAX_CARRY_SPEED_PENALTY = 0.8f` multiplier

## System Tick Order
1. TimeSystem
2. TransformationSystem
3. MovementSystem
4. CollisionSystem
5. DynamicBlockSystem
6. ItemSystem
7. HazardSystem
8. RoomTransitionSystem
9. CauldronSystem
10. LifeSystem
