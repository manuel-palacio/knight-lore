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
import com.palacesoft.knightlore.core.geometry.ZXPalette
import com.palacesoft.knightlore.render.iso.IsoProjector

/**
 * Converts the current GameState + GameContent into a flat list of DrawCommands
 * for the current room. Dark fantasy plague aesthetic — all visuals drawn in code.
 */
object RoomEntityFactory {

    private object Colors {
        val BLACK       = ZXPalette.BLACK
        val DARK_STONE  = ZXPalette.STONE_DARK
        val MID_STONE   = ZXPalette.STONE_MID
        val HIGHLIGHT   = ZXPalette.STONE_CREAM
        val DANGER_RED  = ZXPalette.B_RED
        val LIFE_GREEN  = ZXPalette.B_GREEN

        val FLOOR_TOP      = ZXPalette.FLOOR_B
        val FLOOR_CRACK    = BLACK
        val FLOOR_GLOW_BASE = 0x30_000800.toInt()
        val FLOOR_GLOW_OVER = 0x18_003300.toInt()
        val WALL_TOP          = ZXPalette.STONE_CREAM
        val WALL_LEFT_D1      = ZXPalette.STONE_MID     // south-facing dither
        val WALL_LEFT_D2      = ZXPalette.STONE_DARK
        val WALL_RIGHT_D1     = ZXPalette.STONE_DARK     // east-facing dither (darker)
        val WALL_RIGHT_D2     = ZXPalette.BLACK
        val WALL_MORTAR    = BLACK
        val WALL_HIGHLIGHT = HIGHLIGHT
        val WALL_MOSS      = ZXPalette.GREEN
        val BLOCK_TOP      = ZXPalette.STONE_CREAM
        val BLOCK_LEFT     = ZXPalette.STONE_MID
        val BLOCK_RIGHT    = ZXPalette.STONE_DARK
        val BLOCK_CROSS    = ZXPalette.STONE_LIGHT
        val GOBLIN_TOP     = ZXPalette.B_GREEN
        val GOBLIN_LEFT    = ZXPalette.GREEN
        val GOBLIN_RIGHT   = 0xFF_005500.toInt()
        val ITEM           = ZXPalette.B_YELLOW
        val ACTOR          = ZXPalette.B_RED
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
            floor1     = ZXPalette.BLACK,
            floor2     = ZXPalette.FLOOR_B,
            wallTop    = ZXPalette.STONE_CREAM,
            wallFaceD1 = ZXPalette.STONE_MID,
            wallFaceD2 = ZXPalette.STONE_DARK,
            wallFaceR1 = ZXPalette.STONE_DARK,
            wallFaceR2 = 0xFF_2A2820.toInt(),
            blockTop   = ZXPalette.STONE_CREAM,
            blockLeft  = ZXPalette.STONE_MID,
            blockRight = ZXPalette.STONE_DARK,
            fogColor   = 0x20_000000.toInt(),
        )
        RoomTheme.DUNGEON -> ThemePalette(
            floor1     = ZXPalette.BLACK,
            floor2     = 0xFF_1A1208.toInt(),        // warm dark brown floor
            wallTop    = 0xFF_8A7A50.toInt(),         // tan dungeon stone
            wallFaceD1 = 0xFF_6A5A38.toInt(),
            wallFaceD2 = 0xFF_4A3A20.toInt(),
            wallFaceR1 = 0xFF_4A3A20.toInt(),
            wallFaceR2 = 0xFF_2A2010.toInt(),
            blockTop   = 0xFF_8A7A50.toInt(),
            blockLeft  = 0xFF_6A5A38.toInt(),
            blockRight = 0xFF_4A3A20.toInt(),
            fogColor   = 0x20_100800.toInt(),
        )
        RoomTheme.TOWER -> ThemePalette(
            floor1     = ZXPalette.BLACK,
            floor2     = 0xFF_141820.toInt(),         // cool dark grey-blue floor
            wallTop    = 0xFF_8A8A98.toInt(),         // cool grey tower stone
            wallFaceD1 = 0xFF_6A6A78.toInt(),
            wallFaceD2 = 0xFF_4A4A58.toInt(),
            wallFaceR1 = 0xFF_4A4A58.toInt(),
            wallFaceR2 = 0xFF_2A2A38.toInt(),
            blockTop   = 0xFF_8A8A98.toInt(),
            blockLeft  = 0xFF_6A6A78.toInt(),
            blockRight = 0xFF_4A4A58.toInt(),
            fogColor   = 0x20_000010.toInt(),
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

                    // Crack line — 1 in 8 tiles (sparse, clean)
                    if ((tile.gridX * 7 + tile.gridY * 13) % 8 == 0) {
                        val c1 = pt(gx + 0.2f, gy + 0.1f, gz, ox, oy)
                        val c2 = pt(gx + 0.8f, gy + 0.9f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_crack",
                            Vec2f(c1.x, c1.y),
                            DrawPayload.Line(c1.x, c1.y, c2.x, c2.y, Colors.FLOOR_CRACK, 1f))
                    }

                    // Floor edge highlights — subtle grid lines
                    val gridColor = 0x30_6A6A50.toInt()  // dim olive, semi-transparent
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_hl_l",
                        Vec2f(pts[3].x, pts[3].y),
                        DrawPayload.Line(pts[3].x, pts[3].y, pts[0].x, pts[0].y, gridColor, 0.5f))
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_hl_r",
                        Vec2f(pts[0].x, pts[0].y),
                        DrawPayload.Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y, gridColor, 0.5f))
                }
                TileType.SOLID_BLOCK -> {
                    // Depth key based on front-bottom corner (gy+1 is the camera-facing edge)
                    val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
                    val dk = IsoProjector.depthKey(footWorld)
                    // Use depth comparison to decide layer: blocks "in front of" player go to FOREGROUND,
                    // blocks "behind" player stay in BLOCK. This implements the painter's algorithm correctly.
                    val playerPos = state.player.position
                    val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, playerPos.z))
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
        val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, playerPos.z))
        val blockLayer = if (dk > playerDk) DrawLayer.FOREGROUND else DrawLayer.BLOCK
        val id = "dblock_${block.id}"

        // Top face — slightly lighter than static blocks to distinguish pushable
        commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
            IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
            DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), ZXPalette.STONE_CREAM, ZXPalette.STONE_DARK))
        // Left face
        commands += DrawCommand(blockLayer, dk, 1, "${id}_left",
            IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
            DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), ZXPalette.STONE_LIGHT, ZXPalette.STONE_DARK))
        // Right face
        commands += DrawCommand(blockLayer, dk, 0, "${id}_right",
            IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
            DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), ZXPalette.STONE_DARK, ZXPalette.BLACK))

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
            for (gz in 0 until 3) {
                val bz = gz.toFloat()
                val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
                val dk = IsoProjector.depthKey(footWorld)
                val id = "wall_${gx.toInt()}_${gy.toInt()}_$gz"
                val isTop = gz == 2

                // Top face — only on the topmost block to avoid shelf appearance
                if (isTop) {
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), wTop))
                    val h1 = pt(gx, gy, bz + 1f, ox, oy)
                    val h2 = pt(gx, gy + 1f, bz + 1f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_highlight",
                        Vec2f(h1.x, h1.y),
                        DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, Colors.WALL_HIGHLIGHT, 1f))
                }
                // South-facing inner face (blockFaceLeft = y+1 face) — horizontal dither rows
                commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                    IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                    DrawPayload.DitheredPath(blockFaceLeft(gx, gy, bz, ox, oy), wFD1, wFD2, horizontal = true))

                // Brick texture comes from the horizontal dither pattern — no separate mortar lines

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
            for (gz in 0 until 3) {
                val bz = gz.toFloat()
                val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
                val dk = IsoProjector.depthKey(footWorld)
                val id = "wall_${gx.toInt()}_${gy.toInt()}_$gz"
                val isTop = gz == 2

                // Top face — only on the topmost block to avoid shelf appearance
                if (isTop) {
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), wTop))
                    val h1 = pt(gx, gy, bz + 1f, ox, oy)
                    val h2 = pt(gx + 1f, gy, bz + 1f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_highlight",
                        Vec2f(h1.x, h1.y),
                        DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, Colors.WALL_HIGHLIGHT, 1f))
                }
                // East-facing inner face (blockFaceRight = x+1 face) — horizontal dither rows
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                    IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                    DrawPayload.DitheredPath(blockFaceRight(gx, gy, bz, ox, oy), wFR1, wFR2, horizontal = true))

                // Brick texture comes from the horizontal dither pattern — no separate mortar lines

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

        fun doorArchway(gx: Float, gy: Float, isFirst: Boolean, isLast: Boolean, side: ExitSide, targetRoomId: RoomId? = null) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "door_${gx.toInt()}_${gy.toInt()}"

            // Floor tile at the threshold
            commands += DrawCommand(DrawLayer.FLOOR, dk, 0, "${id}_floor",
                IsoProjector.toScreen(Vec3f(gx, gy, 0f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 0f, ox, oy), Colors.FLOOR_TOP))

            // Build the arch from wall blocks:
            // - isFirst tile: draw a JAMB (wall column) on the left side + arch springer at z=2
            // - isLast tile: draw a JAMB on the right side + arch springer at z=2 + keystone at z=2
            // - Both tiles: dark void at z=0..2 in the opening center

            if (side == ExitSide.NORTH) {
                // Dark void — the passage visible through the opening
                val voidLeft = if (isFirst) gx + 0.35f else gx
                val voidRight = if (isLast) gx + 0.65f else gx + 1f
                val voidPts = listOf(
                    pt(voidLeft,  gy + 1f, 0f, ox, oy),
                    pt(voidRight, gy + 1f, 0f, ox, oy),
                    pt(voidRight, gy + 1f, 2f, ox, oy),
                    pt(voidLeft,  gy + 1f, 2f, ox, oy),
                )
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_void",
                    IsoProjector.toScreen(Vec3f(voidLeft, gy + 1f, 0f)) + offset,
                    DrawPayload.ColorPath(voidPts, ZXPalette.BLACK))

                // Jamb: narrow wall column on the outer edge of this gap tile
                if (isFirst) {
                    // Left jamb: x=[gx, gx+0.35], z=0..3
                    for (jz in 0 until 3) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 0.15f, gy + 1f, jz.toFloat()))
                        val jid = "${id}_jl_$jz"
                        if (jz == 2) {
                            commands += DrawCommand(DrawLayer.BLOCK, jdk, 2, "${jid}_top",
                                IsoProjector.toScreen(Vec3f(gx, gy, jz + 1f)) + offset,
                                DrawPayload.ColorPath(floorDiamond(gx, gy, jz + 1f, ox, oy), wTop))
                        }
                        commands += DrawCommand(DrawLayer.BLOCK, jdk, 1, "${jid}_face",
                            IsoProjector.toScreen(Vec3f(gx, gy + 1f, jz.toFloat())) + offset,
                            DrawPayload.DitheredPath(blockFaceLeft(gx, gy, jz.toFloat(), ox, oy), wFD1, wFD2, horizontal = true))
                    }
                }
                if (isLast) {
                    // Right jamb: x=[gx+0.65, gx+1], z=0..3
                    for (jz in 0 until 3) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 0.85f, gy + 1f, jz.toFloat()))
                        val jid = "${id}_jr_$jz"
                        if (jz == 2) {
                            commands += DrawCommand(DrawLayer.BLOCK, jdk, 2, "${jid}_top",
                                IsoProjector.toScreen(Vec3f(gx, gy, jz + 1f)) + offset,
                                DrawPayload.ColorPath(floorDiamond(gx, gy, jz + 1f, ox, oy), wTop))
                        }
                        commands += DrawCommand(DrawLayer.BLOCK, jdk, 1, "${jid}_face",
                            IsoProjector.toScreen(Vec3f(gx, gy + 1f, jz.toFloat())) + offset,
                            DrawPayload.DitheredPath(blockFaceLeft(gx, gy, jz.toFloat(), ox, oy), wFD1, wFD2, horizontal = true))
                    }
                }

                // Arch top: wall block at z=2 spanning the gap (the lintel/keystone)
                val archDk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 2f))
                commands += DrawCommand(DrawLayer.BLOCK, archDk, 2, "${id}_arch_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, 3f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, 3f, ox, oy), wTop))
                commands += DrawCommand(DrawLayer.BLOCK, archDk, 1, "${id}_arch_face",
                    IsoProjector.toScreen(Vec3f(gx, gy + 1f, 2f)) + offset,
                    DrawPayload.DitheredPath(blockFaceLeft(gx, gy, 2f, ox, oy), wFD1, wFD2, horizontal = true))

                // Arch springers — filled triangular blocks at the corners where
                // jambs meet the lintel, creating the curved arch shape from solid wall material.
                if (isFirst) {
                    // Left springer: triangle filling the corner between left jamb and lintel
                    val sprPts = listOf(
                        pt(gx,        gy + 1f, 1.2f, ox, oy),  // jamb inner edge at z=1.2
                        pt(gx + 0.5f, gy + 1f, 2f,   ox, oy),  // curve midpoint at z=2
                        pt(gx,        gy + 1f, 2f,   ox, oy),  // jamb top at z=2
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, archDk, 2, "${id}_spr_l",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, 1.2f)) + offset,
                        DrawPayload.DitheredPath(sprPts, wFD1, wFD2, horizontal = true))
                }
                if (isLast) {
                    // Right springer
                    val sprPts = listOf(
                        pt(gx + 1f,   gy + 1f, 1.2f, ox, oy),
                        pt(gx + 0.5f, gy + 1f, 2f,   ox, oy),
                        pt(gx + 1f,   gy + 1f, 2f,   ox, oy),
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, archDk, 2, "${id}_spr_r",
                        IsoProjector.toScreen(Vec3f(gx + 0.5f, gy + 1f, 1.2f)) + offset,
                        DrawPayload.DitheredPath(sprPts, wFD1, wFD2, horizontal = true))
                }
            } else {
                // WEST wall archway — on the east-facing (x+1) face
                val faceX = gx + 1f
                val voidTop = if (isFirst) gy + 0.35f else gy
                val voidBot = if (isLast) gy + 0.65f else gy + 1f
                val voidPts = listOf(
                    pt(faceX, voidTop, 0f, ox, oy),
                    pt(faceX, voidBot, 0f, ox, oy),
                    pt(faceX, voidBot, 2f, ox, oy),
                    pt(faceX, voidTop, 2f, ox, oy),
                )
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_void",
                    IsoProjector.toScreen(Vec3f(faceX, voidTop, 0f)) + offset,
                    DrawPayload.ColorPath(voidPts, ZXPalette.BLACK))

                // Jambs
                if (isFirst) {
                    for (jz in 0 until 3) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 1f, gy + 0.15f, jz.toFloat()))
                        val jid = "${id}_jl_$jz"
                        if (jz == 2) {
                            commands += DrawCommand(DrawLayer.BLOCK, jdk, 2, "${jid}_top",
                                IsoProjector.toScreen(Vec3f(gx, gy, jz + 1f)) + offset,
                                DrawPayload.ColorPath(floorDiamond(gx, gy, jz + 1f, ox, oy), wTop))
                        }
                        commands += DrawCommand(DrawLayer.BLOCK, jdk, 1, "${jid}_face",
                            IsoProjector.toScreen(Vec3f(faceX, gy, jz.toFloat())) + offset,
                            DrawPayload.DitheredPath(blockFaceRight(gx, gy, jz.toFloat(), ox, oy), wFR1, wFR2, horizontal = true))
                    }
                }
                if (isLast) {
                    for (jz in 0 until 3) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 1f, gy + 0.85f, jz.toFloat()))
                        val jid = "${id}_jr_$jz"
                        if (jz == 2) {
                            commands += DrawCommand(DrawLayer.BLOCK, jdk, 2, "${jid}_top",
                                IsoProjector.toScreen(Vec3f(gx, gy, jz + 1f)) + offset,
                                DrawPayload.ColorPath(floorDiamond(gx, gy, jz + 1f, ox, oy), wTop))
                        }
                        commands += DrawCommand(DrawLayer.BLOCK, jdk, 1, "${jid}_face",
                            IsoProjector.toScreen(Vec3f(faceX, gy, jz.toFloat())) + offset,
                            DrawPayload.DitheredPath(blockFaceRight(gx, gy, jz.toFloat(), ox, oy), wFR1, wFR2, horizontal = true))
                    }
                }

                // Arch top: lintel at z=2
                val archDk = IsoProjector.depthKey(Vec3f(faceX, gy + 0.5f, 2f))
                commands += DrawCommand(DrawLayer.BLOCK, archDk, 2, "${id}_arch_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, 3f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, 3f, ox, oy), wTop))
                commands += DrawCommand(DrawLayer.BLOCK, archDk, 1, "${id}_arch_face",
                    IsoProjector.toScreen(Vec3f(faceX, gy, 2f)) + offset,
                    DrawPayload.DitheredPath(blockFaceRight(gx, gy, 2f, ox, oy), wFR1, wFR2, horizontal = true))

                // Arch curve line
                if (isLast) {
                    val ay0 = gy - 1f; val ay1 = gy + 1f
                    for (i in 0 until 8) {
                        val t0 = i / 8f; val t1 = (i + 1) / 8f
                        val cy0 = ay0 + t0 * 2f; val cz0 = kotlin.math.sin(t0 * kotlin.math.PI).toFloat() * 1.5f
                        val cy1 = ay0 + t1 * 2f; val cz1 = kotlin.math.sin(t1 * kotlin.math.PI).toFloat() * 1.5f
                        val p0 = pt(faceX, cy0, cz0, ox, oy)
                        val p1 = pt(faceX, cy1, cz1, ox, oy)
                        commands += DrawCommand(DrawLayer.BLOCK, archDk, 3, "${id}_curve_$i",
                            Vec2f(p0.x, p0.y),
                            DrawPayload.Line(p0.x, p0.y, p1.x, p1.y, wTop, 2.5f))
                    }
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
                ExitSide.NORTH,
                northExitTarget)
            else wallBlockNorth(x.toFloat(), 0f)
        }
        // West wall (gx=0): draw only east-facing inner face + top
        for (y in 1 until d - 1) {
            if (y in westGaps) doorArchway(0f, y.toFloat(),
                westGaps.minOrNull() == y,
                westGaps.maxOrNull() == y,
                ExitSide.WEST,
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
        val bob = (kotlin.math.sin(state.time.tick.toDouble() * 0.10472) * 1.5).toFloat()
        val ox = screen.x
        val oy = screen.y

        // ── Transformation energy burst ─────────────────────────────────────────────
        if (transforming) {
            val tick = state.time.tick
            for (ri in 0..2) {
                val ringPhase = ((tick + ri * 20L) % 60).toFloat() / 60f
                val ringSize = (16f + ringPhase * 48f)
                val ringAlpha = ((1f - ringPhase) * 0xCC).toInt()
                val ringColor = (ringAlpha shl 24) or 0x8844CC
                commands += DrawCommand(DrawLayer.EFFECT, dk, 10 + ri, "transform_ring_$ri",
                    Vec2f(ox - ringSize, oy - 30f - ringSize / 2f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(ox,              oy - 30f - ringSize),
                        Vec2f(ox + ringSize,   oy - 30f),
                        Vec2f(ox,              oy - 30f + ringSize / 2f),
                        Vec2f(ox - ringSize,   oy - 30f),
                    ), ringColor))
            }
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

        // Character center X (anchor at feet)
        val cx = ox

        // ── Colors ──────────────────────────────────────────────────────────────────
        val blinkColor = ZXPalette.B_RED
        val skinColor = if (blinking) blinkColor else 0xFF_E8C880.toInt()  // warm skin
        val tunicColor = if (blinking) blinkColor else
            if (isWerewulf) ZXPalette.WOLF_FUR else 0xFF_C8B040.toInt()  // yellow-green tunic
        val tunicDark = if (isWerewulf) ZXPalette.WOLF_DARK else 0xFF_8A7828.toInt()
        val bootColor = if (isWerewulf) ZXPalette.WOLF_DARK else 0xFF_6A5A30.toInt()
        val hatColor = if (blinking) blinkColor else 0xFF_CCCCCC.toInt()  // silver-white helmet
        val hatBand = 0xFF_888888.toInt()

        // ── Walk cycle ──────────────────────────────────────────────────────────────
        val isMoving = player.movementState == MovementState.WALKING
        val walkFrame = if (isMoving) ((state.time.tick * 0.25f).toInt() % 4) else 0
        val isAirborne = player.airborne
        val leftLegFwd  = if (walkFrame == 1) -4f else if (walkFrame == 3)  4f else 0f
        val rightLegFwd = if (walkFrame == 1)  4f else if (walkFrame == 3) -4f else 0f
        val legHeightMul = if (isAirborne) 0.7f else 1.0f

        // ── Shadow ───────────────────────────────────────────────────────────────────
        val shadowW = if (isAirborne) 20f else 28f
        val shadowH = if (isAirborne) 6f else 8f
        commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "player_shadow",
            Vec2f(cx - shadowW / 2f, oy - shadowH / 2f),
            DrawPayload.ColorOval(shadowW, shadowH, 0x50_000000.toInt()))

        if (!isWerewulf) {
            // ════════════════════════════════════════════════════════════════════════
            // HUMAN FORM — Sabreman: pith helmet explorer
            // ════════════════════════════════════════════════════════════════════════
            val legH = 12f * legHeightMul

            // Boots (left / right) — chunky
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
                Vec2f(cx - 9f, oy - legH + leftLegFwd + bob),
                DrawPayload.ColorRect(8f, legH, bootColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
                Vec2f(cx + 1f, oy - legH + rightLegFwd + bob),
                DrawPayload.ColorRect(8f, legH, bootColor))

            // Tunic body — wide, stocky
            val bodyTop = oy - 42f + bob
            val bodyBot = oy - 12f + bob
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_body",
                Vec2f(cx - 12f, bodyTop),
                DrawPayload.ColorRect(24f, bodyBot - bodyTop, tunicColor))
            // Darker side shadow on tunic
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_body_shade",
                Vec2f(cx + 6f, bodyTop),
                DrawPayload.ColorRect(6f, bodyBot - bodyTop, tunicDark))
            // Belt
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_belt",
                Vec2f(cx - 12f, oy - 20f + bob),
                DrawPayload.ColorRect(24f, 3f, 0xFF_6A4A20.toInt()))
            // Belt buckle
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_buckle",
                Vec2f(cx - 2f, oy - 21f + bob),
                DrawPayload.ColorOval(5f, 4f, 0xFF_CCAA44.toInt()))

            // Blue shorts — below the belt, above the boots
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_shorts",
                Vec2f(cx - 10f, oy - 17f + bob),
                DrawPayload.ColorRect(20f, 6f, 0xFF_3A5A8A.toInt()))

            // Arms — thick, with swing
            val armTop = oy - 38f + bob
            val armBot = oy - 22f + bob
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 18f, armTop + leftLegFwd * 0.5f),
                DrawPayload.ColorRect(6f, armBot - armTop, tunicColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 12f, armTop + rightLegFwd * 0.5f),
                DrawPayload.ColorRect(6f, armBot - armTop, tunicColor))
            // Hands — visible skin
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_l",
                Vec2f(cx - 18f, armBot + leftLegFwd * 0.5f - 1f),
                DrawPayload.ColorOval(6f, 5f, skinColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_r",
                Vec2f(cx + 12f, armBot + rightLegFwd * 0.5f - 1f),
                DrawPayload.ColorOval(6f, 5f, skinColor))

            // Neck
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_neck",
                Vec2f(cx - 4f, oy - 48f + bob),
                DrawPayload.ColorRect(8f, 7f, skinColor))

            // Face — round, expressive
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_face",
                Vec2f(cx - 8f, oy - 58f + bob),
                DrawPayload.ColorOval(16f, 12f, skinColor))

            // Eyes — visible dark dots
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
                "EAST", "NORTHEAST", "SOUTHEAST" -> 3f
                else -> 0f
            }
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(cx - 4f + facingShift, oy - 54f + bob),
                DrawPayload.ColorOval(3f, 3f, ZXPalette.BLACK))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(cx + 2f + facingShift, oy - 54f + bob),
                DrawPayload.ColorOval(3f, 3f, ZXPalette.BLACK))

            // Pith helmet — large, iconic
            // Dome
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_hat_dome",
                Vec2f(cx - 10f, oy - 68f + bob),
                DrawPayload.ColorOval(20f, 14f, hatColor))
            // Brim — wide
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_hat_brim",
                Vec2f(cx - 13f, oy - 58f + bob),
                DrawPayload.ColorOval(26f, 6f, hatColor))
            // Hat band — dark stripe
            commands += DrawCommand(DrawLayer.PLAYER, dk, 7, "player_hat_band",
                Vec2f(cx - 10f, oy - 60f + bob),
                DrawPayload.ColorRect(20f, 2f, hatBand))
            // Hat highlight
            commands += DrawCommand(DrawLayer.PLAYER, dk, 7, "player_hat_hl",
                Vec2f(cx - 4f, oy - 66f + bob),
                DrawPayload.ColorOval(8f, 3f, 0xFF_EEEEEE.toInt()))
        } else {
            // ════════════════════════════════════════════════════════════════════════
            // WEREWOLF FORM — large hunched grey beast (matching reference)
            // ════════════════════════════════════════════════════════════════════════
            val ws = 1.4f
            val legH = 12f * legHeightMul
            val furColor = if (blinking) blinkColor else 0xFF_7A7A88.toInt()  // grey wolf
            val furDark = 0xFF_4A4A58.toInt()  // dark grey shadow

            // Hind legs — larger
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
                Vec2f(cx - 10f, oy - legH + leftLegFwd + bob),
                DrawPayload.ColorRect(7f, legH, furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
                Vec2f(cx + 3f, oy - legH + rightLegFwd + bob),
                DrawPayload.ColorRect(7f, legH, furDark))

            // Hunched body — wider and taller
            val bodyTop = oy - 40f + bob
            val bodyBot = oy - 10f + bob
            val bodyPts = listOf(
                Vec2f(cx - 12f * ws, bodyTop),
                Vec2f(cx + 12f * ws, bodyTop),
                Vec2f(cx + 10f * ws, bodyBot),
                Vec2f(cx - 10f * ws, bodyBot),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_body",
                Vec2f(cx - 12f * ws, bodyTop),
                DrawPayload.ColorPath(bodyPts, furColor, furDark))

            // Fur texture lines
            for (i in 0..4) {
                val fy = bodyTop + (bodyBot - bodyTop) * i / 5f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fur_$i",
                    Vec2f(cx - 8f, fy),
                    DrawPayload.Line(cx - 8f, fy, cx + 8f, fy, furDark, 0.8f))
            }

            // Front legs / arms
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 14f * ws, bodyTop + 4f + leftLegFwd * 0.5f),
                DrawPayload.ColorRect(4f, 12f, furColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 10f * ws, bodyTop + 4f + rightLegFwd * 0.5f),
                DrawPayload.ColorRect(4f, 12f, furColor))

            // Claws
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_claw_l",
                Vec2f(cx - 15f * ws, bodyTop + 16f + leftLegFwd * 0.5f),
                DrawPayload.ColorOval(5f, 3f, 0xFF_AAAAAA.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_claw_r",
                Vec2f(cx + 10f * ws, bodyTop + 16f + rightLegFwd * 0.5f),
                DrawPayload.ColorOval(5f, 3f, 0xFF_AAAAAA.toInt()))

            // Wolf head — large, forward-pointing
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_head",
                Vec2f(cx - 10f, oy - 52f + bob),
                DrawPayload.ColorOval(20f, 16f, furColor))

            // Snout
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -4f
                "EAST", "NORTHEAST", "SOUTHEAST" -> 4f
                else -> 0f
            }
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_snout",
                Vec2f(cx - 5f + facingShift, oy - 46f + bob),
                DrawPayload.ColorOval(10f, 7f, furDark))

            // Eyes — white glowing
            val eyeColor = if (blinking) blinkColor else ZXPalette.B_WHITE
            // Eyes — red glowing
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(cx - 5f + facingShift, oy - 50f + bob),
                DrawPayload.ColorOval(3f, 3f, eyeColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(cx + 2f + facingShift, oy - 50f + bob),
                DrawPayload.ColorOval(3f, 3f, eyeColor))

            // Pointed ears — tall, distinctive
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_l",
                Vec2f(cx - 10f, oy - 58f + bob), DrawPayload.ColorPath(listOf(
                    Vec2f(cx - 10f, oy - 50f + bob),
                    Vec2f(cx - 5f, oy - 50f + bob),
                    Vec2f(cx - 7f, oy - 62f + bob),
                ), furColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_r",
                Vec2f(cx + 5f, oy - 58f + bob), DrawPayload.ColorPath(listOf(
                    Vec2f(cx + 5f, oy - 50f + bob),
                    Vec2f(cx + 10f, oy - 50f + bob),
                    Vec2f(cx + 8f, oy - 62f + bob),
                ), furColor))

            // Fangs
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_fang_l",
                Vec2f(cx - 3f + facingShift, oy - 43f + bob),
                DrawPayload.ColorRect(2f, 4f, 0xFF_DDDDDD.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_fang_r",
                Vec2f(cx + 2f + facingShift, oy - 43f + bob),
                DrawPayload.ColorRect(2f, 4f, 0xFF_DDDDDD.toInt()))

            // Tail
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail",
                Vec2f(cx + 10f, oy - 14f + bob), DrawPayload.ColorPath(listOf(
                    Vec2f(cx + 10f * ws, oy - 16f + bob),
                    Vec2f(cx + 20f * ws, oy - 24f + bob),
                    Vec2f(cx + 18f * ws, oy - 20f + bob),
                ), furColor))
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
