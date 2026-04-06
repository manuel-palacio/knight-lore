package com.palacesoft.knightlore.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.palacesoft.knightlore.app.audio.SoundManager
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.domain.DefaultGameEngine

class MainActivity : ComponentActivity() {

    private lateinit var soundManager: SoundManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        soundManager = SoundManager(this)
        val coordinator = GameSessionCoordinator(
            contentRepository = AssetContentRepository(AndroidAssetLoader(this)),
            engineFactory = { roomProvider, content -> DefaultGameEngine.create(roomProvider, content) },
        )
        coordinator.onEvents = { events -> events.forEach { soundManager.onEvent(it) } }
        coordinator.onGameStarted = { soundManager.startMusic() }
        setContent {
            AppRoot(sessionCoordinator = coordinator)
        }
    }

    override fun onStop() {
        super.onStop()
        soundManager.release()
    }
}
