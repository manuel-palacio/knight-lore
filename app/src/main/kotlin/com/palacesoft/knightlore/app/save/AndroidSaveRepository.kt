package com.palacesoft.knightlore.app.save

import android.content.Context
import android.util.AtomicFile
import com.palacesoft.knightlore.domain.save.SaveRepository
import com.palacesoft.knightlore.domain.save.SaveSnapshot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

class AndroidSaveRepository(context: Context) : SaveRepository {

    private val saveFile = File(context.filesDir, "campaign_save.json")
    private val atomicFile = AtomicFile(saveFile)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override suspend fun save(snapshot: SaveSnapshot) = withContext(Dispatchers.IO) {
        val stream = atomicFile.startWrite()
        try {
            stream.write(json.encodeToString(snapshot).toByteArray(Charsets.UTF_8))
            atomicFile.finishWrite(stream)
        } catch (e: Exception) {
            atomicFile.failWrite(stream)
            throw e
        }
    }

    override suspend fun load(): SaveSnapshot? = withContext(Dispatchers.IO) {
        if (!saveFile.exists()) return@withContext null
        try {
            val text = atomicFile.readFully().toString(Charsets.UTF_8)
            val snapshot = json.decodeFromString<SaveSnapshot>(text)
            if (snapshot.version != SaveSnapshot.CURRENT_VERSION) {
                // Future: migrate(snapshot). For now, discard stale saves.
                delete()
                return@withContext null
            }
            snapshot
        } catch (e: Exception) {
            null  // Corrupt save — treat as missing
        }
    }

    override suspend fun delete() = withContext(Dispatchers.IO) {
        atomicFile.delete()
    }

    override suspend fun hasSave(): Boolean = withContext(Dispatchers.IO) {
        saveFile.exists() && saveFile.length() > 0
    }
}
