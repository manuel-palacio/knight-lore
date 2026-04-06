package com.palacesoft.knightlore.debug

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.ExitSide
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.domain.model.TileType
import com.palacesoft.knightlore.render.iso.IsoProjector

object DebugOverlayRenderer {

    private val gridLinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f
    }
    private val solidBlockPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f
    }
    private val actorPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
    }
    private val playerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
    }
    private val exitFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val exitLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 20f
        textAlign = Paint.Align.CENTER
    }
    private val panelBgPaint = Paint().apply {
        style = Paint.Style.FILL
    }
    private val panelTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 24f
    }
    private val path = Path()

    private fun Float.fmt(): String = "%.1f".format(this)

    fun render(
        canvas: Canvas,
        state: GameState,
        room: RoomDefinition,
        viewportW: Float,
        viewportH: Float,
    ) {
        val offset = IsoProjector.roomOffset(room.width, room.depth, viewportW, viewportH)
        val ox = offset.x
        val oy = offset.y

        drawIsometricGrid(canvas, room, ox, oy)
        drawActorDiamonds(canvas, state, ox, oy)
        drawPlayerDiamond(canvas, state, ox, oy)
        drawExitIndicators(canvas, room, ox, oy)
        drawInfoPanel(canvas, state)
    }

    // -------------------------------------------------------------------------
    // 1. Isometric grid lines
    // -------------------------------------------------------------------------

    private fun drawIsometricGrid(canvas: Canvas, room: RoomDefinition, ox: Float, oy: Float) {
        gridLinePaint.color = Color.argb(120, 0, 200, 255)

        // Draw floor grid
        for (x in 0..room.width) {
            for (y in 0..room.depth) {
                drawFloorDiamond(canvas, gridLinePaint, x.toFloat(), y.toFloat(), 0f, ox, oy)
            }
        }

        // Draw solid block outlines
        solidBlockPaint.color = Color.argb(80, 255, 150, 0)

        for (tile in room.tiles) {
            if (tile.type == TileType.SOLID_BLOCK) {
                val bx = tile.gridX.toFloat()
                val by = tile.gridY.toFloat()
                val bz = tile.gridZ.toFloat()
                val topZ = bz + 1f

                // Floor diamond at bz
                drawFloorDiamond(canvas, solidBlockPaint, bx, by, bz, ox, oy)
                // Top diamond at topZ
                drawFloorDiamond(canvas, solidBlockPaint, bx, by, topZ, ox, oy)

                // 4 vertical edges
                val corners = listOf(
                    Vec3f(bx, by, bz),
                    Vec3f(bx + 1f, by, bz),
                    Vec3f(bx + 1f, by + 1f, bz),
                    Vec3f(bx, by + 1f, bz),
                )
                for (corner in corners) {
                    val s0 = IsoProjector.toScreen(corner)
                    val s1 = IsoProjector.toScreen(Vec3f(corner.x, corner.y, corner.z + 1f))
                    canvas.drawLine(
                        ox + s0.x, oy + s0.y,
                        ox + s1.x, oy + s1.y,
                        solidBlockPaint,
                    )
                }
            }
        }
    }

    private fun drawFloorDiamond(
        canvas: Canvas,
        paint: Paint,
        gx: Float,
        gy: Float,
        gz: Float,
        ox: Float,
        oy: Float,
    ) {
        val tl = IsoProjector.toScreen(Vec3f(gx, gy, gz))
        val tr = IsoProjector.toScreen(Vec3f(gx + 1f, gy, gz))
        val br = IsoProjector.toScreen(Vec3f(gx + 1f, gy + 1f, gz))
        val bl = IsoProjector.toScreen(Vec3f(gx, gy + 1f, gz))

        path.reset()
        path.moveTo(ox + tl.x, oy + tl.y)
        path.lineTo(ox + tr.x, oy + tr.y)
        path.lineTo(ox + br.x, oy + br.y)
        path.lineTo(ox + bl.x, oy + bl.y)
        path.close()
        canvas.drawPath(path, paint)
    }

    // -------------------------------------------------------------------------
    // 2. Actor collision volumes
    // -------------------------------------------------------------------------

    private fun drawActorDiamonds(canvas: Canvas, state: GameState, ox: Float, oy: Float) {
        actorPaint.color = Color.argb(180, 255, 50, 50)

        for (actor in state.actorStates) {
            drawSmallDiamond(canvas, actorPaint, actor.position, ox, oy)
        }
    }

    // -------------------------------------------------------------------------
    // 3. Player collision volume
    // -------------------------------------------------------------------------

    private fun drawPlayerDiamond(canvas: Canvas, state: GameState, ox: Float, oy: Float) {
        playerPaint.color = Color.argb(180, 50, 255, 50)
        drawSmallDiamond(canvas, playerPaint, state.player.position, ox, oy)
    }

    private fun drawSmallDiamond(canvas: Canvas, paint: Paint, pos: Vec3f, ox: Float, oy: Float) {
        val half = 0.4f
        val tl = IsoProjector.toScreen(Vec3f(pos.x - half, pos.y, pos.z))
        val tr = IsoProjector.toScreen(Vec3f(pos.x, pos.y - half, pos.z))
        val br = IsoProjector.toScreen(Vec3f(pos.x + half, pos.y, pos.z))
        val bl = IsoProjector.toScreen(Vec3f(pos.x, pos.y + half, pos.z))

        path.reset()
        path.moveTo(ox + tl.x, oy + tl.y)
        path.lineTo(ox + tr.x, oy + tr.y)
        path.lineTo(ox + br.x, oy + br.y)
        path.lineTo(ox + bl.x, oy + bl.y)
        path.close()
        canvas.drawPath(path, paint)
    }

    // -------------------------------------------------------------------------
    // 4. Exit trigger indicators
    // -------------------------------------------------------------------------

    private fun drawExitIndicators(canvas: Canvas, room: RoomDefinition, ox: Float, oy: Float) {
        exitFillPaint.color = Color.argb(200, 255, 255, 0)
        exitLabelPaint.color = Color.argb(255, 255, 255, 0)

        val w = room.width.toFloat()
        val d = room.depth.toFloat()

        for (exit in room.exits) {
            val worldPos = when (exit.side) {
                ExitSide.NORTH -> Vec3f(w / 2f, 0f, 0f)
                ExitSide.SOUTH -> Vec3f(w / 2f, d, 0f)
                ExitSide.EAST -> Vec3f(w, d / 2f, 0f)
                ExitSide.WEST -> Vec3f(0f, d / 2f, 0f)
            }
            val label = when (exit.side) {
                ExitSide.NORTH -> "N"
                ExitSide.SOUTH -> "S"
                ExitSide.EAST -> "E"
                ExitSide.WEST -> "W"
            }

            val half = 0.35f
            val tl = IsoProjector.toScreen(Vec3f(worldPos.x - half, worldPos.y, worldPos.z))
            val tr = IsoProjector.toScreen(Vec3f(worldPos.x, worldPos.y - half, worldPos.z))
            val br = IsoProjector.toScreen(Vec3f(worldPos.x + half, worldPos.y, worldPos.z))
            val bl = IsoProjector.toScreen(Vec3f(worldPos.x, worldPos.y + half, worldPos.z))

            path.reset()
            path.moveTo(ox + tl.x, oy + tl.y)
            path.lineTo(ox + tr.x, oy + tr.y)
            path.lineTo(ox + br.x, oy + br.y)
            path.lineTo(ox + bl.x, oy + bl.y)
            path.close()
            canvas.drawPath(path, exitFillPaint)

            // Label above the diamond
            val centerScreen = IsoProjector.toScreen(worldPos)
            canvas.drawText(label, ox + centerScreen.x, oy + centerScreen.y - 20f, exitLabelPaint)
        }
    }

    // -------------------------------------------------------------------------
    // 5. Info panel (top-left)
    // -------------------------------------------------------------------------

    private fun drawInfoPanel(canvas: Canvas, state: GameState) {
        panelBgPaint.color = Color.argb(160, 0, 0, 0)
        panelTextPaint.color = Color.WHITE
        panelTextPaint.textSize = 28f
        panelTextPaint.typeface = Typeface.MONOSPACE

        val lines = listOf(
            "ROOM: ${state.currentRoomId.value}",
            "DAY: ${state.time.dayIndex + 1}  TICK: ${state.time.ticksInDay}",
            "PLAYER: (${state.player.position.x.fmt()}, ${state.player.position.y.fmt()}, ${state.player.position.z.fmt()})",
            "FORM: ${state.player.form}  PHASE: ${state.player.transformState.phase}",
            "DEPTH_KEY: ${IsoProjector.depthKey(state.player.position)}",
            "ACTORS: ${state.actorStates.size}",
        )

        val padding = 12f
        val lineHeight = 34f
        val panelW = 520f
        val panelH = padding * 2 + lines.size * lineHeight

        canvas.drawRect(RectF(8f, 8f, 8f + panelW, 8f + panelH), panelBgPaint)

        lines.forEachIndexed { i, line ->
            canvas.drawText(line, 8f + padding, 8f + padding + panelTextPaint.textSize + i * lineHeight, panelTextPaint)
        }
    }
}
