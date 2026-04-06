package com.palacesoft.knightlore.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.palacesoft.knightlore.app.session.GameSessionCoordinator
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.domain.DefaultGameEngine

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val coordinator = GameSessionCoordinator(
            contentRepository = AssetContentRepository(AndroidAssetLoader(this)),
            engineFactory = { roomProvider, content -> DefaultGameEngine.create(roomProvider, content) },
        )
        setContent {
            AppRoot(sessionCoordinator = coordinator)
        }
    }
}
