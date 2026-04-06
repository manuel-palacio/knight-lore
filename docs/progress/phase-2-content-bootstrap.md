# Phase 2 — Content Bootstrap

**Status:** ✅ Complete

## Tasks

- [x] **2.1** Expand `GameContent` domain model — `ItemTypeDefinition`, `ActorTypeDefinition`, `CureSequenceDefinition`, `ProgressionDefinition`, `EngineConfig`
- [x] **2.2** Define JSON DTOs — `RoomDto`, `ItemTypeDto`, `ActorTypeDto`, `ProgressionDto` (all `@Serializable`)
- [x] **2.3** Create mappers DTO→domain — `RoomMapper`, `ContentMapper` with full graph validation
- [x] **2.4** Write 15-room vertical slice JSON assets — rooms 001–015, items.json, actors.json, progression.json
- [x] **2.5** Implement `ContentRepository` — `AssetLoader` interface, `AssetContentRepository`, `AndroidAssetLoader`
- [x] **2.6** Complete `DefaultGameEngine.initialize` — full state seeding from content + `EngineConfig`
- [x] **2.7** Add title screen — `AppRoot` NavHost, `MainMenuScreen`, `GameScreen` with content loading

## Notes
- 15-room vertical slice covers cauldron hub, start room, crystal ball vault, spike hazard, goblet carry puzzle, transformation trap, carry puzzle, enemy intro, branch choice, crusher gauntlet, risky shortcut, capstone
- Room graph: 28 exits all validated
- Item types: 10 types (7 cure-relevant + KEY, TORCH, SKULL)
- 14-step canonical cure sequence: CRYSTAL_BALL, GOBLET, WINE_BOTTLE, GEM, CRYSTAL_BALL, POISON_VIAL, BOOT, TEACUP, GEM, POISON_VIAL, BOOT, GOBLET, TEACUP, WINE_BOTTLE
