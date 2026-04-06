# Knight Lore Remake — Safe Rebranding Guide

## Purpose
This document provides **exact changes** to transform the Knight Lore remake into a copyright-safe spiritual successor called **"Werewolf\'s Curse"**. The goal is to preserve 99% of the design, mechanics, and production work while eliminating legal risk from Rare/Microsoft IP claims.[web:18][web:116]

## New identity
| Original | New |
|---|---|
| **Title** | Knight Lore → **Werewolf\'s Curse** |
| **Hero** | Sabreman → **Sir Rowan** |
| **Curse mechanic** | Werewolf transformation → **Lycan curse** |
| **NPC** | Melkhior → **Elder Thorne** |
| **Hub** | Cauldron → **Ritual Brazier** |
| **World** | 128-room castle → **Cursed Citadel** |
| **Time limit** | 40 days → **30 nights** |

## Core loop (unchanged)
1. Learn brazier\'s requested relic.
2. Navigate citadel.
3. Collect relic.
4. Return before nightfall.
5. Repeat 12 times to break curse.

## Exact content replacements

### Names (search/replace everywhere)
```
Knight Lore → Werewolf\'s Curse
Sabreman → Sir Rowan
Melkhior → Elder Thorne
cauldron → brazier
castle → citadel
potion → elixir
```

### Numbers (tweak slightly)
```
40 days → 30 nights
14 items → 12 relics
5 lives → 4 lives (optional)
```

### Item names (genericize)
```
crystal ball → crystal orb
goblet → chalice
wine bottle → elixir vial
gem → rune stone
poison → toxin flask
boot → iron boot
teacup → silver chalice
```

## Visual changes (minimal)
- **Sir Rowan**: same adventurer silhouette, change helmet shape slightly.
- **Elder Thorne**: same wizard silhouette, add different staff/robe details.
- **Brazier**: cauldron → tall glowing brazier.
- **Rooms**: "castle" → "citadel" in themes, same mechanics.

## Code changes (docs already support)
1. **Data models**: `CauldronState` → `BrazierState`, `ItemFamily.CRYSTAL_BALL` → `CRYSTAL_ORB`.
2. **Room JSON**: `"type": "cauldron"` → `"type": "brazier"`.
3. **UI text**: "Cauldron requests" → "Brazier reveals".
4. **Save data**: version bump to mark rebrand.

## Store listing
```
Title: Werewolf\'s Curse
Tagline: Break the lycan curse before 30 nights pass in the Cursed Citadel!
Description: Isometric puzzle adventure. Navigate deadly chambers, solve block puzzles, carry relics to Elder Thorne\'s brazier. Survive day-night transformation!
Keywords: isometric, puzzle, werewolf, adventure, lycan, citadel
```

## Legal safety checklist
- [ ] No "Knight Lore" anywhere (title, description, tags).
- [ ] No Sabreman/Melkhior names.
- [ ] No exact 40-day/14-item numbers.
- [ ] Generic fantasy items (no wine bottle, teacup).
- [ ] Mechanics free to copy (puzzles, isometric).[web:18]
- [ ] Store screenshots show brazier/citadel, not cauldron/castle.

## Production impact
**Zero code rewrite needed.** Changes are:
- 10 search/replace in data/strings.
- 5 model renames.
- Art tweaks (rename sprite files).
- Store assets.

## Marketing angle
**Stronger than original**:
- Modern controls/accessibility.
- Canvas renderer precision.
- Vertical slice proven.
- Spiritual successor to a genre-defining classic.

## Updated document titles (optional)
Rename files for consistency:
- `werewolfs-curse-android-kotlin-implementation.md`
- etc. (bulk rename)

## Claude Code instruction
Apply these replacements to all content JSON, strings, and model names. Keep all mechanics, isometric rules, room layouts identical.

**Result**: Identical experience, zero legal risk.[web:116][web:18]
