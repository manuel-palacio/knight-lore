# Castle Graphics Redesign — Full Code Spec

Date: 2026-04-08  
Target file: `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt`

**Problem:** Walls look like office filing cabinet drawers. Floor reads as linoleum tile.  
**Root cause:** `DitheredPath(horizontal=true)` creates horizontal stripes, not stone masonry.  
Colours are warm olive/tan — no cold, damp castle feeling.  
**Goal:** Cold limestone castle interior. Heavy stone courses on walls. Ancient worn flagstone floor.

---

## 1. New Colour Constants

Replace `private object Colors { ... }` and `private fun paletteFor(theme: RoomTheme)` entirely.

```kotlin
private object CastleColors {
    // ── Wall faces — cold blue-grey limestone ──────────────────────────────
    // North/South face (south-facing inner wall — receives ambient top light)
    val WALL_SOUTH_BASE      = 0xFF_7A7E90.toInt()  // cool mid-grey, dominant
    val WALL_SOUTH_JOINT     = 0xFF_3A3C48.toInt()  // mortar line — deep cold shadow
    val WALL_SOUTH_STONE_LO  = 0xFF_6A6E80.toInt()  // lower stone in course (slightly darker)
    val WALL_SOUTH_STONE_HI  = 0xFF_8A8E9E.toInt()  // upper stone in course (catch-light)

    // East/West face (east-facing inner wall — in deeper shadow, less light)
    val WALL_EAST_BASE       = 0xFF_5A5E70.toInt()
    val WALL_EAST_JOINT      = 0xFF_2A2C38.toInt()
    val WALL_EAST_STONE_LO   = 0xFF_4E5264.toInt()
    val WALL_EAST_STONE_HI   = 0xFF_6A6E80.toInt()

    // Wall cap (top face — receives most light, lightest value)
    val WALL_TOP             = 0xFF_A8ACB8.toInt()
    val WALL_TOP_HIGHLIGHT   = 0xFF_C0C4CC.toInt()  // edge catch-light

    // ── Floor — worn limestone flagstone ──────────────────────────────────
    val FLOOR_SLAB           = 0xFF_484C58.toInt()  // slab body — cool dark slate
    val FLOOR_WORN           = 0xFF_585E6C.toInt()  // worn centre of slab (path traffic)
    val FLOOR_GROUT          = 0xFF_282C34.toInt()  // grout joint between slabs — very dark
    val FLOOR_CRACK          = 0xFF_1E2028.toInt()  // deep crack line

    // ── Block (pushable/solid) ────────────────────────────────────────────
    val BLOCK_TOP            = 0xFF_8A8E98.toInt()  // slightly lighter than wall top
    val BLOCK_LEFT           = 0xFF_5A5E70.toInt()
    val BLOCK_RIGHT          = 0xFF_3A3C4E.toInt()
    val BLOCK_JOINT          = 0xFF_282A38.toInt()  // chiselled edge

    // ── Accent / details ─────────────────────────────────────────────────
    val MOSS                 = 0xFF_2A4A2A.toInt()  // damp dark moss (not bright green)
    val CHAIN                = 0xFF_383840.toInt()  // dark iron
    val WATER_SEEP           = 0xFF_1A2A2A.toInt()
    val TORCH_BRACKET        = 0xFF_5A4020.toInt()

    // Danger / life
    val DANGER_RED           = 0xFF_CC2200.toInt()
    val LIFE_GREEN           = 0xFF_44FF88.toInt()
    val BLACK                = 0xFF_000000.toInt()
}

/**
 * Per-theme palette. CASTLE = cold limestone. DUNGEON = warm sandstone rubble.
 * TOWER = almost charcoal, very little light.
 */
private data class ThemePalette(
    // Wall faces
    val wallSouthBase: Int,
    val wallSouthJoint: Int,
    val wallSouthLo: Int,
    val wallSouthHi: Int,
    val wallEastBase: Int,
    val wallEastJoint: Int,
    val wallEastLo: Int,
    val wallEastHi: Int,
    val wallTop: Int,
    val wallTopHighlight: Int,
    // Floor
    val floorSlab: Int,
    val floorWorn: Int,
    val floorGrout: Int,
    // Blocks
    val blockTop: Int,
    val blockLeft: Int,
    val blockRight: Int,
    // Fog
    val fogColor: Int,
    // Whether walls use ashlar courses (CASTLE/TOWER) or rubble cracks (DUNGEON/CAVERN)
    val wallStyle: WallStyle,
)

enum class WallStyle { ASHLAR, RUBBLE }

private fun paletteFor(theme: RoomTheme): ThemePalette = when (theme) {
    RoomTheme.CASTLE -> ThemePalette(
        wallSouthBase      = 0xFF_7A7E90.toInt(),
        wallSouthJoint     = 0xFF_3A3C48.toInt(),
        wallSouthLo        = 0xFF_6A6E80.toInt(),
        wallSouthHi        = 0xFF_8A8E9E.toInt(),
        wallEastBase       = 0xFF_5A5E70.toInt(),
        wallEastJoint      = 0xFF_2A2C38.toInt(),
        wallEastLo         = 0xFF_4E5264.toInt(),
        wallEastHi         = 0xFF_6A6E80.toInt(),
        wallTop            = 0xFF_A8ACB8.toInt(),
        wallTopHighlight   = 0xFF_C0C4CC.toInt(),
        floorSlab          = 0xFF_484C58.toInt(),
        floorWorn          = 0xFF_585E6C.toInt(),
        floorGrout         = 0xFF_282C34.toInt(),
        blockTop           = 0xFF_8A8E98.toInt(),
        blockLeft          = 0xFF_5A5E70.toInt(),
        blockRight         = 0xFF_3A3C4E.toInt(),
        fogColor           = 0x28_000008.toInt(),
        wallStyle          = WallStyle.ASHLAR,
    )
    RoomTheme.DUNGEON -> ThemePalette(
        // Warm sandstone, but still desaturated — not a beach, a dank pit
        wallSouthBase      = 0xFF_787060.toInt(),
        wallSouthJoint     = 0xFF_3A3428.toInt(),
        wallSouthLo        = 0xFF_686050.toInt(),
        wallSouthHi        = 0xFF_888070.toInt(),
        wallEastBase       = 0xFF_585048.toInt(),
        wallEastJoint      = 0xFF_2A2420.toInt(),
        wallEastLo         = 0xFF_4A4438.toInt(),
        wallEastHi         = 0xFF_686058.toInt(),
        wallTop            = 0xFF_989080.toInt(),
        wallTopHighlight   = 0xFF_ADA898.toInt(),
        floorSlab          = 0xFF_3A3428.toInt(),
        floorWorn          = 0xFF_4A4438.toInt(),
        floorGrout         = 0xFF_1A1810.toInt(),
        blockTop           = 0xFF_888070.toInt(),
        blockLeft          = 0xFF_585048.toInt(),
        blockRight         = 0xFF_3A3428.toInt(),
        fogColor           = 0x28_080400.toInt(),
        wallStyle          = WallStyle.RUBBLE,
    )
    RoomTheme.TOWER -> ThemePalette(
        // Charcoal — very dark, moonlit tower
        wallSouthBase      = 0xFF_5A5E68.toInt(),
        wallSouthJoint     = 0xFF_282C34.toInt(),
        wallSouthLo        = 0xFF_4E5260.toInt(),
        wallSouthHi        = 0xFF_6A6E78.toInt(),
        wallEastBase       = 0xFF_404450.toInt(),
        wallEastJoint      = 0xFF_1E2028.toInt(),
        wallEastLo         = 0xFF_363A46.toInt(),
        wallEastHi         = 0xFF_4E5260.toInt(),
        wallTop            = 0xFF_7A7E88.toInt(),
        wallTopHighlight   = 0xFF_909498.toInt(),
        floorSlab          = 0xFF_383C48.toInt(),
        floorWorn          = 0xFF_484C58.toInt(),
        floorGrout         = 0xFF_1E2028.toInt(),
        blockTop           = 0xFF_6A6E78.toInt(),
        blockLeft          = 0xFF_404450.toInt(),
        blockRight         = 0xFF_282C38.toInt(),
        fogColor           = 0x30_000010.toInt(),
        wallStyle          = WallStyle.ASHLAR,
    )
}
```

