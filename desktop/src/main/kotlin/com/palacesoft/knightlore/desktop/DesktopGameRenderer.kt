package com.palacesoft.knightlore.desktop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.withTransform
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.render.iso.IsoProjector
import com.palacesoft.knightlore.render.scene.DrawCommandBuilder
import com.palacesoft.knightlore.render.scene.DrawLayer
import com.palacesoft.knightlore.render.scene.RoomEntityFactory

@Composable
fun DesktopGameRenderer(state: GameState, content: GameContent) {
    Box(modifier = Modifier.fillMaxSize()) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val commands = RoomEntityFactory.build(state, content, size.width, size.height)
            val sorted = DrawCommandBuilder.sort(commands)
            // Compute player screen position for vignette centering
            val room = content.rooms[state.currentRoomId]
            val playerScreenPos = room?.let {
                val roomOffset = IsoProjector.roomOffset(it.width, it.depth, size.width, size.height)
                val s = IsoProjector.toScreen(state.player.position)
                Offset(s.x + roomOffset.x, s.y + roomOffset.y)
            }
            // Scene commands rendered at 2× scale
            val sceneCommands = sorted.filter { it.layer != DrawLayer.HUD }
            val hudCommands   = sorted.filter { it.layer == DrawLayer.HUD }
            withTransform({
                scale(2f, 2f, Offset(size.width / 2f, size.height / 2f))
            }) {
                ComposeSceneRenderer.render(this, sceneCommands, playerScreenPos)
            }
            // HUD commands rendered at native resolution (no scale)
            ComposeSceneRenderer.render(this, hudCommands, playerScreenPos)
        }
        // Compose HUD overlay at native resolution
        DesktopHud(state = state, modifier = Modifier.fillMaxSize())
    }
}
