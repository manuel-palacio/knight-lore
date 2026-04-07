# Knight Lore — Full Game Improvements Spec

Date: 2026-04-08  
All specs below target the existing architecture. Domain model changes are marked **[DOMAIN CHANGE]**.
All render-only changes target `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt` unless noted.

---

# IMPROVEMENT 1 — Dynamic Flickering Torchlight

**Target:** `RoomEntityFactory.kt` — torch draw section  
**Domain change:** None  
**Effort:** Low | **Impact:** Very High

## Problem
All torch glow casts are static. The alpha is a compile-time constant. The room feels dead.

## Design
- Each torch gets a `flickPhase` seeded on its tile position. No two torches flicker in sync.
- Three layered glow commands per torch: floor cast, wall cast, ambient halo.
- Each alpha is modulated by `sin(tick * rate + phase)` clamped to a range.
- FLOODED room torches are replaced with cold phosphorescent water shimmer (blue-green, not orange).
- CauldronRoom torches gain a green tint mixed into the orange.
- The cauldron itself pulses its own glow independently.

## Colour constants (add to `CastleColors`)
```kotlin
val TORCH_FLOOR_CAST    = 0xFF6800  // orange-yellow base (alpha applied dynamically)
val TORCH_WALL_CAST     = 0xFF5000  // slightly cooler on vertical surfaces
val TORCH_HALO          = 0xFF8800  // wide diffuse ambient ring
val CAULDRON_GLOW       = 0x44BB00  // toxic green (alpha applied dynamically)
val WATER_SHIMMER       = 0x0044AA  // cold blue phosphorescence for flooded rooms
```

## Flicker helper function (add to `RoomEntityFactory`)
```kotlin
/**
 * Returns a flicker multiplier in [minAlpha..maxAlpha] driven by time.tick.
 * Each torch gets a unique phase from its tile position so they never sync.
 *
 * @param tick      current game tick (state.time.tick)
 * @param phase     per-torch phase offset (radians)
 * @param rate      flicker speed — 0.07 = slow breathe, 0.18 = nervous flicker
 * @param minAlpha  minimum alpha component (0..255)
 * @param maxAlpha  maximum alpha component (0..255)
 */
private fun flickerAlpha(
    tick: Long,
    phase: Double,
    rate: Double = 0.12,
    minAlpha: Int = 0x0A,
    maxAlpha: Int = 0x20,
): Int {
    val t = tick.toDouble() * rate + phase
    // Combine two sine waves for organic non-periodic feel
    val raw = (kotlin.math.sin(t) * 0.65 + kotlin.math.sin(t * 2.73 + 1.1) * 0.35)
    val norm = (raw + 1.0) / 2.0  // 0.0..1.0
    return (minAlpha + (norm * (maxAlpha - minAlpha)).toInt()).coerceIn(minAlpha, maxAlpha)
}

/**
 * Per-torch phase: seeded deterministically on tile grid position.
 * Produces values in 0..2π, well distributed.
 */
private fun torchPhase(gx: Int, gy: Int): Double =
    ((gx * 1_317 + gy * 929) and 0x3FF) / 1024.0 * kotlin.math.PI * 2.0
```

## Torch rendering — replace static glow block

Inside `buildTorchCommands()` (or wherever torches are drawn), replace:
```kotlin
// OLD static alpha
DrawPayload.ColorPath(floorDiamond(...), 0x08_FF6600.toInt())
```

With:
```kotlin
val phase    = torchPhase(tileGx, tileGy)
val tick     = state.time.tick
val isFlooded = roomType == RoomType.FLOODED
val isCauldron = roomType == RoomType.CRYPT  // or check for CauldronRoom special

// Choose base colour for this room type
val baseFloorColor = when {
    isFlooded  -> CastleColors.WATER_SHIMMER
    isCauldron -> (CastleColors.TORCH_FLOOR_CAST and 0x00FFFF) or 0x448800  // mix green
    else       -> CastleColors.TORCH_FLOOR_CAST
}
val baseWallColor = when {
    isFlooded  -> CastleColors.WATER_SHIMMER
    else       -> CastleColors.TORCH_WALL_CAST
}

// Floor cast — large soft diamond, pulsing
val floorAlpha = flickerAlpha(tick, phase, rate = 0.10, minAlpha = 0x0C, maxAlpha = 0x22)
commands += DrawCommand(DrawLayer.FLOOR, dk, 10, "${id}_torch_floor",
    torchFloorPos,
    DrawPayload.ColorPath(torchFloorDiamond, (floorAlpha shl 24) or baseFloorColor))

// Wall cast — on the two walls adjacent to the torch; slightly delayed phase
val wallAlpha = flickerAlpha(tick, phase + 0.4, rate = 0.10, minAlpha = 0x08, maxAlpha = 0x18)
commands += DrawCommand(DrawLayer.BLOCK, dk, 8, "${id}_torch_wall_s",
    torchWallSouthPos,
    DrawPayload.ColorPath(torchWallSouthPts, (wallAlpha shl 24) or baseWallColor))
commands += DrawCommand(DrawLayer.BLOCK, dk, 8, "${id}_torch_wall_e",
    torchWallEastPos,
    DrawPayload.ColorPath(torchWallEastPts, (wallAlpha shl 24) or baseWallColor))

// Ambient halo — broad soft oval around torch bracket itself
val haloAlpha = flickerAlpha(tick, phase + 0.9, rate = 0.08, minAlpha = 0x14, maxAlpha = 0x30)
commands += DrawCommand(DrawLayer.BLOCK, dk, 9, "${id}_torch_halo",
    Vec2f(torchScreenX - 18f, torchScreenY - 18f),
    DrawPayload.ColorOval(36f, 28f, (haloAlpha shl 24) or CastleColors.TORCH_HALO))

// Flame — small bright oval at top of bracket; flickers size too
val flameSize = 5f + flickerAlpha(tick, phase + 1.2, rate = 0.20, minAlpha = 0, maxAlpha = 3).toFloat()
commands += DrawCommand(DrawLayer.BLOCK, dk, 11, "${id}_torch_flame",
    Vec2f(torchScreenX - flameSize / 2f, torchScreenY - flameSize - 2f),
    DrawPayload.ColorOval(flameSize, flameSize * 1.4f, 0xFF_FFA020.toInt()))
// Flame core — brighter white-yellow centre
commands += DrawCommand(DrawLayer.BLOCK, dk, 12, "${id}_torch_flame_core",
    Vec2f(torchScreenX - 2f, torchScreenY - flameSize - 1f),
    DrawPayload.ColorOval(4f, 5f, 0xFF_FFEE80.toInt()))
```

