package com.palacesoft.knightlore.desktop

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PaintingStyle
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import com.palacesoft.knightlore.render.scene.DrawCommand
import com.palacesoft.knightlore.render.scene.DrawPayload

object ComposeSceneRenderer {

    private val OUTLINE_COLOR = Color(0x0A, 0x08, 0x08)

    fun render(scope: DrawScope, commands: List<DrawCommand>, playerScreenPos: Offset? = null) {
        for (command in commands) {
            val left = command.screenPos.x
            val top = command.screenPos.y
            when (val payload = command.payload) {
                is DrawPayload.ColorRect -> {
                    val rect = Rect(left, top, left + payload.widthPx, top + payload.heightPx)
                    scope.drawIntoCanvas { canvas ->
                        val paint = Paint().apply { isAntiAlias = false; color = argbToComposeColor(payload.colorArgb) }
                        canvas.drawRect(rect, paint)
                        paint.color = OUTLINE_COLOR
                        paint.style = PaintingStyle.Stroke
                        paint.strokeWidth = 2f
                        canvas.drawRect(rect, paint)
                    }
                }
                is DrawPayload.ColorOval -> {
                    val rect = Rect(left, top, left + payload.widthPx, top + payload.heightPx)
                    scope.drawIntoCanvas { canvas ->
                        val paint = Paint().apply { isAntiAlias = false; color = argbToComposeColor(payload.colorArgb) }
                        canvas.drawOval(rect, paint)
                        paint.color = OUTLINE_COLOR
                        paint.style = PaintingStyle.Stroke
                        paint.strokeWidth = 2f
                        canvas.drawOval(rect, paint)
                    }
                }
                is DrawPayload.ColorPath -> {
                    if (payload.points.isEmpty()) continue
                    val path = Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    scope.drawIntoCanvas { canvas ->
                        val paint = Paint().apply { isAntiAlias = false; color = argbToComposeColor(payload.colorArgb) }
                        canvas.drawPath(path, paint)
                        // Inner shadow border
                        val shadowArgb = payload.shadowColorArgb
                        if (shadowArgb != null) {
                            paint.color = argbToComposeColor(shadowArgb)
                            paint.style = PaintingStyle.Stroke
                            paint.strokeWidth = 3f
                            canvas.drawPath(path, paint)
                        }
                        // Comic-book outline
                        paint.color = OUTLINE_COLOR
                        paint.style = PaintingStyle.Stroke
                        paint.strokeWidth = 2f
                        canvas.drawPath(path, paint)
                    }
                }
                is DrawPayload.Line -> {
                    scope.drawLine(
                        color = argbToComposeColor(payload.colorArgb),
                        start = Offset(payload.x1, payload.y1),
                        end = Offset(payload.x2, payload.y2),
                        strokeWidth = payload.strokeWidth,
                    )
                }
                is DrawPayload.DitheredPath -> {
                    if (payload.points.isEmpty()) continue
                    val path = Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    val c1 = argbToComposeColor(payload.color1)
                    val c2 = argbToComposeColor(payload.color2)
                    // Base fill
                    scope.drawIntoCanvas { canvas ->
                        canvas.drawPath(path, Paint().apply { isAntiAlias = false; color = c1 })
                    }
                    // Dither overlay clipped to shape
                    val bounds = path.getBounds()
                    scope.clipPath(path) {
                        if (payload.horizontal) {
                            // 2px rows of color2, starting at row 2 (interleaved with color1 base)
                            var y = bounds.top + 2f
                            while (y < bounds.bottom) {
                                drawRect(c2, Offset(bounds.left, y), Size(bounds.width, 2f))
                                y += 4f
                            }
                        } else {
                            // 2×2 checkerboard: alternate column offset so odd cols shift down 2px
                            var col = 0
                            var x = bounds.left
                            while (x < bounds.right) {
                                val yOffset = if (col % 2 == 0) 0f else 2f
                                var y = bounds.top + yOffset
                                while (y < bounds.bottom) {
                                    drawRect(c2, Offset(x, y), Size(2f, 2f))
                                    y += 4f
                                }
                                x += 2f
                                col++
                            }
                        }
                    }
                    // Outline
                    scope.drawIntoCanvas { canvas ->
                        canvas.drawPath(path, Paint().apply {
                            isAntiAlias = false
                            color = OUTLINE_COLOR
                            style = PaintingStyle.Stroke
                            strokeWidth = 2f
                        })
                    }
                }
                is DrawPayload.ScreenFill -> {
                    scope.drawRect(
                        color = argbToComposeColor(payload.colorArgb),
                        topLeft = Offset.Zero,
                        size = scope.size,
                    )
                }
            }
        }

        // CRT scanline overlay — horizontal lines every 4px at 10% alpha
        var scanY = 0f
        while (scanY < scope.size.height) {
            scope.drawLine(
                color = Color(0f, 0f, 0f, 0.1f),
                start = Offset(0f, scanY),
                end = Offset(scope.size.width, scanY),
                strokeWidth = 1f,
            )
            scanY += 4f
        }

        // Vignette — radial gradient dark at edges, transparent at center
        val center = playerScreenPos ?: Offset(scope.size.width / 2f, scope.size.height / 2f)
        val radius = minOf(scope.size.width, scope.size.height) * 0.7f
        scope.drawRect(
            brush = Brush.radialGradient(
                colors = listOf(Color.Transparent, Color(0f, 0f, 0f, 0.7f)),
                center = center,
                radius = radius,
            ),
            topLeft = Offset.Zero,
            size = scope.size,
        )
    }

    private fun argbToComposeColor(argb: Int): Color {
        val a = (argb ushr 24) and 0xFF
        val r = (argb ushr 16) and 0xFF
        val g = (argb ushr 8) and 0xFF
        val b = argb and 0xFF
        return Color(r, g, b, a)
    }
}
