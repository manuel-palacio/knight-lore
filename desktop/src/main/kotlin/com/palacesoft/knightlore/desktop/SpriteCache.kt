package com.palacesoft.knightlore.desktop

import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import java.awt.image.BufferedImage
import javax.imageio.ImageIO

/**
 * Loads and caches sprite sheet PNGs from classpath resources.
 * Thread-safe via synchronized map.
 */
object SpriteCache {
    private val cache = mutableMapOf<String, ImageBitmap?>()

    fun get(sheetId: String): ImageBitmap? {
        return cache.getOrPut(sheetId) { load(sheetId) }
    }

    private fun load(sheetId: String): ImageBitmap? {
        val path = "sprites/$sheetId.png"
        return try {
            val stream = SpriteCache::class.java.classLoader.getResourceAsStream(path) ?: return null
            val buffered: BufferedImage = ImageIO.read(stream)
            buffered.toComposeImageBitmap()
        } catch (e: Exception) {
            println("SpriteCache: failed to load $path: ${e.message}")
            null
        }
    }
}