## Cauldron room special glow

In `buildCauldronCommands()`, add a green pulsing floor glow under the cauldron:
```kotlin
val cauldPhase  = torchPhase(cauldronGx, cauldronGy) + 3.0  // offset from torches
val cauldAlpha  = flickerAlpha(tick, cauldPhase, rate = 0.06, minAlpha = 0x18, maxAlpha = 0x40)
commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "cauldron_glow",
    Vec2f(cauldScreen.x - 28f, cauldScreen.y),
    DrawPayload.ColorOval(56f, 28f, (cauldAlpha shl 24) or 0x44BB00))
```

---

# IMPROVEMENT 2 — Enemy Visual Overhaul

**Target:** `RoomEntityFactory.kt` — `buildActorCommands()` or equivalent  
**Domain change:** None — uses existing `ActorType` enum  
**Effort:** Medium | **Impact:** High

## Problem
`ActorType` has 6 types: `GUARD`, `GHOST`, `ROBOT`, `DRUID`, `BALL`, `CAULDRON_GUARDIAN`.  
All currently render as a generic coloured rectangle. You cannot tell at a glance what is chasing you.

## Design principle
Each enemy needs one **unique silhouette reading** at 10 tiles distance:
- GUARD = tall, heavy, armoured human silhouette
- GHOST = wide, translucent, drifting
- ROBOT = boxy, symmetric, mechanical
- DRUID = hunched, hooded, asymmetric
- BALL = perfectly circular, fast visual spin indicator
- CAULDRON_GUARDIAN = massive, tentacled, room-filling

## Colour constants
```kotlin
// GUARD
val GUARD_ARMOUR      = 0xFF_4A4E58.toInt()  // iron plate
val GUARD_ARMOUR_HL   = 0xFF_8A8E98.toInt()  // specular on chest
val GUARD_PLUME       = 0xFF_CC2200.toInt()  // red helmet plume — readable at distance

// GHOST
val GHOST_BODY        = 0x88_B8C8FF.toInt()  // translucent blue-white
val GHOST_CORE        = 0xCC_D8E8FF.toInt()  // brighter centre
val GHOST_EYE         = 0xFF_220044.toInt()  // deep void purple eyes

// ROBOT
val ROBOT_FRAME       = 0xFF_5A6060.toInt()  // tarnished brass-grey
val ROBOT_JOINT       = 0xFF_303838.toInt()  // dark mechanical joint
val ROBOT_EYE         = 0xFF_00FF88.toInt()  // green scanline glow
val ROBOT_EYE_GLOW    = 0x33_00FF88.toInt()  // soft glow halo

// DRUID
val DRUID_ROBE        = 0xFF_1A1428.toInt()  // near-black purple robe
val DRUID_ROBE_EDGE   = 0xFF_2E2244.toInt()  // edge catch
val DRUID_SKULL       = 0xFF_B8A880.toInt()  // aged bone face
val DRUID_ORB         = 0xFF_8800CC.toInt()  // magic orb held in hand
val DRUID_ORB_GLOW    = 0x44_BB00FF.toInt()  // glow halo around orb

// BALL
val BALL_BODY         = 0xFF_882200.toInt()  // dark iron cannonball
val BALL_SHINE        = 0xFF_CC6644.toInt()  // rolling specular

// CAULDRON_GUARDIAN
val GUARDIAN_BODY     = 0xFF_1A2A1A.toInt()  // dark swamp-green
val GUARDIAN_TENTACLE = 0xFF_2A3A2A.toInt()
val GUARDIAN_EYE      = 0xFF_FFCC00.toInt()  // gold single eye
```

## Rendering: replace the generic actor draw switch

