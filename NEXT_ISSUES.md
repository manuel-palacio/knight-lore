# Knight Lore clone: next issues

Status 2026-09-06: issues 1 to 12 below are done and committed on `feat/2d-filmation-renderer` (see git log). Kept for the acceptance criteria and as the seed for the next list.

State as of 2026-09-05 on branch `feat/2d-filmation-renderer`: the 2D Filmation build (`2d.html`) has tank controls on a fixed step clock, four-facing sprites, the original morph, lattice walls with pointed arches, 13 rooms as data specs, moving platforms, path guards, push weight, and a beeper. 174 tests pass.

Issues are ordered. Each one is small enough for a single session and has acceptance criteria that map to tests. Work them top to bottom unless something below unblocks a decision above.

---

## 1. Commit to the 2D build and delete the 3D build

**Why:** The Three.js build (`index.html`, `src/main.ts`, `src/engine/Renderer.ts`, `src/game/characters/*`, `src/scenes/TheHall.ts`, rig viewer) is about a third of the code and no longer plays the same game. Every shared change now has to be checked against two entry points. New entities (moving platforms, path guards) have no 3D mesh at all.

**Steps:**
1. Confirm with the user that 2D is the direction. This issue is blocked until then.
2. Delete `index.html`, `rig-viewer.html`, `src/main.ts`, `src/dev/`, `src/engine/Renderer.ts`, `src/engine/MonoTintShader.ts`, `src/game/characters/`, `src/scenes/TheHall.ts`, and their tests.
3. Strip Three.js mesh building from `src/scenes/rooms/shell.ts` and `items.ts`. Keep `THREE.Vector3` on `Entity` for now, or replace it with a plain `{x,y,z}` in a follow-up.
4. Rename `2d.html` to `index.html` and `main2d.ts` to `main.ts`. Update `package.json` scripts and the README.
5. Remove the `lint:no-render-pos` script if `renderPosition` goes away with the lerp.

**Acceptance:**
- [x] `npm run build` produces one entry point and no Three.js scene code outside `Entity`.
- [x] `npx vitest run` still passes with the character rig tests removed.
- [x] Repo root has no loose screenshot PNGs. Move the ones worth keeping to `docs/screenshots/`.

---

## 2. Match sprite scale to block scale

**Why:** Sprites are drawn 1:1 (Sabreman is 31 px tall) while tiles are 36 px wide. The original draws a block 32 px wide and Sabreman about 32 px tall, so ours reads slightly small. Scaling sprites unevenly would break the crisp pixels, so the tile has to shrink instead.

**Steps:**
1. In `IsoRenderer`, change `tileW` to 32 and `tileH` to 16 and `heightScale` to match.
2. Re-check wall slab, arch, and needle sizes in `WallLayout` and `main2d.ts` so they still land on whole pixels.
3. Re-take the four-room montage and compare against `reference/gif3-walk/f-050.png` side by side.

**Acceptance:**
- [x] Unit test in `tests/engine/IsoProjection.test.ts`: one tile projects to 32 px wide, one world unit of height to 16 px.
- [x] Playwright screenshot of the start room shows Sabreman roughly one block tall.

---

## 3. Wolf stride at six frames

**Why:** The extraction found the wolf's real cycle uses six poses (74, 75, 76, 77 and mirrors 129, 130), ours uses three. The wolf walk looks stiff next to Sabreman's.

**Steps:**
1. Rerun the extraction recipe from the memory notes on `reference/recording.mov` and write `sabrewulf-front.png` and `sabrewulf-back.png` with six cells each.
2. Give `selectCharacterFrame` a per-form cycle length instead of the fixed `[0,1,2,1]`.

**Acceptance:**
- [x] `tests/game/CharacterFrame.test.ts`: wolf cycle covers six frames before repeating; human cycle unchanged.
- [x] Strips checked visually at 6x against the extracted poses.

---

