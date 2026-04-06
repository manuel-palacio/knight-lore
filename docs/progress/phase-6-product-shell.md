# Phase 6 — Product Shell

**Status:** ⏳ Pending (requires Phase 5 complete)

## Tasks

- [ ] **6.1** Implement `SaveRepository` — `SaveSnapshot` serialization, `AtomicFile` write, version migration
- [ ] **6.2** Implement `GameSessionCoordinator` + `GameSessionViewModel` — save-on-background lifecycle
- [ ] **6.3** Add "Continue" flow — save/load on main menu
- [ ] **6.4** Implement `SettingsScreen` — Proto DataStore for audio, controls, difficulty, accessibility, debug toggle
- [ ] **6.5** Implement `TouchInputMapper` — virtual stick + 4-button action cluster, isometric 8-direction quantization, gamepad support
- [ ] **6.6** Implement `DebugOverlayRenderer` — grid, collision volumes, depth keys, exit triggers, time/transform panels (debug builds only)
- [ ] **6.7** Add room transition wipe — directional sweep, 12 ticks / ~200ms
- [ ] **6.8** Add pause screen — resume, save-and-quit
- [ ] **6.9** Add audio stubs — `SoundId` enum, `NoopAudioManager`, event→sound mapping

## Save Layers
1. Profile settings (Proto DataStore)
2. Campaign save (serialized GameState snapshot)
3. Run snapshot (quick resume on Android suspend)
