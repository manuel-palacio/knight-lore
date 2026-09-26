# Knight Lore

A faithful browser remake of Ultimate Play the Game's *Knight Lore* (ZX Spectrum, 1984), the Filmation isometric adventure. TypeScript, a 2D canvas, no engine.

Sabreman is cursed to become a werewolf at night. Melkhior's cauldron asks for fourteen charms one at a time; fetch each from the castle and drop it in before forty days pass. Some monsters only go for the wolf. The wolf jumps higher than the man.

Play it at https://knight-lore.fly.dev.

## Run it

```
npm install
npm run dev
```

Open the URL Vite prints. Any key starts; C continues a saved game. The title screen plays the original's title tune; where the browser holds sound back until the page is clicked, it says so, and a click gives it sound.

| Key | Action |
|---|---|
| Left / Right | Turn |
| Up | Walk forward (walk into a block to push it) |
| Space | Jump, straight up when standing, forward when walking |
| E | Pick up or put down a charm, deliver to the cauldron, or pull the nearest block |
| P | Pause |
| M | Sound on / off |
| R | Restart after game over |

A gamepad works too: d-pad turns and walks, A jumps, B acts, Start pauses.

```
npm test                  # vitest
npm run test:e2e          # playwright against the dev server
npm run test:playthrough  # a whole game won with the keyboard, about 40 minutes
npm run lint
npm run build             # tsc + vite build into dist/
```

## The game

- **The cure.** Fourteen charms, the seven kinds each asked for twice, in an order drawn at the start of every game. They lie at the far ends of the castle, none beside the start room or within two rooms of the cauldron. The extra life is taken at once.
- **Day and night.** A day is 60 seconds and a night 30, forty days in all, about an hour of play. The dial in the HUD shows the sun or the moon, and dusk is signalled five seconds ahead. Changing form is a seizure: Sabreman cannot move for two seconds and drops what he carries.
- **The wolf.** He cannot carry or deliver charms. Ghosts hunt only him, and at nightfall a spirit rises from the cauldron three seconds after the change, so the cauldron room is no place for him after dark.
- **Dangers.** Guards walk their loops, balls bounce along their lines, flames and spike beds hold their ground. Spikes hurt the feet: a jump taken from anywhere on the tile before a spike bed clears it. The room south of the start is barred wall to wall by one. Portcullises rise, wait and drop on the original's beat, and crush whoever is under them; two cages and a corridor have them. Speeds come from the original's handlers: guards two pixels a frame, moving blocks one, balls bouncing 32 pixels high.
- **Climbing.** A charm lying on the floor is something to stand on: put one down with E and jump onto it to reach a block too high to jump to from the floor. Collapsing blocks crumble under Sabreman and stay gone until he comes back into the room.
- **Sound.** The original's three tunes, decoded from its memory: the title tune on the start screen (and again when the last life goes), the start tune when a game begins, the cure tune when it is won. Footsteps go tick, ticky, ticky; everything else is square-wave beeps.

## How it is built

**Simulation.** Everything acts on one coarse step clock: five simulation ticks per step, a quarter tile per step, so positions stay on a lattice and movement has the original's cadence. Tank controls, committed jump arcs, grid collision with support heights, dynamic supports for moving platforms and tables. Rooms are 8x8 cells with doors mid-edge.

**Rendering.** `IsoRenderer` draws the original's 256x192 screen at 32x16 pixels per tile onto a canvas scaled to the window. Walls are corner columns and a sparse slab lattice, doors are pointed voussoir arches, blocks have the Spectrum's solid and checker faces. The HUD is drawn on the canvas from the original's pixels. One hue per room; monsters take the hue, Sabreman and the charms are white, the wizard and fire are red.

**Assets.** Sprites come from three sources, all in `public/sprites`:

