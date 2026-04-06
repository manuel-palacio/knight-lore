package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomExit
import com.palacesoft.knightlore.domain.model.RoomTransitionState
import com.palacesoft.knightlore.domain.model.TransitionPhase
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider

class RoomTransitionSystem(
    private val roomProvider: RoomProvider,
    private val transitionDurationTicks: Int = 12,  // ~200ms at 60 ticks/sec
) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        // Case 1: Transition in progress — count down, complete when done
        state.roomTransition?.let { transition ->
            return handleActiveTransition(state, transition)
        }

        // Case 2: No transition — check if player crossed a room boundary
        val room = roomProvider.getRoom(state.currentRoomId) ?: return SystemResult(state)
        val exit = findTriggeredExit(state.player.position, room) ?: return SystemResult(state)

        // Begin transition
        val newTransition = RoomTransitionState(
            fromRoomId = state.currentRoomId,
            toRoomId = exit.targetRoomId,
            targetSpawnId = exit.targetSpawnId,
            phase = TransitionPhase.FADING_OUT,
            ticksRemaining = transitionDurationTicks,
        )
        return SystemResult(
            state.copy(roomTransition = newTransition),
            listOf(GameEvent.EnteredRoom(exit.targetRoomId)),
        )
    }

    private fun handleActiveTransition(state: GameState, transition: RoomTransitionState): SystemResult {
        val remaining = transition.ticksRemaining - 1
        return if (remaining <= 0) {
            // Transition complete — move player to new room
            val spawnPos = spawnPosition(transition.targetSpawnId)
            val newPlayer = state.player.copy(
                position = spawnPos,
                velocity = Vec3f.ZERO,
                airborne = false,
            )
            SystemResult(
                state.copy(
                    currentRoomId = transition.toRoomId,
                    player = newPlayer,
                    actorStates = emptyList(), // clear actors; Phase 5 will respawn them
                    roomTransition = null,
                ),
            )
        } else {
            val updatedTransition = transition.copy(
                ticksRemaining = remaining,
                phase = if (remaining <= transitionDurationTicks / 2)
                    TransitionPhase.FADING_IN else TransitionPhase.FADING_OUT,
            )
            SystemResult(state.copy(roomTransition = updatedTransition))
        }
    }

    private fun findTriggeredExit(pos: Vec3f, room: RoomDefinition): RoomExit? {
        return room.exits.firstOrNull { exit ->
            when (exit.side) {
                ExitSide.NORTH -> pos.y < 0f
                ExitSide.SOUTH -> pos.y > room.depth.toFloat()
                ExitSide.EAST  -> pos.x > room.width.toFloat()
                ExitSide.WEST  -> pos.x < 0f
            }
        }
    }

    private fun spawnPosition(spawnId: String): Vec3f = when (spawnId) {
        "spawn_n" -> Vec3f(4f, 0.5f, 1f)
        "spawn_s" -> Vec3f(4f, 7.5f, 1f)
        "spawn_e" -> Vec3f(7.5f, 4f, 1f)
        "spawn_w" -> Vec3f(0.5f, 4f, 1f)
        else      -> Vec3f(4f, 4f, 1f)
    }
}
