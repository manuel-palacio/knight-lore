package com.palacesoft.knightlore.app.input

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun TouchInputOverlay(
    state: TouchInputState,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val stickMaxRadiusPx = with(density) { state.stickMaxRadius.dp.toPx() }
    state.stickMaxRadiusPx = stickMaxRadiusPx

    // Track joystick visual position for recomposition
    var joystickCenter by remember { mutableStateOf(Offset.Zero) }
    var joystickThumb by remember { mutableStateOf(Offset.Zero) }
    var joystickVisible by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        // Left half: virtual joystick area
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            // Only handle touches in left half
                            event.changes.forEach { change ->
                                val pos = change.position
                                val isLeftHalf = pos.x < size.width / 2f
                                val pointerId = change.id.value

                                when (event.type) {
                                    PointerEventType.Press -> {
                                        if (isLeftHalf && state.stickPointerId == -1L) {
                                            state.stickCenter = pos
                                            state.stickCurrent = pos
                                            state.stickActive = true
                                            state.stickPointerId = pointerId
                                            joystickCenter = pos
                                            joystickThumb = pos
                                            joystickVisible = true
                                            change.consume()
                                        }
                                    }
                                    PointerEventType.Move -> {
                                        if (pointerId == state.stickPointerId) {
                                            // Clamp thumb within maxRadius
                                            val dx = pos.x - state.stickCenter.x
                                            val dy = pos.y - state.stickCenter.y
                                            val dist = Math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()
                                            val clamped = if (dist > stickMaxRadiusPx) {
                                                val ratio = stickMaxRadiusPx / dist
                                                Offset(
                                                    state.stickCenter.x + dx * ratio,
                                                    state.stickCenter.y + dy * ratio
                                                )
                                            } else {
                                                pos
                                            }
                                            state.stickCurrent = clamped
                                            joystickThumb = clamped
                                            change.consume()
                                        }
                                    }
                                    PointerEventType.Release -> {
                                        if (pointerId == state.stickPointerId) {
                                            state.stickActive = false
                                            state.stickCurrent = state.stickCenter
                                            state.stickPointerId = -1L
                                            joystickVisible = false
                                            change.consume()
                                        }
                                    }
                                    else -> {}
                                }
                            }
                        }
                    }
                },
        )

        // Draw joystick canvas overlay (left side)
        Canvas(modifier = Modifier.fillMaxSize()) {
            if (joystickVisible) {
                // Outer ring
                drawCircle(
                    color = Color.White.copy(alpha = 0.25f),
                    radius = stickMaxRadiusPx,
                    center = joystickCenter,
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3f),
                )
                // Inner filled base
                drawCircle(
                    color = Color.White.copy(alpha = 0.10f),
                    radius = stickMaxRadiusPx,
                    center = joystickCenter,
                )
                // Thumb dot
                drawCircle(
                    color = Color.White.copy(alpha = 0.60f),
                    radius = stickMaxRadiusPx * 0.35f,
                    center = joystickThumb,
                )
            }
        }

        // Right side: action buttons in diamond layout
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 32.dp, bottom = 40.dp),
        ) {
            val buttonSize = 52.dp
            val buttonOffset = 56.dp

            // Jump button (Top)
            ActionButton(
                label = "A",
                color = Color(0xFF4CAF50),
                modifier = Modifier
                    .offset(x = 0.dp, y = -buttonOffset)
                    .size(buttonSize),
                onPress = {
                    state.jumpPressed = true
                    state.jumpHeld = true
                },
                onRelease = {
                    state.jumpHeld = false
                },
            )

            // Action/Pickup button (Right)
            ActionButton(
                label = "B",
                color = Color(0xFF2196F3),
                modifier = Modifier
                    .offset(x = buttonOffset, y = 0.dp)
                    .size(buttonSize),
                onPress = {
                    state.actionPressed = true
                },
                onRelease = {},
            )

            // Drop button (Bottom)
            ActionButton(
                label = "C",
                color = Color(0xFFF44336),
                modifier = Modifier
                    .offset(x = 0.dp, y = buttonOffset)
                    .size(buttonSize),
                onPress = {
                    state.dropPressed = true
                },
                onRelease = {},
            )

            // Cycle Inventory button (Left)
            ActionButton(
                label = "D",
                color = Color(0xFFFF9800),
                modifier = Modifier
                    .offset(x = -buttonOffset, y = 0.dp)
                    .size(buttonSize),
                onPress = {
                    state.cycleInventoryPressed = true
                },
                onRelease = {},
            )
        }

        // Pause button (top-right corner)
        ActionButton(
            label = "P",
            color = Color(0xFF9E9E9E),
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 12.dp, end = 12.dp)
                .size(36.dp),
            onPress = {
                state.pausePressed = true
            },
            onRelease = {},
        )
    }
}

@Composable
private fun ActionButton(
    label: String,
    color: Color,
    modifier: Modifier = Modifier,
    onPress: () -> Unit,
    onRelease: () -> Unit,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .background(color = color.copy(alpha = 0.60f), shape = CircleShape)
            .pointerInput(Unit) {
                awaitPointerEventScope {
                    // trackedPtrId is a local var, never captured from outside —
                    // reads are always current; no stale-capture issue.
                    var trackedPtrId = -1L
                    while (true) {
                        val event = awaitPointerEvent()
                        event.changes.forEach { change ->
                            val pointerId = change.id.value
                            when (event.type) {
                                PointerEventType.Press -> {
                                    if (trackedPtrId == -1L) {
                                        onPress()
                                        trackedPtrId = pointerId
                                        change.consume()
                                    }
                                }
                                PointerEventType.Release -> {
                                    if (pointerId == trackedPtrId) {
                                        onRelease()
                                        trackedPtrId = -1L
                                        change.consume()
                                    }
                                }
                                else -> {}
                            }
                        }
                    }
                }
            },
    ) {
        Text(
            text = label,
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}
