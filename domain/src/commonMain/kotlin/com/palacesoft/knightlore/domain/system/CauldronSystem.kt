package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.CureMode
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.rules.RoomProvider

private const val DAMAGE_COOLDOWN_TICKS = 60

class CauldronSystem(
    private val content: GameContent,
    private val roomProvider: RoomProvider? = null,
) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val events = mutableListOf<GameEvent>()
        val atCauldron = state.currentRoomId == content.progression.cauldronRoomId

        if (!atCauldron) return SystemResult(state, events)

        var newState = state

        // Werewulf hostility: apply damage when in cauldron room
        if (newState.player.form == Form.WEREWULF && newState.player.damageCooldownTicks == 0) {
            events += GameEvent.PlayerDamaged
            val newLives = newState.player.lives - 1
            if (newLives <= 0) {
                newState = newState.copy(player = newState.player.copy(lives = 0, damageCooldownTicks = DAMAGE_COOLDOWN_TICKS))
                events += GameEvent.LifeLost
                events += GameEvent.GameOver
                return SystemResult(newState, events)
            } else {
                newState = newState.copy(
                    player = newState.player.copy(lives = newLives, damageCooldownTicks = DAMAGE_COOLDOWN_TICKS)
                )
                events += GameEvent.LifeLost
            }
        }

        // Delivery: only when actionPressed, player is HUMAN, and has items
        if (!input.actionPressed) return SystemResult(newState, events)
        if (newState.player.form != Form.HUMAN) return SystemResult(newState, events)
        if (newState.player.inventory.isEmpty()) return SystemResult(newState, events)

        val cauldron = newState.cauldron
        val currentRequest = cauldron.currentRequest ?: return SystemResult(newState, events)

        // Find first matching item in inventory
        val matchingItemId = newState.player.inventory.firstOrNull { itemId ->
            newState.itemInstances.find { it.id == itemId }?.type == currentRequest
        }

        if (matchingItemId != null) {
            // Correct item delivered — advance the cauldron
            val updatedInstances = newState.itemInstances.filter { it.id != matchingItemId }
            val updatedInventory = newState.player.inventory - matchingItemId
            val newDeliveredCount = cauldron.deliveredCount + 1
            val isComplete = newDeliveredCount >= cauldron.requestQueue.size

            events += GameEvent.CauldronRequestAdvanced(currentRequest)

            val updatedCauldron = cauldron.copy(
                deliveredCount = newDeliveredCount,
                isComplete = isComplete,
            )

            if (isComplete) {
                events += GameEvent.QuestCompleted
            }

            newState = newState.copy(
                player = newState.player.copy(inventory = updatedInventory),
                itemInstances = updatedInstances,
                cauldron = updatedCauldron,
            )
        } else {
            // Wrong item
            when (content.cureSequence.mode) {
                CureMode.CLASSIC -> {
                    // Drop ALL carried items to nearest anchors — punishment
                    newState = dropAllCarriedItems(newState, events)
                }
                CureMode.MODERN -> {
                    // Reject silently — do nothing
                }
            }
        }

        return SystemResult(newState, events)
    }

    private fun dropAllCarriedItems(state: GameState, events: MutableList<GameEvent>): GameState {
        val player = state.player
        var currentInstances = state.itemInstances

        val room = roomProvider?.getRoom(state.currentRoomId)

        // Track positions already occupied by room items (pre-existing + those just dropped)
        val occupiedPositions = currentInstances
            .filter { item ->
                val loc = item.location
                loc is ItemLocation.InRoom && loc.roomId == state.currentRoomId
            }
            .mapNotNull { item -> (item.location as? ItemLocation.InRoom)?.position }
            .toMutableSet()

        for (itemId in player.inventory) {
            val dropPosition = if (room != null && room.itemAnchors.isNotEmpty()) {
                val nearestAnchor = room.itemAnchors.minByOrNull { anchor ->
                    (anchor.spawnPosition - player.position).length()
                }!!
                if (nearestAnchor.spawnPosition in occupiedPositions) {
                    nearestAnchor.spawnPosition + Vec3f(0.5f, 0f, 0f)
                } else {
                    nearestAnchor.spawnPosition
                }
            } else {
                val base = Vec3f(player.position.x, player.position.y, 1f)
                if (base in occupiedPositions) base + Vec3f(0.5f * occupiedPositions.size, 0f, 0f)
                else base
            }
            occupiedPositions += dropPosition

            currentInstances = currentInstances.map { item ->
                if (item.id == itemId) {
                    item.copy(location = ItemLocation.InRoom(state.currentRoomId, dropPosition))
                } else item
            }
            events += GameEvent.ItemDropped(itemId)
        }

        return state.copy(
            player = player.copy(inventory = emptyList()),
            itemInstances = currentInstances,
        )
    }
}
