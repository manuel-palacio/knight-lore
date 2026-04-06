package com.palacesoft.knightlore.render.hud

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import com.palacesoft.knightlore.domain.model.RoomTransitionState
import com.palacesoft.knightlore.domain.model.TransitionPhase

object TransitionRenderer {
    private val paint = Paint()

    fun render(canvas: Canvas, transition: RoomTransitionState?) {
        if (transition == null) return
        val alpha = when (transition.phase) {
            TransitionPhase.FADING_OUT -> 1f - (transition.ticksRemaining / 6f).coerceIn(0f, 1f)
            TransitionPhase.FADING_IN  -> (transition.ticksRemaining / 6f).coerceIn(0f, 1f)
        }
        if (alpha <= 0f) return
        paint.color = Color.argb((alpha * 255).toInt(), 0, 0, 0)
        canvas.drawRect(0f, 0f, canvas.width.toFloat(), canvas.height.toFloat(), paint)
    }
}