---

## 2. Floor Tile Rendering — Flagstone Slab

Replace the `TileType.FLOOR` branch entirely. Each diamond = one large flagstone slab.

```kotlin
TileType.FLOOR -> {
    val dk = IsoProjector.depthKey(world)
    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"
    val pts = floorDiamond(gx, gy, gz, ox, oy)
    val seed = tile.gridX * 31 + tile.gridY * 17

    // Apply subtle per-tile jitter (keep existing logic)
    val jitteredPts = pts.mapIndexed { i, p ->
        Vec2f(p.x + jitter(p.x, seed, i * 2), p.y + jitter(p.y, seed, i * 2 + 1))
    }

    // ── CRYPT override ──────────────────────────────────────────────────
    val slabColor = if (roomType == RoomType.CRYPT) 0xFF_1A1018.toInt() else palette.floorSlab
    val wornColor = if (roomType == RoomType.CRYPT) 0xFF_221820.toInt() else palette.floorWorn
    val groutColor = palette.floorGrout

    // 1. Slab body — solid fill (no dither — flagstone is uniform stone, not checkerboard)
    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id,
        IsoProjector.toScreen(world) + offset,
        DrawPayload.ColorPath(jitteredPts, slabColor))

    // 2. Worn centre — inset diamond, 50% of slab size, centred
    //    This simulates centuries of foot traffic wearing a path across the stone.
    val wornPts = listOf(
        pt(gx + 0.25f, gy + 0.5f,  gz, ox, oy),  // left
        pt(gx + 0.5f,  gy + 0.25f, gz, ox, oy),  // top
        pt(gx + 0.75f, gy + 0.5f,  gz, ox, oy),  // right
        pt(gx + 0.5f,  gy + 0.75f, gz, ox, oy),  // bottom
    )
    commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_worn",
        IsoProjector.toScreen(world) + offset,
        DrawPayload.ColorPath(wornPts, wornColor))

    // 3. Grout lines — draw along all 4 edges of the diamond (the joint between slabs)
    //    Use full pts (not jittered) for clean straight joints
    val groutStroke = 0.8f
    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_nw",
        Vec2f(pts[3].x, pts[3].y),
        DrawPayload.Line(pts[3].x, pts[3].y, pts[0].x, pts[0].y, groutColor, groutStroke))
    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_ne",
        Vec2f(pts[0].x, pts[0].y),
        DrawPayload.Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y, groutColor, groutStroke))
    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_se",
        Vec2f(pts[1].x, pts[1].y),
        DrawPayload.Line(pts[1].x, pts[1].y, pts[2].x, pts[2].y, groutColor, groutStroke))
    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_sw",
        Vec2f(pts[2].x, pts[2].y),
        DrawPayload.Line(pts[2].x, pts[2].y, pts[3].x, pts[3].y, groutColor, groutStroke))

    // 4. Crack — 1 in 8 slabs (keep existing logic, update colour)
    if ((tile.gridX * 7 + tile.gridY * 13) % 8 == 0) {
        val c1 = pt(gx + 0.2f, gy + 0.15f, gz, ox, oy)
        val c2 = pt(gx + 0.65f, gy + 0.85f, gz, ox, oy)
        commands += DrawCommand(DrawLayer.FLOOR, dk, 3, "${id}_crack",
            Vec2f(c1.x, c1.y),
            DrawPayload.Line(c1.x, c1.y, c2.x, c2.y, CastleColors.FLOOR_CRACK, 1f))
    }

    // 5. CRYPT coffin lid — keep existing code, no changes needed
    // ... (existing coffin code unchanged)
}
```

