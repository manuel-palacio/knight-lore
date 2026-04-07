package com.palacesoft.knightlore.desktop

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.palacesoft.knightlore.domain.model.DayPhase
import com.palacesoft.knightlore.domain.model.Form
import com.palacesoft.knightlore.domain.model.GameState

@Composable
fun DesktopHud(state: GameState, modifier: Modifier = Modifier) {
    val hudBg = Color(0xAA000000)
    val white = Color.White
    val orange = Color(0xFFFF8800)
    val green = Color(0xFF44FF88)
    val red = Color(0xFFFF4400)
    val gray = Color(0xFF888888)

    Box(modifier = modifier) {
        // ── Top bar ──────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .background(hudBg)
                .align(Alignment.TopCenter)
                .padding(horizontal = 16.dp, vertical = 6.dp),
        ) {
            // Top-left: DAY + progress bar
            Column(modifier = Modifier.align(Alignment.CenterStart)) {
                Text(
                    text = "DAY ${state.time.dayIndex + 1}",
                    color = white,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(3.dp))
                // Progress bar
                Box(
                    modifier = Modifier
                        .width(120.dp)
                        .height(6.dp)
                        .background(Color(0xFF333344)),
                ) {
                    Box(
                        modifier = Modifier
                            .width((120 * state.time.phaseProgress).dp)
                            .height(6.dp)
                            .background(orange),
                    )
                }
            }

            // Top-center: night warning
            val warnPhase = state.time.phase
            val ticks = state.time.ticksUntilTransform
            if ((warnPhase == DayPhase.DUSK || warnPhase == DayPhase.DAWN) && ticks != null) {
                val infiniteTransition = rememberInfiniteTransition(label = "night_warn")
                val alpha by infiniteTransition.animateFloat(
                    initialValue = 1f,
                    targetValue = 0.3f,
                    animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
                    label = "warn_alpha",
                )
                Text(
                    text = "!! NIGHT FALLS IN ${ticks / 60}s",
                    color = orange.copy(alpha = alpha),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.Center),
                )
            }

            // Top-right: lives
            val livesSymbol = if (state.player.lives > 0) {
                "💀".repeat(state.player.lives.coerceAtMost(5))
            } else "—"
            Text(
                text = livesSymbol,
                color = red,
                fontSize = 18.sp,
                modifier = Modifier.align(Alignment.CenterEnd),
            )
        }

        // ── Bottom bar ───────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .background(hudBg)
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 6.dp),
        ) {
            // Bottom-left: cure progress + next item
            Column(modifier = Modifier.align(Alignment.CenterStart)) {
                Text(
                    text = "CURE: ${state.cauldron.deliveredCount}/14",
                    color = green,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                )
                val nextItem = state.cauldron.currentRequest?.name ?: "COMPLETE"
                Text(
                    text = "NEED: $nextItem",
                    color = gray,
                    fontSize = 11.sp,
                )
            }

            // Bottom-center: inventory items
            Row(
                modifier = Modifier.align(Alignment.Center),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                val inventory = state.player.inventory
                if (inventory.isEmpty()) {
                    Text(
                        text = "INVENTORY EMPTY",
                        color = gray,
                        fontSize = 11.sp,
                    )
                } else {
                    inventory.forEachIndexed { i, itemId ->
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF222233))
                                .padding(horizontal = 4.dp, vertical = 2.dp),
                        ) {
                            Text(
                                text = itemId.value.substringBefore("_").uppercase(),
                                color = white,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }

            // Bottom-right: form label
            val (formLabel, formColor) = when (state.player.form) {
                Form.HUMAN -> "HUMAN" to green
                Form.WEREWULF -> "WEREWULF" to red
            }
            Text(
                text = formLabel,
                color = formColor,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.CenterEnd),
            )
        }
    }
}
