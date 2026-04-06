package com.palacesoft.knightlore.render.hud

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.TransformPhase
import kotlin.math.sin

/**
 * Renders the HUD overlay onto the canvas in screen-space.
 * Drawn after the scene commands.
 */
object HudRenderer {

    fun render(canvas: Canvas, state: GameState, content: GameContent) {
        val paint = Paint()
        drawBars(canvas, paint)
        drawDayCounter(canvas, state, paint)
        drawLives(canvas, state, paint)
        drawInventorySlots(canvas, state, paint)
        drawCureProgress(canvas, state, content, paint)
        drawFormIndicator(canvas, state, paint)
        drawTransformCountdown(canvas, state, paint)
    }

    // Top and bottom dark bars
    private fun drawBars(canvas: Canvas, paint: Paint) {
        paint.style = Paint.Style.FILL
        paint.color = 0xAA_000000.toInt()
        canvas.drawRect(0f, 0f, canvas.width.toFloat(), 52f, paint)
        canvas.drawRect(0f, canvas.height - 52f, canvas.width.toFloat(), canvas.height.toFloat(), paint)
    }

    // Day counter: top-left — "DAY N" + orange progress bar
    private fun drawDayCounter(canvas: Canvas, state: GameState, paint: Paint) {
        paint.style = Paint.Style.FILL
        paint.color = 0xFF_CCCCAA.toInt()
        paint.textSize = 22f
        paint.textAlign = Paint.Align.LEFT
        canvas.drawText("DAY ${state.time.dayIndex + 1}", 16f, 34f, paint)

        // Progress bar background
        paint.color = 0xFF_333322.toInt()
        canvas.drawRect(16f, 40f, 16f + 120f, 46f, paint)
        // Progress bar fill
        val fillW = state.time.phaseProgress * 120f
        paint.color = 0xFF_CC6600.toInt()
        canvas.drawRect(16f, 40f, 16f + fillW, 46f, paint)
    }

    // Lives: skull diamonds at top-right
    private fun drawLives(canvas: Canvas, state: GameState, paint: Paint) {
        paint.style = Paint.Style.FILL
        paint.color = 0xFF_CC2222.toInt()
        val lives = state.player.lives
        for (i in 0 until lives) {
            val cx = canvas.width - 16f - i * 26f
            val cy = 16f + 8f  // center y
            val half = 8f
            val path = Path()
            path.moveTo(cx, cy - half)       // top
            path.lineTo(cx + half, cy)       // right
            path.lineTo(cx, cy + half)       // bottom
            path.lineTo(cx - half, cy)       // left
            path.close()
            canvas.drawPath(path, paint)
        }
    }

    // Inventory slots: bottom-center — 3 slots, always visible (filled or empty outline)
    private fun drawInventorySlots(canvas: Canvas, state: GameState, paint: Paint) {
        val slotSize = 28f
        val slotGap = 8f
        val totalW = 3 * slotSize + 2 * slotGap
        val startX = (canvas.width - totalW) / 2f
        val slotY = canvas.height - 48f

        for (i in 0 until 3) {
            val left = startX + i * (slotSize + slotGap)
            val right = left + slotSize
            val top = slotY
            val bottom = slotY + slotSize

            if (i < state.player.inventory.size) {
                // Filled slot: item highlight color
                paint.style = Paint.Style.FILL
                paint.color = 0xFF_FFDD44.toInt()
                canvas.drawRect(left + 4f, top + 4f, right - 4f, bottom - 4f, paint)
            }
            // Slot border (always drawn)
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = 1.5f
            paint.color = 0xFF_6A6A8A.toInt()
            canvas.drawRect(left, top, right, bottom, paint)
        }
        paint.style = Paint.Style.FILL
    }

    // Cure progress: bottom-left
    private fun drawCureProgress(canvas: Canvas, state: GameState, content: GameContent, paint: Paint) {
        val nextItem = content.cureSequence.sequence.getOrNull(state.cauldron.deliveredCount)

        paint.style = Paint.Style.FILL
        paint.color = 0xFF_44FF88.toInt()
        paint.textSize = 20f
        paint.textAlign = Paint.Align.LEFT
        canvas.drawText(
            "CURE: ${state.cauldron.deliveredCount}/${content.cureSequence.sequence.size}",
            16f, canvas.height - 34f, paint
        )

        paint.color = 0xFF_AAAAAA.toInt()
        paint.textSize = 16f
        canvas.drawText(
            "NEED: ${nextItem ?: "DONE"}",
            16f, canvas.height - 14f, paint
        )
    }

    // Form indicator: bottom-right, ALWAYS visible
    private fun drawFormIndicator(canvas: Canvas, state: GameState, paint: Paint) {
        val phase = state.player.transformState.phase

        val (label, color) = when (phase) {
            TransformPhase.STABLE -> {
                val lbl = if (state.player.form == Form.HUMAN) "HUMAN" else "WEREWULF"
                val clr = if (state.player.form == Form.HUMAN) 0xFF_88FFCC.toInt() else 0xFF_AA44FF.toInt()
                lbl to clr
            }
            TransformPhase.TRANSFORMING_TO_WEREWULF -> "TRANSFORMING → WEREWULF" to 0xFF_8844CC.toInt()
            TransformPhase.TRANSFORMING_TO_HUMAN    -> "TRANSFORMING → HUMAN"    to 0xFF_44BB88.toInt()
            TransformPhase.RECOVERING               -> "RECOVERING"              to 0xFF_FFAA44.toInt()
        }

        paint.style = Paint.Style.FILL
        paint.color = color
        paint.textSize = 20f
        paint.textAlign = Paint.Align.RIGHT
        canvas.drawText(label, canvas.width - 16f, canvas.height - 14f, paint)
    }

    // Transform countdown: top-center, only when ticksUntilTransform != null
    private fun drawTransformCountdown(canvas: Canvas, state: GameState, paint: Paint) {
        val ticks = state.time.ticksUntilTransform ?: return
        val phase = state.time.phase

        val (label, baseColor) = when (phase) {
            DayPhase.DUSK -> "⚠ NIGHT FALLS IN ${ticks / 60}s" to 0xFF_FF8800.toInt()
            DayPhase.DAWN -> "⚠ DAWN IN ${ticks / 60}s"        to 0xFF_44CCFF.toInt()
            else -> return
        }

        val pulseAlpha = (sin(state.time.tick.toDouble() * 0.2) * 40 + 200).toInt().coerceIn(0, 255)
        val r = (baseColor shr 16) and 0xFF
        val g = (baseColor shr 8) and 0xFF
        val b = baseColor and 0xFF
        val pulsedColor = (pulseAlpha shl 24) or (r shl 16) or (g shl 8) or b

        paint.style = Paint.Style.FILL
        paint.color = pulsedColor
        paint.textSize = 26f
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText(label, canvas.width / 2f, 34f, paint)
    }
}
