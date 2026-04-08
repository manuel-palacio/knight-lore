package com.palacesoft.knightlore.render.art

/** Fallback catalog — returns null for all specs, triggering legacy rendering. */
class DefaultActorArtCatalog : ActorArtCatalog {
    override fun resolve(spec: ActorArtSpec): AuthoredSprite? = null
}
