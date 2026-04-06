package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.render.iso.IsoProjector

/**
 * Converts the current GameState + GameContent into a flat list of DrawCommands
 * for the current room.
 *
 * This is a pure function (no side effects, no Android dependencies beyond the
 * DrawCommand/DrawPayload types). The renderer executes the commands; this factory
 * only produces them.
 */
object RoomEntityFactory {

    /** Placeholder colors for each entity type (Phase 4). Replace with sprites in Phase 5. */
    private object Colors {
        const val FLOOR              = 0xFF_2A2A3A.toInt()   // dark blue-gray
        const val SOLID_BLOCK_TOP    = 0xFF_6A6A7A.toInt()   // lighter
        const val SOLID_BLOCK_LEFT   = 0xFF_4A4A5A.toInt()   // medium
        const val SOLID_BLOCK_RIGHT  = 0xFF_3A3A4A.toInt()   // darkest (shadow)
        const val HAZARD             = 0xFF_CC3300.toInt()   // danger red
        const val PLAYER_HUMAN       = 0xFF_44BB88.toInt()   // teal-green
        const val PLAYER_WOLF        = 0xFF_8844CC.toInt()   // purple
        const val ITEM               = 0xFF_FFDD44.toInt()   // gold yellow
        const val ACTOR              = 0xFF_FF6644.toInt()   // orange-red
        const val DOOR_TOP           = 0xFF_CC9944.toInt()   // golden top
        const val DOOR_LEFT          = 0xFF_AA7722.toInt()   // darker left
        const val DOOR_RIGHT         = 0xFF_886611.toInt()   // darkest right
    }

