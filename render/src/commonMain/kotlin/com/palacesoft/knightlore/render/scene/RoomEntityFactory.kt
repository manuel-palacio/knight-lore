package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.ids.RoomId
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ActorState
import com.palacesoft.knightlore.domain.model.ActorType
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.PatrolEnemy
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemInstance
import com.palacesoft.knightlore.domain.model.ItemLocation
import com.palacesoft.knightlore.domain.model.ItemType
import com.palacesoft.knightlore.domain.model.MovementState
import com.palacesoft.knightlore.domain.model.PlayerState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.RoomSpecial
import com.palacesoft.knightlore.domain.model.RoomTheme
import com.palacesoft.knightlore.domain.model.RoomType
import com.palacesoft.knightlore.domain.model.TransformPhase
import com.palacesoft.knightlore.domain.model.BlockState
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.core.geometry.ZXPalette
import com.palacesoft.knightlore.render.iso.IsoProjector

/**
 * Converts the current GameState + GameContent into a flat list of DrawCommands
 * for the current room. Dark fantasy plague aesthetic — all visuals drawn in code.
 */
object RoomEntityFactory {

    private object CastleColors {
        // ── Wall faces — warm olive/tan stone (Knight Lore GBC palette) ────────
        val WALL_SOUTH_BASE      = 0xFF_7A7860.toInt()
        val WALL_SOUTH_JOINT     = 0xFF_3A3828.toInt()
        val WALL_SOUTH_STONE_LO  = 0xFF_5A5840.toInt()  // darker dither row
        val WALL_SOUTH_STONE_HI  = 0xFF_8A8870.toInt()  // lighter dither row

        val WALL_EAST_BASE       = 0xFF_5A5840.toInt()
        val WALL_EAST_JOINT      = 0xFF_2A2818.toInt()
        val WALL_EAST_STONE_LO   = 0xFF_3A3828.toInt()  // darker shadow face
        val WALL_EAST_STONE_HI   = 0xFF_5A5840.toInt()

        val WALL_TOP             = 0xFF_9A9878.toInt()
        val WALL_TOP_HIGHLIGHT   = 0xFF_B0AA88.toInt()

        // ── Floor — very dark, warm black stone ──────────────────────────────
        val FLOOR_SLAB           = 0xFF_1A1810.toInt()  // near-black warm
        val FLOOR_WORN           = 0xFF_222018.toInt()
        val FLOOR_GROUT          = 0xFF_0E0C08.toInt()
        val FLOOR_CRACK          = 0xFF_080804.toInt()

        // ── Blocks — warm stone matching walls ──────────────────────────────
        val BLOCK_TOP            = 0xFF_9A9878.toInt()
        val BLOCK_LEFT           = 0xFF_6A6850.toInt()
        val BLOCK_RIGHT          = 0xFF_3A3828.toInt()
        val BLOCK_JOINT          = 0xFF_2A2818.toInt()

        // ── Accent / details ─────────────────────────────────────────────────
        val MOSS                 = 0xFF_2A4A2A.toInt()  // damp dark moss (not bright green)
        val CHAIN                = 0xFF_383840.toInt()  // dark iron
        val WATER_SEEP           = 0xFF_1A2A2A.toInt()
        val TORCH_BRACKET        = 0xFF_5A4020.toInt()

        // ── Torch flicker ──────────────────────────────────────────────────
        val TORCH_FLOOR_CAST     = 0xFF6800  // orange-yellow base (alpha applied dynamically)
        val TORCH_WALL_CAST      = 0xFF5000  // slightly cooler on vertical surfaces
        val TORCH_HALO           = 0xFF8800  // wide diffuse ambient ring
        val CAULDRON_GLOW        = 0x44BB00  // toxic green (alpha applied dynamically)
        val WATER_SHIMMER        = 0x0044AA  // cold blue phosphorescence for flooded rooms

        // ── Enemy visuals ──────────────────────────────────────────────────
        // GUARD
        val GUARD_ARMOUR         = 0xFF_4A4E58.toInt()
        val GUARD_ARMOUR_HL      = 0xFF_8A8E98.toInt()
        val GUARD_PLUME          = 0xFF_CC2200.toInt()
        // GHOST
        val GHOST_BODY           = 0x88_B8C8FF.toInt()
        val GHOST_CORE           = 0xCC_D8E8FF.toInt()
        val GHOST_EYE            = 0xFF_220044.toInt()
        // ROBOT
        val ROBOT_FRAME          = 0xFF_5A6060.toInt()
        val ROBOT_JOINT          = 0xFF_303838.toInt()
        val ROBOT_EYE            = 0xFF_00FF88.toInt()
        val ROBOT_EYE_GLOW       = 0x33_00FF88.toInt()
        // DRUID
        val DRUID_ROBE           = 0xFF_1A1428.toInt()
        val DRUID_ROBE_EDGE      = 0xFF_2E2244.toInt()
        val DRUID_SKULL          = 0xFF_B8A880.toInt()
        val DRUID_ORB            = 0xFF_8800CC.toInt()
        val DRUID_ORB_GLOW       = 0x44_BB00FF.toInt()
        // BALL
        val BALL_BODY            = 0xFF_882200.toInt()
        val BALL_SHINE           = 0xFF_CC6644.toInt()
        // CAULDRON_GUARDIAN
        val GUARDIAN_BODY        = 0xFF_1A2A1A.toInt()
        val GUARDIAN_TENTACLE    = 0xFF_2A3A2A.toInt()
        val GUARDIAN_EYE         = 0xFF_FFCC00.toInt()

        // Danger / life
        val DANGER_RED           = 0xFF_CC2200.toInt()
        val LIFE_GREEN           = 0xFF_44FF88.toInt()
        val BLACK                = 0xFF_000000.toInt()
    }

    enum class WallStyle { ASHLAR, RUBBLE }

    /**
     * Per-theme palette. CASTLE = cold limestone. DUNGEON = warm sandstone rubble.
     * TOWER = almost charcoal, very little light.
     */
    private data class ThemePalette(
        // Wall faces
        val wallSouthBase: Int,
        val wallSouthJoint: Int,
        val wallSouthLo: Int,
        val wallSouthHi: Int,
        val wallEastBase: Int,
        val wallEastJoint: Int,
        val wallEastLo: Int,
        val wallEastHi: Int,
        val wallTop: Int,
        val wallTopHighlight: Int,
        // Floor
        val floorSlab: Int,
        val floorWorn: Int,
        val floorGrout: Int,
        // Blocks
        val blockTop: Int,
        val blockLeft: Int,
        val blockRight: Int,
        // Fog
        val fogColor: Int,
        // Whether walls use ashlar courses (CASTLE/TOWER) or rubble cracks (DUNGEON/CAVERN)
        val wallStyle: WallStyle,
    )

    private fun paletteFor(theme: RoomTheme): ThemePalette = when (theme) {
        RoomTheme.CASTLE -> ThemePalette(
            // Warm olive-tan castle stone — like the Knight Lore GBC reference
            wallSouthBase      = 0xFF_7A7860.toInt(),
            wallSouthJoint     = 0xFF_3A3828.toInt(),
            wallSouthLo        = 0xFF_5A5840.toInt(),
            wallSouthHi        = 0xFF_8A8870.toInt(),
            wallEastBase       = 0xFF_5A5840.toInt(),
            wallEastJoint      = 0xFF_2A2818.toInt(),
            wallEastLo         = 0xFF_3A3828.toInt(),
            wallEastHi         = 0xFF_5A5840.toInt(),
            wallTop            = 0xFF_9A9878.toInt(),
            wallTopHighlight   = 0xFF_B0AA88.toInt(),
            floorSlab          = 0xFF_1A1810.toInt(),
            floorWorn          = 0xFF_222018.toInt(),
            floorGrout         = 0xFF_0E0C08.toInt(),
            blockTop           = 0xFF_9A9878.toInt(),
            blockLeft          = 0xFF_6A6850.toInt(),
            blockRight         = 0xFF_3A3828.toInt(),
            fogColor           = 0x20_000000.toInt(),
            wallStyle          = WallStyle.ASHLAR,
        )
        RoomTheme.DUNGEON -> ThemePalette(
            // Warm sandstone, but still desaturated — not a beach, a dank pit
            wallSouthBase      = 0xFF_787060.toInt(),
            wallSouthJoint     = 0xFF_3A3428.toInt(),
            wallSouthLo        = 0xFF_686050.toInt(),
            wallSouthHi        = 0xFF_888070.toInt(),
            wallEastBase       = 0xFF_585048.toInt(),
            wallEastJoint      = 0xFF_2A2420.toInt(),
            wallEastLo         = 0xFF_4A4438.toInt(),
            wallEastHi         = 0xFF_686058.toInt(),
            wallTop            = 0xFF_989080.toInt(),
            wallTopHighlight   = 0xFF_ADA898.toInt(),
            floorSlab          = 0xFF_3A3428.toInt(),
            floorWorn          = 0xFF_4A4438.toInt(),
            floorGrout         = 0xFF_1A1810.toInt(),
            blockTop           = 0xFF_888070.toInt(),
            blockLeft          = 0xFF_585048.toInt(),
            blockRight         = 0xFF_3A3428.toInt(),
            fogColor           = 0x28_080400.toInt(),
            wallStyle          = WallStyle.RUBBLE,
        )
        RoomTheme.TOWER -> ThemePalette(
            // Charcoal — very dark, moonlit tower
            wallSouthBase      = 0xFF_5A5E68.toInt(),
            wallSouthJoint     = 0xFF_282C34.toInt(),
            wallSouthLo        = 0xFF_4E5260.toInt(),
            wallSouthHi        = 0xFF_6A6E78.toInt(),
            wallEastBase       = 0xFF_404450.toInt(),
            wallEastJoint      = 0xFF_1E2028.toInt(),
            wallEastLo         = 0xFF_363A46.toInt(),
            wallEastHi         = 0xFF_4E5260.toInt(),
            wallTop            = 0xFF_7A7E88.toInt(),
            wallTopHighlight   = 0xFF_909498.toInt(),
            floorSlab          = 0xFF_383C48.toInt(),
            floorWorn          = 0xFF_484C58.toInt(),
            floorGrout         = 0xFF_1E2028.toInt(),
            blockTop           = 0xFF_6A6E78.toInt(),
            blockLeft          = 0xFF_404450.toInt(),
            blockRight         = 0xFF_282C38.toInt(),
            fogColor           = 0x30_000010.toInt(),
            wallStyle          = WallStyle.ASHLAR,
        )
    }

    // Project world → screen, adding room offset
    private fun pt(x: Float, y: Float, z: Float, ox: Float, oy: Float): Vec2f {
        val s = IsoProjector.toScreen(Vec3f(x, y, z))
        return Vec2f(ox + s.x, oy + s.y)
    }