---

## 3. Wall Face Rendering — Ashlar Stone Courses

This is the core visual change. Replace `DitheredPath(horizontal=true)` with a new helper
function `drawAshlarFace()` for CASTLE/TOWER themes, and `drawRubbleFace()` for DUNGEON/CAVERN.

### 3A. Add helper `drawWallFace()` to `RoomEntityFactory`

Add this private function. It draws a wall quad with proper stone courses.

```kotlin
/**
 * Draws a wall face (south-facing or east-facing) with per-theme masonry:
 * - ASHLAR: regular cut-stone courses. Horizontal mortar lines + staggered vertical joints.
 * - RUBBLE: solid fill + irregular crack lines (no regular courses).
 *
 * @param facePts  4 world-space corners of the face (bottom-left, bottom-right, top-right, top-left)
 * @param baseColor solid fill colour
 * @param jointColor mortar/crack line colour
 * @param loColor   lower stone course colour (slightly darker)
 * @param hiColor   upper stone course colour (slightly lighter, catch-light)
 * @param style     ASHLAR or RUBBLE
 * @param courseCount number of stone courses vertically (2 for z=0..1, 2 for z=1..2 = 4 total per wall)
 * @param gxSeed    tile gridX for stagger determinism
 * @param gzOffset  block layer index (0, 1, 2) — used to offset stagger pattern between layers
 */
private fun drawWallFace(
    commands: MutableList<DrawCommand>,
    layer: DrawLayer,
    dk: Int,
    id: String,
    facePts: List<Vec2f>,         // [bottom-left, bottom-right, top-right, top-left] in screen coords
    baseColor: Int,
    jointColor: Int,
    loColor: Int,
    hiColor: Int,
    style: WallStyle,
    gxSeed: Int,
    gzOffset: Int,
) {
    // 1. Solid base fill
    commands += DrawCommand(layer, dk, 1, "${id}_fill",
        facePts[0],
        DrawPayload.ColorPath(facePts, baseColor))

    when (style) {
        WallStyle.ASHLAR -> {
            // 2. Stone course subdivisions.
            //    We divide the quad into 2 horizontal bands (2 courses per z-unit).
            //    Each band gets its own fill: alternating loColor / hiColor.
            //    Then we draw mortar lines and vertical joints on top.

            // Lerp helper between two screen points
            fun lerp(a: Vec2f, b: Vec2f, t: Float) = Vec2f(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

            // facePts order: [0]=bottom-left, [1]=bottom-right, [2]=top-right, [3]=top-left
            // t=0 → bottom edge,  t=1 → top edge
            val courseFractions = listOf(0.0f, 0.5f, 1.0f)  // 2 courses = 3 horizontal lines

            for (ci in 0 until 2) {
                val t0 = courseFractions[ci]
                val t1 = courseFractions[ci + 1]

                // Course quad corners (in screen space, interpolating along vertical edges)
                val cBL = lerp(facePts[0], facePts[3], t0)
                val cBR = lerp(facePts[1], facePts[2], t0)
                val cTR = lerp(facePts[1], facePts[2], t1)
                val cTL = lerp(facePts[0], facePts[3], t1)
                val courseColor = if (ci % 2 == 0) loColor else hiColor
                commands += DrawCommand(layer, dk, 2 + ci, "${id}_course_$ci",
                    cBL, DrawPayload.ColorPath(listOf(cBL, cBR, cTR, cTL), courseColor))
            }

            // 3. Horizontal mortar lines (at t=0.5 between the two course fractions)
            for (ti in 1 until courseFractions.size - 1) {
                val t = courseFractions[ti]
                val mL = lerp(facePts[0], facePts[3], t)
                val mR = lerp(facePts[1], facePts[2], t)
                commands += DrawCommand(layer, dk, 5, "${id}_mortar_$ti",
                    mL, DrawPayload.Line(mL.x, mL.y, mR.x, mR.y, jointColor, 1f))
            }
            // Also draw top and bottom edge mortar lines for clean boundary
            commands += DrawCommand(layer, dk, 5, "${id}_mortar_bot",
                facePts[0], DrawPayload.Line(facePts[0].x, facePts[0].y, facePts[1].x, facePts[1].y, jointColor, 0.7f))
            commands += DrawCommand(layer, dk, 5, "${id}_mortar_top",
                facePts[3], DrawPayload.Line(facePts[3].x, facePts[3].y, facePts[2].x, facePts[2].y, jointColor, 0.7f))

            // 4. Vertical joints — staggered per course.
            //    Course 0 (bottom): joints at x=0.33, x=0.67
            //    Course 1 (top):    joints at x=0.16, x=0.50, x=0.84  (offset by half a stone)
            //    gzOffset and gxSeed allow consistent stagger across wall blocks.
            fun lerp(a: Vec2f, b: Vec2f, t: Float) = Vec2f(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

            val courseJoints = listOf(
                listOf(0.33f, 0.67f),         // course 0 joints
                listOf(0.16f, 0.50f, 0.84f),  // course 1 joints (offset by 0.5 stone)
            )
            for (ci in 0 until 2) {
                val t0 = courseFractions[ci]
                val t1 = courseFractions[ci + 1]
                // Stagger offset: alternate between the two patterns based on (gzOffset + ci) parity
                val patternIdx = (gzOffset + ci) % 2
                for (jx in courseJoints[patternIdx]) {
                    val jBot = lerp(lerp(facePts[0], facePts[3], t0), lerp(facePts[1], facePts[2], t0), jx)
                    val jTop = lerp(lerp(facePts[0], facePts[3], t1), lerp(facePts[1], facePts[2], t1), jx)
                    commands += DrawCommand(layer, dk, 6, "${id}_joint_${ci}_${jx}",
                        jBot, DrawPayload.Line(jBot.x, jBot.y, jTop.x, jTop.y, jointColor, 0.8f))
                }
            }
        }

        WallStyle.RUBBLE -> {
            // DUNGEON / CAVERN: solid fill already drawn above.
            // Add 2-3 irregular crack lines per face block (seeded on gxSeed + gzOffset).
            val numCracks = 2 + (gxSeed + gzOffset) % 2
            val lerp = { a: Vec2f, b: Vec2f, t: Float -> Vec2f(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t) }
            for (ci in 0 until numCracks) {
                val seed2 = (gxSeed * 17 + gzOffset * 11 + ci * 7) and 0xFFFF
                val startX = ((seed2 * 0x1F) and 0xFF) / 255f
                val endX   = ((seed2 * 0x3D + 0x7F) and 0xFF) / 255f
                val startY = ((seed2 * 0x5B) and 0xFF) / 255f * 0.4f  // in lower 40% of face
                val endY   = startY + 0.3f + ((seed2 * 0x79) and 0xFF) / 255f * 0.4f
                val p1 = lerp(lerp(facePts[0], facePts[3], startY), lerp(facePts[1], facePts[2], startY), startX)
                val p2 = lerp(lerp(facePts[0], facePts[3], endY.coerceAtMost(1f)), lerp(facePts[1], facePts[2], endY.coerceAtMost(1f)), endX)
                commands += DrawCommand(layer, dk, 3, "${id}_crack_$ci",
                    p1, DrawPayload.Line(p1.x, p1.y, p2.x, p2.y, jointColor, 0.8f))
            }
        }
    }
}
```

