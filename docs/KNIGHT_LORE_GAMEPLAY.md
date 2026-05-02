# Knight Lore — Gameplay Reference

Source: https://evercade.co.uk/evercade-game-spotlight-knight-lore/ (Evercade game spotlight, fetched 2026-05-02). This doc captures the original 1984 gameplay design — useful when scaling beyond the MVP single-room slice.

---

## Premise

- **Protagonist:** Sabreman, suffering from lycanthropy (werewolf curse).
- **Goal:** Find a cure within **40 days** by delivering **14 items** to a central **cauldron** in a fixed sequence.
- **Failure:** Cure not completed in 40 days → game over.

## Transformation cycle

- Sabreman auto-transforms between **human** and **werewolf** on a recurring timer (exact period not specified in the source — our MVP uses 20 s per form, which is a reasonable approximation).
- **Werewolf benefits:** can jump slightly higher than human form.
- **Werewolf risks:**
  - Standing in the **cauldron room while in werewolf form is dangerous** — stay out until human.
  - **Some enemies become more aggressive** against the werewolf.
- **Player strategy:** watch the cycle; either wait for human form before approaching the cauldron, or detour to fetch other items while transformed.

## Cauldron mechanic

- The cauldron requests items **one at a time** in a predetermined sequence — an icon of the next requested item floats above it.
- Canonical 14-item sequence (the article quotes this exact order):

  > Crystal ball → Goblet → Wine bottle → Gem → Crystal ball → Poison → Boot → Teacup → Gem → Poison → Boot → Goblet → Teacup → Wine bottle

- Each starting game begins at a **different point in the sequence**, so memorizing the order isn't enough — you have to read the cauldron each visit.

## Ingredient items

- 7 distinct item types: **Crystal ball, Goblet, Wine bottle, Gem, Poison, Boot, Teacup** (plus an **Extra Life** pickup).
- Items appear **twice each** across the game world — you need to find two of each over the 14-step sequence.
- **Distribution tables A–H** map item placements to **eight numbered rooms** on the world map. Identifying which item is in room "1" tells you the active table → tells you where every other item is. The first room scouted seeds the rest of the run's logistics.

## World structure

- **Map:** numbered rooms (1–8) plus other rooms; rooms are connected by **doors on every adjacent edge**, except where a **thick black wall** blocks a connection.
- **Room colour-coding:** each room's primary on-screen colour is yellow, purple, blue, or green — a navigational hint.
- **Starting position:** Sabreman starts in **one of four** locations randomly; orient via the map to plan a route to the cauldron first.
- Many rooms have **multiple paths in/out**, so direct routes can be swapped for safer alternates when enemies / hazards block one.

## Puzzles & enemies

- **Patrol enemies** with regular movement patterns: time your dash through gaps.
- **Passing places:** some narrow rooms have small alcoves where Sabreman can stand to wait between enemy passes.
- **Push-block puzzles:** walk into objects to push them around the room and build platforms.
- **Item-as-platform:** drop an item you don't need on a tile, then jump onto it to gain extra height.
- **Enemy-as-platform:** some enemies carry objects on their heads — you can land on those objects safely.
- **Perspective tricks:** the isometric view causes optical illusions; some "ledges" or "gaps" aren't where they appear.
- **Overhead spikes:** placed at jump-arc apex height — catches careless jumps.

## Lives & timing

- 40 in-game days countdown.
- **Extra-life pickups** scattered through the world (per the distribution table).
- No score system mentioned — progress measured by **items delivered to cauldron**.

## Strategy tips (from the article)

- **First priority:** reach the cauldron safely from the starting room — read what it wants first.
- **Identify your distribution table** early by looking at one of the numbered rooms.
- **Save states are encouraged** while learning — the article frames them as a beginner aid for the Evercade port.
- Don't fight enemies — slip past or jump over.
- Be aware of transformation timing before entering the cauldron room.
- When stuck on a route, try a different one — the multiple-path map design is intentional.

---

## Implications for our build

Our current MVP (`src/scenes/TheHall.ts`) is a single room with goblet → door win. To scale toward the original game design:

1. **Cauldron entity** — make the cauldron interactive (currently a decorative `StaticVisual` half-sphere). It needs:
   - State: `wantedItemIndex: number`, `sequence: ItemId[]`
   - Behavior: when player stands on cauldron tile while carrying the wanted item, advance the sequence and emit a "delivered" event.
   - HUD slot for "next requested item."
2. **Multiple rooms + doors** — `Room` already exists and is composable. Need a `RoomGraph` (or equivalent) to wire room → door → room transitions, and a `currentRoomId` already exists in `GameState`.
3. **Item duplication** — current MVP has 1 goblet. Original has 2 of each item type. Implication: when an item is delivered to cauldron, it's removed from the world but the *type* may still be requested again — need to re-spawn the second copy or place both at start.
4. **40-day timer** — `GameState` has `transformTimer` but no day counter. Add `dayCount: number` advancing on a slower clock (e.g. one in-game day per X seconds of real play).
5. **Werewolf-only zones** — encode in the cauldron logic a "block delivery while werewolf" check.
6. **Distribution tables** — for parity, an 8-room start needs procedural item placement keyed off the player's first-discovered room. For an MVP-plus, hardcode one table.
7. **Patrol-enemy aggression mode** — `PatrolEnemy` currently has fixed speed. Add an `aggressive: boolean` flag that increases speed or shortens patrol gaps when `state.form === 'werewolf'`.

The plan's spec already references many of these (`docs/superpowers/specs/2026-05-01-knight-lore-web-3d-design.md`) but stops at the single-room MVP. This doc is the bridge from the implemented slice to a more authentic Knight Lore experience.