## 4. Cauldron asks for items one at a time, in a random order

**Why:** The original's whole loop is the cauldron demanding a specific charm, shown in the HUD, and the player fetching it under the day timer. Ours delivers four fixed items in fixed order and the extra four items are decoys.

**Steps:**
1. `GameState`: replace `CURE_SEQUENCE` with a shuffled sequence drawn from all eight `ItemId`s at game start, seeded so tests are deterministic.
2. `deliverCureItem` accepts only the item currently wanted; wrong items are refused with a sound.
3. HUD "cauldron wants" panel shows the wanted item's sprite, not text.
4. Place every item somewhere on the map, one per room, far enough from room 001 to matter.

**Acceptance:**
- [x] `tests/game/GameState.test.ts`: sequence has N distinct items, wrong item refused, right item advances, win after the last.
- [x] `tests/scenes/RoomSpecs.test.ts`: every `ItemId` is placed exactly once across all rooms.
- [x] Playwright: HUD shows the wanted item sprite and changes after a delivery.

---

## 5. Day and night dramatised

**Why:** The 40-day timer exists as a number. The original sells it with the sun-and-moon dial, the fade at dusk, and the wolf refusing to carry. Right now transformation is a surprise.

**Steps:**
1. HUD dial: a sun-or-moon icon that sweeps across the day bar as `transformTimer` runs down. Reuse the existing HUD icon sprites.
2. Two seconds before a transform, flicker the room tint or dim it, then run the morph.
3. Wolf form: pickups refused (already), and carrying an item into the transform drops it (already). Add the drop sound and a HUD flash so the player sees it.
4. Day count increments visibly with a chime.

**Acceptance:**
- [x] Unit test: `GameState` exposes day progress in 0..1 and it resets at each transform.
- [x] Playwright: forcing `__t()` shows the dim, the morph, and the day counter change.

---

## 6. Lives, death, and room reset

**Why:** Losing a life currently decrements a counter. The original flashes, respawns you at the room entrance, and resets that room's moving things.

**Steps:**
1. On `loseLife`: flash the canvas white for two frames, play `hurt`, respawn at the room's entry point with the entry facing, reset platforms and guards to their path start.
2. On the last life: game-over screen with the day reached and items delivered, R to restart.
3. Brief invulnerability after respawn so a guard standing on the door does not chain kills.

**Acceptance:**
- [x] Unit test: `Room.reset()` returns platforms and guards to their first waypoint.
- [x] Unit test: player is invulnerable for N steps after respawn.
- [x] Playwright: walking into a guard flashes, respawns at the door, and the lives digit drops by one.

---

## 7. Room transition wipe

**Why:** The original blanks the room and redraws the next with a short pause. Ours swaps instantly, which makes the map feel like one screen.

**Steps:**
1. On exit: freeze input, clear the canvas to black for ~250 ms, then draw the new room and unfreeze.
2. Play the `door` sound at the start of the wipe.

**Acceptance:**
- [x] Unit test on a small `Transition` state object: input is ignored during the wipe and accepted after.
- [x] Playwright: a frame captured mid-transition is fully black.

---

## 8. More room content: tables, vanishing blocks, bouncing balls

**Why:** With platforms and guards in, three original mechanics are still missing, and they are what make later rooms hard.

**Steps:**
1. Table: a static support you can stand on and walk under, so a two-height platform that does not block the floor. Add `tables` to `RoomSpec`.
2. Vanishing block: a support that disappears N steps after the player lands on it and returns later. Add `vanishing` to `RoomSpec`.
3. Bouncing ball: a hazard that bounces along a fixed axis with a fixed period on the step clock. Add `balls` to `RoomSpec`.
4. Sprites: extract the table and ball from `reference/gif3-walk` frames; the vanishing block reuses the platform box drawn dimmed.

**Acceptance:**
- [x] One unit test file per entity covering its timing on the step clock.
- [x] `RoomSpecs.test.ts` validates the new fields stay inside the grid.
- [x] At least one room uses each mechanic.

