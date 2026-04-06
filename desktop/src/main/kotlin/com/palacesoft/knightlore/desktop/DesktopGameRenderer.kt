package com.palacesoft.knightlore.desktop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.render.scene.DrawCommandBuilder
import com.palacesoft.knightlore.render.scene.RoomEntityFactory

@Composable
fun DesktopGameRenderer(state: GameState, content: GameContent) {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val commands = RoomEntityFactory.build(state, content, size.width, size.height)
        val sorted = DrawCommandBuilder.sort(commands)
        ComposeSceneRenderer.render(this, sorted)
    }
}