```kotlin
private fun buildActorCommands(
    actor: ActorState,
    state: GameState,
    room: RoomDefinition,
    offset: Vec2f,
): List<DrawCommand> {
    val commands = mutableListOf<DrawCommand>()
    val screen = IsoProjector.toScreen(actor.position) + offset
    val cx = screen.x
    val cy = screen.y
    val tick = state.time.tick
    val phase = torchPhase(actor.position.x.toInt(), actor.position.y.toInt())
    val dk = IsoProjector.depthKey(actor.position)

    when (actor.type) {

        ActorType.GUARD -> {
            // Shadow
            commands += shadow(cx, cy, 20f, 6f, dk)
            // Boots — heavy iron sabatons
            val lLegY = walkBob(tick, phase, 0f)
            val rLegY = walkBob(tick, phase, kotlin.math.PI)
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_boot_l",
                Vec2f(cx - 9f, cy - 12f + lLegY), DrawPayload.ColorRect(7f, 12f, GUARD_ARMOUR))
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_boot_r",
                Vec2f(cx + 2f, cy - 12f + rLegY), DrawPayload.ColorRect(7f, 12f, GUARD_ARMOUR))
            // Tabard body — wide rectangular torso with vertical seam
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_body",
                Vec2f(cx - 11f, cy - 40f), DrawPayload.ColorRect(22f, 28f, GUARD_ARMOUR))
            // Chest plate highlight
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_chest_hl",
                Vec2f(cx - 6f, cy - 38f), DrawPayload.ColorRect(8f, 14f, GUARD_ARMOUR_HL))
            // Arms — plate rerebraces
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_arm_l",
                Vec2f(cx - 16f, cy - 36f), DrawPayload.ColorRect(5f, 18f, GUARD_ARMOUR))
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_arm_r",
                Vec2f(cx + 11f, cy - 36f), DrawPayload.ColorRect(5f, 18f, GUARD_ARMOUR))
            // Head — sallet helmet
            commands += DrawCommand(DrawLayer.NPC, dk, 3, "${actor.id}_helm",
                Vec2f(cx - 8f, cy - 56f), DrawPayload.ColorOval(16f, 12f, GUARD_ARMOUR))
            // Red plume — instantly readable from far away
            commands += DrawCommand(DrawLayer.NPC, dk, 4, "${actor.id}_plume",
                Vec2f(cx - 3f, cy - 66f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(cx - 3f, cy - 58f),
                    Vec2f(cx + 1f, cy - 58f),
                    Vec2f(cx + 3f, cy - 68f),
                    Vec2f(cx - 1f, cy - 66f),
                ), GUARD_PLUME))
            // Halberd — vertical line right side
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_halberd",
                Vec2f(cx + 14f, cy - 68f),
                DrawPayload.Line(cx + 14f, cy - 2f, cx + 14f, cy - 68f, 0xFF_707880.toInt(), 1.5f))
            // Halberd blade
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_halberd_blade",
                Vec2f(cx + 11f, cy - 68f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(cx + 11f, cy - 68f),
                    Vec2f(cx + 17f, cy - 68f),
                    Vec2f(cx + 14f, cy - 76f),
                ), 0xFF_A8B0B8.toInt()))
        }

        ActorType.GHOST -> {
            // Shadow — very faint, ghost barely touches ground
            commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${actor.id}_shadow",
                Vec2f(cx - 12f, cy - 4f), DrawPayload.ColorOval(24f, 8f, 0x20_000000.toInt()))

            // Drift: ghost bobs up-down with a slow sine, no walk cycle
            val driftY = (kotlin.math.sin(tick.toDouble() * 0.04 + phase) * 5.0).toFloat()
            val gcy = cy + driftY

            // Body — wide translucent teardrop (oval + lower triangle)
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_body",
                Vec2f(cx - 14f, gcy - 40f), DrawPayload.ColorOval(28f, 36f, GHOST_BODY))
            // Brighter core
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_core",
                Vec2f(cx - 9f, gcy - 36f), DrawPayload.ColorOval(18f, 22f, GHOST_CORE))
            // Trailing wisp tails — 3 thin ovals below body
            for (ti in 0..2) {
                val tx = cx - 8f + ti * 8f
                val tailWiggle = (kotlin.math.sin(tick.toDouble() * 0.07 + phase + ti * 1.2) * 3.0).toFloat()
                commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_tail_$ti",
                    Vec2f(tx - 3f, gcy - 12f + tailWiggle),
                    DrawPayload.ColorOval(6f, 12f, GHOST_BODY))
            }
            // Eyes — two deep void ovals
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_eye_l",
                Vec2f(cx - 6f, gcy - 34f), DrawPayload.ColorOval(5f, 6f, GHOST_EYE))
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_eye_r",
                Vec2f(cx + 1f, gcy - 34f), DrawPayload.ColorOval(5f, 6f, GHOST_EYE))
        }

        ActorType.ROBOT -> {
            commands += shadow(cx, cy, 20f, 6f, dk)
            val stepL = walkBob(tick, phase, 0.0)
            val stepR = walkBob(tick, phase, kotlin.math.PI)
            // Legs — rectangular pistons
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_leg_l",
                Vec2f(cx - 9f, cy - 14f + stepL), DrawPayload.ColorRect(6f, 14f, ROBOT_FRAME))
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_leg_r",
                Vec2f(cx + 3f, cy - 14f + stepR), DrawPayload.ColorRect(6f, 14f, ROBOT_FRAME))
            // Knee joints
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_knee_l",
                Vec2f(cx - 8f, cy - 14f + stepL), DrawPayload.ColorRect(5f, 3f, ROBOT_JOINT))
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_knee_r",
                Vec2f(cx + 3f, cy - 14f + stepR), DrawPayload.ColorRect(5f, 3f, ROBOT_JOINT))
            // Torso — square boxy hull
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_body",
                Vec2f(cx - 12f, cy - 42f), DrawPayload.ColorRect(24f, 28f, ROBOT_FRAME))
            // Panel seam lines on torso — horizontal
            for (si in 0..1) {
                val sy = cy - 38f + si * 10f
                commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_seam_$si",
                    Vec2f(cx - 12f, sy),
                    DrawPayload.Line(cx - 12f, sy, cx + 12f, sy, ROBOT_JOINT, 0.8f))
            }
            // Arms — angular L-shape
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_arm_l",
                Vec2f(cx - 18f, cy - 38f), DrawPayload.ColorRect(6f, 16f, ROBOT_FRAME))
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_arm_r",
                Vec2f(cx + 12f, cy - 38f), DrawPayload.ColorRect(6f, 16f, ROBOT_FRAME))
            // Head — perfect square on a neck stub
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_neck",
                Vec2f(cx - 4f, cy - 46f), DrawPayload.ColorRect(8f, 4f, ROBOT_JOINT))
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_head",
                Vec2f(cx - 10f, cy - 58f), DrawPayload.ColorRect(20f, 12f, ROBOT_FRAME))
            // Scanline eye — pulsing green bar
            val eyeAlpha = flickerAlpha(tick, phase, rate = 0.25, minAlpha = 0xAA, maxAlpha = 0xFF)
            commands += DrawCommand(DrawLayer.NPC, dk, 3, "${actor.id}_eye",
                Vec2f(cx - 7f, cy - 53f), DrawPayload.ColorRect(14f, 3f, ROBOT_EYE))
            commands += DrawCommand(DrawLayer.NPC, dk, 3, "${actor.id}_eye_glow",
                Vec2f(cx - 10f, cy - 56f), DrawPayload.ColorOval(20f, 10f, ROBOT_EYE_GLOW))
        }

        ActorType.DRUID -> {
            commands += shadow(cx, cy, 18f, 5f, dk)
            // Robe — trapezoidal, wide at hem, narrow at shoulder. Hunched = top offset left.
            val robePts = listOf(
                Vec2f(cx - 12f, cy - 8f),
                Vec2f(cx + 12f, cy - 8f),
                Vec2f(cx +  8f, cy - 44f),
                Vec2f(cx -  4f, cy - 44f),  // offset left — hunched posture
            )
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_robe",
                Vec2f(cx - 12f, cy - 8f), DrawPayload.ColorPath(robePts, DRUID_ROBE))
            // Robe edge highlight
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_robe_edge",
                Vec2f(cx - 12f, cy - 8f),
                DrawPayload.Line(cx - 12f, cy - 8f, cx - 4f, cy - 44f, DRUID_ROBE_EDGE, 0.8f))
            // Skull face — jutting forward from under hood
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_skull",
                Vec2f(cx - 5f, cy - 54f), DrawPayload.ColorOval(12f, 10f, DRUID_SKULL))
            // Hood — dark oval over skull
            commands += DrawCommand(DrawLayer.NPC, dk, 3, "${actor.id}_hood",
                Vec2f(cx - 8f, cy - 58f), DrawPayload.ColorOval(16f, 12f, DRUID_ROBE))
            // Eye sockets — two dark voids
            commands += DrawCommand(DrawLayer.NPC, dk, 4, "${actor.id}_eye_l",
                Vec2f(cx - 4f, cy - 51f), DrawPayload.ColorOval(3f, 3f, 0xFF_000000.toInt()))
            commands += DrawCommand(DrawLayer.NPC, dk, 4, "${actor.id}_eye_r",
                Vec2f(cx + 1f, cy - 51f), DrawPayload.ColorOval(3f, 3f, 0xFF_000000.toInt()))
            // Magic orb — held in right hand, pulsing purple
            val orbPulse = flickerAlpha(tick, phase + 1.0, rate = 0.08, minAlpha = 0xDD, maxAlpha = 0xFF)
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_orb",
                Vec2f(cx + 8f, cy - 28f), DrawPayload.ColorOval(10f, 10f, DRUID_ORB))
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_orb_glow",
                Vec2f(cx + 4f, cy - 32f), DrawPayload.ColorOval(18f, 18f, DRUID_ORB_GLOW))
        }

        ActorType.BALL -> {
            commands += shadow(cx, cy, 18f, 6f, dk)
            // Main body — perfect circle (oval with equal W/H)
            commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_body",
                Vec2f(cx - 12f, cy - 24f), DrawPayload.ColorOval(24f, 24f, BALL_BODY))
            // Rolling specular — a highlight oval that rotates position based on tick
            // Simulate rotation: highlight position orbits centre
            val rotAngle = tick.toDouble() * 0.12  // radians per tick
            val shineOffX = (kotlin.math.cos(rotAngle) * 6.0).toFloat()
            val shineOffY = (kotlin.math.sin(rotAngle) * 4.0).toFloat()
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_shine",
                Vec2f(cx + shineOffX - 3f, cy - 14f + shineOffY - 3f),
                DrawPayload.ColorOval(6f, 4f, BALL_SHINE))
            // Surface crack lines — seeded on actor id, static relative to ball centre
            // (they move with the ball but don't rotate — stylistic choice)
            val crackSeed = actor.id.hashCode() and 0xFF
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_crack",
                Vec2f(cx - 4f, cy - 20f),
                DrawPayload.Line(cx - 4f, cy - 20f, cx + 3f, cy - 14f, 0xFF_221010.toInt(), 0.8f))
        }

        ActorType.CAULDRON_GUARDIAN -> {
            // The guardian is oversized — it should be visually intimidating.
            // It does not walk; it slides. No walk cycle.
            val pulsate = flickerAlpha(tick, phase, rate = 0.05, minAlpha = 0, maxAlpha = 12).toFloat()

            // Tentacle roots — 4 thick root segments radiating from body base
            val tentacleAnchors = listOf(-18f to 0f, -8f to 4f, 8f to 4f, 18f to 0f)
            tentacleAnchors.forEachIndexed { ti, (tx, ty) ->
                val tipWave = (kotlin.math.sin(tick.toDouble() * 0.05 + phase + ti * 0.9) * 8.0).toFloat()
                val t0 = Vec2f(cx + tx, cy + ty)
                val t1 = Vec2f(cx + tx * 1.6f, cy - 14f + tipWave)
                val t2 = Vec2f(cx + tx * 2.2f, cy - 28f + tipWave * 1.5f)
                commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_tent_${ti}_0",
                    t0, DrawPayload.Line(t0.x, t0.y, t1.x, t1.y, GUARDIAN_TENTACLE, 3.5f))
                commands += DrawCommand(DrawLayer.NPC, dk, 0, "${actor.id}_tent_${ti}_1",
                    t1, DrawPayload.Line(t1.x, t1.y, t2.x, t2.y, GUARDIAN_TENTACLE, 2.0f))
            }
            // Main body mass — large dark pulsating oval
            commands += DrawCommand(DrawLayer.NPC, dk, 1, "${actor.id}_body",
                Vec2f(cx - 20f - pulsate, cy - 52f - pulsate),
                DrawPayload.ColorOval(40f + pulsate * 2f, 44f + pulsate * 2f, GUARDIAN_BODY))
            // Single central eye
            commands += DrawCommand(DrawLayer.NPC, dk, 3, "${actor.id}_eye",
                Vec2f(cx - 6f, cy - 40f), DrawPayload.ColorOval(12f, 10f, GUARDIAN_EYE))
            // Eye slit pupil
            commands += DrawCommand(DrawLayer.NPC, dk, 4, "${actor.id}_pupil",
                Vec2f(cx - 2f, cy - 38f), DrawPayload.ColorRect(4f, 6f, 0xFF_000000.toInt()))
            // Glow ring around eye
            commands += DrawCommand(DrawLayer.NPC, dk, 2, "${actor.id}_eye_glow",
                Vec2f(cx - 10f, cy - 44f),
                DrawPayload.ColorOval(20f, 16f, 0x33_FFCC00.toInt()))
        }
    }

    return commands
}

// Helper: standard enemy shadow
private fun shadow(cx: Float, cy: Float, w: Float, h: Float, dk: Int) =
    DrawCommand(DrawLayer.FLOOR, dk, -1, "shadow_${cx}_${cy}",
        Vec2f(cx - w / 2f, cy - h / 2f), DrawPayload.ColorOval(w, h, 0x44_000000.toInt()))

// Helper: walk bob — returns Y offset for a leg; phase=0 for left, π for right
private fun walkBob(tick: Long, basePhase: Double, legPhase: Double): Float =
    (kotlin.math.sin(tick.toDouble() * 0.18 + basePhase + legPhase) * 2.5).toFloat()
```

