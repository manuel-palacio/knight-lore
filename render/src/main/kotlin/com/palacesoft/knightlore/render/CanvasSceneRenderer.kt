package com.palacesoft.knightlore.render

import android.graphics.Canvas
import android.graphics.Paint
import com.palacesoft.knightlore.render.scene.DrawCommand
import com.palacesoft.knightlore.render.scene.DrawPayload

/**
 * Executes a list of DrawCommands onto an Android Canvas.
 * The command list is assumed to be pre-sorted by RoomEntityFactory.
 */
object CanvasSceneRenderer {

    private val paint = Paint().apply {
        style = Paint.Style.FILL
        isAntiAlias = false
    }

    fun render(canvas: Canvas, commands: List<DrawCommand>) {
        for (command in commands) {
            val left = command.screenPos.x
            val top = command.screenPos.y
            when (val payload = command.payload) {
                is DrawPayload.ColorRect -> {
                    paint.color = payload.colorArgb
                    canvas.drawRect(
                        left,
                        top,
                        left + payload.widthPx,
                        top + payload.heightPx,
                        paint,
                    )
                }
                is DrawPayload.ColorOval -> {
                    paint.color = payload.colorArgb
                    canvas.drawOval(
                        left,
                        top,
                        left + payload.widthPx,
                        top + payload.heightPx,
                        paint,
                    )
                }
            }
        }
    }
}