    // Returns the 4 corners of an isometric floor diamond at (gx, gy, gz) + offset
    private fun floorDiamond(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> {
        fun s(x: Float, y: Float, z: Float) = IsoProjector.toScreen(Vec3f(x, y, z))
        val tl = s(gx,      gy,      gz)
        val tr = s(gx + 1f, gy,      gz)
        val br = s(gx + 1f, gy + 1f, gz)
        val bl = s(gx,      gy + 1f, gz)
        return listOf(
            Vec2f(ox + tl.x, oy + tl.y),
            Vec2f(ox + tr.x, oy + tr.y),
            Vec2f(ox + br.x, oy + br.y),
            Vec2f(ox + bl.x, oy + bl.y),
        )
    }

    // Left face of a 1×1×1 block at (gx, gy, gz): bottom-y face
    private fun blockFaceLeft(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> {
        fun s(x: Float, y: Float, z: Float) = IsoProjector.toScreen(Vec3f(x, y, z))
        val bl0 = s(gx,      gy + 1f, gz)
        val br0 = s(gx + 1f, gy + 1f, gz)
        val br1 = s(gx + 1f, gy + 1f, gz + 1f)
        val bl1 = s(gx,      gy + 1f, gz + 1f)
        return listOf(
            Vec2f(ox + bl0.x, oy + bl0.y),
            Vec2f(ox + br0.x, oy + br0.y),
            Vec2f(ox + br1.x, oy + br1.y),
            Vec2f(ox + bl1.x, oy + bl1.y),
        )
    }

    // Right face: right-x face
    private fun blockFaceRight(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> {
        fun s(x: Float, y: Float, z: Float) = IsoProjector.toScreen(Vec3f(x, y, z))
        val tr0 = s(gx + 1f, gy,      gz)
        val br0 = s(gx + 1f, gy + 1f, gz)
        val br1 = s(gx + 1f, gy + 1f, gz + 1f)
        val tr1 = s(gx + 1f, gy,      gz + 1f)
        return listOf(
            Vec2f(ox + tr0.x, oy + tr0.y),
            Vec2f(ox + br0.x, oy + br0.y),
            Vec2f(ox + br1.x, oy + br1.y),
            Vec2f(ox + tr1.x, oy + tr1.y),
        )
    }

    fun build(
        state: GameState,
        content: GameContent,
        viewportW: Float,
        viewportH: Float,
    ): List<DrawCommand> {
        val room = content.rooms[state.currentRoomId] ?: return emptyList()
        val offset = IsoProjector.roomOffset(room.width, room.depth, viewportW, viewportH)
        val commands = mutableListOf<DrawCommand>()

        // 1. Floor and block tiles
        room.tiles.forEach { tile ->
            val world = Vec3f(tile.gridX.toFloat(), tile.gridY.toFloat(), tile.gridZ.toFloat())
            val ox = offset.x; val oy = offset.y
            when (tile.type) {
                TileType.FLOOR -> {
                    val pts = floorDiamond(world.x, world.y, world.z, ox, oy)
                    commands += DrawCommand(
                        layer = DrawLayer.FLOOR,
                        depthKey = IsoProjector.depthKey(world),
                        entityId = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}",
                        screenPos = IsoProjector.toScreen(world) + offset,
                        payload = DrawPayload.ColorPath(pts, Colors.FLOOR),
                    )
                }
                TileType.SOLID_BLOCK -> {
                    val bx = tile.gridX.toFloat()
                    val by = tile.gridY.toFloat()
                    val bz = tile.gridZ.toFloat()
                    val footWorld = Vec3f(bx + 0.5f, by + 1f, bz)
                    val dk = IsoProjector.depthKey(footWorld)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"

                    // Top face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(bx, by, bz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(bx, by, bz + 1f, ox, oy), Colors.SOLID_BLOCK_TOP))
                    // Left face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                        IsoProjector.toScreen(Vec3f(bx, by + 1f, bz)) + offset,
                        DrawPayload.ColorPath(blockFaceLeft(bx, by, bz, ox, oy), Colors.SOLID_BLOCK_LEFT))
                    // Right face
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                        IsoProjector.toScreen(Vec3f(bx + 1f, by, bz)) + offset,
                        DrawPayload.ColorPath(blockFaceRight(bx, by, bz, ox, oy), Colors.SOLID_BLOCK_RIGHT))
                }
                TileType.HAZARD -> {
                    val screen = IsoProjector.toScreen(world) + offset
                    commands += DrawCommand(
                        layer = DrawLayer.FLOOR,
                        depthKey = IsoProjector.depthKey(world),
                        entityId = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}",
                        screenPos = screen,
                        payload = DrawPayload.ColorPath(
                            floorDiamond(world.x, world.y, world.z, ox, oy),
                            Colors.HAZARD,
                        ),
                    )
                }
                TileType.EMPTY -> return@forEach  // skip empty
            }
        }

        // 2. Perimeter walls (generated from room boundaries)
        buildWalls(room, offset, commands)

        // 3. Items in the current room
        state.itemInstances
            .filterIsInstance<ItemInstance>()
            .forEach { item ->
                val loc = item.location as? ItemLocation.InRoom ?: return@forEach
                if (loc.roomId != state.currentRoomId) return@forEach
                val world = loc.position
                val screen = IsoProjector.toScreen(world) + offset
                commands += DrawCommand(
                    layer = DrawLayer.ITEM,
                    depthKey = IsoProjector.depthKey(world),
                    entityId = "item_${item.id.value}",
                    screenPos = screen,
                    payload = DrawPayload.ColorOval(24f, 16f, Colors.ITEM),
                )
            }

        // 4. Actors
        state.actorStates.forEach { actor ->
            val screen = IsoProjector.toScreen(actor.position) + offset
            commands += DrawCommand(
                layer = DrawLayer.ACTOR,
                depthKey = IsoProjector.depthKey(actor.position),
                entityId = "actor_${actor.id.value}",
                screenPos = screen,
                payload = DrawPayload.ColorRect(32f, 48f, Colors.ACTOR),
            )
        }

        // 5. Player — multi-part procedurally drawn character
        val player = state.player
        val playerColor = resolvePlayerColor(player)
        val playerScreen = IsoProjector.toScreen(state.player.position) + offset

