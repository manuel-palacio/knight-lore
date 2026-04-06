package com.palacesoft.knightlore.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MainMenuScreen(onNewGame: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0D0D1A)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(32.dp),
        ) {
            Text(
                text = "KNIGHT LORE",
                style = MaterialTheme.typography.headlineLarge,
                color = Color(0xFFD4C4A0),
                letterSpacing = 6.sp,
            )
            Text(
                text = "A Castle of Darkness Awaits",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF8899AA),
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onNewGame,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2A1F4A),
                    contentColor = Color(0xFFD4C4A0),
                ),
            ) {
                Text("NEW GAME", letterSpacing = 4.sp)
            }
        }
    }
}