    // 4 corners of the top-face diamond at (gx, gy) at height gz
    private fun floorDiamond(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx,      gy,      gz, ox, oy),
        pt(gx + 1f, gy,      gz, ox, oy),
        pt(gx + 1f, gy + 1f, gz, ox, oy),
        pt(gx,      gy + 1f, gz, ox, oy),
    )

    // Seeded deterministic pixel jitter for floor tiles
    private fun jitter(x: Float, seed: Int, axis: Int): Float {
        val h = (seed * 31 + axis * 17) and 0xFFFFFF
        return ((h and 0xF) / 7.5f) - 1.0f  // range -1.0f .. +1.0f deterministic
    }

    // Left (south-y) face of a block: bottom-y face going from gz to gz+1
    private fun blockFaceLeft(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx,      gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz + 1f, ox, oy),
        pt(gx,      gy + 1f, gz + 1f, ox, oy),
    )

    // Right (east-x) face of a block
    private fun blockFaceRight(gx: Float, gy: Float, gz: Float, ox: Float, oy: Float): List<Vec2f> = listOf(
        pt(gx + 1f, gy,      gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz,      ox, oy),
        pt(gx + 1f, gy + 1f, gz + 1f, ox, oy),
        pt(gx + 1f, gy,      gz + 1f, ox, oy),
    )

    /**
     * Draws a wall face (south-facing or east-facing) with per-theme masonry:
     * - ASHLAR: regular cut-stone courses. Horizontal mortar lines + staggered vertical joints.
     * - RUBBLE: solid fill + irregular crack lines (no regular courses).
     *
     * @param facePts  4 world-space corners of the face (bottom-left, bottom-right, top-right, top-left)
     * @param baseColor solid fill colour
     * @param jointColor mortar/crack line colour
     * @param loColor   lower stone course colour (slightly darker)
     * @param hiColor   upper stone course colour (slightly lighter, catch-light)
     * @param style     ASHLAR or RUBBLE
     * @param gxSeed    tile gridX for stagger determinism
     * @param gzOffset  block layer index (0, 1, 2) — used to offset stagger pattern between layers
     */
    /**
     * Draws a wall face with horizontal dithered brick pattern.
     * This produces the classic Filmation-engine stone texture that reads as
     * aged masonry at isometric scale — far better than flat fills with thin lines.
     */
    private fun drawWallFace(
        commands: MutableList<DrawCommand>,
        layer: DrawLayer,
        dk: Int,
        id: String,
        facePts: List<Vec2f>,
        baseColor: Int,
        jointColor: Int,
        loColor: Int,
        hiColor: Int,
        style: WallStyle,
        gxSeed: Int,
        gzOffset: Int,
    ) {
        // Horizontal dithered brick — alternating pixel rows create stone texture
        commands += DrawCommand(layer, dk, 1, id,
            facePts[0],
            DrawPayload.DitheredPath(facePts, loColor, hiColor, horizontal = true))
    }

    // ── Flicker helpers ────────────────────────────────────────────────────

    /**
     * Returns a flicker multiplier in [minAlpha..maxAlpha] driven by time.tick.
     * Each torch gets a unique phase from its tile position so they never sync.
     */
    private fun flickerAlpha(
        tick: Long,
        phase: Double,
        rate: Double = 0.12,
        minAlpha: Int = 0x0A,
        maxAlpha: Int = 0x20,
    ): Int {
        val t = tick.toDouble() * rate + phase
        val raw = (kotlin.math.sin(t) * 0.65 + kotlin.math.sin(t * 2.73 + 1.1) * 0.35)
        val norm = (raw + 1.0) / 2.0
        return (minAlpha + (norm * (maxAlpha - minAlpha)).toInt()).coerceIn(minAlpha, maxAlpha)
    }

    /**
     * Per-torch phase: seeded deterministically on tile grid position.
     * Produces values in 0..2pi, well distributed.
     */
    private fun torchPhase(gx: Int, gy: Int): Double =
        ((gx * 1_317 + gy * 929) and 0x3FF) / 1024.0 * kotlin.math.PI * 2.0

    // ── Walk bob helper for enemy walk cycles ──────────────────────────────

    private fun walkBob(tick: Long, basePhase: Double, legPhase: Double): Float =
        (kotlin.math.sin(tick.toDouble() * 0.18 + basePhase + legPhase) * 2.5).toFloat()

    // ── Shadow helper ──────────────────────────────────────────────────────

    private fun actorShadow(cx: Float, cy: Float, w: Float, h: Float, dk: Int) =
        DrawCommand(DrawLayer.FLOOR, dk, -1, "shadow_${cx}_${cy}",
            Vec2f(cx - w / 2f, cy - h / 2f), DrawPayload.ColorOval(w, h, 0x44_000000.toInt()))

    fun build(
        state: GameState,
        content: GameContent,
        viewportW: Float,
        viewportH: Float,
    ): List<DrawCommand> {
        val room = content.rooms[state.currentRoomId] ?: return emptyList()
        val baseOffset = IsoProjector.roomOffset(room.width, room.depth, viewportW, viewportH)
        // Apply transition slide offset when room is transitioning
        val slideOffset = IsoProjector.transitionOffset(
            state.roomTransition, viewportW, viewportH, isOutgoing = true
        )
        val offset = Vec2f(baseOffset.x + slideOffset.x, baseOffset.y + slideOffset.y)
        val commands = mutableListOf<DrawCommand>()
        val ox = offset.x; val oy = offset.y
        val tick = state.time.tick
        val roomType = room.roomType
        val palette = paletteFor(room.theme)

        // 1. Floor and block tiles
        room.tiles.forEach { tile ->
            val gx = tile.gridX.toFloat()
            val gy = tile.gridY.toFloat()
            val gz = tile.gridZ.toFloat()
            val world = Vec3f(gx, gy, gz)
            when (tile.type) {
                TileType.FLOOR -> {
                    val dk = IsoProjector.depthKey(world)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"
                    val pts = floorDiamond(gx, gy, gz, ox, oy)
                    val seed = tile.gridX * 31 + tile.gridY * 17

                    // Apply subtle per-tile jitter (keep existing logic)
                    val jitteredPts = pts.mapIndexed { i, p ->
                        Vec2f(p.x + jitter(p.x, seed, i * 2), p.y + jitter(p.y, seed, i * 2 + 1))
                    }

                    // ── CRYPT override ──────────────────────────────────────────────────
                    val slabColor = if (roomType == RoomType.CRYPT) 0xFF_1A1018.toInt() else palette.floorSlab
                    val wornColor = if (roomType == RoomType.CRYPT) 0xFF_221820.toInt() else palette.floorWorn
                    val groutColor = palette.floorGrout

                    // 1. Dark stone slab — dithered for subtle texture variation
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id,
                        IsoProjector.toScreen(world) + offset,
                        DrawPayload.DitheredPath(jitteredPts, slabColor, wornColor))

                    // 2. Grout lines — thin dark joints between slabs
                    //    Use full pts (not jittered) for clean straight joints
                    val groutStroke = 0.8f
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_nw",
                        Vec2f(pts[3].x, pts[3].y),
                        DrawPayload.Line(pts[3].x, pts[3].y, pts[0].x, pts[0].y, groutColor, groutStroke))
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_ne",
                        Vec2f(pts[0].x, pts[0].y),
                        DrawPayload.Line(pts[0].x, pts[0].y, pts[1].x, pts[1].y, groutColor, groutStroke))
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_se",
                        Vec2f(pts[1].x, pts[1].y),
                        DrawPayload.Line(pts[1].x, pts[1].y, pts[2].x, pts[2].y, groutColor, groutStroke))
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 2, "${id}_grout_sw",
                        Vec2f(pts[2].x, pts[2].y),
                        DrawPayload.Line(pts[2].x, pts[2].y, pts[3].x, pts[3].y, groutColor, groutStroke))

                    // 4. Crack — 1 in 8 slabs (keep existing logic, update colour)
                    if ((tile.gridX * 7 + tile.gridY * 13) % 8 == 0) {
                        val c1 = pt(gx + 0.2f, gy + 0.15f, gz, ox, oy)
                        val c2 = pt(gx + 0.65f, gy + 0.85f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 3, "${id}_crack",
                            Vec2f(c1.x, c1.y),
                            DrawPayload.Line(c1.x, c1.y, c2.x, c2.y, CastleColors.FLOOR_CRACK, 1f))
                    }

                    // 5. CRYPT coffin lid
                    if (roomType == RoomType.CRYPT && (tile.gridX * 3 + tile.gridY * 7) % 5 == 0) {
                        val coffinPts = listOf(
                            pt(gx + 0.15f, gy + 0.3f, gz, ox, oy),
                            pt(gx + 0.85f, gy + 0.3f, gz, ox, oy),
                            pt(gx + 0.85f, gy + 0.7f, gz, ox, oy),
                            pt(gx + 0.15f, gy + 0.7f, gz, ox, oy),
                        )
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 3, "${id}_coffin",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(coffinPts, 0xFF_1A1A28.toInt()))
                        // Cross inset on coffin lid
                        val ch1 = pt(gx + 0.3f, gy + 0.5f, gz, ox, oy)
                        val ch2 = pt(gx + 0.7f, gy + 0.5f, gz, ox, oy)
                        val cv1 = pt(gx + 0.5f, gy + 0.33f, gz, ox, oy)
                        val cv2 = pt(gx + 0.5f, gy + 0.67f, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_coffin_h",
                            Vec2f(ch1.x, ch1.y),
                            DrawPayload.Line(ch1.x, ch1.y, ch2.x, ch2.y, 0xFF_2A2A38.toInt(), 1f))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_coffin_v",
                            Vec2f(cv1.x, cv1.y),
                            DrawPayload.Line(cv1.x, cv1.y, cv2.x, cv2.y, 0xFF_2A2A38.toInt(), 1f))
                    }

                    // 6. CAVERN rubble
                    if (roomType == RoomType.CAVERN && (tile.gridX * 7 + tile.gridY * 13) % 4 == 0) {
                        val rx = gx + 0.3f + ((tile.gridX * 17) and 0x7) / 16f
                        val ry = gy + 0.3f + ((tile.gridY * 13) and 0x7) / 16f
                        val rubbPt = pt(rx, ry, gz, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 4, "${id}_rubble",
                            Vec2f(rubbPt.x - 3f, rubbPt.y - 2f),
                            DrawPayload.ColorOval(6f, 3f, 0xFF_282C34.toInt()))
                    }
                }
                TileType.SOLID_BLOCK -> {
                    // Depth key based on front-bottom corner (gy+1 is the camera-facing edge)
                    val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
                    val dk = IsoProjector.depthKey(footWorld)
                    // Use depth comparison to decide layer: blocks "in front of" player go to FOREGROUND,
                    // blocks "behind" player stay in BLOCK. This implements the painter's algorithm correctly.
                    val playerPos = state.player.position
                    val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, playerPos.z))
                    val blockLayer = if (dk > playerDk) DrawLayer.FOREGROUND else DrawLayer.BLOCK
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"

                    // Top face
                    commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
                        IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), palette.blockTop))

                    // Left face — use drawWallFace() for consistent masonry look
                    drawWallFace(commands, blockLayer, dk, "${id}_left",
                        blockFaceLeft(gx, gy, gz, ox, oy),
                        baseColor  = palette.blockLeft,
                        jointColor = CastleColors.BLOCK_JOINT,
                        loColor    = palette.blockLeft,
                        hiColor    = palette.blockTop,
                        style      = palette.wallStyle,
                        gxSeed     = gx.toInt(),
                        gzOffset   = gz.toInt(),
                    )

                    // Right face
                    drawWallFace(commands, blockLayer, dk, "${id}_right",
                        blockFaceRight(gx, gy, gz, ox, oy),
                        baseColor  = palette.blockRight,
                        jointColor = CastleColors.BLOCK_JOINT,
                        loColor    = palette.blockRight,
                        hiColor    = palette.blockLeft,
                        style      = palette.wallStyle,
                        gxSeed     = gx.toInt() + 1,
                        gzOffset   = gz.toInt(),
                    )

                    // Chiselled edge on top face (replaces cross — blocks are architectural, not decorative)
                    val edgeColor = CastleColors.BLOCK_JOINT
                    val topPts = floorDiamond(gx, gy, gz + 1f, ox, oy)
                    // Inset diamond outline (drawn 3px inside each edge)
                    val inset = 0.08f
                    val insetPts = listOf(
                        pt(gx + inset,       gy + inset,       gz + 1f, ox, oy),
                        pt(gx + 1f - inset,  gy + inset,       gz + 1f, ox, oy),
                        pt(gx + 1f - inset,  gy + 1f - inset,  gz + 1f, ox, oy),
                        pt(gx + inset,       gy + 1f - inset,  gz + 1f, ox, oy),
                    )
                    for (ei in insetPts.indices) {
                        val ea = insetPts[ei]; val eb = insetPts[(ei + 1) % insetPts.size]
                        commands += DrawCommand(blockLayer, dk, 3, "${id}_edge_$ei",
                            ea, DrawPayload.Line(ea.x, ea.y, eb.x, eb.y, edgeColor, 0.8f))
                    }
                }
                TileType.HAZARD -> {
                    val dk = IsoProjector.depthKey(world)
                    val id = "tile_${tile.gridX}_${tile.gridY}_${tile.gridZ}"
                    val screen = IsoProjector.toScreen(world) + offset
                    val pts = floorDiamond(gx, gy, gz, ox, oy)

                    // Dark red-black pit base
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 0, id, screen,
                        DrawPayload.ColorPath(pts, 0xFF_1A0000.toInt()))
                    // Red glow rim
                    commands += DrawCommand(DrawLayer.FLOOR, dk, 1, "${id}_glow", screen,
                        DrawPayload.ColorPath(pts, 0x22_FF0000.toInt()))

                    // 5 metallic spikes: 1 center + 4 near corners
                    listOf(
                        Pair(gx + 0.5f, gy + 0.5f),
                        Pair(gx + 0.22f, gy + 0.3f),
                        Pair(gx + 0.78f, gy + 0.3f),
                        Pair(gx + 0.22f, gy + 0.7f),
                        Pair(gx + 0.78f, gy + 0.7f),
                    ).forEachIndexed { si, (sx, sy) ->
                        val sBase = pt(sx, sy, gz, ox, oy)
                        val sTip  = pt(sx, sy, gz + 0.4f, ox, oy)
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 2 + si, "${id}_spike_$si",
                            Vec2f(sBase.x, sBase.y),
                            DrawPayload.ColorPath(
                                listOf(Vec2f(sBase.x - 2.5f, sBase.y), Vec2f(sBase.x + 2.5f, sBase.y), sTip),
                                0xFF_4A4A4A.toInt()))
                        commands += DrawCommand(DrawLayer.FLOOR, dk, 8 + si, "${id}_spike_tip_$si",
                            Vec2f(sTip.x - 1f, sTip.y - 1f),
                            DrawPayload.ColorOval(3f, 2f, 0xFF_888888.toInt()))
                    }
                }
                TileType.EMPTY -> return@forEach
            }
        }

        // 2. Perimeter walls
        buildWalls(room, offset, commands, tick, roomType, state.visitedRooms, palette)

        // FLOODED room: water plane over floor tiles
        if (roomType == RoomType.FLOODED) {
            for (tile in room.tiles) {
                if (tile.type != TileType.FLOOR) continue
                val gx2 = tile.gridX.toFloat()
                val gy2 = tile.gridY.toFloat()
                val gz2 = tile.gridZ.toFloat()
                val world2 = Vec3f(gx2, gy2, gz2)
                val dk2 = IsoProjector.depthKey(world2)
                val waterPts = floorDiamond(gx2, gy2, gz2, ox, oy)
                // Water plane: semi-transparent blue
                commands += DrawCommand(DrawLayer.FLOOR, dk2, 9, "water_${tile.gridX}_${tile.gridY}",
                    IsoProjector.toScreen(world2) + offset,
                    DrawPayload.ColorPath(waterPts, 0x88_002244.toInt()))
                // Ripple line — animated with tick and tile position
                val ripplePhase = (tick * 0.08 + tile.gridX * 0.5).toFloat()
                val rippleY = (kotlin.math.sin(ripplePhase.toDouble()) * 3.0).toFloat()
                val rpl1 = pt(gx2 + 0.1f, gy2 + 0.5f, gz2, ox, oy)
                val rpl2 = pt(gx2 + 0.9f, gy2 + 0.5f, gz2, ox, oy)
                commands += DrawCommand(DrawLayer.FLOOR, dk2, 10, "ripple_${tile.gridX}_${tile.gridY}",
                    Vec2f(rpl1.x, rpl1.y + rippleY),
                    DrawPayload.Line(rpl1.x, rpl1.y + rippleY, rpl2.x, rpl2.y + rippleY, 0xAA_002244.toInt(), 1f))
            }
        }

        // THRONE_ANTECHAMBER: decorative column markers + raised dais hint
        if (roomType == RoomType.THRONE_ANTECHAMBER) {
            // Two column markers either side of room center
            val midX = room.width / 2f
            val midY = room.depth / 2f
            for (side in listOf(-1f, 1f)) {
                val colX = midX + side * 2f
                val colY = midY - 1f
                for (gz2 in 0 until 3) {
                    val bz2 = gz2.toFloat()
                    val colWorld = Vec3f(colX, colY, bz2)
                    val colDk = IsoProjector.depthKey(Vec3f(colX + 0.5f, colY + 1f, bz2))
                    commands += DrawCommand(DrawLayer.BLOCK, colDk, 2, "col_${side}_top_$gz2",
                        IsoProjector.toScreen(Vec3f(colX, colY, bz2 + 1f)) + offset,
                        DrawPayload.ColorPath(floorDiamond(colX, colY, bz2 + 1f, ox, oy), palette.wallTop))
                    drawWallFace(
                        commands, DrawLayer.BLOCK, colDk, "col_${side}_left_$gz2",
                        listOf(
                            pt(colX,      colY + 1f, bz2,      ox, oy),
                            pt(colX + 1f, colY + 1f, bz2,      ox, oy),
                            pt(colX + 1f, colY + 1f, bz2 + 1f, ox, oy),
                            pt(colX,      colY + 1f, bz2 + 1f, ox, oy),
                        ),
                        baseColor  = palette.wallSouthBase,
                        jointColor = palette.wallSouthJoint,
                        loColor    = palette.wallSouthLo,
                        hiColor    = palette.wallSouthHi,
                        style      = palette.wallStyle,
                        gxSeed     = colX.toInt(),
                        gzOffset   = gz2,
                    )
                }
            }
            // Raised dais — center platform tiles at gz=1 (drawn as floor diamonds at height 1)
            val daisMinX = (midX - 2f).toInt()
            val daisMaxX = (midX + 2f).toInt()
            val daisMinY = (midY - 1f).toInt()
            val daisMaxY = (midY + 1f).toInt()
            for (dx in daisMinX..daisMaxX) {
                for (dy in daisMinY..daisMaxY) {
                    if (dx < 0 || dy < 0 || dx >= room.width || dy >= room.depth) continue
                    val daisWorld = Vec3f(dx.toFloat(), dy.toFloat(), 1f)
                    val daisDk = IsoProjector.depthKey(daisWorld)
                    commands += DrawCommand(DrawLayer.FLOOR, daisDk, 2, "dais_${dx}_${dy}",
                        IsoProjector.toScreen(daisWorld) + offset,
                        DrawPayload.ColorPath(
                            floorDiamond(dx.toFloat(), dy.toFloat(), 1f, ox, oy),
                            0xFF_1E1E2E.toInt()))
                }
            }
        }

        // 2b. Dynamic (pushable/falling) blocks
        state.dynamicBlocks.forEach { block ->
            buildDynamicBlockCommands(block, state, offset, commands, tick)
        }

        // 3. Items — distinct visuals per item type
        state.itemInstances
            .filterIsInstance<ItemInstance>()
            .forEach { item ->
                val loc = item.location as? ItemLocation.InRoom ?: return@forEach
                if (loc.roomId != state.currentRoomId) return@forEach
                val world = loc.position
                val screen = IsoProjector.toScreen(world) + offset
                val dk = IsoProjector.depthKey(world)
                val pulseFactor = kotlin.math.sin(tick.toDouble() * 0.07).toFloat()
                val id = "item_${item.id.value}"

                // Per-type color and size
                val (itemColor, itemW, itemH, glowColor) = when (item.type) {
                    ItemType.CRYSTAL_BALL   -> listOf(0xFF_AACCFF.toInt(), 20f, 20f, 0x20_8888FF.toInt())
                    ItemType.GOBLET         -> listOf(0xFF_FFD700.toInt(), 16f, 20f, 0x20_FFAA00.toInt())
                    ItemType.WINE_BOTTLE    -> listOf(0xFF_8B0000.toInt(), 12f, 24f, 0x20_FF2222.toInt())
                    ItemType.GEM            -> listOf(0xFF_FF2266.toInt(), 16f, 14f, 0x20_FF4488.toInt())
                    ItemType.POISON_VIAL    -> listOf(0xFF_44CC44.toInt(), 12f, 22f, 0x20_22FF22.toInt())
                    ItemType.BOOT           -> listOf(0xFF_8B6914.toInt(), 20f, 16f, 0x20_AA8822.toInt())
                    ItemType.TEACUP         -> listOf(0xFF_6688CC.toInt(), 18f, 14f, 0x20_4466AA.toInt())
                    ItemType.KEY            -> listOf(0xFF_CCAA44.toInt(), 18f, 10f, 0x20_FFDD44.toInt())
                    ItemType.TORCH          -> listOf(0xFF_FF8800.toInt(), 10f, 24f, 0x20_FF6600.toInt())
                    ItemType.SKULL          -> listOf(0xFF_DDDDCC.toInt(), 16f, 16f, 0x20_AAAAAA.toInt())
                    else                    -> listOf(0xFF_FFDD44.toInt(), 20f, 16f, 0x1A_FFDD44.toInt())
                }
                val color = itemColor as Int
                val w = (itemW as Float) + pulseFactor * 2f
                val h = (itemH as Float) + pulseFactor * 2f
                val glow = glowColor as Int

                // Glow
                commands += DrawCommand(DrawLayer.ITEM, dk, 0, "${id}_glow",
                    Vec2f(screen.x - w / 2f - 2f, screen.y - h / 2f - 2f),
                    DrawPayload.ColorOval(w + 8f, h + 8f, glow))
                // Item shape
                commands += DrawCommand(DrawLayer.ITEM, dk, 1, id, screen,
                    DrawPayload.ColorOval(w, h, color))
                // Specular highlight
                commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_hl",
                    Vec2f(screen.x + 2f, screen.y - 2f),
                    DrawPayload.ColorOval(w * 0.4f, h * 0.3f, 0x66_FFFFFF.toInt()))
            }

        // 4. Patrol enemies — dark green isometric block
        state.patrolEnemies.forEach { enemy ->
            buildPatrolEnemyCommands(enemy, offset, commands, ox, oy)
        }

        // 5. Actors — distinct visuals per actor type
        state.actorStates.forEach { actor ->
            buildActorCommands(actor, offset, commands, tick)
        }

        // 5b. Cauldron — rendered only in CauldronRoom, on top of center blocks
        val roomSpecial = content.rooms[state.currentRoomId]?.special
        if (roomSpecial is RoomSpecial.CauldronRoom) {
            buildCauldronCommands(state, room, offset, commands)
        }

        // 6. Player — dark plague-walker
        buildPlayerCommands(state, commands, offset)

        // 7. Ambient dust particles at inner wall corners
        buildDustParticles(room, offset, tick, commands)

        // 8. Thin edge vignette — only a narrow border, not a ceiling-inducing dark cap
        val fogC = palette.fogColor
        commands += DrawCommand(DrawLayer.HUD, 0, -998, "vignette_top",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW, viewportH * 0.08f, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -997, "vignette_bot",
            Vec2f(0f, viewportH * 0.92f), DrawPayload.ColorRect(viewportW, viewportH * 0.08f, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -996, "vignette_lft",
            Vec2f(0f, 0f), DrawPayload.ColorRect(viewportW * 0.06f, viewportH, fogC))
        commands += DrawCommand(DrawLayer.HUD, 0, -995, "vignette_rgt",
            Vec2f(viewportW * 0.94f, 0f), DrawPayload.ColorRect(viewportW * 0.06f, viewportH, fogC))

        // 9. Day/Night sky tint — subtle full-screen colour wash
        val dayTint = when (state.time.phase) {
            DayPhase.DAY -> null
            DayPhase.DUSK -> 0x08_FF6600.toInt()   // warm orange
            DayPhase.NIGHT -> 0x0C_000066.toInt()   // cold blue
            DayPhase.DAWN -> 0x06_FFAAAA.toInt()    // pink
        }
        if (dayTint != null) {
            commands += DrawCommand(DrawLayer.HUD, 0, -999, "day_tint",
                Vec2f(0f, 0f), DrawPayload.ScreenFill(dayTint))
        }

        // 10. Transition fade overlay — dark seam cover at midpoint of room slide
        val transition = state.roomTransition
        if (transition != null) {
            val progress = 1f - transition.ticksRemaining.toFloat() / transition.totalTicks.toFloat()
            val peak = 1f - kotlin.math.abs(progress - 0.5f) * 2f
            val fadeAlpha = (peak * 0x88).toInt()
            commands += DrawCommand(DrawLayer.HUD, 0, 999, "transition_fade",
                Vec2f(0f, 0f), DrawPayload.ScreenFill((fadeAlpha shl 24) or 0x000000))
        }

        // 11. Diegetic HUD — skull health, vignette, day/night arc, item slots
        commands += buildHudCommands(state, viewportW, viewportH)

        return DrawCommandBuilder.sort(commands)
    }

    // ── Dynamic block rendering ──────────────────────────────────────────────

    private fun buildDynamicBlockCommands(
        block: BlockState,
        state: GameState,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
    ) {
        // Compute interpolated render position during slide
        val slideOrigin = block.slideFrom
        val (renderGx, renderGy, renderGz) = if (slideOrigin != null) {
            val slideAge = state.time.tick - block.slideTick
            val t = (slideAge.toFloat() / BlockState.SLIDE_DURATION_TICKS).coerceIn(0f, 1f)
            // Apply ease-out cubic: t = 1 - (1-t)^3
            val tEased = 1f - (1f - t).let { it * it * it }
            Triple(
                slideOrigin.x + (block.gridX - slideOrigin.x) * tEased,
                slideOrigin.y + (block.gridY - slideOrigin.y) * tEased,
                slideOrigin.z + (block.gridZ - slideOrigin.z) * tEased,
            )
        } else {
            Triple(block.gridX.toFloat(), block.gridY.toFloat(), block.gridZ.toFloat())
        }

        val gx = renderGx
        val gy = renderGy
        val gz = renderGz
        val ox = offset.x; val oy = offset.y

        val footWorld = Vec3f(gx + 0.5f, gy + 1f, gz)
        val dk = IsoProjector.depthKey(footWorld)

        val playerPos = state.player.position
        val playerDk = IsoProjector.depthKey(Vec3f(playerPos.x + 0.5f, playerPos.y + 0.5f, playerPos.z))
        val blockLayer = if (dk > playerDk) DrawLayer.FOREGROUND else DrawLayer.BLOCK
        val id = "dblock_${block.id}"

        // Top face — slightly lighter than static blocks to distinguish pushable
        commands += DrawCommand(blockLayer, dk, 2, "${id}_top",
            IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
            DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), ZXPalette.STONE_CREAM, ZXPalette.STONE_DARK))
        // Left face
        commands += DrawCommand(blockLayer, dk, 1, "${id}_left",
            IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz)) + offset,
            DrawPayload.ColorPath(blockFaceLeft(gx, gy, gz, ox, oy), ZXPalette.STONE_LIGHT, ZXPalette.STONE_DARK))
        // Right face
        commands += DrawCommand(blockLayer, dk, 0, "${id}_right",
            IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz)) + offset,
            DrawPayload.ColorPath(blockFaceRight(gx, gy, gz, ox, oy), ZXPalette.STONE_DARK, ZXPalette.BLACK))

        // Pushable: arrow glyph on left (south) face pointing in push direction
        if (block.pushable && block.velocityZ == 0f) {
            val arrowMid = pt(gx + 0.5f, gy + 1f, gz + 0.5f, ox, oy)
            val arrowTip = pt(gx + 0.5f, gy + 1f, gz + 0.65f, ox, oy)
            val arrowL   = pt(gx + 0.3f, gy + 1f, gz + 0.45f, ox, oy)
            val arrowR   = pt(gx + 0.7f, gy + 1f, gz + 0.45f, ox, oy)
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_shaft",
                Vec2f(arrowMid.x, arrowMid.y),
                DrawPayload.Line(arrowMid.x, arrowMid.y + 4f, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_l",
                Vec2f(arrowL.x, arrowL.y),
                DrawPayload.Line(arrowL.x, arrowL.y, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 3, "${id}_arrow_r",
                Vec2f(arrowR.x, arrowR.y),
                DrawPayload.Line(arrowR.x, arrowR.y, arrowTip.x, arrowTip.y, 0xFF_4A4A6A.toInt(), 1f))
        }

        // Falling warning: crack lines + orange pulse when fallingTicks > 60
        if (block.fallingTicks > 60 || block.velocityZ < 0f) {
            val pulseFactor = kotlin.math.sin(tick.toDouble() * 0.3).toFloat()
            val pulseAlpha = ((0.4f + pulseFactor * 0.3f) * 255).toInt().coerceIn(0, 255)
            val pulseColor = (pulseAlpha shl 24) or 0x00_FF6600

            // Orange glow on top face
            commands += DrawCommand(blockLayer, dk, 4, "${id}_fall_glow",
                IsoProjector.toScreen(Vec3f(gx, gy, gz + 1f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, gz + 1f, ox, oy), pulseColor))

            // 2 crack lines on top face
            val c1a = pt(gx + 0.3f, gy + 0.2f, gz + 1f, ox, oy)
            val c1b = pt(gx + 0.6f, gy + 0.8f, gz + 1f, ox, oy)
            val c2a = pt(gx + 0.7f, gy + 0.3f, gz + 1f, ox, oy)
            val c2b = pt(gx + 0.4f, gy + 0.7f, gz + 1f, ox, oy)
            commands += DrawCommand(blockLayer, dk, 5, "${id}_crack1",
                Vec2f(c1a.x, c1a.y),
                DrawPayload.Line(c1a.x, c1a.y, c1b.x, c1b.y, 0xFF_FF6600.toInt(), 1f))
            commands += DrawCommand(blockLayer, dk, 5, "${id}_crack2",
                Vec2f(c2a.x, c2a.y),
                DrawPayload.Line(c2a.x, c2a.y, c2b.x, c2b.y, 0xFF_FF8800.toInt(), 1f))
        }

        // Scrape dust trail during slide
        if (slideOrigin != null) {
            val slideAge = (state.time.tick - block.slideTick).toFloat()
            val trailAlpha = ((1f - slideAge / BlockState.SLIDE_DURATION_TICKS) * 0x30).toInt().coerceAtLeast(0)
            val trailScreen = IsoProjector.toScreen(slideOrigin) + offset
            commands += DrawCommand(DrawLayer.FLOOR, dk, 5, "${id}_scrape_trail",
                Vec2f(trailScreen.x - 10f, trailScreen.y),
                DrawPayload.ColorOval(20f, 10f, (trailAlpha shl 24) or 0x282C34))
        }
    }

    // ── Wall building ────────────────────────────────────────────────────────

    private fun buildWalls(
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
        roomType: RoomType,
        visitedRooms: Set<RoomId>,
        palette: ThemePalette,
    ) {
        val w = room.width
        val d = room.depth
        val ox = offset.x; val oy = offset.y
        val northGaps = mutableSetOf<Int>()
        val westGaps  = mutableSetOf<Int>()

        for (exit in room.exits) {
            when (exit.side) {
                ExitSide.NORTH -> { northGaps += w / 2 - 1; northGaps += w / 2 }
                ExitSide.WEST  -> { westGaps  += d / 2 - 1; westGaps  += d / 2 }
                else -> { /* south/east walls not rendered in this perspective */ }
            }
        }

        // North wall block: visible faces = top + south-facing inner face (blockFaceLeft)
        fun wallBlockNorth(gx: Float, gy: Float) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "wall_${gx.toInt()}_${gy.toInt()}"

            // ONE continuous south-facing inner face from z=0 to z=3 (no per-block seams)
            val tallFacePts = listOf(
                pt(gx,      gy + 1f, 0f, ox, oy),
                pt(gx + 1f, gy + 1f, 0f, ox, oy),
                pt(gx + 1f, gy + 1f, 3f, ox, oy),
                pt(gx,      gy + 1f, 3f, ox, oy),
            )
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_face",
                tallFacePts[0],
                DrawPayload.DitheredPath(tallFacePts, palette.wallSouthLo, palette.wallSouthHi, horizontal = true))

            // Top cap at z=3
            commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                IsoProjector.toScreen(Vec3f(gx, gy, 3f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 3f, ox, oy), palette.wallTop))
            val h1 = pt(gx, gy, 3f, ox, oy)
            val h2 = pt(gx, gy + 1f, 3f, ox, oy)
            commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_cap_hl",
                Vec2f(h1.x, h1.y),
                DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, palette.wallTopHighlight, 1.2f))

            // Decorations use gz loop but don't draw separate face quads
            for (gz in 0 until 3) {
                val bz = gz.toFloat()
                val isTop = gz == 2

                // CAVERN: stalactite hint — narrow triangles hanging from wall top
                if (roomType == RoomType.CAVERN && (gx.toInt() * 7 + 3) % 5 == 0) {
                    for (sz in 0 until 3) {
                        val stalkX = gx + 0.2f + sz * 0.25f
                        val stalkTop = pt(stalkX, gy, 3.0f, ox, oy)
                        val stalkTip = pt(stalkX, gy, 2.2f - sz * 0.15f, ox, oy)
                        commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_stalk_$sz",
                            Vec2f(stalkTop.x, stalkTop.y),
                            DrawPayload.ColorPath(listOf(
                                Vec2f(stalkTop.x - 2f, stalkTop.y),
                                Vec2f(stalkTop.x + 2f, stalkTop.y),
                                Vec2f(stalkTip.x, stalkTip.y),
                            ), 0xFF_2A2A3A.toInt()))
                    }
                }

                // Moss patch (~1 in 7 wall columns, only on lower block)
                if (!isTop && (gx.toInt() * 5 + gy.toInt() * 9) % 7 == 0) {
                    val moss = pt(gx + 0.35f, gy + 1f, bz + 0.3f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_moss",
                        Vec2f(moss.x - 4f, moss.y - 3f),
                        DrawPayload.ColorOval(9f, 6f, CastleColors.MOSS))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_moss_hi",
                        Vec2f(moss.x - 3f, moss.y - 4f),
                        DrawPayload.ColorOval(5f, 3f, 0xFF_3A6A3A.toInt()))
                }

                // Chains — 1-in-8 wall columns
                if ((gx.toInt() * 13 + gy.toInt() * 7) % 8 == 0 && isTop) {
                    val chainColor = CastleColors.CHAIN
                    // Chain: two line segments hanging from gz=2.8 down ~20px on screen
                    val chainTop = pt(gx + 0.5f, gy + 1f, 2.8f, ox, oy)
                    val chainMid = pt(gx + 0.5f, gy + 1f, 2.0f, ox, oy)
                    val chainBot = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain1",
                        Vec2f(chainTop.x, chainTop.y),
                        DrawPayload.Line(chainTop.x, chainTop.y, chainMid.x, chainMid.y, chainColor, 1f))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain2",
                        Vec2f(chainMid.x, chainMid.y),
                        DrawPayload.Line(chainMid.x, chainMid.y, chainBot.x, chainBot.y, chainColor, 1f))
                    val linkPt = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain_link",
                        Vec2f(linkPt.x - 3f, linkPt.y - 2f),
                        DrawPayload.ColorOval(6f, 4f, chainColor))
                }

                // Cracks — 1-in-6 wall columns: irregular polygon crack on south face
                if ((gx.toInt() * 11 + gy.toInt() * 3) % 6 == 0 && gz == 1) {
                    val crk = listOf(
                        pt(gx + 0.35f, gy + 1f, bz + 0.2f, ox, oy),
                        pt(gx + 0.42f, gy + 1f, bz + 0.5f, ox, oy),
                        pt(gx + 0.38f, gy + 1f, bz + 0.8f, ox, oy),
                        pt(gx + 0.40f, gy + 1f, bz + 0.9f, ox, oy),
                        pt(gx + 0.37f, gy + 1f, bz + 0.5f, ox, oy),
                        pt(gx + 0.33f, gy + 1f, bz + 0.2f, ox, oy),
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_crack",
                        IsoProjector.toScreen(Vec3f(gx, gy + 1f, bz)) + offset,
                        DrawPayload.ColorPath(crk, 0xFF_0A0808.toInt()))
                }

                // Water seep — 1-in-10 wall columns
                if ((gx.toInt() * 7 + gy.toInt() * 19) % 10 == 0 && gz == 1) {
                    val seepTop = pt(gx + 0.6f, gy + 1f, 1.5f, ox, oy)
                    val seepBot = pt(gx + 0.6f, gy + 1f, 0f,   ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_seep",
                        Vec2f(seepTop.x, seepTop.y),
                        DrawPayload.Line(seepTop.x, seepTop.y, seepBot.x, seepBot.y, 0xFF_1A2A2A.toInt(), 1f))
                    val puddle = pt(gx + 0.6f, gy + 1f, 0.05f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_puddle",
                        Vec2f(puddle.x - 4f, puddle.y - 2f),
                        DrawPayload.ColorOval(8f, 4f, 0xFF_1A3A2A.toInt()))
                }

                // Torch sconce — every 4th north wall column, only on gz=0 (ground level to gz=1.5)
                if (gx.toInt() % 4 == 2 && gz == 0) {
                    val tPhase = torchPhase(gx.toInt(), gy.toInt())
                    val isFlooded = roomType == RoomType.FLOODED
                    val isCauldron = room.special is RoomSpecial.CauldronRoom

                    val baseFloorColor = when {
                        isFlooded  -> CastleColors.WATER_SHIMMER
                        isCauldron -> (CastleColors.TORCH_FLOOR_CAST and 0x00FFFF) or 0x448800
                        else       -> CastleColors.TORCH_FLOOR_CAST
                    }
                    val baseWallColor = when {
                        isFlooded  -> CastleColors.WATER_SHIMMER
                        else       -> CastleColors.TORCH_WALL_CAST
                    }

                    // Bracket line
                    val bracketFrom = pt(gx + 0.5f, gy + 1f, 1.5f, ox, oy)
                    val bracketTo   = pt(gx + 0.5f, gy + 0.85f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_bracket",
                        Vec2f(bracketFrom.x, bracketFrom.y),
                        DrawPayload.Line(bracketFrom.x, bracketFrom.y, bracketTo.x, bracketTo.y, 0xFF_5A4020.toInt(), 1.5f))

                    val flamePt = pt(gx + 0.5f, gy + 0.85f, 1.5f, ox, oy)
                    val torchScreenX = flamePt.x
                    val torchScreenY = flamePt.y

                    // Floor cast — large soft diamond, pulsing
                    val floorAlpha = flickerAlpha(tick, tPhase, rate = 0.10, minAlpha = 0x0C, maxAlpha = 0x22)
                    val tileX0 = (gx - 1f).coerceAtLeast(0f)
                    val tileX1 = (gx + 2f).coerceAtMost(room.width.toFloat())
                    var lightGx = tileX0
                    while (lightGx < tileX1) {
                        val lightWorld = Vec3f(lightGx, gy + 0.5f, 0f)
                        val lightDk = IsoProjector.depthKey(lightWorld)
                        commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "torch_light_${gx.toInt()}_${lightGx.toInt()}",
                            IsoProjector.toScreen(lightWorld) + offset,
                            DrawPayload.ColorPath(
                                floorDiamond(lightGx, gy, 0f, ox, oy),
                                (floorAlpha shl 24) or baseFloorColor
                            ))
                        lightGx += 1f
                    }

                    // Wall cast — on the south wall face; slightly delayed phase
                    val wallAlpha = flickerAlpha(tick, tPhase + 0.4, rate = 0.10, minAlpha = 0x08, maxAlpha = 0x18)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 8, "${id}_torch_wall_s",
                        Vec2f(torchScreenX - 9f, torchScreenY - 7f),
                        DrawPayload.ColorOval(18f, 14f, (wallAlpha shl 24) or baseWallColor))

                    // Ambient halo — broad soft oval around torch bracket
                    val haloAlpha = flickerAlpha(tick, tPhase + 0.9, rate = 0.08, minAlpha = 0x14, maxAlpha = 0x30)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 9, "${id}_torch_halo",
                        Vec2f(torchScreenX - 18f, torchScreenY - 18f),
                        DrawPayload.ColorOval(36f, 28f, (haloAlpha shl 24) or CastleColors.TORCH_HALO))

                    // Flame — small bright oval at top of bracket; flickers size too
                    val flameSize = 5f + flickerAlpha(tick, tPhase + 1.2, rate = 0.20, minAlpha = 0, maxAlpha = 3).toFloat()
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 11, "${id}_torch_flame",
                        Vec2f(torchScreenX - flameSize / 2f, torchScreenY - flameSize - 2f),
                        DrawPayload.ColorOval(flameSize, flameSize * 1.4f, 0xFF_FFA020.toInt()))
                    // Flame core — brighter white-yellow centre
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 12, "${id}_torch_flame_core",
                        Vec2f(torchScreenX - 2f, torchScreenY - flameSize - 1f),
                        DrawPayload.ColorOval(4f, 5f, 0xFF_FFEE80.toInt()))
                }
            }
        }

        // West wall block: visible faces = top + east-facing inner face (blockFaceRight)
        fun wallBlockWest(gx: Float, gy: Float) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "wall_${gx.toInt()}_${gy.toInt()}"

            // ONE continuous east-facing inner face from z=0 to z=3
            val tallFacePts = listOf(
                pt(gx + 1f, gy,      0f, ox, oy),
                pt(gx + 1f, gy + 1f, 0f, ox, oy),
                pt(gx + 1f, gy + 1f, 3f, ox, oy),
                pt(gx + 1f, gy,      3f, ox, oy),
            )
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_face",
                tallFacePts[0],
                DrawPayload.DitheredPath(tallFacePts, palette.wallEastLo, palette.wallEastHi, horizontal = true))

            // Top cap at z=3
            commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "${id}_top",
                IsoProjector.toScreen(Vec3f(gx, gy, 3f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 3f, ox, oy), palette.wallTop))
            val h1 = pt(gx, gy, 3f, ox, oy)
            val h2 = pt(gx + 1f, gy, 3f, ox, oy)
            commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_cap_hl",
                Vec2f(h1.x, h1.y),
                DrawPayload.Line(h1.x, h1.y, h2.x, h2.y, palette.wallTopHighlight, 1.2f))

            // Decorations loop (no separate face quads)
            for (gz in 0 until 3) {
                val bz = gz.toFloat()
                val isTop = gz == 2

                // Moss patch (~1 in 7 wall columns, only on lower block)
                if (!isTop && (gx.toInt() * 5 + gy.toInt() * 9) % 7 == 0) {
                    val moss = pt(gx + 0.35f, gy + 1f, bz + 0.3f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "${id}_moss",
                        Vec2f(moss.x - 4f, moss.y - 3f),
                        DrawPayload.ColorOval(9f, 6f, CastleColors.MOSS))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_moss_hi",
                        Vec2f(moss.x - 3f, moss.y - 4f),
                        DrawPayload.ColorOval(5f, 3f, 0xFF_3A6A3A.toInt()))
                }

                // Chains — 1-in-8 wall columns
                if ((gx.toInt() * 13 + gy.toInt() * 7) % 8 == 0 && isTop) {
                    val chainColor = CastleColors.CHAIN
                    val chainTop = pt(gx + 0.5f, gy + 1f, 2.8f, ox, oy)
                    val chainMid = pt(gx + 0.5f, gy + 1f, 2.0f, ox, oy)
                    val chainBot = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain1",
                        Vec2f(chainTop.x, chainTop.y),
                        DrawPayload.Line(chainTop.x, chainTop.y, chainMid.x, chainMid.y, chainColor, 1f))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain2",
                        Vec2f(chainMid.x, chainMid.y),
                        DrawPayload.Line(chainMid.x, chainMid.y, chainBot.x, chainBot.y, chainColor, 1f))
                    val linkPt = pt(gx + 0.5f, gy + 1f, 1.2f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_chain_link",
                        Vec2f(linkPt.x - 3f, linkPt.y - 2f),
                        DrawPayload.ColorOval(6f, 4f, chainColor))
                }

                // Cracks — 1-in-6 wall columns: irregular polygon crack on east face
                if ((gx.toInt() * 11 + gy.toInt() * 3) % 6 == 0 && gz == 1) {
                    val crk = listOf(
                        pt(gx + 1f, gy + 0.35f, bz + 0.2f, ox, oy),
                        pt(gx + 1f, gy + 0.42f, bz + 0.5f, ox, oy),
                        pt(gx + 1f, gy + 0.38f, bz + 0.8f, ox, oy),
                        pt(gx + 1f, gy + 0.40f, bz + 0.9f, ox, oy),
                        pt(gx + 1f, gy + 0.37f, bz + 0.5f, ox, oy),
                        pt(gx + 1f, gy + 0.33f, bz + 0.2f, ox, oy),
                    )
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_crack",
                        IsoProjector.toScreen(Vec3f(gx + 1f, gy, bz)) + offset,
                        DrawPayload.ColorPath(crk, 0xFF_0A0808.toInt()))
                }

                // Water seep — 1-in-10 wall columns
                if ((gx.toInt() * 7 + gy.toInt() * 19) % 10 == 0 && gz == 1) {
                    val seepTop = pt(gx + 1f, gy + 0.6f, 1.5f, ox, oy)
                    val seepBot = pt(gx + 1f, gy + 0.6f, 0f,   ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 4, "${id}_seep",
                        Vec2f(seepTop.x, seepTop.y),
                        DrawPayload.Line(seepTop.x, seepTop.y, seepBot.x, seepBot.y, 0xFF_1A2A2A.toInt(), 1f))
                    val puddle = pt(gx + 1f, gy + 0.6f, 0.05f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 5, "${id}_puddle",
                        Vec2f(puddle.x - 4f, puddle.y - 2f),
                        DrawPayload.ColorOval(8f, 4f, 0xFF_1A3A2A.toInt()))
                }

                // Torch sconce — every 4th west wall column, only on gz=0
                if (gy.toInt() % 4 == 2 && gz == 0) {
                    val tPhase = torchPhase(gx.toInt(), gy.toInt())
                    val isFlooded = roomType == RoomType.FLOODED
                    val isCauldron = room.special is RoomSpecial.CauldronRoom

                    val baseFloorColor = when {
                        isFlooded  -> CastleColors.WATER_SHIMMER
                        isCauldron -> (CastleColors.TORCH_FLOOR_CAST and 0x00FFFF) or 0x448800
                        else       -> CastleColors.TORCH_FLOOR_CAST
                    }
                    val baseWallColor = when {
                        isFlooded  -> CastleColors.WATER_SHIMMER
                        else       -> CastleColors.TORCH_WALL_CAST
                    }

                    // Bracket line — west wall uses right face (x+1)
                    val bracketFrom = pt(gx + 1f, gy + 0.5f, 1.5f, ox, oy)
                    val bracketTo   = pt(gx + 0.85f, gy + 0.5f, 1.5f, ox, oy)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 6, "${id}_bracket",
                        Vec2f(bracketFrom.x, bracketFrom.y),
                        DrawPayload.Line(bracketFrom.x, bracketFrom.y, bracketTo.x, bracketTo.y, 0xFF_5A4020.toInt(), 1.5f))

                    val flamePt = pt(gx + 0.85f, gy + 0.5f, 1.5f, ox, oy)
                    val torchScreenX = flamePt.x
                    val torchScreenY = flamePt.y

                    // Floor cast — pulsing warm tint on nearby floor tiles
                    val floorAlpha = flickerAlpha(tick, tPhase, rate = 0.10, minAlpha = 0x0C, maxAlpha = 0x22)
                    val tileY0 = (gy - 1f).coerceAtLeast(0f)
                    val tileY1 = (gy + 2f).coerceAtMost(room.depth.toFloat())
                    var lightGy = tileY0
                    while (lightGy < tileY1) {
                        val lightWorld = Vec3f(gx + 0.5f, lightGy, 0f)
                        val lightDk = IsoProjector.depthKey(lightWorld)
                        commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "torch_light_${gy.toInt()}_${lightGy.toInt()}",
                            IsoProjector.toScreen(lightWorld) + offset,
                            DrawPayload.ColorPath(
                                floorDiamond(gx, lightGy, 0f, ox, oy),
                                (floorAlpha shl 24) or baseFloorColor
                            ))
                        lightGy += 1f
                    }

                    // Wall cast — on the east wall face; slightly delayed phase
                    val wallAlpha = flickerAlpha(tick, tPhase + 0.4, rate = 0.10, minAlpha = 0x08, maxAlpha = 0x18)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 8, "${id}_torch_wall_e",
                        Vec2f(torchScreenX - 9f, torchScreenY - 7f),
                        DrawPayload.ColorOval(18f, 14f, (wallAlpha shl 24) or baseWallColor))

                    // Ambient halo
                    val haloAlpha = flickerAlpha(tick, tPhase + 0.9, rate = 0.08, minAlpha = 0x14, maxAlpha = 0x30)
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 9, "${id}_torch_halo",
                        Vec2f(torchScreenX - 18f, torchScreenY - 18f),
                        DrawPayload.ColorOval(36f, 28f, (haloAlpha shl 24) or CastleColors.TORCH_HALO))

                    // Flame
                    val flameSize = 5f + flickerAlpha(tick, tPhase + 1.2, rate = 0.20, minAlpha = 0, maxAlpha = 3).toFloat()
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 11, "${id}_torch_flame",
                        Vec2f(torchScreenX - flameSize / 2f, torchScreenY - flameSize - 2f),
                        DrawPayload.ColorOval(flameSize, flameSize * 1.4f, 0xFF_FFA020.toInt()))
                    commands += DrawCommand(DrawLayer.BLOCK, dk, 12, "${id}_torch_flame_core",
                        Vec2f(torchScreenX - 2f, torchScreenY - flameSize - 1f),
                        DrawPayload.ColorOval(4f, 5f, 0xFF_FFEE80.toInt()))
                }
            }
        }

        // Clean rectangular doorway: dark void (z=0..2), narrow jamb columns, lintel at z=2.
        fun doorArchway(gx: Float, gy: Float, isFirst: Boolean, isLast: Boolean, side: ExitSide, targetRoomId: RoomId? = null) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "door_${gx.toInt()}_${gy.toInt()}"

            // Floor tile at the threshold
            commands += DrawCommand(DrawLayer.FLOOR, dk, 0, "${id}_floor",
                IsoProjector.toScreen(Vec3f(gx, gy, 0f)) + offset,
                DrawPayload.ColorPath(floorDiamond(gx, gy, 0f, ox, oy), palette.floorSlab))

            if (side == ExitSide.NORTH) {
                // Dark void z=0..2
                val voidL = if (isFirst) gx + 0.35f else gx
                val voidR = if (isLast) gx + 0.65f else gx + 1f
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_void",
                    IsoProjector.toScreen(Vec3f(voidL, gy + 1f, 0f)) + offset,
                    DrawPayload.ColorPath(listOf(
                        pt(voidL, gy + 1f, 0f, ox, oy), pt(voidR, gy + 1f, 0f, ox, oy),
                        pt(voidR, gy + 1f, 2f, ox, oy), pt(voidL, gy + 1f, 2f, ox, oy),
                    ), ZXPalette.BLACK))

                // Left jamb — narrow quad [gx, gx+0.35] on the y+1 face
                if (isFirst) {
                    for (jz in 0 until 2) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 0.15f, gy + 1f, jz.toFloat()))
                        drawWallFace(
                            commands, DrawLayer.BLOCK, jdk, "${id}_jl_$jz",
                            listOf(
                                pt(gx, gy + 1f, jz.toFloat(), ox, oy), pt(gx + 0.35f, gy + 1f, jz.toFloat(), ox, oy),
                                pt(gx + 0.35f, gy + 1f, jz + 1f, ox, oy), pt(gx, gy + 1f, jz + 1f, ox, oy),
                            ),
                            baseColor  = palette.wallSouthBase,
                            jointColor = palette.wallSouthJoint,
                            loColor    = palette.wallSouthLo,
                            hiColor    = palette.wallSouthHi,
                            style      = palette.wallStyle,
                            gxSeed     = gx.toInt(),
                            gzOffset   = jz,
                        )
                    }
                }
                // Right jamb — narrow quad [gx+0.65, gx+1]
                if (isLast) {
                    for (jz in 0 until 2) {
                        val jdk = IsoProjector.depthKey(Vec3f(gx + 0.85f, gy + 1f, jz.toFloat()))
                        drawWallFace(
                            commands, DrawLayer.BLOCK, jdk, "${id}_jr_$jz",
                            listOf(
                                pt(gx + 0.65f, gy + 1f, jz.toFloat(), ox, oy), pt(gx + 1f, gy + 1f, jz.toFloat(), ox, oy),
                                pt(gx + 1f, gy + 1f, jz + 1f, ox, oy), pt(gx + 0.65f, gy + 1f, jz + 1f, ox, oy),
                            ),
                            baseColor  = palette.wallSouthBase,
                            jointColor = palette.wallSouthJoint,
                            loColor    = palette.wallSouthLo,
                            hiColor    = palette.wallSouthHi,
                            style      = palette.wallStyle,
                            gxSeed     = gx.toInt(),
                            gzOffset   = jz,
                        )
                    }
                }

                // Lintel at z=2 — top face + inner face
                val ldk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 2f))
                commands += DrawCommand(DrawLayer.BLOCK, ldk, 2, "${id}_lintel_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, 2f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, 2f, ox, oy), palette.wallTop))
                drawWallFace(
                    commands, DrawLayer.BLOCK, ldk, "${id}_lintel_face",
                    blockFaceLeft(gx, gy, 1f, ox, oy),
                    baseColor  = palette.wallSouthBase,
                    jointColor = palette.wallSouthJoint,
                    loColor    = palette.wallSouthLo,
                    hiColor    = palette.wallSouthHi,
                    style      = palette.wallStyle,
                    gxSeed     = gx.toInt(),
                    gzOffset   = 1,
                )

            } else { // WEST
                val faceX = gx + 1f
                val voidT = if (isFirst) gy + 0.35f else gy
                val voidB = if (isLast) gy + 0.65f else gy + 1f
                commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "${id}_void",
                    IsoProjector.toScreen(Vec3f(faceX, voidT, 0f)) + offset,
                    DrawPayload.ColorPath(listOf(
                        pt(faceX, voidT, 0f, ox, oy), pt(faceX, voidB, 0f, ox, oy),
                        pt(faceX, voidB, 2f, ox, oy), pt(faceX, voidT, 2f, ox, oy),
                    ), ZXPalette.BLACK))

                // Top jamb — narrow quad [gy, gy+0.35]
                if (isFirst) {
                    for (jz in 0 until 2) {
                        val jdk = IsoProjector.depthKey(Vec3f(faceX, gy + 0.15f, jz.toFloat()))
                        drawWallFace(
                            commands, DrawLayer.BLOCK, jdk, "${id}_jl_$jz",
                            listOf(
                                pt(faceX, gy, jz.toFloat(), ox, oy), pt(faceX, gy + 0.35f, jz.toFloat(), ox, oy),
                                pt(faceX, gy + 0.35f, jz + 1f, ox, oy), pt(faceX, gy, jz + 1f, ox, oy),
                            ),
                            baseColor  = palette.wallEastBase,
                            jointColor = palette.wallEastJoint,
                            loColor    = palette.wallEastLo,
                            hiColor    = palette.wallEastHi,
                            style      = palette.wallStyle,
                            gxSeed     = gy.toInt(),
                            gzOffset   = jz,
                        )
                    }
                }
                // Bottom jamb — narrow quad [gy+0.65, gy+1]
                if (isLast) {
                    for (jz in 0 until 2) {
                        val jdk = IsoProjector.depthKey(Vec3f(faceX, gy + 0.85f, jz.toFloat()))
                        drawWallFace(
                            commands, DrawLayer.BLOCK, jdk, "${id}_jr_$jz",
                            listOf(
                                pt(faceX, gy + 0.65f, jz.toFloat(), ox, oy), pt(faceX, gy + 1f, jz.toFloat(), ox, oy),
                                pt(faceX, gy + 1f, jz + 1f, ox, oy), pt(faceX, gy + 0.65f, jz + 1f, ox, oy),
                            ),
                            baseColor  = palette.wallEastBase,
                            jointColor = palette.wallEastJoint,
                            loColor    = palette.wallEastLo,
                            hiColor    = palette.wallEastHi,
                            style      = palette.wallStyle,
                            gxSeed     = gy.toInt(),
                            gzOffset   = jz,
                        )
                    }
                }

                // Lintel at z=2
                val ldk = IsoProjector.depthKey(Vec3f(faceX, gy + 0.5f, 2f))
                commands += DrawCommand(DrawLayer.BLOCK, ldk, 2, "${id}_lintel_top",
                    IsoProjector.toScreen(Vec3f(gx, gy, 2f)) + offset,
                    DrawPayload.ColorPath(floorDiamond(gx, gy, 2f, ox, oy), palette.wallTop))
                drawWallFace(
                    commands, DrawLayer.BLOCK, ldk, "${id}_lintel_face",
                    blockFaceRight(gx, gy, 1f, ox, oy),
                    baseColor  = palette.wallEastBase,
                    jointColor = palette.wallEastJoint,
                    loColor    = palette.wallEastLo,
                    hiColor    = palette.wallEastHi,
                    style      = palette.wallStyle,
                    gxSeed     = gy.toInt(),
                    gzOffset   = 1,
                )
            }
        }

        val northExitTarget = room.exits.find { it.side == ExitSide.NORTH }?.targetRoomId
        val westExitTarget  = room.exits.find { it.side == ExitSide.WEST }?.targetRoomId

        // North wall (gy=0): draw only south-facing inner face + top
        for (x in 0 until w) {
            if (x in northGaps) doorArchway(x.toFloat(), 0f,
                northGaps.minOrNull() == x,
                northGaps.maxOrNull() == x,
                ExitSide.NORTH,
                northExitTarget)
            else wallBlockNorth(x.toFloat(), 0f)
        }
        // West wall (gx=0): draw only east-facing inner face + top
        for (y in 1 until d - 1) {
            if (y in westGaps) doorArchway(0f, y.toFloat(),
                westGaps.minOrNull() == y,
                westGaps.maxOrNull() == y,
                ExitSide.WEST,
                westExitTarget)
            else wallBlockWest(0f, y.toFloat())
        }

        // South/East exits: plain dark opening with two solid half-wall pillars (no glow).
        for (exit in room.exits) {
            when (exit.side) {
                ExitSide.SOUTH -> {
                    val gapX0 = (w / 2 - 1).toFloat()
                    val gapY = (d - 1).toFloat()
                    for (gi in 0..1) {
                        val egx = gapX0 + gi
                        val edk = IsoProjector.depthKey(Vec3f(egx + 0.5f, gapY + 1f, 0f))
                        val eid = "sexit_${egx.toInt()}_${gapY.toInt()}"
                        // Floor
                        commands += DrawCommand(DrawLayer.FLOOR, edk, 0, "${eid}_floor",
                            IsoProjector.toScreen(Vec3f(egx, gapY, 0f)) + offset,
                            DrawPayload.ColorPath(floorDiamond(egx, gapY, 0f, ox, oy), palette.floorSlab))
                        // Dark void on south face
                        val vL = if (gi == 0) egx + 0.35f else egx
                        val vR = if (gi == 1) egx + 0.65f else egx + 1f
                        commands += DrawCommand(DrawLayer.BLOCK, edk, 0, "${eid}_void",
                            IsoProjector.toScreen(Vec3f(vL, gapY + 1f, 0f)) + offset,
                            DrawPayload.ColorPath(listOf(
                                pt(vL, gapY + 1f, 0f, ox, oy), pt(vR, gapY + 1f, 0f, ox, oy),
                                pt(vR, gapY + 1f, 2f, ox, oy), pt(vL, gapY + 1f, 2f, ox, oy),
                            ), ZXPalette.BLACK))
                        // Left pillar on first tile
                        if (gi == 0) {
                            for (jz in 0 until 2) {
                                drawWallFace(
                                    commands, DrawLayer.BLOCK, edk, "${eid}_pl_$jz",
                                    listOf(
                                        pt(egx, gapY + 1f, jz.toFloat(), ox, oy), pt(egx + 0.35f, gapY + 1f, jz.toFloat(), ox, oy),
                                        pt(egx + 0.35f, gapY + 1f, jz + 1f, ox, oy), pt(egx, gapY + 1f, jz + 1f, ox, oy),
                                    ),
                                    baseColor  = palette.wallSouthBase,
                                    jointColor = palette.wallSouthJoint,
                                    loColor    = palette.wallSouthLo,
                                    hiColor    = palette.wallSouthHi,
                                    style      = palette.wallStyle,
                                    gxSeed     = egx.toInt(),
                                    gzOffset   = jz,
                                )
                            }
                        }
                        // Right pillar on last tile
                        if (gi == 1) {
                            for (jz in 0 until 2) {
                                drawWallFace(
                                    commands, DrawLayer.BLOCK, edk, "${eid}_pr_$jz",
                                    listOf(
                                        pt(egx + 0.65f, gapY + 1f, jz.toFloat(), ox, oy), pt(egx + 1f, gapY + 1f, jz.toFloat(), ox, oy),
                                        pt(egx + 1f, gapY + 1f, jz + 1f, ox, oy), pt(egx + 0.65f, gapY + 1f, jz + 1f, ox, oy),
                                    ),
                                    baseColor  = palette.wallSouthBase,
                                    jointColor = palette.wallSouthJoint,
                                    loColor    = palette.wallSouthLo,
                                    hiColor    = palette.wallSouthHi,
                                    style      = palette.wallStyle,
                                    gxSeed     = egx.toInt(),
                                    gzOffset   = jz,
                                )
                            }
                        }
                    }
                }
                ExitSide.EAST -> {
                    val gapX = (w - 1).toFloat()
                    val gapY0 = (d / 2 - 1).toFloat()
                    val faceX = gapX + 1f
                    for (gi in 0..1) {
                        val egy = gapY0 + gi
                        val edk = IsoProjector.depthKey(Vec3f(gapX + 0.5f, egy + 1f, 0f))
                        val eid = "eexit_${gapX.toInt()}_${egy.toInt()}"
                        commands += DrawCommand(DrawLayer.FLOOR, edk, 0, "${eid}_floor",
                            IsoProjector.toScreen(Vec3f(gapX, egy, 0f)) + offset,
                            DrawPayload.ColorPath(floorDiamond(gapX, egy, 0f, ox, oy), palette.floorSlab))
                        val vT = if (gi == 0) egy + 0.35f else egy
                        val vB = if (gi == 1) egy + 0.65f else egy + 1f
                        commands += DrawCommand(DrawLayer.BLOCK, edk, 0, "${eid}_void",
                            IsoProjector.toScreen(Vec3f(faceX, vT, 0f)) + offset,
                            DrawPayload.ColorPath(listOf(
                                pt(faceX, vT, 0f, ox, oy), pt(faceX, vB, 0f, ox, oy),
                                pt(faceX, vB, 2f, ox, oy), pt(faceX, vT, 2f, ox, oy),
                            ), ZXPalette.BLACK))
                        if (gi == 0) {
                            for (jz in 0 until 2) {
                                drawWallFace(
                                    commands, DrawLayer.BLOCK, edk, "${eid}_pl_$jz",
                                    listOf(
                                        pt(faceX, egy, jz.toFloat(), ox, oy), pt(faceX, egy + 0.35f, jz.toFloat(), ox, oy),
                                        pt(faceX, egy + 0.35f, jz + 1f, ox, oy), pt(faceX, egy, jz + 1f, ox, oy),
                                    ),
                                    baseColor  = palette.wallEastBase,
                                    jointColor = palette.wallEastJoint,
                                    loColor    = palette.wallEastLo,
                                    hiColor    = palette.wallEastHi,
                                    style      = palette.wallStyle,
                                    gxSeed     = egy.toInt(),
                                    gzOffset   = jz,
                                )
                            }
                        }
                        if (gi == 1) {
                            for (jz in 0 until 2) {
                                drawWallFace(
                                    commands, DrawLayer.BLOCK, edk, "${eid}_pr_$jz",
                                    listOf(
                                        pt(faceX, egy + 0.65f, jz.toFloat(), ox, oy), pt(faceX, egy + 1f, jz.toFloat(), ox, oy),
                                        pt(faceX, egy + 1f, jz + 1f, ox, oy), pt(faceX, egy + 0.65f, jz + 1f, ox, oy),
                                    ),
                                    baseColor  = palette.wallEastBase,
                                    jointColor = palette.wallEastJoint,
                                    loColor    = palette.wallEastLo,
                                    hiColor    = palette.wallEastHi,
                                    style      = palette.wallStyle,
                                    gxSeed     = egy.toInt(),
                                    gzOffset   = jz,
                                )
                            }
                        }
                    }
                }
                ExitSide.NORTH, ExitSide.WEST -> { /* handled by doorArchway above */ }
            }
        }
    }

    // ── Cauldron ─────────────────────────────────────────────────────────────

    private fun buildCauldronCommands(
        state: GameState,
        room: RoomDefinition,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
    ) {
        val ox = offset.x; val oy = offset.y
        val tick = state.time.tick
        val cauldronWorld = Vec3f(3.5f, 3.5f, 1f)
        val dk = IsoProjector.depthKey(cauldronWorld)
        val screen = IsoProjector.toScreen(cauldronWorld) + offset

        // Dark base pot: 3-face isometric block at (3.2, 3.2, 1f), size 0.6×0.6×0.7
        val potColor = 0xFF_1A1A2A.toInt()
        val pgx = 3.2f; val pgy = 3.2f; val pgz = 1f
        val pgxEnd = 3.8f; val pgyEnd = 3.8f; val pgzEnd = 1.7f
        commands += DrawCommand(DrawLayer.BLOCK, dk, 2, "cauldron_top",
            IsoProjector.toScreen(Vec3f(pgx, pgy, pgzEnd)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgx,    pgy,    pgzEnd, ox, oy),
                pt(pgxEnd, pgy,    pgzEnd, ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgx,    pgyEnd, pgzEnd, ox, oy),
            ), potColor))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "cauldron_left",
            IsoProjector.toScreen(Vec3f(pgx, pgyEnd, pgz)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgx,    pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgx,    pgyEnd, pgzEnd, ox, oy),
            ), 0xFF_121220.toInt()))
        commands += DrawCommand(DrawLayer.BLOCK, dk, 0, "cauldron_right",
            IsoProjector.toScreen(Vec3f(pgxEnd, pgy, pgz)) + offset,
            DrawPayload.ColorPath(listOf(
                pt(pgxEnd, pgy,    pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgz,    ox, oy),
                pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
                pt(pgxEnd, pgy,    pgzEnd, ox, oy),
            ), 0xFF_0E0E1A.toInt()))

        // Cauldron rim: diamond path at z=1.7f
        val rimPts = listOf(
            pt(pgx,    pgy,    pgzEnd, ox, oy),
            pt(pgxEnd, pgy,    pgzEnd, ox, oy),
            pt(pgxEnd, pgyEnd, pgzEnd, ox, oy),
            pt(pgx,    pgyEnd, pgzEnd, ox, oy),
        )
        commands += DrawCommand(DrawLayer.BLOCK, dk, 3, "cauldron_rim",
            IsoProjector.toScreen(Vec3f(pgx, pgy, pgzEnd)) + offset,
            DrawPayload.ColorPath(rimPts, 0xFF_2A2A3A.toInt()))

        // Glowing liquid: oval at center screen position, alpha pulses between 0xCC..0xFF
        val liquidPhase = (tick % 60).toInt()
        val liquidAlpha = (0xCC + (liquidPhase * (0xFF - 0xCC)) / 60).coerceIn(0xCC, 0xFF)
        val liquidColor = (liquidAlpha shl 24) or (CastleColors.LIFE_GREEN and 0x00FFFFFF)
        commands += DrawCommand(DrawLayer.EFFECT, dk, 4, "cauldron_liquid",
            Vec2f(screen.x - 12f, screen.y - 6f),
            DrawPayload.ColorOval(24f, 12f, liquidColor))

        // Pulsing green glow halo at floor level
        val cauldPhase = torchPhase(3, 3) + 3.0
        val cauldAlpha = flickerAlpha(tick, cauldPhase, rate = 0.06, minAlpha = 0x18, maxAlpha = 0x40)
        val cauldScreen = IsoProjector.toScreen(Vec3f(3.5f, 3.5f, 1f)) + offset
        commands += DrawCommand(DrawLayer.FLOOR, IsoProjector.depthKey(Vec3f(3.5f, 3.5f, 1f)), 5, "cauldron_glow",
            Vec2f(cauldScreen.x - 28f, cauldScreen.y),
            DrawPayload.ColorOval(56f, 28f, (cauldAlpha shl 24) or CastleColors.CAULDRON_GLOW))

        // 3 bubble particles with staggered rising phases
        for (bi in 0..2) {
            val bubblePhase = ((tick + bi * 20L) % 60).toInt()
            val bubbleT = bubblePhase / 60f
            val bx = screen.x + (-4f + bi * 4f)
            val by = screen.y - 4f - bubbleT * 12f
            val bubbleAlpha = ((1f - bubbleT) * 160f).toInt().coerceIn(0, 160)
            if (bubbleAlpha < 20) continue
            val bubbleColor = (bubbleAlpha shl 24) or 0x44FF88
            commands += DrawCommand(DrawLayer.EFFECT, dk, 5 + bi, "cauldron_bubble_$bi",
                Vec2f(bx - 2f, by - 2f),
                DrawPayload.ColorOval(4f, 4f, bubbleColor))
        }
    }

    // ── Patrol enemies ───────────────────────────────────────────────────────

    private fun buildPatrolEnemyCommands(
        enemy: PatrolEnemy,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        ox: Float,
        oy: Float,
    ) {
        val footWorld = Vec3f(enemy.position.x, enemy.position.y, 0f)
        val screen = IsoProjector.toScreen(footWorld) + offset
        val dk = IsoProjector.depthKey(footWorld)
        val id = "patrol_${enemy.id}"
        val cx = screen.x
        val cy = screen.y

        // Shadow
        commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
            Vec2f(cx - 10f, cy - 3f), DrawPayload.ColorOval(20f, 6f, 0x50_000000.toInt()))

        // Body — squat green oval
        commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
            Vec2f(cx - 8f, cy - 20f), DrawPayload.ColorOval(16f, 20f, 0xFF_228822.toInt()))

        // Left ear — upward triangle
        commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_ear_l",
            Vec2f(cx - 9f, cy - 28f),
            DrawPayload.ColorPath(listOf(
                Vec2f(cx - 9f, cy - 20f),
                Vec2f(cx - 5f, cy - 20f),
                Vec2f(cx - 8f, cy - 29f),
            ), 0xFF_228822.toInt()))

        // Right ear — upward triangle
        commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_ear_r",
            Vec2f(cx + 5f, cy - 28f),
            DrawPayload.ColorPath(listOf(
                Vec2f(cx + 5f, cy - 20f),
                Vec2f(cx + 9f, cy - 20f),
                Vec2f(cx + 8f, cy - 29f),
            ), 0xFF_228822.toInt()))

        // Left eye
        commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_l",
            Vec2f(cx - 5f, cy - 17f), DrawPayload.ColorOval(3f, 3f, 0xFF_FFAA44.toInt()))

        // Right eye
        commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_r",
            Vec2f(cx + 2f, cy - 17f), DrawPayload.ColorOval(3f, 3f, 0xFF_FFAA44.toInt()))
    }

    // ── Actors ───────────────────────────────────────────────────────────────

    private fun buildActorCommands(
        actor: ActorState,
        offset: Vec2f,
        commands: MutableList<DrawCommand>,
        tick: Long,
    ) {
        val screen = IsoProjector.toScreen(actor.position) + offset
        val dk = IsoProjector.depthKey(actor.position)
        val cx = screen.x
        val cy = screen.y
        val id = "actor_${actor.id.value}"
        val phase = torchPhase(actor.position.x.toInt(), actor.position.y.toInt())

        when (actor.type) {
            ActorType.GUARD -> {
                // Shadow
                commands += actorShadow(cx, cy, 20f, 6f, dk)
                // Boots — heavy iron sabatons
                val lLegY = walkBob(tick, phase, 0.0)
                val rLegY = walkBob(tick, phase, kotlin.math.PI)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_boot_l",
                    Vec2f(cx - 9f, cy - 12f + lLegY), DrawPayload.ColorRect(7f, 12f, CastleColors.GUARD_ARMOUR))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_boot_r",
                    Vec2f(cx + 2f, cy - 12f + rLegY), DrawPayload.ColorRect(7f, 12f, CastleColors.GUARD_ARMOUR))
                // Tabard body — wide rectangular torso with vertical seam
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_body",
                    Vec2f(cx - 11f, cy - 40f), DrawPayload.ColorRect(22f, 28f, CastleColors.GUARD_ARMOUR))
                // Chest plate highlight
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_chest_hl",
                    Vec2f(cx - 6f, cy - 38f), DrawPayload.ColorRect(8f, 14f, CastleColors.GUARD_ARMOUR_HL))
                // Arms — plate rerebraces
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_l",
                    Vec2f(cx - 16f, cy - 36f), DrawPayload.ColorRect(5f, 18f, CastleColors.GUARD_ARMOUR))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_r",
                    Vec2f(cx + 11f, cy - 36f), DrawPayload.ColorRect(5f, 18f, CastleColors.GUARD_ARMOUR))
                // Head — sallet helmet
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_helm",
                    Vec2f(cx - 8f, cy - 56f), DrawPayload.ColorOval(16f, 12f, CastleColors.GUARD_ARMOUR))
                // Red plume — instantly readable from far away
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_plume",
                    Vec2f(cx - 3f, cy - 66f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx - 3f, cy - 58f),
                        Vec2f(cx + 1f, cy - 58f),
                        Vec2f(cx + 3f, cy - 68f),
                        Vec2f(cx - 1f, cy - 66f),
                    ), CastleColors.GUARD_PLUME))
                // Halberd — vertical line right side
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_halberd",
                    Vec2f(cx + 14f, cy - 68f),
                    DrawPayload.Line(cx + 14f, cy - 2f, cx + 14f, cy - 68f, 0xFF_707880.toInt(), 1.5f))
                // Halberd blade
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_halberd_blade",
                    Vec2f(cx + 11f, cy - 68f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx + 11f, cy - 68f),
                        Vec2f(cx + 17f, cy - 68f),
                        Vec2f(cx + 14f, cy - 76f),
                    ), 0xFF_A8B0B8.toInt()))
            }

            ActorType.GHOST -> {
                // Shadow — very faint, ghost barely touches ground
                commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
                    Vec2f(cx - 12f, cy - 4f), DrawPayload.ColorOval(24f, 8f, 0x20_000000.toInt()))
                // Drift: ghost bobs up-down with a slow sine, no walk cycle
                val driftY = (kotlin.math.sin(tick.toDouble() * 0.04 + phase) * 5.0).toFloat()
                val gcy = cy + driftY
                // Body — wide translucent teardrop (oval + lower triangle)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 14f, gcy - 40f), DrawPayload.ColorOval(28f, 36f, CastleColors.GHOST_BODY))
                // Brighter core
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_core",
                    Vec2f(cx - 9f, gcy - 36f), DrawPayload.ColorOval(18f, 22f, CastleColors.GHOST_CORE))
                // Trailing wisp tails — 3 thin ovals below body
                for (ti in 0..2) {
                    val tx = cx - 8f + ti * 8f
                    val tailWiggle = (kotlin.math.sin(tick.toDouble() * 0.07 + phase + ti * 1.2) * 3.0).toFloat()
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_tail_$ti",
                        Vec2f(tx - 3f, gcy - 12f + tailWiggle),
                        DrawPayload.ColorOval(6f, 12f, CastleColors.GHOST_BODY))
                }
                // Eyes — two deep void ovals
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_l",
                    Vec2f(cx - 6f, gcy - 34f), DrawPayload.ColorOval(5f, 6f, CastleColors.GHOST_EYE))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_r",
                    Vec2f(cx + 1f, gcy - 34f), DrawPayload.ColorOval(5f, 6f, CastleColors.GHOST_EYE))
            }

            ActorType.ROBOT -> {
                commands += actorShadow(cx, cy, 20f, 6f, dk)
                val stepL = walkBob(tick, phase, 0.0)
                val stepR = walkBob(tick, phase, kotlin.math.PI)
                // Legs — rectangular pistons
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_leg_l",
                    Vec2f(cx - 9f, cy - 14f + stepL), DrawPayload.ColorRect(6f, 14f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_leg_r",
                    Vec2f(cx + 3f, cy - 14f + stepR), DrawPayload.ColorRect(6f, 14f, CastleColors.ROBOT_FRAME))
                // Knee joints
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_knee_l",
                    Vec2f(cx - 8f, cy - 14f + stepL), DrawPayload.ColorRect(5f, 3f, CastleColors.ROBOT_JOINT))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_knee_r",
                    Vec2f(cx + 3f, cy - 14f + stepR), DrawPayload.ColorRect(5f, 3f, CastleColors.ROBOT_JOINT))
                // Torso — square boxy hull
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_body",
                    Vec2f(cx - 12f, cy - 42f), DrawPayload.ColorRect(24f, 28f, CastleColors.ROBOT_FRAME))
                // Panel seam lines on torso — horizontal
                for (si in 0..1) {
                    val sy = cy - 38f + si * 10f
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_seam_$si",
                        Vec2f(cx - 12f, sy),
                        DrawPayload.Line(cx - 12f, sy, cx + 12f, sy, CastleColors.ROBOT_JOINT, 0.8f))
                }
                // Arms — angular blocks
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_l",
                    Vec2f(cx - 18f, cy - 38f), DrawPayload.ColorRect(6f, 16f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_r",
                    Vec2f(cx + 12f, cy - 38f), DrawPayload.ColorRect(6f, 16f, CastleColors.ROBOT_FRAME))
                // Head — perfect square on a neck stub
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_neck",
                    Vec2f(cx - 4f, cy - 46f), DrawPayload.ColorRect(8f, 4f, CastleColors.ROBOT_JOINT))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_head",
                    Vec2f(cx - 10f, cy - 58f), DrawPayload.ColorRect(20f, 12f, CastleColors.ROBOT_FRAME))
                // Scanline eye — pulsing green bar
                @Suppress("UNUSED_VARIABLE")
                val eyeAlpha = flickerAlpha(tick, phase, rate = 0.25, minAlpha = 0xAA, maxAlpha = 0xFF)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_eye",
                    Vec2f(cx - 7f, cy - 53f), DrawPayload.ColorRect(14f, 3f, CastleColors.ROBOT_EYE))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_eye_glow",
                    Vec2f(cx - 10f, cy - 56f), DrawPayload.ColorOval(20f, 10f, CastleColors.ROBOT_EYE_GLOW))
            }

            ActorType.DRUID -> {
                commands += actorShadow(cx, cy, 18f, 5f, dk)
                // Robe — trapezoidal, wide at hem, narrow at shoulder. Hunched = top offset left.
                val robePts = listOf(
                    Vec2f(cx - 12f, cy - 8f),
                    Vec2f(cx + 12f, cy - 8f),
                    Vec2f(cx +  8f, cy - 44f),
                    Vec2f(cx -  4f, cy - 44f),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_robe",
                    Vec2f(cx - 12f, cy - 8f), DrawPayload.ColorPath(robePts, CastleColors.DRUID_ROBE))
                // Robe edge highlight
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_robe_edge",
                    Vec2f(cx - 12f, cy - 8f),
                    DrawPayload.Line(cx - 12f, cy - 8f, cx - 4f, cy - 44f, CastleColors.DRUID_ROBE_EDGE, 0.8f))
                // Skull face — jutting forward from under hood
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_skull",
                    Vec2f(cx - 5f, cy - 54f), DrawPayload.ColorOval(12f, 10f, CastleColors.DRUID_SKULL))
                // Hood — dark oval over skull
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_hood",
                    Vec2f(cx - 8f, cy - 58f), DrawPayload.ColorOval(16f, 12f, CastleColors.DRUID_ROBE))
                // Eye sockets — two dark voids
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_eye_l",
                    Vec2f(cx - 4f, cy - 51f), DrawPayload.ColorOval(3f, 3f, 0xFF_000000.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_eye_r",
                    Vec2f(cx + 1f, cy - 51f), DrawPayload.ColorOval(3f, 3f, 0xFF_000000.toInt()))
                // Magic orb — held in right hand, pulsing purple
                @Suppress("UNUSED_VARIABLE")
                val orbPulse = flickerAlpha(tick, phase + 1.0, rate = 0.08, minAlpha = 0xDD, maxAlpha = 0xFF)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_orb",
                    Vec2f(cx + 8f, cy - 28f), DrawPayload.ColorOval(10f, 10f, CastleColors.DRUID_ORB))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_orb_glow",
                    Vec2f(cx + 4f, cy - 32f), DrawPayload.ColorOval(18f, 18f, CastleColors.DRUID_ORB_GLOW))
            }

            ActorType.BALL -> {
                commands += actorShadow(cx, cy, 18f, 6f, dk)
                // Main body — perfect circle (oval with equal W/H)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body",
                    Vec2f(cx - 12f, cy - 24f), DrawPayload.ColorOval(24f, 24f, CastleColors.BALL_BODY))
                // Rolling specular — a highlight oval that rotates position based on tick
                val rotAngle = tick.toDouble() * 0.12
                val shineOffX = (kotlin.math.cos(rotAngle) * 6.0).toFloat()
                val shineOffY = (kotlin.math.sin(rotAngle) * 4.0).toFloat()
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_shine",
                    Vec2f(cx + shineOffX - 3f, cy - 14f + shineOffY - 3f),
                    DrawPayload.ColorOval(6f, 4f, CastleColors.BALL_SHINE))
                // Surface crack line
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_crack",
                    Vec2f(cx - 4f, cy - 20f),
                    DrawPayload.Line(cx - 4f, cy - 20f, cx + 3f, cy - 14f, 0xFF_221010.toInt(), 0.8f))
            }

            ActorType.CAULDRON_GUARDIAN -> {
                // The guardian is oversized — it should be visually intimidating.
                val pulsate = flickerAlpha(tick, phase, rate = 0.05, minAlpha = 0, maxAlpha = 12).toFloat()
                // Tentacle roots — 4 thick root segments radiating from body base
                val tentacleAnchors = listOf(-18f to 0f, -8f to 4f, 8f to 4f, 18f to 0f)
                tentacleAnchors.forEachIndexed { ti, (tx, ty) ->
                    val tipWave = (kotlin.math.sin(tick.toDouble() * 0.05 + phase + ti * 0.9) * 8.0).toFloat()
                    val t0 = Vec2f(cx + tx, cy + ty)
                    val t1 = Vec2f(cx + tx * 1.6f, cy - 14f + tipWave)
                    val t2 = Vec2f(cx + tx * 2.2f, cy - 28f + tipWave * 1.5f)
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_tent_${ti}_0",
                        t0, DrawPayload.Line(t0.x, t0.y, t1.x, t1.y, CastleColors.GUARDIAN_TENTACLE, 3.5f))
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_tent_${ti}_1",
                        t1, DrawPayload.Line(t1.x, t1.y, t2.x, t2.y, CastleColors.GUARDIAN_TENTACLE, 2.0f))
                }
                // Main body mass — large dark pulsating oval
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_body",
                    Vec2f(cx - 20f - pulsate, cy - 52f - pulsate),
                    DrawPayload.ColorOval(40f + pulsate * 2f, 44f + pulsate * 2f, CastleColors.GUARDIAN_BODY))
                // Single central eye
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_eye",
                    Vec2f(cx - 6f, cy - 40f), DrawPayload.ColorOval(12f, 10f, CastleColors.GUARDIAN_EYE))
                // Eye slit pupil
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_pupil",
                    Vec2f(cx - 2f, cy - 38f), DrawPayload.ColorRect(4f, 6f, 0xFF_000000.toInt()))
                // Glow ring around eye
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_glow",
                    Vec2f(cx - 10f, cy - 44f),
                    DrawPayload.ColorOval(20f, 16f, 0x33_FFCC00.toInt()))
            }
        }
    }

    // ── Player ───────────────────────────────────────────────────────────────

    private fun buildPlayerCommands(
        state: GameState,
        commands: MutableList<DrawCommand>,
        offset: Vec2f,
    ) {
        val player = state.player
        val screen = IsoProjector.toScreen(state.player.position) + offset
        val dk = IsoProjector.depthKey(state.player.position)
        val blinking = player.damageCooldownTicks > 0 && (player.damageCooldownTicks % 10 < 5)
        val isWerewulf = player.form == Form.WEREWULF
        val transforming = player.transformState.phase == TransformPhase.TRANSFORMING_TO_WEREWULF ||
            player.transformState.phase == TransformPhase.TRANSFORMING_TO_HUMAN
        val bob = (kotlin.math.sin(state.time.tick.toDouble() * 0.10472) * 1.5).toFloat()
        val ox = screen.x
        val oy = screen.y

        // ── Transformation energy burst ─────────────────────────────────────────────
        if (transforming) {
            val tick = state.time.tick
            for (ri in 0..2) {
                val ringPhase = ((tick + ri * 20L) % 60).toFloat() / 60f
                val ringSize = (16f + ringPhase * 48f)
                val ringAlpha = ((1f - ringPhase) * 0xCC).toInt()
                val ringColor = (ringAlpha shl 24) or 0x6622AA
                commands += DrawCommand(DrawLayer.EFFECT, dk, 10 + ri, "transform_ring_$ri",
                    Vec2f(ox - ringSize, oy - 30f - ringSize / 2f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(ox,              oy - 30f - ringSize),
                        Vec2f(ox + ringSize,   oy - 30f),
                        Vec2f(ox,              oy - 30f + ringSize / 2f),
                        Vec2f(ox - ringSize,   oy - 30f),
                    ), ringColor))
            }
            val flashAlpha = when {
                player.transformState.progressTicks < 15 -> ((15 - player.transformState.progressTicks) * 0x0A)
                player.transformState.progressTicks > 45 -> ((player.transformState.progressTicks - 45) * 0x0A)
                else -> 0
            }.coerceIn(0, 0x60)
            if (flashAlpha > 0) {
                commands += DrawCommand(DrawLayer.HUD, 0, 5, "transform_flash",
                    Vec2f(0f, 0f), DrawPayload.ScreenFill((flashAlpha shl 24) or 0x6622AA))
            }
        }

        // Character anchor — bob applied once to cy, not per-command
        val cx = screen.x
        val cy = screen.y - bob  // shift entire character up/down with breath/walk bob

        // ── Colour palette ──────────────────────────────────────────────────────────
        // Human form — bright adventurer (must POP against dark castle walls)
        val HUMAN_CLOAK_BASE    = 0xFF_B8A040.toInt()  // warm golden-yellow tunic
        val HUMAN_CLOAK_SHADOW  = 0xFF_8A7830.toInt()  // tunic shadow
        val HUMAN_CLOAK_EDGE    = 0xFF_D0B850.toInt()  // tunic highlight edge
        val HUMAN_LEATHER       = 0xFF_6A4A20.toInt()  // brown leather belt
        val HUMAN_LEATHER_WORN  = 0xFF_8A6830.toInt()  // worn leather highlight
        val HUMAN_SKIN          = 0xFF_E8C880.toInt()  // warm bright skin
        val HUMAN_METAL         = 0xFF_C0C8D0.toInt()  // bright silver helmet
        val HUMAN_METAL_SHINE   = 0xFF_E8F0F8.toInt()  // helmet shine — nearly white
        val HUMAN_SWORD_BLADE   = 0xFF_A0AAB0.toInt()  // sword blade
        val HUMAN_BLINK         = 0xFF_FF2200.toInt()
        // Werewolf form — warm brown fur, not cold grey metal
        val WOLF_FUR_MID        = 0xFF_6A5A40.toInt()  // tawny brown
        val WOLF_FUR_DARK       = 0xFF_3A2E20.toInt()  // dark brown underbelly
        val WOLF_FUR_LIGHT      = 0xFF_8A7858.toInt()  // light brown highlight
        val WOLF_CLAW           = 0xFF_D8D0B8.toInt()  // bone-white claws
        val WOLF_EYE            = 0xFF_FF6600.toInt()  // fiery amber
        val WOLF_FANG           = 0xFF_F0E8D0.toInt()  // ivory

        // ── Walk cycle ──────────────────────────────────────────────────────────────
        val isMoving = player.movementState == MovementState.WALKING
        val walkFrame = if (isMoving) ((state.time.tick * 0.25f).toInt() % 4) else 0
        val isAirborne = player.airborne
        val leftLegFwd  = if (isAirborne) 0f else if (walkFrame == 1) -4f else if (walkFrame == 3) 4f else 0f
        val rightLegFwd = if (isAirborne) 0f else if (walkFrame == 1) 4f else if (walkFrame == 3) -4f else 0f
        val legHeightMul = if (isAirborne) 0.6f else 1.0f

        // ── Shadow ───────────────────────────────────────────────────────────────────
        val shadowW = if (isAirborne) 16f else 22f
        val shadowH = if (isAirborne) 5f  else 7f
        commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "player_shadow",
            Vec2f(cx - shadowW / 2f, screen.y - shadowH / 2f),
            DrawPayload.ColorOval(shadowW, shadowH, 0x44_000000.toInt()))

        if (!isWerewulf) {

            val blink = blinking
            val cloakBase   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_BASE
            val cloakEdge   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_EDGE
            val cloakShadow = if (blink) HUMAN_BLINK else HUMAN_CLOAK_SHADOW
            val skinColor   = if (blink) HUMAN_BLINK else HUMAN_SKIN
            val metalColor  = if (blink) HUMAN_BLINK else HUMAN_METAL

            // ── LEGS (boots) ─────────────────────────────────────────────────────
            // Two dark boot rects, with walk-cycle fore/aft offset on Y
            // Boots are 7px wide, 11px tall — compact, not chunky office-block legs
            val bootColor = if (blink) HUMAN_BLINK else 0xFF_1E1A14.toInt()
            val legH = (11f * legHeightMul)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
                Vec2f(cx - 9f, cy - legH + leftLegFwd),
                DrawPayload.ColorRect(7f, legH, bootColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
                Vec2f(cx + 2f, cy - legH + rightLegFwd),
                DrawPayload.ColorRect(7f, legH, bootColor))
            // Boot highlight — thin 1px lighter line on top edge of each boot
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_boot_l_hl",
                Vec2f(cx - 9f, cy - legH + leftLegFwd),
                DrawPayload.Line(cx - 9f, cy - legH + leftLegFwd, cx - 2f, cy - legH + leftLegFwd, 0xFF_3A3228.toInt(), 1f))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_boot_r_hl",
                Vec2f(cx + 2f, cy - legH + rightLegFwd),
                DrawPayload.Line(cx + 2f, cy - legH + rightLegFwd, cx + 9f, cy - legH + rightLegFwd, 0xFF_3A3228.toInt(), 1f))

            // ── CLOAK BODY ────────────────────────────────────────────────────────
            // The cloak is the dominant shape — a wide polygon that narrows at the shoulders.
            // It hides the body geometry underneath, which is correct for a cloaked figure.
            // Shape: trapezoidal — wider at hem (cy-12), narrower at shoulder (cy-44)
            val cloakHemL  = cx - 13f;  val cloakHemR  = cx + 13f
            val cloakShouL = cx - 9f;   val cloakShouR = cx + 9f
            val hemY       = cy - 12f
            val shouY      = cy - 44f
            val cloakPts = listOf(
                Vec2f(cloakHemL, hemY),
                Vec2f(cloakHemR, hemY),
                Vec2f(cloakShouR, shouY),
                Vec2f(cloakShouL, shouY),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_cloak",
                Vec2f(cloakHemL, hemY), DrawPayload.ColorPath(cloakPts, cloakBase))

            // Cloak centre fold — dark shadow line down the middle
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_fold",
                Vec2f(cx, hemY),
                DrawPayload.Line(cx, hemY, cx - 1f, shouY, cloakShadow, 1f))

            // Cloak left edge catch-light
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_edge_l",
                Vec2f(cloakHemL, hemY),
                DrawPayload.Line(cloakHemL, hemY, cloakShouL, shouY, cloakEdge, 0.8f))

            // ── BELT & SCABBARD ───────────────────────────────────────────────────
            val beltY = cy - 20f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_belt",
                Vec2f(cx - 10f, beltY),
                DrawPayload.ColorRect(20f, 3f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
            // Buckle — small rect, left of centre
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_buckle",
                Vec2f(cx - 4f, beltY - 1f),
                DrawPayload.ColorRect(4f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER_WORN))
            // Scabbard — thin dark rectangle, angled left hip
            // Drawn from belt to leg level, 3px wide
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_scabbard",
                Vec2f(cx - 12f, beltY + 2f),
                DrawPayload.ColorRect(3f, 10f, if (blink) HUMAN_BLINK else 0xFF_1A1810.toInt()))
            // Sword pommel — small oval at top of scabbard (below belt)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_pommel",
                Vec2f(cx - 14f, beltY + 1f),
                DrawPayload.ColorOval(5f, 4f, if (blink) HUMAN_BLINK else HUMAN_METAL))

            // ── ARMS ──────────────────────────────────────────────────────────────
            // Arms emerge from sides of cloak, cloak-coloured (same as body)
            // Left arm hangs slightly forward; right arm is partly behind cloak
            val armTopY = cy - 40f
            val armBotY = cy - 24f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 15f, armTopY + leftLegFwd * 0.4f),
                DrawPayload.ColorRect(5f, armBotY - armTopY, cloakBase))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 10f, armTopY + rightLegFwd * 0.4f),
                DrawPayload.ColorRect(5f, armBotY - armTopY, cloakBase))
            // Gloved hand — dark leather oval at end of each arm
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_l",
                Vec2f(cx - 16f, armBotY + leftLegFwd * 0.4f),
                DrawPayload.ColorOval(6f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_r",
                Vec2f(cx + 10f, armBotY + rightLegFwd * 0.4f),
                DrawPayload.ColorOval(6f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))

            // ── NECK ──────────────────────────────────────────────────────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_neck",
                Vec2f(cx - 3f, cy - 50f),
                DrawPayload.ColorRect(6f, 6f, skinColor))

            // ── FACE ──────────────────────────────────────────────────────────────
            // Small oval — the face is partially shadowed by helmet brim
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_face",
                Vec2f(cx - 6f, cy - 58f),
                DrawPayload.ColorOval(12f, 10f, skinColor))

            // Eyes — two small dark dots; facing direction shifts them L/R
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -2f
                "EAST", "NORTHEAST", "SOUTHEAST" ->  2f
                else -> 0f
            }
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(cx - 3f + facingShift, cy - 55f),
                DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(cx + 2f + facingShift, cy - 55f),
                DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))

            // ── SALLET HELMET ─────────────────────────────────────────────────────
            // Iron bowl helmet — no plume, short rear neck guard.
            // Much smaller than the pith helmet. Reads as medieval, not colonial.
            //
            // Bowl: rounded rect/oval, 16px wide, 10px tall, sits at cy-66 to cy-56
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_helm_bowl",
                Vec2f(cx - 8f, cy - 66f),
                DrawPayload.ColorOval(16f, 11f, metalColor))
            // Helmet shade — darker oval on lower half of bowl (cast shadow from brim)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 7, "player_helm_shade",
                Vec2f(cx - 6f, cy - 60f),
                DrawPayload.ColorOval(12f, 5f, if (blink) HUMAN_BLINK else 0xFF_404850.toInt()))
            // Helmet highlight — specular line across top
            commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_helm_hl",
                Vec2f(cx - 5f, cy - 65f),
                DrawPayload.Line(cx - 5f, cy - 65f, cx + 3f, cy - 65f, if (blink) HUMAN_BLINK else HUMAN_METAL_SHINE, 1.2f))
            // Neck guard — small dark rect below bowl at back
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_helm_guard",
                Vec2f(cx + 4f, cy - 59f),
                DrawPayload.ColorRect(5f, 5f, if (blink) HUMAN_BLINK else 0xFF_383E44.toInt()))
            // Visor slot — single pixel-wide horizontal slit; colour changes when damaged
            val visorColor = when {
                blink              -> 0xFF_FF4400.toInt()
                else               -> 0xFF_1A1E22.toInt()
            }
            commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_visor",
                Vec2f(cx - 5f, cy - 59f),
                DrawPayload.Line(cx - 5f, cy - 59f, cx + 2f, cy - 59f, visorColor, 1f))
        } else {
            // WEREWOLF FORM
            val blink = blinking
            val furMid   = if (blink) HUMAN_BLINK else WOLF_FUR_MID
            val furDark  = if (blink) HUMAN_BLINK else WOLF_FUR_DARK
            val furLight = if (blink) HUMAN_BLINK else WOLF_FUR_LIGHT
            val clawCol  = if (blink) HUMAN_BLINK else WOLF_CLAW
            val eyeCol   = if (blink) HUMAN_BLINK else WOLF_EYE
            val fangCol  = if (blink) HUMAN_BLINK else WOLF_FANG

            val legH = (10f * legHeightMul)

            // ── HIND LEGS ─────────────────────────────────────────────────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
                Vec2f(cx - 9f, cy - legH + leftLegFwd),
                DrawPayload.ColorRect(6f, legH, furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
                Vec2f(cx + 3f, cy - legH + rightLegFwd),
                DrawPayload.ColorRect(6f, legH, furDark))
            // Foot claws — 3 small lines at base of each leg
            for (ci in 0..2) {
                val footX = cx - 10f + ci * 3f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_claw_l_$ci",
                    Vec2f(footX, cy),
                    DrawPayload.Line(footX, cy, footX - 1f + ci * 0.5f, cy + 3f, clawCol, 0.8f))
            }
            for (ci in 0..2) {
                val footX = cx + 3f + ci * 3f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_claw_r_$ci",
                    Vec2f(footX, cy),
                    DrawPayload.Line(footX, cy, footX - 1f + ci * 0.5f, cy + 3f, clawCol, 0.8f))
            }

            // ── BODY — hunched trapezoid ──────────────────────────────────────────
            // Wide at haunches (bottom), slightly narrower at upper back.
            // Haunches sit higher than a human hip — the beast is crouched.
            val haunchY = cy - 14f  // bottom of torso
            val backY   = cy - 42f  // top of back (shoulder blades)
            val bodyPts = listOf(
                Vec2f(cx - 14f, haunchY),   // haunch left
                Vec2f(cx + 14f, haunchY),   // haunch right
                Vec2f(cx + 11f, backY),     // shoulder right
                Vec2f(cx -  7f, backY),     // shoulder left (asymmetric — body faces right)
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_body",
                Vec2f(cx - 14f, haunchY), DrawPayload.ColorPath(bodyPts, furMid))

            // Body shadow — darker panel on right flank
            val shadowPts = listOf(
                Vec2f(cx + 5f,  haunchY),
                Vec2f(cx + 14f, haunchY),
                Vec2f(cx + 11f, backY),
                Vec2f(cx +  5f, backY),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_body_shadow",
                Vec2f(cx + 5f, haunchY), DrawPayload.ColorPath(shadowPts, furDark))

            // Back highlight — 3 short diagonal fur-stroke lines across top of body
            // These replace the invisible horizontal hairlines. They follow the spine angle.
            for (fi in 0..2) {
                val fy  = backY + fi * 7f
                val fx  = cx - 5f + fi * 1.5f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_fur_$fi",
                    Vec2f(fx, fy),
                    DrawPayload.Line(fx - 3f, fy, fx + 6f, fy + 2f, furLight, 0.9f))
            }

            // ── FRONT LEGS / ARMS ─────────────────────────────────────────────────
            // Arms reach forward slightly — the beast is mid-lunge
            val armTopY = cy - 38f
            val armBotY = cy - 24f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 16f, armTopY + leftLegFwd * 0.5f),
                DrawPayload.ColorRect(5f, armBotY - armTopY, furMid))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 11f, armTopY + rightLegFwd * 0.5f),
                DrawPayload.ColorRect(5f, armBotY - armTopY, furMid))
            // Front claws — 3 lines each
            for (ci in 0..2) {
                val handX = cx - 18f + ci * 3f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fclaw_l_$ci",
                    Vec2f(handX, armBotY + leftLegFwd * 0.5f),
                    DrawPayload.Line(handX, armBotY + leftLegFwd * 0.5f,
                        handX - 2f + ci, armBotY + leftLegFwd * 0.5f + 4f, clawCol, 0.9f))
            }
            for (ci in 0..2) {
                val handX = cx + 11f + ci * 3f
                commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fclaw_r_$ci",
                    Vec2f(handX, armBotY + rightLegFwd * 0.5f),
                    DrawPayload.Line(handX, armBotY + rightLegFwd * 0.5f,
                        handX - 2f + ci, armBotY + rightLegFwd * 0.5f + 4f, clawCol, 0.9f))
            }

            // ── HEAD — low and forward ────────────────────────────────────────────
            // The head sits LOW (not high and proud) — the beast crouches.
            // Head centre at cy-50, offset forward (cx+2) to show predatory lean.
            val headCX = cx + 2f
            val headCY = cy - 50f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_head",
                Vec2f(headCX - 9f, headCY - 7f),
                DrawPayload.ColorOval(18f, 14f, furMid))

            // Facing direction
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
                "EAST", "NORTHEAST", "SOUTHEAST" ->  3f
                else -> 0f
            }

            // Snout — elongated oval, projects out from head
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_snout",
                Vec2f(headCX - 5f + facingShift, headCY - 2f),
                DrawPayload.ColorOval(12f, 7f, furDark))
            // Snout tip — slightly lighter (damp nose)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_nose",
                Vec2f(headCX + 3f + facingShift, headCY - 1f),
                DrawPayload.ColorOval(4f, 3f, 0xFF_1A1A22.toInt()))

            // Eyes — burning amber-red, small but vivid against fur
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(headCX - 5f + facingShift, headCY - 6f),
                DrawPayload.ColorOval(3f, 3f, eyeCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(headCX + 1f + facingShift, headCY - 6f),
                DrawPayload.ColorOval(3f, 3f, eyeCol))
            // Eye glow — very faint orange halo around each eye
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_l_glow",
                Vec2f(headCX - 7f + facingShift, headCY - 8f),
                DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_r_glow",
                Vec2f(headCX - 1f + facingShift, headCY - 8f),
                DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))

            // Ears — two pointed triangles, upright and close together
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_l",
                Vec2f(headCX - 9f, headCY - 14f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX - 9f,  headCY - 7f),
                    Vec2f(headCX - 4f,  headCY - 7f),
                    Vec2f(headCX - 7f,  headCY - 17f),
                ), furMid))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_r",
                Vec2f(headCX + 4f, headCY - 14f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX + 3f,  headCY - 7f),
                    Vec2f(headCX + 8f,  headCY - 7f),
                    Vec2f(headCX + 6f,  headCY - 17f),
                ), furMid))
            // Inner ear — darker triangle inside each ear
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_l_in",
                Vec2f(headCX - 8f, headCY - 13f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX - 8f, headCY - 9f),
                    Vec2f(headCX - 5f, headCY - 9f),
                    Vec2f(headCX - 7f, headCY - 14f),
                ), furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_r_in",
                Vec2f(headCX + 4f, headCY - 13f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX + 4f, headCY - 9f),
                    Vec2f(headCX + 7f, headCY - 9f),
                    Vec2f(headCX + 6f, headCY - 14f),
                ), furDark))

            // Fangs — two small downward rects below snout
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_l",
                Vec2f(headCX - 2f + facingShift, headCY + 2f),
                DrawPayload.ColorRect(2f, 4f, fangCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_r",
                Vec2f(headCX + 2f + facingShift, headCY + 2f),
                DrawPayload.ColorRect(2f, 4f, fangCol))

            // ── TAIL — curved arc (3 line segments) ──────────────────────────────
            // The tail curves UP and LEFT behind the body, not a flat fragment triangle.
            // Animated with tick for a subtle living sway.
            val tailSway = (kotlin.math.sin(state.time.tick.toDouble() * 0.08) * 3.0).toFloat()
            val t0 = Vec2f(cx + 12f,  cy - 18f)               // base at haunch
            val t1 = Vec2f(cx + 20f,  cy - 28f + tailSway)    // mid-curve
            val t2 = Vec2f(cx + 16f,  cy - 38f + tailSway * 1.5f) // tip
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_1",
                t0, DrawPayload.Line(t0.x, t0.y, t1.x, t1.y, furDark, 2.5f))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_2",
                t1, DrawPayload.Line(t1.x, t1.y, t2.x, t2.y, furMid, 1.8f))
            // Tail tip tuft — small oval
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_tip",
                Vec2f(t2.x - 3f, t2.y - 3f),
                DrawPayload.ColorOval(6f, 5f, furLight))
        }
    }

    // ── Diegetic HUD ────────────────────────────────────────────────────────

    private fun buildHudCommands(state: GameState, viewWidth: Float, viewHeight: Float): List<DrawCommand> {
        val commands = mutableListOf<DrawCommand>()
        val maxLives = 3
        val lives = state.player.lives

        // ── SKULL HEALTH ────────────────────────────────────────────────────────
        for (li in 0 until maxLives) {
            val sx = 18f + li * 26f
            val sy = viewHeight - 32f
            val alive = li < lives
            val lastLife = lives == 1 && li == 0

            val skullColor = when {
                lastLife -> 0xFF_8B0000.toInt()
                alive    -> 0xFF_707880.toInt()
                else     -> 0xFF_282C34.toInt()
            }
            commands += DrawCommand(DrawLayer.HUD, 0, li, "hud_skull_$li",
                Vec2f(sx - 10f, sy - 14f), DrawPayload.ColorOval(20f, 16f, skullColor))
            // Jaw
            commands += DrawCommand(DrawLayer.HUD, 0, li * 10 + 1, "hud_skull_jaw_$li",
                Vec2f(sx - 7f, sy - 4f), DrawPayload.ColorRect(14f, 5f, skullColor))
            // Eye sockets
            commands += DrawCommand(DrawLayer.HUD, 0, li * 10 + 2, "hud_skull_eye_l_$li",
                Vec2f(sx - 6f, sy - 12f), DrawPayload.ColorOval(4f, 4f, 0xFF_000000.toInt()))
            commands += DrawCommand(DrawLayer.HUD, 0, li * 10 + 3, "hud_skull_eye_r_$li",
                Vec2f(sx + 2f, sy - 12f), DrawPayload.ColorOval(4f, 4f, 0xFF_000000.toInt()))
            // Crack on last life
            if (lastLife) {
                commands += DrawCommand(DrawLayer.HUD, 0, li * 10 + 4, "hud_skull_crack_$li",
                    Vec2f(sx - 2f, sy - 14f),
                    DrawPayload.Line(sx - 2f, sy - 14f, sx + 3f, sy - 8f, 0xFF_CC2200.toInt(), 1f))
            }
        }

        // ── CAULDRON CURSE VIGNETTE ─────────────────────────────────────────────
        val urgency: Float = state.time.ticksUntilTransform?.let { ticks ->
            (1f - ticks.toFloat() / 180f).coerceIn(0f, 1f)
        } ?: 0f

        if (urgency > 0f) {
            val tick = state.time.tick
            val pulse = ((kotlin.math.sin(tick.toDouble() * 0.15) + 1.0) / 2.0).toFloat()
            val vignetteAlpha = ((urgency * 0.6f + pulse * urgency * 0.3f) * 255).toInt().coerceIn(0, 0xA0)
            val vColor = (vignetteAlpha shl 24) or 0x6600AA
            val cornerSize = 120f
            commands += DrawCommand(DrawLayer.HUD, 0, 100, "vignette_tl",
                Vec2f(-cornerSize * 0.3f, -cornerSize * 0.3f),
                DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
            commands += DrawCommand(DrawLayer.HUD, 0, 101, "vignette_tr",
                Vec2f(viewWidth - cornerSize * 0.7f, -cornerSize * 0.3f),
                DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
            commands += DrawCommand(DrawLayer.HUD, 0, 102, "vignette_bl",
                Vec2f(-cornerSize * 0.3f, viewHeight - cornerSize * 0.7f),
                DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
            commands += DrawCommand(DrawLayer.HUD, 0, 103, "vignette_br",
                Vec2f(viewWidth - cornerSize * 0.7f, viewHeight - cornerSize * 0.7f),
                DrawPayload.ColorOval(cornerSize, cornerSize, vColor))
        }

        // ── DAY/NIGHT ARC (top-right) ────────────────────────────────────────────
        val arcX = viewWidth - 36f
        val arcY = 28f
        when (state.time.phase) {
            DayPhase.NIGHT, DayPhase.DUSK -> {
                // Moon: white disc
                commands += DrawCommand(DrawLayer.HUD, 0, 200, "hud_moon",
                    Vec2f(arcX - 9f, arcY - 9f), DrawPayload.ColorOval(18f, 18f, 0xFF_D8DDE8.toInt()))
                // Bite out of moon: dark oval offset
                commands += DrawCommand(DrawLayer.HUD, 0, 201, "hud_moon_bite",
                    Vec2f(arcX - 4f, arcY - 10f), DrawPayload.ColorOval(14f, 16f, 0xFF_000000.toInt()))
            }
            DayPhase.DAY, DayPhase.DAWN -> {
                // Sun: warm yellow disc
                commands += DrawCommand(DrawLayer.HUD, 0, 200, "hud_sun",
                    Vec2f(arcX - 10f, arcY - 10f), DrawPayload.ColorOval(20f, 20f, 0xFF_FFD040.toInt()))
                // 4 ray lines
                for (ri in 0..3) {
                    val angle = ri.toDouble() * kotlin.math.PI / 2.0
                    val rx = (kotlin.math.cos(angle) * 14.0).toFloat()
                    val ry = (kotlin.math.sin(angle) * 10.0).toFloat()
                    commands += DrawCommand(DrawLayer.HUD, 0, 201 + ri, "hud_ray_$ri",
                        Vec2f(arcX + rx * 0.5f, arcY + ry * 0.5f),
                        DrawPayload.Line(arcX + rx * 0.7f, arcY + ry * 0.7f,
                            arcX + rx * 1.3f, arcY + ry * 1.3f, 0xFF_FFD040.toInt(), 1.5f))
                }
            }
        }

        // ── ITEM SLOTS (bottom-right) ────────────────────────────────────────────
        val inventory = state.player.inventory
        for (si in 0..2) {
            val sx2 = viewWidth - 22f - si * 30f
            val sy2 = viewHeight - 28f
            val hasItem = si < inventory.size
            val frameColor = if (hasItem) 0xFF_707880.toInt() else 0xFF_282C34.toInt()
            commands += DrawCommand(DrawLayer.HUD, 0, 300 + si, "hud_slot_$si",
                Vec2f(sx2 - 10f, sy2 - 12f), DrawPayload.ColorRect(20f, 20f, 0xFF_101418.toInt()))
            commands += DrawCommand(DrawLayer.HUD, 0, 301 + si, "hud_slot_frame_$si",
                Vec2f(sx2 - 10f, sy2 - 12f),
                DrawPayload.Line(sx2 - 10f, sy2 - 12f, sx2 + 10f, sy2 - 12f, frameColor, 1f))
            if (hasItem) {
                commands += DrawCommand(DrawLayer.HUD, 0, 302 + si * 3, "hud_item_$si",
                    Vec2f(sx2 - 5f, sy2 - 8f), DrawPayload.ColorOval(10f, 10f, 0xFF_AA8844.toInt()))
            }
        }

        return commands
    }

    // ── Ambient dust particles ───────────────────────────────────────────────

    private fun buildDustParticles(
        room: RoomDefinition,
        offset: Vec2f,
        tick: Long,
        commands: MutableList<DrawCommand>,
    ) {
        val w = room.width.toFloat()
        val d = room.depth.toFloat()
        val ox = offset.x; val oy = offset.y
        val cycleLen = 180L

        // Inner corner positions: wall inner face at z=2 (top of wall)
        // North wall inner face: y=1, West wall inner face: x=1
        val corners = listOf(
            Vec3f(1f,     1f,     2f),   // NW inner corner
            Vec3f(w - 1f, 1f,     2f),   // NE inner corner
            Vec3f(1f,     d - 1f, 2f),   // SW inner corner
            Vec3f(w - 1f, d - 1f, 2f),   // SE inner corner
        )

        for ((ci, corner) in corners.withIndex()) {
            val cornerScreen = pt(corner.x, corner.y, corner.z, ox, oy)

            for (pi in 0..2) {
                val phase = ((tick + pi * 60L) % cycleLen).toInt()
                val t = phase / cycleLen.toFloat()
                val alpha = ((1f - t) * 160f).toInt().coerceIn(0, 160)
                if (alpha < 15) continue  // fully faded

                // Deterministic wobble — particles seep into room, slight horizontal drift
                val wobble = kotlin.math.sin((ci * 1.7 + pi * 2.3)).toFloat() * 4f
                val px = cornerScreen.x + wobble
                val py = cornerScreen.y - t * 23f  // 40% slower drift than before

                val particleColor = (alpha shl 24) or 0x4A4A62  // dusty blue-grey mist
                commands += DrawCommand(
                    layer = DrawLayer.EFFECT,
                    depthKey = IsoProjector.depthKey(corner) + 100,
                    entityId = "dust_${ci}_${pi}",
                    screenPos = Vec2f(px - 1.5f, py - 1.5f),
                    payload = DrawPayload.ColorOval(3f, 3f, particleColor),
                )
            }
        }
    }
}