### 3B. Update `wallBlockNorth()` to use `drawWallFace()`

Inside `buildWalls()`, replace the `DrawPayload.DitheredPath(... horizontal=true)` call in
`wallBlockNorth` with:

```kotlin
// Instead of:
commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
    IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
    DrawPayload.DitheredPath(blockFaceLeft(gx, gy, bz, ox, oy), wFD1, wFD2, horizontal = true))

// Replace with:
val southFacePts = blockFaceLeft(gx, gy, bz, ox, oy)  // existing helper
drawWallFace(
    commands, DrawLayer.BLOCK, dk, "${id}_left",
    southFacePts,
    baseColor  = palette.wallSouthBase,
    jointColor = palette.wallSouthJoint,
    loColor    = palette.wallSouthLo,
    hiColor    = palette.wallSouthHi,
    style      = palette.wallStyle,
    gxSeed     = gx.toInt(),
    gzOffset   = gz,
)
```

### 3C. Update `wallBlockWest()` to use `drawWallFace()`

Same change, using the east face:

```kotlin
// Instead of:
commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
    IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
    DrawPayload.DitheredPath(blockFaceRight(gx, gy, bz, ox, oy), wFR1, wFR2, horizontal = true))

// Replace with:
val eastFacePts = blockFaceRight(gx, gy, bz, ox, oy)  // existing helper
drawWallFace(
    commands, DrawLayer.BLOCK, dk, "${id}_right",
    eastFacePts,
    baseColor  = palette.wallEastBase,
    jointColor = palette.wallEastJoint,
    loColor    = palette.wallEastLo,
    hiColor    = palette.wallEastHi,
    style      = palette.wallStyle,
    gxSeed     = gy.toInt(),
    gzOffset   = gz,
)
```

