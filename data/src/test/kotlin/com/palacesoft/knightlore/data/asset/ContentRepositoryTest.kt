package com.palacesoft.knightlore.data.asset

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.io.File

/**
 * Integration test: loads real JSON assets from the filesystem and verifies the full
 * JSON → DTO → domain model pipeline.
 *
 * The `File("src/main/assets/...")` relative paths resolve correctly for JVM unit tests
 * executed from the module root (data/).
 */
class ContentRepositoryTest {

    private fun buildFileAssetLoader(baseDir: File = File("src/main/assets")): AssetLoader {
        return object : AssetLoader {
            override fun readText(path: String): String {
                val file = File(baseDir, path)
                if (!file.exists()) throw IllegalStateException("Failed to load asset: $path")
                return file.readText()
            }
        }
    }

    private fun buildMapAssetLoader(assets: Map<String, String>): AssetLoader {
        return object : AssetLoader {
            override fun readText(path: String): String {
                return assets[path]
                    ?: throw IllegalStateException("Failed to load asset: $path")
            }
        }
    }

    @Test
    fun `ContentRepository_loads15Rooms_fromVerticalSliceAssets`() {
        val repo = AssetContentRepository(buildFileAssetLoader())
        val content = runBlocking { repo.loadContent() }
        assertEquals(15, content.rooms.size, "Expected 15 rooms in vertical slice")
    }

    @Test
    fun `ContentRepository_missingAsset_throwsIllegalStateException`() {
        // Use map-backed loader with manifest pointing to a missing file
        val missingManifest = """{"rooms": ["room_missing.json"]}"""
        val loader = buildMapAssetLoader(
            mapOf(
                "rooms/manifest.json" to missingManifest,
                "items.json" to "[]",
                "actors.json" to "[]",
                "progression.json" to """
                    {
                      "totalRequiredItems": 0,
                      "startRoomId": "r1",
                      "cauldronRoomId": "r1",
                      "cureMode": "MODERN",
                      "sequence": [],
                      "variableStartIndex": false
                    }
                """.trimIndent(),
            )
        )
        val repo = AssetContentRepository(loader)
        assertThrows<IllegalStateException> {
            runBlocking { repo.loadContent() }
        }
    }

    @Test
    fun `ContentRepository_roomGraphIsValid_allExitsResolve`() {
        val repo = AssetContentRepository(buildFileAssetLoader())
        val content = runBlocking { repo.loadContent() }
        val roomIds = content.rooms.keys.map { it.value }.toSet()
        for ((roomId, room) in content.rooms) {
            for (exit in room.exits) {
                assertTrue(
                    exit.targetRoomId.value in roomIds,
                    "Room '${roomId.value}' has exit to unknown room '${exit.targetRoomId.value}'"
                )
            }
        }
    }
}