---

# IMPROVEMENT 3 — Block Push Slide Animation

**Target:** `BlockState.kt` [DOMAIN CHANGE] + `RoomEntityFactory.kt` + block physics engine  
**Effort:** Low | **Impact:** High

## Domain change — add slide interpolation fields to `BlockState`

```kotlin
// BlockState.kt — add two new fields (both nullable, absent = no active slide)
@Serializable
data class BlockState(
    val id: String,
    val gridX: Int,
    val gridY: Int,
    val gridZ: Int,
    val pushable: Boolean = true,
    val fallingTicks: Int = 0,
    val velocityZ: Float = 0f,
    // NEW: slide animation state — null when block is stationary
    val slideFrom: Vec3f? = null,    // grid position the block was pushed FROM
    val slideTick: Int = 0,          // tick when the push started (for interpolation)
) {
    companion object {
        const val SLIDE_DURATION_TICKS = 8  // 8 ticks (~133ms at 60fps) to slide 1 grid unit
    }
}
```

## Logic change — block push handler

When a push is processed (in whatever use case / engine handles block movement):

```kotlin
// OLD (instant snap):
block.copy(gridX = block.gridX + dx, gridY = block.gridY + dy)

// NEW (record slide origin):
block.copy(
    gridX    = block.gridX + dx,
    gridY    = block.gridY + dy,
    slideFrom = Vec3f(block.gridX.toFloat(), block.gridY.toFloat(), block.gridZ.toFloat()),
    slideTick = currentTick,
)
```

