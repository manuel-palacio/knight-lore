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
    // ── Bright comic-style colors (must POP against dark castle) ────────
    private val HAT         = 0xFF_8A6830.toInt()  // warm brown hat
    private val HAT_HL      = 0xFF_B08840.toInt()  // hat highlight
    private val CLOAK       = 0xFF_5888B8.toInt()  // blue-grey tunic (bright, readable)
    private val CLOAK_DARK  = 0xFF_3A6090.toInt()  // tunic shadow
    private val SKIN        = 0xFF_F0C888.toInt()  // bright warm skin
    private val BOOTS       = 0xFF_6A4828.toInt()  // brown leather boots
    private val LEGS        = 0xFF_4A6A38.toInt()  // green-brown trousers
    private val SHADOW      = 0xFF_1A1208.toInt()  // ground shadow
    private val EDGE        = 0xFF_2A1A10.toInt()  // outlines/details

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

        val l = lean
        return AuthoredSprite("human_idle", listOf(
            // Shadow
            SpriteLayer(listOf(Vec2f(-12f, 0f), Vec2f(12f, 0f), Vec2f(10f, 3f), Vec2f(-10f, 3f)), SHADOW),
            // Boots — chunky, separated
            SpriteLayer(listOf(Vec2f(-10f, -14f), Vec2f(-2f, -14f), Vec2f(-1f, 0f), Vec2f(-11f, 0f)), BOOTS),
            SpriteLayer(listOf(Vec2f(2f, -14f), Vec2f(10f, -14f), Vec2f(11f, 0f), Vec2f(1f, 0f)), BOOTS),
            // Body — one rounded shape
            SpriteLayer(listOf(
                Vec2f(-12f, -14f), Vec2f(12f, -14f),
                Vec2f(14f, -24f), Vec2f(10f + l, -44f),
                Vec2f(-10f + l, -44f), Vec2f(-14f, -24f),
            ), CLOAK),
            // Arms
            SpriteLayer(listOf(Vec2f(-16f + l, -40f), Vec2f(-12f + l, -40f), Vec2f(-13f, -20f), Vec2f(-17f, -20f)), CLOAK_DARK),
            SpriteLayer(listOf(Vec2f(12f + l, -40f), Vec2f(16f + l, -40f), Vec2f(17f, -20f), Vec2f(13f, -20f)), CLOAK_DARK),
            // Hands
            SpriteLayer(listOf(Vec2f(-18f, -22f), Vec2f(-12f, -22f), Vec2f(-12f, -18f), Vec2f(-18f, -18f)), SKIN),
            SpriteLayer(listOf(Vec2f(12f, -22f), Vec2f(18f, -22f), Vec2f(18f, -18f), Vec2f(12f, -18f)), SKIN),
            // Face — DARK, in shadow of helmet brim, wider
            SpriteLayer(listOf(
                Vec2f(-9f + l, -55f), Vec2f(9f + l, -55f),
                Vec2f(8f + l, -44f), Vec2f(-8f + l, -44f),
            ), EDGE),
            // Eyes — bright white, spread wide apart
            SpriteLayer(listOf(Vec2f(-7f + l, -52f), Vec2f(-3f + l, -52f), Vec2f(-3f + l, -49f), Vec2f(-7f + l, -49f)), 0xFF_FFFFFF.toInt()),
            SpriteLayer(listOf(Vec2f(3f + l, -52f), Vec2f(7f + l, -52f), Vec2f(7f + l, -49f), Vec2f(3f + l, -49f)), 0xFF_FFFFFF.toInt()),
            // Pupils — centered in white
            SpriteLayer(listOf(Vec2f(-6f + l, -51f), Vec2f(-4f + l, -51f), Vec2f(-4f + l, -50f), Vec2f(-6f + l, -50f)), 0xFF_000000.toInt()),
            SpriteLayer(listOf(Vec2f(4f + l, -51f), Vec2f(6f + l, -51f), Vec2f(6f + l, -50f), Vec2f(4f + l, -50f)), 0xFF_000000.toInt()),
            // Nose — visible square
            SpriteLayer(listOf(Vec2f(-2f + l, -48f), Vec2f(2f + l, -48f), Vec2f(2f + l, -45f), Vec2f(-2f + l, -45f)), SKIN),
            // EXPLORER HAT — rounded dome (8-point polygon for roundness)
            SpriteLayer(listOf(
                Vec2f(-4f + l, -70f),   // top left
                Vec2f(4f + l, -70f),    // top right
                Vec2f(10f + l, -66f),   // upper right
                Vec2f(12f + l, -60f),   // mid right
                Vec2f(11f + l, -55f),   // lower right
                Vec2f(-11f + l, -55f),  // lower left
                Vec2f(-12f + l, -60f),  // mid left
                Vec2f(-10f + l, -66f),  // upper left
            ), HAT),
            // Hat BRIM — very wide, creates shadow on face
            SpriteLayer(listOf(
                Vec2f(-17f + l, -57f), Vec2f(17f + l, -57f),
                Vec2f(16f + l, -53f), Vec2f(-16f + l, -53f),
            ), HAT),
            // Hat band
            SpriteLayer(listOf(Vec2f(-11f + l, -58f), Vec2f(11f + l, -58f), Vec2f(11f + l, -56f), Vec2f(-11f + l, -56f)), HAT_HL),
        ))
    }

    // ── WALKING ──────────────────────────────────────────────────────────
    private fun humanWalk(facing: Direction8, framePhase: Int): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 3f * mirror
        val ls = if (framePhase % 2 == 0) 5f else -5f // leg swing — visible stepping

        val l = lean
        return AuthoredSprite("human_walk_$framePhase", listOf(
            SpriteLayer(listOf(Vec2f(-12f, 0f), Vec2f(12f, 0f), Vec2f(10f, 3f), Vec2f(-10f, 3f)), SHADOW),
            // Boots with swing
            SpriteLayer(listOf(Vec2f(-10f, -14f), Vec2f(-2f, -14f), Vec2f(-1f - ls, 0f), Vec2f(-11f - ls, 0f)), BOOTS),
            SpriteLayer(listOf(Vec2f(2f, -14f), Vec2f(10f, -14f), Vec2f(11f + ls, 0f), Vec2f(1f + ls, 0f)), BOOTS),
            // Body — rounded
            SpriteLayer(listOf(
                Vec2f(-12f, -14f), Vec2f(12f, -14f),
                Vec2f(14f, -24f), Vec2f(10f + l, -44f),
                Vec2f(-10f + l, -44f), Vec2f(-14f, -24f),
            ), CLOAK),
            // Arms with countersweep
            SpriteLayer(listOf(Vec2f(-16f + l, -40f), Vec2f(-12f + l, -40f), Vec2f(-13f + ls * 0.3f, -20f), Vec2f(-17f + ls * 0.3f, -20f)), CLOAK_DARK),
            SpriteLayer(listOf(Vec2f(12f + l, -40f), Vec2f(16f + l, -40f), Vec2f(17f - ls * 0.3f, -20f), Vec2f(13f - ls * 0.3f, -20f)), CLOAK_DARK),
            // Hands
            SpriteLayer(listOf(Vec2f(-18f + ls * 0.3f, -22f), Vec2f(-12f + ls * 0.3f, -22f), Vec2f(-12f + ls * 0.3f, -18f), Vec2f(-18f + ls * 0.3f, -18f)), SKIN),
            SpriteLayer(listOf(Vec2f(12f - ls * 0.3f, -22f), Vec2f(18f - ls * 0.3f, -22f), Vec2f(18f - ls * 0.3f, -18f), Vec2f(12f - ls * 0.3f, -18f)), SKIN),
            // Dark face — wide
            SpriteLayer(listOf(Vec2f(-9f + l, -55f), Vec2f(9f + l, -55f), Vec2f(8f + l, -44f), Vec2f(-8f + l, -44f)), EDGE),
            // Eyes — wide apart
            SpriteLayer(listOf(Vec2f(-7f + l, -52f), Vec2f(-3f + l, -52f), Vec2f(-3f + l, -49f), Vec2f(-7f + l, -49f)), 0xFF_FFFFFF.toInt()),
            SpriteLayer(listOf(Vec2f(3f + l, -52f), Vec2f(7f + l, -52f), Vec2f(7f + l, -49f), Vec2f(3f + l, -49f)), 0xFF_FFFFFF.toInt()),
            SpriteLayer(listOf(Vec2f(-6f + l, -51f), Vec2f(-4f + l, -51f), Vec2f(-4f + l, -50f), Vec2f(-6f + l, -50f)), 0xFF_000000.toInt()),
            SpriteLayer(listOf(Vec2f(4f + l, -51f), Vec2f(6f + l, -51f), Vec2f(6f + l, -50f), Vec2f(4f + l, -50f)), 0xFF_000000.toInt()),
            // Nose
            SpriteLayer(listOf(Vec2f(-2f + l, -48f), Vec2f(2f + l, -48f), Vec2f(2f + l, -45f), Vec2f(-2f + l, -45f)), SKIN),
            // Rounded explorer hat
            SpriteLayer(listOf(
                Vec2f(-4f + l, -70f), Vec2f(4f + l, -70f), Vec2f(10f + l, -66f), Vec2f(12f + l, -60f),
                Vec2f(11f + l, -55f), Vec2f(-11f + l, -55f), Vec2f(-12f + l, -60f), Vec2f(-10f + l, -66f),
            ), HAT),
            SpriteLayer(listOf(Vec2f(-17f + l, -57f), Vec2f(17f + l, -57f), Vec2f(16f + l, -53f), Vec2f(-16f + l, -53f)), HAT),
            SpriteLayer(listOf(Vec2f(-11f + l, -58f), Vec2f(11f + l, -58f), Vec2f(11f + l, -56f), Vec2f(-11f + l, -56f)), HAT_HL),
        ))
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
