package com.palacesoft.knightlore.desktop

import androidx.compose.ui.input.key.*
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.domain.input.FrameInput

class KeyboardInputMapper {
    // Held state
    @Volatile private var left = false
    @Volatile private var right = false
    @Volatile private var up = false
    @Volatile private var down = false

    // Single-frame state (cleared after one read)
    @Volatile private var jumpPressed = false
    @Volatile private var actionPressed = false
    @Volatile private var dropPressed = false

    /** Clears all held and single-frame state. Call on game restart to prevent stuck keys. */
    fun reset() {
        left = false
        right = false
        up = false
        down = false
        jumpPressed = false
        actionPressed = false
        dropPressed = false
    }

    fun onKeyEvent(event: KeyEvent) {
        val pressed = event.type == KeyEventType.KeyDown

        when (event.key) {
            Key.A, Key.DirectionLeft  -> left  = pressed
            Key.D, Key.DirectionRight -> right = pressed
            Key.W, Key.DirectionUp    -> up    = pressed
            Key.S, Key.DirectionDown  -> down  = pressed
            Key.Spacebar -> if (pressed) jumpPressed = true
            Key.E, Key.Enter -> if (pressed) actionPressed = true
            Key.Q -> if (pressed) dropPressed = true
            else -> {}
        }
    }

    fun buildFrameInput(): FrameInput {
        val dx = when {
            right && !left -> 1f
            left && !right -> -1f
            else -> 0f
        }
        val dy = when {
            down && !up -> 1f
            up && !down -> -1f
            else -> 0f
        }

        val jump = jumpPressed
        jumpPressed = false
        val action = actionPressed
        actionPressed = false
        val drop = dropPressed
        dropPressed = false

        return FrameInput(
            moveVector = Vec2f(dx, dy),
            jumpPressed = jump,
            jumpHeld = jump,
            actionPressed = action,
            dropPressed = drop,
            cycleInventoryPressed = false,
            pausePressed = false,
        )
    }
}
