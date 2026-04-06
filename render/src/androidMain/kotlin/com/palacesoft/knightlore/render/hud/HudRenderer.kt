package com.palacesoft.knightlore.render.hud

import android.graphics.Canvas
import android.graphics.Paint
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.TransformPhase

/**
 * Renders the HUD overlay onto the canvas in screen-space.
 * Drawn after the scene commands.
 */
object HudRenderer {

    fun render(canvas: Canvas, state: GameState, content: GameContent) {
        val paint = Paint().apply { style = Paint.Style.FILL }
        drawFormIndicator(canvas, state, paint)
        drawCarriedItems(canvas, state, paint)
        drawCauldronRequest(canvas, state, content, paint)
    }

    // Form indicator: bottom-center, only shown during active transformation/recovery
    private fun drawFormIndicator(canvas: Canvas, state: GameState, paint: Paint) {
        val phase = state.player.transformState.phase
        if (phase == TransformPhase.STABLE) return

        val label = when (phase) {
            TransformPhase.TRANSFORMING_TO_WEREWULF -> "TRANSFORMING → WEREWULF"
            TransformPhase.TRANSFORMING_TO_HUMAN -> "TRANSFORMING → HUMAN"
            TransformPhase.RECOVERING -> "RECOVERING"
            TransformPhase.STABLE -> return
        }
        val color = when (phase) {
            TransformPhase.TRANSFORMING_TO_WEREWULF -> 0xFF_8844CC.toInt()
            TransformPhase.TRANSFORMING_TO_HUMAN    -> 0xFF_44BB88.toInt()
            TransformPhase.RECOVERING               -> 0xFF_FFAA44.toInt()
            TransformPhase.STABLE                   -> 0xFF_FFFFFF.toInt()
        }

        paint.style = Paint.Style.FILL
        paint.color = color
        paint.textSize = 18f
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText(label, canvas.width / 2f, canvas.height - 60f, paint)
    }

    // Carried items: small squares at top-right
    private fun drawCarriedItems(canvas: Canvas, state: GameState, paint: Paint) {
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
    private fun drawCauldronRequest(canvas: Canvas, state: GameState, content: GameContent, paint: Paint) {
        val nextItem = content.cureSequence.sequence.getOrNull(state.cauldron.deliveredCount)
        val label = if (nextItem != null) "NEED: $nextItem" else "DONE"

        paint.style = Paint.Style.FILL
        paint.color = 0xFF_FFFFFF.toInt()
        paint.textSize = 28f
        paint.textAlign = Paint.Align.LEFT
        canvas.drawText(label, 16f, canvas.height - 48f, paint)
    }
}