In the tick update loop, clear `slideFrom` once the slide is complete:
```kotlin
val slideAge = currentTick - block.slideTick
if (block.slideFrom != null && slideAge >= BlockState.SLIDE_DURATION_TICKS) {
    block.copy(slideFrom = null, slideTick = 0)
} else block
```

## Render change — interpolate block render position

In `RoomEntityFactory.kt`, inside the block rendering section, before calculating `gx/gy/gz`:

```kotlin
// Compute interpolated render position during slide
val (renderGx, renderGy, renderGz) = if (block.slideFrom != null) {
    val slideAge  = state.time.tick - block.slideTick
    val t = (slideAge.toFloat() / BlockState.SLIDE_DURATION_TICKS).coerceIn(0f, 1f)
    // Apply ease-out cubic: t = 1 - (1-t)^3
    val tEased = 1f - (1f - t).let { it * it * it }
    val fromX = block.slideFrom.x
    val fromY = block.slideFrom.y
    val fromZ = block.slideFrom.z
    Triple(
        fromX + (block.gridX - fromX) * tEased,
        fromY + (block.gridY - fromY) * tEased,
        fromZ + (block.gridZ - fromZ) * tEased,
    )
} else {
    Triple(block.gridX.toFloat(), block.gridY.toFloat(), block.gridZ.toFloat())
}

// Use renderGx / renderGy / renderGz instead of block.gridX / block.gridY / block.gridZ
// everywhere in the block draw commands for this block only.
```

## Scrape effect

Add a stone-dust particle trail during slide (3 small dark ovals that fade):
```kotlin
if (block.slideFrom != null) {
    val slideAge = (state.time.tick - block.slideTick).toFloat()
    val trailAlpha = ((1f - slideAge / BlockState.SLIDE_DURATION_TICKS) * 0x30).toInt().coerceAtLeast(0)
    val trailScreen = IsoProjector.toScreen(block.slideFrom) + offset
    commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${block.id}_scrape_trail",
        Vec2f(trailScreen.x - 10f, trailScreen.y),
        DrawPayload.ColorOval(20f, 10f, (trailAlpha shl 24) or 0x282C34))
}
```

---

# IMPROVEMENT 4 — Diegetic HUD (Vignette + Skull Health)

**Target:** `RoomEntityFactory.kt` — HUD / overlay section, or a new `HudRenderer.kt`  
**Domain change:** None — reads existing `GameState`  
**Effort:** Low | **Impact:** High

## Problem
A floating opaque health bar breaks immersion in a dark isometric game. Lives should feel visceral.

## Design
- Health shown as **iron skulls** in the bottom-left corner. Filled skull = alive, cracked skull = last life, dark outline = dead life slot.
- Cauldron curse timer shown as a **pulsing purple vignette ring** around the entire screen edge (alpha scales with urgency).
- Day/night phase shown as a **thin moon/sun arc** in the top-right corner, not a text label.
- All drawn at `DrawLayer.UI` (or equivalent top-most layer).

## Skull rendering

