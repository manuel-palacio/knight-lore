package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.PatrolEnemy
import com.palacesoft.knightlore.domain.model.PatrolPoint

private const val CONTACT_RADIUS = 0.7f
private const val DAMAGE_COOLDOWN_TICKS = 60
private const val KNOCKBACK_SPEED = 6f
private const val WAYPOINT_ARRIVE_RADIUS = 0.1f

class PatrolEnemySystem : GameSystem {

    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        if (state.patrolEnemies.isEmpty()) return SystemResult(state)

        val movedEnemies = state.patrolEnemies.map { enemy ->
            advanceEnemy(enemy, tickDelta)
        }

        var player = state.player
        val events = mutableListOf<GameEvent>()

        if (player.damageCooldownTicks == 0) {
            for (enemy in movedEnemies) {
                val dx = enemy.position.x - player.position.x
                val dy = enemy.position.y - player.position.y
                val dist = kotlin.math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()
                if (dist < CONTACT_RADIUS) {
                    events += GameEvent.PlayerDamaged
                    val newLives = player.lives - 1
                    // Knockback: push player away from enemy
                    val knockDir = if (dist > 0.01f) {
                        Vec3f(-dx / dist * KNOCKBACK_SPEED, -dy / dist * KNOCKBACK_SPEED, 0f)
                    } else {
                        Vec3f(KNOCKBACK_SPEED, 0f, 0f)
                    }
                    player = if (newLives <= 0) {
                        events += GameEvent.LifeLost
                        events += GameEvent.GameOver
                        player.copy(lives = 0, damageCooldownTicks = DAMAGE_COOLDOWN_TICKS, velocity = knockDir)
                    } else {
                        events += GameEvent.LifeLost
                        player.copy(lives = newLives, damageCooldownTicks = DAMAGE_COOLDOWN_TICKS, velocity = knockDir)
                    }
                    break
                }
            }
        }

        return SystemResult(
            state.copy(player = player, patrolEnemies = movedEnemies),
            events,
        )
    }

    private fun advanceEnemy(enemy: PatrolEnemy, tickDelta: Float): PatrolEnemy {
        if (enemy.path.isEmpty()) return enemy

        val target: PatrolPoint = enemy.path[enemy.targetIndex % enemy.path.size]
        val dx = target.x - enemy.position.x
        val dy = target.y - enemy.position.y
        val dist = kotlin.math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()

        return if (dist < WAYPOINT_ARRIVE_RADIUS) {
            // Arrived — advance to next waypoint
            enemy.copy(targetIndex = (enemy.targetIndex + 1) % enemy.path.size)
        } else {
            val step = enemy.speed * tickDelta
            val ratio = (step / dist).coerceAtMost(1f)
            val newPos = enemy.position.copy(
                x = enemy.position.x + dx * ratio,
                y = enemy.position.y + dy * ratio,
            )
            enemy.copy(position = newPos)
        }
    }
}
