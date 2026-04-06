package com.palacesoft.knightlore.desktop

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.palacesoft.knightlore.data.ContentRoomProvider
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.data.asset.DesktopAssetLoader
import com.palacesoft.knightlore.domain.DefaultGameEngine
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
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

private data class DesktopUiState(
    val showGameOver: Boolean = false,
    val showQuestComplete: Boolean = false,
)

@Composable
fun GameView() {
    var gameKey by remember { mutableStateOf(0) }
    var gameState by remember { mutableStateOf<GameState?>(null) }
    var content by remember { mutableStateOf<GameContent?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var uiState by remember { mutableStateOf(DesktopUiState()) }
    val keyboardMapper = remember { KeyboardInputMapper() }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(gameKey) {
        gameState = null
        error = null
        withContext(Dispatchers.IO) {
            try {
                val loader = DesktopAssetLoader()
                val repo = AssetContentRepository(loader)
                val loadedContent = repo.loadContent()
                withContext(Dispatchers.Main) { content = loadedContent }
                val roomProvider = ContentRoomProvider(loadedContent)
                val engine = DefaultGameEngine.create(roomProvider, loadedContent)
                var state = engine.initialize(System.currentTimeMillis(), loadedContent)
                gameState = state

                // Fixed-step accumulator — mirrors GameLoopCoordinator on Android
                val fixedStep = 1f / 60f
                val maxDelta = 0.5f
                var accumulator = 0f
                var lastFrameMs = System.currentTimeMillis()

                while (isActive) {
                    delay(4L)   // yield to OS; actual tick rate governed by accumulator
                    val nowMs = System.currentTimeMillis()
                    val delta = ((nowMs - lastFrameMs) / 1000f).coerceAtMost(maxDelta)
                    lastFrameMs = nowMs

                    accumulator += delta
                    val input = keyboardMapper.buildFrameInput()

                    while (accumulator >= fixedStep) {
                        val result = engine.update(state, input.copy(pausePressed = false), fixedStep)
                        state = result.state
                        accumulator -= fixedStep

                        // Handle events
                        for (event in result.events) {
                            withContext(Dispatchers.Main) {
                                uiState = when (event) {
                                    is GameEvent.GameOver       -> uiState.copy(showGameOver = true)
                                    is GameEvent.QuestCompleted -> uiState.copy(showQuestComplete = true)
                                    else -> uiState
                                }
                            }
                        }
                    }

                    withContext(Dispatchers.Main) { gameState = state }
                }
            } catch (e: CancellationException) {
                throw e   // let coroutine cancel normally
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    error = "Failed to load: ${e.message}\n${e.cause?.message ?: ""}"
                }
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
            },
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
            val loadedContent = content
            if (state != null && loadedContent != null) {
                DesktopGameRenderer(state = state, content = loadedContent)
            } else {
                Text(
                    text = "Loading...",
                    color = Color.White,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            // Game Over overlay
            if (uiState.showGameOver) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("GAME OVER", color = Color.Red, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(24.dp))
                        Button(onClick = { uiState = DesktopUiState(); gameKey++ }) {
                            Text("RESTART")
                        }
                    }
                }
            }

            // Quest Complete overlay
            if (uiState.showQuestComplete) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("QUEST COMPLETE!", color = Color(0xFFFFDD44), fontSize = 32.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(24.dp))
                        Button(onClick = { uiState = uiState.copy(showQuestComplete = false) }) {
                            Text("CONTINUE")
                        }
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}