- `rip/` holds 99 sprites decoded from the game's own memory: format is a two-byte header (width in bytes, height) followed by rows of mask and pixel byte pairs, stored bottom-up, with animation pointer tables at 0x7140. `rip/index.json` records the addresses. Ghost, ball, cauldron, spikes, flame, and the charms are drawn from these.
- Sabreman, the wolf and the guard are the original's own sprites: an upper body (the guard's hood) drawn over a pair of walking legs, four frames each, walked 0 1 2 3 2 1 as the original's animation table does. The legs are the four-frame strips the first rip filed as `creature1-*` (the man's, and the guard's) and `creature2-*` (the wolf's); how far below the body they sit was measured by fitting both sprites to frames of the original. The transformation is the four full-body poses at 0xac28-0xae98. `tools/rip/characters.py` composes all the strips.
- `map.png` at the repo root is the complete original map. Rooms are read from it by the tools in `tools/map`, checked room by room against a magnified crop, and generated into the room specs. See `docs/MAP.md`.

`tools/rip` loads the memory snapshot (`z80.py`), decodes its sprites (`sprite.py`), composes the character strips, decodes the original's room table (`rooms.py`: all 128 rooms with their doors, sizes and objects; see #11), and extracts the tunes into `src/engine/tunes.ts` (`music.py`): the beeper player at 0xB2C5 reads a byte per note, six bits of pitch from the table at 0xB332 and two of length.

**Rooms.** 62 connected rooms, all data in `src/scenes/rooms/roomSpecs.ts`, built by `specBuilder.ts`. Fields: platforms, push blocks, spikes, guards, path guards, ghosts, balls, tables, vanishing blocks, moving platforms, flames, pickups, the cauldron and wizard. Tests enforce that every door leads somewhere and back; doorways, spawns and the cells beside doors stay clear of spikes, ghosts and patrols; every room leaves a lane clear of guards and balls between its doors and its charm; and the charms are placed as the cure needs.

**Persistence.** The run is saved to `localStorage` on every room change. A continued game remembers which rooms' charms were delivered and whether the extra life was taken. Saves from older versions of the cure are refused rather than continued.

**Tests.** Vitest covers the simulation and the room data. Playwright drives the dev build through window hooks (`__dbg`, `__room`, `__pos`, `__timer`) and the real keyboard: it walks every room from its first door to every other door and to its charm, jumping spike rows where it must, and a bot plays a whole game on the real clock (`tests/e2e/playthrough.spec.ts`), keeping the wolf out of haunted rooms at night.

**Deploy.** Pushing `main` deploys to Fly.io: the `Dockerfile` builds the game and serves `dist/` with nginx (`nginx.conf`, `fly.toml`). CI runs lint, the unit tests and the build on every push.

## Layout

```
src/engine     step clock, projection, renderer, wall layout, collision, input, beeper, save slot
src/game       entities (player, guards, ghosts, platforms, ...), game state, HUD, character frames
src/scenes     room specs and the spec builder
public/sprites sprite strips, ripped originals under rip/, charms under items/
tests          vitest suites mirroring src; tests/e2e holds the playwright specs
tools          map readers (tools/map) and memory-snapshot rippers (tools/rip), Python
docs           map, gameplay notes, physics notes, playtest log
reference      local only (git-ignored): recordings, the memory snapshot, frames used for extraction
```

## Status and next steps

The game has been won start to finish by the playthrough bot, on day 25 with every life left. See `NEXT_ISSUES.md` for the worked issue list and `docs/PLAYTEST.md` for what the playtests found. Headline gaps: the castle is 62 rooms of the original's 128 (the garden rooms, whose doors are gaps in hedges, and the groups beyond them are not read yet); portcullis gates and enemy speeds timed against the original are still to do.

## Sources

- Paul Dunn's map of the original, `map.png`.
- SkoolKit and pobtastic's tape recipe for building the memory snapshot.
- https://strategywiki.org/wiki/Knight_Lore
- https://medium.com/@iain.mew/knight-lore-95faef2cb50e
