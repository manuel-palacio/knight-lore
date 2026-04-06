# Phase 4 — Rendering

**Status:** ✅ Complete

## Tasks

- [x] **4.1** Implement `IsoProjector` — projection, depthKey, room centering
- [x] **4.2** Implement `DrawCommandBuilder` — 4-key sort (layer, depth, priority, id), stable ordering
- [x] **4.3** Implement `RoomEntityFactory` — maps `GameState` + `GameContent` → `RenderEntity` list
- [x] **4.4** Implement `CanvasSceneRenderer` — placeholder sprites (colored shapes), correct draw order
- [x] **4.5** Wire `GameSurfaceView` / `GameScreen` — Compose `AndroidView` integration
- [x] **4.6** Implement `HudRenderer` — lives, day-night bar (pulsing at 80% of phase), carried items, current cauldron request

## Rendering Notes
- Custom Android Canvas renderer (not LibGDX)
- Fixed isometric camera per room
- Sort key: `floor((x + y + z) * 1000)` then priority then entity ID
- Sort-foot anchors: player/enemy = center between feet; blocks = back-bottom origin
- Projection: `sx = (x-y) * 32`, `sy = (x+y) * 16 - z * 32`
