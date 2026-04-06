package com.palacesoft.knightlore.domain

import com.palacesoft.knightlore.core.ids.ItemId
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.CauldronState
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.ItemTypeDefinition
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.TimeState
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState
import com.palacesoft.knightlore.domain.system.GameSystem
import kotlin.random.Random

/**
 * Systems must run in this order for correct state propagation:
 * 1. TimeSystem — advances clock, updates DayPhase, emits TransformationStarted notification
 * 2. TransformationSystem — reads updated phase, drives the transformation state machine
 * 3. MovementSystem — reads transformState to suppress input during transformation
 * 4. RoomTransitionSystem — handles room changes after movement
 *
 * TransformationStarted from TimeSystem is an audio/visual notification only.
 * TransformationSystem drives the actual state machine autonomously based on DayPhase.
 */
interface GameEngine {
    fun initialize(seed: Long, content: GameContent, config: EngineConfig = EngineConfig()): GameState
    fun update(previous: GameState, input: FrameInput, deltaSeconds: Float): GameTickResult
}

data class GameTickResult(
    val state: GameState,
    val events: List<GameEvent>,
)

class DefaultGameEngine(private val systems: List<GameSystem>) : GameEngine {
    override fun initialize(seed: Long, content: GameContent, config: EngineConfig): GameState {
        val random = Random(seed) // used for variableStartIndex and future randomisation

        val startIndex = if (content.cureSequence.variableStartIndex) {
            random.nextInt(content.cureSequence.sequence.size)
        } else {
            0
        }

        // 1. Locate the start room
        val startRoomId = content.progression.startRoomId
        content.rooms[startRoomId]
            ?: throw IllegalStateException("Start room not found: $startRoomId")

        // 2. Build initial PlayerState
        val player = PlayerState(
            position = Vec3f(4f, 7f, 1f),
            velocity = Vec3f.ZERO,
            facing = Direction8.NORTH,
            inventory = emptyList(),
            airborne = false,
            lives = config.playerLives,
            form = Form.HUMAN,
            transformState = TransformState(TransformPhase.STABLE, 0),
            damageCooldownTicks = 0,
            jumpLockTicks = 0,
            movementState = MovementState.IDLE,
        )

        // 3. Build initial TimeState
        val time = TimeState(
            tick = 0L,
            dayIndex = 0,
            ticksInDay = 0,
            ticksPerDay = config.ticksPerDay,
            phase = DayPhase.DAY,
            phaseProgress = 0f,
            ticksUntilTransform = null,
        )

        // 4. Build initial CauldronState
        val cauldron = CauldronState(
            requestQueue = content.cureSequence.sequence,
            deliveredCount = startIndex,  // start delivery count at seed-determined offset
            isComplete = false,
        )

        // 5. Seed item instances from ALL rooms' itemAnchors
        val itemInstances: List<ItemInstance> = content.rooms.values.flatMap { room ->
            room.itemAnchors.map { anchor ->
                ItemInstance(
                    id = anchor.itemId,
                    type = resolveItemType(anchor.itemId, content),
                    location = ItemLocation.InRoom(room.id, anchor.spawnPosition),
                )
            }
        }

        // 6. Build initial ActorState list — empty for now (Phase 3/5)
        val actorStates: List<ActorState> = emptyList()

        // 7. Return GameState
        return GameState(
            currentRoomId = startRoomId,
            player = player,
            time = time,
            cauldron = cauldron,
            itemInstances = itemInstances,
            actorStates = actorStates,
            roomTransition = null,
        )
    }

    private fun resolveItemType(itemId: ItemId, content: GameContent): ItemType {
        val idValue = itemId.value
        // Try exact match first
        content.itemTypes[idValue]?.let { return it.family }
        // Try prefix match: longest match wins (e.g. "crystal_ball_01" -> "crystal_ball")
        return content.itemTypes.entries
            .filter { (key, _) -> idValue.startsWith(key) }
            .maxByOrNull { (key, _) -> key.length }
            ?.value?.family
            ?: ItemType.ORNAMENT
    }

    override fun update(previous: GameState, input: FrameInput, deltaSeconds: Float): GameTickResult {
        var current = previous
        val allEvents = mutableListOf<GameEvent>()
        for (system in systems) {
            val result = system.update(current, input, deltaSeconds)
            current = result.state
            allEvents += result.events
        }
        return GameTickResult(current, allEvents)
    }
}
