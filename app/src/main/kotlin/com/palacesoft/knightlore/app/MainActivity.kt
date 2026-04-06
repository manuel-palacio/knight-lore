package com.palacesoft.knightlore.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.palacesoft.knightlore.app.audio.AudioManager
import com.palacesoft.knightlore.app.audio.SoundManager
import com.palacesoft.knightlore.app.save.AndroidSaveRepository
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.app.session.GameSessionViewModel
import com.palacesoft.knightlore.app.settings.SettingsRepository
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.domain.DefaultGameEngine

class MainActivity : ComponentActivity() {

    private lateinit var soundManager: AudioManager

    private val viewModel: GameSessionViewModel by lazy {
        ViewModelProvider(this, object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val coordinator = GameSessionCoordinator(
                    contentRepository = AssetContentRepository(AndroidAssetLoader(this@MainActivity)),
                    engineFactory = { roomProvider, content -> DefaultGameEngine.create(roomProvider, content) },
                )
                val saveRepository = AndroidSaveRepository(this@MainActivity)
                @Suppress("UNCHECKED_CAST")
                return GameSessionViewModel(coordinator, saveRepository) as T
            }
        })[GameSessionViewModel::class.java]
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        soundManager = SoundManager(this)
        viewModel.coordinator.onEvents = { events -> events.forEach { soundManager.onEvent(it) } }
        viewModel.coordinator.onGameStarted = { soundManager.startMusic() }
        val settingsRepository = SettingsRepository(this)
        setContent {
            AppRoot(viewModel = viewModel, settingsRepository = settingsRepository)
        }
    }

    override fun onStop() {
        super.onStop()
        soundManager.release()
    }
}
