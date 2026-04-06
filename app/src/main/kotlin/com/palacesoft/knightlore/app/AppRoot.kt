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
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.app.session.GameSessionViewModel
import com.palacesoft.knightlore.app.ui.MainMenuScreen
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.render.GameRenderView
import kotlinx.coroutines.flow.StateFlow

@Composable
fun AppRoot(viewModel: GameSessionViewModel) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            val hasSave by viewModel.hasSave.collectAsState()
            MainMenuScreen(
                hasSave = hasSave,
                onContinue = {
                    viewModel.continueGame()
                    navController.navigate("game")
                },
                onNewGame = {
                    viewModel.startNewGame()
                    navController.navigate("game")
                },
            )
        }
        composable("game") {
            GameScreen(sessionCoordinator = viewModel.coordinator, navController = navController)
        }
    }
}

@Composable
fun GameScreen(sessionCoordinator: GameSessionCoordinator, navController: NavHostController) {
    var loadState by remember { mutableStateOf<LoadState>(LoadState.Loading) }

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
                val ready = loadState as LoadState.Ready
                val gameState by ready.gameStateFlow.collectAsState()
                val uiState by sessionCoordinator.eventHandler.uiState.collectAsState()
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { context ->
                        GameRenderView(
                            context = context,
                            gameState = ready.gameStateFlow,
                            content = sessionCoordinator.loadedContent!!,
                            onFrameAdvance = { deltaSeconds -> sessionCoordinator.advance(deltaSeconds) },
                        )
                    },
                )
                GameHudOverlay(gameState = gameState)

                // Damage flash overlay
                if (uiState.damageFlashTicks > 0) {
                    val alpha = (uiState.damageFlashTicks / 12f).coerceIn(0f, 0.4f)
                    Box(modifier = Modifier.fillMaxSize().background(Color.Red.copy(alpha = alpha)))
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
            }
            is LoadState.Error -> Text("Error: ${state.message}", color = Color.Red)
        }
    }
}

@Composable
private fun GameHudOverlay(gameState: GameState) {
    val hudBarColor = Color.Black.copy(alpha = 0.55f)
    val textColor = Color.White
    val hudTextSize = 14.sp
    val hudFontWeight = FontWeight.Bold
    val showTransformWarning = gameState.time.ticksUntilTransform.let { it != null && it < 60 }

    Box(modifier = Modifier.fillMaxSize()) {
        // Top bar: day counter left + cure progress right
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopStart)
                .background(hudBarColor)
                .padding(horizontal = 12.dp, vertical = 6.dp),
        ) {
            Text(
                text = "DAY ${gameState.time.dayIndex + 1} / 40",
                color = textColor,
                fontSize = hudTextSize,
                fontWeight = hudFontWeight,
                modifier = Modifier.align(Alignment.CenterStart),
            )
            Text(
                text = "CURE ${gameState.cauldron.deliveredCount} / 14",
                color = textColor,
                fontSize = hudTextSize,
                fontWeight = hudFontWeight,
                modifier = Modifier.align(Alignment.CenterEnd),
            )
        }

        // Centre: transformation warning
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
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .background(hudBarColor)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    text = "TRANSFORMING...",
                    color = Color.Red.copy(alpha = alpha),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val gameStateFlow: StateFlow<GameState>) : LoadState
    data class Error(val message: String) : LoadState
}