### 3D. Update wall top cap

Replace `DrawPayload.ColorPath(floorDiamond(...), wTop)` in both `wallBlockNorth` and
`wallBlockWest` with:

```kotlin
// Top face — flat fill
commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), palette.wallTop))
// Highlight edge — the nearest edge of the cap catches the most light
val h1 = pt(gx, gy, bz + 1f, ox, oy)
val h2 = pt(gx, gy + 1f, bz + 1f, ox, oy)
commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_cap_hl",
    Vec2f(h1.x, h1.y),
    DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, palette.wallTopHighlight, 1.2f))
```

### 3E. Update exit jambs to use `drawWallFace()`

In both `doorArchway()` and the South/East exit pillar code, replace all
`DrawPayload.DitheredPath(... horizontal=true)` with `drawWallFace()` using the same
palette values.

---

## 4. SOLID_BLOCK tile rendering — update to new block colours

```kotlin
TileType.SOLID_BLOCK -> {
    // ... (keep existing depth/layer logic)

    // Top face
    commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
        IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
        DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), palette.blockTop))

    // Left face — use drawWallFace() for consistent masonry look
    drawWallFace(commands, blockLayer, dk, "${id}_left",
        blockFaceLeft(gx, gy, gz, ox, oy),
        baseColor  = palette.blockLeft,
        jointColor = CastleColors.BLOCK_JOINT,
        loColor    = palette.blockLeft,
        hiColor    = palette.blockTop,
        style      = palette.wallStyle,
        gxSeed     = gx.toInt(),
        gzOffset   = gz.toInt(),
    )

    // Right face
    drawWallFace(commands, blockLayer, dk, "${id}_right",
        blockFaceRight(gx, gy, gz, ox, oy),
        baseColor  = palette.blockRight,
        jointColor = CastleColors.BLOCK_JOINT,
        loColor    = palette.blockRight,
        hiColor    = palette.blockLeft,
        style      = palette.wallStyle,
        gxSeed     = gx.toInt() + 1,
        gzOffset   = gz.toInt(),
    )

    // Chiselled edge on top face (replaces cross — blocks are architectural, not decorative)
    val edgeColor = CastleColors.BLOCK_JOINT
    val topPts = floorDiamond(gx, gy, gz + 1f, ox, oy)
    // Inset diamond outline (drawn 3px inside each edge)
    val inset = 0.08f
    val insetPts = listOf(
        pt(gx + inset,       gy + inset,       gz + 1f, ox, oy),
        pt(gx + 1f - inset,  gy + inset,       gz + 1f, ox, oy),
        pt(gx + 1f - inset,  gy + 1f - inset,  gz + 1f, ox, oy),
        pt(gx + inset,       gy + 1f - inset,  gz + 1f, ox, oy),
    )
    for (ei in insetPts.indices) {
        val ea = insetPts[ei]; val eb = insetPts[(ei + 1) % insetPts.size]
        commands += DrawCommand(blockLayer, dk, 3, "${id}_edge_$ei",
            ea, DrawPayload.Line(ea.x, ea.y, eb.x, eb.y, edgeColor, 0.8f))
    }
}
```

