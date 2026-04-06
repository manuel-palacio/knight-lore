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
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.palacesoft.knightlore.app.ui.MainMenuScreen
import com.palacesoft.knightlore.data.asset.ContentRepository
import com.palacesoft.knightlore.domain.model.GameContent

@Composable
fun AppRoot(contentRepository: ContentRepository) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            MainMenuScreen(onNewGame = { navController.navigate("game") })
        }
        composable("game") {
            GameScreen(contentRepository = contentRepository)
        }
    }
}

@Composable
fun GameScreen(contentRepository: ContentRepository) {
    var loadState by remember { mutableStateOf<LoadState>(LoadState.Loading) }

    LaunchedEffect(Unit) {
        loadState = try {
            val content = contentRepository.loadContent()
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
            is LoadState.Ready -> Text(
                "Content loaded: ${state.content.rooms.size} rooms",
                color = Color.White,
            )
            is LoadState.Error -> Text("Error: ${state.message}", color = Color.Red)
        }
    }
}

sealed interface LoadState {
    data object Loading : LoadState
    data class Ready(val content: GameContent) : LoadState
    data class Error(val message: String) : LoadState
}
