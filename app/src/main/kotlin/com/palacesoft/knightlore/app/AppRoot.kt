package com.palacesoft.knightlore.app

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.palacesoft.knightlore.app.input.TouchInputOverlay
import com.palacesoft.knightlore.app.input.TouchInputState
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.app.session.GameSessionViewModel
import com.palacesoft.knightlore.app.settings.GameSettings
import com.palacesoft.knightlore.app.settings.SettingsRepository
import com.palacesoft.knightlore.app.ui.MainMenuScreen
import com.palacesoft.knightlore.app.ui.SettingsScreen
import com.palacesoft.knightlore.debug.DebugOverlayRenderer
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.render.GameRenderView
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

@Composable
fun AppRoot(viewModel: GameSessionViewModel, settingsRepository: SettingsRepository) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()
    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            val hasSave by viewModel.hasSave.collectAsState()
            val currentSettings by settingsRepository.settings.collectAsState(initial = GameSettings())
            MainMenuScreen(
                hasSave = hasSave,
                onContinue = {
                    viewModel.continueGame()
                    navController.navigate("game")
                },
                onNewGame = {
                    viewModel.startNewGame(currentSettings.difficulty)
                    navController.navigate("game")
                },
                onSettings = {
                    navController.navigate("settings")
                },
            )
        }
        composable("game") {
            val currentSettings by settingsRepository.settings.collectAsState(initial = GameSettings())
            GameScreen(
                sessionCoordinator = viewModel.coordinator,
                viewModel = viewModel,
                navController = navController,
                debugOverlayEnabled = currentSettings.debugOverlayEnabled && BuildConfig.DEBUG,
            )
        }
        composable("settings") {
            val currentSettings by settingsRepository.settings.collectAsState(initial = GameSettings())
            SettingsScreen(
                settings = currentSettings,
                onSave = { updated -> scope.launch { settingsRepository.save(updated) } },
                onBack = { navController.popBackStack() },
            )
        }
    }
}

