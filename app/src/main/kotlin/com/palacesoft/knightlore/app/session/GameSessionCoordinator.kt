package com.palacesoft.knightlore.app.session

import com.palacesoft.knightlore.data.ContentRoomProvider
import com.palacesoft.knightlore.data.asset.ContentRepository
import com.palacesoft.knightlore.domain.GameEngine
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider
import kotlinx.coroutines.flow.StateFlow

/**
 * High-level coordinator for a game session.
 * Owns the GameLoopCoordinator and exposes game state as a Flow.
 * Full implementation in Phase 6 (save/resume, settings).
 */
class GameSessionCoordinator(
    private val contentRepository: ContentRepository,
    private val engineFactory: (RoomProvider, GameContent) -> GameEngine,
) {
    private var loopCoordinator: GameLoopCoordinator? = null

    val gameState: StateFlow<GameState>?
        get() = loopCoordinator?.state

    var loadedContent: GameContent? = null
        private set

    suspend fun startNewGame(
        seed: Long = System.currentTimeMillis(),
        config: EngineConfig = EngineConfig(),
    ): GameLoopCoordinator {
        val content = contentRepository.loadContent()
        loadedContent = content
        val roomProvider = ContentRoomProvider(content)
        val engine = engineFactory(roomProvider, content)
        val initialState = engine.initialize(seed, content, config)
        val loop = GameLoopCoordinator(engine, initialState)
        loopCoordinator = loop
        return loop
    }

    fun advance(deltaSeconds: Float): List<GameEvent> =
        loopCoordinator?.advance(deltaSeconds) ?: emptyList()

    // TODO Phase 6: fun save(), fun resume(snapshot), fun pause()
}
