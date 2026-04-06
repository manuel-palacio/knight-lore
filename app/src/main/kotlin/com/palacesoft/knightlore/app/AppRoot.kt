package com.palacesoft.knightlore.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.text.style.TextAlign
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.app.ui.MainMenuScreen

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
            LoadState.Ready
        } catch (e: Exception) {
            LoadState.Error(e.message ?: "Unknown error")
        }
    }

    // Collect game state
    val gameState = sessionCoordinator.gameState?.collectAsState()?.value

    Box(
        modifier = Modifier.fillMaxSize().background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        when (loadState) {
            is LoadState.Loading -> CircularProgressIndicator(color = Color.White)
            is LoadState.Ready -> Text(
                text = "Room: ${gameState?.currentRoomId?.value ?: "..."}\nLives: ${gameState?.player?.lives ?: 0}",
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            is LoadState.Error -> Text("Error: ${(loadState as LoadState.Error).message}", color = Color.Red)
        }
    }
}

sealed interface LoadState {
    data object Loading : LoadState
    data object Ready : LoadState
    data class Error(val message: String) : LoadState
}
