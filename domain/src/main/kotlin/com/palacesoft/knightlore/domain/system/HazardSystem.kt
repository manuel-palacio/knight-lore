package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.ActorBehavior
import com.palacesoft.knightlore.domain.model.ActorKind
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider

private const val PATROL_SPEED = 2.0f
private const val GHOST_SPEED = 1.5f
private const val REACTIVE_SPEED = 3.0f
private const val CONTACT_RADIUS = 0.8f
private const val DAMAGE_COOLDOWN_TICKS = 60

class HazardSystem(
    private val roomProvider: RoomProvider,
    private val content: GameContent,
) : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        val events = mutableListOf<GameEvent>()
        val player = state.player

        val room = roomProvider.getRoom(state.currentRoomId)

        // Update each actor
        val updatedActors = state.actorStates.map { actor ->
            updateActor(actor, state, room?.actors?.find { spawn ->
                spawn.actorType == actor.type
            }?.position?.x, tickDelta)
        }

        // Contact damage check
        var updatedPlayer = player
        var updatedEvents = events

        if (updatedPlayer.damageCooldownTicks == 0) {
            for (actor in updatedActors) {
                val dist = (actor.position - updatedPlayer.position).length()
                if (dist < CONTACT_RADIUS) {
                    updatedEvents += GameEvent.PlayerDamaged
                    val newLives = updatedPlayer.lives - 1
                    if (newLives <= 0) {
                        updatedPlayer = updatedPlayer.copy(lives = 0, damageCooldownTicks = DAMAGE_COOLDOWN_TICKS)
                        updatedEvents += GameEvent.GameOver
                        // Stop processing more contacts — player is already dead
                        break
                    } else {
                        updatedPlayer = updatedPlayer.copy(
                            lives = newLives,
                            damageCooldownTicks = DAMAGE_COOLDOWN_TICKS,
                        )
                        // Only take damage from the first hit this tick
                        break
                    }
                }
            }
        }

        return SystemResult(
            state.copy(
                player = updatedPlayer,
                actorStates = updatedActors,
            ),
            updatedEvents,
        )
    }

    private fun updateActor(
        actor: ActorState,
        state: GameState,
        spawnX: Float?,
        tickDelta: Float,
    ): ActorState {
        val actorTypeDef = content.actorTypes[actor.type.name.lowercase()]
        val kind = actorTypeDef?.kind
        val player = state.player

        return when (actor.behavior) {
            ActorBehavior.PATROL -> updatePatrolActor(actor, spawnX, actorTypeDef?.patrolRadius ?: 3f, tickDelta)
            ActorBehavior.STATIC_HAZARD -> actor  // static actors don't move
            ActorBehavior.REACTIVE -> updateReactiveActor(actor, player, tickDelta)
        }.let { updated ->
            // GHOST overrides movement regardless of behavior label
            if (kind == ActorKind.GHOST) {
                updateGhostActor(actor, player, tickDelta)
            } else {
                updated
            }
        }
    }

    private fun updatePatrolActor(
        actor: ActorState,
        spawnX: Float?,
        patrolRadius: Float,
        tickDelta: Float,
    ): ActorState {
        val speed = PATROL_SPEED * tickDelta

        // Determine direction from behaviorState
        val movingLeft = actor.behaviorState == "PATROL_LEFT"
        val newX = actor.position.x + if (movingLeft) -speed else speed

        // Check patrol bounds reversal
        val newBehaviorState = if (spawnX != null) {
            when {
                newX < spawnX - patrolRadius -> "PATROL_RIGHT"
                newX > spawnX + patrolRadius -> "PATROL_LEFT"
                else -> actor.behaviorState
            }
        } else {
            actor.behaviorState
        }

        val actualX = when {
            spawnX != null && newX < spawnX - patrolRadius -> spawnX - patrolRadius
            spawnX != null && newX > spawnX + patrolRadius -> spawnX + patrolRadius
            else -> newX
        }

        return actor.copy(
            position = actor.position.copy(x = actualX),
            velocity = actor.velocity.copy(x = if (movingLeft) -PATROL_SPEED else PATROL_SPEED),
            behaviorState = newBehaviorState,
        )
    }

    private fun updateGhostActor(
        actor: ActorState,
        player: com.palacesoft.knightlore.domain.model.PlayerState,
        tickDelta: Float,
    ): ActorState {
        val direction = (player.position - actor.position).normalized()
        val newPosition = actor.position + direction * (GHOST_SPEED * tickDelta)
        return actor.copy(
            position = newPosition,
            velocity = direction * GHOST_SPEED,
        )
    }

    private fun updateReactiveActor(
        actor: ActorState,
        player: com.palacesoft.knightlore.domain.model.PlayerState,
        tickDelta: Float,
    ): ActorState {
        return if (player.form == Form.WEREWULF) {
            // Hostile: move toward player
            val direction = (player.position - actor.position).normalized()
            val newPosition = actor.position + direction * (REACTIVE_SPEED * tickDelta)
            actor.copy(
                position = newPosition,
                velocity = direction * REACTIVE_SPEED,
            )
        } else {
            // Passive: stay still
            actor.copy(velocity = Vec3f.ZERO)
        }
    }
}
