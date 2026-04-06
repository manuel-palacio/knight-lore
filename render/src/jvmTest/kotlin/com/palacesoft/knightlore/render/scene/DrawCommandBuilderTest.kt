package com.palacesoft.knightlore.render.scene

import com.palacesoft.knightlore.core.math.Vec2f
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DrawCommandBuilderTest {

    private fun makeCommand(
        layer: DrawLayer,
        depthKey: Int,
        priority: Int = 0,
        entityId: String = "entity",
    ) = DrawCommand(
        layer = layer,
        depthKey = depthKey,
        priority = priority,
        entityId = entityId,
        screenPos = Vec2f.ZERO,
        payload = DrawPayload.ColorRect(10f, 10f, 0xFF_FFFFFF.toInt()),
    )

    @Test
    fun drawCommandBuilder_sortsFloorBeforeBlock() {
        val block = makeCommand(DrawLayer.BLOCK, depthKey = 0, entityId = "block")
        val floor = makeCommand(DrawLayer.FLOOR, depthKey = 0, entityId = "floor")
        val sorted = DrawCommandBuilder.sort(listOf(block, floor))
        assertEquals(DrawLayer.FLOOR, sorted[0].layer)
        assertEquals(DrawLayer.BLOCK, sorted[1].layer)
    }

    @Test
    fun drawCommandBuilder_sortsLowerDepthFirst() {
        val far = makeCommand(DrawLayer.BLOCK, depthKey = 100, entityId = "far")
        val near = makeCommand(DrawLayer.BLOCK, depthKey = 200, entityId = "near")
        val sorted = DrawCommandBuilder.sort(listOf(near, far))
        assertEquals(100, sorted[0].depthKey)
        assertEquals(200, sorted[1].depthKey)
    }

    @Test
    fun drawCommandBuilder_stableSort_byEntityId() {
        val cmdB = makeCommand(DrawLayer.ACTOR, depthKey = 50, entityId = "b_entity")
        val cmdA = makeCommand(DrawLayer.ACTOR, depthKey = 50, entityId = "a_entity")
        val sorted = DrawCommandBuilder.sort(listOf(cmdB, cmdA))
        assertEquals("a_entity", sorted[0].entityId)
        assertEquals("b_entity", sorted[1].entityId)
    }

    @Test
    fun drawCommandBuilder_emptyList_returnsEmpty() {
        val sorted = DrawCommandBuilder.sort(emptyList())
        assertTrue(sorted.isEmpty())
    }
}
