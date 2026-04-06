package com.palacesoft.knightlore.app.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(name = "game_settings")

class SettingsRepository(private val context: Context) {

    private object Keys {
        val AUDIO_ENABLED = booleanPreferencesKey("audio_enabled")
        val DIFFICULTY = stringPreferencesKey("difficulty")
        val DEBUG_OVERLAY = booleanPreferencesKey("debug_overlay")
    }

    val settings: Flow<GameSettings> = context.settingsDataStore.data.map { prefs ->
        GameSettings(
            audioEnabled = prefs[Keys.AUDIO_ENABLED] ?: true,
            difficulty = prefs[Keys.DIFFICULTY]?.let { name ->
                runCatching { Difficulty.valueOf(name) }.getOrDefault(Difficulty.MODERN)
            } ?: Difficulty.MODERN,
            debugOverlayEnabled = prefs[Keys.DEBUG_OVERLAY] ?: false,
        )
    }

    suspend fun save(settings: GameSettings) {
        context.settingsDataStore.edit { prefs ->
            prefs[Keys.AUDIO_ENABLED] = settings.audioEnabled
            prefs[Keys.DIFFICULTY] = settings.difficulty.name
            prefs[Keys.DEBUG_OVERLAY] = settings.debugOverlayEnabled
        }
    }
}
