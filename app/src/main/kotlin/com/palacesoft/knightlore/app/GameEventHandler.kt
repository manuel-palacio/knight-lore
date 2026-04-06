package com.palacesoft.knightlore.app

import com.palacesoft.knightlore.domain.event.GameEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Translates domain GameEvents into UI-level state changes.
 * Feeds overlays in GameScreen (game over, quest complete, etc.).
 */
class GameEventHandler {

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    fun handleEvents(events: List<GameEvent>) {
        var current = _uiState.value
        for (event in events) {
            current = when (event) {
                is GameEvent.GameOver         -> current.copy(showGameOver = true)
                is GameEvent.QuestCompleted   -> current.copy(showQuestComplete = true)
                is GameEvent.TransformationStarted -> current.copy(isTransforming = true)
                is GameEvent.TransformationCompleted -> current.copy(isTransforming = false)
                is GameEvent.PlayerDamaged    -> current.copy(damageFlashTicks = 12)
                else -> current
            }
        }
        // Decrement damageFlashTicks each call (called once per frame)
        if (current.damageFlashTicks > 0) {
            current = current.copy(damageFlashTicks = current.damageFlashTicks - 1)
        }
        _uiState.value = current
    }

    fun dismissGameOver()    { _uiState.value = _uiState.value.copy(showGameOver = false) }
    fun dismissQuestComplete() { _uiState.value = _uiState.value.copy(showQuestComplete = false) }
}

data class GameUiState(
    val showGameOver: Boolean = false,
    val showQuestComplete: Boolean = false,
    val isTransforming: Boolean = false,
    val damageFlashTicks: Int = 0,
)
