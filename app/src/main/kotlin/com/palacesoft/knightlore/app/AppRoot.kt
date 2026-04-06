package com.palacesoft.knightlore.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.app.ui.MainMenuScreen
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.render.GameRenderView

@Composable
fun AppRoot(sessionCoordinator: GameSessionCoordinator) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            MainMenuScreen(onNewGame = { navController.navigate("game") })
        }
        composable("game") {
            GameScreen(sessionCoordinator = sessionCoordinator)
        }
    }
}

@Composable
fun GameScreen(sessionCoordinator: GameSessionCoordinator) {
    var loadState by remember { mutableStateOf<LoadState>(LoadState.Loading) }

    LaunchedEffect(Unit) {
        loadState = try {
            sessionCoordinator.startNewGame()
            val content = sessionCoordinator.loadedContent!!
            LoadState.Ready(content)
        } catch (e: Exception) {
            LoadState.Error(e.message ?: "Unknown error")
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        when (val state = loadState) {
            is LoadState.Loading -> CircularProgressIndicator(color = Color.White)
            is LoadState.Ready -> {
                val gameStateFlow = sessionCoordinator.gameState!!
                val content: GameContent = state.content
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { context ->
                        GameRenderView(
                            context = context,
                            gameState = gameStateFlow,
                            content = content,
                            onFrameAdvance = { deltaSeconds -> sessionCoordinator.advance(deltaSeconds) },
                        )
                    },
                )
            }
            is LoadState.Error -> Text("Error: ${state.message}", color = Color.Red)
        }
    }
}

sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val content: GameContent) : LoadState
    data class Error(val message: String) : LoadState
}
