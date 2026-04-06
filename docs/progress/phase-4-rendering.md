# Phase 4 — Rendering

**Status:** ⏳ Pending (requires Phase 3 complete)

## Tasks

- [ ] **4.1** Implement `IsoProjector` — projection, depthKey, room centering
- [ ] **4.2** Implement `DrawCommandBuilder` — 4-key sort (layer, depth, priority, id), stable ordering
- [ ] **4.3** Implement `RoomEntityFactory` — maps `GameState` + `GameContent` → `RenderEntity` list
- [ ] **4.4** Implement `CanvasSceneRenderer` — placeholder sprites (colored shapes), correct draw order
- [ ] **4.5** Wire `GameSurfaceView` / `GameScreen` — Compose `AndroidView` integration
- [ ] **4.6** Implement `HudRenderer` — lives, day-night bar (pulsing at 80% of phase), carried items, current cauldron request

## Rendering Notes
- Custom Android Canvas renderer (not LibGDX)
- Fixed isometric camera per room
- Sort key: `floor((x + y + z) * 1000)` then priority then entity ID
- Sort-foot anchors: player/enemy = center between feet; blocks = back-bottom origin
- Projection: `sx = (x-y) * 32`, `sy = (x+y) * 16 - z * 32`
