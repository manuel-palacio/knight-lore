package com.palacesoft.knightlore.render.sprite

/**
 * Defines a sprite frame within a sprite sheet.
 * All coordinates in pixels within the source PNG.
 */
data class SpriteFrame(
    val x: Int, val y: Int,
    val w: Int, val h: Int,
)

/**
 * A sprite sheet definition — maps animation state names to frame regions.
 * The actual PNG loading is platform-specific (Desktop vs Android).
 */
data class SpriteSheetDef(
    val sheetId: String,         // e.g. "player_human"
    val filename: String,        // e.g. "sprites/player_human.png"
    val frameWidth: Int,         // uniform frame width
    val frameHeight: Int,        // uniform frame height
    val frames: Map<String, SpriteFrame>,  // "idle_se" -> SpriteFrame(0,0,32,48)
)

/**
 * Registry of all sprite sheet definitions.
 * Add new sheets here as pixel art is created.
 */
object SpriteSheets {

    /** Player human form — 32x48 frames */
    val PLAYER_HUMAN = SpriteSheetDef(
        sheetId = "player_human",
        filename = "sprites/player_human.png",
        frameWidth = 32, frameHeight = 48,
        frames = mapOf(
            "idle_se"    to SpriteFrame(0, 0, 32, 48),
            "idle_sw"    to SpriteFrame(32, 0, 32, 48),
            "walk_se_0"  to SpriteFrame(64, 0, 32, 48),
            "walk_se_1"  to SpriteFrame(96, 0, 32, 48),
            "walk_sw_0"  to SpriteFrame(128, 0, 32, 48),
            "walk_sw_1"  to SpriteFrame(160, 0, 32, 48),
            "jump_se"    to SpriteFrame(192, 0, 32, 48),
        ),
    )

    /** Player werewolf form — 40x56 frames (bigger) */
    val PLAYER_WOLF = SpriteSheetDef(
        sheetId = "player_wolf",
        filename = "sprites/player_wolf.png",
        frameWidth = 40, frameHeight = 56,
        frames = mapOf(
            "idle_se"    to SpriteFrame(0, 0, 40, 56),
            "idle_sw"    to SpriteFrame(40, 0, 40, 56),
            "walk_se_0"  to SpriteFrame(80, 0, 40, 56),
            "walk_se_1"  to SpriteFrame(120, 0, 40, 56),
            "walk_sw_0"  to SpriteFrame(160, 0, 40, 56),
            "walk_sw_1"  to SpriteFrame(200, 0, 40, 56),
        ),
    )

    val ALL = listOf(PLAYER_HUMAN, PLAYER_WOLF)
}
