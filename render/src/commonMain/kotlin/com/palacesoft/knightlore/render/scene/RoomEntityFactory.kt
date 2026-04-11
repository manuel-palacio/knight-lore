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
import com.palacesoft.knightlore.render.art.DefaultRoomArtProfiles
import com.palacesoft.knightlore.render.art.LightKind
import com.palacesoft.knightlore.render.art.PropKind
import com.palacesoft.knightlore.render.iso.IsoProjector

/**
 * Converts the current GameState + GameContent into a flat list of DrawCommands
 * for the current room. Dark fantasy plague aesthetic — all visuals drawn in code.
 */
object RoomEntityFactory {

    private val actorArtCatalog: com.palacesoft.knightlore.render.art.ActorArtCatalog =
        com.palacesoft.knightlore.render.art.DefaultActorArtCatalog()

    private object CastleColors {
        // ── Wall faces — warm tan/brown matching Midjourney texture ──────────
        val WALL_SOUTH_BASE      = 0xFF_7A6A50.toInt()  // warm tan stone
        val WALL_SOUTH_JOINT     = 0xFF_4A3A28.toInt()  // mortar
        val WALL_SOUTH_STONE_LO  = 0xFF_5A4A38.toInt()  // darker brick row
        val WALL_SOUTH_STONE_HI  = 0xFF_8A7A60.toInt()  // lighter brick row

        val WALL_EAST_BASE       = 0xFF_5A4A38.toInt()  // shadow side (darker)
        val WALL_EAST_JOINT      = 0xFF_2A2018.toInt()
        val WALL_EAST_STONE_LO   = 0xFF_3A3028.toInt()
        val WALL_EAST_STONE_HI   = 0xFF_5A4A38.toInt()

        val WALL_TOP             = 0xFF_8A7A60.toInt()
        val WALL_TOP_HIGHLIGHT   = 0xFF_9A8A70.toInt()

        // ── Floor — dark grey stone (visible but dark) ──────────────────────
        val FLOOR_SLAB           = 0xFF_2A2828.toInt()  // dark grey
        val FLOOR_WORN           = 0xFF_323030.toInt()
        val FLOOR_GROUT          = 0xFF_1A1818.toInt()
        val FLOOR_CRACK          = 0xFF_101010.toInt()

        // ── Blocks — matching Midjourney warm stone ─────────────────────────
        val BLOCK_TOP            = 0xFF_9A8A70.toInt()  // light warm cap
        val BLOCK_LEFT           = 0xFF_7A6A50.toInt()  // south face matches wall
        val BLOCK_RIGHT          = 0xFF_5A4A38.toInt()  // east shadow face
        val BLOCK_JOINT          = 0xFF_3A2A20.toInt()

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
     * Returns a flicker multiplier driven by time.tick.
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

                // ── Sprite-sheet rendering for items (Midjourney assets) ──
                val itemIdx: Int? = when (item.type) {
                    ItemType.CRYSTAL_BALL -> 0
                    ItemType.GOBLET -> 1
                    ItemType.WINE_BOTTLE -> 2
                    ItemType.GEM -> 3
                    ItemType.POISON_VIAL -> 4
                    ItemType.BOOT -> 5
                    ItemType.TEACUP -> 6
                    ItemType.KEY -> 7
                    ItemType.TORCH -> 8
                    ItemType.SKULL -> 9
                    else -> null
                }
                if (itemIdx != null) {
                    commands += DrawCommand(
                        layer = DrawLayer.ITEM, depthKey = dk, entityId = id,
                        screenPos = Vec2f(screen.x - 24f, screen.y - 24f),
                        payload = DrawPayload.Sprite("items", itemIdx * 24, 0, 24, 24, scale = 2f),
                    )
                    return@forEach // sprite rendered — skip polygon fallback
                }

                // Per-type color palette
                data class ItemPalette(val color: Int, val glow: Int, val w: Float, val h: Float)
                val pal = when (item.type) {
                    ItemType.CRYSTAL_BALL   -> ItemPalette(0xFF_AACCFF.toInt(), 0x20_8888FF.toInt(), 20f, 20f)
                    ItemType.GOBLET         -> ItemPalette(0xFF_FFD700.toInt(), 0x20_FFAA00.toInt(), 16f, 20f)
                    ItemType.WINE_BOTTLE    -> ItemPalette(0xFF_8B0000.toInt(), 0x20_FF2222.toInt(), 12f, 24f)
                    ItemType.GEM            -> ItemPalette(0xFF_FF2266.toInt(), 0x20_FF4488.toInt(), 16f, 14f)
                    ItemType.POISON_VIAL    -> ItemPalette(0xFF_44CC44.toInt(), 0x20_22FF22.toInt(), 12f, 22f)
                    ItemType.BOOT           -> ItemPalette(0xFF_8B6914.toInt(), 0x20_AA8822.toInt(), 20f, 16f)
                    ItemType.TEACUP         -> ItemPalette(0xFF_6688CC.toInt(), 0x20_4466AA.toInt(), 18f, 14f)
                    ItemType.KEY            -> ItemPalette(0xFF_CCAA44.toInt(), 0x20_FFDD44.toInt(), 18f, 10f)
                    ItemType.TORCH          -> ItemPalette(0xFF_FF8800.toInt(), 0x20_FF6600.toInt(), 10f, 24f)
                    ItemType.SKULL          -> ItemPalette(0xFF_DDDDCC.toInt(), 0x20_AAAAAA.toInt(), 16f, 16f)
                    else                    -> ItemPalette(0xFF_FFDD44.toInt(), 0x1A_FFDD44.toInt(), 20f, 16f)
                }
                val color = pal.color
                val w = pal.w + pulseFactor * 2f
                val h = pal.h + pulseFactor * 2f
                val glow = pal.glow
                val sx = screen.x   // centre X
                val sy = screen.y   // centre Y

                // Pulsing glow halo (shared by all item types)
                commands += DrawCommand(DrawLayer.ITEM, dk, 0, "${id}_glow",
                    Vec2f(sx - w / 2f - 2f, sy - h / 2f - 2f),
                    DrawPayload.ColorOval(w + 8f, h + 8f, glow))

