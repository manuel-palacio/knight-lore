package com.palacesoft.knightlore.render.art

enum class PropKind {
    CAULDRON, THRONE, ALTAR, BRAZIER, BANNER, CHAIN_CLUSTER,
    HANGING_CAGE, BARRED_WINDOW, CRUMBLING_BLOCK, PUZZLE_BLOCK, PEDESTAL,
    GOBLET, VIAL, CRYSTAL_BALL, KEY, SKULL, GEM, TORCH_ITEM, BOOT, TEACUP, WINE_BOTTLE,
}

enum class PropVisualState { Default, Active, Damaged, Glowing, Collected, Crumbling }

data class PropArtSpec(
    val propKind: PropKind,
    val variant: String? = null,
    val state: PropVisualState = PropVisualState.Default,
)

interface PropArtCatalog {
    fun resolve(spec: PropArtSpec): AuthoredSprite?
}
