package com.palacesoft.knightlore.render.scene

/**
 * Sorts a list of DrawCommands into back-to-front order for correct
 * isometric occlusion.
 *
 * Sort order (ascending = drawn first = behind):
 * 1. layer group: FLOOR (0) → scene objects (1) → HUD (2)
 * 2. depthKey — within the scene group, depth governs everything so
 *    the player correctly occludes blocks it stands south of, and
 *    blocks correctly occlude the player when north of it.
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

    /** Maps layers to render buckets. Higher = drawn later (in front). */
    private fun sceneGroup(layer: DrawLayer): Int = when (layer) {
        DrawLayer.FLOOR       -> 0
        DrawLayer.BLOCK       -> 1  // depth-sorted world geometry
        DrawLayer.ITEM        -> 2
        DrawLayer.ACTOR       -> 3
        DrawLayer.PLAYER      -> 4  // player renders after actors
        DrawLayer.FOREGROUND  -> 5  // blocks above player (render in front of player)
        DrawLayer.EFFECT      -> 6
        DrawLayer.HUD         -> 7
    }
}
