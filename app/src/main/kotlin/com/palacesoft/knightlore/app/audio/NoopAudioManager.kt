package com.palacesoft.knightlore.app.audio

import com.palacesoft.knightlore.domain.event.GameEvent

class NoopAudioManager : AudioManager {
    override fun onEvent(event: GameEvent) = Unit
    override fun startMusic() = Unit
    override fun pauseMusic() = Unit
    override fun release() = Unit
}
