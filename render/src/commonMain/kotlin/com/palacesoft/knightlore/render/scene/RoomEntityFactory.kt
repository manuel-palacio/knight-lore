package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.ActorType
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.PatrolEnemy
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.RoomType
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.BlockState
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.render.iso.IsoProjector

/**
 * Converts the current GameState + GameContent into a flat list of DrawCommands
 * for the current room. Dark fantasy plague aesthetic — all visuals drawn in code.
 */
object RoomEntityFactory {

    private object Colors {
        const val BLACK       = 0xFF_0A0808.toInt()   // outlines, deep shadow
        const val DARK_STONE  = 0xFF_1C1C2C.toInt()   // floor, wall base
        const val MID_STONE   = 0xFF_3A3A5A.toInt()   // block faces, wall top
        const val HIGHLIGHT   = 0xFF_6A6A8A.toInt()   // top edges, specular
        const val DANGER_RED  = 0xFF_AA2200.toInt()   // hazard, damage indicators
        const val LIFE_GREEN  = 0xFF_228822.toInt()   // cauldron, item glow, health

        // Aliases for readability — all map to the 6 above
        const val FLOOR_TOP      = DARK_STONE
        const val FLOOR_CRACK    = BLACK
        const val FLOOR_GLOW_BASE = 0x30_000800.toInt()  // tinted dark (still green-ish)
        const val FLOOR_GLOW_OVER = 0x18_003300.toInt()
        const val WALL_TOP          = MID_STONE
        const val WALL_LEFT_D1      = 0xFF_1C1C2A.toInt()  // south-facing dither color 1
        const val WALL_LEFT_D2      = 0xFF_141420.toInt()  // south-facing dither color 2
        const val WALL_RIGHT_D1     = 0xFF_141420.toInt()  // east-facing dither color 1
        const val WALL_RIGHT_D2     = 0xFF_0E0E18.toInt()  // east-facing dither color 2
        const val WALL_MORTAR    = BLACK
        const val WALL_HIGHLIGHT = HIGHLIGHT
        const val WALL_MOSS      = LIFE_GREEN
        const val BLOCK_TOP      = MID_STONE
        const val BLOCK_LEFT     = DARK_STONE
        const val BLOCK_RIGHT    = 0xFF_141422.toInt()
        const val BLOCK_CROSS    = HIGHLIGHT
        const val CLOAK_HUMAN    = 0xFF_14081E.toInt()  // near-black, dark stone range
        const val CLOAK_WOLF     = 0xFF_100610.toInt()
        const val SKIN           = HIGHLIGHT             // #6A6A8A — pale stone-grey
        const val HANDS          = HIGHLIGHT
        const val EYES_HUMAN     = LIFE_GREEN
        const val EYES_WOLF      = DANGER_RED
        const val CLOAK_BLINK    = DANGER_RED
        const val GOBLIN_TOP     = LIFE_GREEN
        const val GOBLIN_LEFT    = 0xFF_122212.toInt()
        const val GOBLIN_RIGHT   = 0xFF_0A180A.toInt()
        const val ITEM           = HIGHLIGHT
        const val ACTOR          = DANGER_RED
    }

    /** Per-theme color palette — floor, wall, and block tints vary by room theme. */
    private data class ThemePalette(
        val floor1: Int,        // base floor tile color
        val floor2: Int,        // dither alternate floor color
        val wallTop: Int,       // wall top face
        val wallFaceD1: Int,    // wall south face dither 1
        val wallFaceD2: Int,    // wall south face dither 2
        val wallFaceR1: Int,    // wall east face dither 1
        val wallFaceR2: Int,    // wall east face dither 2
        val blockTop: Int,
        val blockLeft: Int,
        val blockRight: Int,
        val fogColor: Int,      // edge vignette color (replaces fixed black)
    )

    private fun paletteFor(theme: RoomTheme): ThemePalette = when (theme) {
        RoomTheme.CASTLE -> ThemePalette(
            floor1     = 0xFF_222236.toInt(),
            floor2     = 0xFF_2E2E46.toInt(),
            wallTop    = 0xFF_4A4A6E.toInt(),
            wallFaceD1 = 0xFF_2E2E46.toInt(),
            wallFaceD2 = 0xFF_1E1E32.toInt(),
            wallFaceR1 = 0xFF_1E1E32.toInt(),
            wallFaceR2 = 0xFF_161626.toInt(),
            blockTop   = 0xFF_4A4A6E.toInt(),
            blockLeft  = 0xFF_2E2E46.toInt(),
            blockRight = 0xFF_1E1E32.toInt(),
            fogColor   = 0x30_000010.toInt(),
        )
        RoomTheme.DUNGEON -> ThemePalette(
            floor1     = 0xFF_251A0E.toInt(),
            floor2     = 0xFF_362514.toInt(),
            wallTop    = 0xFF_5A3E20.toInt(),
            wallFaceD1 = 0xFF_3A2818.toInt(),
            wallFaceD2 = 0xFF_28180C.toInt(),
            wallFaceR1 = 0xFF_28180C.toInt(),
            wallFaceR2 = 0xFF_1C1008.toInt(),
            blockTop   = 0xFF_5A3E20.toInt(),
            blockLeft  = 0xFF_3A2818.toInt(),
            blockRight = 0xFF_28180C.toInt(),
            fogColor   = 0x30_100800.toInt(),
        )
        RoomTheme.TOWER -> ThemePalette(
            floor1     = 0xFF_1A1E28.toInt(),
            floor2     = 0xFF_262C3A.toInt(),
            wallTop    = 0xFF_3A4460.toInt(),
            wallFaceD1 = 0xFF_262C3A.toInt(),
            wallFaceD2 = 0xFF_1A1E28.toInt(),
            wallFaceR1 = 0xFF_181E30.toInt(),
            wallFaceR2 = 0xFF_101422.toInt(),
            blockTop   = 0xFF_3A4460.toInt(),
            blockLeft  = 0xFF_262C3A.toInt(),
            blockRight = 0xFF_181E30.toInt(),
            fogColor   = 0x30_000820.toInt(),
        )
    }

    // Project world → screen, adding room offset
    private fun pt(x: Float, y: Float, z: Float, ox: Float, oy: Float): Vec2f {
        val s = IsoProjector.toScreen(Vec3f(x, y, z))
        return Vec2f(ox + s.x, oy + s.y)
    }