```kotlin
private fun buildHudCommands(state: GameState, viewWidth: Float, viewHeight: Float): List<DrawCommand> {
    val commands = mutableListOf<DrawCommand>()
    val maxLives = 3  // adjust to actual max
    val lives    = state.player.lives

    // ── SKULL HEALTH ────────────────────────────────────────────────────────
    for (li in 0 until maxLives) {
        val sx = 18f + li * 26f
        val sy = viewHeight - 32f
        val alive   = li < lives
        val lastLife = lives == 1 && li == 0

        // Skull body — dark iron oval
        val skullColor = when {
            lastLife -> 0xFF_8B0000.toInt()  // deep red — warning
            alive    -> 0xFF_707880.toInt()  // iron grey
            else     -> 0xFF_282C34.toInt()  // dark empty slot
        }
        commands += DrawCommand(DrawLayer.UI, 0, li, "hud_skull_$li",
            Vec2f(sx - 10f, sy - 14f), DrawPayload.ColorOval(20f, 16f, skullColor))
        // Jaw
        commands += DrawCommand(DrawLayer.UI, 0, li * 10 + 1, "hud_skull_jaw_$li",
            Vec2f(sx - 7f, sy - 4f), DrawPayload.ColorRect(14f, 5f, skullColor))
        // Eye sockets — always dark voids
        commands += DrawCommand(DrawLayer.UI, 0, li * 10 + 2, "hud_skull_eye_l_$li",
            Vec2f(sx - 6f, sy - 12f), DrawPayload.ColorOval(4f, 4f, 0xFF_000000.toInt()))
        commands += DrawCommand(DrawLayer.UI, 0, li * 10 + 3, "hud_skull_eye_r_$li",
            Vec2f(sx + 2f, sy - 12f), DrawPayload.ColorOval(4f, 4f, 0xFF_000000.toInt()))
        // Crack on last life
        if (lastLife) {
            commands += DrawCommand(DrawLayer.UI, 0, li * 10 + 4, "hud_skull_crack_$li",
                Vec2f(sx - 2f, sy - 14f),
                DrawPayload.Line(sx - 2f, sy - 14f, sx + 3f, sy - 8f, 0xFF_CC2200.toInt(), 1f))
        }
    }

    // ── CAULDRON CURSE VIGNETTE ─────────────────────────────────────────────
    // Urgency = how close to next forced transform (0.0 = no urgency, 1.0 = imminent)
    val urgency: Float = state.time.ticksUntilTransform?.let { ticks ->
        (1f - ticks.toFloat() / 180f).coerceIn(0f, 1f)  // 180 ticks = 3 sec warning
    } ?: 0f

    if (urgency > 0f) {
        val tick  = state.time.tick
        val pulse = ((kotlin.math.sin(tick.toDouble() * 0.15) + 1.0) / 2.0).toFloat()
        val vignetteAlpha = ((urgency * 0.6f + pulse * urgency * 0.3f) * 255).toInt().coerceIn(0, 0xA0)
        // Four corner ovals — simulate vignette without a full screen fill
        val vColor = (vignetteAlpha shl 24) or 0x6600AA
        val cornerSize = 120f
        commands += DrawCommand(DrawLayer.UI, 0, 100, "vignette_tl",
            Vec2f(-cornerSize * 0.3f, -cornerSize * 0.3f),
            DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
        commands += DrawCommand(DrawLayer.UI, 0, 101, "vignette_tr",
            Vec2f(viewWidth - cornerSize * 0.7f, -cornerSize * 0.3f),
            DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
        commands += DrawCommand(DrawLayer.UI, 0, 102, "vignette_bl",
            Vec2f(-cornerSize * 0.3f, viewHeight - cornerSize * 0.7f),
            DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
        commands += DrawCommand(DrawLayer.UI, 0, 103, "vignette_br",
            Vec2f(viewWidth - cornerSize * 0.7f, viewHeight - cornerSize * 0.7f),
            DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
    }

    // ── DAY/NIGHT ARC (top-right) ────────────────────────────────────────────
    // A simple crescent / sun disc using two overlapping ovals.
    val arcX = viewWidth - 36f
    val arcY = 28f
    when (state.time.phase) {
        DayPhase.NIGHT, DayPhase.DUSK -> {
            // Moon: white disc
            commands += DrawCommand(DrawLayer.UI, 0, 200, "hud_moon",
                Vec2f(arcX - 9f, arcY - 9f), DrawPayload.ColorOval(18f, 18f, 0xFF_D8DDE8.toInt()))
            // Bite out of moon: dark oval offset
            commands += DrawCommand(DrawLayer.UI, 0, 201, "hud_moon_bite",
                Vec2f(arcX - 4f, arcY - 10f), DrawPayload.ColorOval(14f, 16f, 0xFF_000000.toInt()))
        }
        DayPhase.DAY, DayPhase.DAWN -> {
            // Sun: warm yellow disc
            commands += DrawCommand(DrawLayer.UI, 0, 200, "hud_sun",
                Vec2f(arcX - 10f, arcY - 10f), DrawPayload.ColorOval(20f, 20f, 0xFF_FFD040.toInt()))
            // 4 ray lines
            for (ri in 0..3) {
                val angle = ri.toDouble() * kotlin.math.PI / 2.0
                val rx = (kotlin.math.cos(angle) * 14.0).toFloat()
                val ry = (kotlin.math.sin(angle) * 10.0).toFloat()
                commands += DrawCommand(DrawLayer.UI, 0, 201 + ri, "hud_ray_$ri",
                    Vec2f(arcX + rx * 0.5f, arcY + ry * 0.5f),
                    DrawPayload.Line(arcX + rx * 0.7f, arcY + ry * 0.7f,
                        arcX + rx * 1.3f, arcY + ry * 1.3f, 0xFF_FFD040.toInt(), 1.5f))
            }
        }
    }

    // ── ITEM SLOTS (bottom-right) ────────────────────────────────────────────
    // 3 item slots — replace any existing text/icon system with dark iron brackets
    val inventory = state.player.inventory
    for (si in 0..2) {
        val sx2 = viewWidth - 22f - si * 30f
        val sy2 = viewHeight - 28f
        val hasItem = si < inventory.size
        // Bracket frame — dark rect outline
        val frameColor = if (hasItem) 0xFF_707880.toInt() else 0xFF_282C34.toInt()
        commands += DrawCommand(DrawLayer.UI, 0, 300 + si, "hud_slot_$si",
            Vec2f(sx2 - 10f, sy2 - 12f), DrawPayload.ColorRect(20f, 20f, 0xFF_101418.toInt()))
        commands += DrawCommand(DrawLayer.UI, 0, 301 + si, "hud_slot_frame_$si",
            Vec2f(sx2 - 10f, sy2 - 12f),
            DrawPayload.Line(sx2 - 10f, sy2 - 12f, sx2 + 10f, sy2 - 12f, frameColor, 1f))
        // Item placeholder — a coloured diamond if occupied
        if (hasItem) {
            commands += DrawCommand(DrawLayer.UI, 0, 302 + si * 3, "hud_item_$si",
                Vec2f(sx2 - 5f, sy2 - 8f), DrawPayload.ColorOval(10f, 10f, 0xFF_AA8844.toInt()))
        }
    }

    return commands
}
```

---

# IMPROVEMENT 5 — Room Transition: Directional Slide Pan

**Target:** `RoomTransitionState.kt` [DOMAIN CHANGE] + renderer  
**Effort:** Medium | **Impact:** High

## Domain change — add slide direction to `RoomTransitionState`

```kotlin
// RoomTransitionState.kt
@Serializable
enum class TransitionPhase { SLIDING_OUT, SLIDING_IN }  // replace FADING_OUT / FADING_IN

@Serializable
data class RoomTransitionState(
    val fromRoomId: RoomId,
    val toRoomId: RoomId,
    val targetSpawnId: String,
    val phase: TransitionPhase,
    val ticksRemaining: Int,
    val exitSide: ExitSide,           // NEW: which side the player exited through
    val totalTicks: Int = 20,         // NEW: total duration for lerp calculation
)
```

## Render change — apply slide offset to all room draw commands

In the main render loop, before dispatching room draw commands, compute a translation offset:

