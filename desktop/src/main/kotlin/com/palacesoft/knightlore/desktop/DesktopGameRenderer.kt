package com.palacesoft.knightlore.desktop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import com.palacesoft.knightlore.core.geometry.TileMetrics
import com.palacesoft.knightlore.core.math.Vec3f
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.ItemLocation

/** Compose Desktop renderer using DrawScope — mirrors CanvasSceneRenderer logic but uses Compose APIs. */
@Composable
fun DesktopGameRenderer(state: GameState) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val vpW = size.width
        val vpH = size.height

        fun toScreenX(x: Float, y: Float) = (x - y) * TileMetrics.HALF_TILE_WIDTH
        fun toScreenY(x: Float, y: Float, z: Float) = (x + y) * TileMetrics.HALF_TILE_HEIGHT - z * TileMetrics.BLOCK_HEIGHT

        // Room offset centering (approximate: center of 8x8 room)
        val centerSx = toScreenX(4f, 4f)
        val centerSy = toScreenY(4f, 4f, 0f)
        val offsetX = vpW / 2f - centerSx
        val offsetY = vpH / 2f - centerSy

        fun screenPos(world: Vec3f): Offset = Offset(
            x = toScreenX(world.x, world.y) + offsetX,
            y = toScreenY(world.x, world.y, world.z) + offsetY,
        )

        // Draw player
        val playerColor = if (state.player.form == Form.HUMAN) {
            Color(0x44, 0xBB, 0x88)
        } else {
            Color(0x88, 0x44, 0xCC)
        }
        val playerPos = screenPos(state.player.position)
        drawRect(
            color = playerColor,
            topLeft = playerPos,
            size = Size(32f, 64f),
        )

        // Draw items in current room
        state.itemInstances.forEach { item ->
            val loc = item.location as? ItemLocation.InRoom ?: return@forEach
            if (loc.roomId != state.currentRoomId) return@forEach
            val pos = screenPos(loc.position)
            drawOval(
                color = Color(0xFF, 0xDD, 0x44),
                topLeft = pos,
                size = Size(24f, 16f),
            )
        }

        // Draw actors
        state.actorStates.forEach { actor ->
            val pos = screenPos(actor.position)
            drawRect(
                color = Color(0xFF, 0x66, 0x44),
                topLeft = pos,
                size = Size(32f, 48f),
            )
        }

        // HUD: lives
        repeat(state.player.lives) { i ->
            drawCircle(
                color = Color(0xEE, 0x44, 0x44),
                radius = 10f,
                center = Offset(28f + i * 28f, 28f),
            )
        }

        // HUD: day progress bar
        val barW = 300f
        val barH = 20f
        val barX = vpW / 2f - barW / 2f
        val barY = vpH - 36f
        drawRect(Color(0x33, 0x33, 0x33), topLeft = Offset(barX, barY), size = Size(barW, barH))
        val progress = state.time.phaseProgress
        val barColor = if (progress >= 0.8f && state.time.tick % 30 < 15) {
            Color(0xFF, 0x44, 0x00)
        } else {
            Color(0xFF, 0xAA, 0x00)
        }
        drawRect(barColor, topLeft = Offset(barX, barY), size = Size(barW * progress, barH))
    }
}
