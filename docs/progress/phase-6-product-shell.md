# Phase 6 — Product Shell

**Status:** ✅ Complete

## Tasks

- [x] **6.1** Implement `SaveRepository` — `SaveSnapshot` serialization, `AtomicFile` write, version migration
- [x] **6.2** Implement `GameSessionCoordinator` + `GameSessionViewModel` — save-on-background lifecycle
- [x] **6.3** Add "Continue" flow — save/load on main menu
- [x] **6.4** Implement `SettingsScreen` — DataStore Preferences for audio, difficulty, debug toggle
- [x] **6.5** Implement `TouchInputMapper` — virtual stick + 4-button diamond, isometric 8-direction quantization, multi-touch
- [x] **6.6** Implement `DebugOverlayRenderer` — grid, collision volumes, exit triggers, actor/player diamonds, info panel (debug builds only)
- [x] **6.7** Add room transition wipe — full-screen black fade, 12 ticks / ~200ms via TransitionRenderer
- [x] **6.8** Add pause screen — resume, save-and-quit, pause gated in onFrameAdvance
- [x] **6.9** Add audio interface — `AudioManager` interface, `NoopAudioManager`, `SoundManager` implements it

## Save Layers
1. Profile settings (Proto DataStore)
2. Campaign save (serialized GameState snapshot)
3. Run snapshot (quick resume on Android suspend)
