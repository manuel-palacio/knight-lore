package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.rules.RoomProvider

private const val PICKUP_RADIUS = 1.5f

class ItemSystem(private val roomProvider: RoomProvider) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val events = mutableListOf<GameEvent>()
        var newState = state

        if (input.actionPressed) {
            newState = tryPickup(newState, events)
        }

        if (input.dropPressed) {
            newState = tryDrop(newState, events)
        }

        return SystemResult(newState, events)
    }

    private fun tryPickup(state: GameState, events: MutableList<GameEvent>): GameState {
        val player = state.player

        // Must be HUMAN and stable
        if (player.form != Form.HUMAN) return state
        if (player.transformState.phase != TransformPhase.STABLE) return state
        // Must have room in inventory
        if (player.inventory.size >= 3) return state

        // Find nearest item in current room within pickup radius
        val nearestItem = state.itemInstances
            .filter { item ->
                val loc = item.location
                loc is ItemLocation.InRoom && loc.roomId == state.currentRoomId
            }
            .minByOrNull { item ->
                val loc = item.location as ItemLocation.InRoom
                (loc.position - player.position).length()
            }
            ?.takeIf { item ->
                val loc = item.location as ItemLocation.InRoom
                (loc.position - player.position).length() <= PICKUP_RADIUS
            }
            ?: return state

        // Pick up: move item to CarriedByPlayer, add to inventory
        val updatedInstances = state.itemInstances.map { item ->
            if (item.id == nearestItem.id) item.copy(location = ItemLocation.CarriedByPlayer)
            else item
        }
        val updatedPlayer = player.copy(inventory = player.inventory + nearestItem.id)
        events += GameEvent.ItemPickedUp(nearestItem.id)

        return state.copy(
            player = updatedPlayer,
            itemInstances = updatedInstances,
        )
    }

    private fun tryDrop(state: GameState, events: MutableList<GameEvent>): GameState {
        val player = state.player
        if (player.inventory.isEmpty()) return state

        val itemId = player.inventory.first()
        val room = roomProvider.getRoom(state.currentRoomId)

        // Find nearest anchor in current room
        val dropPosition = if (room != null && room.itemAnchors.isNotEmpty()) {
            val nearestAnchor = room.itemAnchors.minByOrNull { anchor ->
                (anchor.spawnPosition - player.position).length()
            }!!
            // Anti-soft-lock: if anchor already has an item there, offset
            val anchorOccupied = state.itemInstances.any { item ->
                val loc = item.location
                loc is ItemLocation.InRoom &&
                    loc.roomId == state.currentRoomId &&
                    loc.position == nearestAnchor.spawnPosition
            }
            if (anchorOccupied) {
                nearestAnchor.spawnPosition + Vec3f(0.5f, 0f, 0f)
            } else {
                nearestAnchor.spawnPosition
            }
        } else {
            Vec3f(player.position.x, player.position.y, 1f)
        }

        val updatedInstances = state.itemInstances.map { item ->
            if (item.id == itemId) {
                item.copy(location = ItemLocation.InRoom(state.currentRoomId, dropPosition))
            } else item
        }
        val updatedPlayer = player.copy(inventory = player.inventory.drop(1))
        events += GameEvent.ItemDropped(itemId)

        return state.copy(
            player = updatedPlayer,
            itemInstances = updatedInstances,
        )
    }
}
