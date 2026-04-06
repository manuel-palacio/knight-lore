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
