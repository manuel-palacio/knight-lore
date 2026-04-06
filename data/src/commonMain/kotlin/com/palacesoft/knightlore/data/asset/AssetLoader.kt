package com.palacesoft.knightlore.data.asset

interface AssetLoader {
    fun readText(path: String): String
}