```kotlin
/**
 * During a room transition, offset the outgoing room sliding out and the incoming
 * room sliding in from the opposite side.
 *
 * @param transition current transition state (null = no transition)
 * @param viewWidth  viewport pixel width
 * @param viewHeight viewport pixel height
 * @param isOutgoing true = apply to the FROM room; false = apply to the TO room
 */
fun transitionOffset(
    transition: RoomTransitionState?,
    viewWidth: Float,
    viewHeight: Float,
    isOutgoing: Boolean,
): Vec2f {
    transition ?: return Vec2f.ZERO
    val progress = 1f - transition.ticksRemaining.toFloat() / transition.totalTicks.toFloat()
    // Ease-in-out cubic
    val t = if (progress < 0.5f) 4f * progress * progress * progress
            else 1f - (-2f * progress + 2f).let { it * it * it } / 2f

    // Direction vector for the exit side (isometric: NORTH = up-left, EAST = up-right etc.)
    val (dx, dy) = when (transition.exitSide) {
        ExitSide.NORTH -> -0.5f to -0.5f
        ExitSide.SOUTH ->  0.5f to  0.5f
        ExitSide.EAST  ->  0.5f to -0.5f
        ExitSide.WEST  -> -0.5f to  0.5f
    }
    val slideX = dx * viewWidth
    val slideY = dy * viewHeight

    return if (isOutgoing) {
        // Outgoing room slides out in exit direction
        Vec2f(slideX * t, slideY * t)
    } else {
        // Incoming room starts off-screen in opposite direction and slides in
        Vec2f(slideX * (t - 1f), slideY * (t - 1f))
    }
}
```

Apply this offset to the `offset: Vec2f` parameter passed to all `buildXxxCommands()` calls
during a transition frame. No changes to any entity draw functions needed — they all accept offset.

## Fade overlay during transition

Add a brief semi-opaque dark screen fill at peak of transition (t ≈ 0.5) to cover seam:
```kotlin
if (transition != null) {
    val progress = 1f - transition.ticksRemaining.toFloat() / transition.totalTicks.toFloat()
    val peak = 1f - kotlin.math.abs(progress - 0.5f) * 2f  // 0→1→0 triangle
    val fadeAlpha = (peak * 0x88).toInt()
    commands += DrawCommand(DrawLayer.UI, 0, 999, "transition_fade",
        Vec2f(0f, 0f), DrawPayload.ScreenFill((fadeAlpha shl 24) or 0x000000))
}
```

---

# IMPROVEMENT 6 — Sound Event Architecture

**Target:** New file `domain/src/commonMain/kotlin/com/palacesoft/knightlore/domain/model/SoundEvent.kt`  
**[DOMAIN CHANGE]** + platform implementations  
**Effort:** Medium | **Impact:** Very High

## New domain file — `SoundEvent.kt`

```kotlin
package com.palacesoft.knightlore.domain.model

/**
 * Sound events emitted by game logic. The domain emits these; platform layer plays them.
 * No audio APIs in domain — fully decoupled.
 */
sealed interface SoundEvent {
    // Player actions
    data object FootstepStone      : SoundEvent  // player step on stone floor
    data object FootstepWater      : SoundEvent  // player step in flooded room
    data object Jump               : SoundEvent  // player leaves ground
    data object Land               : SoundEvent  // player lands from jump
    data object PlayerHit          : SoundEvent  // player takes damage
    data object PlayerDeath        : SoundEvent  // lives reach 0
    data class  TransformBegin(val toForm: Form) : SoundEvent  // werewolf transformation start
    data object TransformComplete  : SoundEvent  // transformation complete

    // Block interactions
    data object BlockPushStart     : SoundEvent  // player begins pushing block
    data object BlockScrape        : SoundEvent  // block slides across stone
    data object BlockFallLand      : SoundEvent  // falling block hits floor

    // Items
    data class  ItemPickup(val type: ItemType) : SoundEvent
    data object ItemDelivered      : SoundEvent  // item delivered to cauldron

    // Enemies
    data class  EnemyAlert(val type: ActorType) : SoundEvent  // enemy spots player
    data class  EnemyContact(val type: ActorType) : SoundEvent  // enemy touches player

    // Environment
    data object DoorOpen           : SoundEvent
    data object DoorClose          : SoundEvent
    data object CauldronBubble     : SoundEvent  // periodic cauldron ambient
    data object TorchFlicker       : SoundEvent  // rare ambient torch pop
    data object WaterDrip          : SoundEvent  // flooded room ambient

    // Rooms
    data object RoomEnter          : SoundEvent
    data class  RoomAmbient(val type: RoomType) : SoundEvent  // loop trigger per room type
}
```

## Emit sound events from game engine

The game loop / use cases should accumulate a `List<SoundEvent>` each tick and return it
alongside the new `GameState`. Suggested pattern:

```kotlin
// In your game tick function signature:
data class TickResult(
    val newState: GameState,
    val soundEvents: List<SoundEvent>,  // NEW
)
```

Emit examples:
```kotlin
// Player footstep
if (player.movementState == MovementState.WALKING && tick % 18 == 0L) {
    val footstepEvent = if (room.roomType == RoomType.FLOODED)
        SoundEvent.FootstepWater else SoundEvent.FootstepStone
    soundEvents += footstepEvent
}

// Block pushed
if (blockWasPushed) {
    soundEvents += SoundEvent.BlockPushStart
    soundEvents += SoundEvent.BlockScrape
}

// Transformation
if (player.transformState.phase == TransformPhase.TRANSFORMING_TO_WEREWULF
    && player.transformState.progressTicks == 1) {
    soundEvents += SoundEvent.TransformBegin(Form.WEREWULF)
}
```

## Platform-side: `SoundPlayer` expect/actual

```kotlin
// In commonMain — interface
interface SoundPlayer {
    fun play(event: SoundEvent)
    fun stopAmbient()
    fun setAmbient(event: SoundEvent.RoomAmbient)
}

// In androidMain — actual implementation using Android SoundPool / MediaPlayer
// In desktopMain — actual implementation using javax.sound or a clip library
// (Implementation bodies not specified here — platform-specific)
```

---

# IMPROVEMENT 7 — New Room Specials: ThroneRoom, Library, GardenCourtyard

**Target:** `RoomDefinition.kt` [DOMAIN CHANGE] + `RoomEntityFactory.kt`  
**Effort:** High | **Impact:** High

## Domain change — extend `RoomSpecial` sealed interface

