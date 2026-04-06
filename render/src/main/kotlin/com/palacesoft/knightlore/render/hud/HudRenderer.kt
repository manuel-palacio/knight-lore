package com.palacesoft.knightlore.render.hud

import android.graphics.Canvas
import android.graphics.Paint
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState

/**
 * Renders the HUD overlay onto the canvas in screen-space.
 * Drawn after the scene commands.
 */
object HudRenderer {

    private val paint = Paint().apply {
        isAntiAlias = true
    }

    fun render(canvas: Canvas, state: GameState, content: GameContent) {
        drawLives(canvas, state)
        drawDayNightBar(canvas, state)
        drawCarriedItems(canvas, state)
        drawCauldronRequest(canvas, state, content)
    }

    // Lives: filled circles at top-left
    private fun drawLives(canvas: Canvas, state: GameState) {
        paint.style = Paint.Style.FILL
        paint.color = 0xFF_EE4444.toInt()
        val diameter = 20f
        val spacing = 28f
        val top = 16f
        for (i in 0 until state.player.lives) {
            val left = 16f + i * spacing
            canvas.drawOval(left, top, left + diameter, top + diameter, paint)
        }
    }

    // Day-night progress bar: bottom center
    private fun drawDayNightBar(canvas: Canvas, state: GameState) {
        val barWidth = 300f
        val barHeight = 20f
        val barLeft = (canvas.width - barWidth) / 2f
        val barTop = canvas.height - barHeight - 16f

        // Background
        paint.style = Paint.Style.FILL
        paint.color = 0xFF_333333.toInt()
        canvas.drawRect(barLeft, barTop, barLeft + barWidth, barTop + barHeight, paint)

        // Fill
        val progress = state.time.phaseProgress.coerceIn(0f, 1f)
        val fillWidth = barWidth * progress
        val fillColor = if (progress >= 0.8f) {
            // Pulse between amber and orange every 15 ticks
            if (state.time.tick % 30 < 15) 0xFF_FF4400.toInt() else 0xFF_FFAA00.toInt()
        } else {
            0xFF_FFAA00.toInt()
        }
        paint.color = fillColor
        canvas.drawRect(barLeft, barTop, barLeft + fillWidth, barTop + barHeight, paint)

        // Label text "DAY" centered above bar
        paint.color = 0xFF_FFFFFF.toInt()
        paint.textSize = 36f
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText("DAY", canvas.width / 2f, barTop - 4f, paint)
        paint.textAlign = Paint.Align.LEFT // reset
    }

    // Carried items: small squares at top-right
    private fun drawCarriedItems(canvas: Canvas, state: GameState) {
        paint.style = Paint.Style.FILL
        paint.color = 0xFF_FFDD44.toInt()
        val squareSize = 16f
        val spacing = 22f
        val top = 16f
        val count = state.player.inventory.size
        for (i in 0 until count) {
            val right = canvas.width - 16f - i * spacing
            val left = right - squareSize
            canvas.drawRect(left, top, right, top + squareSize, paint)
        }
    }

    // Cauldron request text: bottom-left
    private fun drawCauldronRequest(canvas: Canvas, state: GameState, content: GameContent) {
        val nextItem = content.cureSequence.sequence.getOrNull(state.cauldron.deliveredCount)
        val label = if (nextItem != null) "NEED: $nextItem" else "NEED: DONE"

        paint.style = Paint.Style.FILL
        paint.color = 0xFF_FFFFFF.toInt()
        paint.textSize = 28f
        paint.textAlign = Paint.Align.LEFT
        canvas.drawText(label, 16f, canvas.height - 48f, paint)
    }
}
