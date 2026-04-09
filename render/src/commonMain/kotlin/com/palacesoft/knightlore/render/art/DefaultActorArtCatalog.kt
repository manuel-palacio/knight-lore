package com.palacesoft.knightlore.render.art

import com.palacesoft.knightlore.core.math.Direction8
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.MovementState

/**
 * Authored player human silhouette.
 * All coordinates relative to feet anchor (0, 0) = bottom center.
 * Negative Y = up from feet. Positive X = right.
 *
 * Design: hunched ~20° forward, dominant hat brim 1.5x shoulder width,
 * narrow dropped shoulders, short thick legs, arms hanging low.
 * Total: ~32px wide, ~48px tall. Hat is the dominant feature.
 */
class DefaultActorArtCatalog : ActorArtCatalog {

    // ── Colors (brief spec) ─────────────────────────────────────────────
    private val HAT         = 0xFF_1A0F00.toInt()
    private val HAT_HL      = 0xFF_2E1E08.toInt()
    private val CLOAK       = 0xFF_2A2420.toInt()
    private val LEGS        = 0xFF_3D3530.toInt()
    private val SHADOW      = 0xFF_120A00.toInt()
    private val EDGE        = 0xFF_0D0A08.toInt()

    override fun resolvePlayer(
        form: Form,
        motion: MovementState,
        facing: Direction8,
        framePhase: Int,
    ): AuthoredSprite? {
        if (form != Form.HUMAN) return null // only human authored; werewolf falls back
        return when (motion) {
            MovementState.IDLE -> humanIdle(facing)
            MovementState.WALKING -> humanWalk(facing, framePhase)
            else -> null // jump, land, transform → legacy fallback
        }
    }

    // ── IDLE ─────────────────────────────────────────────────────────────
    private fun humanIdle(facing: Direction8): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 2f * mirror // forward lean