        // Bob animation: gentle up-down sine using tick
        val bobOffset = kotlin.math.sin(state.time.tick * 0.12) * 3f

        // Cloak body (dark, tall)
        val cloakColor = if (playerColor == Colors.PLAYER_HUMAN) 0xFF_1A3A2A.toInt() else 0xFF_1A0A2A.toInt()
        commands += DrawCommand(
            layer = DrawLayer.PLAYER, depthKey = IsoProjector.depthKey(state.player.position) - 1,
            entityId = "player_cloak",
            screenPos = playerScreen,
            payload = DrawPayload.ColorRect(24f, 52f, cloakColor),
        )

        // Head (small oval, pale skin)
        val headX = playerScreen.x + 4f
        val headY = playerScreen.y - 52f + bobOffset.toFloat()
        commands += DrawCommand(
            layer = DrawLayer.PLAYER, depthKey = IsoProjector.depthKey(state.player.position),
            entityId = "player_head",
            screenPos = Vec2f(headX, headY),
            payload = DrawPayload.ColorOval(16f, 14f, 0xFF_EEC9A0.toInt()),
        )

        // Hood (colored triangle over head)
        val hoodColor = playerColor
        val hoodPts = listOf(
            Vec2f(playerScreen.x + 2f, (playerScreen.y - 62f + bobOffset).toFloat()),
            Vec2f(playerScreen.x + 22f, (playerScreen.y - 62f + bobOffset).toFloat()),
            Vec2f(playerScreen.x + 12f, (playerScreen.y - 72f + bobOffset).toFloat()),
        )
        commands += DrawCommand(
            layer = DrawLayer.PLAYER, depthKey = IsoProjector.depthKey(state.player.position) + 1,
            entityId = "player_hood",
            screenPos = Vec2f(playerScreen.x, (playerScreen.y - 70f + bobOffset).toFloat()),
            payload = DrawPayload.ColorPath(hoodPts, hoodColor),
        )

        // Eyes (tiny dark ovals based on facing direction)
        val (eyeOffsetX, eyeOffsetY) = when (state.player.facing.ordinal % 4) {
            0 -> Pair(-2f, -2f)    // north-ish
            1 -> Pair(2f, -2f)     // east-ish
            2 -> Pair(0f, 0f)      // south-ish
            else -> Pair(-2f, 0f)  // west-ish
        }
        commands += DrawCommand(
            layer = DrawLayer.PLAYER, depthKey = IsoProjector.depthKey(state.player.position) + 2,
            entityId = "player_eyes",
            screenPos = Vec2f(headX + eyeOffsetX, headY + 2f + eyeOffsetY),
            payload = DrawPayload.ColorOval(6f, 4f, 0xFF_1A1A1A.toInt()),
        )

