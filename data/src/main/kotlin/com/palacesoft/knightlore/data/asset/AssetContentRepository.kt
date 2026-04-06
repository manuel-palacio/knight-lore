package com.palacesoft.knightlore.data.asset

import com.palacesoft.knightlore.data.dto.ActorTypeDto
import com.palacesoft.knightlore.data.dto.ItemTypeDto
import com.palacesoft.knightlore.data.dto.ProgressionDto
import com.palacesoft.knightlore.data.dto.RoomDto
import com.palacesoft.knightlore.data.mapper.ContentMapper
import com.palacesoft.knightlore.domain.model.GameContent
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class ManifestDto(val rooms: List<String>)

class AssetContentRepository(
    private val assetLoader: AssetLoader,
) : ContentRepository {

    private val json = Json { ignoreUnknownKeys = true }

    private fun safeRead(path: String): String {
        return try {
            assetLoader.readText(path)
        } catch (e: Exception) {
            throw IllegalStateException("Failed to load asset: $path", e)
        }
    }

    override suspend fun loadContent(): GameContent {
        // 1. Read rooms/manifest.json to get list of room file names
        val manifestJson = safeRead("rooms/manifest.json")
        val manifest = json.decodeFromString<ManifestDto>(manifestJson)

        // 2. For each filename, read "rooms/$filename" and parse as RoomDto
        val rooms = manifest.rooms.map { filename ->
            val roomJson = safeRead("rooms/$filename")
            json.decodeFromString<RoomDto>(roomJson)
        }

        // 3. Read "items.json" -> List<ItemTypeDto>
        val itemsJson = safeRead("items.json")
        val items = json.decodeFromString<List<ItemTypeDto>>(itemsJson)

        // 4. Read "actors.json" -> List<ActorTypeDto>
        val actorsJson = safeRead("actors.json")
        val actors = json.decodeFromString<List<ActorTypeDto>>(actorsJson)

        // 5. Read "progression.json" -> ProgressionDto
        val progressionJson = safeRead("progression.json")
        val progression = json.decodeFromString<ProgressionDto>(progressionJson)

        // 6. Call ContentMapper.map(...) to get GameContent
        return ContentMapper.map(
            rooms = rooms,
            items = items,
            actors = actors,
            progression = progression,
        )
    }
}
