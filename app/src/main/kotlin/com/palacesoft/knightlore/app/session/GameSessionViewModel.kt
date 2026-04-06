package com.palacesoft.knightlore.app.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.palacesoft.knightlore.domain.model.EngineConfig
import com.palacesoft.knightlore.domain.save.SaveRepository
import com.palacesoft.knightlore.domain.save.SaveSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Bridges GameSessionCoordinator lifecycle with Android ViewModel lifecycle.
 * Saves on background (onCleared), loads on first launch.
 */
class GameSessionViewModel(
    val coordinator: GameSessionCoordinator,
    private val saveRepository: SaveRepository,
) : ViewModel() {

    private val _hasSave = MutableStateFlow(false)
    val hasSave: StateFlow<Boolean> = _hasSave.asStateFlow()

    init {
        viewModelScope.launch {
            _hasSave.value = saveRepository.hasSave()
        }
    }

    fun startNewGame(config: EngineConfig = EngineConfig()) {
        viewModelScope.launch {
            saveRepository.delete()
            coordinator.startNewGame(config = config)
            _hasSave.value = false
        }
    }

    fun continueGame() {
        viewModelScope.launch {
            val snapshot = saveRepository.load() ?: return@launch
            coordinator.resumeFromSnapshot(snapshot)
        }
    }

    fun saveGame() {
        val state = coordinator.gameState?.value ?: return
        val seed = coordinator.currentSeed
        val config = coordinator.currentConfig
        viewModelScope.launch {
            saveRepository.save(SaveSnapshot(
                seed = seed,
                state = state,
                config = config,
                savedAtMillis = System.currentTimeMillis(),
            ))
            _hasSave.value = true
        }
    }

    override fun onCleared() {
        super.onCleared()
        saveGame()  // Auto-save when ViewModel is destroyed
    }
}
