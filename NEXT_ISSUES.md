# Knight Lore clone: next issues

Status 2026-09-06, evening. The game is playable start to finish on `main`: the original's empty green start room, 29 connected rooms plus the cauldron, eight charms on the floor in reachable rooms, death and respawn, day and night, saving, and the win. It is thin next to the original: close charms, approximate rooms, little danger. The five issues below are what "top notch" needs, in order of weight. The twelve older issues further down are done and kept for their acceptance criteria.

---

## A. The full castle with real puzzles

**Why:** 29 of 128 rooms, and the mapped ones hold blocks, spikes, and a monster or two rather than the original's puzzles. This is most of the remaining work and where the difficulty lives.

**Steps:**
1. Second arch template (and a third if needed) so the detector places the rooms it currently misses; re-run `arches.py` → `mapmodel.py` → `genrooms.py` → `extras.py` → `spikes.py` → `integrate.py` (scratch scripts, recreate from `docs/MAP.md` and the memory notes).
2. Table detector, and moving-platform placement where the map shows a platform track.
3. Per-room review against the map crop: an overlay image per room, fix heights the block detector got wrong, delete phantom blocks under sprites.
4. Replace the connector rooms with the real ones once their arches are detected.

**Acceptance:**
- [ ] `RoomSpecs.test.ts` passes with at least 100 rooms and every door reciprocated.
- [ ] A montage script renders every room next to its map crop and a reviewer signs each off.
- [ ] No connector rooms remain.

---

## B. Character animation from the original

**Why:** Sabreman and the wolf are still strips from footage with a computed mask; the guard is a stand-in creature. The rip has the torsos and the original draws legs as separate sprites that are not yet located.

**Steps:**
1. Find the leg sprites: search memory for 3-byte-wide records of 6 to 10 rows near the body sprites, or trace the draw routine that follows the 0x7150 table with SkoolKit.
2. Compose torso plus legs per frame into the strips, all four views for both forms.
3. Same for the tall hooded guard; then retire `PatrolEnemy` and the footage-derived strips.

**Acceptance:**
- [ ] `tests/game/CharacterFrame.test.ts` covers the composed frame layout.
- [ ] Facing captures in all four directions for man, wolf, and guard match the longplay.

---

## C. Fourteen charms, spread out

**Why:** The original asks for 14; we have 8, most one room from the start. The day limit means nothing while charms are close.

**Steps:**
1. Six more charm sprites (the rip holds seven; the map and longplay show the rest).
2. Place charms by distance from the cauldron using the map's positions, never in the start room.
3. HUD delivered row and win text for 14.

**Acceptance:**
- [ ] `GameState.test.ts`: sequence of 14 distinct charms.
- [ ] `RoomSpecs.test.ts`: every charm placed once, none within two rooms of the cauldron.

---

## D. Feel details

**Why:** Small things the original does that we do not: the transformation seizure that leaves Sabreman vulnerable, portcullis gates, the cauldron spirit at night, the exit-through-wall death animation, enemy speeds matched to the longplay.

**Steps:**
1. Seizure: lock input and flash for the morph, hazards active meanwhile.
2. Portcullis entity from the rip's `cage` sprite: blocks a doorway until its trigger.
3. Cauldron spirit: a ghost that spawns at the cauldron at night.
4. Time enemy and ball speeds against `reference/longplay.mp4` frames.

**Acceptance:**
- [ ] One unit test per new entity on the step clock.
- [ ] Playwright: morph while carrying shows the seizure and drops the charm.

---

## E. Playtest pass

**Why:** Nobody has played it end to end. Construction guarantees connectivity, not fun or fairness.

**Steps:**
1. Play from the start to the win, note every room that is wrong, unfair, or empty.
2. Turn each note into a spec fix or a new issue.

**Acceptance:**
- [ ] A written playtest log in `docs/PLAYTEST.md` with every room visited.
- [ ] Every logged blocker fixed or filed.

---

# Done: the first twelve issues

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
- Memory rip DONE 2026-09-06: `reference/KnightLore.z80` from SkoolKit `tap2sna.py` (drop the recipe's `--start`). Sprite format: header (width in bytes, height), then rows of (mask, pixel) byte pairs, rows stored bottom-up. Animation tables of little-endian pointers at 0x7140-0x7290. 99 sprites exported to `public/sprites/rip/` with `index.json`; guard, ghost, ball, cauldron are drawn from them. Sabreman and wolf strips from the rip (three views each, four frames) are exported but not yet swapped in for the recording-derived ones.
- Map DONE to the point of: 70 rooms placed by arches, 16 connected to the cauldron generated with blocks, spikes, charms, guards, ghosts, balls, flames. Open: arch styles the template misses (rooms with front-only or unusual doors), tables, the original's start room, and spike beds drawn as tufts on slabs like the rip's spikes sprite.
- Rules DONE: wolf jumps higher, ghosts hunt only the wolf. Open: 14 charms (needs six more item sprites; the rip has seven charm sprites), blocks that fall under weight beyond the vanishing block.
