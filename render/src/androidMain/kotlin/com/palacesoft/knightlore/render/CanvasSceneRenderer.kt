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
                    // Inner shadow border (clip to shape so only inward half of stroke shows)
                    if (payload.shadowColorArgb != null) {
                        canvas.save()
                        canvas.clipPath(path)
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 6f  // 3px visible inside after clip
                        paint.color = payload.shadowColorArgb
                        canvas.drawPath(path, paint)
                        canvas.restore()
                    }
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
                is DrawPayload.DitheredPath -> {
                    val path = android.graphics.Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    val tile = if (payload.horizontal) {
                        // 1×4 bitmap: 2px color1 rows then 2px color2 rows
                        android.graphics.Bitmap.createBitmap(1, 4, android.graphics.Bitmap.Config.ARGB_8888).also {
                            it.setPixel(0, 0, payload.color1)
                            it.setPixel(0, 1, payload.color1)
                            it.setPixel(0, 2, payload.color2)
                            it.setPixel(0, 3, payload.color2)
                        }
                    } else {
                        // 2×2 checkerboard
                        android.graphics.Bitmap.createBitmap(2, 2, android.graphics.Bitmap.Config.ARGB_8888).also {
                            it.setPixel(0, 0, payload.color1)
                            it.setPixel(1, 1, payload.color1)
                            it.setPixel(0, 1, payload.color2)
                            it.setPixel(1, 0, payload.color2)
                        }
                    }
                    val shader = android.graphics.BitmapShader(
                        tile,
                        android.graphics.Shader.TileMode.REPEAT,
                        android.graphics.Shader.TileMode.REPEAT,
                    )
                    paint.shader = shader
                    paint.style = Paint.Style.FILL
                    paint.isAntiAlias = false
                    canvas.drawPath(path, paint)
                    paint.shader = null
                    // Outline
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 2f
                    paint.color = 0xFF_0A0808.toInt()
                    canvas.drawPath(path, paint)
                    paint.style = Paint.Style.FILL
                }
                is DrawPayload.ScreenFill -> {
                    paint.color = payload.colorArgb
                    paint.style = Paint.Style.FILL
                    canvas.drawRect(0f, 0f, canvas.width.toFloat(), canvas.height.toFloat(), paint)
                }
                is DrawPayload.AuthoredSprite -> {
                    val sprite = payload.sprite
                    for (layer in sprite.layers) {
                        paint.color = if (com.palacesoft.knightlore.render.scene.SILHOUETTE_TEST_MODE)
                            0xFF_000000.toInt() else layer.fillColor
                        paint.style = Paint.Style.FILL
                        if (layer.points.size >= 3) {
                            path.reset()
                            layer.points.forEachIndexed { i, pt ->
                                if (i == 0) path.moveTo(left + pt.x, top + pt.y)
                                else path.lineTo(left + pt.x, top + pt.y)
                            }
                            path.close()
                            canvas.drawPath(path, paint)
                        }
                    }
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
