package com.palacesoft.knightlore.app.session

import com.palacesoft.knightlore.app.GameEventHandler
import com.palacesoft.knightlore.data.ContentRoomProvider
import com.palacesoft.knightlore.data.asset.ContentRepository
import com.palacesoft.knightlore.domain.GameEngine
import com.palacesoft.knightlore.domain.event.GameEvent
import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.rules.RoomProvider
import com.palacesoft.knightlore.domain.save.SaveSnapshot
import kotlinx.coroutines.flow.StateFlow

/**
 * High-level coordinator for a game session.
 * Owns the GameLoopCoordinator and exposes game state as a Flow.
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

    val eventHandler = GameEventHandler()

    var onEvents: ((List<GameEvent>) -> Unit)? = null
    var onGameStarted: (() -> Unit)? = null

    var currentSeed: Long = System.currentTimeMillis()
        private set
    var currentConfig: EngineConfig = EngineConfig()
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
        currentSeed = seed
        currentConfig = config
        onGameStarted?.invoke()
        return loop
    }

    suspend fun resumeFromSnapshot(snapshot: SaveSnapshot): GameLoopCoordinator {
        val content = contentRepository.loadContent()
        loadedContent = content
        val roomProvider = ContentRoomProvider(content)
        val engine = engineFactory(roomProvider, content)
        // Restore state directly — no re-initialization
        val loop = GameLoopCoordinator(engine, snapshot.state)
        loopCoordinator = loop
        currentSeed = snapshot.seed
        currentConfig = snapshot.config
        onGameStarted?.invoke()
        return loop
    }

    fun advance(deltaSeconds: Float): List<GameEvent> {
        val events = loopCoordinator?.advance(deltaSeconds) ?: emptyList()
        if (events.isNotEmpty()) onEvents?.invoke(events)
        eventHandler.handleEvents(events)
        return events
    }
}
