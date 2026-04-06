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

    fun render(canvas: Canvas, commands: List<DrawCommand>) {
        val paint = Paint().apply {
            style = Paint.Style.FILL
            isAntiAlias = false
        }
        for (command in commands) {
            val left = command.screenPos.x
            val top = command.screenPos.y
            when (val payload = command.payload) {
                is DrawPayload.ColorRect -> {
                    paint.style = Paint.Style.FILL
                    paint.isAntiAlias = false
                    paint.color = payload.colorArgb
                    canvas.drawRect(left, top, left + payload.widthPx, top + payload.heightPx, paint)
                    // Outline
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 2f
                    paint.color = 0xFF_0A0808.toInt()
                    canvas.drawRect(left, top, left + payload.widthPx, top + payload.heightPx, paint)
                    paint.style = Paint.Style.FILL
                }
                is DrawPayload.ColorOval -> {
                    paint.style = Paint.Style.FILL
                    paint.isAntiAlias = false
                    paint.color = payload.colorArgb
                    canvas.drawOval(left, top, left + payload.widthPx, top + payload.heightPx, paint)
                    // Outline
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 2f
                    paint.color = 0xFF_0A0808.toInt()
                    canvas.drawOval(left, top, left + payload.widthPx, top + payload.heightPx, paint)
                    paint.style = Paint.Style.FILL
                }
                is DrawPayload.ColorPath -> {
                    val path = android.graphics.Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    paint.style = Paint.Style.FILL
                    paint.isAntiAlias = false
                    paint.color = payload.colorArgb
                    canvas.drawPath(path, paint)
                    // Outline
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 2f
                    paint.color = 0xFF_0A0808.toInt()
                    canvas.drawPath(path, paint)
                    paint.style = Paint.Style.FILL
                }
                is DrawPayload.Line -> {
                    paint.color = payload.colorArgb
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = payload.strokeWidth
                    canvas.drawLine(payload.x1, payload.y1, payload.x2, payload.y2, paint)
                    paint.style = Paint.Style.FILL
                }
                is DrawPayload.ScreenFill -> {
                    paint.color = payload.colorArgb
                    paint.style = Paint.Style.FILL
                    canvas.drawRect(0f, 0f, canvas.width.toFloat(), canvas.height.toFloat(), paint)
                }
            }
        }

        // Scanline overlay — CRT retro effect
        paint.style = Paint.Style.FILL
        paint.isAntiAlias = false
        paint.color = 0x18_000000.toInt()  // ~10% alpha black
        var scanY = 0f
        while (scanY < canvas.height) {
            canvas.drawRect(0f, scanY, canvas.width.toFloat(), scanY + 1f, paint)
            scanY += 4f
        }
    }
}