    // 4 corners of the top-face diamond at (gx, gy) at height gz
    private fun floorDiamond(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx,      gy,      gz, ox, oy),
        pt(gx + 1f, gy,      gz, ox, oy),
        pt(gx + 1f, gy + 1f, gz, ox, oy),
        pt(gx,      gy + 1f, gz, ox, oy),
    )

    // Seeded deterministic pixel jitter for floor tiles
    private fun jitter(x: Float, seed: Int, axis: Int): Float {
        val h = (seed * 31 + axis * 17) and 0xFFFFFF
        return ((h and 0xF) / 7.5f) - 1.0f  // range -1.0f .. +1.0f deterministic
    }

    // Left (south-y) face of a block: bottom-y face going from gz to gz+1
    private fun blockFaceLeft(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx,      gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz + 1f, ox, oy),
        pt(gx,      gy + 1f, gz + 1f, ox, oy),
    )

    // Right (east-x) face of a block
    private fun blockFaceRight(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx + 1f, gy,      gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz + 1f, ox, oy),
        pt(gx + 1f, gy,      gz + 1f, ox, oy),
    )

    fun build(
        state: GameState,
        content: GameContent,
        viewportW: Float,
        viewportH: Float,
    ): List<DrawCommand> {
        val room = content.rooms[state.currentRoomId] ?: return emptyList()
        val offset = IsoProjector.roomOffset(room.width, room.depth, viewportW, viewportH)
        val commands = mutableListOf<DrawCommand>()
        val ox = offset.x; val oy = offset.y
        val tick = state.time.tick
        val roomType = room.roomType
        val palette = paletteFor(room.theme)

        // 1. Floor and block tiles
        room.tiles.forEach { tile ->
            val gx = tile.gridX.toFloat()
            val gy = tile.gridY.toFloat()
            val gz = tile.gridZ.toFloat()
            val world = Vec3f(gx, gy, gz)
            when (tile.type) {
                TileType.FLOOR -> {
                    val dk = IsoProjector.depthKey(world)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"
                    val pts = floorDiamond(gx, gy, gz, ox, oy)

                    // Apply per-tile stable jitter to floor diamond points
                    val seed = tile.gridX * 31 + tile.gridY * 17
                    val jitteredPts = pts.mapIndexed { i, p ->
                        Vec2f(p.x + jitter(p.x, seed, i * 2), p.y + jitter(p.y, seed, i * 2 + 1))
                    }

                    // Theme-driven floor colors
                    val floorColor1 = if (roomType == RoomType.CRYPT) 0xFF_1A1018.toInt() else palette.floor1
                    val floorColor2 = if (roomType == RoomType.CRYPT) 0xFF_241824.toInt() else palette.floor2

                    // Base stone tile — dithered checkerboard
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id,
                        IsoProjector.toScreen(world) + offset,
                        DrawPayload.DitheredPath(jitteredPts, floorColor1, floorColor2))

                    // CRYPT coffin lid — every 5th tile
                    if (roomType == RoomType.CRYPT && (tile.gridX * 3 + tile.gridY * 7) % 5 == 0) {
                        val coffinPts = listOf(
                            pt(gx + 0.15f, gy + 0.3f, gz, ox, oy),
                            pt(gx + 0.85f, gy + 0.3f, gz, ox, oy),
                            pt(gx + 0.85f, gy + 0.7f, gz, ox, oy),
                            pt(gx + 0.15f, gy + 0.7f, gz, ox, oy),
                        )
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 3, "${id}_coffin",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(coffinPts, 0xFF_1A1A28.toInt()))
                        // Cross inset on coffin lid
                        val ch1 = pt(gx + 0.3f, gy + 0.5f, gz, ox, oy)
                        val ch2 = pt(gx + 0.7f, gy + 0.5f, gz, ox, oy)
                        val cv1 = pt(gx + 0.5f, gy + 0.33f, gz, ox, oy)
                        val cv2 = pt(gx + 0.5f, gy + 0.67f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_coffin_h",
                            Vec2f(ch1.x, ch1.y),
                            DrawPayload.Line(ch1.x, ch1.y, ch2.x, ch2.y, 0xFF_2A2A38.toInt(), 1f))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_coffin_v",
                            Vec2f(cv1.x, cv1.y),
                            DrawPayload.Line(cv1.x, cv1.y, cv2.x, cv2.y, 0xFF_2A2A38.toInt(), 1f))
                    }

                    // Crack lines (~1 in 4 tiles, deterministic)
                    if ((tile.gridX * 7 + tile.gridY * 13) % 4 == 0) {
                        val c1 = pt(gx + 0.2f, gy + 0.1f, gz, ox, oy)
                        val c2 = pt(gx + 0.8f, gy + 0.9f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_crack",
                            Vec2f(c1.x, c1.y),
                            DrawPayload.Line(c1.x, c1.y, c2.x, c2.y, Colors.FLOOR_CRACK, 1f))
                    }
                    // Secondary crack on some cracked tiles
                    if ((tile.gridX * 11 + tile.gridY * 3) % 7 == 0) {
                        val c1 = pt(gx + 0.7f, gy + 0.1f, gz, ox, oy)
                        val c2 = pt(gx + 0.3f, gy + 0.7f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_crack2",
                            Vec2f(c1.x, c1.y),
                            DrawPayload.Line(c1.x, c1.y, c2.x, c2.y, Colors.FLOOR_CRACK, 1f))
                    }

                    // Glow puddle (~5% of tiles)
                    if ((tile.gridX * 11 + tile.gridY * 17 + tile.gridX * tile.gridY) % 20 == 0) {
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_glow_base",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(pts, Colors.FLOOR_GLOW_BASE))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 3, "${id}_glow_over",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(pts, Colors.FLOOR_GLOW_OVER))
                    }

                    // Stone slab variation — every 3rd tile: lighter dither overlay to break up uniformity
                    if ((tile.gridX + tile.gridY) % 3 == 0) {
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_slab",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.DitheredPath(jitteredPts, 0xFF_1E1E2E.toInt(), 0xFF_2A2A3E.toInt()))
                    }

                    // Blood smear — 1-in-30 tiles: asymmetric blob + splatter dots
                    if ((tile.gridX * 13 + tile.gridY * 7 + tile.gridX * tile.gridY * 3) % 30 == 0) {
                        // Blob — not aligned to tile grid, slightly offset
                        val blobPts = listOf(
                            pt(gx + 0.15f, gy + 0.3f, gz, ox, oy),
                            pt(gx + 0.55f, gy + 0.2f, gz, ox, oy),
                            pt(gx + 0.7f,  gy + 0.5f, gz, ox, oy),
                            pt(gx + 0.45f, gy + 0.75f, gz, ox, oy),
                            pt(gx + 0.2f,  gy + 0.65f, gz, ox, oy),
                        )
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 6, "${id}_blood",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(blobPts, 0xFF_3A0000.toInt()))
                        // Splatter dots
                        for (di in 0..2) {
                            val dotSeed = tile.gridX * 17 + tile.gridY * 11 + di * 7
                            val dotX = gx + 0.1f + ((dotSeed * 23 and 0xFF) / 255f) * 0.8f
                            val dotY = gy + 0.1f + ((dotSeed * 31 and 0xFF) / 255f) * 0.8f
                            val dotPt = pt(dotX, dotY, gz, ox, oy)
                            commands += DrawCommand(DrawLayer.FLOOR, dk, 7, "${id}_splat_$di",
                                Vec2f(dotPt.x - 1f, dotPt.y - 1f),
                                DrawPayload.ColorOval(2f, 1.5f, 0xFF_2A0000.toInt()))
                        }
                    }

                    // Scattered bones — 1-in-40 tiles: two thin crossed line segments
                    if ((tile.gridX * 19 + tile.gridY * 11) % 40 == 0) {
                        val b1 = pt(gx + 0.2f, gy + 0.4f, gz, ox, oy)
                        val b2 = pt(gx + 0.8f, gy + 0.6f, gz, ox, oy)
                        val b3 = pt(gx + 0.3f, gy + 0.7f, gz, ox, oy)
                        val b4 = pt(gx + 0.7f, gy + 0.3f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 6, "${id}_bone1",
                            Vec2f(b1.x, b1.y),
                            DrawPayload.Line(b1.x, b1.y, b2.x, b2.y, 0xFF_5A5A4A.toInt(), 1f))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 6, "${id}_bone2",
                            Vec2f(b3.x, b3.y),
                            DrawPayload.Line(b3.x, b3.y, b4.x, b4.y, 0xFF_5A5A4A.toInt(), 1f))
                    }

                    // Rubble near walls — 1-in-15 tiles near perimeter
                    val nearWall = tile.gridX <= 1 || tile.gridY <= 1 || tile.gridX >= room.width - 2 || tile.gridY >= room.depth - 2
                    if (nearWall && (tile.gridX * 7 + tile.gridY * 23) % 15 == 0) {
                        // 2–3 tiny triangle chips
                        val numChips = 2 + (tile.gridX * tile.gridY) % 2
                        for (ci in 0 until numChips) {
                            val chipSeed = tile.gridX * 41 + tile.gridY * 37 + ci * 13
                            val cx2 = gx + 0.1f + ((chipSeed * 29 and 0xFF) / 255f) * 0.8f
                            val cy2 = gy + 0.1f + ((chipSeed * 43 and 0xFF) / 255f) * 0.8f
                            val cp1 = pt(cx2, cy2, gz, ox, oy)
                            val cp2 = pt(cx2 + 0.07f, cy2 + 0.04f, gz, ox, oy)
                            val cp3 = pt(cx2 + 0.04f, cy2 + 0.09f, gz, ox, oy)
                            commands += DrawCommand(DrawLayer.FLOOR, dk, 6, "${id}_chip_$ci",
                                Vec2f(cp1.x, cp1.y),
                                DrawPayload.ColorPath(listOf(cp1, cp2, cp3), 0xFF_2A2A3A.toInt()))
                        }
                    }

                    // Floor edge highlights — top-left and top-right edges catch light
                    // pts[0]=north, pts[1]=east, pts[2]=south, pts[3]=west
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_hl_l",
                        Vec2f(pts[3].x, pts[3].y),
                        DrawPayload.Line(pts[3].x, pts[3].y, pts[0].x, pts[0].y, Colors.HIGHLIGHT, 1f))
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_hl_r",
                        Vec2f(pts[0].x, pts[0].y),
                        DrawPayload.Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y, Colors.HIGHLIGHT, 1f))
                }
                TileType.SOLID_BLOCK -> {
                    // Depth key based on front-bottom corner (gy+1 is the camera-facing edge)
                    val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
                    val dk = IsoProjector.depthKey(footWorld)
                    // Use depth comparison to decide layer: blocks "in front of" player go to FOREGROUND,
                    // blocks "behind" player stay in BLOCK. This implements the painter's algorithm correctly.
                    val playerPos = state.player.position
                    val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, 0f))
                    val blockLayer = if (dk > playerDk) DrawLayer.FOREGROUND else DrawLayer.BLOCK
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"

                    // Top face
                    commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), palette.blockTop, 0xFF_0A0A14.toInt()))
                    // Left face
                    commands += DrawCommand(blockLayer, dk, 1, "${id}_left",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
                        DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), palette.blockLeft, 0xFF_0A0A14.toInt()))
                    // Right face
                    commands += DrawCommand(blockLayer, dk, 0, "${id}_right",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
                        DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), palette.blockRight, 0xFF_0A0A14.toInt()))

                    // Carved cross on top face (4-point cross along iso axes)
                    val crossColor = Colors.BLOCK_CROSS
                    val cH1 = pt(gx + 0.2f, gy + 0.5f, gz + 1f, ox, oy)
                    val cH2 = pt(gx + 0.8f, gy + 0.5f, gz + 1f, ox, oy)
                    val cV1 = pt(gx + 0.5f, gy + 0.2f, gz + 1f, ox, oy)
                    val cV2 = pt(gx + 0.5f, gy + 0.8f, gz + 1f, ox, oy)
                    commands += DrawCommand(blockLayer, dk, 3, "${id}_cross_h",
                        Vec2f(cH1.x, cH1.y),
                        DrawPayload.Line(cH1.x, cH1.y, cH2.x, cH2.y, crossColor, 1.5f))
                    commands += DrawCommand(blockLayer, dk, 3, "${id}_cross_v",
                        Vec2f(cV1.x, cV1.y),
                        DrawPayload.Line(cV1.x, cV1.y, cV2.x, cV2.y, crossColor, 1.5f))

                    // Worn stone edge — 1-in-4 blocks: inset top face outline for worn look
                    if ((tile.gridX * 5 + tile.gridY * 11 + tile.gridZ * 3) % 4 == 0) {
                        val inset = 0.06f
                        val wornPts = listOf(
                            pt(gx + inset,        gy + inset,        gz + 1f, ox, oy),
                            pt(gx + 1f - inset,   gy + inset,        gz + 1f, ox, oy),
                            pt(gx + 1f - inset,   gy + 1f - inset,   gz + 1f, ox, oy),
                            pt(gx + inset,        gy + 1f - inset,   gz + 1f, ox, oy),
                        )
                        commands += DrawCommand(blockLayer, dk, 5, "${id}_worn",
                            IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                            DrawPayload.ColorPath(wornPts, 0xFF_2E2E4A.toInt()))
                    }

                    // Carved rune — 1-in-6 blocks: 3 line segments on left (south) face
                    if ((tile.gridX * 7 + tile.gridY * 13 + tile.gridZ * 17) % 6 == 0) {
                        // 3 rune lines: horizontal + two diagonals
                        val r1 = pt(gx + 0.3f, gy + 1f, gz + 0.65f, ox, oy)
                        val r2 = pt(gx + 0.7f, gy + 1f, gz + 0.65f, ox, oy)
                        val r3 = pt(gx + 0.3f, gy + 1f, gz + 0.35f, ox, oy)
                        val r4 = pt(gx + 0.5f, gy + 1f, gz + 0.75f, ox, oy)
                        val r5 = pt(gx + 0.7f, gy + 1f, gz + 0.35f, ox, oy)
                        val r6 = pt(gx + 0.5f, gy + 1f, gz + 0.55f, ox, oy)
                        commands += DrawCommand(blockLayer, dk, 4, "${id}_rune1",
                            Vec2f(r1.x, r1.y), DrawPayload.Line(r1.x, r1.y, r2.x, r2.y, 0xFF_4A4A6A.toInt(), 1f))
                        commands += DrawCommand(blockLayer, dk, 4, "${id}_rune2",
                            Vec2f(r3.x, r3.y), DrawPayload.Line(r3.x, r3.y, r4.x, r4.y, 0xFF_4A4A6A.toInt(), 1f))
                        commands += DrawCommand(blockLayer, dk, 4, "${id}_rune3",
                            Vec2f(r5.x, r5.y), DrawPayload.Line(r5.x, r5.y, r6.x, r6.y, 0xFF_4A4A6A.toInt(), 1f))
                    }

                    // Lichen — 1-in-8 blocks: 2-3 blobs on top face
                    if ((tile.gridX * 11 + tile.gridY * 7 + tile.gridZ * 5) % 8 == 0) {
                        val numLichen = 2 + (tile.gridX + tile.gridY) % 2
                        for (li in 0 until numLichen) {
                            val lSeed = tile.gridX * 53 + tile.gridY * 47 + li * 31
                            val lx = gx + 0.15f + ((lSeed * 37 and 0xFF) / 255f) * 0.7f
                            val ly = gy + 0.15f + ((lSeed * 41 and 0xFF) / 255f) * 0.7f
                            val lPt = pt(lx, ly, gz + 1f, ox, oy)
                            commands += DrawCommand(blockLayer, dk, 6, "${id}_lichen_$li",
                                Vec2f(lPt.x - 2f, lPt.y - 1.5f),
                                DrawPayload.ColorOval(4f, 3f, 0xFF_2A4A2A.toInt()))
                        }
                    }
                }
                TileType.HAZARD -> {
                    val dk = IsoProjector.depthKey(world)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"
                    val screen = IsoProjector.toScreen(world) + offset
                    val pts = floorDiamond(gx, gy, gz, ox, oy)

                    // Dark red-black pit base
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id, screen,
                        DrawPayload.ColorPath(pts, 0xFF_1A0000.toInt()))
                    // Red glow rim
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_glow", screen,
                        DrawPayload.ColorPath(pts, 0x22_FF0000.toInt()))

                    // 5 metallic spikes: 1 center + 4 near corners
                    listOf(
                        Pair(gx + 0.5f, gy + 0.5f),
                        Pair(gx + 0.22f, gy + 0.3f),
                        Pair(gx + 0.78f, gy + 0.3f),
                        Pair(gx + 0.22f, gy + 0.7f),
                        Pair(gx + 0.78f, gy + 0.7f),
                    ).forEachIndexed { si, (sx, sy) ->
                        val sBase = pt(sx, sy, gz, ox, oy)
                        val sTip  = pt(sx, sy, gz + 0.4f, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 2 + si, "${id}_spike_$si",
                            Vec2f(sBase.x, sBase.y),
                            DrawPayload.ColorPath(
                                listOf(Vec2f(sBase.x - 2.5f, sBase.y), Vec2f(sBase.x + 2.5f, sBase.y), sTip),
                                0xFF_4A4A4A.toInt()))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 8 + si, "${id}_spike_tip_$si",
                            Vec2f(sTip.x - 1f, sTip.y - 1f),
                            DrawPayload.ColorOval(3f, 2f, 0xFF_888888.toInt()))
                    }
                }
                TileType.EMPTY -> return@forEach
            }
        }

        // 2. Perimeter walls
        buildWalls(room, offset, commands, tick, roomType, state.visitedRooms, palette)

        // FLOODED room: water plane over floor tiles
        if (roomType == RoomType.FLOODED) {
            for (tile in room.tiles) {
                if (tile.type != TileType.FLOOR) continue
                val gx2 = tile.gridX.toFloat()
                val gy2 = tile.gridY.toFloat()
                val gz2 = tile.gridZ.toFloat()
                val world2 = Vec3f(gx2, gy2, gz2)
                val dk2 = IsoProjector.depthKey(world2)
                val waterPts = floorDiamond(gx2, gy2, gz2, ox, oy)
                // Water plane: semi-transparent blue
                commands += DrawCommand(DrawLayer.FLOOR, dk2, 9, "water_${tile.gridX}_${tile.gridY}",
                    IsoProjector.toScreen(world2) + offset,
                    DrawPayload.ColorPath(waterPts, 0x88_002244.toInt()))
                // Ripple line — animated with tick and tile position
                val ripplePhase = (tick * 0.08 + tile.gridX * 0.5).toFloat()
                val rippleY = (kotlin.math.sin(ripplePhase.toDouble()) * 3.0).toFloat()
                val rpl1 = pt(gx2 + 0.1f, gy2 + 0.5f, gz2, ox, oy)
                val rpl2 = pt(gx2 + 0.9f, gy2 + 0.5f, gz2, ox, oy)
                commands += DrawCommand(DrawLayer.FLOOR, dk2, 10, "ripple_${tile.gridX}_${tile.gridY}",
                    Vec2f(rpl1.x, rpl1.y + rippleY),
                    DrawPayload.Line(rpl1.x, rpl1.y + rippleY, rpl2.x, rpl2.y + rippleY, 0xAA_002244.toInt(), 1f))
            }
        }

        // THRONE_ANTECHAMBER: decorative column markers + raised dais hint
        if (roomType == RoomType.THRONE_ANTECHAMBER) {
            // Two column markers either side of room center
            val midX = room.width / 2f
            val midY = room.depth / 2f
            for (side in listOf(-1f, 1f)) {
                val colX = midX + side * 2f
                val colY = midY - 1f
                for (gz2 in 0 until 3) {
                    val bz2 = gz2.toFloat()
                    val colWorld = Vec3f(colX, colY, bz2)
                    val colDk = IsoProjector.depthKey(Vec3f(colX + 0.5f, colY + 1f, bz2))
                    commands += DrawCommand(DrawLayer.BLOCK, colDk, 2, "col_${side}_top_$gz2",
                        IsoProjector.toScreen(Vec3f(colX, colY, bz2 + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(colX, colY, bz2 + 1f, ox, oy), palette.wallTop))
                    commands += DrawCommand(DrawLayer.BLOCK, colDk, 1, "col_${side}_left_$gz2",
                        IsoProjector.toScreen(Vec3f(colX, colY + 1f, bz2)) + offset,
                        DrawPayload.DitheredPath(
                            listOf(
                                pt(colX,      colY + 1f, bz2,      ox, oy),
                                pt(colX + 1f, colY + 1f, bz2,      ox, oy),
                                pt(colX + 1f, colY + 1f, bz2 + 1f, ox, oy),
                                pt(colX,      colY + 1f, bz2 + 1f, ox, oy),
                            ), palette.wallFaceD1, palette.wallFaceD2, horizontal = true))
                }
            }
            // Raised dais — center platform tiles at gz=1 (drawn as floor diamonds at height 1)
            val daisMinX = (midX - 2f).toInt()
            val daisMaxX = (midX + 2f).toInt()
            val daisMinY = (midY - 1f).toInt()
            val daisMaxY = (midY + 1f).toInt()
            for (dx in daisMinX..daisMaxX) {
                for (dy in daisMinY..daisMaxY) {
                    if (dx < 0 || dy < 0 || dx >= room.width || dy >= room.depth) continue
                    val daisWorld = Vec3f(dx.toFloat(), dy.toFloat(), 1f)
                    val daisDk = IsoProjector.depthKey(daisWorld)
                    commands += DrawCommand(DrawLayer.FLOOR, daisDk, 2, "dais_${dx}_${dy}",
                        IsoProjector.toScreen(daisWorld) + offset,
                        DrawPayload.DitheredPath(
                            floorDiamond(dx.toFloat(), dy.toFloat(), 1f, ox, oy),
                            0xFF_1E1E2E.toInt(), 0xFF_2A2A3E.toInt()))
                }
            }
        }

        // 2b. Dynamic (pushable/falling) blocks
        state.dynamicBlocks.forEach { block ->
            buildDynamicBlockCommands(block, state, offset, commands, tick)
        }

        // 3. Items
        state.itemInstances
            .filterIsInstance<ItemInstance>()
            .forEach { item ->
                val loc = item.location as? ItemLocation.InRoom ?: return@forEach
                if (loc.roomId != state.currentRoomId) return@forEach
                val world = loc.position
                val screen = IsoProjector.toScreen(world) + offset
                val dk = IsoProjector.depthKey(world)
                val pulseFactor = kotlin.math.sin(tick.toDouble() * 0.07).toFloat()
                val glowW = 28f + pulseFactor * 2f
                val glowH = 20f + pulseFactor * 2f
                // Outer glow ring
                commands += DrawCommand(DrawLayer.ITEM, dk, 0,
                    "item_${item.id.value}_glow",
                    Vec2f(screen.x - 2f, screen.y - 2f),
                    DrawPayload.ColorOval(glowW, glowH, 0x1A_FFDD44.toInt()))
                // Base oval
                commands += DrawCommand(DrawLayer.ITEM, dk, 1,
                    "item_${item.id.value}", screen,
                    DrawPayload.ColorOval(24f, 16f, Colors.ITEM))
            }

        // 4. Patrol enemies — dark green isometric block
        state.patrolEnemies.forEach { enemy ->
            buildPatrolEnemyCommands(enemy, offset, commands, ox, oy)
        }

        // 5. Actors — distinct visuals per actor type
        state.actorStates.forEach { actor ->
            buildActorCommands(actor, offset, commands, tick)
        }

        // 5b. Cauldron — rendered only in CauldronRoom, on top of center blocks
        val roomSpecial = content.rooms[state.currentRoomId]?.special
        if (roomSpecial is RoomSpecial.CauldronRoom) {
            buildCauldronCommands(state, room, offset, commands)
        }

        // 6. Player — dark plague-walker
        buildPlayerCommands(state, commands, offset)

        // 7. Ambient dust particles at inner wall corners
        buildDustParticles(room, offset, tick, commands)

        // 8. Thin edge vignette — only a narrow border, not a ceiling-inducing dark cap
        val fogC = palette.fogColor
        commands += DrawCommand(DrawLayer.HUD, 0, -998, "vignette_top",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW, viewportH * 0.08f, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -997, "vignette_bot",
            Vec2f(0f, viewportH * 0.92f), DrawPayload.ColorRect(viewportW, viewportH * 0.08f, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -996, "vignette_lft",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW * 0.06f, viewportH, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -995, "vignette_rgt",
            Vec2f(viewportW * 0.94f, 0f), DrawPayload.ColorRect(viewportW * 0.06f, viewportH, fogC))

        return DrawCommandBuilder.sort(commands)
    }

    // ── Dynamic block rendering ──────────────────────────────────────────────

    private fun buildDynamicBlockCommands(
        block: BlockState,
        state: GameState,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
    ) {
        val gx = block.gridX.toFloat()
        val gy = block.gridY.toFloat()
        val gz = block.gridZ.toFloat()
        val ox = offset.x; val oy = offset.y

        val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
        val dk = IsoProjector.depthKey(footWorld)

        val playerPos = state.player.position
        val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, 0f))
        val blockLayer = if (dk > playerDk) DrawLayer.FOREGROUND else DrawLayer.BLOCK
        val id = "dblock_${block.id}"

        // Top face — slightly lighter than static blocks to distinguish
        commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
            IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
            DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), 0xFF_4A4A6E.toInt(), 0xFF_0A0A14.toInt()))
        // Left face
        commands += DrawCommand(blockLayer, dk, 1, "${id}_left",
            IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
            DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), 0xFF_2A2A4A.toInt(), 0xFF_0A0A14.toInt()))
        // Right face
        commands += DrawCommand(blockLayer, dk, 0, "${id}_right",
            IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
            DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), 0xFF_1E1E3A.toInt(), 0xFF_0A0A14.toInt()))

        // Pushable: arrow glyph on left (south) face pointing in push direction
        if (block.pushable && block.velocityZ == 0f) {
            val arrowMid = pt(gx + 0.5f, gy + 1f, gz + 0.5f, ox, oy)
            val arrowTip = pt(gx + 0.5f, gy + 1f, gz + 0.65f, ox, oy)
            val arrowL   = pt(gx + 0.3f, gy + 1f, gz + 0.45f, ox, oy)
            val arrowR   = pt(gx + 0.7f, gy + 1f, gz + 0.45f, ox, oy)
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_shaft",
                Vec2f(arrowMid.x, arrowMid.y),
                DrawPayload.Line(arrowMid.x, arrowMid.y + 4f, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_l",
                Vec2f(arrowL.x, arrowL.y),
                DrawPayload.Line(arrowL.x, arrowL.y, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_r",
                Vec2f(arrowR.x, arrowR.y),
                DrawPayload.Line(arrowR.x, arrowR.y, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
        }

        // Falling warning: crack lines + orange pulse when fallingTicks > 60
        if (block.fallingTicks > 60 || block.velocityZ < 0f) {
            val pulseFactor = kotlin.math.sin(tick.toDouble() * 0.3).toFloat()
            val pulseAlpha = ((0.4f + pulseFactor * 0.3f) * 255).toInt().coerceIn(0, 255)
            val pulseColor = (pulseAlpha shl 24) or 0x00_FF6600

            // Orange glow on top face
            commands += DrawCommand(blockLayer, dk, 4, "${id}_fall_glow",
                IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), pulseColor))

            // 2 crack lines on top face
            val c1a = pt(gx + 0.3f, gy + 0.2f, gz + 1f, ox, oy)
            val c1b = pt(gx + 0.6f, gy + 0.8f, gz + 1f, ox, oy)
            val c2a = pt(gx + 0.7f, gy + 0.3f, gz + 1f, ox, oy)
            val c2b = pt(gx + 0.4f, gy + 0.7f, gz + 1f, ox, oy)
            commands += DrawCommand(blockLayer, dk, 5, "${id}_crack1",
                Vec2f(c1a.x, c1a.y),
                DrawPayload.Line(c1a.x, c1a.y, c1b.x, c1b.y, 0xFF_FF6600.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 5, "${id}_crack2",
                Vec2f(c2a.x, c2a.y),
                DrawPayload.Line(c2a.x, c2a.y, c2b.x, c2b.y, 0xFF_FF8800.toInt(), 1f))
        }
    }

    // ── Wall building ────────────────────────────────────────────────────────

    private fun buildWalls(
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
        roomType: RoomType,
        visitedRooms: Set<RoomId>,
        palette: ThemePalette,
    ) {
        val w = room.width
        val d = room.depth
        val ox = offset.x; val oy = offset.y
        val wTop = palette.wallTop
        val wFD1 = palette.wallFaceD1; val wFD2 = palette.wallFaceD2
        val wFR1 = palette.wallFaceR1; val wFR2 = palette.wallFaceR2

        val northGaps = mutableSetOf<Int>()
        val westGaps  = mutableSetOf<Int>()

        for (exit in room.exits) {
            when (exit.side) {
                ExitSide.NORTH -> { northGaps += w / 2 - 1; northGaps += w / 2 }
                ExitSide.WEST  -> { westGaps  += d / 2 - 1; westGaps  += d / 2 }
                else -> { /* south/east walls not rendered in this perspective */ }
            }
        }

        // North wall block: visible faces = top + south-facing inner face (blockFaceLeft)
        fun wallBlockNorth(gx: Float, gy: Float) {
            for (gz in 0 until 2) {
                val bz = gz.toFloat()
                val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
                val dk = IsoProjector.depthKey(footWorld)
                val id = "wall_${gx.toInt()}_${gy.toInt()}_$gz"
                val isTop = gz == 2

                // Top face
                commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), wTop))
                // South-facing inner face (blockFaceLeft = y+1 face) — horizontal dither rows
                commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                    IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                    DrawPayload.DitheredPath(blockFaceLeft(gx, gy, bz, ox, oy), wFD1, wFD2, horizontal = true))

                // Mortar line on the visible (left/south) face
                val ml1 = pt(gx, gy + 1f, bz + 0.5f, ox, oy)
                val ml2 = pt(gx + 1f, gy + 1f, bz + 0.5f, ox, oy)
                commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_mortar_l",
                    Vec2f(ml1.x, ml1.y),
                    DrawPayload.Line(ml1.x, ml1.y, ml2.x, ml2.y, Colors.WALL_MORTAR, 1f))

                // Top-edge light highlight on topmost block
                if (isTop) {
                    val h1 = pt(gx, gy, bz + 1f, ox, oy)
                    val h2 = pt(gx, gy + 1f, bz + 1f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_highlight",
                        Vec2f(h1.x, h1.y),
                        DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, Colors.WALL_HIGHLIGHT, 1f))
                }

                // CAVERN: stalactite hint — narrow triangles hanging from wall top
                if (roomType == RoomType.CAVERN && (gx.toInt() * 7 + 3) % 5 == 0) {
                    for (sz in 0 until 3) {
                        val stalkX = gx + 0.2f + sz * 0.25f
                        val stalkTop = pt(stalkX, gy, 3.0f, ox, oy)
                        val stalkTip = pt(stalkX, gy, 2.2f - sz * 0.15f, ox, oy)
                        commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_stalk_$sz",
                            Vec2f(stalkTop.x, stalkTop.y),
                            DrawPayload.ColorPath(listOf(
                                Vec2f(stalkTop.x - 2f, stalkTop.y),
                                Vec2f(stalkTop.x + 2f, stalkTop.y),
                                Vec2f(stalkTip.x, stalkTip.y),
                            ), 0xFF_2A2A3A.toInt()))
                    }
                }

                // Moss patch (~1 in 7 wall columns, only on lower block)
                if (!isTop && (gx.toInt() * 5 + gy.toInt() * 9) % 7 == 0) {
                    val moss = pt(gx + 0.35f, gy + 1f, bz + 0.3f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_moss",
                        Vec2f(moss.x - 4f, moss.y - 3f),
                        DrawPayload.ColorOval(9f, 6f, Colors.WALL_MOSS))
                }

                // Chains — 1-in-8 wall columns
                if ((gx.toInt() * 13 + gy.toInt() * 7) % 8 == 0 && isTop) {
                    // Chain: two line segments hanging from gz=2.8 down ~20px on screen
                    val chainTop = pt(gx + 0.5f, gy + 1f, 2.8f, ox, oy)
                    val chainMid = pt(gx + 0.5f, gy + 1f, 2.0f, ox, oy)
                    val chainBot = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain1",
                        Vec2f(chainTop.x, chainTop.y),
                        DrawPayload.Line(chainTop.x, chainTop.y, chainMid.x, chainMid.y, 0xFF_3A3A4A.toInt(), 1f))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain2",
                        Vec2f(chainMid.x, chainMid.y),
                        DrawPayload.Line(chainMid.x, chainMid.y, chainBot.x, chainBot.y, 0xFF_3A3A4A.toInt(), 1f))
                    val linkPt = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain_link",
                        Vec2f(linkPt.x - 3f, linkPt.y - 2f),
                        DrawPayload.ColorOval(6f, 4f, 0xFF_3A3A4A.toInt()))
                }

                // Cracks — 1-in-6 wall columns: irregular polygon crack on south face
                if ((gx.toInt() * 11 + gy.toInt() * 3) % 6 == 0 && gz == 1) {
                    val crk = listOf(
                        pt(gx + 0.35f, gy + 1f, bz + 0.2f, ox, oy),
                        pt(gx + 0.42f, gy + 1f, bz + 0.5f, ox, oy),
                        pt(gx + 0.38f, gy + 1f, bz + 0.8f, ox, oy),
                        pt(gx + 0.40f, gy + 1f, bz + 0.9f, ox, oy),
                        pt(gx + 0.37f, gy + 1f, bz + 0.5f, ox, oy),
                        pt(gx + 0.33f, gy + 1f, bz + 0.2f, ox, oy),
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_crack",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                        DrawPayload.ColorPath(crk, 0xFF_0A0808.toInt()))
                }

                // Water seep — 1-in-10 wall columns
                if ((gx.toInt() * 7 + gy.toInt() * 19) % 10 == 0 && gz == 1) {
                    val seepTop = pt(gx + 0.6f, gy + 1f, 1.5f, ox, oy)
                    val seepBot = pt(gx + 0.6f, gy + 1f, 0f,   ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_seep",
                        Vec2f(seepTop.x, seepTop.y),
                        DrawPayload.Line(seepTop.x, seepTop.y, seepBot.x, seepBot.y, 0xFF_1A2A2A.toInt(), 1f))
                    val puddle = pt(gx + 0.6f, gy + 1f, 0.05f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_puddle",
                        Vec2f(puddle.x - 4f, puddle.y - 2f),
                        DrawPayload.ColorOval(8f, 4f, 0xFF_1A3A2A.toInt()))
                }

                // Torch sconce — every 4th north wall column, only on gz=0 (ground level to gz=1.5)
                if (gx.toInt() % 4 == 2 && gz == 0) {
                    val sconceSeed = gx.toInt() * 7 + gy.toInt() * 13
                    val flicker = (kotlin.math.sin(tick.toDouble() * 0.3 + sconceSeed).toFloat() * 1.5f)
                    val glowAlpha = 0x11 + ((kotlin.math.sin(tick.toDouble() * 0.3 + sconceSeed + 1.0) * 0.5 + 0.5) * 0x11).toInt()

                    // Bracket line
                    val bracketFrom = pt(gx + 0.5f, gy + 1f, 1.5f, ox, oy)
                    val bracketTo   = pt(gx + 0.5f, gy + 0.85f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_bracket",
                        Vec2f(bracketFrom.x, bracketFrom.y),
                        DrawPayload.Line(bracketFrom.x, bracketFrom.y, bracketTo.x, bracketTo.y, 0xFF_5A4020.toInt(), 1.5f))

                    // Flame oval — flicker on Y
                    val flamePt = pt(gx + 0.5f, gy + 0.85f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 7, "${id}_flame",
                        Vec2f(flamePt.x - 3f, flamePt.y - 8f + flicker),
                        DrawPayload.ColorOval(6f, 8f, 0xCC_FF8800.toInt()))
                    // Glow halo
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_glow_halo",
                        Vec2f(flamePt.x - 9f, flamePt.y - 7f + flicker),
                        DrawPayload.ColorOval(18f, 14f, (glowAlpha shl 24) or 0xFF6600))

                    // Torch light cast on floor — warm tint on nearby floor tiles
                    val tileX0 = (gx - 1f).coerceAtLeast(0f)
                    val tileX1 = (gx + 2f).coerceAtMost(room.width.toFloat())
                    var lightGx = tileX0
                    while (lightGx < tileX1) {
                        val lightWorld = Vec3f(lightGx, gy + 0.5f, 0f)
                        val lightDk = IsoProjector.depthKey(lightWorld)
                        commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "torch_light_${gx.toInt()}_${lightGx.toInt()}",
                            IsoProjector.toScreen(lightWorld) + offset,
                            DrawPayload.ColorPath(
                                floorDiamond(lightGx, gy, 0f, ox, oy),
                                0x08_FF6600.toInt()
                            ))
                        lightGx += 1f
                    }
                }
            }
        }

        // West wall block: visible faces = top + east-facing inner face (blockFaceRight)
        fun wallBlockWest(gx: Float, gy: Float) {
            for (gz in 0 until 2) {
                val bz = gz.toFloat()
                val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
                val dk = IsoProjector.depthKey(footWorld)
                val id = "wall_${gx.toInt()}_${gy.toInt()}_$gz"
                val isTop = gz == 2

                // Top face
                commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), wTop))
                // East-facing inner face (blockFaceRight = x+1 face) — horizontal dither rows
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                    IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                    DrawPayload.DitheredPath(blockFaceRight(gx, gy, bz, ox, oy), wFR1, wFR2, horizontal = true))

                // Mortar line on the visible (right/east) face
                val mr1 = pt(gx + 1f, gy, bz + 0.5f, ox, oy)
                val mr2 = pt(gx + 1f, gy + 1f, bz + 0.5f, ox, oy)
                commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_mortar_r",
                    Vec2f(mr1.x, mr1.y),
                    DrawPayload.Line(mr1.x, mr1.y, mr2.x, mr2.y, Colors.WALL_MORTAR, 1f))

                // Top-edge light highlight on topmost block
                if (isTop) {
                    val h1 = pt(gx, gy, bz + 1f, ox, oy)
                    val h2 = pt(gx, gy + 1f, bz + 1f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_highlight",
                        Vec2f(h1.x, h1.y),
                        DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, Colors.WALL_HIGHLIGHT, 1f))
                }

                // Moss patch (~1 in 7 wall columns, only on lower block)
                if (!isTop && (gx.toInt() * 5 + gy.toInt() * 9) % 7 == 0) {
                    val moss = pt(gx + 0.35f, gy + 1f, bz + 0.3f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_moss",
                        Vec2f(moss.x - 4f, moss.y - 3f),
                        DrawPayload.ColorOval(9f, 6f, Colors.WALL_MOSS))
                }

                // Chains — 1-in-8 wall columns
                if ((gx.toInt() * 13 + gy.toInt() * 7) % 8 == 0 && isTop) {
                    val chainTop = pt(gx + 0.5f, gy + 1f, 2.8f, ox, oy)
                    val chainMid = pt(gx + 0.5f, gy + 1f, 2.0f, ox, oy)
                    val chainBot = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain1",
                        Vec2f(chainTop.x, chainTop.y),
                        DrawPayload.Line(chainTop.x, chainTop.y, chainMid.x, chainMid.y, 0xFF_3A3A4A.toInt(), 1f))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain2",
                        Vec2f(chainMid.x, chainMid.y),
                        DrawPayload.Line(chainMid.x, chainMid.y, chainBot.x, chainBot.y, 0xFF_3A3A4A.toInt(), 1f))
                    val linkPt = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain_link",
                        Vec2f(linkPt.x - 3f, linkPt.y - 2f),
                        DrawPayload.ColorOval(6f, 4f, 0xFF_3A3A4A.toInt()))
                }

                // Cracks — 1-in-6 wall columns: irregular polygon crack on east face
                if ((gx.toInt() * 11 + gy.toInt() * 3) % 6 == 0 && gz == 1) {
                    val crk = listOf(
                        pt(gx + 1f, gy + 0.35f, bz + 0.2f, ox, oy),
                        pt(gx + 1f, gy + 0.42f, bz + 0.5f, ox, oy),
                        pt(gx + 1f, gy + 0.38f, bz + 0.8f, ox, oy),
                        pt(gx + 1f, gy + 0.40f, bz + 0.9f, ox, oy),
                        pt(gx + 1f, gy + 0.37f, bz + 0.5f, ox, oy),
                        pt(gx + 1f, gy + 0.33f, bz + 0.2f, ox, oy),
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_crack",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                        DrawPayload.ColorPath(crk, 0xFF_0A0808.toInt()))
                }

                // Water seep — 1-in-10 wall columns
                if ((gx.toInt() * 7 + gy.toInt() * 19) % 10 == 0 && gz == 1) {
                    val seepTop = pt(gx + 1f, gy + 0.6f, 1.5f, ox, oy)
                    val seepBot = pt(gx + 1f, gy + 0.6f, 0f,   ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_seep",
                        Vec2f(seepTop.x, seepTop.y),
                        DrawPayload.Line(seepTop.x, seepTop.y, seepBot.x, seepBot.y, 0xFF_1A2A2A.toInt(), 1f))
                    val puddle = pt(gx + 1f, gy + 0.6f, 0.05f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_puddle",
                        Vec2f(puddle.x - 4f, puddle.y - 2f),
                        DrawPayload.ColorOval(8f, 4f, 0xFF_1A3A2A.toInt()))
                }

                // Torch sconce — every 4th west wall column, only on gz=0
                if (gy.toInt() % 4 == 2 && gz == 0) {
                    val sconceSeed = gx.toInt() * 7 + gy.toInt() * 13
                    val flicker = (kotlin.math.sin(tick.toDouble() * 0.3 + sconceSeed).toFloat() * 1.5f)
                    val glowAlpha = 0x11 + ((kotlin.math.sin(tick.toDouble() * 0.3 + sconceSeed + 1.0) * 0.5 + 0.5) * 0x11).toInt()

                    // Bracket line — west wall uses right face (x+1)
                    val bracketFrom = pt(gx + 1f, gy + 0.5f, 1.5f, ox, oy)
                    val bracketTo   = pt(gx + 0.85f, gy + 0.5f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_bracket",
                        Vec2f(bracketFrom.x, bracketFrom.y),
                        DrawPayload.Line(bracketFrom.x, bracketFrom.y, bracketTo.x, bracketTo.y, 0xFF_5A4020.toInt(), 1.5f))

                    // Flame oval — flicker on Y
                    val flamePt = pt(gx + 0.85f, gy + 0.5f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 7, "${id}_flame",
                        Vec2f(flamePt.x - 3f, flamePt.y - 8f + flicker),
                        DrawPayload.ColorOval(6f, 8f, 0xCC_FF8800.toInt()))
                    // Glow halo
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_glow_halo",
                        Vec2f(flamePt.x - 9f, flamePt.y - 7f + flicker),
                        DrawPayload.ColorOval(18f, 14f, (glowAlpha shl 24) or 0xFF6600))

                    // Torch light cast on floor — warm tint on nearby floor tiles
                    val tileY0 = (gy - 1f).coerceAtLeast(0f)
                    val tileY1 = (gy + 2f).coerceAtMost(room.depth.toFloat())
                    var lightGy = tileY0
                    while (lightGy < tileY1) {
                        val lightWorld = Vec3f(gx + 0.5f, lightGy, 0f)
                        val lightDk = IsoProjector.depthKey(lightWorld)
                        commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "torch_light_${gy.toInt()}_${lightGy.toInt()}",
                            IsoProjector.toScreen(lightWorld) + offset,
                            DrawPayload.ColorPath(
                                floorDiamond(gx, lightGy, 0f, ox, oy),
                                0x08_FF6600.toInt()
                            ))
                        lightGy += 1f
                    }
                }
            }
        }

        fun doorArchway(gx: Float, gy: Float, isFirst: Boolean, isLast: Boolean, targetRoomId: RoomId? = null) {
            val footWorld = Vec3f(gx + 0.5f, gy + 1f, 0f)
            val dk = IsoProjector.depthKey(footWorld)
            val id = "door_${gx.toInt()}_${gy.toInt()}"

            // 1. Floor diamond at z=0
            commands += DrawCommand(DrawLayer.FLOOR, dk, 0, "${id}_floor",
                IsoProjector.toScreen(Vec3f(gx, gy, 0f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 0f, ox, oy), Colors.FLOOR_TOP))

            val openLeft  = if (isFirst) gx + 0.3f else gx
            val openRight = if (isLast)  gx + 0.7f else gx + 1f

            // 2. Dark void on y-face (gy+1 face): fill opening from z=0 to z=3
            val voidYPts = listOf(
                pt(openLeft,  gy + 1f, 0f, ox, oy),
                pt(openRight, gy + 1f, 0f, ox, oy),
                pt(openRight, gy + 1f, 3f, ox, oy),
                pt(openLeft,  gy + 1f, 3f, ox, oy),
            )
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_void_y",
                IsoProjector.toScreen(Vec3f(openLeft, gy + 1f, 0f)) + offset,
                DrawPayload.ColorPath(voidYPts, 0xFF_0A0A0F.toInt()))

            // 3. Dark void on x-face (gx..gx+1 at gy): fill opening from z=0 to z=3
            val voidXPts = listOf(
                pt(gx + 1f, gy,      0f, ox, oy),
                pt(gx + 1f, gy + 1f, 0f, ox, oy),
                pt(gx + 1f, gy + 1f, 3f, ox, oy),
                pt(gx + 1f, gy,      3f, ox, oy),
            )
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_void_x",
                IsoProjector.toScreen(Vec3f(gx + 1f, gy, 0f)) + offset,
                DrawPayload.ColorPath(voidXPts, 0xFF_0A0A0F.toInt()))

            // 4. If isFirst: draw left pillar [gx, gx+0.3] height z=0..3
            if (isFirst) {
                for (gz in 0 until 3) {
                    val bz = gz.toFloat()
                    val pid = "${id}_pillar_l_$gz"
                    val pdk = IsoProjector.depthKey(Vec3f(gx + 0.15f, gy + 1f, bz))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 2, "${pid}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx,        gy,      bz + 1f, ox, oy),
                            pt(gx + 0.3f, gy,      bz + 1f, ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx,        gy + 1f, bz + 1f, ox, oy),
                        ), wTop))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 1, "${pid}_left",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx,        gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx,        gy + 1f, bz + 1f, ox, oy),
                        ), wFD1, wFD2, horizontal = true))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 0, "${pid}_right",
                        IsoProjector.toScreen(Vec3f(gx + 0.3f, gy, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx + 0.3f, gy,      bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.3f, gy,      bz + 1f, ox, oy),
                        ), wFR1, wFR2, horizontal = true))
                }
            }

            // 5. If isLast: draw right pillar [gx+0.7, gx+1] height z=0..3
            if (isLast) {
                for (gz in 0 until 3) {
                    val bz = gz.toFloat()
                    val pid = "${id}_pillar_r_$gz"
                    val pdk = IsoProjector.depthKey(Vec3f(gx + 0.85f, gy + 1f, bz))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 2, "${pid}_top",
                        IsoProjector.toScreen(Vec3f(gx + 0.7f, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx + 0.7f, gy,      bz + 1f, ox, oy),
                            pt(gx + 1f,   gy,      bz + 1f, ox, oy),
                            pt(gx + 1f,   gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.7f, gy + 1f, bz + 1f, ox, oy),
                        ), wTop))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 1, "${pid}_left",
                        IsoProjector.toScreen(Vec3f(gx + 0.7f, gy + 1f, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx + 0.7f, gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.7f, gy + 1f, bz + 1f, ox, oy),
                        ), wFD1, wFD2, horizontal = true))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 0, "${pid}_right",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx + 1f, gy,      bz,      ox, oy),
                            pt(gx + 1f, gy + 1f, bz,      ox, oy),
                            pt(gx + 1f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 1f, gy,      bz + 1f, ox, oy),
                        ), wFR1, wFR2, horizontal = true))
                }

                // 6. If isLast: threshold glow line at z=0 across gap width
                val g1 = pt(openLeft,  gy + 1f, 0f, ox, oy)
                val g2 = pt(openRight, gy + 1f, 0f, ox, oy)
                val glowColor = (0x66_3A3A60.toInt())
                commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_glow_line",
                    Vec2f(g1.x, g1.y),
                    DrawPayload.Line(g1.x, g1.y, g2.x, g2.y, glowColor, 1f))
            }

            // Unexplored marker for NORTH/WEST exits — pulsing 3-dot indicator
            if (isLast && targetRoomId != null && targetRoomId !in visitedRooms) {
                val markerAlpha = (0x44 + (kotlin.math.sin(tick.toDouble() * 0.1) * 0x44).toInt()).coerceIn(0x20, 0x88)
                val markerPt = pt(gx + 0.5f, gy + 1f, 1.5f, ox, oy)
                val markerColor = (markerAlpha shl 24) or 0x6A6A8A
                for (di in 0..2) {
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 12 + di, "${id}_marker_$di",
                        Vec2f(markerPt.x - 1f, markerPt.y - 6f + di * 4f),
                        DrawPayload.ColorOval(3f, 3f, markerColor))
                }
            }
        }

        val northExitTarget = room.exits.find { it.side == ExitSide.NORTH }?.targetRoomId
        val westExitTarget  = room.exits.find { it.side == ExitSide.WEST }?.targetRoomId

        // North wall (gy=0): draw only south-facing inner face + top
        for (x in 0 until w) {
            if (x in northGaps) doorArchway(x.toFloat(), 0f,
                northGaps.minOrNull() == x,
                northGaps.maxOrNull() == x,
                northExitTarget)
            else wallBlockNorth(x.toFloat(), 0f)
        }
        // West wall (gx=0): draw only east-facing inner face + top
        for (y in 1 until d - 1) {
            if (y in westGaps) doorArchway(0f, y.toFloat(),
                westGaps.minOrNull() == y,
                westGaps.maxOrNull() == y,
                westExitTarget)
            else wallBlockWest(0f, y.toFloat())
        }

        // Exit markers for all four sides — independent of which walls are drawn.
        // NORTH/WEST exits already get full doorArchway treatment above.
        // SOUTH/EAST exits have no wall, so draw a simpler threshold marker.
        fun drawExitMarker(gx: Float, gy: Float, side: ExitSide, withPillars: Boolean, targetRoomId: RoomId? = null) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "exit_marker_${gx.toInt()}_${gy.toInt()}"

            // Threshold floor tile — distinctly lighter to draw the eye toward exit
            commands += DrawCommand(DrawLayer.FLOOR, dk, 10, "${id}_floor",
                IsoProjector.toScreen(Vec3f(gx, gy, 0f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 0f, ox, oy), 0xFF_4A4A6A.toInt()))
            // Second floor highlight (inset diamond)
            val inFloor = listOf(
                pt(gx + 0.1f, gy + 0.1f, 0f, ox, oy),
                pt(gx + 0.9f, gy + 0.1f, 0f, ox, oy),
                pt(gx + 0.9f, gy + 0.9f, 0f, ox, oy),
                pt(gx + 0.1f, gy + 0.9f, 0f, ox, oy),
            )
            commands += DrawCommand(DrawLayer.FLOOR, dk, 11, "${id}_floor_hi",
                IsoProjector.toScreen(Vec3f(gx, gy, 0f)) + offset,
                DrawPayload.ColorPath(inFloor, 0xFF_5A5A7E.toInt()))

            // Void face above threshold (slightly visible dark, not pure black)
            val voidPts = when (side) {
                ExitSide.SOUTH, ExitSide.NORTH -> listOf(
                    pt(gx,      gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 2f, ox, oy),
                    pt(gx,      gy + 1f, 2f, ox, oy),
                )
                ExitSide.EAST, ExitSide.WEST -> listOf(
                    pt(gx + 1f, gy,      0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 2f, ox, oy),
                    pt(gx + 1f, gy,      2f, ox, oy),
                )
            }
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_void",
                IsoProjector.toScreen(Vec3f(gx, gy + 1f, 0f)) + offset,
                DrawPayload.ColorPath(voidPts, 0xFF_0C0C18.toInt()))

            // Visible glow line at floor level — blue/purple portal shimmer
            val (gp1, gp2) = when (side) {
                ExitSide.SOUTH, ExitSide.NORTH -> Pair(
                    pt(gx,      gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 0f, ox, oy),
                )
                ExitSide.EAST, ExitSide.WEST -> Pair(
                    pt(gx + 1f, gy,      0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 0f, ox, oy),
                )
            }
            commands += DrawCommand(DrawLayer.FLOOR, dk, 12, "${id}_glow",
                Vec2f(gp1.x, gp1.y),
                DrawPayload.Line(gp1.x, gp1.y, gp2.x, gp2.y, 0xBB_6666CC.toInt(), 3f))

            // Thin stone pillars for walled exits (North/West) — not needed for South/East
            if (withPillars) {
                for (gz in 0 until 3) {
                    val bz = gz.toFloat()
                    val pdk = IsoProjector.depthKey(Vec3f(gx + 0.15f, gy + 1f, bz))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 2, "${id}_pillar_l_top_$gz",
                        IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx,        gy,      bz + 1f, ox, oy),
                            pt(gx + 0.2f, gy,      bz + 1f, ox, oy),
                            pt(gx + 0.2f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx,        gy + 1f, bz + 1f, ox, oy),
                        ), wTop))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 1, "${id}_pillar_l_face_$gz",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx,        gy + 1f, bz,      ox, oy),
                            pt(gx + 0.2f, gy + 1f, bz,      ox, oy),
                            pt(gx + 0.2f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx,        gy + 1f, bz + 1f, ox, oy),
                        ), wFD1, wFD2, horizontal = true))
                    val pdk2 = IsoProjector.depthKey(Vec3f(gx + 0.9f, gy + 1f, bz))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk2, 2, "${id}_pillar_r_top_$gz",
                        IsoProjector.toScreen(Vec3f(gx + 0.8f, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx + 0.8f, gy,      bz + 1f, ox, oy),
                            pt(gx + 1f,   gy,      bz + 1f, ox, oy),
                            pt(gx + 1f,   gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.8f, gy + 1f, bz + 1f, ox, oy),
                        ), wTop))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk2, 1, "${id}_pillar_r_face_$gz",
                        IsoProjector.toScreen(Vec3f(gx + 0.8f, gy + 1f, bz)) + offset,
                        DrawPayload.DitheredPath(listOf(
                            pt(gx + 0.8f, gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.8f, gy + 1f, bz + 1f, ox, oy),
                        ), wFD1, wFD2, horizontal = true))
                }
            }

            // Unexplored marker: pulsing 3-dot indicator near archway
            if (targetRoomId != null && targetRoomId !in visitedRooms) {
                val markerAlpha = (0x44 + (kotlin.math.sin(tick.toDouble() * 0.1) * 0x44).toInt()).coerceIn(0x20, 0x88)
                val markerPt = when (side) {
                    ExitSide.SOUTH, ExitSide.NORTH -> pt(gx + 0.5f, gy + 1f, 1.5f, ox, oy)
                    ExitSide.EAST, ExitSide.WEST   -> pt(gx + 1f,   gy + 0.5f, 1.5f, ox, oy)
                }
                val markerColor = (markerAlpha shl 24) or 0x6A6A8A
                for (di in 0..2) {
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 12 + di, "${id}_marker_$di",
                        Vec2f(markerPt.x - 1f, markerPt.y - 6f + di * 4f),
                        DrawPayload.ColorOval(3f, 3f, markerColor))
                }
            }
        }

        // Draw exit markers for SOUTH and EAST exits — arch pillars on both sides
        for (exit in room.exits) {
            when (exit.side) {
                ExitSide.SOUTH -> {
                    val gx = (w / 2 - 1).toFloat()
                    val gy = (d - 1).toFloat()
                    drawExitMarker(gx, gy, ExitSide.SOUTH, withPillars = true, exit.targetRoomId)
                    drawExitMarker(gx + 1f, gy, ExitSide.SOUTH, withPillars = true, exit.targetRoomId)
                }
                ExitSide.EAST -> {
                    val gx = (w - 1).toFloat()
                    val gy = (d / 2 - 1).toFloat()
                    drawExitMarker(gx, gy, ExitSide.EAST, withPillars = true, exit.targetRoomId)
                    drawExitMarker(gx, gy + 1f, ExitSide.EAST, withPillars = true, exit.targetRoomId)
                }
                ExitSide.NORTH, ExitSide.WEST -> { /* handled by doorArchway above */ }
            }
        }
    }

    // ── Cauldron ─────────────────────────────────────────────────────────────

    private fun buildCauldronCommands(
        state: GameState,
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
    ) {
        val ox = offset.x; val oy = offset.y
        val tick = state.time.tick
        val cauldronWorld = Vec3f(3.5f, 3.5f, 1f)
        val dk = IsoProjector.depthKey(cauldronWorld)
        val screen = IsoProjector.toScreen(cauldronWorld) + offset

        // Dark base pot: 3-face isometric block at (3.2, 3.2, 1f), size 0.6×0.6×0.7
        val potColor = 0xFF_1A1A2A.toInt()
        val pgx = 3.2f; val pgy = 3.2f; val pgz = 1f
        val pgxEnd = 3.8f; val pgyEnd = 3.8f; val pgzEnd = 1.7f
        commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "cauldron_top",
            IsoProjector.toScreen(Vec3f(pgx, pgy, pgzEnd)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgx,    pgy,    pgzEnd, ox, oy),
                pt(pgxEnd, pgy,    pgzEnd, ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgx,    pgyEnd, pgzEnd, ox, oy),
            ), potColor))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "cauldron_left",
            IsoProjector.toScreen(Vec3f(pgx, pgyEnd, pgz)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgx,    pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgx,    pgyEnd, pgzEnd, ox, oy),
            ), 0xFF_121220.toInt()))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "cauldron_right",
            IsoProjector.toScreen(Vec3f(pgxEnd, pgy, pgz)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgxEnd, pgy,    pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgxEnd, pgy,    pgzEnd, ox, oy),
            ), 0xFF_0E0E1A.toInt()))

        // Cauldron rim: diamond path at z=1.7f
        val rimPts = listOf(
            pt(pgx,    pgy,    pgzEnd, ox, oy),
            pt(pgxEnd, pgy,    pgzEnd, ox, oy),
            pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
            pt(pgx,    pgyEnd, pgzEnd, ox, oy),
        )
        commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "cauldron_rim",
            IsoProjector.toScreen(Vec3f(pgx, pgy, pgzEnd)) + offset,
            DrawPayload.ColorPath(rimPts, 0xFF_2A2A3A.toInt()))

        // Glowing liquid: oval at center screen position, alpha pulses between 0xCC..0xFF
        val liquidPhase = (tick % 60).toInt()
        val liquidAlpha = (0xCC + (liquidPhase * (0xFF - 0xCC)) / 60).coerceIn(0xCC, 0xFF)
        val liquidColor = (liquidAlpha shl 24) or (Colors.LIFE_GREEN and 0x00FFFFFF)
        commands += DrawCommand(DrawLayer.EFFECT, dk, 4, "cauldron_liquid",
            Vec2f(screen.x - 12f, screen.y - 6f),
            DrawPayload.ColorOval(24f, 12f, liquidColor))

        // Faint green glow halo at floor level
        val haloScreen = IsoProjector.toScreen(Vec3f(3.5f, 3.5f, 1f)) + offset
        commands += DrawCommand(DrawLayer.FLOOR, IsoProjector.depthKey(Vec3f(3.5f, 3.5f, 1f)), 5, "cauldron_halo",
            Vec2f(haloScreen.x - 24f, haloScreen.y - 12f),
            DrawPayload.ColorOval(48f, 24f, 0x22_00FF44.toInt()))

        // 3 bubble particles with staggered rising phases
        for (bi in 0..2) {
            val bubblePhase = ((tick + bi * 20L) % 60).toInt()
            val bubbleT = bubblePhase / 60f
            val bx = screen.x + (-4f + bi * 4f)
            val by = screen.y - 4f - bubbleT * 12f
            val bubbleAlpha = ((1f - bubbleT) * 160f).toInt().coerceIn(0, 160)
            if (bubbleAlpha < 20) continue
            val bubbleColor = (bubbleAlpha shl 24) or 0x44FF88
            commands += DrawCommand(DrawLayer.EFFECT, dk, 5 + bi, "cauldron_bubble_$bi",
                Vec2f(bx - 2f, by - 2f),
                DrawPayload.ColorOval(4f, 4f, bubbleColor))
        }
    }

    // ── Patrol enemies ───────────────────────────────────────────────────────

    private fun buildPatrolEnemyCommands(
        enemy: PatrolEnemy,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        ox: Float,
        oy: Float,
    ) {
        val footWorld = Vec3f(enemy.position.x, enemy.position.y, 0f)
        val screen = IsoProjector.toScreen(footWorld) + offset
        val dk = IsoProjector.depthKey(footWorld)
        val id = "patrol_${enemy.id}"
        val cx = screen.x
        val cy = screen.y

        // Shadow
        commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
            Vec2f(cx - 10f, cy - 3f), DrawPayload.ColorOval(20f, 6f, 0x50_000000.toInt()))

        // Body — squat green oval
        commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
            Vec2f(cx - 8f, cy - 20f), DrawPayload.ColorOval(16f, 20f, 0xFF_228822.toInt()))

        // Left ear — upward triangle
        commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_ear_l",
            Vec2f(cx - 9f, cy - 28f),
            DrawPayload.ColorPath(listOf(
                Vec2f(cx - 9f, cy - 20f),
                Vec2f(cx - 5f, cy - 20f),
                Vec2f(cx - 8f, cy - 29f),
            ), 0xFF_228822.toInt()))

        // Right ear — upward triangle
        commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_ear_r",
            Vec2f(cx + 5f, cy - 28f),
            DrawPayload.ColorPath(listOf(
                Vec2f(cx + 5f, cy - 20f),
                Vec2f(cx + 9f, cy - 20f),
                Vec2f(cx + 8f, cy - 29f),
            ), 0xFF_228822.toInt()))

        // Left eye
        commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_l",
            Vec2f(cx - 5f, cy - 17f), DrawPayload.ColorOval(3f, 3f, 0xFF_FFAA44.toInt()))

        // Right eye
        commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_r",
            Vec2f(cx + 2f, cy - 17f), DrawPayload.ColorOval(3f, 3f, 0xFF_FFAA44.toInt()))
    }

    // ── Actors ───────────────────────────────────────────────────────────────

    private fun buildActorCommands(
        actor: ActorState,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
    ) {
        val screen = IsoProjector.toScreen(actor.position) + offset
        val dk = IsoProjector.depthKey(actor.position)
        val cx = screen.x
        val cy = screen.y
        val id = "actor_${actor.id.value}"

        when (actor.type) {
            ActorType.GUARD -> {
                val guardBob = (kotlin.math.sin(tick.toDouble() * 0.15) * 2.0).toFloat()

                // Shadow
                commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
                    Vec2f(cx - 10f, cy - 3f), DrawPayload.ColorOval(20f, 6f, 0x50_000000.toInt()))

                // Body
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 6f, cy - 28f + guardBob), DrawPayload.ColorRect(12f, 20f, 0xFF_6A0000.toInt()))

                // Helmet
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_helmet",
                    Vec2f(cx - 8f, cy - 37f + guardBob), DrawPayload.ColorOval(16f, 10f, 0xFF_4A0000.toInt()))

                // Visor — animated red slit across helmet
                val visorColor = if ((tick / 10) % 2 == 0L) 0xFF_FF4400.toInt() else 0xFF_FF8800.toInt()
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_visor",
                    Vec2f(cx - 5f, cy - 33f + guardBob),
                    DrawPayload.Line(cx - 5f, cy - 33f + guardBob, cx + 5f, cy - 33f + guardBob, visorColor, 2f))
            }
            ActorType.GHOST -> {
                // Phase flicker: every 11 ticks swap alpha
                val ghostAlpha = if ((tick / 11) % 2 == 0L) 0xB4 else 0x70
                val ghostColor = (ghostAlpha shl 24) or 0xAAAAEE
                val ghostTrailAlpha = if ((tick / 11) % 2 == 0L) 0x40 else 0x25

                // Main body oval
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 8f, cy - 32f), DrawPayload.ColorOval(16f, 32f, ghostColor))

                // Tattered hem — 4 downward spike triangles
                val spikeY = cy - 2f
                val spikeAlpha = (ghostAlpha * 0.4f).toInt()
                val spikeColor = (spikeAlpha shl 24) or 0x8888BB
                for (si in 0..3) {
                    val sx = cx - 7f + si * 5f
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_spike_$si",
                        Vec2f(sx, spikeY),
                        DrawPayload.ColorPath(listOf(
                            Vec2f(sx - 2f, spikeY),
                            Vec2f(sx + 2f, spikeY),
                            Vec2f(sx, spikeY + 8f + (si % 2) * 4f),
                        ), spikeColor))
                }

                // Trail particles — 3 particles fading behind
                for (ti in 0..2) {
                    val trailAlpha = ((ghostAlpha * (1f - ti * 0.3f)) * 0.3f).toInt().coerceAtLeast(0)
                    val trailColor = (trailAlpha shl 24) or 0xAAAAEE
                    val ty = cy - 8f + ti * 4f
                    commands += DrawCommand(DrawLayer.ACTOR, dk, -1, "${id}_trail_$ti",
                        Vec2f(cx - 1f, ty - 1f), DrawPayload.ColorOval(2f, 2f, trailColor))
                }
            }
            ActorType.ROBOT -> {
                // 3-face isometric cube
                val rgx = actor.position.x - 0.5f
                val rgy = actor.position.y - 0.5f
                val rgz = 0f
                val ox2 = offset.x; val oy2 = offset.y
                val rfootWorld = Vec3f(rgx + 0.5f, rgy + 1f, rgz)
                val rdk = IsoProjector.depthKey(rfootWorld)
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(rgx, rgy, rgz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(rgx, rgy, rgz + 1f, ox2, oy2), 0xFF_3A3A5A.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 1, "${id}_left",
                    IsoProjector.toScreen(Vec3f(rgx, rgy + 1f, rgz)) + offset,
                    DrawPayload.ColorPath(blockFaceLeft(rgx, rgy, rgz, ox2, oy2), 0xFF_333355.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 0, "${id}_right",
                    IsoProjector.toScreen(Vec3f(rgx + 1f, rgy, rgz)) + offset,
                    DrawPayload.ColorPath(blockFaceRight(rgx, rgy, rgz, ox2, oy2), 0xFF_444466.toInt()))

                // Antenna: vertical line above cube top
                val antX = cx + 2f
                val antBaseY2 = cy - 20f
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 4, "${id}_antenna",
                    Vec2f(antX, antBaseY2 - 8f),
                    DrawPayload.Line(antX, antBaseY2, antX, antBaseY2 - 8f, 0xFF_888888.toInt(), 1f))
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 4, "${id}_ant_tip",
                    Vec2f(antX - 1.5f, antBaseY2 - 10f),
                    DrawPayload.ColorOval(3f, 3f, 0xFF_888888.toInt()))

                // Scanning eye: sweep X based on tick (replaces old static eye)
                val eyeSweep = (kotlin.math.sin(tick.toDouble() * 0.08) * 5.0).toFloat()
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 3, "${id}_eye",
                    Vec2f(cx - 2f + eyeSweep, cy - 10f), DrawPayload.ColorOval(4f, 3f, 0xFF_FF0000.toInt()))

                // Walk treads: two dark rects at base alternating per tick
                val treadOffset = if ((tick / 6) % 2 == 0L) 2f else -2f
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 0, "${id}_tread_l",
                    Vec2f(cx - 8f + treadOffset, cy - 4f), DrawPayload.ColorRect(10f, 4f, 0xFF_222233.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 0, "${id}_tread_r",
                    Vec2f(cx + 2f - treadOffset, cy - 4f), DrawPayload.ColorRect(10f, 4f, 0xFF_222233.toInt()))
            }
            ActorType.DRUID -> {
                // Smaller cloak polygon (scale 0.7 of player shape), brown color
                val ws = 0.7f
                val druidColor = 0xFF_2A1A00.toInt()
                val druidPts = listOf(
                    Vec2f(cx + 12f * ws, cy - 68f * ws),
                    Vec2f(cx + 2f * ws,  cy - 58f * ws),
                    Vec2f(cx - 2f * ws,  cy - 44f * ws),
                    Vec2f(cx - 8f * ws,  cy - 20f * ws),
                    Vec2f(cx - 4f * ws,  cy),
                    Vec2f(cx + 28f * ws, cy),
                    Vec2f(cx + 32f * ws, cy - 20f * ws),
                    Vec2f(cx + 26f * ws, cy - 44f * ws),
                    Vec2f(cx + 22f * ws, cy - 58f * ws),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_cloak",
                    Vec2f(cx, cy), DrawPayload.ColorPath(druidPts, druidColor))
                // Yellow eyes
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_eye_l",
                    Vec2f(cx + 8f * ws, cy - 53f * ws), DrawPayload.ColorOval(3f, 2f, 0xFF_FFAA00.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_eye_r",
                    Vec2f(cx + 14f * ws, cy - 53f * ws), DrawPayload.ColorOval(3f, 2f, 0xFF_FFAA00.toInt()))

                // Staff: line from shoulder height to above head
                val staffX1 = cx + 30f * ws
                val staffY1 = cy
                val staffX2 = cx + 26f * ws
                val staffY2 = cy - 80f * ws
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_staff",
                    Vec2f(staffX1, staffY2),
                    DrawPayload.Line(staffX1, staffY1, staffX2, staffY2, 0xFF_6A5020.toInt(), 1.5f))

                // Crystal tip oval at top of staff
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_crystal",
                    Vec2f(staffX2 - 2f, staffY2 - 4f),
                    DrawPayload.ColorOval(4f, 4f, 0xFF_AAAAFF.toInt()))

                // Ritual glow halo at feet — pulsing radius 36-44px over 90 ticks
                val glowPhase = (tick % 90).toDouble() / 90.0
                val glowRadius = 36f + kotlin.math.sin(glowPhase * 2.0 * kotlin.math.PI).toFloat() * 4f
                val glowAlpha = 0x15
                val glowColor = (glowAlpha shl 24) or 0x7744FF
                commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_glow",
                    Vec2f(cx - glowRadius, cy - glowRadius / 2f),
                    DrawPayload.ColorOval(glowRadius * 2f, glowRadius, glowColor))
            }
            ActorType.BALL -> {
                // Proper bounce height: abs(sin(tick * 0.12)) * 20f above floor
                val bounceHeight = (kotlin.math.abs(kotlin.math.sin(tick.toDouble() * 0.12)) * 20.0).toFloat()
                val isNearFloor = bounceHeight < 4f

                // Squash at floor contact, normal at peak
                val ballW = if (isNearFloor) 24f else 20f
                val ballH = if (isNearFloor) 12f else 20f
                val ballScreenY = cy - bounceHeight

                // Shadow: scales inversely with height
                val shadowScale = 1f - (bounceHeight / 20f) * 0.5f
                val shadowW = 20f * shadowScale
                val shadowH = 8f * shadowScale
                val shadowAlpha = (0x60 * shadowScale).toInt()
                commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
                    Vec2f(cx - shadowW / 2f, cy - shadowH / 2f),
                    DrawPayload.ColorOval(shadowW, shadowH, (shadowAlpha shl 24) or 0x000000))

                // Ball body
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - ballW / 2f, ballScreenY - ballH / 2f),
                    DrawPayload.ColorOval(ballW, ballH, 0xFF_CC4400.toInt()))

                // Spin line on ball
                val angle = (tick % 60).toDouble() / 60.0 * 2.0 * kotlin.math.PI
                val spinX1 = cx + (kotlin.math.cos(angle) * (ballW / 2.5f)).toFloat()
                val spinY1 = ballScreenY - (kotlin.math.sin(angle) * (ballH / 2.5f)).toFloat()
                val spinX2 = cx - (kotlin.math.cos(angle) * (ballW / 2.5f)).toFloat()
                val spinY2 = ballScreenY + (kotlin.math.sin(angle) * (ballH / 2.5f)).toFloat()
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_spin",
                    Vec2f(spinX1, spinY1),
                    DrawPayload.Line(spinX1, spinY1, spinX2, spinY2, 0xFF_FF6600.toInt(), 1.5f))
            }
            ActorType.CAULDRON_GUARDIAN -> {
                // Default: glowing red diamond
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_halo", screen,
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx,       cy - 36f),
                        Vec2f(cx + 20f, cy - 18f),
                        Vec2f(cx,       cy + 4f),
                        Vec2f(cx - 20f, cy - 18f),
                    ), 0x66_FF0000.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, id, screen,
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx,       cy - 32f),
                        Vec2f(cx + 16f, cy - 16f),
                        Vec2f(cx,       cy),
                        Vec2f(cx - 16f, cy - 16f),
                    ), 0xFF_AA0000.toInt()))
            }
        }
    }

    // ── Player ───────────────────────────────────────────────────────────────

    private fun buildPlayerCommands(
        state: GameState,
        commands: MutableList<DrawCommand>,
        offset: Vec2f,
    ) {
        val player = state.player
        val screen = IsoProjector.toScreen(state.player.position) + offset
        val dk = IsoProjector.depthKey(state.player.position)
        val blinking = player.damageCooldownTicks > 0 && (player.damageCooldownTicks % 10 < 5)
        val isWerewulf = player.form == Form.WEREWULF
        val transforming = player.transformState.phase == TransformPhase.TRANSFORMING_TO_WEREWULF ||
            player.transformState.phase == TransformPhase.TRANSFORMING_TO_HUMAN
        val transformProgress = if (transforming) player.transformState.progressTicks / 60f else 0f
        val bob = (kotlin.math.sin(state.time.tick.toDouble() * 0.10472) * 2.0).toFloat()
        val ox = screen.x
        val oy = screen.y
        val ws = if (isWerewulf) 1.1f else 1.0f

        // ── Transformation energy burst ─────────────────────────────────────────────
        // During transformation: expanding purple energy rings + violent flicker
        if (transforming) {
            val tick = state.time.tick
            // 3 expanding diamond rings
            for (ri in 0..2) {
                val ringPhase = ((tick + ri * 20L) % 60).toFloat() / 60f
                val ringSize = (16f + ringPhase * 48f)
                val ringAlpha = ((1f - ringPhase) * 0xCC).toInt()
                val ringColor = (ringAlpha shl 24) or 0x8844CC
                commands += DrawCommand(DrawLayer.EFFECT, dk, 10 + ri, "transform_ring_$ri",
                    Vec2f(ox + 12f * ws - ringSize, oy - 30f - ringSize / 2f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(ox + 12f * ws,              oy - 30f - ringSize),
                        Vec2f(ox + 12f * ws + ringSize,   oy - 30f),
                        Vec2f(ox + 12f * ws,              oy - 30f + ringSize / 2f),
                        Vec2f(ox + 12f * ws - ringSize,   oy - 30f),
                    ), ringColor))
            }
            // Flash at transformation start (first 15 ticks) and end (last 15 ticks)
            val flashAlpha = when {
                player.transformState.progressTicks < 15 -> ((15 - player.transformState.progressTicks) * 0x0A)
                player.transformState.progressTicks > 45 -> ((player.transformState.progressTicks - 45) * 0x0A)
                else -> 0
            }.coerceIn(0, 0x60)
            if (flashAlpha > 0) {
                commands += DrawCommand(DrawLayer.HUD, 0, 5, "transform_flash",
                    Vec2f(0f, 0f), DrawPayload.ScreenFill((flashAlpha shl 24) or 0x8844CC))
            }
        }

        // Character center X
        val cx = ox + 12f * ws

        // ── Colors ──────────────────────────────────────────────────────────────────
        val cloakColor = when {
            blinking   -> 0xFF_FF4444.toInt()
            isWerewulf -> 0xFF_1A0A2A.toInt()
            else       -> 0xFF_140820.toInt()
        }
        val armorColor = when {
            blinking   -> 0xFF_FF4444.toInt()
            isWerewulf -> 0xFF_2A1840.toInt()
            else       -> 0xFF_1E1E30.toInt()
        }
        val armorHighlight = if (isWerewulf) 0xFF_5A2A8A.toInt() else 0xFF_3A3A5A.toInt()
        val legColor   = if (isWerewulf) 0xFF_140820.toInt() else 0xFF_140820.toInt()
        val beltColor  = if (isWerewulf) 0xFF_AA4400.toInt() else 0xFF_3A3A5A.toInt()
        val skinColor  = if (blinking) 0xFF_FF4444.toInt() else 0xFF_C8A882.toInt()
        val eyeColor   = when {
            blinking   -> 0xFF_FF4444.toInt()
            isWerewulf -> 0xFF_FF4400.toInt()
            else       -> 0xFF_7FFF00.toInt()
        }
        val furColor   = 0xFF_3A1A5A.toInt()

        // ── Walk cycle ──────────────────────────────────────────────────────────────
        val isMoving = player.movementState == MovementState.WALKING
        val walkFrame = if (isMoving) ((state.time.tick * 0.25f).toInt() % 4) else 0
        val isAirborne = player.airborne
        val breathe = if (!isMoving && !isAirborne) (kotlin.math.sin(state.time.tick.toDouble() * 0.05) * 1.0).toFloat() else 0f
        val cloakSway = if (isMoving) (kotlin.math.sin(state.time.tick.toDouble() * 0.15) * 3.0).toFloat() else 0f

        // Per-frame offsets: legs/arms swing on frames 1 and 3
        val leftLegFwd  = if (walkFrame == 1) -6f else if (walkFrame == 3)  6f else 0f
        val rightLegFwd = if (walkFrame == 1)  6f else if (walkFrame == 3) -6f else 0f
        val leftArmFwd  = if (walkFrame == 1)  4f else if (walkFrame == 3) -4f else 0f
        val rightArmFwd = if (walkFrame == 1) -4f else if (walkFrame == 3)  4f else 0f

        // Jump pose compresses legs and raises arms
        val legHeightMul = if (isAirborne) 0.7f else 1.0f
        val armRaiseY    = if (isAirborne) -10f else 0f

        val shoulderCompress = when (player.facing.name) {
            "NORTHEAST", "SOUTHEAST" -> -2f
            "NORTHWEST", "SOUTHWEST" -> 2f
            else -> 0f
        }

        // ── Shadow ───────────────────────────────────────────────────────────────────
        val shadowW = if (isAirborne) 52f else 64f * ws
        val shadowH = if (isAirborne) 9f  else 12f
        commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "player_shadow",
            Vec2f(cx - shadowW / 2f, oy - shadowH / 2f),
            DrawPayload.ColorOval(shadowW, shadowH, 0x50_000000.toInt()))

        // ── Footstep marks ────────────────────────────────────────────────────────────
        if (isMoving) {
            val footTick = state.time.tick
            val isLeftFoot = (footTick / 8) % 2 == 0L
            val footOffsetX = when (player.facing.name) {
                "EAST", "NORTHEAST"  -> -4f
                "WEST", "SOUTHWEST"  -> 4f
                else -> 0f
            }
            val footOffsetY = when (player.facing.name) {
                "SOUTH", "SOUTHEAST" -> -3f
                "NORTH", "NORTHWEST" -> 3f
                else -> 0f
            }
            val footX = if (isLeftFoot) cx - 6f * ws + footOffsetX else cx + 2f * ws + footOffsetX
            val footAlpha = (((8L - footTick % 8).toFloat() / 8f) * 60).toInt()
            if (footAlpha > 5) {
                commands += DrawCommand(DrawLayer.FLOOR, dk, -2, "player_footstep_${footTick % 2}",
                    Vec2f(footX - 2f, oy + footOffsetY - 1f),
                    DrawPayload.ColorOval(4f, 2f, (footAlpha shl 24) or 0x1A1A2A))
            }
        }

        // ── Legs ─────────────────────────────────────────────────────────────────────
        val legH = 14f * legHeightMul
        val ll = listOf(
            Vec2f(cx - 10f * ws, oy - legH + leftLegFwd  + bob),
            Vec2f(cx -  4f * ws, oy - legH + leftLegFwd  + bob),
            Vec2f(cx -  4f * ws, oy         + leftLegFwd + bob),
            Vec2f(cx - 10f * ws, oy         + leftLegFwd + bob),
        )
        val rl = listOf(
            Vec2f(cx +  2f * ws, oy - legH + rightLegFwd + bob),
            Vec2f(cx +  8f * ws, oy - legH + rightLegFwd + bob),
            Vec2f(cx +  8f * ws, oy        + rightLegFwd + bob),
            Vec2f(cx +  2f * ws, oy        + rightLegFwd + bob),
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, -2, "player_leg_l",
            Vec2f(cx - 10f * ws, oy - legH), DrawPayload.ColorPath(ll, legColor))
        commands += DrawCommand(DrawLayer.PLAYER, dk, -2, "player_leg_r",
            Vec2f(cx + 2f * ws, oy - legH), DrawPayload.ColorPath(rl, legColor))
        // Feet
        commands += DrawCommand(DrawLayer.PLAYER, dk, -2, "player_foot_l",
            Vec2f(cx - 11f * ws, oy - 2f + leftLegFwd + bob),
            DrawPayload.ColorOval(5f * ws, 3f, 0xFF_0A0818.toInt()))
        commands += DrawCommand(DrawLayer.PLAYER, dk, -2, "player_foot_r",
            Vec2f(cx + 2f * ws, oy - 2f + rightLegFwd + bob),
            DrawPayload.ColorOval(5f * ws, 3f, 0xFF_0A0818.toInt()))

        // ── Cape / cloak back (behind body) ──────────────────────────────────────────
        val capeSwayL = -cloakSway
        val capeSwayR =  cloakSway
        if (!isWerewulf) {
            val capePts = listOf(
                Vec2f(cx -  2f * ws,             oy - 56f + bob),
                Vec2f(cx + 14f * ws,             oy - 56f + bob),
                Vec2f(cx + 18f * ws + capeSwayR, oy - 18f + bob),
                Vec2f(cx + 14f * ws + capeSwayR, oy +  2f + bob),
                Vec2f(cx -  4f * ws + capeSwayL, oy +  2f + bob),
                Vec2f(cx -  8f * ws + capeSwayL, oy - 18f + bob),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, -1, "player_cape",
                Vec2f(cx - 8f * ws, oy - 56f), DrawPayload.ColorPath(capePts, cloakColor))
        } else {
            // Werewolf: hunched, wider beast cloak with claws at hem
            val wolfCapePts = listOf(
                Vec2f(cx -  8f * ws,  oy - 60f + bob),   // hunch left
                Vec2f(cx +  2f * ws,  oy - 72f + bob),   // peak (hunched forward)
                Vec2f(cx + 10f * ws,  oy - 72f + bob),   // peak right
                Vec2f(cx + 20f * ws,  oy - 60f + bob),   // hunch right
                Vec2f(cx + 26f * ws + capeSwayR, oy - 20f + bob),  // right flare
                Vec2f(cx + 24f * ws + capeSwayR, oy +  2f + bob),  // hem right
                Vec2f(cx -  8f * ws + capeSwayL, oy +  2f + bob),  // hem left
                Vec2f(cx - 12f * ws + capeSwayL, oy - 20f + bob),  // left flare
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, -1, "player_wolf_cape",
                Vec2f(cx - 12f * ws, oy - 72f), DrawPayload.ColorPath(wolfCapePts, cloakColor))
            // Claw tips at hem (two small triangles)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_claw_l",
                Vec2f(cx - 12f * ws, oy), DrawPayload.ColorPath(listOf(
                    Vec2f(cx - 12f * ws + capeSwayL, oy + 2f + bob),
                    Vec2f(cx - 10f * ws + capeSwayL, oy + 2f + bob),
                    Vec2f(cx - 11f * ws + capeSwayL, oy + 8f + bob),
                ), 0xFF_6A3A8A.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_claw_r",
                Vec2f(cx + 24f * ws, oy), DrawPayload.ColorPath(listOf(
                    Vec2f(cx + 24f * ws + capeSwayR, oy + 2f + bob),
                    Vec2f(cx + 26f * ws + capeSwayR, oy + 2f + bob),
                    Vec2f(cx + 25f * ws + capeSwayR, oy + 8f + bob),
                ), 0xFF_6A3A8A.toInt()))
            // Tail stub
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail",
                Vec2f(cx + 18f * ws, oy), DrawPayload.ColorPath(listOf(
                    Vec2f(cx + 20f * ws, oy + 4f + bob),
                    Vec2f(cx + 24f * ws, oy - 2f + bob),
                    Vec2f(cx + 22f * ws, oy + 0f + bob),
                ), cloakColor))
        }

        // ── Tunic / body armor ────────────────────────────────────────────────────────
        val chestLeft  = cx - (7f + shoulderCompress) * ws
        val chestRight = cx + (7f - shoulderCompress) * ws
        val chestCx = (chestLeft + chestRight) / 2f

        val tunicPts = listOf(
            Vec2f(chestLeft  - 2f, oy - 52f + breathe * 0.5f + bob),
            Vec2f(chestRight + 2f, oy - 52f + breathe * 0.5f + bob),
            Vec2f(chestRight,      oy - 30f + bob),
            Vec2f(chestLeft,       oy - 30f + bob),
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_chest",
            Vec2f(chestLeft, oy - 52f), DrawPayload.ColorPath(tunicPts, armorColor, 0xFF_0A0A14.toInt()))

        // Belt
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_belt",
            Vec2f(chestLeft, oy - 30f + bob),
            DrawPayload.Line(chestLeft, oy - 30f + bob, chestRight, oy - 30f + bob, beltColor, 1.5f))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_buckle",
            Vec2f(chestCx - 2f, oy - 31f + bob),
            DrawPayload.ColorOval(4f, 3f, if (isWerewulf) 0xFF_CC6600.toInt() else 0xFF_888899.toInt()))

        // Armor banding (human only)
        if (!isWerewulf) {
            for (i in 1..2) {
                val lineY = oy - 52f + i * 7f + bob
                commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_armor_band_$i",
                    Vec2f(chestLeft, lineY),
                    DrawPayload.Line(chestLeft, lineY, chestRight, lineY, armorHighlight, 0.8f))
            }
        }

        // Chest center line / fur stripe
        if (isWerewulf) {
            // Fur strokes radiating from chest
            val furOffsets = listOf(
                Pair(-4f to -48f, -8f to -40f),
                Pair( 0f to -48f,  0f to -38f),
                Pair( 4f to -48f,  8f to -40f),
                Pair(-6f to -44f, -12f to -36f),
                Pair( 6f to -44f,  12f to -36f),
                Pair(-2f to -42f, -4f to -32f),
                Pair( 2f to -42f,  4f to -32f),
            )
            furOffsets.forEachIndexed { fi, (from, to) ->
                commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_fur_$fi",
                    Vec2f(chestCx + from.first, oy + from.second + bob),
                    DrawPayload.Line(
                        chestCx + from.first,  oy + from.second + bob,
                        chestCx + to.first,    oy + to.second   + bob,
                        furColor, 1f))
            }
        } else {
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_chest_line",
                Vec2f(chestCx, oy - 50f + bob),
                DrawPayload.Line(chestCx, oy - 50f + bob, chestCx, oy - 32f + bob, armorHighlight, 1f))
        }

        // ── Pauldrons ─────────────────────────────────────────────────────────────────
        val pLeftPts = listOf(
            Vec2f(chestLeft - 2f, oy - 52f + breathe * 0.5f + bob),
            Vec2f(chestLeft - 8f, oy - 50f + bob),
            Vec2f(chestLeft - 7f, oy - 42f + bob),
            Vec2f(chestLeft,      oy - 40f + bob),
        )
        val pRightPts = listOf(
            Vec2f(chestRight + 2f, oy - 52f + breathe * 0.5f + bob),
            Vec2f(chestRight + 8f, oy - 50f + bob),
            Vec2f(chestRight + 7f, oy - 42f + bob),
            Vec2f(chestRight,      oy - 40f + bob),
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_paul_l",
            Vec2f(chestLeft - 8f, oy - 52f), DrawPayload.ColorPath(pLeftPts, armorColor, 0xFF_0A0A14.toInt()))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_paul_r",
            Vec2f(chestRight, oy - 52f), DrawPayload.ColorPath(pRightPts, armorColor, 0xFF_0A0A14.toInt()))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_paul_l_hl",
            Vec2f(chestLeft - 8f, oy - 50f + bob),
            DrawPayload.Line(chestLeft - 8f, oy - 50f + bob, chestLeft - 7f, oy - 42f + bob,
                armorHighlight, 1f))

        // ── Arms — ColorPath quads for visible limbs ───────────────────────────────────
        val armRaise = armRaiseY
        // Left arm
        val laTop = oy - 42f + armRaise + bob + leftArmFwd
        val laBot = oy - 32f + armRaise + bob + leftArmFwd
        val leftArmPts = listOf(
            Vec2f(chestLeft - 8f,  laTop),
            Vec2f(chestLeft - 4f,  laTop),
            Vec2f(chestLeft - 6f,  laBot),
            Vec2f(chestLeft - 10f, laBot),
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_arm_l",
            Vec2f(chestLeft - 10f, laTop), DrawPayload.ColorPath(leftArmPts, armorColor))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_gaunt_l",
            Vec2f(chestLeft - 11f, laBot - 2f),
            DrawPayload.ColorOval(5f, 4f, skinColor))

        // Right arm
        val raTop = oy - 42f + armRaise + bob + rightArmFwd
        val raBot = oy - 32f + armRaise + bob + rightArmFwd
        val rightArmPts = listOf(
            Vec2f(chestRight + 4f, raTop),
            Vec2f(chestRight + 8f, raTop),
            Vec2f(chestRight + 10f, raBot),
            Vec2f(chestRight + 6f,  raBot),
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_arm_r",
            Vec2f(chestRight + 4f, raTop), DrawPayload.ColorPath(rightArmPts, armorColor))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_gaunt_r",
            Vec2f(chestRight + 5f, raBot - 2f),
            DrawPayload.ColorOval(5f, 4f, skinColor))

        // ── Neck ──────────────────────────────────────────────────────────────────────
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_neck",
            Vec2f(chestCx - 3f, oy - 58f + breathe * 0.5f + bob),
            DrawPayload.ColorRect(6f * ws, 7f, 0xFF_0A0818.toInt()))

        // ── Head ──────────────────────────────────────────────────────────────────────
        val facingShift = when (player.facing.name) {
            "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
            "EAST", "NORTHEAST", "SOUTHEAST" -> 3f
            else -> 0f
        }

        if (!isWerewulf) {
            // Human: angular pointed hood
            val hoodPts = listOf(
                Vec2f(chestCx,       oy - 72f + bob),
                Vec2f(chestCx - 6f,  oy - 64f + bob),
                Vec2f(chestCx - 8f,  oy - 56f + bob),
                Vec2f(chestCx + 2f,  oy - 54f + bob),
                Vec2f(chestCx + 10f, oy - 54f + bob),
                Vec2f(chestCx + 10f, oy - 62f + bob),
                Vec2f(chestCx + 6f,  oy - 70f + bob),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_hood",
                Vec2f(chestCx - 8f, oy - 72f), DrawPayload.ColorPath(hoodPts, cloakColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_face",
                Vec2f(chestCx - 2f, oy - 63f + breathe * 0.3f + bob),
                DrawPayload.ColorOval(12f * ws, 9f, skinColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(chestCx - 4f * ws + facingShift, oy - 59f + breathe * 0.3f + bob),
                DrawPayload.ColorOval(3f, 2f, eyeColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(chestCx + 2f * ws + facingShift, oy - 59f + breathe * 0.3f + bob),
                DrawPayload.ColorOval(3f, 2f, eyeColor))
        } else {
            // Werewolf: hulking beast head with wedge snout and fangs
            val wolfHeadPts = listOf(
                Vec2f(chestCx +  4f,  oy - 74f + bob),   // left ear tip
                Vec2f(chestCx +  2f,  oy - 64f + bob),   // left ear base
                Vec2f(chestCx -  8f,  oy - 60f + bob),   // jaw left
                Vec2f(chestCx -  4f,  oy - 54f + bob),   // muzzle left
                Vec2f(chestCx + 14f,  oy - 54f + bob),   // muzzle right
                Vec2f(chestCx + 18f,  oy - 60f + bob),   // jaw right
                Vec2f(chestCx + 16f,  oy - 64f + bob),   // right ear base
                Vec2f(chestCx + 20f,  oy - 74f + bob),   // right ear tip
                Vec2f(chestCx + 12f,  oy - 70f + bob),   // between ears
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_wolf_head",
                Vec2f(chestCx - 8f, oy - 74f), DrawPayload.ColorPath(wolfHeadPts, cloakColor))

            // Snout — wedge shape
            val snoutPts = listOf(
                Vec2f(chestCx + 1f,  oy - 62f + bob),   // snout top left
                Vec2f(chestCx + 9f,  oy - 62f + bob),   // snout top right
                Vec2f(chestCx + 14f, oy - 57f + bob),   // snout tip right
                Vec2f(chestCx +  1f, oy - 57f + bob),   // snout base left
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_snout",
                Vec2f(chestCx + 1f, oy - 62f), DrawPayload.ColorPath(snoutPts, 0xFF_1A0830.toInt()))

            // Fangs — two small white downward triangles
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_fang_l",
                Vec2f(chestCx + 3f, oy - 58f + bob), DrawPayload.ColorPath(listOf(
                    Vec2f(chestCx + 3f, oy - 58f + bob),
                    Vec2f(chestCx + 5f, oy - 58f + bob),
                    Vec2f(chestCx + 4f, oy - 54f + bob),
                ), 0xFF_EEEECC.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_fang_r",
                Vec2f(chestCx + 7f, oy - 58f + bob), DrawPayload.ColorPath(listOf(
                    Vec2f(chestCx + 7f, oy - 58f + bob),
                    Vec2f(chestCx + 9f, oy - 58f + bob),
                    Vec2f(chestCx + 8f, oy - 54f + bob),
                ), 0xFF_EEEECC.toInt()))

            // Wolf eyes — glowing, above snout
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(chestCx + facingShift,      oy - 66f + bob),
                DrawPayload.ColorOval(4f, 3f, eyeColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(chestCx + 8f + facingShift, oy - 66f + bob),
                DrawPayload.ColorOval(4f, 3f, eyeColor))
        }
    }

    // ── Ambient dust particles ───────────────────────────────────────────────

    private fun buildDustParticles(
        room: RoomDefinition,
        offset: Vec2f,
        tick: Long,
        commands: MutableList<DrawCommand>,
    ) {
        val w = room.width.toFloat()
        val d = room.depth.toFloat()
        val ox = offset.x; val oy = offset.y
        val cycleLen = 180L

        // Inner corner positions: wall inner face at z=2 (top of wall)
        // North wall inner face: y=1, West wall inner face: x=1
        val corners = listOf(
            Vec3f(1f,     1f,     2f),   // NW inner corner
            Vec3f(w - 1f, 1f,     2f),   // NE inner corner
            Vec3f(1f,     d - 1f, 2f),   // SW inner corner
            Vec3f(w - 1f, d - 1f, 2f),   // SE inner corner
        )

        for ((ci, corner) in corners.withIndex()) {
            val cornerScreen = pt(corner.x, corner.y, corner.z, ox, oy)

            for (pi in 0..2) {
                val phase = ((tick + pi * 60L) % cycleLen).toInt()
                val t = phase / cycleLen.toFloat()
                val alpha = ((1f - t) * 160f).toInt().coerceIn(0, 160)
                if (alpha < 15) continue  // fully faded

                // Deterministic wobble — particles seep into room, slight horizontal drift
                val wobble = kotlin.math.sin((ci * 1.7 + pi * 2.3)).toFloat() * 4f
                val px = cornerScreen.x + wobble
                val py = cornerScreen.y - t * 23f  // 40% slower drift than before

                val particleColor = (alpha shl 24) or 0x4A4A62  // dusty blue-grey mist
                commands += DrawCommand(
                    layer = DrawLayer.EFFECT,
                    depthKey = IsoProjector.depthKey(corner) + 100,
                    entityId = "dust_${ci}_${pi}",
                    screenPos = Vec2f(px - 1.5f, py - 1.5f),
                    payload = DrawPayload.ColorOval(3f, 3f, particleColor),
                )
            }
        }
    }
}