---

## 5. Torch light cast — update warm-on-cold contrast

The torchlight floor cast is already correct (`0x08_FF6600`). With the new cold grey floor,
this warm cast will be far more visible and impactful. **Increase alpha slightly:**

```kotlin
// Change from:
DrawPayload.ColorPath(floorDiamond(...), 0x08_FF6600.toInt())
// To:
DrawPayload.ColorPath(floorDiamond(...), 0x12_FF6800.toInt())
```

Also increase the glow halo from `0x11_FF6600` to `0x1A_FF6600`.

---

## 6. Moss — darken to damp castle moss

```kotlin
// Change from:
DrawPayload.ColorOval(9f, 6f, Colors.WALL_MOSS)
// To:
DrawPayload.ColorOval(9f, 6f, CastleColors.MOSS)
// where CastleColors.MOSS = 0xFF_2A4A2A
```

Add a second slightly lighter moss speckle 2px offset for depth:
```kotlin
commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_moss_hi",
    Vec2f(moss.x - 3f, moss.y - 4f),
    DrawPayload.ColorOval(5f, 3f, 0xFF_3A6A3A.toInt()))
```

---

## 7. Chain — update to dark iron

```kotlin
// Change all chain colours from 0xFF_3A3A4A to:
val chainColor = CastleColors.CHAIN  // 0xFF_383840
```