@Composable
fun GameScreen(
    sessionCoordinator: GameSessionCoordinator,
    viewModel: GameSessionViewModel,
    navController: NavHostController,
    debugOverlayEnabled: Boolean = false,
) {
    var loadState by remember { mutableStateOf<LoadState>(LoadState.Loading) }
    val touchInput = remember { TouchInputState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        // Poll until the coordinator's game state becomes available (set by the ViewModel).
        var attempts = 0
        while (sessionCoordinator.gameState == null && attempts < 200) {
            kotlinx.coroutines.delay(50)
            attempts++
        }
        loadState = sessionCoordinator.gameState?.let { LoadState.Ready(it) }
            ?: LoadState.Error("Failed to start game")
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        when (val state = loadState) {
            is LoadState.Loading -> CircularProgressIndicator(color = Color.White)
            is LoadState.Ready -> {
                val gameState by state.gameStateFlow.collectAsState()
                val uiState by sessionCoordinator.eventHandler.uiState.collectAsState()
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { context ->
                        GameRenderView(
                            context = context,
                            gameState = state.gameStateFlow,
                            content = sessionCoordinator.loadedContent!!,
                            onFrameAdvance = { deltaSeconds ->
                                val input = touchInput.buildFrameInput()
                                if (input.pausePressed) sessionCoordinator.eventHandler.togglePause()
                                touchInput.clearOneShotFlags()
                                if (!sessionCoordinator.eventHandler.uiState.value.isPaused) {
                                    sessionCoordinator.submitInput(input)
                                    sessionCoordinator.advance(deltaSeconds)
                                }
                            },
                        ).also { view ->
                            if (debugOverlayEnabled && BuildConfig.DEBUG) {
                                view.debugRenderer = DebugOverlayRenderer::render
                            }
                        }
                    },
                )
                GameHudOverlay(gameState = gameState)
                TouchInputOverlay(state = touchInput, modifier = Modifier.fillMaxSize())

                // Damage flash overlay
                if (uiState.damageFlashTicks > 0) {
                    val alpha = (uiState.damageFlashTicks / 12f).coerceIn(0f, 0.4f)
                    Box(modifier = Modifier.fillMaxSize().background(Color.Red.copy(alpha = alpha)))
                }

                // Transformation flash overlay — purple #8844CC at ~27% max alpha, fades over 20 frames
                if (uiState.transformFlashTicks > 0) {
                    val alpha = (uiState.transformFlashTicks / 20f) * (0x44 / 255f)
                    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF8844CC).copy(alpha = alpha)))
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
                            Button(onClick = {
                                sessionCoordinator.eventHandler.dismissGameOver()
                                // Restart in-place: fresh initialize + clear stale input
                                scope.launch {
                                    viewModel.startNewGame()
                                }
                            }) { Text("RESTART") }
                            Spacer(Modifier.height(12.dp))
                            Button(onClick = {
                                sessionCoordinator.eventHandler.dismissGameOver()
                                navController.navigate("menu") {
                                    popUpTo("menu") { inclusive = true }
                                }
                            }) { Text("MAIN MENU") }
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
                            Text(
                                "QUEST COMPLETE!",
                                color = Color(0xFFFFDD44),
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(24.dp))
                            Button(onClick = { sessionCoordinator.eventHandler.dismissQuestComplete() }) {
                                Text("CONTINUE")
                            }
                        }
                    }
                }

                // Pause overlay
                if (uiState.isPaused) {
                    Box(
                        modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.75f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("PAUSED", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(24.dp))
                            Button(onClick = { sessionCoordinator.eventHandler.resumeGame() }) {
                                Text("RESUME")
                            }
                            Spacer(Modifier.height(12.dp))
                            Button(onClick = {
                                sessionCoordinator.eventHandler.resumeGame()
                                viewModel.saveGame()
                                navController.navigate("menu") {
                                    popUpTo("menu") { inclusive = true }
                                }
                            }) {
                                Text("SAVE & QUIT")
                            }
                        }
                    }
                }
            }
            is LoadState.Error -> Text("Error: ${state.message}", color = Color.Red)
        }
    }
}

@Composable
private fun GameHudOverlay(gameState: GameState) {
    val textColor = Color.White
    val cornerTextSize = 13.sp
    val cornerWeight = FontWeight.Bold
    val shadowColor = Color.Black.copy(alpha = 0.8f)
    val showTransformWarning = gameState.player.form == Form.HUMAN &&
        gameState.time.ticksUntilTransform.let { it != null && it < 60 }

    Box(modifier = Modifier.fillMaxSize()) {
        // Top-left: lives as hearts
        Text(
            text = "♥".repeat(gameState.player.lives.coerceAtLeast(0)),
            color = Color(0xFFEE4444),
            fontSize = cornerTextSize,
            fontWeight = cornerWeight,
            modifier = Modifier
                .align(Alignment.TopStart)
                .background(shadowColor)
                .padding(horizontal = 8.dp, vertical = 4.dp),
        )

        // Top-right: day counter
        Text(
            text = "DAY ${gameState.time.dayIndex + 1} / 40",
            color = textColor,
            fontSize = cornerTextSize,
            fontWeight = cornerWeight,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .background(shadowColor)
                .padding(horizontal = 8.dp, vertical = 4.dp),
        )

        // Centre: transformation warning (flashing, brief)
        if (showTransformWarning) {
            val infiniteTransition = rememberInfiniteTransition(label = "transform_flash")
            val alpha by infiniteTransition.animateFloat(
                initialValue = 1f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis = 400),
                    repeatMode = RepeatMode.Reverse,
                ),
                label = "transform_alpha",
            )
            Text(
                text = "TRANSFORMING...",
                color = Color.Red.copy(alpha = alpha),
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(shadowColor)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            )
        }
    }
}

sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val gameStateFlow: StateFlow<GameState>) : LoadState
    data class Error(val message: String) : LoadState
}
