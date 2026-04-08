package com.palacesoft.knightlore.render.art

/** Fallback catalog — returns null for all specs, triggering legacy rendering. */
class DefaultPropArtCatalog : PropArtCatalog {
    override fun resolve(spec: PropArtSpec): AuthoredSprite? = null
}
