package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.ids.ActorId
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorBehavior
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.BlockState
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.PatrolEnemy
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomExit
import com.palacesoft.knightlore.domain.model.RoomTransitionState
import com.palacesoft.knightlore.domain.model.TransitionPhase
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider

class RoomTransitionSystem(
    private val roomProvider: RoomProvider,
    private val content: GameContent? = null,
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
            val newRoom = roomProvider.getRoom(transition.toRoomId)
            val spawnedActors = spawnActorsForRoom(newRoom)
            val spawnedPatrolEnemies = spawnPatrolEnemiesForRoom(newRoom)
            val spawnedBlocks = spawnBlocksForRoom(newRoom)
            SystemResult(
                state.copy(
                    currentRoomId = transition.toRoomId,
                    player = newPlayer,
                    actorStates = spawnedActors,
                    patrolEnemies = spawnedPatrolEnemies,
                    dynamicBlocks = spawnedBlocks,
                    roomTransition = null,
                    visitedRooms = state.visitedRooms + transition.toRoomId,
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
        "spawn_n" -> Vec3f(4f, 1.5f, 0f)   // 1.5 tiles inside north wall (wall occupies y=0..1)
        "spawn_s" -> Vec3f(4f, 6.5f, 0f)   // 1.5 tiles inside south wall (wall occupies y=d-1..d)
        "spawn_e" -> Vec3f(6.5f, 4f, 0f)   // 1.5 tiles inside east wall
        "spawn_w" -> Vec3f(1.5f, 4f, 0f)   // 1.5 tiles inside west wall
        else      -> Vec3f(2f, 2f, 0f)     // safe fallback — corner interior, away from hazards
    }

    private fun spawnPatrolEnemiesForRoom(room: RoomDefinition?): List<PatrolEnemy> =
        room?.patrolSpawns?.map { spawn ->
            PatrolEnemy(
                id = spawn.id,
                position = Vec3f(spawn.startX, spawn.startY, 0f),
                path = spawn.path,
                speed = spawn.speed,
                targetIndex = 0,
            )
        } ?: emptyList()

    private fun spawnBlocksForRoom(room: RoomDefinition?): List<BlockState> =
        room?.blockSpawns?.map { spawn ->
            BlockState(
                id = spawn.id,
                gridX = spawn.gridX,
                gridY = spawn.gridY,
                gridZ = spawn.gridZ,
                pushable = spawn.pushable,
            )
        } ?: emptyList()

    private fun spawnActorsForRoom(room: RoomDefinition?): List<ActorState> {
        val gameContent = content ?: return emptyList()
        return room?.actors?.mapIndexed { index, spawn ->
            val typeDef = gameContent.actorTypes[spawn.actorType.name.lowercase()]
            val behavior = when (typeDef?.kind) {
                ActorKind.GUARD_PATROL -> ActorBehavior.PATROL
                ActorKind.GHOST -> ActorBehavior.PATROL  // GHOST movement handled in HazardSystem
                ActorKind.SPIKE_BEAST -> ActorBehavior.STATIC_HAZARD
                ActorKind.FORM_REACTIVE -> ActorBehavior.REACTIVE
                null -> ActorBehavior.PATROL
            }
            val spawnPos = spawn.position
            ActorState(
                id = ActorId("${spawn.actorType.name.lowercase()}_${index + 1}"),
                type = spawn.actorType,
                position = spawnPos,
                velocity = Vec3f.ZERO,
                behaviorState = "PATROL_RIGHT",
                behavior = behavior,
                form = null,
                spawnPosition = spawnPos,
            )
        } ?: emptyList()
    }
}