                // ---------- Distinct silhouettes per item type ----------
                when (item.type) {
                    ItemType.GOBLET -> {
                        // Cup: trapezoid widening upward
                        val cupTop = sy - h * 0.5f
                        val cupBot = sy - h * 0.05f
                        val topHalf = w * 0.45f
                        val botHalf = w * 0.2f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_cup",
                            Vec2f(sx - topHalf, cupTop),
                            DrawPayload.ColorPath(listOf(
                                Vec2f(sx - topHalf, cupTop),
                                Vec2f(sx + topHalf, cupTop),
                                Vec2f(sx + botHalf, cupBot),
                                Vec2f(sx - botHalf, cupBot),
                            ), color))
                        // Thin stem line
                        val stemTop = cupBot
                        val stemBot = sy + h * 0.3f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_stem",
                            Vec2f(sx, stemTop),
                            DrawPayload.Line(sx, stemTop, sx, stemBot, color, 1.5f))
                        // Base oval
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_base",
                            Vec2f(sx - w * 0.3f, stemBot - 1f),
                            DrawPayload.ColorOval(w * 0.6f, h * 0.18f, color))
                        // Specular highlight on cup
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_hl",
                            Vec2f(sx + 2f, cupTop + 2f),
                            DrawPayload.ColorOval(w * 0.25f, h * 0.18f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.KEY -> {
                        // Bow (ring) at top
                        val bowCx = sx - w * 0.25f
                        val bowCy = sy
                        val bowR = h * 0.45f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_bow",
                            Vec2f(bowCx - bowR, bowCy - bowR),
                            DrawPayload.ColorOval(bowR * 2f, bowR * 2f, color))
                        // Horizontal shaft
                        val shaftStart = bowCx + bowR
                        val shaftEnd = sx + w * 0.5f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_shaft",
                            Vec2f(shaftStart, bowCy),
                            DrawPayload.Line(shaftStart, bowCy, shaftEnd, bowCy, color, 2f))
                        // Two small vertical teeth
                        val tooth1X = shaftEnd - 3f
                        val tooth2X = shaftEnd
                        val toothLen = h * 0.35f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_t1",
                            Vec2f(tooth1X, bowCy),
                            DrawPayload.Line(tooth1X, bowCy, tooth1X, bowCy + toothLen, color, 1.5f))
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_t2",
                            Vec2f(tooth2X, bowCy),
                            DrawPayload.Line(tooth2X, bowCy, tooth2X, bowCy + toothLen, color, 1.5f))
                        // Specular highlight on bow
                        commands += DrawCommand(DrawLayer.ITEM, dk, 5, "${id}_hl",
                            Vec2f(bowCx - bowR * 0.3f, bowCy - bowR * 0.4f),
                            DrawPayload.ColorOval(bowR * 0.5f, bowR * 0.4f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.CRYSTAL_BALL -> {
                        // Large ball
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_ball",
                            Vec2f(sx - w * 0.45f, sy - h * 0.45f),
                            DrawPayload.ColorOval(w * 0.9f, h * 0.9f, color))
                        // Small rectangular base below the ball
                        val baseTop = sy + h * 0.3f
                        val baseW = w * 0.35f
                        val baseH = h * 0.2f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_base",
                            Vec2f(sx - baseW / 2f, baseTop),
                            DrawPayload.ColorRect(baseW, baseH, color))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_hl",
                            Vec2f(sx - w * 0.12f, sy - h * 0.2f),
                            DrawPayload.ColorOval(w * 0.25f, h * 0.2f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.POISON_VIAL -> {
                        // Bulb at bottom
                        val bulbCy = sy + h * 0.15f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_bulb",
                            Vec2f(sx - w * 0.4f, bulbCy - h * 0.25f),
                            DrawPayload.ColorOval(w * 0.8f, h * 0.5f, color))
                        // Thin neck extending upward
                        val neckW = w * 0.22f
                        val neckBot = bulbCy - h * 0.25f
                        val neckTop = sy - h * 0.35f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_neck",
                            Vec2f(sx - neckW / 2f, neckTop),
                            DrawPayload.ColorRect(neckW, neckBot - neckTop, color))
                        // Tiny stopper oval at top
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_stop",
                            Vec2f(sx - w * 0.18f, neckTop - h * 0.1f),
                            DrawPayload.ColorOval(w * 0.36f, h * 0.12f, color))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_hl",
                            Vec2f(sx + 1f, bulbCy - h * 0.1f),
                            DrawPayload.ColorOval(w * 0.2f, h * 0.15f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.SKULL -> {
                        // Wide cranium oval
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_cran",
                            Vec2f(sx - w * 0.5f, sy - h * 0.45f),
                            DrawPayload.ColorOval(w, h * 0.85f, color))
                        // Left eye socket (dark)
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_eyeL",
                            Vec2f(sx - w * 0.25f, sy - h * 0.18f),
                            DrawPayload.ColorOval(w * 0.2f, h * 0.2f, 0xFF_222222.toInt()))
                        // Right eye socket (dark)
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_eyeR",
                            Vec2f(sx + w * 0.08f, sy - h * 0.18f),
                            DrawPayload.ColorOval(w * 0.2f, h * 0.2f, 0xFF_222222.toInt()))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_hl",
                            Vec2f(sx + 2f, sy - h * 0.3f),
                            DrawPayload.ColorOval(w * 0.3f, h * 0.2f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.GEM -> {
                        // 4-point diamond polygon (rotated square)
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_gem",
                            Vec2f(sx - w * 0.5f, sy - h * 0.5f),
                            DrawPayload.ColorPath(listOf(
                                Vec2f(sx, sy - h * 0.5f),        // top
                                Vec2f(sx + w * 0.5f, sy),        // right
                                Vec2f(sx, sy + h * 0.5f),        // bottom
                                Vec2f(sx - w * 0.5f, sy),        // left
                            ), color))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_hl",
                            Vec2f(sx - w * 0.05f, sy - h * 0.2f),
                            DrawPayload.ColorOval(w * 0.25f, h * 0.2f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.WINE_BOTTLE -> {
                        // Tall narrow rect body
                        val bodyW = w * 0.55f
                        val bodyH = h * 0.7f
                        val bodyTop = sy - h * 0.15f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_body",
                            Vec2f(sx - bodyW / 2f, bodyTop),
                            DrawPayload.ColorRect(bodyW, bodyH, color))
                        // Small oval neck at top
                        val neckW = w * 0.25f
                        val neckH = h * 0.3f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_neck",
                            Vec2f(sx - neckW / 2f, bodyTop - neckH + 2f),
                            DrawPayload.ColorRect(neckW, neckH, color))
                        // Top oval cap
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_cap",
                            Vec2f(sx - w * 0.2f, bodyTop - neckH - 1f),
                            DrawPayload.ColorOval(w * 0.4f, h * 0.1f, color))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_hl",
                            Vec2f(sx + 1f, bodyTop + 2f),
                            DrawPayload.ColorOval(w * 0.15f, h * 0.25f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.BOOT -> {
                        // L-shaped polygon (vertical leg + horizontal sole)
                        val legTop = sy - h * 0.5f
                        val soleBot = sy + h * 0.5f
                        val legLeft = sx - w * 0.15f
                        val legRight = sx + w * 0.15f
                        val toeRight = sx + w * 0.5f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_boot",
                            Vec2f(legLeft, legTop),
                            DrawPayload.ColorPath(listOf(
                                Vec2f(legLeft, legTop),           // top-left of leg
                                Vec2f(legRight, legTop),          // top-right of leg
                                Vec2f(legRight, soleBot - h * 0.25f), // inner ankle
                                Vec2f(toeRight, soleBot - h * 0.25f), // toe top
                                Vec2f(toeRight, soleBot),         // toe bottom
                                Vec2f(legLeft, soleBot),          // heel bottom
                            ), color))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_hl",
                            Vec2f(sx + 1f, legTop + 2f),
                            DrawPayload.ColorOval(w * 0.15f, h * 0.2f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.TEACUP -> {
                        // Wide oval body
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_cup",
                            Vec2f(sx - w * 0.4f, sy - h * 0.35f),
                            DrawPayload.ColorOval(w * 0.8f, h * 0.7f, color))
                        // Small curved handle on right side (arc approximated by a line)
                        val handleX = sx + w * 0.38f
                        val handleTop = sy - h * 0.15f
                        val handleBot = sy + h * 0.15f
                        val handleBulge = sx + w * 0.55f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_h1",
                            Vec2f(handleX, handleTop),
                            DrawPayload.Line(handleX, handleTop, handleBulge, sy, color, 1.5f))
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_h2",
                            Vec2f(handleBulge, sy),
                            DrawPayload.Line(handleBulge, sy, handleX, handleBot, color, 1.5f))
                        // Specular highlight
                        commands += DrawCommand(DrawLayer.ITEM, dk, 4, "${id}_hl",
                            Vec2f(sx - w * 0.1f, sy - h * 0.15f),
                            DrawPayload.ColorOval(w * 0.25f, h * 0.18f, 0x66_FFFFFF.toInt()))
                    }
                    ItemType.TORCH -> {
                        // Narrow rect shaft
                        val shaftW = w * 0.35f
                        val shaftH = h * 0.65f
                        val shaftTop = sy - h * 0.1f
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, "${id}_shaft",
                            Vec2f(sx - shaftW / 2f, shaftTop),
                            DrawPayload.ColorRect(shaftW, shaftH, color))
                        // Flame oval at top (brighter)
                        val flameW = w * 0.6f
                        val flameH = h * 0.35f
                        val flameColor = 0xFF_FFCC00.toInt()
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_flame",
                            Vec2f(sx - flameW / 2f, shaftTop - flameH + 2f),
                            DrawPayload.ColorOval(flameW, flameH, flameColor))
                        // Specular highlight on flame
                        commands += DrawCommand(DrawLayer.ITEM, dk, 3, "${id}_hl",
                            Vec2f(sx + 1f, shaftTop - flameH + 4f),
                            DrawPayload.ColorOval(w * 0.2f, h * 0.12f, 0x66_FFFFFF.toInt()))
                    }
                    else -> {
                        // Fallback: simple oval
                        commands += DrawCommand(DrawLayer.ITEM, dk, 1, id, screen,
                            DrawPayload.ColorOval(w, h, color))
                        commands += DrawCommand(DrawLayer.ITEM, dk, 2, "${id}_hl",
                            Vec2f(sx + 2f, sy - 2f),
                            DrawPayload.ColorOval(w * 0.4f, h * 0.3f, 0x66_FFFFFF.toInt()))
                    }
                }
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

        // 5c. Room art profile — light overlays, darkness zones, anchor glow
        val artProfile = DefaultRoomArtProfiles.forRoom(state.currentRoomId.value)
        if (artProfile != null) {
            // A) Light overlays from lightSources
            for (light in artProfile.lightSources) {
                val lightWorld = Vec3f(light.gridX, light.gridY, light.gridZ)
                val screen = IsoProjector.toScreen(lightWorld) + offset
                val dk = IsoProjector.depthKey(lightWorld)
                val alpha = (light.intensity.coerceIn(0f, 1f) * 255f).toInt()
                val baseColor = when (light.kind) {
                    LightKind.TORCH         -> 0xFF6800
                    LightKind.CAULDRON_GLOW -> 0x44BB00
                    LightKind.DANGER_RED    -> 0xCC2200
                    LightKind.MOONBEAM      -> 0x8888CC
                    LightKind.AMBIENT       -> 0x886644
                }
                val argb = (alpha shl 24) or baseColor
                // Map radius to oval size: each grid unit ~ TILE_WIDTH pixels
                val ovalW = light.radius * 2f * com.palacesoft.knightlore.core.geometry.TileMetrics.HALF_TILE_WIDTH
                val ovalH = light.radius * com.palacesoft.knightlore.core.geometry.TileMetrics.HALF_TILE_HEIGHT * 2f
                commands += DrawCommand(
                    DrawLayer.FLOOR, dk, 8, "art_light_${light.gridX}_${light.gridY}",
                    Vec2f(screen.x - ovalW / 2f, screen.y - ovalH / 2f),
                    DrawPayload.ColorOval(ovalW, ovalH, argb),
                )
            }

            // B) Darkness overlay for quiet zones
            for (zone in artProfile.quietZones) {
                for (zx in zone.x0..zone.x1) {
                    for (zy in zone.y0..zone.y1) {
                        val gx = zx.toFloat()
                        val gy = zy.toFloat()
                        val world = Vec3f(gx, gy, 0f)
                        val dk = IsoProjector.depthKey(world)
                        val tilePts = floorDiamond(gx, gy, 0f, ox, oy)
                        commands += DrawCommand(
                            DrawLayer.FLOOR, dk, 7, "art_quiet_${zx}_${zy}",
                            IsoProjector.toScreen(world) + offset,
                            DrawPayload.ColorPath(tilePts, 0x20_000000),
                        )
                    }
                }
            }

            // C) Anchor indicator — subtle pulsing glow on the floor at the focal point
            val anchor = artProfile.anchor
            if (anchor != null) {
                val anchorWorld = Vec3f(anchor.gridX + 0.5f, anchor.gridY + 0.5f, anchor.gridZ.toFloat())
                val aScreen = IsoProjector.toScreen(anchorWorld) + offset
                val aDk = IsoProjector.depthKey(anchorWorld)
                // Pulsing glow — alpha oscillates with tick
                val pulseNorm = (kotlin.math.sin(tick.toDouble() * 0.06) + 1.0) / 2.0
                val pulseAlpha = (0x20 + (pulseNorm * 0x28).toInt()).coerceIn(0x20, 0x48)
                val glowW = 2.5f * com.palacesoft.knightlore.core.geometry.TileMetrics.HALF_TILE_WIDTH
                val glowH = 2.5f * com.palacesoft.knightlore.core.geometry.TileMetrics.HALF_TILE_HEIGHT
                commands += DrawCommand(
                    DrawLayer.FLOOR, aDk, 9, "art_anchor_${anchor.gridX}_${anchor.gridY}",
                    Vec2f(aScreen.x - glowW / 2f, aScreen.y - glowH / 2f),
                    DrawPayload.ColorOval(glowW, glowH, (pulseAlpha shl 24) or 0xFFAA44),
                )
                // Inner bright core pulse
                val coreW = glowW * 0.5f
                val coreH = glowH * 0.5f
                val coreAlpha = (0x10 + (pulseNorm * 0x30).toInt()).coerceIn(0x10, 0x40)
                commands += DrawCommand(
                    DrawLayer.FLOOR, aDk, 10, "art_anchor_core_${anchor.gridX}_${anchor.gridY}",
                    Vec2f(aScreen.x - coreW / 2f, aScreen.y - coreH / 2f),
                    DrawPayload.ColorOval(coreW, coreH, (coreAlpha shl 24) or 0xFFCC66),
                )
            }

            // D) Decor placements — chains, banners, and other authored props
            for (decor in artProfile.decor) {
                val decorWorld = Vec3f(decor.gridX + 0.5f, decor.gridY + 0.5f, decor.gridZ.toFloat())
                val dScreen = IsoProjector.toScreen(decorWorld) + offset
                val dDk = IsoProjector.depthKey(decorWorld)
                val dCx = dScreen.x
                val dCy = dScreen.y
                val dId = "decor_${decor.propKind.name}_${decor.gridX}_${decor.gridY}"

                // Polygon-based fallback rendering
                when (decor.propKind) {
                    PropKind.CHAIN_CLUSTER -> {
                        // 3 vertical chains hanging from z=2.5 with small oval links
                        val chainTop = IsoProjector.toScreen(
                            Vec3f(decor.gridX + 0.5f, decor.gridY + 0.5f, 2.5f)
                        ) + offset
                        val chainBot = dScreen  // bottom at placed z height
                        val chainColor = CastleColors.CHAIN
                        for (ci in 0..2) {
                            val cOff = (ci - 1) * 6f  // spread: -6, 0, +6 pixels
                            val topX = chainTop.x + cOff
                            val topY = chainTop.y
                            val botX = dCx + cOff
                            val botY = chainBot.y
                            // Vertical chain line
                            commands += DrawCommand(
                                DrawLayer.BLOCK, dDk, 5, "${dId}_chain_$ci",
                                Vec2f(topX, topY),
                                DrawPayload.Line(topX, topY, botX, botY, chainColor, 1.2f),
                            )
                            // Oval links along the chain — every 8 pixels
                            val chainLen = botY - topY
                            val linkCount = (chainLen / 8f).toInt().coerceIn(1, 8)
                            for (li in 0 until linkCount) {
                                val frac = (li + 0.5f) / linkCount
                                val lx = topX + (botX - topX) * frac
                                val ly = topY + chainLen * frac
                                commands += DrawCommand(
                                    DrawLayer.BLOCK, dDk, 6, "${dId}_link_${ci}_$li",
                                    Vec2f(lx - 2f, ly - 2f),
                                    DrawPayload.ColorOval(4f, 5f, chainColor),
                                )
                            }
                        }
                    }

                    PropKind.BANNER -> {
                        // Rectangular cloth with torn bottom edge, colored by variant
                        val bannerColor = when (decor.variant) {
                            "torn" -> 0xFF_6A2020.toInt()   // faded crimson
                            "royal" -> 0xFF_1A1A6A.toInt()  // dark royal blue
                            else -> 0xFF_4A3020.toInt()     // brown-ish default
                        }
                        val bannerEdge = when (decor.variant) {
                            "torn" -> 0xFF_8A3030.toInt()
                            "royal" -> 0xFF_3030AA.toInt()
                            else -> 0xFF_6A5040.toInt()
                        }
                        val bannerTop = IsoProjector.toScreen(
                            Vec3f(decor.gridX + 0.5f, decor.gridY + 0.5f, 2.5f)
                        ) + offset
                        val bannerW = 14f * decor.scale
                        val bannerH = 28f * decor.scale
                        // Hanging rod
                        commands += DrawCommand(
                            DrawLayer.BLOCK, dDk, 4, "${dId}_rod",
                            Vec2f(bannerTop.x - bannerW / 2f - 2f, bannerTop.y),
                            DrawPayload.Line(
                                bannerTop.x - bannerW / 2f - 2f, bannerTop.y,
                                bannerTop.x + bannerW / 2f + 2f, bannerTop.y,
                                CastleColors.CHAIN, 1.5f,
                            ),
                        )
                        // Cloth body — polygon with jagged torn bottom
                        val bLeft = bannerTop.x - bannerW / 2f
                        val bRight = bannerTop.x + bannerW / 2f
                        val bTop = bannerTop.y + 1f
                        val bBot = bannerTop.y + bannerH
                        // Torn bottom: 4 jagged teeth
                        val jagPts = listOf(
                            Vec2f(bLeft, bTop),
                            Vec2f(bRight, bTop),
                            Vec2f(bRight, bBot - 4f),
                            Vec2f(bRight - bannerW * 0.2f, bBot),
                            Vec2f(bRight - bannerW * 0.45f, bBot - 6f),
                            Vec2f(bLeft + bannerW * 0.3f, bBot - 2f),
                            Vec2f(bLeft + bannerW * 0.1f, bBot - 7f),
                            Vec2f(bLeft, bBot - 3f),
                        )
                        commands += DrawCommand(
                            DrawLayer.BLOCK, dDk, 5, "${dId}_cloth",
                            Vec2f(bLeft, bTop),
                            DrawPayload.ColorPath(jagPts, bannerColor),
                        )
                        // Edge highlight line on left side
                        commands += DrawCommand(
                            DrawLayer.BLOCK, dDk, 6, "${dId}_edge",
                            Vec2f(bLeft, bTop),
                            DrawPayload.Line(bLeft, bTop, bLeft, bBot - 3f, bannerEdge, 0.8f),
                        )
                    }

                    else -> { /* Other prop kinds not yet rendered as decor */ }
                }
            }
        }

        // 6. Player — dark plague-walker
        buildPlayerCommands(state, commands, offset)

        // 7. Ambient dust particles at inner wall corners
        buildDustParticles(room, offset, tick, commands)

        // 7b. Cobwebs at wall corners — ancient castle atmosphere
        val webColor = 0x44_A0A0A0.toInt()  // semi-transparent grey
        val rw = room.width.toFloat()
        val rd = room.depth.toFloat()
        val webCorners = listOf(
            Vec3f(0.5f, 0.5f, 2.5f),                           // NW corner
            Vec3f(rw - 0.5f, 0.5f, 2.5f),                      // NE corner
            Vec3f(0.5f, rd - 0.5f, 2.5f),                      // SW corner
            Vec3f(rw - 0.5f, rd - 0.5f, 2.5f),                 // SE corner
        )
        webCorners.forEachIndexed { wi, corner ->
            val ws = IsoProjector.toScreen(corner) + offset
            val wdk = IsoProjector.depthKey(corner)
            val webId = "cobweb_$wi"
            // 5 radiating strands from corner
            for (si in 0..4) {
                val angle = si * kotlin.math.PI / 4.0 + wi * kotlin.math.PI / 2.0
                val endX = ws.x + (kotlin.math.cos(angle) * 18f).toFloat()
                val endY = ws.y + (kotlin.math.sin(angle) * 12f).toFloat()
                commands += DrawCommand(DrawLayer.EFFECT, wdk, 0, "${webId}_s$si",
                    Vec2f(ws.x, ws.y),
                    DrawPayload.Line(ws.x, ws.y, endX, endY, webColor, 0.7f))
            }
            // Cross threads connecting strands
            for (si in 0..3) {
                val a1 = si * kotlin.math.PI / 4.0 + wi * kotlin.math.PI / 2.0
                val a2 = (si + 1) * kotlin.math.PI / 4.0 + wi * kotlin.math.PI / 2.0
                val r = 10f
                val x1 = ws.x + (kotlin.math.cos(a1) * r).toFloat()
                val y1 = ws.y + (kotlin.math.sin(a1) * r).toFloat()
                val x2 = ws.x + (kotlin.math.cos(a2) * r).toFloat()
                val y2 = ws.y + (kotlin.math.sin(a2) * r).toFloat()
                commands += DrawCommand(DrawLayer.EFFECT, wdk, 0, "${webId}_c$si",
                    Vec2f(x1, y1),
                    DrawPayload.Line(x1, y1, x2, y2, webColor, 0.5f))
            }
        }

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

            // Flat dithered face z=0..3 — checkerboard creates rough stone texture
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_face",
                pt(gx, gy + 1f, 0f, ox, oy),
                DrawPayload.DitheredPath(listOf(
                    pt(gx, gy + 1f, 0f, ox, oy), pt(gx + 1f, gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 3f, ox, oy), pt(gx, gy + 1f, 3f, ox, oy),
                ), palette.wallSouthLo, palette.wallSouthHi, horizontal = false))

            // Torch — every 4th column, rendered in EFFECT layer (in front of walls)
            if (gx.toInt() % 4 == 2) {
                val tPhase = torchPhase(gx.toInt(), gy.toInt())
                val flicker = (kotlin.math.sin(tick.toDouble() * 0.3 + tPhase) * 1.5f).toFloat()
                val flamePt = pt(gx + 0.5f, gy + 0.85f, 1.5f, ox, oy)

                // Bracket
                val bracketFrom = pt(gx + 0.5f, gy + 1f, 1.5f, ox, oy)
                commands += DrawCommand(DrawLayer.EFFECT, dk, 0, "${id}_bracket",
                    Vec2f(bracketFrom.x, bracketFrom.y),
                    DrawPayload.Line(bracketFrom.x, bracketFrom.y, flamePt.x, flamePt.y, 0xFF_5A4020.toInt(), 1.5f))

                // Flame — in EFFECT layer so it's always in front of walls
                commands += DrawCommand(DrawLayer.EFFECT, dk, 1, "${id}_flame",
                    Vec2f(flamePt.x - 3f, flamePt.y - 10f + flicker),
                    DrawPayload.ColorOval(6f, 8f, 0xCC_FF8800.toInt()))
                commands += DrawCommand(DrawLayer.EFFECT, dk, 2, "${id}_core",
                    Vec2f(flamePt.x - 1.5f, flamePt.y - 8f + flicker),
                    DrawPayload.ColorOval(3f, 4f, 0xFF_FFDD44.toInt()))

                // Floor light cast
                val floorAlpha = flickerAlpha(tick, tPhase, rate = 0.10, minAlpha = 0x20, maxAlpha = 0x50)
                val tileX0 = (gx - 1f).coerceAtLeast(0f)
                val tileX1 = (gx + 2f).coerceAtMost(room.width.toFloat())
                var lightGx = tileX0
                while (lightGx < tileX1) {
                    val lightWorld = Vec3f(lightGx, gy + 1f, 0f)
                    val lightDk = IsoProjector.depthKey(lightWorld)
                    commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "nlight_${gx.toInt()}_${lightGx.toInt()}",
                        IsoProjector.toScreen(lightWorld) + offset,
                        DrawPayload.ColorPath(
                            floorDiamond(lightGx, gy + 1f, 0f, ox, oy),
                            (floorAlpha shl 24) or CastleColors.TORCH_FLOOR_CAST
                        ))
                    lightGx += 1f
                }
            }
        }

        fun wallBlockWest(gx: Float, gy: Float) {
            val dk = IsoProjector.depthKey(Vec3f(gx + 0.5f, gy + 1f, 0f))
            val id = "wall_${gx.toInt()}_${gy.toInt()}"

            // Flat dithered face z=0..3 — checkerboard stone texture, no decorations
            commands += DrawCommand(DrawLayer.BLOCK, dk, 1, "${id}_face",
                pt(gx + 1f, gy, 0f, ox, oy),
                DrawPayload.DitheredPath(listOf(
                    pt(gx + 1f, gy, 0f, ox, oy), pt(gx + 1f, gy + 1f, 0f, ox, oy),
                    pt(gx + 1f, gy + 1f, 3f, ox, oy), pt(gx + 1f, gy, 3f, ox, oy),
                ), palette.wallEastLo, palette.wallEastHi, horizontal = false))

            // Torch only — every 4th column, in EFFECT layer
            if (gy.toInt() % 4 == 2) {
                val tPhase = torchPhase(gx.toInt(), gy.toInt())
                val flicker = (kotlin.math.sin(tick.toDouble() * 0.3 + tPhase) * 1.5f).toFloat()
                val bracketFrom = pt(gx + 1f, gy + 0.5f, 1.5f, ox, oy)
                val flamePt = pt(gx + 0.85f, gy + 0.5f, 1.5f, ox, oy)

                commands += DrawCommand(DrawLayer.EFFECT, dk, 0, "${id}_bracket",
                    Vec2f(bracketFrom.x, bracketFrom.y),
                    DrawPayload.Line(bracketFrom.x, bracketFrom.y, flamePt.x, flamePt.y, 0xFF_5A4020.toInt(), 1.5f))
                commands += DrawCommand(DrawLayer.EFFECT, dk, 1, "${id}_flame",
                    Vec2f(flamePt.x - 3f, flamePt.y - 10f + flicker),
                    DrawPayload.ColorOval(6f, 8f, 0xCC_FF8800.toInt()))
                commands += DrawCommand(DrawLayer.EFFECT, dk, 2, "${id}_core",
                    Vec2f(flamePt.x - 1.5f, flamePt.y - 8f + flicker),
                    DrawPayload.ColorOval(3f, 4f, 0xFF_FFDD44.toInt()))

                // Floor light
                val floorAlpha = flickerAlpha(tick, tPhase, rate = 0.10, minAlpha = 0x20, maxAlpha = 0x50)
                val tileY0 = (gy - 1f).coerceAtLeast(0f)
                val tileY1 = (gy + 2f).coerceAtMost(room.depth.toFloat())
                var lightGy = tileY0
                while (lightGy < tileY1) {
                    val lightWorld = Vec3f(gx + 1f, lightGy, 0f)
                    val lightDk = IsoProjector.depthKey(lightWorld)
                    commands += DrawCommand(DrawLayer.FLOOR, lightDk, 8, "wlight_${gy.toInt()}_${lightGy.toInt()}",
                        IsoProjector.toScreen(lightWorld) + offset,
                        DrawPayload.ColorPath(
                            floorDiamond(gx + 1f, lightGy, 0f, ox, oy),
                            (floorAlpha shl 24) or CastleColors.TORCH_FLOOR_CAST
                        ))
                    lightGy += 1f
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

        // North wall (gy=0): draw continuous wide face segments (no per-tile seams)
        // First draw door archways, then draw continuous wall faces for non-gap runs
        for (x in 0 until w) {
            if (x in northGaps) doorArchway(x.toFloat(), 0f,
                northGaps.minOrNull() == x,
                northGaps.maxOrNull() == x,
                ExitSide.NORTH,
                northExitTarget)
        }
        // Per-tile wall faces + decorations (no continuous segments — avoids depth issues)
        for (x in 0 until w) {
            if (x !in northGaps) wallBlockNorth(x.toFloat(), 0f)
        }
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

        // ── Sprite-sheet rendering for enemies (Midjourney assets) ──
        val enemySheet = when (actor.type) {
            ActorType.GUARD -> "enemy_guard"
            ActorType.GHOST -> "enemy_ghost"
            ActorType.DRUID -> "enemy_druid"
            ActorType.ROBOT -> "enemy_robot"
            else -> null
        }
        if (enemySheet != null) {
            val frameIdx = ((tick / 15) % 4).toInt()
            commands += DrawCommand(
                layer = DrawLayer.ACTOR, depthKey = dk, entityId = id,
                screenPos = Vec2f(cx - 48f, cy - 48f),
                payload = DrawPayload.Sprite(enemySheet, frameIdx * 48, 0, 48, 48, scale = 2f),
            )
            return // sprite rendered — skip polygon fallback
        }

        when (actor.type) {
            ActorType.GUARD -> {
                // Shadow — wide and solid, authority presence
                commands += actorShadow(cx, cy, 26f, 8f, dk)
                // Boots — heavy iron sabatons, wider stance
                val lLegY = walkBob(tick, phase, 0.0)
                val rLegY = walkBob(tick, phase, kotlin.math.PI)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_boot_l",
                    Vec2f(cx - 11f, cy - 14f + lLegY), DrawPayload.ColorRect(8f, 14f, CastleColors.GUARD_ARMOUR))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_boot_r",
                    Vec2f(cx + 3f, cy - 14f + rLegY), DrawPayload.ColorRect(8f, 14f, CastleColors.GUARD_ARMOUR))
                // Tabard body — wider rectangular torso, upright pillar silhouette
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_body",
                    Vec2f(cx - 14f, cy - 44f), DrawPayload.ColorRect(28f, 30f, CastleColors.GUARD_ARMOUR))
                // Chest plate highlight — centered vertical
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_chest_hl",
                    Vec2f(cx - 7f, cy - 42f), DrawPayload.ColorRect(10f, 16f, CastleColors.GUARD_ARMOUR_HL))
                // Vertical seam — rigid centre line
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_seam",
                    Vec2f(cx, cy - 44f),
                    DrawPayload.Line(cx, cy - 14f, cx, cy - 44f, CastleColors.GUARD_ARMOUR_HL, 0.6f))
                // Symmetrical pauldrons — wide shoulder plates
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_pauld_l",
                    Vec2f(cx - 19f, cy - 46f), DrawPayload.ColorRect(8f, 6f, CastleColors.GUARD_ARMOUR_HL))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_pauld_r",
                    Vec2f(cx + 11f, cy - 46f), DrawPayload.ColorRect(8f, 6f, CastleColors.GUARD_ARMOUR_HL))
                // Arms — plate rerebraces, wider
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_l",
                    Vec2f(cx - 19f, cy - 40f), DrawPayload.ColorRect(6f, 20f, CastleColors.GUARD_ARMOUR))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_r",
                    Vec2f(cx + 13f, cy - 40f), DrawPayload.ColorRect(6f, 20f, CastleColors.GUARD_ARMOUR))
                // Head — sallet helmet, straight posture
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_helm",
                    Vec2f(cx - 9f, cy - 60f), DrawPayload.ColorOval(18f, 14f, CastleColors.GUARD_ARMOUR))
                // Red plume — taller, instantly readable
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_plume",
                    Vec2f(cx - 3f, cy - 72f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx - 4f, cy - 62f),
                        Vec2f(cx + 2f, cy - 62f),
                        Vec2f(cx + 4f, cy - 74f),
                        Vec2f(cx - 2f, cy - 72f),
                    ), CastleColors.GUARD_PLUME))
                // Halberd shaft — prominent, extending well above head
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_halberd",
                    Vec2f(cx + 16f, cy - 88f),
                    DrawPayload.Line(cx + 16f, cy - 2f, cx + 16f, cy - 88f, 0xFF_707880.toInt(), 2.0f))
                // Halberd blade — larger, more visible
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_halberd_blade",
                    Vec2f(cx + 12f, cy - 88f),
                    DrawPayload.ColorPath(listOf(
                        Vec2f(cx + 12f, cy - 82f),
                        Vec2f(cx + 22f, cy - 84f),
                        Vec2f(cx + 16f, cy - 96f),
                        Vec2f(cx + 10f, cy - 88f),
                    ), 0xFF_A8B0B8.toInt()))
                // Halberd cross-guard
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_halberd_xguard",
                    Vec2f(cx + 12f, cy - 82f),
                    DrawPayload.Line(cx + 10f, cy - 82f, cx + 22f, cy - 82f, 0xFF_A8B0B8.toInt(), 1.2f))
            }

            ActorType.GHOST -> {
                // Shadow — very faint, ghost barely touches ground
                commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "${id}_shadow",
                    Vec2f(cx - 10f, cy - 2f), DrawPayload.ColorOval(20f, 6f, 0x14_000000.toInt()))
                // Drift: ghost floats higher with a slow sine bob
                val driftY = (kotlin.math.sin(tick.toDouble() * 0.035 + phase) * 7.0).toFloat()
                val gcy = cy + driftY - 10f  // floats higher off ground
                // Body — tapered ethereal shape: wide at top, narrowing to wispy point
                // Semi-transparent (alpha ~0x88)
                val bodyAlpha = 0x88
                val bodyArgb = (bodyAlpha shl 24) or 0xB8C8FF
                val coreAlpha = 0xAA
                val coreArgb = (coreAlpha shl 24) or 0xD8E8FF
                // Upper body — wide oval
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body_upper",
                    Vec2f(cx - 16f, gcy - 46f), DrawPayload.ColorOval(32f, 28f, bodyArgb))
                // Mid body — tapering polygon
                val taperingBody = listOf(
                    Vec2f(cx - 14f, gcy - 34f),
                    Vec2f(cx + 14f, gcy - 34f),
                    Vec2f(cx + 6f, gcy - 12f),
                    Vec2f(cx - 6f, gcy - 12f),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body_mid",
                    Vec2f(cx - 14f, gcy - 34f), DrawPayload.ColorPath(taperingBody, bodyArgb))
                // Lower body — narrow wispy point
                val wispPoint = listOf(
                    Vec2f(cx - 6f, gcy - 12f),
                    Vec2f(cx + 6f, gcy - 12f),
                    Vec2f(cx + 1f, gcy + 6f),
                    Vec2f(cx - 1f, gcy + 8f),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_body_wisp",
                    Vec2f(cx - 6f, gcy - 12f), DrawPayload.ColorPath(wispPoint, bodyArgb))
                // Brighter core — inner glow
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_core",
                    Vec2f(cx - 10f, gcy - 42f), DrawPayload.ColorOval(20f, 20f, coreArgb))
                // Drifting tendrils — 3 wispy trailing lines below body
                for (ti in 0..2) {
                    val tx = cx - 6f + ti * 6f
                    val tendrilWiggle = (kotlin.math.sin(tick.toDouble() * 0.06 + phase + ti * 1.5) * 5.0).toFloat()
                    val tendrilTop = gcy + 4f
                    val tendrilBot = gcy + 18f + ti * 3f
                    val tendrilMidX = tx + tendrilWiggle
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_tendril_$ti",
                        Vec2f(tx, tendrilTop),
                        DrawPayload.Line(tx, tendrilTop, tendrilMidX, tendrilBot,
                            (0x44 shl 24) or 0xB8C8FF, 1.2f))
                    // Tendril tip — tiny fading oval
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_tendril_tip_$ti",
                        Vec2f(tendrilMidX - 2f, tendrilBot - 1f),
                        DrawPayload.ColorOval(4f, 3f, (0x30 shl 24) or 0xB8C8FF))
                }
                // Eyes — two deep void ovals
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_l",
                    Vec2f(cx - 7f, gcy - 40f), DrawPayload.ColorOval(5f, 6f, CastleColors.GHOST_EYE))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_eye_r",
                    Vec2f(cx + 2f, gcy - 40f), DrawPayload.ColorOval(5f, 6f, CastleColors.GHOST_EYE))
            }

            ActorType.ROBOT -> {
                commands += actorShadow(cx, cy, 22f, 7f, dk)
                val stepL = walkBob(tick, phase, 0.0)
                val stepR = walkBob(tick, phase, kotlin.math.PI)
                // Legs — angular piston blocks with sharp corners
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_leg_l",
                    Vec2f(cx - 10f, cy - 16f + stepL), DrawPayload.ColorRect(7f, 16f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_leg_r",
                    Vec2f(cx + 3f, cy - 16f + stepR), DrawPayload.ColorRect(7f, 16f, CastleColors.ROBOT_FRAME))
                // Knee joints — visible pivot bolts
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_knee_l",
                    Vec2f(cx - 9f, cy - 14f + stepL), DrawPayload.ColorRect(6f, 3f, CastleColors.ROBOT_JOINT))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_knee_r",
                    Vec2f(cx + 4f, cy - 14f + stepR), DrawPayload.ColorRect(6f, 3f, CastleColors.ROBOT_JOINT))
                // Torso — sharp-cornered geometric hull, slightly trapezoidal
                val torsoPts = listOf(
                    Vec2f(cx - 14f, cy - 14f),
                    Vec2f(cx + 14f, cy - 14f),
                    Vec2f(cx + 12f, cy - 44f),
                    Vec2f(cx - 12f, cy - 44f),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_body",
                    Vec2f(cx - 14f, cy - 44f), DrawPayload.ColorPath(torsoPts, CastleColors.ROBOT_FRAME))
                // Panel seam lines — horizontal and vertical grid
                for (si in 0..2) {
                    val sy = cy - 40f + si * 9f
                    commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_hseam_$si",
                        Vec2f(cx - 13f, sy),
                        DrawPayload.Line(cx - 13f, sy, cx + 13f, sy, CastleColors.ROBOT_JOINT, 0.8f))
                }
                // Vertical panel line — centre
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_vseam",
                    Vec2f(cx, cy - 44f),
                    DrawPayload.Line(cx, cy - 14f, cx, cy - 44f, CastleColors.ROBOT_JOINT, 0.6f))
                // Arms — angular blocks with elbow joint
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_l_upper",
                    Vec2f(cx - 20f, cy - 42f), DrawPayload.ColorRect(7f, 12f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_l_lower",
                    Vec2f(cx - 19f, cy - 30f), DrawPayload.ColorRect(5f, 10f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_r_upper",
                    Vec2f(cx + 13f, cy - 42f), DrawPayload.ColorRect(7f, 12f, CastleColors.ROBOT_FRAME))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_arm_r_lower",
                    Vec2f(cx + 14f, cy - 30f), DrawPayload.ColorRect(5f, 10f, CastleColors.ROBOT_FRAME))
                // Head — wider rectangular block, sharp edges
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_neck",
                    Vec2f(cx - 4f, cy - 48f), DrawPayload.ColorRect(8f, 4f, CastleColors.ROBOT_JOINT))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_head",
                    Vec2f(cx - 11f, cy - 62f), DrawPayload.ColorRect(22f, 14f, CastleColors.ROBOT_FRAME))
                // Head panel lines
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_head_seam",
                    Vec2f(cx - 11f, cy - 55f),
                    DrawPayload.Line(cx - 11f, cy - 55f, cx + 11f, cy - 55f, CastleColors.ROBOT_JOINT, 0.7f))
                // Antenna — prominent, taller, with tip node
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_antenna_shaft",
                    Vec2f(cx, cy - 62f),
                    DrawPayload.Line(cx, cy - 62f, cx + 2f, cy - 78f, 0xFF_808888.toInt(), 1.5f))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_antenna_tip",
                    Vec2f(cx, cy - 80f), DrawPayload.ColorOval(5f, 5f, CastleColors.ROBOT_EYE))
                // Scanline eye — pulsing green bar
                val eyeAlpha = flickerAlpha(tick, phase, rate = 0.25, minAlpha = 0xAA, maxAlpha = 0xFF)
                val eyeArgb = (eyeAlpha shl 24) or (CastleColors.ROBOT_EYE and 0x00FFFFFF)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_eye",
                    Vec2f(cx - 8f, cy - 57f), DrawPayload.ColorRect(16f, 3f, eyeArgb))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_eye_glow",
                    Vec2f(cx - 12f, cy - 60f), DrawPayload.ColorOval(24f, 12f, CastleColors.ROBOT_EYE_GLOW))
            }

            ActorType.DRUID -> {
                commands += actorShadow(cx, cy, 20f, 5f, dk)
                // Robe — asymmetric trapezoidal, hunched forward, wider on one side
                val robePts = listOf(
                    Vec2f(cx - 14f, cy - 6f),
                    Vec2f(cx + 10f, cy - 8f),
                    Vec2f(cx +  6f, cy - 42f),
                    Vec2f(cx -  8f, cy - 46f),  // hunched: left shoulder higher
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 0, "${id}_robe",
                    Vec2f(cx - 14f, cy - 6f), DrawPayload.ColorPath(robePts, CastleColors.DRUID_ROBE))
                // Robe edge highlights — asymmetric, left side only (hunched silhouette)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_robe_edge_l",
                    Vec2f(cx - 14f, cy - 6f),
                    DrawPayload.Line(cx - 14f, cy - 6f, cx - 8f, cy - 46f, CastleColors.DRUID_ROBE_EDGE, 1.0f))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_robe_edge_r",
                    Vec2f(cx + 10f, cy - 8f),
                    DrawPayload.Line(cx + 10f, cy - 8f, cx + 6f, cy - 42f, CastleColors.DRUID_ROBE_EDGE, 0.5f))
                // Oversized hood/cowl — large asymmetric oval, jutting forward
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_cowl",
                    Vec2f(cx - 12f, cy - 62f), DrawPayload.ColorOval(22f, 18f, CastleColors.DRUID_ROBE))
                // Cowl peak — pointed top
                val cowlPeak = listOf(
                    Vec2f(cx - 6f, cy - 62f),
                    Vec2f(cx + 4f, cy - 62f),
                    Vec2f(cx - 2f, cy - 72f),
                )
                commands += DrawCommand(DrawLayer.ACTOR, dk, 3, "${id}_cowl_peak",
                    Vec2f(cx - 6f, cy - 72f), DrawPayload.ColorPath(cowlPeak, CastleColors.DRUID_ROBE))
                // Skull face — jutting forward from under oversized hood
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_skull",
                    Vec2f(cx - 6f, cy - 56f), DrawPayload.ColorOval(13f, 10f, CastleColors.DRUID_SKULL))
                // Eye sockets — two dark voids
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_eye_l",
                    Vec2f(cx - 5f, cy - 53f), DrawPayload.ColorOval(3f, 4f, 0xFF_000000.toInt()))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 4, "${id}_eye_r",
                    Vec2f(cx + 1f, cy - 53f), DrawPayload.ColorOval(3f, 4f, 0xFF_000000.toInt()))
                // Crooked staff — curved/bent, not straight, held on left side
                // Staff shaft — 3 segments forming a crook
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_staff_lower",
                    Vec2f(cx - 16f, cy - 6f),
                    DrawPayload.Line(cx - 16f, cy - 6f, cx - 14f, cy - 40f, 0xFF_5A4020.toInt(), 2.0f))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_staff_mid",
                    Vec2f(cx - 14f, cy - 40f),
                    DrawPayload.Line(cx - 14f, cy - 40f, cx - 18f, cy - 60f, 0xFF_5A4020.toInt(), 1.8f))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_staff_crook",
                    Vec2f(cx - 18f, cy - 60f),
                    DrawPayload.Line(cx - 18f, cy - 60f, cx - 12f, cy - 68f, 0xFF_5A4020.toInt(), 1.5f))
                // Staff crook tip — small knob
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_staff_tip",
                    Vec2f(cx - 14f, cy - 70f), DrawPayload.ColorOval(5f, 5f, 0xFF_6A5030.toInt()))
                // Magic orb — held in right hand, pulsing purple
                val orbPulse = flickerAlpha(tick, phase + 1.0, rate = 0.08, minAlpha = 0xDD, maxAlpha = 0xFF)
                val orbArgb = (orbPulse shl 24) or (CastleColors.DRUID_ORB and 0x00FFFFFF)
                commands += DrawCommand(DrawLayer.ACTOR, dk, 2, "${id}_orb",
                    Vec2f(cx + 8f, cy - 28f), DrawPayload.ColorOval(10f, 10f, orbArgb))
                commands += DrawCommand(DrawLayer.ACTOR, dk, 1, "${id}_orb_glow",
                    Vec2f(cx + 3f, cy - 33f), DrawPayload.ColorOval(20f, 20f, CastleColors.DRUID_ORB_GLOW))
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

        // ── Try PNG sprite sheet (Midjourney art) ─────────────────────────────
        val animPhase = ((state.time.tick * 0.25f).toInt() % 2)
        val spriteRef = actorArtCatalog.resolvePlayerSprite(
            form = player.form,
            motion = player.movementState,
            facing = player.facing,
            framePhase = animPhase,
        )
        if (spriteRef != null) {
            val spriteW = spriteRef.srcW * spriteRef.scale
            val spriteH = spriteRef.srcH * spriteRef.scale
            // Shadow at feet (doesn't bob)
            commands += DrawCommand(
                layer = DrawLayer.FLOOR, depthKey = dk, priority = -1, entityId = "player_shadow",
                screenPos = Vec2f(screen.x - spriteW * 0.4f, screen.y - 4f),
                payload = DrawPayload.ColorOval(spriteW * 0.8f, 8f, 0x44_000000.toInt()),
            )
            // Sprite — centered on feet, with bob for walk bounce
            commands += DrawCommand(
                layer = DrawLayer.PLAYER,
                depthKey = dk,
                entityId = "player",
                screenPos = Vec2f(screen.x - spriteW / 2f, screen.y - spriteH + bob),
                payload = DrawPayload.Sprite(
                    sheetId = spriteRef.sheetId,
                    srcX = spriteRef.srcX, srcY = spriteRef.srcY,
                    srcW = spriteRef.srcW, srcH = spriteRef.srcH,
                    scale = spriteRef.scale,
                    flipX = spriteRef.flipX,
                ),
            )
            return
        }

        // ── Fallback: polygon-based authored sprite ──────────────────────────────
        val authoredSprite = actorArtCatalog.resolvePlayer(
            form = player.form,
            motion = player.movementState,
            facing = player.facing,
            framePhase = animPhase,
            tick = state.time.tick,
        )
        if (authoredSprite != null) {
            commands += DrawCommand(
                layer = DrawLayer.PLAYER,
                depthKey = dk,
                entityId = "player",
                screenPos = screen,
                payload = DrawPayload.AuthoredSprite(authoredSprite),
            )
            return
        }

        // ── Legacy rendering below (fallback for unimplemented forms/states) ──────
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
            // ══════════════════════════════════════════════════════════════════════
            // HUMAN FORM — stooped adventurer with oversized hat
            // ══════════════════════════════════════════════════════════════════════
            val blink = blinking
            val cloakBase   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_BASE
            val cloakEdge   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_EDGE
            val cloakShadow = if (blink) HUMAN_BLINK else HUMAN_CLOAK_SHADOW
            val skinColor   = if (blink) HUMAN_BLINK else HUMAN_SKIN
            val metalColor  = if (blink) HUMAN_BLINK else HUMAN_METAL

            // Forward lean offset — the adventurer stoops under his massive hat
            val lean = 2f

            // ── LEGS (short stubby boots) ─────────────────────────────────────
            val bootColor = if (blink) HUMAN_BLINK else 0xFF_1E1A14.toInt()
            val legH = (8f * legHeightMul)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
                Vec2f(cx - 6f + lean, cy - legH + leftLegFwd),
                DrawPayload.ColorRect(5f, legH, bootColor))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
                Vec2f(cx + 1f + lean, cy - legH + rightLegFwd),
                DrawPayload.ColorRect(5f, legH, bootColor))
            // Boot soles — darker oval at the bottom of each boot
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_sole_l",
                Vec2f(cx - 7f + lean, cy - 1f + leftLegFwd),
                DrawPayload.ColorOval(7f, 3f, 0xFF_0E0A08.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_sole_r",
                Vec2f(cx + lean, cy - 1f + rightLegFwd),
                DrawPayload.ColorOval(7f, 3f, 0xFF_0E0A08.toInt()))

            // ── CLOAK BODY — trapezoid, 22px hem, 16px shoulders, leaned fwd ──
            val cloakHemL  = cx - 11f + lean
            val cloakHemR  = cx + 11f + lean
            val cloakShouL = cx - 8f + lean
            val cloakShouR = cx + 8f + lean
            val hemY       = cy - 9f
            val shouY      = cy - 40f
            val cloakPts = listOf(
                Vec2f(cloakHemL, hemY),
                Vec2f(cloakHemR, hemY),
                Vec2f(cloakShouR, shouY),
                Vec2f(cloakShouL, shouY),
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_cloak",
                Vec2f(cloakHemL, shouY), DrawPayload.ColorPath(cloakPts, cloakBase))

            // Cloak fold line — off-centre (cx+2) for asymmetric drape
            val foldX = cx + 2f + lean
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_fold",
                Vec2f(foldX, hemY),
                DrawPayload.Line(foldX, hemY, foldX - 1f, shouY, cloakShadow, 1f))

            // Cloak left edge catch-light
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_edge_l",
                Vec2f(cloakHemL, hemY),
                DrawPayload.Line(cloakHemL, hemY, cloakShouL, shouY, cloakEdge, 0.8f))

            // Cloak right edge shadow
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_edge_r",
                Vec2f(cloakHemR, hemY),
                DrawPayload.Line(cloakHemR, hemY, cloakShouR, shouY, cloakShadow, 0.8f))

            // ── BELT & SCABBARD ───────────────────────────────────────────────
            val beltY = cy - 20f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_belt",
                Vec2f(cx - 9f + lean, beltY),
                DrawPayload.ColorRect(18f, 3f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
            // Buckle — small rect, left of centre
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_buckle",
                Vec2f(cx - 3f + lean, beltY - 1f),
                DrawPayload.ColorRect(4f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER_WORN))
            // Scabbard on LEFT hip — thin dark rectangle hanging from belt
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_scabbard",
                Vec2f(cx - 14f + lean, beltY + 2f),
                DrawPayload.ColorRect(3f, 12f, if (blink) HUMAN_BLINK else 0xFF_1A1810.toInt()))
            // Scabbard chape (tip)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_scabbard_tip",
                Vec2f(cx - 14f + lean, beltY + 13f),
                DrawPayload.ColorOval(4f, 3f, metalColor))
            // Sword pommel — small oval at top of scabbard
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_pommel",
                Vec2f(cx - 16f + lean, beltY),
                DrawPayload.ColorOval(5f, 4f, metalColor))

            // ── ARMS ──────────────────────────────────────────────────────────
            val armTopY = cy - 36f
            val armBotY = cy - 22f
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 13f + lean, armTopY + leftLegFwd * 0.4f),
                DrawPayload.ColorRect(4f, armBotY - armTopY, cloakBase))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 9f + lean, armTopY + rightLegFwd * 0.4f),
                DrawPayload.ColorRect(4f, armBotY - armTopY, cloakBase))
            // Gloved hands
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_l",
                Vec2f(cx - 14f + lean, armBotY + leftLegFwd * 0.4f),
                DrawPayload.ColorOval(5f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_r",
                Vec2f(cx + 9f + lean, armBotY + rightLegFwd * 0.4f),
                DrawPayload.ColorOval(5f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))

            // ── NECK ──────────────────────────────────────────────────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_neck",
                Vec2f(cx - 3f + lean, cy - 44f),
                DrawPayload.ColorRect(6f, 5f, skinColor))

            // ── FACE — small, mostly hidden under hat brim ────────────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_face",
                Vec2f(cx - 5f + lean, cy - 52f),
                DrawPayload.ColorOval(10f, 9f, skinColor))

            // Eyes — facing direction shifts them L/R
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -2f
                "EAST", "NORTHEAST", "SOUTHEAST" ->  2f
                else -> 0f
            }
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(cx - 3f + lean + facingShift, cy - 50f),
                DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(cx + 2f + lean + facingShift, cy - 50f),
                DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))

            // ── OVERSIZED HAT — 30px brim (WIDER than body), 20x14 dome ──────
            val helmColor = if (blink) HUMAN_BLINK else cloakBase
            val helmHighlight = if (blink) HUMAN_BLINK else cloakEdge
            val helmShadow = if (blink) HUMAN_BLINK else cloakShadow

            // Brim — 30px wide oval, wider than the 22px body
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_helm_brim",
                Vec2f(cx - 15f + lean, cy - 56f),
                DrawPayload.ColorOval(30f, 8f, helmShadow))

            // Dome — 20x14 oval sitting on the brim
            commands += DrawCommand(DrawLayer.PLAYER, dk, 7, "player_helm_dome",
                Vec2f(cx - 10f + lean, cy - 70f),
                DrawPayload.ColorOval(20f, 14f, helmColor))

            // Dome highlight — lighter crescent across top
            commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_helm_hl",
                Vec2f(cx - 7f + lean, cy - 69f),
                DrawPayload.ColorOval(14f, 7f, helmHighlight))

            // Dome shadow band at base
            commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_helm_shade",
                Vec2f(cx - 9f + lean, cy - 58f),
                DrawPayload.ColorOval(18f, 4f, helmShadow))

            // Hat band — metallic silver stripe around the dome base
            commands += DrawCommand(DrawLayer.PLAYER, dk, 9, "player_helm_band",
                Vec2f(cx - 9f + lean, cy - 58f),
                DrawPayload.ColorRect(18f, 2f, metalColor))
        } else {
            // ══════════════════════════════════════════════════════════════════════
            // WEREWOLF FORM — hunched beast, opposite mass from human
            // Shoulder hump is highest point (above head). Wide shoulders ~30px,
            // narrow haunches ~18px. Head LOW and forward, below shoulder line.
            // ══════════════════════════════════════════════════════════════════════
            val blink = blinking
            val furMid   = if (blink) HUMAN_BLINK else WOLF_FUR_MID
            val furDark  = if (blink) HUMAN_BLINK else WOLF_FUR_DARK
            val furLight = if (blink) HUMAN_BLINK else WOLF_FUR_LIGHT
            val clawCol  = if (blink) HUMAN_BLINK else WOLF_CLAW
            val eyeCol   = if (blink) HUMAN_BLINK else WOLF_EYE
            val fangCol  = if (blink) HUMAN_BLINK else WOLF_FANG

            // ── TAIL — sine-sway animated ─────────────────────────────────────
            val tailSway = (kotlin.math.sin(state.time.tick.toDouble() * 0.08) * 4.0).toFloat()
            val t0 = Vec2f(cx + 8f,  cy - 14f)                   // base at haunch
            val t1 = Vec2f(cx + 18f, cy - 22f + tailSway)        // mid-curve
            val t2 = Vec2f(cx + 24f, cy - 30f + tailSway * 1.4f) // upper curve
            val t3 = Vec2f(cx + 20f, cy - 38f + tailSway * 1.8f) // tip
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_1",
                t0, DrawPayload.Line(t0.x, t0.y, t1.x, t1.y, furDark, 3f))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_2",
                t1, DrawPayload.Line(t1.x, t1.y, t2.x, t2.y, furMid, 2.5f))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_3",
                t2, DrawPayload.Line(t2.x, t2.y, t3.x, t3.y, furMid, 1.8f))
            // Tail tip tuft
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_tip",
                Vec2f(t3.x - 3f, t3.y - 3f),
                DrawPayload.ColorOval(6f, 5f, furLight))

            // ── HIND LEGS — narrow haunches ───────────────────────────────────
            val legH = (10f * legHeightMul)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_leg_l",
                Vec2f(cx - 8f, cy - legH + leftLegFwd),
                DrawPayload.ColorOval(7f, legH, furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_leg_r",
                Vec2f(cx + 1f, cy - legH + rightLegFwd),
                DrawPayload.ColorOval(7f, legH, furDark))
            // Hind paws
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_paw_l",
                Vec2f(cx - 9f, cy - 2f + leftLegFwd),
                DrawPayload.ColorOval(9f, 4f, furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_paw_r",
                Vec2f(cx, cy - 2f + rightLegFwd),
                DrawPayload.ColorOval(9f, 4f, furDark))
            // Hind claws
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_claw_hl",
                Vec2f(cx - 10f, cy + 1f + leftLegFwd),
                DrawPayload.ColorOval(3f, 2f, clawCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_claw_hr",
                Vec2f(cx + 7f, cy + 1f + rightLegFwd),
                DrawPayload.ColorOval(3f, 2f, clawCol))

            // ── BODY — inverted trapezoid: wide shoulders ~30px, narrow haunches ~18px
            val haunchY = cy - 12f
            val shoulderY = cy - 46f
            val bodyPts = listOf(
                Vec2f(cx - 9f, haunchY),       // haunch left  (narrow ~18px)
                Vec2f(cx + 9f, haunchY),       // haunch right
                Vec2f(cx + 15f, shoulderY),    // shoulder right (wide ~30px)
                Vec2f(cx - 15f, shoulderY),    // shoulder left
            )
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_body",
                Vec2f(cx - 15f, shoulderY), DrawPayload.ColorPath(bodyPts, furMid))

            // Belly — lighter underside stripe
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_belly",
                Vec2f(cx - 7f, cy - 24f),
                DrawPayload.ColorOval(14f, 10f, furLight))

            // ── SHOULDER HUMP — highest point, above head ─────────────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_hump",
                Vec2f(cx - 12f, cy - 60f),
                DrawPayload.ColorOval(24f, 16f, furMid))
            // Hump ridge — darker fur spine line
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_hump_ridge",
                Vec2f(cx - 1f, cy - 60f),
                DrawPayload.Line(cx - 1f, cy - 58f, cx + 2f, cy - 46f, furDark, 2f))

            // ── FOREARMS — long, reaching forward with oval paws ──────────────
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
                Vec2f(cx - 18f, cy - 42f + leftLegFwd * 0.5f),
                DrawPayload.ColorOval(8f, 20f, furMid))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
                Vec2f(cx + 10f, cy - 42f + rightLegFwd * 0.5f),
                DrawPayload.ColorOval(8f, 20f, furMid))
            // Front paws — oval
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fpaw_l",
                Vec2f(cx - 20f, cy - 24f + leftLegFwd * 0.5f),
                DrawPayload.ColorOval(10f, 6f, furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fpaw_r",
                Vec2f(cx + 10f, cy - 24f + rightLegFwd * 0.5f),
                DrawPayload.ColorOval(10f, 6f, furDark))
            // Front claws
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_claw_fl",
                Vec2f(cx - 21f, cy - 20f + leftLegFwd * 0.5f),
                DrawPayload.ColorOval(3f, 2f, clawCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_claw_fr",
                Vec2f(cx + 18f, cy - 20f + rightLegFwd * 0.5f),
                DrawPayload.ColorOval(3f, 2f, clawCol))

            // ── HEAD — LOW and forward, below shoulder hump line ──────────────
            // Head centre sits below the shoulder hump at cy-48
            val headCX = cx - 4f   // offset LEFT (predatory lean forward)
            val headCY = cy - 48f  // below the hump peak at cy-60
            commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_head",
                Vec2f(headCX - 8f, headCY - 6f),
                DrawPayload.ColorOval(16f, 12f, furMid))

            // Facing direction
            val facingShift = when (player.facing.name) {
                "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
                "EAST", "NORTHEAST", "SOUTHEAST" ->  3f
                else -> 0f
            }

            // Snout — elongated, projects forward
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_snout",
                Vec2f(headCX - 6f + facingShift, headCY - 1f),
                DrawPayload.ColorOval(14f, 7f, furDark))
            // Nose tip
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_nose",
                Vec2f(headCX - 8f + facingShift, headCY),
                DrawPayload.ColorOval(4f, 3f, 0xFF_1A1A22.toInt()))

            // Eyes — burning amber, small but vivid
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
                Vec2f(headCX - 4f + facingShift, headCY - 5f),
                DrawPayload.ColorOval(3f, 3f, eyeCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
                Vec2f(headCX + 2f + facingShift, headCY - 5f),
                DrawPayload.ColorOval(3f, 3f, eyeCol))
            // Eye glow — faint orange halo
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_l_glow",
                Vec2f(headCX - 6f + facingShift, headCY - 7f),
                DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_r_glow",
                Vec2f(headCX + facingShift, headCY - 7f),
                DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))

            // Ears — pointed, sitting on top of head (still below hump)
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_l",
                Vec2f(headCX - 7f, headCY - 12f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX - 7f, headCY - 6f),
                    Vec2f(headCX - 3f, headCY - 6f),
                    Vec2f(headCX - 5f, headCY - 16f),
                ), furMid))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_r",
                Vec2f(headCX + 3f, headCY - 12f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX + 3f, headCY - 6f),
                    Vec2f(headCX + 7f, headCY - 6f),
                    Vec2f(headCX + 5f, headCY - 16f),
                ), furMid))
            // Inner ear
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_l_in",
                Vec2f(headCX - 6f, headCY - 11f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX - 6f, headCY - 8f),
                    Vec2f(headCX - 4f, headCY - 8f),
                    Vec2f(headCX - 5f, headCY - 13f),
                ), furDark))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_r_in",
                Vec2f(headCX + 4f, headCY - 11f),
                DrawPayload.ColorPath(listOf(
                    Vec2f(headCX + 4f, headCY - 8f),
                    Vec2f(headCX + 6f, headCY - 8f),
                    Vec2f(headCX + 5f, headCY - 13f),
                ), furDark))

            // Fangs — two small downward rects below snout
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_l",
                Vec2f(headCX - 2f + facingShift, headCY + 3f),
                DrawPayload.ColorRect(2f, 4f, fangCol))
            commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_r",
                Vec2f(headCX + 2f + facingShift, headCY + 3f),
                DrawPayload.ColorRect(2f, 4f, fangCol))
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
