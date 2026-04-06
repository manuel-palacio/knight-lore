package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.geometry.TileMetrics
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
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
        const val FLOOR         = 0xFF_3A3A4A.toInt()   // dark slate
        const val SOLID_BLOCK   = 0xFF_5A5A6A.toInt()   // medium grey
        const val HAZARD        = 0xFF_CC3300.toInt()   // danger red
        const val PLAYER_HUMAN  = 0xFF_44BB88.toInt()   // teal-green
        const val PLAYER_WOLF   = 0xFF_8844CC.toInt()   // purple
        const val ITEM          = 0xFF_FFDD44.toInt()   // gold yellow
        const val ACTOR         = 0xFF_FF6644.toInt()   // orange-red
    }

    /** Tile size in pixels for placeholder block rendering. */
    private val BLOCK_W = TileMetrics.TILE_WIDTH     // 64px
    private val BLOCK_H = TileMetrics.TILE_HEIGHT    // 32px

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
            val screen = IsoProjector.toScreen(world) + offset
            val (layer, color) = when (tile.type) {
                TileType.FLOOR        -> DrawLayer.FLOOR to Colors.FLOOR
                TileType.SOLID_BLOCK  -> DrawLayer.BLOCK to Colors.SOLID_BLOCK
                TileType.HAZARD       -> DrawLayer.FLOOR to Colors.HAZARD
                TileType.EMPTY        -> return@forEach  // skip empty
            }
            commands += DrawCommand(
                layer = layer,
                depthKey = IsoProjector.depthKey(world),
                entityId = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}",
                screenPos = screen,
                payload = DrawPayload.ColorRect(BLOCK_W, BLOCK_H, color),
            )
        }

        // 2. Items in the current room
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

        // 3. Actors
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

        // 4. Player
        val playerColor = if (state.player.form == Form.HUMAN) Colors.PLAYER_HUMAN else Colors.PLAYER_WOLF
        val playerScreen = IsoProjector.toScreen(state.player.position) + offset
        commands += DrawCommand(
            layer = DrawLayer.PLAYER,
            depthKey = IsoProjector.depthKey(state.player.position),
            entityId = "player",
            screenPos = playerScreen,
            payload = DrawPayload.ColorRect(32f, 64f, playerColor),
        )

        return DrawCommandBuilder.sort(commands)
    }
}
