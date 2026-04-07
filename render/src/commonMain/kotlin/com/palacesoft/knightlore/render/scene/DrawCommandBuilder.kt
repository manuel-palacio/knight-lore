package com.palacesoft.knightlore.render.scene

/**
 * Sorts a list of DrawCommands into back-to-front order for correct
 * isometric occlusion.
 *
 * Sort order (ascending = drawn first = behind):
 * 1. layer group: FLOOR (0) → scene objects (1) → EFFECT (2) → HUD (3)
 * 2. depthKey — within the scene group, depth governs all occlusion so
 *    blocks, actors, and the player interleave correctly by world position.
 * 3. priority — tiebreaker for same-position entities
 * 4. entityId — alphabetical for sort stability
 */
object DrawCommandBuilder {
    fun sort(commands: List<DrawCommand>): List<DrawCommand> =
        commands.sortedWith(
            compareBy(
                { sceneGroup(it.layer) },
                { it.depthKey },
                { it.priority },
                { it.entityId },
            )
        )

    /**
     * Maps layers to render buckets.
     * BLOCK, ITEM, ACTOR, PLAYER, and FOREGROUND all share scene group 1
     * so they depth-sort together — this allows blocks to correctly occlude
     * actors/player and vice versa based on world position alone.
     */
    private fun sceneGroup(layer: DrawLayer): Int = when (layer) {
        DrawLayer.FLOOR       -> 0
        DrawLayer.BLOCK       -> 1  // all scene objects depth-sort together
        DrawLayer.ITEM        -> 1
        DrawLayer.ACTOR       -> 1
        DrawLayer.PLAYER      -> 1
        DrawLayer.FOREGROUND  -> 1
        DrawLayer.EFFECT      -> 2
        DrawLayer.HUD         -> 3
    }
}
