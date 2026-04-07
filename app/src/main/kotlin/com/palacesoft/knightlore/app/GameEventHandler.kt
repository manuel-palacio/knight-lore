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
            next = if (next.damageScreenCrackTicks > 0) next.copy(damageScreenCrackTicks = next.damageScreenCrackTicks - 1) else next
            next = if (next.doorTransitionTicks > 0) next.copy(doorTransitionTicks = next.doorTransitionTicks - 1) else next
            next = if (next.itemPickupFlashTicks > 0) next.copy(itemPickupFlashTicks = next.itemPickupFlashTicks - 1) else next
            next = if (next.roomNameTicks > 0) next.copy(roomNameTicks = next.roomNameTicks - 1) else next
            for (event in events) {
                next = when (event) {
                    is GameEvent.GameOver               -> next.copy(showGameOver = true)
                    is GameEvent.QuestCompleted         -> next.copy(showQuestComplete = true)
                    is GameEvent.TransformationStarted  -> next.copy(isTransforming = true, transformFlashTicks = 20)
                    is GameEvent.TransformationCompleted -> next.copy(isTransforming = false)
                    is GameEvent.PlayerDamaged          -> next.copy(damageFlashTicks = 12, damageScreenCrackTicks = 30)
                    is GameEvent.EnteredRoom            -> next.copy(
                        doorTransitionTicks = 11,
                        roomNameTicks = 240,
                        currentRoomName = roomNameFor(event.roomId.value),
                    )
                    is GameEvent.ItemPickedUp           -> next.copy(itemPickupFlashTicks = 20)
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

    private fun roomNameFor(roomId: String): String = when {
        roomId.contains("001") -> "The Cauldron Hall"
        roomId.contains("002") -> "The Dark Corridor"
        roomId.contains("003") -> "The Vault"
        roomId.contains("010") -> "The Long Passage"
        roomId.contains("011") -> "The Crossroads"
        roomId.contains("012") -> "The Dead End"
        roomId.contains("020") -> "The Crypt"
        roomId.contains("021") -> "The Pit"
        else -> "The Dungeon"
    }
}

data class GameUiState(
    val showGameOver: Boolean = false,
    val showQuestComplete: Boolean = false,
    val isTransforming: Boolean = false,
    val damageFlashTicks: Int = 0,
    val transformFlashTicks: Int = 0,
    val isPaused: Boolean = false,
    // Phase 8 feedback additions:
    val damageScreenCrackTicks: Int = 0,    // 30 ticks, draw crack lines on screen
    val doorTransitionTicks: Int = 0,        // 11 ticks: 3 white flash + 8 black fill
    val itemPickupFlashTicks: Int = 0,       // 20 ticks: particle burst color
    // Phase 8 exploration additions:
    val roomNameTicks: Int = 0,             // counts from 240 down to 0 (60 fade-in + 120 hold + 60 fade-out)
    val currentRoomName: String = "",       // name shown during roomNameTicks
)
