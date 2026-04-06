package com.palacesoft.knightlore.app.audio

import com.palacesoft.knightlore.domain.event.GameEvent

interface AudioManager {
    fun onEvent(event: GameEvent)
    fun startMusic()
    fun pauseMusic()
    fun release()
}
