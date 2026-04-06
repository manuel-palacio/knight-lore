package com.palacesoft.knightlore.domain.save

interface SaveRepository {
    suspend fun save(snapshot: SaveSnapshot)
    suspend fun load(): SaveSnapshot?
    suspend fun delete()
    suspend fun hasSave(): Boolean
}
