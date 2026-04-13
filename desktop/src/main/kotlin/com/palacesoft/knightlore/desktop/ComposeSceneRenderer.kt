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
// PaletteRole removed — authored sprites use fillColor: Int directly
import com.palacesoft.knightlore.render.scene.DrawCommand
import com.palacesoft.knightlore.render.scene.DrawPayload
import com.palacesoft.knightlore.render.scene.SILHOUETTE_TEST_MODE

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
                is DrawPayload.AuthoredSprite -> {
                    val sprite = payload.sprite
                    for (layer in sprite.layers) {
                        val color = if (SILHOUETTE_TEST_MODE) {
                            argbToComposeColor(0xFF_000000.toInt())
                        } else {
                            argbToComposeColor(layer.fillColor)
                        }
                        if (layer.points.size >= 3) {
                            val path = Path()
                            layer.points.forEachIndexed { i, pt ->
                                if (i == 0) path.moveTo(left + pt.x, top + pt.y)
                                else path.lineTo(left + pt.x, top + pt.y)
                            }
                            path.close()
                            scope.drawIntoCanvas { canvas ->
                                val paint = Paint().apply {
                                    isAntiAlias = false
                                    this.color = color
                                }
                                canvas.drawPath(path, paint)
                                // NO outlines on authored sprites — clean fills only
                            }
                        }
                    }
                }
                is DrawPayload.Sprite -> {
                    val img = SpriteCache.get(payload.sheetId)
                    if (img != null) {
                        // Inset source rect by 1px to prevent frame bleeding
                        val inset = 1
                        val sx = payload.srcX + inset
                        val sy = payload.srcY + inset
                        val sw = (payload.srcW - inset * 2).coerceAtLeast(1)
                        val sh = (payload.srcH - inset * 2).coerceAtLeast(1)
                        val dstW = sw * payload.scale
                        val dstH = sh * payload.scale
                        val dstLeft = if (payload.flipX) left + dstW else left
                        val dstTop = top

                        scope.drawIntoCanvas { canvas ->
                            if (payload.flipX) {
                                canvas.save()
                                canvas.scale(-1f, 1f)
                                canvas.translate(-dstLeft * 2f - dstW, 0f)
                            }
                            canvas.drawImageRect(
                                img,
                                srcOffset = androidx.compose.ui.unit.IntOffset(sx, sy),
                                srcSize = androidx.compose.ui.unit.IntSize(sw, sh),
                                dstOffset = androidx.compose.ui.unit.IntOffset(dstLeft.toInt(), dstTop.toInt()),
                                dstSize = androidx.compose.ui.unit.IntSize(dstW.toInt(), dstH.toInt()),
                                paint = Paint().apply {
                                    isAntiAlias = false
                                    filterQuality = androidx.compose.ui.graphics.FilterQuality.None
                                },
                            )
                            if (payload.flipX) canvas.restore()
                        }
                    }
                }
                is DrawPayload.TexturedPath -> {
                    val img = SpriteCache.get(payload.sheetId)
                    if (img != null && payload.points.size >= 4) {
                        val path = Path()
                        payload.points.forEachIndexed { i, pt ->
                            if (i == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
                        }
                        path.close()

                        // Points order: [bottomLeft, bottomRight, topRight, topLeft]
                        val bl = payload.points[0]
                        val br = payload.points[1]
                        val tl = payload.points[3]

                        // Affine transform: maps texture rect → wall parallelogram
                        // Bottom edge vector (how x maps to screen)
                        val bx = br.x - bl.x
                        val by = br.y - bl.y
                        // Left edge vector (how y maps to screen)
                        val lx = tl.x - bl.x
                        val ly = tl.y - bl.y

                        val texW = img.width.toFloat()
                        val texH = img.height.toFloat()

                        // Clip to wall shape, then draw texture with affine transform
                        scope.clipPath(path) {
                            drawIntoCanvas { canvas ->
                                canvas.save()
                                // Build 4×4 column-major affine matrix:
                                //   screen_x = (bx/texW)*px + (lx/texH)*py + bl.x
                                //   screen_y = (by/texW)*px + (ly/texH)*py + bl.y
                                val m = androidx.compose.ui.graphics.Matrix()
                                m.reset()
                                m.values[0]  = bx / texW   // scaleX
                                m.values[1]  = by / texW   // skewY
                                m.values[4]  = lx / texH   // skewX
                                m.values[5]  = ly / texH   // scaleY
                                m.values[12] = bl.x        // translateX
                                m.values[13] = bl.y        // translateY

                                canvas.concat(m)

                                val paint = Paint().apply {
                                    isAntiAlias = false
                                    filterQuality = androidx.compose.ui.graphics.FilterQuality.None
                                }
                                // Draw texture at its natural size — the transform maps it to the wall
                                canvas.drawImageRect(
                                    img,
                                    srcOffset = androidx.compose.ui.unit.IntOffset(0, 0),
                                    srcSize = androidx.compose.ui.unit.IntSize(img.width, img.height),
                                    dstOffset = androidx.compose.ui.unit.IntOffset(0, 0),
                                    dstSize = androidx.compose.ui.unit.IntSize(img.width, img.height),
                                    paint = paint,
                                )
                                canvas.restore()
                            }
                            // Optional tint overlay (in screen space)
                            val tint = payload.tintArgb
                            if (tint != null) {
                                val bounds = path.getBounds()
                                drawRect(
                                    argbToComposeColor(tint),
                                    Offset(bounds.left, bounds.top),
                                    Size(bounds.width, bounds.height),
                                )
                            }
                        }
                        // Outline
                        scope.drawIntoCanvas { canvas ->
                            canvas.drawPath(path, Paint().apply {
                                isAntiAlias = false
                                color = OUTLINE_COLOR
                                style = PaintingStyle.Stroke
                                strokeWidth = 1f
                            })
                        }
                    }
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

        // Vignette removed — it was showing as a visible semicircle behind walls
    }

    private fun argbToComposeColor(argb: Int): Color {
        val a = (argb ushr 24) and 0xFF
        val r = (argb ushr 16) and 0xFF
        val g = (argb ushr 8) and 0xFF
        val b = argb and 0xFF
        return Color(r, g, b, a)
    }
}
