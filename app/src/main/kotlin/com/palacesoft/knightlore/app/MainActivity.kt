package com.palacesoft.knightlore.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.palacesoft.knightlore.data.asset.AssetContentRepository
import com.palacesoft.knightlore.data.asset.ContentRepository

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val assetLoader = AndroidAssetLoader(this)
        val contentRepository: ContentRepository = AssetContentRepository(assetLoader)
        setContent {
            AppRoot(contentRepository = contentRepository)
        }
    }
}
