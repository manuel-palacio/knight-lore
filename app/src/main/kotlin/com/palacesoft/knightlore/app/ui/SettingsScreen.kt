package com.palacesoft.knightlore.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.palacesoft.knightlore.app.BuildConfig
import com.palacesoft.knightlore.app.settings.Difficulty
import com.palacesoft.knightlore.app.settings.GameSettings

@Composable
fun SettingsScreen(
    settings: GameSettings,
    onSave: (GameSettings) -> Unit,
    onBack: () -> Unit,
) {
    var current by remember(settings) { mutableStateOf(settings) }

    fun update(updated: GameSettings) {
        current = updated
        onSave(updated)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0D0D1A)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .padding(vertical = 32.dp),
        ) {
            Text(
                text = "SETTINGS",
                style = MaterialTheme.typography.headlineLarge,
                color = Color(0xFFD4C4A0),
                letterSpacing = 6.sp,
            )

            Spacer(Modifier.height(8.dp))

            // Audio toggle row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Audio",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color(0xFFD4C4A0),
                )
                Switch(
                    checked = current.audioEnabled,
                    onCheckedChange = { update(current.copy(audioEnabled = it)) },
                )
            }

            // Difficulty selector
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = "Difficulty",
                    style = MaterialTheme.typography.bodyLarge,
                    color = Color(0xFFD4C4A0),
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Difficulty.entries.forEach { difficulty ->
                        val isSelected = current.difficulty == difficulty
                        Button(
                            onClick = { update(current.copy(difficulty = difficulty)) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isSelected) Color(0xFF5A3FA0) else Color(0xFF2A1F4A),
                                contentColor = Color(0xFFD4C4A0),
                            ),
                        ) {
                            Text(difficulty.name, letterSpacing = 2.sp)
                        }
                    }
                }
            }

            // Debug Overlay toggle (only in debug builds)
            if (BuildConfig.DEBUG) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "Debug Overlay",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color(0xFFD4C4A0),
                    )
                    Switch(
                        checked = current.debugOverlayEnabled,
                        onCheckedChange = { update(current.copy(debugOverlayEnabled = it)) },
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Back button
            Button(
                onClick = onBack,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2A1F4A),
                    contentColor = Color(0xFFD4C4A0),
                ),
                modifier = Modifier.fillMaxWidth(0.6f),
            ) {
                Text("BACK", letterSpacing = 4.sp)
            }
        }
    }
}
