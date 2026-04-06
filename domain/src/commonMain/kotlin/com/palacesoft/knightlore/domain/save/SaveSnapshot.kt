package com.palacesoft.knightlore.domain.save

import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.model.GameState
import kotlinx.serialization.Serializable

/**
 * Serializable capture of a game session.
 * Version field enables forward-compatible migration.
 */
@Serializable
data class SaveSnapshot(
    val version: Int = CURRENT_VERSION,
    val seed: Long,
    val state: GameState,
    val config: EngineConfig,
    val savedAtMillis: Long,
) {
    companion object {
        const val CURRENT_VERSION = 1
    }
}
