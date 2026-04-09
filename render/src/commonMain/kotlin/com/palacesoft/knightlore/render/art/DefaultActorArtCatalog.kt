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
    private val SKIN        = 0xFF_C8A870.toInt()  // warm visible face
    private val BOOTS       = 0xFF_2A1A10.toInt()  // dark brown boots
    private val LEGS        = 0xFF_3D3530.toInt()
    private val SHADOW      = 0xFF_120A00.toInt()
    private val EDGE        = 0xFF_0D0A08.toInt()

    override fun resolvePlayer(
        form: Form,
        motion: MovementState,
        facing: Direction8,
        framePhase: Int,
    ): AuthoredSprite? {
        return when (form) {
            Form.HUMAN -> when (motion) {
                MovementState.IDLE -> humanIdle(facing)
                MovementState.WALKING -> humanWalk(facing, framePhase)
                else -> null
            }
            Form.WEREWULF -> when (motion) {
                MovementState.IDLE -> wolfIdle(facing)
                MovementState.WALKING -> wolfWalk(facing, framePhase)
                else -> null
            }
        }
    }

    // ── IDLE ─────────────────────────────────────────────────────────────
    private fun humanIdle(facing: Direction8): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 2f * mirror // forward lean

        // Scale: ~40px wide, ~65px tall. Cloak hem at -18, exposing legs below.
        return AuthoredSprite(
            id = "human_idle",
            layers = listOf(
                // Shadow
                SpriteLayer(listOf(Vec2f(-12f, -1f), Vec2f(12f, -1f), Vec2f(10f, 3f), Vec2f(-10f, 3f)), SHADOW),
                // Left boot — clearly visible below cloak
                SpriteLayer(listOf(Vec2f(-9f, -14f), Vec2f(-3f, -14f), Vec2f(-2f, 0f), Vec2f(-10f, 0f)), BOOTS),
                // Right boot
                SpriteLayer(listOf(Vec2f(3f, -14f), Vec2f(9f, -14f), Vec2f(10f, 0f), Vec2f(2f, 0f)), BOOTS),
                // Boot soles (visible feet)
                SpriteLayer(listOf(Vec2f(-11f, -2f), Vec2f(-1f, -2f), Vec2f(-1f, 1f), Vec2f(-11f, 1f)), EDGE),
                SpriteLayer(listOf(Vec2f(1f, -2f), Vec2f(11f, -2f), Vec2f(11f, 1f), Vec2f(1f, 1f)), EDGE),
                // Cloak body — hem at -18, exposing legs
                SpriteLayer(listOf(
                    Vec2f(-14f, -18f), Vec2f(14f, -18f),
                    Vec2f(10f + lean, -48f), Vec2f(-10f + lean, -48f),
                ), CLOAK),
                // Cloak fold
                SpriteLayer(listOf(
                    Vec2f(2f * mirror + lean, -48f), Vec2f(4f * mirror + lean, -48f),
                    Vec2f(2f * mirror, -18f), Vec2f(0f, -18f),
                ), SHADOW),
                // Left arm
                SpriteLayer(listOf(
                    Vec2f(-16f + lean, -42f), Vec2f(-12f + lean, -42f),
                    Vec2f(-13f, -22f), Vec2f(-17f, -22f),
                ), CLOAK),
                // Right arm
                SpriteLayer(listOf(
                    Vec2f(12f + lean, -42f), Vec2f(16f + lean, -42f),
                    Vec2f(17f, -22f), Vec2f(13f, -22f),
                ), CLOAK),
                // Face — SKIN colored, clearly visible under hat
                SpriteLayer(listOf(
                    Vec2f(-6f + lean, -56f), Vec2f(6f + lean, -56f),
                    Vec2f(5f + lean, -48f), Vec2f(-5f + lean, -48f),
                ), SKIN),
                // Eyes — two dark dots on face
                SpriteLayer(listOf(Vec2f(-3f + lean, -54f), Vec2f(-1f + lean, -54f), Vec2f(-1f + lean, -52f), Vec2f(-3f + lean, -52f)), EDGE),
                SpriteLayer(listOf(Vec2f(1f + lean, -54f), Vec2f(3f + lean, -54f), Vec2f(3f + lean, -52f), Vec2f(1f + lean, -52f)), EDGE),
                // Hat crown
                SpriteLayer(listOf(
                    Vec2f(-7f + lean, -64f), Vec2f(7f + lean, -64f),
                    Vec2f(8f + lean, -56f), Vec2f(-8f + lean, -56f),
                ), HAT),
                // Hat brim
                SpriteLayer(listOf(
                    Vec2f(-12f + lean, -57f), Vec2f(12f + lean, -57f),
                    Vec2f(11f + lean, -55f), Vec2f(-11f + lean, -55f),
                ), HAT),
                // Hat highlight
                SpriteLayer(listOf(Vec2f(-5f + lean, -63f), Vec2f(4f + lean, -63f), Vec2f(4f + lean, -61f), Vec2f(-5f + lean, -61f)), HAT_HL),
                // Scabbard on left hip
                SpriteLayer(listOf(Vec2f(-15f, -28f), Vec2f(-13f, -28f), Vec2f(-12f, -16f), Vec2f(-14f, -16f)), EDGE),
            ),
        )
    }

    // ── WALKING ──────────────────────────────────────────────────────────
    private fun humanWalk(facing: Direction8, framePhase: Int): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 3f * mirror
        val ls = if (framePhase % 2 == 0) 5f else -5f // leg swing — visible stepping

        return AuthoredSprite(
            id = "human_walk_$framePhase",
            layers = listOf(
                // Shadow
                SpriteLayer(listOf(Vec2f(-12f, -1f), Vec2f(12f, -1f), Vec2f(10f, 3f), Vec2f(-10f, 3f)), SHADOW),
                // Left boot — swings forward/back
                SpriteLayer(listOf(Vec2f(-9f, -14f), Vec2f(-3f, -14f), Vec2f(-2f - ls, 0f), Vec2f(-10f - ls, 0f)), BOOTS),
                // Right boot — opposite swing
                SpriteLayer(listOf(Vec2f(3f, -14f), Vec2f(9f, -14f), Vec2f(10f + ls, 0f), Vec2f(2f + ls, 0f)), BOOTS),
                // Boot soles
                SpriteLayer(listOf(Vec2f(-11f - ls, -2f), Vec2f(-1f - ls, -2f), Vec2f(-1f - ls, 1f), Vec2f(-11f - ls, 1f)), EDGE),
                SpriteLayer(listOf(Vec2f(1f + ls, -2f), Vec2f(11f + ls, -2f), Vec2f(11f + ls, 1f), Vec2f(1f + ls, 1f)), EDGE),
                // Cloak — hem at -18
                SpriteLayer(listOf(
                    Vec2f(-14f, -18f), Vec2f(14f, -18f),
                    Vec2f(10f + lean, -48f), Vec2f(-10f + lean, -48f),
                ), CLOAK),
                // Fold
                SpriteLayer(listOf(
                    Vec2f(2f * mirror + lean, -48f), Vec2f(4f * mirror + lean, -48f),
                    Vec2f(2f * mirror, -18f), Vec2f(0f, -18f),
                ), SHADOW),
                // Left arm — countersweeps legs
                SpriteLayer(listOf(
                    Vec2f(-16f + lean, -42f), Vec2f(-12f + lean, -42f),
                    Vec2f(-13f + ls * 0.4f, -22f), Vec2f(-17f + ls * 0.4f, -22f),
                ), CLOAK),
                // Right arm
                SpriteLayer(listOf(
                    Vec2f(12f + lean, -42f), Vec2f(16f + lean, -42f),
                    Vec2f(17f - ls * 0.4f, -22f), Vec2f(13f - ls * 0.4f, -22f),
                ), CLOAK),
                // Face
                SpriteLayer(listOf(
                    Vec2f(-6f + lean, -56f), Vec2f(6f + lean, -56f),
                    Vec2f(5f + lean, -48f), Vec2f(-5f + lean, -48f),
                ), SKIN),
                // Eyes
                SpriteLayer(listOf(Vec2f(-3f + lean, -54f), Vec2f(-1f + lean, -54f), Vec2f(-1f + lean, -52f), Vec2f(-3f + lean, -52f)), EDGE),
                SpriteLayer(listOf(Vec2f(1f + lean, -54f), Vec2f(3f + lean, -54f), Vec2f(3f + lean, -52f), Vec2f(1f + lean, -52f)), EDGE),
                // Hat crown
                SpriteLayer(listOf(
                    Vec2f(-7f + lean, -64f), Vec2f(7f + lean, -64f),
                    Vec2f(8f + lean, -56f), Vec2f(-8f + lean, -56f),
                ), HAT),
                // Hat brim
                SpriteLayer(listOf(
                    Vec2f(-12f + lean, -57f), Vec2f(12f + lean, -57f),
                    Vec2f(11f + lean, -55f), Vec2f(-11f + lean, -55f),
                ), HAT),
                // Hat highlight
                SpriteLayer(listOf(Vec2f(-5f + lean, -63f), Vec2f(4f + lean, -63f), Vec2f(4f + lean, -61f), Vec2f(-5f + lean, -61f)), HAT_HL),
                // Scabbard
                SpriteLayer(listOf(Vec2f(-15f, -28f), Vec2f(-13f, -28f), Vec2f(-12f, -16f), Vec2f(-14f, -16f)), EDGE),
            ),
        )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WEREWOLF — hunched beast, visible head/ears/legs/claws
    // ═══════════════════════════════════════════════════════════════════════

    private val WFUR       = 0xFF_5A4A38.toInt()  // brown fur body
    private val WFUR_DARK  = 0xFF_2A2018.toInt()  // dark underbelly
    private val WFUR_LIGHT = 0xFF_7A6850.toInt()  // highlight
    private val WCLAW      = 0xFF_C8B898.toInt()  // bone claws
    private val WEYE       = 0xFF_FF6600.toInt()  // amber eyes
    private val WFANG      = 0xFF_E0D8C0.toInt()  // ivory fangs

    private fun wolfIdle(facing: Direction8): AuthoredSprite {
        val m = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        return AuthoredSprite("wolf_idle", listOf(
            // Shadow
            SpriteLayer(listOf(Vec2f(-14f, -1f), Vec2f(14f, -1f), Vec2f(12f, 3f), Vec2f(-12f, 3f)), SHADOW),
            // Hind legs — visible below body
            SpriteLayer(listOf(Vec2f(-10f, -16f), Vec2f(-5f, -16f), Vec2f(-4f, 0f), Vec2f(-11f, 0f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(5f, -16f), Vec2f(10f, -16f), Vec2f(11f, 0f), Vec2f(4f, 0f)), WFUR_DARK),
            // Hind paws
            SpriteLayer(listOf(Vec2f(-12f, -2f), Vec2f(-3f, -2f), Vec2f(-3f, 1f), Vec2f(-12f, 1f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(3f, -2f), Vec2f(12f, -2f), Vec2f(12f, 1f), Vec2f(3f, 1f)), WFUR_DARK),
            // Body — hunched, wide shoulders narrowing to haunches
            SpriteLayer(listOf(
                Vec2f(-12f, -16f), Vec2f(12f, -16f),  // haunches
                Vec2f(15f, -42f), Vec2f(-8f, -42f),   // shoulders (asymmetric)
            ), WFUR),
            // Shoulder hump — highest point
            SpriteLayer(listOf(
                Vec2f(-4f, -48f), Vec2f(10f, -48f),
                Vec2f(14f, -42f), Vec2f(-6f, -42f),
            ), WFUR_LIGHT),
            // Belly — lighter
            SpriteLayer(listOf(Vec2f(-8f, -22f), Vec2f(8f, -22f), Vec2f(6f, -16f), Vec2f(-6f, -16f)), WFUR_LIGHT),
            // Front legs — longer, reaching forward
            SpriteLayer(listOf(Vec2f(-14f, -38f), Vec2f(-10f, -38f), Vec2f(-12f, -18f), Vec2f(-16f, -18f)), WFUR),
            SpriteLayer(listOf(Vec2f(12f, -38f), Vec2f(16f, -38f), Vec2f(18f, -18f), Vec2f(14f, -18f)), WFUR),
            // Front claws
            SpriteLayer(listOf(Vec2f(-17f, -20f), Vec2f(-11f, -20f), Vec2f(-11f, -18f), Vec2f(-17f, -18f)), WCLAW),
            SpriteLayer(listOf(Vec2f(13f, -20f), Vec2f(19f, -20f), Vec2f(19f, -18f), Vec2f(13f, -18f)), WCLAW),
            // Head — low, forward, wedge-shaped
            SpriteLayer(listOf(
                Vec2f(-6f + 3f * m, -52f), Vec2f(8f + 3f * m, -52f),
                Vec2f(10f + 3f * m, -42f), Vec2f(-4f + 3f * m, -42f),
            ), WFUR),
            // Snout — protruding forward
            SpriteLayer(listOf(
                Vec2f(2f + 5f * m, -50f), Vec2f(10f + 5f * m, -50f),
                Vec2f(12f + 5f * m, -46f), Vec2f(2f + 5f * m, -46f),
            ), WFUR_DARK),
            // Eyes — bright amber
            SpriteLayer(listOf(Vec2f(-2f + 3f * m, -51f), Vec2f(1f + 3f * m, -51f), Vec2f(1f + 3f * m, -49f), Vec2f(-2f + 3f * m, -49f)), WEYE),
            SpriteLayer(listOf(Vec2f(3f + 3f * m, -51f), Vec2f(6f + 3f * m, -51f), Vec2f(6f + 3f * m, -49f), Vec2f(3f + 3f * m, -49f)), WEYE),
            // Ears — pointed triangles
            SpriteLayer(listOf(Vec2f(-5f + 3f * m, -52f), Vec2f(-1f + 3f * m, -52f), Vec2f(-3f + 3f * m, -58f)), WFUR),
            SpriteLayer(listOf(Vec2f(5f + 3f * m, -52f), Vec2f(9f + 3f * m, -52f), Vec2f(7f + 3f * m, -58f)), WFUR),
            // Fangs
            SpriteLayer(listOf(Vec2f(4f + 5f * m, -47f), Vec2f(6f + 5f * m, -47f), Vec2f(5f + 5f * m, -44f)), WFANG),
            SpriteLayer(listOf(Vec2f(8f + 5f * m, -47f), Vec2f(10f + 5f * m, -47f), Vec2f(9f + 5f * m, -44f)), WFANG),
            // Tail — curved behind
            SpriteLayer(listOf(Vec2f(10f, -22f), Vec2f(13f, -22f), Vec2f(20f, -34f), Vec2f(17f, -34f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(18f, -34f), Vec2f(21f, -34f), Vec2f(22f, -40f), Vec2f(19f, -40f)), WFUR),
        ))
    }

    private fun wolfWalk(facing: Direction8, framePhase: Int): AuthoredSprite {
        val m = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val ls = if (framePhase % 2 == 0) 5f else -5f

        return AuthoredSprite("wolf_walk_$framePhase", listOf(
            // Shadow
            SpriteLayer(listOf(Vec2f(-14f, -1f), Vec2f(14f, -1f), Vec2f(12f, 3f), Vec2f(-12f, 3f)), SHADOW),
            // Hind legs with swing
            SpriteLayer(listOf(Vec2f(-10f, -16f), Vec2f(-5f, -16f), Vec2f(-4f - ls, 0f), Vec2f(-11f - ls, 0f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(5f, -16f), Vec2f(10f, -16f), Vec2f(11f + ls, 0f), Vec2f(4f + ls, 0f)), WFUR_DARK),
            // Hind paws
            SpriteLayer(listOf(Vec2f(-12f - ls, -2f), Vec2f(-3f - ls, -2f), Vec2f(-3f - ls, 1f), Vec2f(-12f - ls, 1f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(3f + ls, -2f), Vec2f(12f + ls, -2f), Vec2f(12f + ls, 1f), Vec2f(3f + ls, 1f)), WFUR_DARK),
            // Body
            SpriteLayer(listOf(Vec2f(-12f, -16f), Vec2f(12f, -16f), Vec2f(15f, -42f), Vec2f(-8f, -42f)), WFUR),
            // Hump
            SpriteLayer(listOf(Vec2f(-4f, -48f), Vec2f(10f, -48f), Vec2f(14f, -42f), Vec2f(-6f, -42f)), WFUR_LIGHT),
            // Belly
            SpriteLayer(listOf(Vec2f(-8f, -22f), Vec2f(8f, -22f), Vec2f(6f, -16f), Vec2f(-6f, -16f)), WFUR_LIGHT),
            // Front legs with countersweep
            SpriteLayer(listOf(Vec2f(-14f, -38f), Vec2f(-10f, -38f), Vec2f(-12f + ls * 0.3f, -18f), Vec2f(-16f + ls * 0.3f, -18f)), WFUR),
            SpriteLayer(listOf(Vec2f(12f, -38f), Vec2f(16f, -38f), Vec2f(18f - ls * 0.3f, -18f), Vec2f(14f - ls * 0.3f, -18f)), WFUR),
            // Front claws
            SpriteLayer(listOf(Vec2f(-17f + ls * 0.3f, -20f), Vec2f(-11f + ls * 0.3f, -20f), Vec2f(-11f + ls * 0.3f, -18f), Vec2f(-17f + ls * 0.3f, -18f)), WCLAW),
            SpriteLayer(listOf(Vec2f(13f - ls * 0.3f, -20f), Vec2f(19f - ls * 0.3f, -20f), Vec2f(19f - ls * 0.3f, -18f), Vec2f(13f - ls * 0.3f, -18f)), WCLAW),
            // Head
            SpriteLayer(listOf(Vec2f(-6f + 3f * m, -52f), Vec2f(8f + 3f * m, -52f), Vec2f(10f + 3f * m, -42f), Vec2f(-4f + 3f * m, -42f)), WFUR),
            // Snout
            SpriteLayer(listOf(Vec2f(2f + 5f * m, -50f), Vec2f(10f + 5f * m, -50f), Vec2f(12f + 5f * m, -46f), Vec2f(2f + 5f * m, -46f)), WFUR_DARK),
            // Eyes
            SpriteLayer(listOf(Vec2f(-2f + 3f * m, -51f), Vec2f(1f + 3f * m, -51f), Vec2f(1f + 3f * m, -49f), Vec2f(-2f + 3f * m, -49f)), WEYE),
            SpriteLayer(listOf(Vec2f(3f + 3f * m, -51f), Vec2f(6f + 3f * m, -51f), Vec2f(6f + 3f * m, -49f), Vec2f(3f + 3f * m, -49f)), WEYE),
            // Ears
            SpriteLayer(listOf(Vec2f(-5f + 3f * m, -52f), Vec2f(-1f + 3f * m, -52f), Vec2f(-3f + 3f * m, -58f)), WFUR),
            SpriteLayer(listOf(Vec2f(5f + 3f * m, -52f), Vec2f(9f + 3f * m, -52f), Vec2f(7f + 3f * m, -58f)), WFUR),
            // Fangs
            SpriteLayer(listOf(Vec2f(4f + 5f * m, -47f), Vec2f(6f + 5f * m, -47f), Vec2f(5f + 5f * m, -44f)), WFANG),
            SpriteLayer(listOf(Vec2f(8f + 5f * m, -47f), Vec2f(10f + 5f * m, -47f), Vec2f(9f + 5f * m, -44f)), WFANG),
            // Tail
            SpriteLayer(listOf(Vec2f(10f, -22f), Vec2f(13f, -22f), Vec2f(20f, -34f), Vec2f(17f, -34f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(18f, -34f), Vec2f(21f, -34f), Vec2f(22f, -40f), Vec2f(19f, -40f)), WFUR),
        ))
    }
}
