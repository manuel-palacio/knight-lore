package com.palacesoft.knightlore.render

import android.content.Context
import android.graphics.Canvas
import android.view.Choreographer
import android.view.View
import com.palacesoft.knightlore.domain.model.GameContent
import com.palacesoft.knightlore.domain.model.GameState
import com.palacesoft.knightlore.domain.model.RoomDefinition
import com.palacesoft.knightlore.render.hud.HudRenderer
import com.palacesoft.knightlore.render.hud.TransitionRenderer
import com.palacesoft.knightlore.render.scene.RoomEntityFactory
import kotlinx.coroutines.flow.StateFlow

/**
 * A vsync-driven View that renders the isometric game scene using CanvasSceneRenderer.
 */
class GameRenderView(
    context: Context,
    private val gameState: StateFlow<GameState>,
    private val content: GameContent,
    private val onFrameAdvance: (Float) -> Unit,
) : View(context) {

    var debugRenderer: ((Canvas, GameState, RoomDefinition, Float, Float) -> Unit)? = null

    private val choreographer: Choreographer = Choreographer.getInstance()
    private var lastFrameNanos: Long = 0L

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (lastFrameNanos != 0L) {
                val deltaSeconds = (frameTimeNanos - lastFrameNanos) / 1_000_000_000f
                onFrameAdvance(deltaSeconds)
            }
            lastFrameNanos = frameTimeNanos
            invalidate()
            choreographer.postFrameCallback(this)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        lastFrameNanos = 0L
        choreographer.postFrameCallback(frameCallback)
    }

    override fun onDetachedFromWindow() {
        choreographer.removeFrameCallback(frameCallback)
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val state = gameState.value
        val commands = RoomEntityFactory.build(state, content, width.toFloat(), height.toFloat())
        CanvasSceneRenderer.render(canvas, commands)
        HudRenderer.render(canvas, state, content)
        TransitionRenderer.render(canvas, state.roomTransition)
        val room = content.rooms[state.currentRoomId]
        if (room != null) debugRenderer?.invoke(canvas, state, room, width.toFloat(), height.toFloat())
    }
}
