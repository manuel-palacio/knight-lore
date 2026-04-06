package com.palacesoft.knightlore.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.palacesoft.knightlore.app.ui.MainMenuScreen
import com.palacesoft.knightlore.data.asset.ContentRepository

@Composable
fun AppRoot(contentRepository: ContentRepository) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            MainMenuScreen(
                onNewGame = { navController.navigate("game") }
            )
        }
        composable("game") {
            GameScreenPlaceholder()
        }
    }
}

@Composable
fun GameScreenPlaceholder() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Text("Loading game...", color = Color.White)
    }
}
