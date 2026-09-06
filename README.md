# Knight Lore

A faithful browser remake of Ultimate Play the Game's *Knight Lore* (ZX Spectrum, 1984), the Filmation isometric adventure. TypeScript, a 2D canvas, no engine.

Sabreman is cursed to become a werewolf at night. Melkhior's cauldron asks for charms one at a time; fetch each from the castle and drop it in before forty days pass. Some monsters only go for the wolf. The wolf jumps higher than the man.

## Run it

```
npm install
npm run dev
```

Open the URL Vite prints. Any key starts; C continues a saved game.

| Key | Action |
|---|---|
| Left / Right | Turn |
| Up | Walk forward (walk into a block to push it) |
| Space | Jump, straight up when standing, forward when walking |
| E | Pick up, deliver to the cauldron, or pull the nearest block |
| P | Pause |
| R | Restart after game over |

A gamepad works too: d-pad turns and walks, A jumps, B acts, Start pauses.

```
npm test          # vitest
npm run lint
npm run build     # tsc + vite build into dist/
```

## How it is built

**Simulation.** Everything acts on one coarse step clock: five simulation ticks per step, a quarter tile per step, so positions stay on a lattice and movement has the original's cadence. Tank controls, committed jump arcs, grid collision with support heights, dynamic supports for moving platforms and tables. Rooms are 8x8 cells with doors mid-edge.

**Rendering.** `IsoRenderer` draws the original's 256x192 screen at 32x16 pixels per tile onto a canvas scaled to the window. Walls are corner columns and a sparse slab lattice, doors are pointed voussoir arches, blocks have the Spectrum's solid and checker faces. The HUD is drawn on the canvas from the original's pixels. One hue per room; monsters take the hue, Sabreman and the charms are white, the wizard and fire are red.

**Assets.** Sprites come from three sources, all in `public/sprites`:

- `rip/` holds 99 sprites decoded from the game's own memory: format is a two-byte header (width in bytes, height) followed by rows of mask and pixel byte pairs, stored bottom-up, with animation pointer tables at 0x7140. `rip/index.json` records the addresses. Ghost, ball, cauldron, spikes, flame, and the charms are drawn from these.
- Sabreman, the wolf, and the guard are full-body strips lifted from gameplay footage by background subtraction, with a computed mask. The rip's character frames are torsos only; the original draws legs separately and those sprites are not yet located.
- `map.png` at the repo root is the complete original map. Rooms are read from it by detectors: arches vote each room's corner and doors, block top faces are snapped to the lattice with their heights, spike beds are found by tooth density, and white and red sprites are classified into charms and monsters. See `docs/MAP.md`.

**Rooms.** All rooms are data in `src/scenes/rooms/roomSpecs.ts`, built by `specBuilder.ts`. Fields: platforms, push blocks, spikes, guards, path guards, ghosts, balls, tables, vanishing blocks, moving platforms, flames, pickups, the cauldron and wizard. Tests enforce that every door leads somewhere and back, doorways and spawns stay clear, and every charm is placed once.

**Persistence.** The run is saved to `localStorage` on every room change.

## Layout

```
src/engine     step clock, projection, renderer, wall layout, collision, input, beeper, save slot
src/game       entities (player, guards, ghosts, platforms, ...), game state, HUD, character frames
src/scenes     room specs and the spec builder
public/sprites sprite strips, ripped originals under rip/, charms under items/
tests          vitest suites mirroring src
docs           map, gameplay notes, physics notes
reference      local only (git-ignored): recordings, the memory snapshot, frames used for extraction
```

## Status and next steps

See `NEXT_ISSUES.md` for the worked issue list and what is open. Headline gaps: the castle reachable from the start room is 30 rooms of the original's 128, mapped rooms are approximate where the detectors missed an arch style, the cauldron asks for 8 charms rather than 14, and the leg sprites for the ripped character frames are still to be found.

## Sources

- Paul Dunn's map of the original, `map.png`.
- SkoolKit and pobtastic's tape recipe for building the memory snapshot.
- https://strategywiki.org/wiki/Knight_Lore
- https://medium.com/@iain.mew/knight-lore-95faef2cb50e
