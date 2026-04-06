package com.palacesoft.knightlore.desktop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.focusable
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.data.asset.DesktopAssetLoader
import com.palacesoft.knightlore.domain.DefaultGameEngine
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.data.ContentRoomProvider
import kotlinx.coroutines.*

fun main() = application {
    val windowState = rememberWindowState(size = DpSize(1280.dp, 800.dp))
    Window(
        onCloseRequest = ::exitApplication,
        title = "Knight Lore",
        state = windowState,
    ) {
        GameView()
    }
}

@Composable
fun GameView() {
    var gameState by remember { mutableStateOf<GameState?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val keyboardMapper = remember { KeyboardInputMapper() }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            try {
                val loader = DesktopAssetLoader()
                val repo = AssetContentRepository(loader)
                val content = repo.loadContent()
                val roomProvider = ContentRoomProvider(content)
                val engine = DefaultGameEngine.create(roomProvider, content)
                var state = engine.initialize(System.currentTimeMillis(), content)
                gameState = state

                val tickDelta = 1f / 60f
                while (true) {
                    delay(16L)
                    val input = keyboardMapper.buildFrameInput()
                    val result = engine.update(state, input, tickDelta)
                    state = result.state
                    gameState = state
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    error = "Failed to load: ${e.message}\n${e.cause?.message ?: ""}"
                }
                return@withContext
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focusRequester)
            .focusable()
            .onKeyEvent { event ->
                keyboardMapper.onKeyEvent(event)
                true
            }
    ) {
        val err = error
        if (err != null) {
            Text(
                text = err,
                color = Color.Red,
                modifier = Modifier.align(Alignment.Center).padding(24.dp),
            )
        } else {
            val state = gameState
            if (state != null) {
                DesktopGameRenderer(state = state)
            } else {
                Text(
                    text = "Loading...",
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}
