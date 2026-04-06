package com.example.knightlore.domain.input

import com.example.knightlore.core.math.Direction8

data class FrameInput(
    val moveDirection: Direction8?,  // null = no movement
    val jumpPressed: Boolean,
    val actionPressed: Boolean,      // pick up / drop / interact
) {
    companion object {
        val IDLE = FrameInput(moveDirection = null, jumpPressed = false, actionPressed = false)
    }
}
