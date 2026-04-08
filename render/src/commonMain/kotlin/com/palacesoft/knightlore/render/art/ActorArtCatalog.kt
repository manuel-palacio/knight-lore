package com.palacesoft.knightlore.render.art

enum class ActorKind { PLAYER, GUARD, GHOST, DRUID, ROBOT }
enum class ActorForm { HUMAN, WEREWOLF }
enum class ActorMotion { IDLE, WALK_A, WALK_B, JUMP_RISE, JUMP_APEX, LAND, DAMAGE, TRANSFORM_START, TRANSFORM_LOOP, TRANSFORM_END }
enum class ActorMood { Default, Enraged, Weakened, Cursed }
enum class Facing { NORTH, SOUTH, EAST, WEST, NORTHEAST, NORTHWEST, SOUTHEAST, SOUTHWEST }

data class ActorArtSpec(
    val actorKind: ActorKind,
    val form: ActorForm? = null,
    val facing: Facing,
    val motion: ActorMotion,
    val mood: ActorMood = ActorMood.Default,
    val framePhase: Int = 0,
)

interface ActorArtCatalog {
    fun resolve(spec: ActorArtSpec): AuthoredSprite?
}
