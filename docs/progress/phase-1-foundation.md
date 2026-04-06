# Phase 1 — Foundation

**Status:** ✅ Complete

## Tasks

- [x] **1.1** Create Gradle multi-module project (app, core, domain, data, render, input, feature-debug)
- [x] **1.2** Add version catalog (`libs.versions.toml`) and convention plugins (build-logic)
- [x] **1.3** Add core math — `Vec2f`, `Vec3f`, `Aabb`, `Direction8`, `GameClock`, `IsoProjection`, `TileMetrics`
- [x] **1.4** Add domain models — `GameState`, `PlayerState`, `RoomDefinition`, `ItemInstance`, `ActorState`, `TimeState`, `CauldronState`, `RoomTransitionState`, `GameEvent`, `FrameInput`, `GameEngine` interface
- [x] **1.5** Add unit test setup — 40 passing tests across core and domain

## Notes
- Package: `com.palacesoft.knightlore`
- Domain module is Android-free (verified)
- `TimeSystem` and `TransformationSystem` fully implemented; `MovementSystem` and `RoomTransitionSystem` are stubs
- Tile metrics: TILE_WIDTH=64px, HALF_TILE_WIDTH=32px, BLOCK_HEIGHT=32px
- IsoProjection formula: `sx=(x-y)*32`, `sy=(x+y)*16 - z*32`
