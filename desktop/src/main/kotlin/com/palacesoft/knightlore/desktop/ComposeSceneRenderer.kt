package com.palacesoft.knightlore.desktop

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import com.palacesoft.knightlore.render.scene.DrawCommand
import com.palacesoft.knightlore.render.scene.DrawPayload

object ComposeSceneRenderer {
    fun render(scope: DrawScope, commands: List<DrawCommand>) {
        for (command in commands) {
            val left = command.screenPos.x
            val top = command.screenPos.y
            when (val payload = command.payload) {
                is DrawPayload.ColorRect -> {
                    scope.drawRect(
                        color = argbToComposeColor(payload.colorArgb),
                        topLeft = Offset(left, top),
                        size = Size(payload.widthPx, payload.heightPx),
                    )
                }
                is DrawPayload.ColorOval -> {
                    scope.drawOval(
                        color = argbToComposeColor(payload.colorArgb),
                        topLeft = Offset(left, top),
                        size = Size(payload.widthPx, payload.heightPx),
                    )
                }
                is DrawPayload.ColorPath -> {
                    if (payload.points.isEmpty()) continue
                    val path = androidx.compose.ui.graphics.Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    scope.drawPath(path, argbToComposeColor(payload.colorArgb))
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
                    // Desktop: approximate dither with a midpoint color blend (no BitmapShader available)
                    if (payload.points.isEmpty()) continue
                    val path = androidx.compose.ui.graphics.Path()
                    payload.points.forEachIndexed { i, pt ->
                        if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                    }
                    path.close()
                    val a1 = (payload.color1 ushr 24) and 0xFF
                    val r1 = (payload.color1 ushr 16) and 0xFF; val r2 = (payload.color2 ushr 16) and 0xFF
                    val g1 = (payload.color1 ushr 8) and 0xFF;  val g2 = (payload.color2 ushr 8) and 0xFF
                    val b1 = payload.color1 and 0xFF;           val b2 = payload.color2 and 0xFF
                    scope.drawPath(path, Color((r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2, a1))
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
    }

    private fun argbToComposeColor(argb: Int): Color {
        val a = (argb ushr 24) and 0xFF
        val r = (argb ushr 16) and 0xFF
        val g = (argb ushr 8) and 0xFF
        val b = argb and 0xFF
        return Color(r, g, b, a)
    }
}