```kotlin
// In RoomDefinition.kt — extend existing sealed interface
sealed interface RoomSpecial {
    data object CauldronRoom     : RoomSpecial   // existing
    data object StartRoom        : RoomSpecial   // existing
    data object ThroneRoom       : RoomSpecial   // NEW: boss/payoff room
    data object Library          : RoomSpecial   // NEW: knowledge/puzzle room
    data object GardenCourtyard  : RoomSpecial   // NEW: open-sky feel, moss, well
}
```

## ThroneRoom rendering (`buildThroneCommands()`)

The throne is made of existing `DrawPayload` primitives — no new assets needed.

```kotlin
private fun buildThroneCommands(
    gx: Float, gy: Float, gz: Float,
    ox: Float, oy: Float,
    dk: Int,
): List<DrawCommand> {
    val commands = mutableListOf<DrawCommand>()

    // Base dais — 3-step pyramid of SOLID_BLOCK-sized slabs
    // Step 0 (outermost, lowest): 3×3 grid footprint, height 1
    // Step 1: 2×2, height 1
    // Step 2: 1×1, height 1
    // Each step uses palette.blockTop / blockLeft / blockRight colours
    // (Reuse drawWallFace for vertical faces)
    // ...
    // (Claude: draw each step using existing solid block face logic
    //  at positions gx+offset, gy+offset, gz+step)

    // Throne back — tall slab behind seat: 1×1×3 block column
    // Rendered as 3 stacked SOLID_BLOCK draw calls at gz+3, gz+4, gz+5

    // Armrests — two 1×1×1 blocks at gz+3, flanking the seat at gx-1 and gx+1

    // Crown finials — two small pointed ovals at top of back column
    val crownColor = 0xFF_A07828.toInt()  // aged gold
    commands += DrawCommand(DrawLayer.BLOCK, dk, 20, "throne_finial_l",
        Vec2f(pt(gx - 0.2f, gy, gz + 6f, ox, oy).x, pt(gx - 0.2f, gy, gz + 6f, ox, oy).y),
        DrawPayload.ColorOval(6f, 10f, crownColor))
    commands += DrawCommand(DrawLayer.BLOCK, dk, 20, "throne_finial_r",
        Vec2f(pt(gx + 0.8f, gy, gz + 6f, ox, oy).x, pt(gx + 0.8f, gy, gz + 6f, ox, oy).y),
        DrawPayload.ColorOval(6f, 10f, crownColor))

    return commands
}
```

## Library rendering

Bookshelf = a wall of `SOLID_BLOCK`-height columns along the north and east walls.
On top of each column, instead of a plain wall-top tile, draw horizontal coloured bands
(book spines) in warm parchment tones.

```kotlin
// Book spine colours — seeded on shelf column X position for variety
val bookColors = listOf(
    0xFF_8B2020.toInt(),  // dark red binding
    0xFF_284A28.toInt(),  // dark green binding
    0xFF_2A2A6A.toInt(),  // dark blue binding
    0xFF_5A4010.toInt(),  // brown leather
    0xFF_484018.toInt(),  // ochre
)

// On each bookshelf column top face, instead of plain wallTop:
// Draw 4-5 book spine bands (narrow horizontal rects) using above colours
// Book widths vary by seed (4–8px), heights = face height / 5
// This replaces the plain `DrawPayload.ColorPath(..., palette.wallTop)` call
// on the wall top cap for LIBRARY room columns only.
```

## GardenCourtyard rendering

The courtyard has a sky aperture — draw a large pale blue oval in the ceiling opening
(top face of the room above the height limit), and scatter moss + stone rubble on floors.

```kotlin
// Sky aperture — drawn at DrawLayer.FLOOR with very high depth key so it appears "above"
val skyColor = when (state.time.phase) {
    DayPhase.DAY   -> 0xFF_8AACCC.toInt()  // cool daylight blue
    DayPhase.DUSK  -> 0xFF_CC6633.toInt()  // sunset orange
    DayPhase.NIGHT -> 0xFF_0A0A1E.toInt()  // near-black night
    DayPhase.DAWN  -> 0xFF_AA7755.toInt()  // dusty pink dawn
}
// Draw a large diamond at the top of the room representing sky seen through aperture
commands += DrawCommand(DrawLayer.FLOOR, Int.MAX_VALUE, 0, "sky_aperture",
    Vec2f(ox, oy - 60f),
    DrawPayload.ColorPath(floorDiamond(roomCentreGx, roomCentreGy, roomHeight.toFloat(), ox, oy), skyColor))

// Well prop — at room centre, a circular stone surround
// 1×1 floor tile top face drawn as a circle (oval), surrounded by low wall segments
// (Claude: use ColorOval for the well mouth, 4 short wall segments as the surround)
```

---

# Implementation Order for Claude

Work in this sequence to avoid conflicts:

1. **Improvement 6 first** — add `SoundEvent.kt` (new file, zero conflicts).
2. **Improvement 3** — add `slideFrom`/`slideTick` to `BlockState.kt`.
3. **Improvement 5** — update `RoomTransitionState.kt` with `exitSide` + `totalTicks`.
4. **Improvement 7** — extend `RoomSpecial` sealed interface.
5. **Improvement 1** — add `flickerAlpha()` + `torchPhase()` helpers to `RoomEntityFactory`, update torch draw.
6. **Improvement 2** — add per-`ActorType` rendering to `buildActorCommands()`.
7. **Improvement 3 render** — add interpolation + scrape trail to block render section.
8. **Improvement 4** — add/replace `buildHudCommands()`.
9. **Improvement 5 render** — add `transitionOffset()` + apply in main render loop.

---

## Cross-cutting search confirmations after all changes

- Zero `DrawPayload.DitheredPath(horizontal=true)` (from castle redesign)
- Zero `wFD1`, `wFD2`, `wFR1`, `wFR2` (from castle redesign)
- Zero `tunicColor`, `hatColor` (from player redesign)
- Zero `ws = 1.4f` or `ws=1.4f` (from player redesign)
- `SoundEvent` is imported wherever `TickResult` is used
- `slideFrom` is only read in render, never in physics (physics uses `gridX`/`gridY` always)
- `TransitionPhase.FADING_OUT` / `FADING_IN` — replace all references with `SLIDING_OUT` / `SLIDING_IN`
