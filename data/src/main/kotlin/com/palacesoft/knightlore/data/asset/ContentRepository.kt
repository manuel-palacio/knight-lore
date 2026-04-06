package com.palacesoft.knightlore.data.asset

import com.palacesoft.knightlore.domain.model.GameContent

interface ContentRepository {
    suspend fun loadContent(): GameContent
}