---

## 8. ThemePalette field access — update all usage sites

After adding `wallSouthBase`, `wallSouthJoint` etc., search `buildWalls()` for all uses of
`wFD1, wFD2, wFR1, wFR2` and replace with the new field names from the palette.
Also remove the `val wFD1 = palette.wallFaceD1` etc. destructuring at the top of `buildWalls()`.

New destructuring at top of `buildWalls()`:
```kotlin
val wTop  = palette.wallTop
val wTHl  = palette.wallTopHighlight
// (the face colours are passed directly to drawWallFace)
```

---

## 9. Per-RoomType floor overrides

Inside the flagstone floor code (section 2 above), add these overrides after the main slab:

```kotlin
// FLOODED: add water plane OVER the flagstone (already exists — keep, no change)
// CRYPT: darker slab, no worn centre (dead floor, nobody walks here)
//   → skip the worn centre diamond for CRYPT rooms
// CAVERN: add rubble texture — small random dark ovals scattered over some slabs
if (roomType == RoomType.CAVERN && (tile.gridX * 7 + tile.gridY * 13) % 4 == 0) {
    val rx = gx + 0.3f + ((tile.gridX * 17) and 0x7) / 16f
    val ry = gy + 0.3f + ((tile.gridY * 13) and 0x7) / 16f
    val rubbPt = pt(rx, ry, gz, ox, oy)
    commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_rubble",
        Vec2f(rubbPt.x - 3f, rubbPt.y - 2f),
        DrawPayload.ColorOval(6f, 3f, 0xFF_282C34.toInt()))
}
```

---

## 10. Remove `DitheredPath(horizontal=true)` entirely

After all changes above, `DitheredPath(horizontal=true)` should no longer be called anywhere.
Search the file and confirm zero occurrences. If any remain in the column/pillar/dais rendering
(THRONE_ANTECHAMBER), replace those too with `drawWallFace()` or plain `ColorPath`.

---

## Visual Effect Summary

| Before | After |
|--------|-------|
| Horizontal stripe dither → filing cabinet drawers | Ashlar stone courses with staggered vertical joints |
| Warm olive/tan wall colours | Cold blue-grey limestone |
| Black + dim checker floor | Solid cool slate slab + worn centre + grout lines |
| Bright olive moss | Dark damp moss #2A4A2A |
| Faint torch glow on dark floor | Visible warm orange cast on cold grey stone |
| Office-grey uniform surface | Heavy, layered, medieval stone castle interior |

---

## Implementation Notes for Claude

1. Add `WallStyle` enum just before `ThemePalette` data class.
2. Add `drawWallFace()` private function just after the `blockFaceRight()` helper.
3. Replace `private object Colors` with `private object CastleColors`.
4. Replace `paletteFor()` function with new version.
5. Update `ThemePalette` data class fields to match new names.
6. In `TileType.FLOOR` branch — replace the `DitheredPath` floor with the flagstone approach.
7. In `TileType.SOLID_BLOCK` branch — call `drawWallFace()` for faces.
8. In `wallBlockNorth()` — call `drawWallFace()` for south face.
9. In `wallBlockWest()` — call `drawWallFace()` for east face.
10. In `doorArchway()` jambs, south/east exit pillars — call `drawWallFace()`.
11. Update torch light alpha `0x08→0x12`, glow halo `0x11→0x1A`.
12. Update moss colour and add second moss speckle.
13. Update chain colour.
14. Run search: confirm zero `DitheredPath(horizontal=true)` remain.
15. Run search: confirm zero `wFD1`, `wFD2`, `wFR1`, `wFR2` remain.
