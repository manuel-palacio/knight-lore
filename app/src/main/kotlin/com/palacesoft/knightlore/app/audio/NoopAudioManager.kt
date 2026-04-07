package com.palacesoft.knightlore.app.audio

import com.palacesoft.knightlore.domain.event.GameEvent

class NoopAudioManager : AudioManager {
    override fun onEvent(event: GameEvent) {
        // Phase 8 audio stubs — no-op until Phase 9 provides actual audio files
        // Mapping: PlayerDamaged → SFX_DAMAGE, ItemPickedUp → SFX_ITEM_PICKUP,
        // TransformationStarted → SFX_TRANSFORM, EnteredRoom → AMBIENT_DUNGEON
        when (event) {
            is GameEvent.PlayerDamaged -> { /* play SFX_DAMAGE */ }
            is GameEvent.ItemPickedUp -> { /* play SFX_ITEM_PICKUP */ }
            is GameEvent.TransformationStarted -> { /* play SFX_TRANSFORM */ }
            is GameEvent.EnteredRoom -> { /* startLoop AMBIENT_DUNGEON */ }
            is GameEvent.JumpStarted -> { /* play SFX_JUMP */ }
            is GameEvent.Landed -> { /* play SFX_LAND */ }
            else -> { /* no audio for other events */ }
        }
    }
    override fun startMusic() = Unit
    override fun pauseMusic() = Unit
    override fun release() = Unit
}