        return DrawCommandBuilder.sort(commands)
    }

    private fun buildWalls(
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
    ) {
        val w = room.width
        val d = room.depth
        val ox = offset.x; val oy = offset.y

        // Compute door gap positions from exits
        val northGaps = mutableSetOf<Int>()   // x positions with north door gap
        val southGaps = mutableSetOf<Int>()
        val westGaps  = mutableSetOf<Int>()   // y positions with west door gap
        val eastGaps  = mutableSetOf<Int>()

        for (exit in room.exits) {
            when (exit.side) {
                ExitSide.NORTH -> { northGaps += w / 2 - 1; northGaps += w / 2 }
                ExitSide.SOUTH -> { southGaps += w / 2 - 1; southGaps += w / 2 }
                ExitSide.WEST  -> { westGaps  += d / 2 - 1; westGaps  += d / 2 }
                ExitSide.EAST  -> { eastGaps  += d / 2 - 1; eastGaps  += d / 2 }
            }
        }

        val wallTop   = 0xFF_5A5A8A.toInt()  // blue-gray top
        val wallLeft  = 0xFF_3A3A6A.toInt()  // darker left
        val wallRight = 0xFF_2A2A5A.toInt()  // darkest right

        // Helper: emit wall block (2 high: z=0..2)
        fun wallBlock(gx: Float, gy: Float, colorTop: Int, colorLeft: Int, colorRight: Int) {
            for (gz in 0 until 2) {
                val bz = gz.toFloat()
                val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
                val dk = IsoProjector.depthKey(footWorld)
                val id = "wall_${gx.toInt()}_${gy.toInt()}_$gz"
                commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), colorTop))
                commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                    IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                    DrawPayload.ColorPath(blockFaceLeft(gx, gy, bz, ox, oy), colorLeft))
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                    IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                    DrawPayload.ColorPath(blockFaceRight(gx, gy, bz, ox, oy), colorRight))
            }
        }

        // Helper: emit door marker (1 high, golden/arch color)
        fun doorBlock(gx: Float, gy: Float) {
            val bz = 0f
            val footWorld = Vec3f(gx + 0.5f, gy + 1f, bz)
            val dk = IsoProjector.depthKey(footWorld)
            val id = "door_${gx.toInt()}_${gy.toInt()}"
            commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                IsoProjector.toScreen(Vec3f(gx, gy, bz + 1f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, bz + 1f, ox, oy), Colors.DOOR_TOP))
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_left",
                IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                DrawPayload.ColorPath(blockFaceLeft(gx, gy, bz, ox, oy), Colors.DOOR_LEFT))
            commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_right",
                IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                DrawPayload.ColorPath(blockFaceRight(gx, gy, bz, ox, oy), Colors.DOOR_RIGHT))
        }

        // North wall (y=0): x = 0..w-1
        for (x in 0 until w) {
            if (x in northGaps) doorBlock(x.toFloat(), 0f)
            else wallBlock(x.toFloat(), 0f, wallTop, wallLeft, wallRight)
        }
        // South wall (y=d-1): x = 0..w-1
        for (x in 0 until w) {
            if (x in southGaps) doorBlock(x.toFloat(), (d - 1).toFloat())
            else wallBlock(x.toFloat(), (d - 1).toFloat(), wallTop, wallLeft, wallRight)
        }
        // West wall (x=0): y = 1..d-2 (skip corners already covered by north/south)
        for (y in 1 until d - 1) {
            if (y in westGaps) doorBlock(0f, y.toFloat())
            else wallBlock(0f, y.toFloat(), wallTop, wallLeft, wallRight)
        }
        // East wall (x=w-1): y = 1..d-2
        for (y in 1 until d - 1) {
            if (y in eastGaps) doorBlock((w - 1).toFloat(), y.toFloat())
            else wallBlock((w - 1).toFloat(), y.toFloat(), wallTop, wallLeft, wallRight)
        }
    }

    private fun resolvePlayerColor(player: PlayerState): Int {
        // Damage blink: alternate between normal and dim every 5 ticks when cooldown active
        val blink = player.damageCooldownTicks > 0 && (player.damageCooldownTicks % 10 < 5)
        if (blink) return 0xFF_888888.toInt()  // grey during blink frames

        return when (player.transformState.phase) {
            TransformPhase.STABLE -> {
                if (player.form == Form.HUMAN) Colors.PLAYER_HUMAN else Colors.PLAYER_WOLF
            }
            TransformPhase.TRANSFORMING_TO_WEREWULF -> {
                // Flicker between human and wolf color every 4 ticks
                if (player.transformState.progressTicks % 8 < 4) Colors.PLAYER_HUMAN else Colors.PLAYER_WOLF
            }
            TransformPhase.TRANSFORMING_TO_HUMAN -> {
                if (player.transformState.progressTicks % 8 < 4) Colors.PLAYER_WOLF else Colors.PLAYER_HUMAN
            }
            TransformPhase.RECOVERING -> 0xFF_FFAA44.toInt()  // amber during recovery
        }
    }
}
