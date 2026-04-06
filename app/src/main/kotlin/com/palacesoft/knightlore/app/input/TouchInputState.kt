package com.palacesoft.knightlore.app.input

import androidx.compose.ui.geometry.Offset
import com.palacesoft.knightlore.core.math.Vec2f
import com.palacesoft.knightlore.domain.input.FrameInput
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

/**
 * Mutable touch input state.
 *
 * Threading: all reads and writes must happen on the main thread.
 * [buildFrameInput] is called from the Choreographer frame callback (main thread),
 * and all [pointerInput] handlers in [TouchInputOverlay] run on the main thread.
 * Do not access this from background threads.
 */
class TouchInputState {
    // Joystick state
    var stickCenter: Offset = Offset.Zero
    var stickCurrent: Offset = Offset.Zero
    var stickActive: Boolean = false
    var stickPointerId: Long = -1L

    // Button states (held this frame)
    var jumpHeld: Boolean = false
    var jumpPressed: Boolean = false           // true only first frame after press
    var actionPressed: Boolean = false
    var dropPressed: Boolean = false
    var cycleInventoryPressed: Boolean = false
    var pausePressed: Boolean = false

    val stickMaxRadius: Float = 80f            // dp reference value, for use in Composable density conversion
    val stickDeadzone: Float = 0.15f           // fraction of maxRadius

    /** Pixel equivalent of [stickMaxRadius]; set from [TouchInputOverlay] after density conversion. */
    var stickMaxRadiusPx: Float = 0f

    fun buildFrameInput(): FrameInput {
        val dx = stickCurrent.x - stickCenter.x
        val dy = stickCurrent.y - stickCenter.y
        val rawLength = Math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()

        val moveVector: Vec2f
        if (!stickActive || stickMaxRadiusPx <= 0f || rawLength < stickMaxRadiusPx * stickDeadzone) {
            moveVector = Vec2f.ZERO
        } else {
            // Normalize and clamp to 1
            var nx = dx / stickMaxRadiusPx
            var ny = dy / stickMaxRadiusPx
            val mag = Math.sqrt((nx * nx + ny * ny).toDouble()).toFloat()
            if (mag > 1f) {
                nx /= mag
                ny /= mag
            }

            // 8-direction snap: snap angle to nearest multiple of PI/4
            val angle = atan2(ny.toDouble(), nx.toDouble())
            val snappedAngle = (Math.round(angle / (PI / 4)) * (PI / 4))
            moveVector = Vec2f(cos(snappedAngle).toFloat(), sin(snappedAngle).toFloat())
        }

        return FrameInput(
            moveVector = moveVector,
            jumpPressed = jumpPressed,
            jumpHeld = jumpHeld,
            actionPressed = actionPressed,
            dropPressed = dropPressed,
            cycleInventoryPressed = cycleInventoryPressed,
            pausePressed = pausePressed,
        )
    }

    /** Clears one-shot pressed flags. Call after all consumers have read the frame input. */
    fun clearOneShotFlags() {
        jumpPressed = false
        actionPressed = false
        dropPressed = false
        cycleInventoryPressed = false
        pausePressed = false
    }
}
