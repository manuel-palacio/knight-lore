package com.palacesoft.knightlore.app

import android.content.Context
import com.palacesoft.knightlore.data.asset.AssetLoader

class AndroidAssetLoader(private val context: Context) : AssetLoader {
    override fun readText(path: String): String =
        context.assets.open(path).bufferedReader().use { it.readText() }
}