---

## 9. Author the map toward the original layout

**Why:** 13 rooms is a demo. The original's 128-room map is documented on strategy wiki and the rooms are small. Now that rooms are data, this is authoring work, not engineering.

**Steps:**
1. Add a `docs/MAP.md` with the target grid of room ids and their exits, copied from the reference map.
2. Write specs in batches of ten, run the map-integrity tests after each batch.
3. Make `START_ROOM` and the cauldron room match the original's positions.

**Acceptance:**
- [x] `RoomSpecs.test.ts` passes with every room in `docs/MAP.md` present and reciprocated (23 rooms; growing toward 128 remains open).
- [x] No room spec has fewer than three placed things.

---

## 10. Title screen, game over, and completion screens

**Why:** There is an intro overlay only. The original has a title with the parchment art, keyboard or joystick choice, and a distinct game-over and completion screen.

**Steps:**
1. Title: draw the "Knight Lore" logo as a sprite extracted from `reference/mov-frames/scan-001.png` or the archive title image, on black, with "press any key".
2. Game over: days survived and items delivered, R to restart.
3. Completion: the original's "you have cured Sabreman" style message.

**Acceptance:**
- [x] Playwright: page loads to the title; any key starts; game over screen appears after the last life; completion appears after the last delivery.

---

## 11. Gamepad and pause

**Why:** The original supported joysticks. Playing with arrows on a laptop is fine, but a pad is how most people will want to play an isometric platformer.

**Steps:**
1. Map d-pad left and right to turn, up to walk, A to jump, B to action, Start to pause, using the Gamepad API polled once per tick in `Input`.
2. Pause: freeze the step clocks and dim the canvas; P or Start toggles.

**Acceptance:**
- [x] Unit test: `Input` reports `isDown('ArrowUp')` when a fake gamepad reports d-pad up.
- [x] Playwright: P pauses and the debug position stops changing.

---

## 12. Persist room state and the cure across visits

**Why:** Push blocks already persist per room. Items dropped in a room, platforms mid-travel, and guards mid-loop should survive leaving and returning, and the wanted-item sequence should survive a page reload.

**Steps:**
1. Verify with a test that a dropped item is still on the floor after leaving and re-entering.
2. Save `GameState` (day, lives, sequence, progress, current room) to `localStorage` on each room change; offer "continue" on the title screen.

**Acceptance:**
- [x] Unit test: `GameState.serialize()` and `restore()` round-trip.
- [x] Playwright: reload mid-game, choose continue, land in the same room with the same day count.

---

## Housekeeping to fold into whichever issue touches the file

- `Entity.updateRenderPosition` lerp is unused in 2D since positions are quantised. Remove `renderPosition` when the 3D build goes.
- `PatrolEnemy` (continuous two-point patrol) and `PathGuard` overlap. Migrate the legacy rooms to `PathGuard` and delete `PatrolEnemy`.
- `src/scenes/rooms/Room00*.ts` hand-built rooms could become specs once tables exist (room 001's cauldron platform is the only thing specs cannot express yet).
- [x] The dev hooks on `window` are gated behind `import.meta.env.DEV`.
- Done 2026-09-06: rooms 001-005 converted; the map is now read from `map.png` (see `docs/MAP.md`).
- Still open: detectors for spikes, tables, items, and enemies on the map so mapped rooms are complete; generate specs for all 85 placed rooms; find the original's start room; retire `PatrolEnemy`; the wolf's higher jump and wolf-only monsters.
- Memory rip: `KnightLore2.z80` builds with `tap2sna.py` from pobtastic's `knightlore.t2s` (SkoolKit fetches the tape itself). Graphics live around 0x7000-0xA800 as interleaved mask/pixel byte pairs; the sprite header format still has to be worked out, since that repository's Knight Lore disassembly is a stub.
