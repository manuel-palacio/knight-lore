package com.example.knightlore.domain.system

import com.example.knightlore.domain.input.FrameInput
import com.example.knightlore.domain.model.GameState

class RoomTransitionSystem : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        // TODO: Phase 3
        return SystemResult(state, emptyList())
    }
}
