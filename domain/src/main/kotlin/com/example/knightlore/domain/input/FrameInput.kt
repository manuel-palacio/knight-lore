package com.example.knightlore.domain.input

import com.example.knightlore.core.math.Vec2f

data class FrameInput(
    val moveVector: Vec2f,              // normalized 2D movement intent (0,0 = no movement)
    val jumpPressed: Boolean,           // jump button just pressed this tick
    val jumpHeld: Boolean,              // jump button held (variable height)
    val actionPressed: Boolean,         // pickup / interact
    val dropPressed: Boolean,           // drop carried item
    val cycleInventoryPressed: Boolean, // cycle which carried item is active
    val pausePressed: Boolean,
) {
    companion object {
        val IDLE = FrameInput(
            moveVector = Vec2f.ZERO,
            jumpPressed = false,
            jumpHeld = false,
            actionPressed = false,
            dropPressed = false,
            cycleInventoryPressed = false,
            pausePressed = false,
        )
    }
}
