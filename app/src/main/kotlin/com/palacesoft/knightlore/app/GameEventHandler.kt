package com.palacesoft.knightlore.app

import com.palacesoft.knightlore.domain.event.GameEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Translates domain GameEvents into UI-level state changes.
 * Feeds overlays in GameScreen (game over, quest complete, etc.).
 */
class GameEventHandler {

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    fun handleEvents(events: List<GameEvent>) {
        _uiState.update { current ->
            // Decrement counters first — ensures events in this batch reset to full value, not decremented
            var next = if (current.damageFlashTicks > 0) current.copy(damageFlashTicks = current.damageFlashTicks - 1) else current
            next = if (next.transformFlashTicks > 0) next.copy(transformFlashTicks = next.transformFlashTicks - 1) else next
            for (event in events) {
                next = when (event) {
                    is GameEvent.GameOver               -> next.copy(showGameOver = true)
                    is GameEvent.QuestCompleted         -> next.copy(showQuestComplete = true)
                    is GameEvent.TransformationStarted  -> next.copy(isTransforming = true, transformFlashTicks = 20)
                    is GameEvent.TransformationCompleted -> next.copy(isTransforming = false)
                    is GameEvent.PlayerDamaged          -> next.copy(damageFlashTicks = 12)
                    else                               -> next
                }
            }
            next
        }
    }

    fun dismissGameOver()      { _uiState.update { it.copy(showGameOver = false) } }
    fun dismissQuestComplete() { _uiState.update { it.copy(showQuestComplete = false) } }
    fun togglePause()          { _uiState.update { it.copy(isPaused = !it.isPaused) } }
    fun resumeGame()           { _uiState.update { it.copy(isPaused = false) } }
}

data class GameUiState(
    val showGameOver: Boolean = false,
    val showQuestComplete: Boolean = false,
    val isTransforming: Boolean = false,
    val damageFlashTicks: Int = 0,
    val transformFlashTicks: Int = 0,
    val isPaused: Boolean = false,
)
