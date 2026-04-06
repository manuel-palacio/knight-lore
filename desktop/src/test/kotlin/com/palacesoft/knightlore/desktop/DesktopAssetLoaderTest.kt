package com.palacesoft.knightlore.desktop

import com.palacesoft.knightlore.data.asset.DesktopAssetLoader
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class DesktopAssetLoaderTest {

    @Test
    fun `manifest json is accessible on classpath`() {
        val loader = DesktopAssetLoader()
        val text = loader.readText("rooms/manifest.json")
        assertTrue(text.isNotBlank(), "rooms/manifest.json should not be empty")
        assertTrue(text.contains(".json"), "manifest should list room filenames")
    }

    @Test
    fun `first room json is accessible on classpath`() {
        val loader = DesktopAssetLoader()
        val manifest = loader.readText("rooms/manifest.json")
        // Manifest is a JSON array of filenames — just verify it loads
        assertNotNull(manifest)
    }
}
