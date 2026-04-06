package com.palacesoft.knightlore.domain

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.CauldronState
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.TimeState
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.TransformState

fun testTimeState(
    ticksPerDay: Int = 3600,
    ticksInDay: Int = 0,
    dayIndex: Int = 0,
    phase: DayPhase = DayPhase.DAY,
    tick: Long = 0L,
    phaseProgress: Float = 0f,
    ticksUntilTransform: Int? = null,
): TimeState = TimeState(
    tick = tick,
    dayIndex = dayIndex,
    ticksInDay = ticksInDay,
    ticksPerDay = ticksPerDay,
    phase = phase,
    phaseProgress = phaseProgress,
    ticksUntilTransform = ticksUntilTransform,
)

fun testPlayerState(
    form: Form = Form.HUMAN,
    position: Vec3f = Vec3f.ZERO,
    velocity: Vec3f = Vec3f.ZERO,
    facing: Direction8 = Direction8.SOUTH,
    inventory: List<com.palacesoft.knightlore.core.ids.ItemId> = emptyList(),
    airborne: Boolean = false,
    lives: Int = 3,
    transformState: TransformState = TransformState(TransformPhase.STABLE, 0),
    damageCooldownTicks: Int = 0,
): PlayerState = PlayerState(
    form = form,
    position = position,
    velocity = velocity,
    facing = facing,
    inventory = inventory,
    airborne = airborne,
    lives = lives,
    transformState = transformState,
    damageCooldownTicks = damageCooldownTicks,
)

fun testGameState(
    player: PlayerState = testPlayerState(),
    time: TimeState = testTimeState(),
): GameState = GameState(
    currentRoomId = RoomId("test-room"),
    player = player,
    time = time,
    cauldron = CauldronState(
        requestQueue = emptyList(),
        deliveredCount = 0,
        isComplete = false,
    ),
    itemInstances = emptyList(),
    actorStates = emptyList(),
    roomTransition = null,
)
