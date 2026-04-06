package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState

class RoomTransitionSystem : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        // TODO: Phase 3
        return SystemResult(state, emptyList())
    }
}
