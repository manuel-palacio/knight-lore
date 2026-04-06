package com.palacesoft.knightlore.data.asset

/**
 * Desktop implementation of [AssetLoader] that reads assets from the JVM classpath.
 * Add the assets directory to the classpath (resources) of the desktop module to use this.
 */
class DesktopAssetLoader : AssetLoader {
    override fun readText(path: String): String {
        return DesktopAssetLoader::class.java.classLoader
            .getResourceAsStream(path)
            ?.bufferedReader()
            ?.readText()
            ?: error("Asset not found on classpath: $path")
    }
}
