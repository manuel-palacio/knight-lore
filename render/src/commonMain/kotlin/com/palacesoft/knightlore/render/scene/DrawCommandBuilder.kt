package com.palacesoft.knightlore.render.scene

/**
 * Sorts a list of DrawCommands into back-to-front order for correct
 * isometric occlusion.
 *
 * Sort order (ascending = drawn first = behind):
 * 1. layer ordinal
 * 2. depthKey
 * 3. priority
 * 4. entityId (alphabetical — ensures stability)
 */
object DrawCommandBuilder {
    fun sort(commands: List<DrawCommand>): List<DrawCommand> =
        commands.sortedWith(
            compareBy(
                { it.layer.ordinal },
                { it.depthKey },
                { it.priority },
                { it.entityId },
            )
        )
}
