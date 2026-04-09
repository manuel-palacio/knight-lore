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
        tick: Long,
    ): AuthoredSprite? {
        return when (form) {
            Form.HUMAN -> when (motion) {
                MovementState.IDLE -> humanIdle(facing, tick)
                MovementState.WALKING -> humanWalk(facing, framePhase)
                MovementState.TRANSFORMING -> transformPhase(tick, toWolf = true)
                else -> null
            }
            Form.WEREWULF -> when (motion) {
                MovementState.IDLE -> wolfIdle(facing, tick)
                MovementState.WALKING -> wolfWalk(facing, framePhase)
                MovementState.TRANSFORMING -> transformPhase(tick, toWolf = false)
                else -> null
            }
        }
    }

    // ── IDLE ─────────────────────────────────────────────────────────────
    private fun humanIdle(facing: Direction8, tick: Long = 0L): AuthoredSprite {
        val mirror = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val lean = 2f * mirror

        // Idle look-around: every ~4 seconds (240 ticks), glance left or right for ~1 second
        val lookCycle = (tick % 240).toInt()
        val headShift = when {
            lookCycle in 180..210 -> -3f  // glance left
            lookCycle in 210..240 -> 3f   // glance right
            else -> 0f                     // look forward
        }

        val l = lean; val h = headShift
        // ORGANIC Indiana Jones explorer — all shapes use 6-10 points for roundness
        return AuthoredSprite("human_idle", listOf(
            // Shadow — oval-ish
            SpriteLayer(listOf(Vec2f(-15f, 1f), Vec2f(0f, -2f), Vec2f(15f, 1f), Vec2f(0f, 4f)), SHADOW),
            // Left boot — rounded 6-point
            SpriteLayer(listOf(
                Vec2f(-12f, -10f), Vec2f(-5f, -10f), Vec2f(-3f, -4f),
                Vec2f(-5f, 1f), Vec2f(-12f, 1f), Vec2f(-14f, -4f),
            ), BOOTS),
            // Right boot
            SpriteLayer(listOf(
                Vec2f(5f, -10f), Vec2f(12f, -10f), Vec2f(14f, -4f),
                Vec2f(12f, 1f), Vec2f(5f, 1f), Vec2f(3f, -4f),
            ), BOOTS),
            // Body — 10-point organic blob (wide hips, narrow shoulders, slight belly)
            SpriteLayer(listOf(
                Vec2f(-10f, -10f),           // hip left
                Vec2f(10f, -10f),            // hip right
                Vec2f(16f + l, -18f),        // right hip curve
                Vec2f(17f + l, -28f),        // right belly (widest)
                Vec2f(14f + l, -38f),        // right chest
                Vec2f(10f + l, -48f),        // right shoulder
                Vec2f(-10f + l, -48f),       // left shoulder
                Vec2f(-14f + l, -38f),       // left chest
                Vec2f(-17f + l, -28f),       // left belly (widest)
                Vec2f(-16f + l, -18f),       // left hip curve
            ), CLOAK),
            // Left arm — 6-point organic, DETACHED from body
            SpriteLayer(listOf(
                Vec2f(-22f + l, -44f), Vec2f(-18f + l, -44f), Vec2f(-17f + l, -36f),
                Vec2f(-18f, -22f), Vec2f(-24f, -22f), Vec2f(-24f + l, -36f),
            ), CLOAK_DARK),
            // Right arm
            SpriteLayer(listOf(
                Vec2f(18f + l, -44f), Vec2f(22f + l, -44f), Vec2f(24f + l, -36f),
                Vec2f(24f, -22f), Vec2f(18f, -22f), Vec2f(17f + l, -36f),
            ), CLOAK_DARK),
            // Hands — rounded
            SpriteLayer(listOf(Vec2f(-26f, -24f), Vec2f(-17f, -24f), Vec2f(-17f, -19f), Vec2f(-26f, -19f)), SKIN),
            SpriteLayer(listOf(Vec2f(17f, -24f), Vec2f(26f, -24f), Vec2f(26f, -19f), Vec2f(17f, -19f)), SKIN),
            // Face — rounded 6-point under hat shadow
            SpriteLayer(listOf(
                Vec2f(-8f + l + h, -62f), Vec2f(8f + l + h, -62f),
                Vec2f(10f + l + h, -56f), Vec2f(8f + l + h, -49f),
                Vec2f(-8f + l + h, -49f), Vec2f(-10f + l + h, -56f),
            ), EDGE),
            // Big white eyes
            SpriteLayer(listOf(Vec2f(-7f + l + h, -60f), Vec2f(-2f + l + h, -60f), Vec2f(-2f + l + h, -56f), Vec2f(-7f + l + h, -56f)), 0xFF_FFFFFF.toInt()),
            SpriteLayer(listOf(Vec2f(2f + l + h, -60f), Vec2f(7f + l + h, -60f), Vec2f(7f + l + h, -56f), Vec2f(2f + l + h, -56f)), 0xFF_FFFFFF.toInt()),
            // Pupils
            SpriteLayer(listOf(Vec2f(-5f + l + h, -59f), Vec2f(-3f + l + h, -59f), Vec2f(-3f + l + h, -57f), Vec2f(-5f + l + h, -57f)), 0xFF_000000.toInt()),
            SpriteLayer(listOf(Vec2f(3f + l + h, -59f), Vec2f(5f + l + h, -59f), Vec2f(5f + l + h, -57f), Vec2f(3f + l + h, -57f)), 0xFF_000000.toInt()),
            // Nose — small rounded
            SpriteLayer(listOf(Vec2f(-2f + l + h, -55f), Vec2f(2f + l + h, -55f), Vec2f(1f + l + h, -52f), Vec2f(-1f + l + h, -52f)), SKIN),
            // Explorer hat — 8-point dome
            SpriteLayer(listOf(
                Vec2f(-5f + l + h, -78f), Vec2f(5f + l + h, -78f),
                Vec2f(12f + l + h, -74f), Vec2f(14f + l + h, -68f),
                Vec2f(13f + l + h, -62f), Vec2f(-13f + l + h, -62f),
                Vec2f(-14f + l + h, -68f), Vec2f(-12f + l + h, -74f),
            ), HAT),
            // Wide brim
            SpriteLayer(listOf(
                Vec2f(-20f + l + h, -64f), Vec2f(20f + l + h, -64f),
                Vec2f(19f + l + h, -60f), Vec2f(-19f + l + h, -60f),
            ), HAT),
            // Band
            SpriteLayer(listOf(Vec2f(-13f + l + h, -66f), Vec2f(13f + l + h, -66f), Vec2f(13f + l + h, -64f), Vec2f(-13f + l + h, -64f)), HAT_HL),
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
            // Arms — separated from body, countersweep with walk
            SpriteLayer(listOf(Vec2f(-20f + l, -38f), Vec2f(-16f + l, -38f), Vec2f(-17f + ls * 0.3f, -18f), Vec2f(-21f + ls * 0.3f, -18f)), CLOAK_DARK),
            SpriteLayer(listOf(Vec2f(16f + l, -38f), Vec2f(20f + l, -38f), Vec2f(21f - ls * 0.3f, -18f), Vec2f(17f - ls * 0.3f, -18f)), CLOAK_DARK),
            // Hands
            SpriteLayer(listOf(Vec2f(-22f + ls * 0.3f, -20f), Vec2f(-16f + ls * 0.3f, -20f), Vec2f(-16f + ls * 0.3f, -16f), Vec2f(-22f + ls * 0.3f, -16f)), SKIN),
            SpriteLayer(listOf(Vec2f(16f - ls * 0.3f, -20f), Vec2f(22f - ls * 0.3f, -20f), Vec2f(22f - ls * 0.3f, -16f), Vec2f(16f - ls * 0.3f, -16f)), SKIN),
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
    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFORMATION — 3 phases morphing between human and wolf
    // ═══════════════════════════════════════════════════════════════════════

    private fun transformPhase(tick: Long, toWolf: Boolean): AuthoredSprite {
        // Transformation lasts 60 ticks. Use tick % 60 to cycle through phases.
        val progress = (tick % 60).toInt()
        val phase = when {
            progress < 20 -> 0  // early: body starts bulging
            progress < 40 -> 1  // mid: hybrid, ears emerging, arms lengthening
            else -> 2           // late: nearly complete
        }
        // If transforming TO wolf: phases go 0→1→2
        // If transforming FROM wolf: phases go 2→1→0
        val p = if (toWolf) phase else 2 - phase

        // Interpolation factors
        val bodyW = 12f + p * 3f     // body widens: 12 → 15 → 18
        val headH = 12f + p * 3f     // head grows: 12 → 15 → 18
        val earH = p * 5f            // ears emerge: 0 → 5 → 10
        val armLen = 20f + p * 4f    // arms lengthen: 20 → 24 → 28
        val clawSize = p * 3f        // claws appear: 0 → 3 → 6

        // Blend colors
        val bodyColor = when (p) {
            0 -> CLOAK           // still mostly human
            1 -> 0xFF_4A4838.toInt()  // mid grey-brown blend
            else -> WFUR         // nearly wolf
        }
        val faceColor = when (p) {
            0 -> EDGE            // dark face (human)
            1 -> 0xFF_3A3028.toInt()  // darkening fur
            else -> WFUR         // wolf face
        }
        val eyeColor = when (p) {
            0 -> 0xFF_FFFFFF.toInt()  // human white eyes
            1 -> 0xFF_FF8800.toInt()  // transitioning to amber
            else -> WEYE         // wolf amber
        }

        return AuthoredSprite("transform_$p", listOf(
            // Shadow — grows wider
            SpriteLayer(listOf(Vec2f(-bodyW, 0f), Vec2f(bodyW, 0f), Vec2f(bodyW - 2f, 3f), Vec2f(-bodyW + 2f, 3f)), SHADOW),
            // Legs — getting thicker
            SpriteLayer(listOf(Vec2f(-10f - p, -16f), Vec2f(-3f, -16f), Vec2f(-2f, 0f), Vec2f(-11f - p, 0f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(3f, -16f), Vec2f(10f + p, -16f), Vec2f(11f + p, 0f), Vec2f(2f, 0f)), WFUR_DARK),
            // Body — bulging wider
            SpriteLayer(listOf(
                Vec2f(-bodyW, -16f), Vec2f(bodyW, -16f),
                Vec2f(bodyW + 2f, -28f), Vec2f(bodyW - 2f, -44f),
                Vec2f(-bodyW + 2f, -44f), Vec2f(-bodyW - 2f, -28f),
            ), bodyColor),
            // Arms — stretching longer
            SpriteLayer(listOf(
                Vec2f(-bodyW - 6f, -40f), Vec2f(-bodyW - 2f, -40f),
                Vec2f(-bodyW - 3f, -40f + armLen), Vec2f(-bodyW - 7f, -40f + armLen),
            ), bodyColor),
            SpriteLayer(listOf(
                Vec2f(bodyW + 2f, -40f), Vec2f(bodyW + 6f, -40f),
                Vec2f(bodyW + 7f, -40f + armLen), Vec2f(bodyW + 3f, -40f + armLen),
            ), bodyColor),
            // Claws emerging
            SpriteLayer(listOf(
                Vec2f(-bodyW - 8f, -40f + armLen), Vec2f(-bodyW - 2f, -40f + armLen),
                Vec2f(-bodyW - 2f, -40f + armLen + clawSize), Vec2f(-bodyW - 8f, -40f + armLen + clawSize),
            ), WCLAW),
            SpriteLayer(listOf(
                Vec2f(bodyW + 2f, -40f + armLen), Vec2f(bodyW + 8f, -40f + armLen),
                Vec2f(bodyW + 8f, -40f + armLen + clawSize), Vec2f(bodyW + 2f, -40f + armLen + clawSize),
            ), WCLAW),
            // Head — growing
            SpriteLayer(listOf(
                Vec2f(-headH / 2f, -44f - headH), Vec2f(headH / 2f, -44f - headH),
                Vec2f(headH / 2f + 2f, -44f), Vec2f(-headH / 2f - 2f, -44f),
            ), faceColor),
            // Eyes — changing color
            SpriteLayer(listOf(Vec2f(-5f, -50f - p * 2f), Vec2f(-2f, -50f - p * 2f), Vec2f(-2f, -47f - p * 2f), Vec2f(-5f, -47f - p * 2f)), eyeColor),
            SpriteLayer(listOf(Vec2f(2f, -50f - p * 2f), Vec2f(5f, -50f - p * 2f), Vec2f(5f, -47f - p * 2f), Vec2f(2f, -47f - p * 2f)), eyeColor),
            // Ears emerging — grow from nothing to full
            SpriteLayer(listOf(Vec2f(-6f, -44f - headH), Vec2f(-2f, -44f - headH), Vec2f(-4f, -44f - headH - earH)), WFUR),
            SpriteLayer(listOf(Vec2f(2f, -44f - headH), Vec2f(6f, -44f - headH), Vec2f(4f, -44f - headH - earH)), WFUR),
        ))
    }

    // WEREWOLF — upright muscular humanoid wolf (like the GBC reference)
    // Same height as human, wider, BIG head with ears and fangs
    // ═══════════════════════════════════════════════════════════════════════

    private val WFUR       = 0xFF_6A5A48.toInt()  // grey-brown fur
    private val WFUR_DARK  = 0xFF_3A2E24.toInt()
    private val WFUR_LIGHT = 0xFF_8A7860.toInt()
    private val WCLAW      = 0xFF_C8B898.toInt()
    private val WEYE       = 0xFF_FF4400.toInt()  // red-orange eyes
    private val WFANG      = 0xFF_E0D8C0.toInt()

    private fun wolfIdle(facing: Direction8, tick: Long = 0L): AuthoredSprite {
        val m = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        return AuthoredSprite("wolf_idle", listOf(
            SpriteLayer(listOf(Vec2f(-14f, 0f), Vec2f(14f, 0f), Vec2f(12f, 3f), Vec2f(-12f, 3f)), SHADOW),
            // Legs — thick, upright
            SpriteLayer(listOf(Vec2f(-10f, -16f), Vec2f(-3f, -16f), Vec2f(-2f, 0f), Vec2f(-11f, 0f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(3f, -16f), Vec2f(10f, -16f), Vec2f(11f, 0f), Vec2f(2f, 0f)), WFUR_DARK),
            // Big paws with claws
            SpriteLayer(listOf(Vec2f(-13f, -3f), Vec2f(-1f, -3f), Vec2f(-1f, 1f), Vec2f(-13f, 1f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(1f, -3f), Vec2f(13f, -3f), Vec2f(13f, 1f), Vec2f(1f, 1f)), WFUR_DARK),
            // Body — muscular, upright, wider than human
            SpriteLayer(listOf(
                Vec2f(-14f, -16f), Vec2f(14f, -16f),
                Vec2f(16f, -28f), Vec2f(12f, -42f),
                Vec2f(-12f, -42f), Vec2f(-16f, -28f),
            ), WFUR),
            // Chest highlight
            SpriteLayer(listOf(Vec2f(-8f, -36f), Vec2f(8f, -36f), Vec2f(6f, -20f), Vec2f(-6f, -20f)), WFUR_LIGHT),
            // Arms — thick, muscular, hanging
            SpriteLayer(listOf(Vec2f(-20f, -40f), Vec2f(-14f, -40f), Vec2f(-16f, -18f), Vec2f(-22f, -18f)), WFUR),
            SpriteLayer(listOf(Vec2f(14f, -40f), Vec2f(20f, -40f), Vec2f(22f, -18f), Vec2f(16f, -18f)), WFUR),
            // Claws at arm ends
            SpriteLayer(listOf(Vec2f(-23f, -20f), Vec2f(-15f, -20f), Vec2f(-15f, -16f), Vec2f(-23f, -16f)), WCLAW),
            SpriteLayer(listOf(Vec2f(15f, -20f), Vec2f(23f, -20f), Vec2f(23f, -16f), Vec2f(15f, -16f)), WCLAW),
            // BIG HEAD — rounded, same approach as human (8-point)
            SpriteLayer(listOf(
                Vec2f(-6f, -68f), Vec2f(6f, -68f),
                Vec2f(12f, -62f), Vec2f(13f, -52f),
                Vec2f(10f, -42f), Vec2f(-10f, -42f),
                Vec2f(-13f, -52f), Vec2f(-12f, -62f),
            ), WFUR),
            // Snout — forward protruding
            SpriteLayer(listOf(
                Vec2f(-4f + 4f * m, -58f), Vec2f(6f + 4f * m, -58f),
                Vec2f(8f + 4f * m, -52f), Vec2f(-2f + 4f * m, -52f),
            ), WFUR_DARK),
            // Teeth/fangs — visible below snout
            SpriteLayer(listOf(Vec2f(0f + 4f * m, -53f), Vec2f(3f + 4f * m, -53f), Vec2f(2f + 4f * m, -50f)), WFANG),
            SpriteLayer(listOf(Vec2f(4f + 4f * m, -53f), Vec2f(7f + 4f * m, -53f), Vec2f(6f + 4f * m, -50f)), WFANG),
            // Eyes — bright, fierce
            SpriteLayer(listOf(Vec2f(-6f, -63f), Vec2f(-2f, -63f), Vec2f(-2f, -60f), Vec2f(-6f, -60f)), WEYE),
            SpriteLayer(listOf(Vec2f(2f, -63f), Vec2f(6f, -63f), Vec2f(6f, -60f), Vec2f(2f, -60f)), WEYE),
            // Ears — BIG pointed, sticking up high
            SpriteLayer(listOf(Vec2f(-10f, -68f), Vec2f(-5f, -68f), Vec2f(-8f, -78f)), WFUR),
            SpriteLayer(listOf(Vec2f(5f, -68f), Vec2f(10f, -68f), Vec2f(8f, -78f)), WFUR),
            // Inner ears
            SpriteLayer(listOf(Vec2f(-9f, -68f), Vec2f(-6f, -68f), Vec2f(-8f, -74f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(6f, -68f), Vec2f(9f, -68f), Vec2f(8f, -74f)), WFUR_DARK),
            // Tail
            SpriteLayer(listOf(Vec2f(12f, -20f), Vec2f(15f, -20f), Vec2f(22f, -30f), Vec2f(19f, -30f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(20f, -30f), Vec2f(23f, -30f), Vec2f(24f, -36f), Vec2f(21f, -36f)), WFUR),
        ))
    }

    private fun wolfWalk(facing: Direction8, framePhase: Int): AuthoredSprite {
        val m = when (facing) {
            Direction8.WEST, Direction8.NORTHWEST, Direction8.SOUTHWEST -> -1f
            else -> 1f
        }
        val ls = if (framePhase % 2 == 0) 6f else -6f
        return AuthoredSprite("wolf_walk_$framePhase", listOf(
            SpriteLayer(listOf(Vec2f(-14f, 0f), Vec2f(14f, 0f), Vec2f(12f, 3f), Vec2f(-12f, 3f)), SHADOW),
            // Legs with swing
            SpriteLayer(listOf(Vec2f(-10f, -16f), Vec2f(-3f, -16f), Vec2f(-2f - ls, 0f), Vec2f(-11f - ls, 0f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(3f, -16f), Vec2f(10f, -16f), Vec2f(11f + ls, 0f), Vec2f(2f + ls, 0f)), WFUR_DARK),
            // Paws
            SpriteLayer(listOf(Vec2f(-13f - ls, -3f), Vec2f(-1f - ls, -3f), Vec2f(-1f - ls, 1f), Vec2f(-13f - ls, 1f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(1f + ls, -3f), Vec2f(13f + ls, -3f), Vec2f(13f + ls, 1f), Vec2f(1f + ls, 1f)), WFUR_DARK),
            // Body
            SpriteLayer(listOf(Vec2f(-14f, -16f), Vec2f(14f, -16f), Vec2f(16f, -28f), Vec2f(12f, -42f), Vec2f(-12f, -42f), Vec2f(-16f, -28f)), WFUR),
            // Chest
            SpriteLayer(listOf(Vec2f(-8f, -36f), Vec2f(8f, -36f), Vec2f(6f, -20f), Vec2f(-6f, -20f)), WFUR_LIGHT),
            // Arms with countersweep
            SpriteLayer(listOf(Vec2f(-20f, -40f), Vec2f(-14f, -40f), Vec2f(-16f + ls * 0.3f, -18f), Vec2f(-22f + ls * 0.3f, -18f)), WFUR),
            SpriteLayer(listOf(Vec2f(14f, -40f), Vec2f(20f, -40f), Vec2f(22f - ls * 0.3f, -18f), Vec2f(16f - ls * 0.3f, -18f)), WFUR),
            // Claws
            SpriteLayer(listOf(Vec2f(-23f + ls * 0.3f, -20f), Vec2f(-15f + ls * 0.3f, -20f), Vec2f(-15f + ls * 0.3f, -16f), Vec2f(-23f + ls * 0.3f, -16f)), WCLAW),
            SpriteLayer(listOf(Vec2f(15f - ls * 0.3f, -20f), Vec2f(23f - ls * 0.3f, -20f), Vec2f(23f - ls * 0.3f, -16f), Vec2f(15f - ls * 0.3f, -16f)), WCLAW),
            // Big head
            SpriteLayer(listOf(Vec2f(-6f, -68f), Vec2f(6f, -68f), Vec2f(12f, -62f), Vec2f(13f, -52f), Vec2f(10f, -42f), Vec2f(-10f, -42f), Vec2f(-13f, -52f), Vec2f(-12f, -62f)), WFUR),
            // Snout
            SpriteLayer(listOf(Vec2f(-4f + 4f * m, -58f), Vec2f(6f + 4f * m, -58f), Vec2f(8f + 4f * m, -52f), Vec2f(-2f + 4f * m, -52f)), WFUR_DARK),
            // Fangs
            SpriteLayer(listOf(Vec2f(0f + 4f * m, -53f), Vec2f(3f + 4f * m, -53f), Vec2f(2f + 4f * m, -50f)), WFANG),
            SpriteLayer(listOf(Vec2f(4f + 4f * m, -53f), Vec2f(7f + 4f * m, -53f), Vec2f(6f + 4f * m, -50f)), WFANG),
            // Eyes
            SpriteLayer(listOf(Vec2f(-6f, -63f), Vec2f(-2f, -63f), Vec2f(-2f, -60f), Vec2f(-6f, -60f)), WEYE),
            SpriteLayer(listOf(Vec2f(2f, -63f), Vec2f(6f, -63f), Vec2f(6f, -60f), Vec2f(2f, -60f)), WEYE),
            // Ears
            SpriteLayer(listOf(Vec2f(-10f, -68f), Vec2f(-5f, -68f), Vec2f(-8f, -78f)), WFUR),
            SpriteLayer(listOf(Vec2f(5f, -68f), Vec2f(10f, -68f), Vec2f(8f, -78f)), WFUR),
            SpriteLayer(listOf(Vec2f(-9f, -68f), Vec2f(-6f, -68f), Vec2f(-8f, -74f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(6f, -68f), Vec2f(9f, -68f), Vec2f(8f, -74f)), WFUR_DARK),
            // Tail
            SpriteLayer(listOf(Vec2f(12f, -20f), Vec2f(15f, -20f), Vec2f(22f, -30f), Vec2f(19f, -30f)), WFUR_DARK),
            SpriteLayer(listOf(Vec2f(20f, -30f), Vec2f(23f, -30f), Vec2f(24f, -36f), Vec2f(21f, -36f)), WFUR),
        ))
    }
}
