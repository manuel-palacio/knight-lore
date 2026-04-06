package com.palacesoft.knightlore.app.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool
import com.palacesoft.knightlore.app.R
import com.palacesoft.knightlore.domain.event.GameEvent

/**
 * Manages all game audio: SFX via SoundPool, ambient music via MediaPlayer.
 * Call [release] when the hosting Activity stops.
 */
class SoundManager(context: Context) : AudioManager {

    private val audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_GAME)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

    private val soundPool = SoundPool.Builder()
        .setMaxStreams(8)
        .setAudioAttributes(audioAttributes)
        .build()

    // Load each SFX. SoundPool.load() returns 0 on failure (placeholder files) — play(0,...) is a no-op.
    private val sfxJump      = soundPool.load(context, R.raw.jump, 1)
    private val sfxLand      = soundPool.load(context, R.raw.land, 1)
    private val sfxHurt      = soundPool.load(context, R.raw.hurt, 1)
    private val sfxDeath     = soundPool.load(context, R.raw.death, 1)
    private val sfxTransform = soundPool.load(context, R.raw.transform, 1)
    private val sfxPickup    = soundPool.load(context, R.raw.pickup, 1)
    private val sfxSuccess   = soundPool.load(context, R.raw.success, 1)
    private val sfxVictory   = soundPool.load(context, R.raw.victory, 1)
    private val sfxGameOver  = soundPool.load(context, R.raw.gameover, 1)

    // MediaPlayer.create() returns null if the resource is empty/invalid (placeholder file).
    private val music: MediaPlayer? = MediaPlayer.create(context, R.raw.ambient_dungeon)?.apply {
        isLooping = true
        setVolume(0.5f, 0.5f)
    }

    /** Starts ambient music. Call once when gameplay begins. */
    override fun startMusic() {
        music?.takeIf { !it.isPlaying }?.start()
    }

    /** Pauses ambient music. */
    override fun pauseMusic() {
        music?.takeIf { it.isPlaying }?.pause()
    }

    /** Dispatches a game event to the appropriate sound(s). */
    override fun onEvent(event: GameEvent) {
        when (event) {
            is GameEvent.JumpStarted             -> play(sfxJump)
            is GameEvent.Landed                  -> play(sfxLand)
            is GameEvent.PlayerDamaged           -> play(sfxHurt)
            is GameEvent.LifeLost                -> { play(sfxDeath); pauseMusic() }
            is GameEvent.TransformationStarted   -> play(sfxTransform)
            is GameEvent.ItemPickedUp            -> play(sfxPickup)
            is GameEvent.CauldronRequestAdvanced -> play(sfxSuccess)
            is GameEvent.QuestCompleted          -> { play(sfxVictory); pauseMusic() }
            is GameEvent.GameOver                -> { play(sfxGameOver); pauseMusic() }
            else                                 -> Unit
        }
    }

    /** Releases all audio resources. Call from Activity.onStop(). */
    override fun release() {
        soundPool.release()
        music?.release()
    }

    private fun play(soundId: Int) {
        if (soundId > 0) {
            soundPool.play(soundId, 1f, 1f, 1, 0, 1f)
        }
    }
}
