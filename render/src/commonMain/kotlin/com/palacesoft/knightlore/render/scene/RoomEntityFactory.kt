package com.palacesoft.knightlore.render.scene

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
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.TransformPhase
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
        const val WALL_TOP       = MID_STONE
        const val WALL_LEFT      = DARK_STONE
        const val WALL_RIGHT     = 0xFF_141422.toInt()  // slightly darker than DARK_STONE
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

                    // Base stone tile — dithered checkerboard
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id,
                        IsoProjector.toScreen(world) + offset,
                        DrawPayload.DitheredPath(jitteredPts, 0xFF_16161E.toInt(), 0xFF_252535.toInt()))

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
                    val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
                    val dk = IsoProjector.depthKey(footWorld)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"

                    // Top face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), Colors.BLOCK_TOP, 0xFF_0A0A14.toInt()))
                    // Left face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
                        DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), Colors.BLOCK_LEFT, 0xFF_0A0A14.toInt()))
                    // Right face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
                        DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), Colors.BLOCK_RIGHT, 0xFF_0A0A14.toInt()))

                    // Carved cross on top face (4-point cross along iso axes)
                    val crossColor = Colors.BLOCK_CROSS
                    val cH1 = pt(gx + 0.2f, gy + 0.5f, gz + 1f, ox, oy)
                    val cH2 = pt(gx + 0.8f, gy + 0.5f, gz + 1f, ox, oy)
                    val cV1 = pt(gx + 0.5f, gy + 0.2f, gz + 1f, ox, oy)
                    val cV2 = pt(gx + 0.5f, gy + 0.8f, gz + 1f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_cross_h",
                        Vec2f(cH1.x, cH1.y),
                        DrawPayload.Line(cH1.x, cH1.y, cH2.x, cH2.y, crossColor, 1.5f))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_cross_v",
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
        buildWalls(room, offset, commands)

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

        // 8. Dark dungeon atmosphere overlay (drawn in HUD group = over scene, under HUD text)
        commands += DrawCommand(DrawLayer.HUD, 0, -999, "dungeon_overlay",
            Vec2f(0f, 0f), DrawPayload.ScreenFill(0x33_000000.toInt()))

        // 9. Vignette: 4 dark edge rects to give torchlight feel
        commands += DrawCommand(DrawLayer.HUD, 0, -998, "vignette_top",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW, viewportH * 0.28f, 0x60_000000.toInt()))
        commands += DrawCommand(DrawLayer.HUD, 0, -997, "vignette_bot",
            Vec2f(0f, viewportH * 0.72f), DrawPayload.ColorRect(viewportW, viewportH * 0.28f, 0x60_000000.toInt()))
        commands += DrawCommand(DrawLayer.HUD, 0, -996, "vignette_lft",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW * 0.22f, viewportH, 0x50_000000.toInt()))
        commands += DrawCommand(DrawLayer.HUD, 0, -995, "vignette_rgt",
            Vec2f(viewportW * 0.78f, 0f), DrawPayload.ColorRect(viewportW * 0.22f, viewportH, 0x50_000000.toInt()))

        return DrawCommandBuilder.sort(commands)
    }

    // ── Wall building ────────────────────────────────────────────────────────

    private fun buildWalls(
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
    ) {
        val w = room.width
        val d = room.depth
        val ox = offset.x; val oy = offset.y

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

                // Top face
                commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), Colors.WALL_TOP))
                // South-facing inner face (blockFaceLeft = y+1 face)
                commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                    IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                    DrawPayload.ColorPath(blockFaceLeft(gx, gy, bz, ox, oy), Colors.WALL_LEFT))

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

                // Moss patch (~1 in 7 wall columns, only on lower block)
                if (!isTop && (gx.toInt() * 5 + gy.toInt() * 9) % 7 == 0) {
                    val moss = pt(gx + 0.35f, gy + 1f, bz + 0.3f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_moss",
                        Vec2f(moss.x - 4f, moss.y - 3f),
                        DrawPayload.ColorOval(9f, 6f, Colors.WALL_MOSS))
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

                // Top face
                commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), Colors.WALL_TOP))
                // East-facing inner face (blockFaceRight = x+1 face)
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                    IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                    DrawPayload.ColorPath(blockFaceRight(gx, gy, bz, ox, oy), Colors.WALL_RIGHT))

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
            }
        }

        fun doorArchway(gx: Float, gy: Float, isFirst: Boolean, isLast: Boolean) {
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
                        ), Colors.WALL_TOP))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 1, "${pid}_left",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx,        gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx,        gy + 1f, bz + 1f, ox, oy),
                        ), Colors.WALL_LEFT))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 0, "${pid}_right",
                        IsoProjector.toScreen(Vec3f(gx + 0.3f, gy, bz)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx + 0.3f, gy,      bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz,      ox, oy),
                            pt(gx + 0.3f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.3f, gy,      bz + 1f, ox, oy),
                        ), Colors.WALL_RIGHT))
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
                        ), Colors.WALL_TOP))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 1, "${pid}_left",
                        IsoProjector.toScreen(Vec3f(gx + 0.7f, gy + 1f, bz)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx + 0.7f, gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz,      ox, oy),
                            pt(gx + 1f,   gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 0.7f, gy + 1f, bz + 1f, ox, oy),
                        ), Colors.WALL_LEFT))
                    commands += DrawCommand(DrawLayer.BLOCK, pdk, 0, "${pid}_right",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                        DrawPayload.ColorPath(listOf(
                            pt(gx + 1f, gy,      bz,      ox, oy),
                            pt(gx + 1f, gy + 1f, bz,      ox, oy),
                            pt(gx + 1f, gy + 1f, bz + 1f, ox, oy),
                            pt(gx + 1f, gy,      bz + 1f, ox, oy),
                        ), Colors.WALL_RIGHT))
                }

                // 6. If isLast: threshold glow line at z=0 across gap width
                val g1 = pt(openLeft,  gy + 1f, 0f, ox, oy)
                val g2 = pt(openRight, gy + 1f, 0f, ox, oy)
                val glowColor = (0x66_3A3A60.toInt())
                commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_glow_line",
                    Vec2f(g1.x, g1.y),
                    DrawPayload.Line(g1.x, g1.y, g2.x, g2.y, glowColor, 1f))
            }
        }

        // North wall (gy=0): draw only south-facing inner face + top
        for (x in 0 until w) {
            if (x in northGaps) doorArchway(x.toFloat(), 0f,
                northGaps.minOrNull() == x,
                northGaps.maxOrNull() == x)
            else wallBlockNorth(x.toFloat(), 0f)
        }
        // West wall (gx=0): draw only east-facing inner face + top
        for (y in 1 until d - 1) {
            if (y in westGaps) doorArchway(0f, y.toFloat(),
                westGaps.minOrNull() == y,
                westGaps.maxOrNull() == y)
            else wallBlockWest(0f, y.toFloat())
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
        val gx = enemy.position.x - 0.5f
        val gy = enemy.position.y - 0.5f
        val gz = 0f
        val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
        val dk = IsoProjector.depthKey(footWorld)
        val id = "patrol_${enemy.id}"

        commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
            IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
            DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), Colors.GOBLIN_TOP))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
            IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
            DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), Colors.GOBLIN_LEFT))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
            IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
            DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), Colors.GOBLIN_RIGHT))
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
                // Tall dark-red rectangle
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 6f, cy - 28f),
                    DrawPayload.ColorRect(12f, 28f, 0xFF_8B0000.toInt()))
                // Shoulder left
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_sh_l",
                    Vec2f(cx - 11f, cy - 28f),
                    DrawPayload.ColorRect(5f, 5f, 0xFF_8B0000.toInt()))
                // Shoulder right
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_sh_r",
                    Vec2f(cx + 6f, cy - 28f),
                    DrawPayload.ColorRect(5f, 5f, 0xFF_8B0000.toInt()))
                // Visor slit
                val v1x = cx - 5f; val v1y = cy - 24f
                val v2x = cx + 5f; val v2y = cy - 24f
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_visor",
                    Vec2f(v1x, v1y),
                    DrawPayload.Line(v1x, v1y, v2x, v2y, 0xFF_FF4400.toInt(), 1.5f))
            }
            ActorType.GHOST -> {
                // Tall oval at alpha 180
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 8f, cy - 32f),
                    DrawPayload.ColorOval(16f, 32f, 0xB4_AAAAEE.toInt()))
                // Faint trail below
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_trail",
                    Vec2f(cx - 6f, cy - 20f),
                    DrawPayload.ColorOval(12f, 20f, 0x50_AAAAEE.toInt()))
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
                // Red eye
                commands += DrawCommand(DrawLayer.ACTOR, rdk, 3, "${id}_eye",
                    Vec2f(cx - 2f, cy - 10f),
                    DrawPayload.ColorOval(4f, 3f, 0xFF_FF0000.toInt()))
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
            }
            ActorType.BALL -> {
                // Orange circle
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 10f, cy - 10f),
                    DrawPayload.ColorOval(20f, 20f, 0xFF_CC4400.toInt()))
                // Spin line that rotates based on tick
                val angle = (tick % 60).toDouble() / 60.0 * 2.0 * kotlin.math.PI
                val spinX1 = cx + (kotlin.math.cos(angle) * 8.0).toFloat()
                val spinY1 = cy - (kotlin.math.sin(angle) * 8.0).toFloat()
                val spinX2 = cx - (kotlin.math.cos(angle) * 8.0).toFloat()
                val spinY2 = cy + (kotlin.math.sin(angle) * 8.0).toFloat()
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

        val bob = (kotlin.math.sin(state.time.tick.toDouble() * 0.10472) * 2.0).toFloat()

        // Origin at screen.x, screen.y (feet position)
        val ox = screen.x
        val oy = screen.y

        val cloakColor = when {
            blinking -> 0xFF_FF4444.toInt()
            isWerewulf -> 0xFF_2A0A4A.toInt()
            else -> 0xFF_1A0A2A.toInt()
        }
        val eyeColor = when {
            blinking -> 0xFF_FF4444.toInt()
            isWerewulf -> 0xFF_FF4400.toInt()
            else -> 0xFF_7FFF00.toInt()
        }
        val skinColor = if (blinking) 0xFF_FF4444.toInt() else 0xFF_C8A882.toInt()

        // Width scale: werewulf is 10% wider
        val ws = if (isWerewulf) 1.1f else 1.0f

        // Main cloak silhouette — isometric trapezoid shape
        val cloakPts = listOf(
            Vec2f(ox + 12f * ws, oy - 68f + bob),   // top-center (hood peak)
            Vec2f(ox + 2f * ws,  oy - 58f + bob),   // hood left
            Vec2f(ox - 2f * ws,  oy - 44f + bob),   // shoulder left
            Vec2f(ox - 8f * ws,  oy - 20f + bob),   // cloak flare left
            Vec2f(ox - 4f * ws,  oy +  0f + bob),   // hem left
            Vec2f(ox + 28f * ws, oy +  0f + bob),   // hem right
            Vec2f(ox + 32f * ws, oy - 20f + bob),   // cloak flare right
            Vec2f(ox + 26f * ws, oy - 44f + bob),   // shoulder right
            Vec2f(ox + 22f * ws, oy - 58f + bob),   // hood right
        )
        commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_cloak",
            Vec2f(ox, oy), DrawPayload.ColorPath(cloakPts, cloakColor))

        // Inner highlight (slightly inset cloak outline)
        val innerColor = if (isWerewulf) 0xFF_3A1A5A.toInt() else 0xFF_2A1040.toInt()
        val innerPts = cloakPts.map { Vec2f(it.x + 1.5f, it.y + 1f) }
        commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_cloak_inner",
            Vec2f(ox, oy), DrawPayload.ColorPath(innerPts, innerColor))

        // Werewulf ear triangles at hood peak
        if (isWerewulf) {
            val earL = listOf(
                Vec2f(ox + 6f,  oy - 68f + bob),
                Vec2f(ox + 10f, oy - 76f + bob),
                Vec2f(ox + 14f, oy - 68f + bob),
            )
            val earR = listOf(
                Vec2f(ox + 14f, oy - 68f + bob),
                Vec2f(ox + 18f, oy - 76f + bob),
                Vec2f(ox + 22f, oy - 68f + bob),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_l",
                Vec2f(ox, oy), DrawPayload.ColorPath(earL, cloakColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_r",
                Vec2f(ox, oy), DrawPayload.ColorPath(earR, cloakColor))
        }

        // Face oval
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_face",
            Vec2f(ox + 6f * ws, oy - 58f + bob), DrawPayload.ColorOval(14f * ws, 10f, skinColor))

        // Eyes (shift left/right by 3px based on facing)
        val facingShift = when (player.facing.name) {
            "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
            "EAST", "NORTHEAST", "SOUTHEAST" -> 3f
            else -> 0f
        }
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_eye_l",
            Vec2f(ox + 8f * ws + facingShift, oy - 53f + bob), DrawPayload.ColorOval(3f, 2f, eyeColor))
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_eye_r",
            Vec2f(ox + 14f * ws + facingShift, oy - 53f + bob), DrawPayload.ColorOval(3f, 2f, eyeColor))

        // Left edge highlight
        val edgePts = listOf(
            Vec2f(ox + 2f * ws,  oy - 58f + bob),
            Vec2f(ox - 2f * ws,  oy - 44f + bob),
            Vec2f(ox - 8f * ws,  oy - 20f + bob),
            Vec2f(ox - 4f * ws,  oy +  0f + bob),
        )
        val edgeColor = if (isWerewulf) 0xFF_5A2A8A.toInt() else 0xFF_3A1A5A.toInt()
        commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_edge",
            Vec2f(ox, oy), DrawPayload.ColorPath(edgePts, edgeColor))
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
