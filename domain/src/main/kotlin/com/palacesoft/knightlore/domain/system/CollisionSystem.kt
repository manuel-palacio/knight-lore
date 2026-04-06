package com.palacesoft.knightlore.domain.system

import com.palacesoft.knightlore.domain.input.FrameInput
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.CollisionResolver
import com.palacesoft.knightlore.domain.rules.RoomProvider

/**
 * Thin wrapper — real movement+collision logic lives in [MovementSystem].
 * CollisionSystem is retained as a named entry point that delegates to the resolver.
 */
class CollisionSystem(
    private val roomProvider: RoomProvider,
    private val resolver: CollisionResolver = CollisionResolver(),
) : GameSystem {
    override fun update(state: GameState, input: FrameInput, tickDelta: Float): SystemResult {
        // Collision resolution is integrated into MovementSystem for correctness.
        // This system is a no-op stub; wiring is done via MovementSystem directly.
        return SystemResult(state)
    }
}