        return AuthoredSprite(
            id = "human_idle",
            layers = listOf(
                // Shadow underside (ground plane)
                SpriteLayer(
                    points = listOf(
                        Vec2f(-10f, -1f), Vec2f(10f, -1f),
                        Vec2f(8f, 2f), Vec2f(-8f, 2f),
                    ),
                    fillColor = SHADOW,
                ),
                // Left leg — short, thick
                SpriteLayer(
                    points = listOf(
                        Vec2f(-7f + lean, -8f), Vec2f(-2f + lean, -8f),
                        Vec2f(-2f, 0f), Vec2f(-7f, 0f),
                    ),
                    fillColor = LEGS,
                ),
                // Right leg
                SpriteLayer(
                    points = listOf(
                        Vec2f(2f + lean, -8f), Vec2f(7f + lean, -8f),
                        Vec2f(7f, 0f), Vec2f(2f, 0f),
                    ),
                    fillColor = LEGS,
                ),
                // Cloak body — trapezoid, wider at hem, narrow at shoulders, leaning forward
                SpriteLayer(
                    points = listOf(
                        Vec2f(-11f, -8f),         // hem left
                        Vec2f(11f, -8f),          // hem right
                        Vec2f(8f + lean, -36f),   // shoulder right
                        Vec2f(-8f + lean, -36f),  // shoulder left
                    ),
                    fillColor = CLOAK,
                ),
                // Cloak fold — off-center dark line for asymmetry
                SpriteLayer(
                    points = listOf(
                        Vec2f(2f * mirror + lean, -36f), Vec2f(3f * mirror + lean, -36f),
                        Vec2f(1f * mirror, -8f), Vec2f(0f, -8f),
                    ),
                    fillColor = SHADOW,
                ),
                // Left arm — hanging low, slightly forward
                SpriteLayer(
                    points = listOf(
                        Vec2f(-12f + lean, -30f), Vec2f(-9f + lean, -30f),
                        Vec2f(-10f + lean * 0.5f, -14f), Vec2f(-13f + lean * 0.5f, -14f),
                    ),
                    fillColor = CLOAK,
                ),
                // Right arm
                SpriteLayer(
                    points = listOf(
                        Vec2f(9f + lean, -30f), Vec2f(12f + lean, -30f),
                        Vec2f(13f + lean * 0.5f, -14f), Vec2f(10f + lean * 0.5f, -14f),
                    ),
                    fillColor = CLOAK,
                ),
                // Head/face — visible, not tiny
                SpriteLayer(
                    points = listOf(
                        Vec2f(-5f + lean, -44f), Vec2f(5f + lean, -44f),
                        Vec2f(4f + lean, -36f), Vec2f(-4f + lean, -36f),
                    ),
                    fillColor = LEGS, // face slightly lighter than cloak
                ),
                // Hat crown — smaller, proportional
                SpriteLayer(
                    points = listOf(
                        Vec2f(-5f + lean, -50f), Vec2f(5f + lean, -50f),
                        Vec2f(6f + lean, -44f), Vec2f(-6f + lean, -44f),
                    ),
                    fillColor = HAT,
                ),
                // Hat brim — still dominant but not oversized (20px, ~1.25x shoulders)
                SpriteLayer(
                    points = listOf(
                        Vec2f(-10f + lean, -45f), Vec2f(10f + lean, -45f),
                        Vec2f(9f + lean, -43f), Vec2f(-9f + lean, -43f),
                    ),
                    fillColor = HAT,
                ),
                // Hat highlight
                SpriteLayer(
                    points = listOf(
                        Vec2f(-4f + lean, -49f), Vec2f(3f + lean, -49f),
                        Vec2f(3f + lean, -47f), Vec2f(-4f + lean, -47f),
                    ),
                    fillColor = HAT_HL,
                ),
                // Scabbard — left hip, asymmetric detail
                SpriteLayer(
                    points = listOf(
                        Vec2f(-12f + lean * 0.7f, -20f), Vec2f(-10f + lean * 0.7f, -20f),
                        Vec2f(-9f, -8f), Vec2f(-11f, -8f),
                    ),
                    fillColor = EDGE,
                ),
            ),
        )
    }

    // ── WALKING ──────────────────────────────────────────────────────────
    private fun humanWalk(facing: Direction8, framePhase: Int): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 3f * mirror // slightly more lean when walking
        val legSwing = if (framePhase % 2 == 0) 6f else -6f

        return AuthoredSprite(
            id = "human_walk_$framePhase",
            layers = listOf(
                // Shadow
                SpriteLayer(
                    points = listOf(
                        Vec2f(-10f, -1f), Vec2f(10f, -1f),
                        Vec2f(8f, 2f), Vec2f(-8f, 2f),
                    ),
                    fillColor = SHADOW,
                ),
                // Left leg — swings forward/back
                SpriteLayer(
                    points = listOf(
                        Vec2f(-7f + lean, -8f), Vec2f(-2f + lean, -8f),
                        Vec2f(-2f - legSwing * 0.3f, 0f), Vec2f(-7f - legSwing * 0.3f, 0f),
                    ),
                    fillColor = LEGS,
                ),
                // Right leg — opposite swing
                SpriteLayer(
                    points = listOf(
                        Vec2f(2f + lean, -8f), Vec2f(7f + lean, -8f),
                        Vec2f(7f + legSwing * 0.3f, 0f), Vec2f(2f + legSwing * 0.3f, 0f),
                    ),
                    fillColor = LEGS,
                ),
                // Cloak body — leans more when walking
                SpriteLayer(
                    points = listOf(
                        Vec2f(-11f, -8f), Vec2f(11f, -8f),
                        Vec2f(8f + lean, -36f), Vec2f(-8f + lean, -36f),
                    ),
                    fillColor = CLOAK,
                ),
                // Fold
                SpriteLayer(
                    points = listOf(
                        Vec2f(2f * mirror + lean, -36f), Vec2f(3f * mirror + lean, -36f),
                        Vec2f(1f * mirror, -8f), Vec2f(0f, -8f),
                    ),
                    fillColor = SHADOW,
                ),
                // Left arm — countersweep with legs
                SpriteLayer(
                    points = listOf(
                        Vec2f(-12f + lean, -30f), Vec2f(-9f + lean, -30f),
                        Vec2f(-10f + lean * 0.5f + legSwing * 0.4f, -14f),
                        Vec2f(-13f + lean * 0.5f + legSwing * 0.4f, -14f),
                    ),
                    fillColor = CLOAK,
                ),
                // Right arm
                SpriteLayer(
                    points = listOf(
                        Vec2f(9f + lean, -30f), Vec2f(12f + lean, -30f),
                        Vec2f(13f + lean * 0.5f - legSwing * 0.4f, -14f),
                        Vec2f(10f + lean * 0.5f - legSwing * 0.4f, -14f),
                    ),
                    fillColor = CLOAK,
                ),
                // Head/face — visible
                SpriteLayer(
                    points = listOf(
                        Vec2f(-5f + lean, -44f), Vec2f(5f + lean, -44f),
                        Vec2f(4f + lean, -36f), Vec2f(-4f + lean, -36f),
                    ),
                    fillColor = LEGS,
                ),
                // Hat crown — proportional
                SpriteLayer(
                    points = listOf(
                        Vec2f(-5f + lean, -50f), Vec2f(5f + lean, -50f),
                        Vec2f(6f + lean, -44f), Vec2f(-6f + lean, -44f),
                    ),
                    fillColor = HAT,
                ),
                // Hat brim — still dominant but not oversized
                SpriteLayer(
                    points = listOf(
                        Vec2f(-10f + lean, -45f), Vec2f(10f + lean, -45f),
                        Vec2f(9f + lean, -43f), Vec2f(-9f + lean, -43f),
                    ),
                    fillColor = HAT,
                ),
                // Hat highlight
                SpriteLayer(
                    points = listOf(
                        Vec2f(-4f + lean, -49f), Vec2f(3f + lean, -49f),
                        Vec2f(3f + lean, -47f), Vec2f(-4f + lean, -47f),
                    ),
                    fillColor = HAT_HL,
                ),
                // Scabbard
                SpriteLayer(
                    points = listOf(
                        Vec2f(-12f + lean * 0.7f, -20f), Vec2f(-10f + lean * 0.7f, -20f),
                        Vec2f(-9f, -8f), Vec2f(-11f, -8f),
                    ),
                    fillColor = EDGE,
                ),
            ),
        )
    }
}
