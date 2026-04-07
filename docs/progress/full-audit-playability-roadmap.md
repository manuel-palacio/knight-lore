# Knight Lore — Full Code Audit & Playability Roadmap
# Claude Code Prompts: Complete Execution Guide

**Repo**: https://github.com/manuel-palacio/knight-lore
**Audit Date**: April 2026
**Current State**: Isometric renderer prototype. NOT YET PLAYABLE.

Paste prompts one-by-one into Claude Code. Each is self-contained.
After each prompt: test → commit → next prompt.

---

## CURRENT STATE SUMMARY

| Module | State | Notes |
|--------|-------|-------|
| `core` | ✅ Solid | Vec2f/3f, IsoProjector, TileMetrics, time utils |
| `render` | 🟡 Functional | DrawCommand/DrawPayload/DrawLayer all good. RoomEntityFactory is 113KB God Object |
| `domain` | 🔴 Empty | No GameLoop, PlayerState, collision, AI |
| `input` | ❓ Unconnected | Exists but not wired |
| `data` | ❓ Missing | No room JSON loader |
| `app/desktop` | 🟡 Basic | KMP entry points exist |

---

## ════════════════════════════════════════
## PHASE 10.5 — VISUAL POLISH (Today, ~1 hour)
## ════════════════════════════════════════

---

### ✅ PROMPT 10.5-A: Fix Exit Archways

```
File: render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt

PROBLEM REPORTED: "exits do not look like archways, they look like a mess"

KNIGHT LORE RULE: Exits = EMPTY DOOR GAPS between wall blocks.
No solid block at doorway center. Player walks through the empty space.

TASK:
1. Find room 1 code (search "room1" or first roomId)
2. Find all exit positions (edges of room, south/east/north/west walls)
3. For each exit:
   - REMOVE emitBlock() at the doorway center tile
   - Keep wall blocks LEFT and RIGHT of gap only
   - Add arch top spanning the gap:

```kotlin
// Arch top - spans gap, renders in front
emitBlock(
    x = doorCenterX, y = doorCenterY, z = 2f,
    width = 0.3f, depth = 1f, height = 0.5f,
    color = 0xFF_AAAAAA.toInt(),
    layer = DrawLayer.FOREGROUND
)
```

4. Verify: gap at z=0 and z=1 is empty, arch top at z=2

Commit: `fix(render): room1 exits are proper archway gaps`
```

---

### ✅ PROMPT 10.5-B: Platforms Must Have Purpose

```
File: RoomEntityFactory.kt

PROBLEM REPORTED: "3 blocks that I can jump on but to what end?"

TASK for room 1 platform stack:
1. Find the 3-block stack (z=1, z=2, z=3 at same x,y)
2. Add crown collectible on top:

```kotlin
// Gold crown on top platform
emitItem(
    type = EntityType.CROWN,
    x = stackX, y = stackY, z = 3.2f,
    layer = DrawLayer.ITEM,
    payload = DrawPayload.ColorOval(18f, 12f, 0xFF_FFD700.toInt())
)
```

3. Ensure top block is adjacent to an exit archway gap
4. Add climb hint (pulsing oval at base):

```kotlin
DrawCommand(
    layer = DrawLayer.EFFECT,
    depthKey = IsoProjector.depthKey(Vec3f(stackX, stackY, 0f)),
    screenPos = IsoProjector.toScreen(stackX, stackY, 0f),
    entityId = "hint_stack",
    payload = DrawPayload.ColorOval(32f, 20f, 0x33_FFFFFF.toInt())
)
```

Commit: `feat(render): room1 platforms → crown item + exit path`
```

---

### ✅ PROMPT 10.5-C: Fix Depth Sorting (Blocks/Actors/Player)

```
File: domain/src/commonMain/.../system/MovementSystem.kt

PROBLEM REPORTED: "werewolf jumps, it can go through suspended blocks"

ROOT CAUSE: Position += velocity runs BEFORE collision check.

TASK:
1. Replace existing update with SWEPT COLLISION:

```kotlin
fun update(player: PlayerState, room: RoomState, dt: Float): PlayerState {
    // 1. Apply gravity
    val withGravity = player.copy(
        velocity = player.velocity.copy(z = player.velocity.z - 25f * dt)
    )

    // 2. Compute end position
    val endPos = withGravity.position + withGravity.velocity * dt

    // 3. Swept collision against all room blocks
    val hit = CollisionSystem.sweep(withGravity.bounds, endPos, room.blocks)

    val finalPos = if (hit != null) {
        hit.point - withGravity.bounds.extents * 0.01f
    } else {
        endPos
    }

    val finalVel = if (hit != null) {
        withGravity.velocity * 0.6f  // friction on collision
    } else {
        withGravity.velocity
    }

    // 4. Floor clamp
    val clampedPos = finalPos.copy(z = maxOf(0f, finalPos.z))
    val clampedVel = if (clampedPos.z == 0f) finalVel.copy(z = 0f) else finalVel

    return withGravity.copy(position = clampedPos, velocity = clampedVel)
}
```

2. Wolf jump: `jumpForce = if (transformState == WOLF) 12f else 8f`

3. Add unit test in domain/src/jvmTest:
```kotlin
@Test
fun `werewolf cannot jump through suspended block`() {
    val block = Block(BoundingBox(1f,1f,1.5f, 2f,2f,2.5f))
    val player = PlayerState(position=Vec3f(1.5f,1.5f,0f), velocity=Vec3f(0f,0f,15f), ...)
    val result = MovementSystem.update(player, RoomState(listOf(block)), dt=0.1f)
    assert(result.position.z < 1.5f) // stopped below block
}
```

Commit: `fix(domain): swept AABB collision prevents jump-through`
```

---

### ✅ PROMPT 10.5-D: Fix Character Proportions

```
Find player DrawCommand emission code (RoomEntityFactory.kt or GameRenderer.kt)

PROBLEM REPORTED: "character looks terrible, deformed being in human form or werewolf"

KNIGHT LORE SPECS:
- Human Sabreman: 3 blocks tall, 0.8 wide → 72px H × 24px W
- Wolf: 2 blocks tall, 1.2 wide → 48px H × 36px W

TASK:
1. Locate player entity DrawCommand
2. Replace with correct proportions:

```kotlin
val screenPos = IsoProjector.toScreen(player.position)
val feetDepth = IsoProjector.depthKey(player.position.copy(z = 0f))

val payload = when (player.transformState) {
    TransformState.HUMAN -> DrawPayload.ColorRect(
        widthPx = 24f, heightPx = 72f,
        colorArgb = 0xFF_DDAA88.toInt()
    )
    TransformState.TRANSFORMING -> DrawPayload.ColorRect(
        widthPx = 30f, heightPx = 60f,
        colorArgb = 0xFF_AA7744.toInt()
    )
    TransformState.WOLF -> DrawPayload.ColorRect(
        widthPx = 36f, heightPx = 48f,
        colorArgb = 0xFF_8B4513.toInt()
    )
}

commands.add(DrawCommand(
    layer = DrawLayer.PLAYER,
    depthKey = feetDepth,
    screenPos = screenPos.copy(y = screenPos.y - payload.heightPx),  // anchor feet
    entityId = "player",
    payload = payload
))
```

3. Verify feet are always at player.position (not center)

Commit: `fix(render): correct human(72×24)/wolf(48×36) proportions`
```

---

### ✅ PROMPT 10.5-E: 3D Walls (Fix Shelf Look)

```
File: RoomEntityFactory.kt — all wall emitBlock() calls

PROBLEM REPORTED: "walls look like shelves"

CAUSE: Single z=1 block renders as flat protrusion.
FIX: 3 stacked Z-layers give visual thickness.

TASK:
1. Find every wall block emission
2. Replace single block with 3-layer stack:

```kotlin
// Helper function to add to RoomEntityFactory:
private fun emitWall(x: Float, y: Float, commands: MutableList<DrawCommand>) {
    // Base
    emitBlock(x, y, 0f, 0.8f, 0.8f, 1f, 0xFF_444444.toInt(), DrawLayer.BLOCK, commands)
    // Wall body
    emitBlock(x, y, 1f, 0.8f, 0.8f, 1f, 0xFF_666666.toInt(), DrawLayer.BLOCK, commands)
    // Parapet (renders in front of player when player is behind)
    emitBlock(x, y, 2f, 0.8f, 0.8f, 0.4f, 0xFF_888888.toInt(), DrawLayer.FOREGROUND, commands)
}
```

3. Add to TileMetrics:
```kotlin
const val WALL_BASE_COLOR = 0xFF_444444.toInt()
const val WALL_MID_COLOR = 0xFF_666666.toInt()
const val WALL_TOP_COLOR = 0xFF_888888.toInt()
```

4. EXCEPTION: For wall blocks adjacent to exit gaps → skip parapet (z=2) so archway stays clear

Commit: `fix(render): 3-layer walls eliminate flat shelf appearance`
```

---

### ✅ PROMPT 10.5-F: Debug Overlay (Already Existed)

```
File: feature-debug/src/.../DebugOverlay.kt (create if missing)

TASK: Visual diagnostics for all Phase 10.5 issues.

Add to DrawLayer.HUD commands (always on top, toggled by debug input):

```kotlin
object DebugOverlay {

    fun buildCommands(gameState: GameState, room: RoomState): List<DrawCommand> {
        if (!DebugConfig.enabled) return emptyList()
        val cmds = mutableListOf<DrawCommand>()

        // 1. RED circles at all exit door centers
        room.exits.forEach { exit ->
            cmds.add(DrawCommand(
                layer = DrawLayer.HUD, depthKey = 99999, entityId = "dbg_exit_${exit.id}",
                screenPos = IsoProjector.toScreen(exit.centerWorld),
                payload = DrawPayload.ColorOval(20f, 14f, 0x99_FF0000.toInt())
            ))
        }

        // 2. YELLOW velocity arrow from player
        val p = gameState.player
        val pScreen = IsoProjector.toScreen(p.position)
        cmds.add(DrawCommand(
            layer = DrawLayer.HUD, depthKey = 99998, entityId = "dbg_vel",
            screenPos = pScreen,
            payload = DrawPayload.Line(
                x1 = pScreen.x, y1 = pScreen.y,
                x2 = pScreen.x + p.velocity.x * 3f,
                y2 = pScreen.y + p.velocity.z * 3f,
                colorArgb = 0xFF_FFFF00.toInt(), strokeWidth = 2f
            )
        ))

        // 3. BLUE wireframe around player bounds
        val b = p.bounds
        val corners = listOf(
            IsoProjector.toScreen(b.minX, b.minY, b.minZ),
            IsoProjector.toScreen(b.maxX, b.minY, b.minZ),
            IsoProjector.toScreen(b.maxX, b.maxY, b.minZ),
            IsoProjector.toScreen(b.minX, b.maxY, b.minZ),
        )
        cmds.add(DrawCommand(
            layer = DrawLayer.HUD, depthKey = 99997, entityId = "dbg_bounds",
            screenPos = corners[0],
            payload = DrawPayload.ColorPath(corners, 0x88_0000FF.toInt())
        ))

        return cmds
    }
}
```

Toggle: `DebugConfig.enabled = !DebugConfig.enabled` on key press

Commit: `feat(debug): diagnostic overlay for visual issue verification`
```

---

## ════════════════════════════════════════
## PHASE 11 — CORE GAME LOOP (Tomorrow, ~2 hours)
## ════════════════════════════════════════

---

### ✅ PROMPT 11-A (existed): Fixed-Timestep Game Loop

```
Create: domain/src/commonMain/kotlin/com/palacesoft/knightlore/domain/GameLoop.kt

TASK: Implement fixed-timestep loop (60Hz physics, uncapped render)

```kotlin
class GameLoop(
    private val fixedHz: Int = 60,
    private val onUpdate: (dt: Float) -> Unit,
    private val onRender: (interpolation: Float) -> Unit
) {
    private val fixedDt = 1f / fixedHz
    private var accumulator = 0f
    private var running = false

    fun tick(frameTimeSeconds: Float) {
        if (!running) return
        accumulator += frameTimeSeconds.coerceAtMost(0.25f) // spiral-of-death guard
        while (accumulator >= fixedDt) {
            onUpdate(fixedDt)
            accumulator -= fixedDt
        }
        onRender(accumulator / fixedDt) // interpolation 0..1
    }

    fun start() { running = true; accumulator = 0f }
    fun stop()  { running = false }
    fun pause() { running = false }
    fun resume(){ running = true }
}
```

Wire into:
- `desktop/` → Compose `LaunchedEffect` with `withFrameMillis` loop
- `app/` → Android `GameView.onDraw()` using `Choreographer`

Commit: `feat(domain): fixed-timestep GameLoop (60Hz update, uncapped render)`
```

---

### ✅ PROMPT 11-B (existed): Player State & Movement System

```
Create files:
- domain/src/commonMain/.../entity/PlayerState.kt
- domain/src/commonMain/.../system/MovementSystem.kt

```kotlin
// PlayerState.kt
data class PlayerState(
    val position: Vec3f = Vec3f(2f, 2f, 0f),
    val velocity: Vec3f = Vec3f.ZERO,
    val facing: Direction = Direction.SOUTH,
    val transformState: TransformState = TransformState.HUMAN,
    val health: Int = 3,
    val inventory: List<String> = emptyList(),
    val isGrounded: Boolean = true,
    val invincibleTicks: Int = 0  // countdown after damage
) {
    val bounds get() = BoundingBox(
        minX = position.x - 0.4f, minY = position.y - 0.4f, minZ = position.z,
        maxX = position.x + 0.4f, maxY = position.y + 0.4f,
        maxZ = position.z + if (transformState == TransformState.WOLF) 2f else 3f
    )
    val speed get() = if (transformState == TransformState.WOLF) 4.5f else 3f
    val jumpForce get() = if (transformState == TransformState.WOLF) 12f else 8f
}

enum class Direction { NORTH, SOUTH, EAST, WEST }
enum class TransformState { HUMAN, TRANSFORMING, WOLF }
```

```kotlin
// MovementSystem.kt
object MovementSystem {
    fun update(player: PlayerState, input: InputState, room: RoomState, dt: Float): PlayerState {
        var p = player

        // 1. Facing from input
        val facing = directionFromInput(input) ?: p.facing
        val vel = if (input.anyMovement) {
            Vec3f(
                x = moveDx(facing) * p.speed,
                y = moveDy(facing) * p.speed,
                z = p.velocity.z
            )
        } else Vec3f(0f, 0f, p.velocity.z)

        // 2. Jump (tap = short, hold = tall via initial impulse)
        val jumped = input.jumpPressed && p.isGrounded
        val velZ = if (jumped) p.jumpForce else vel.z - 25f * dt

        // 3. Swept collision
        val endPos = p.position + vel.copy(z = velZ) * dt
        val hit = CollisionSystem.sweep(p.bounds, endPos, room.solidBlocks)
        val finalPos = if (hit != null) hit.resolvedPosition else endPos
        val grounded = finalPos.z <= 0.001f || hit?.normal?.z == 1f

        return p.copy(
            position = finalPos.copy(z = maxOf(0f, finalPos.z)),
            velocity = vel.copy(z = if (grounded) 0f else velZ),
            facing = facing,
            isGrounded = grounded,
            invincibleTicks = maxOf(0, p.invincibleTicks - 1)
        )
    }

    private fun directionFromInput(input: InputState): Direction? = when {
        input.north -> Direction.NORTH
        input.south -> Direction.SOUTH
        input.east  -> Direction.EAST
        input.west  -> Direction.WEST
        else -> null
    }

    private fun moveDx(d: Direction) = when(d) { Direction.EAST -> 1f; Direction.WEST -> -1f; else -> 0f }
    private fun moveDy(d: Direction) = when(d) { Direction.SOUTH -> 1f; Direction.NORTH -> -1f; else -> 0f }
}
```

Commit: `feat(domain): PlayerState + MovementSystem with variable jump`
```

---

### ✅ PROMPT 11-C (existed): Inventory & Pickup System

```
Create: domain/src/commonMain/.../system/PickupSystem.kt

KNIGHT LORE MECHANIC: Press ↓+jump while adjacent to item to pick up.
Can carry up to 3 items. Drop with ↓.

```kotlin
object PickupSystem {
    const val MAX_CARRY = 3
    const val PICKUP_RADIUS = 1.2f  // tiles

    fun tryPickup(player: PlayerState, room: RoomState, input: InputState): Pair<PlayerState, RoomState> {
        if (!input.actionPressed || player.inventory.size >= MAX_CARRY) return player to room

        val nearest = room.items
            .filter { distXY(player.position, it.position) < PICKUP_RADIUS }
            .minByOrNull { distXY(player.position, it.position) }
            ?: return player to room

        val newPlayer = player.copy(inventory = player.inventory + nearest.id)
        val newRoom = room.copy(items = room.items - nearest)
        return newPlayer to newRoom
    }

    fun tryDrop(player: PlayerState, room: RoomState, input: InputState): Pair<PlayerState, RoomState> {
        if (!input.dropPressed || player.inventory.isEmpty()) return player to room

        val droppedId = player.inventory.last()
        val dropPos = player.position.copy(z = 0f)
        val newRoom = room.copy(items = room.items + ItemEntity(droppedId, dropPos))
        val newPlayer = player.copy(inventory = player.inventory.dropLast(1))
        return newPlayer to newRoom
    }

    private fun distXY(a: Vec3f, b: Vec3f) = sqrt((a.x-b.x).pow(2) + (a.y-b.y).pow(2))
}
```

Commit: `feat(domain): InventorySystem — carry 3 items, drop mechanic`
```

---

### ✅ PROMPT 11-D (existed): Room Navigation

```
Create:
- domain/src/commonMain/.../map/RoomMap.kt
- domain/src/commonMain/.../map/NavigationSystem.kt

```kotlin
// RoomMap.kt
class RoomMap(private val rooms: Map<String, RoomDefinition>) {
    fun roomById(id: String) = rooms[id] ?: error("Room $id not found")
    fun exitsFrom(id: String) = roomById(id).exits
}

// NavigationSystem.kt
object NavigationSystem {
    fun checkTransition(player: PlayerState, room: RoomDefinition): RoomTransition? {
        room.exits.forEach { (direction, targetRoomId) ->
            val exitBounds = exitBoundsFor(direction, room)
            if (player.bounds.intersects(exitBounds)) {
                val entryPos = entryPositionFor(direction, room)
                return RoomTransition(targetRoomId, entryPos)
            }
        }
        return null
    }

    private fun exitBoundsFor(direction: String, room: RoomDefinition): BoundingBox = when(direction) {
        "NORTH" -> BoundingBox(0f, -0.5f, 0f, room.width.toFloat(), 0.5f, 4f)
        "SOUTH" -> BoundingBox(0f, room.depth - 0.5f, 0f, room.width.toFloat(), room.depth + 0.5f, 4f)
        "EAST"  -> BoundingBox(room.width - 0.5f, 0f, 0f, room.width + 0.5f, room.depth.toFloat(), 4f)
        "WEST"  -> BoundingBox(-0.5f, 0f, 0f, 0.5f, room.depth.toFloat(), 4f)
        else    -> BoundingBox(0f,0f,0f,0f,0f,0f)
    }

    private fun entryPositionFor(direction: String, room: RoomDefinition): Vec3f = when(direction) {
        "NORTH" -> Vec3f(room.width / 2f, room.depth - 1f, 0f)
        "SOUTH" -> Vec3f(room.width / 2f, 1f, 0f)
        "EAST"  -> Vec3f(1f, room.depth / 2f, 0f)
        "WEST"  -> Vec3f(room.width - 1f, room.depth / 2f, 0f)
        else    -> Vec3f(1f, 1f, 0f)
    }
}

data class RoomTransition(val targetRoomId: String, val entryPosition: Vec3f)
```

Commit: `feat(domain): RoomMap + NavigationSystem for room transitions`
```

---

## ════════════════════════════════════════
## PHASE 12 — WIN CONDITION (Day 2, ~2 hours)
## ════════════════════════════════════════

---

### ✅ PROMPT 12-A (existed): Day/Night Cycle (Transformation Timer)

```
Create: domain/src/commonMain/.../system/TimeSystem.kt

KNIGHT LORE MECHANIC: Player has 40 "days" (each ~60 seconds).
At nightfall → auto transform to wolf. Dawn → back to human.
Run out of days → permanent wolf → GAME OVER.

```kotlin
data class TimeState(
    val dayNumber: Int = 1,         // 1..40
    val dayProgress: Float = 0f,    // 0.0 (dawn) → 1.0 (dusk)
    val isNight: Boolean = false,
    val daysRemaining: Int = 40
) {
    val isDay get() = !isNight
}

object TimeSystem {
    const val DAY_DURATION_SECONDS = 60f
    const val NIGHT_DURATION_SECONDS = 20f

    fun update(time: TimeState, player: PlayerState, dt: Float): Pair<TimeState, PlayerState> {
        val duration = if (time.isNight) NIGHT_DURATION_SECONDS else DAY_DURATION_SECONDS
        val newProgress = time.dayProgress + dt / duration

        return if (newProgress >= 1f) {
            val newIsNight = !time.isNight
            val newDay = if (!newIsNight) time.dayNumber + 1 else time.dayNumber
            val newDaysLeft = if (!newIsNight) time.daysRemaining - 1 else time.daysRemaining

            val newTransform = if (newIsNight) TransformState.TRANSFORMING else TransformState.HUMAN
            time.copy(dayNumber=newDay, dayProgress=0f, isNight=newIsNight, daysRemaining=newDaysLeft) to
            player.copy(transformState=newTransform)
        } else {
            time.copy(dayProgress=newProgress) to player
        }
    }
}
```

Commit: `feat(domain): day/night cycle with 40-day countdown`
```

---

### ✅ PROMPT 12-B (existed): Cauldron Quest & Win Condition

```
Create: domain/src/commonMain/.../system/QuestSystem.kt

KNIGHT LORE WIN: Carry required items to cauldron room, drop them one by one.
14 items total (7 types × 2 of each). Each drop shows next needed item.

```kotlin
val QUEST_ITEMS = listOf(
    "CROWN", "CROWN",
    "SKULL", "SKULL",
    "CANDLE", "CANDLE",
    "BOOK", "BOOK",
    "COIN", "COIN",
    "KEY", "KEY",
    "AMULET", "AMULET"
)

data class QuestState(
    val requiredItems: List<String> = QUEST_ITEMS,
    val depositedCount: Int = 0,
    val complete: Boolean = false
) {
    val nextRequired get() = requiredItems.getOrNull(depositedCount)
    val progress get() = depositedCount.toFloat() / requiredItems.size
}

object QuestSystem {
    const val CAULDRON_RADIUS = 1.5f

    fun tryDeposit(
        player: PlayerState,
        cauldronPos: Vec3f,
        quest: QuestState,
        input: InputState
    ): Pair<PlayerState, QuestState> {
        if (!input.dropPressed) return player to quest
        if (distXY(player.position, cauldronPos) > CAULDRON_RADIUS) return player to quest

        val needed = quest.nextRequired ?: return player to quest
        if (!player.inventory.contains(needed)) return player to quest

        val newPlayer = player.copy(inventory = player.inventory - needed)
        val newQuest = quest.copy(
            depositedCount = quest.depositedCount + 1,
            complete = quest.depositedCount + 1 >= quest.requiredItems.size
        )
        return newPlayer to newQuest
    }
}
```

Win screen: show "GO FORTH TO MIRE MARE" when quest.complete == true

Commit: `feat(domain): cauldron quest system + win condition`
```

---

## ════════════════════════════════════════
## PHASE 13 — FULL GAME (Day 3-4, ~4 hours)
## ════════════════════════════════════════

---

### ✅ PROMPT 13-A (existed): Enemy AI System

```
Create:
- domain/src/commonMain/.../entity/EnemyState.kt
- domain/src/commonMain/.../system/EnemyAiSystem.kt

3 ENEMY TYPES from original Knight Lore:
1. MUMMY — patrol waypoints, chases if player within 2.5 tiles
2. KNIGHT — patrols, charges player on sight, melee
3. GHOST — phases through walls, tracks player directly

```kotlin
data class EnemyState(
    val id: String,
    val type: EnemyType,
    val position: Vec3f,
    val velocity: Vec3f = Vec3f.ZERO,
    val waypoints: List<Vec3f> = emptyList(),
    val currentWaypoint: Int = 0,
    val mode: AiMode = AiMode.PATROL,
    val activeTicks: Int = 0
)

enum class EnemyType { MUMMY, KNIGHT, GHOST }
enum class AiMode { PATROL, CHASE, RETURN }

object EnemyAiSystem {
    const val DETECT_RADIUS = 2.5f
    const val LOSE_RADIUS = 5.0f
    const val MUMMY_SPEED = 2f
    const val KNIGHT_SPEED = 3.5f
    const val GHOST_SPEED = 2.5f

    fun update(enemies: List<EnemyState>, player: PlayerState, dt: Float): List<EnemyState> =
        enemies.map { updateEnemy(it, player, dt) }

    private fun updateEnemy(enemy: EnemyState, player: PlayerState, dt: Float): EnemyState {
        val dist = distXY(enemy.position, player.position)
        val newMode = when {
            dist < DETECT_RADIUS -> AiMode.CHASE
            enemy.mode == AiMode.CHASE && dist > LOSE_RADIUS -> AiMode.PATROL
            else -> enemy.mode
        }
        val speed = when(enemy.type) { EnemyType.MUMMY -> MUMMY_SPEED; EnemyType.KNIGHT -> KNIGHT_SPEED; else -> GHOST_SPEED }
        val target = if (newMode == AiMode.CHASE) player.position else enemy.waypoints.getOrNull(enemy.currentWaypoint) ?: enemy.position
        val dir = (target - enemy.position).normalizeXY()
        val newPos = enemy.position + dir * speed * dt
        val nextWaypoint = if (newMode == AiMode.PATROL && distXY(newPos, target) < 0.3f)
            (enemy.currentWaypoint + 1) % maxOf(1, enemy.waypoints.size)
        else enemy.currentWaypoint

        return enemy.copy(position=newPos, mode=newMode, currentWaypoint=nextWaypoint)
    }
}
```

Commit: `feat(domain): EnemyAiSystem with Mummy/Knight/Ghost AI`
```

---

### ✅ PROMPT 13-B (existed): Health & Damage System

```
Create: domain/src/commonMain/.../system/HealthSystem.kt

```kotlin
object HealthSystem {
    const val INVINCIBLE_TICKS = 120  // 2 seconds at 60Hz
    const val FALL_DEATH_VELOCITY = -18f  // z velocity on landing

    fun update(player: PlayerState, enemies: List<EnemyState>, room: RoomState): PlayerState {
        // Invincibility cooldown active
        if (player.invincibleTicks > 0) return player

        // Enemy contact damage
        val enemyHit = enemies.any { enemy ->
            distXY(player.position, enemy.position) < 0.8f &&
            abs(player.position.z - enemy.position.z) < 1.5f
        }

        // Fall damage
        val fellToDeath = player.isGrounded &&
            player.velocity.z < FALL_DEATH_VELOCITY

        val damage = if (enemyHit || fellToDeath) 1 else 0
        val newHealth = player.health - damage
        val newInvincible = if (damage > 0) INVINCIBLE_TICKS else 0

        return if (newHealth <= 0) {
            respawn(player)
        } else {
            player.copy(health=newHealth, invincibleTicks=newInvincible)
        }
    }

    private fun respawn(player: PlayerState) = player.copy(
        position = Vec3f(2f, 2f, 0f),  // room entry
        velocity = Vec3f.ZERO,
        health = 3,
        invincibleTicks = INVINCIBLE_TICKS * 2
    )
}
```

Commit: `feat(domain): HealthSystem — damage, invincibility, respawn`
```

---

### ✅ PROMPT 13-C (existed): Full GameState Orchestration

```
Create: domain/src/commonMain/.../GameEngine.kt

Wire ALL systems together:

```kotlin
class GameEngine(private val roomMap: RoomMap) {

    var state: GameState = GameState.initial()
        private set

    fun tick(input: InputState, dt: Float) {
        if (state.phase != GamePhase.PLAYING) return

        var player = state.player
        var room = state.currentRoom
        var quest = state.quest
        var time = state.time
        var enemies = state.enemies

        // 1. Time/transformation
        val (newTime, timedPlayer) = TimeSystem.update(time, player, dt)
        time = newTime; player = timedPlayer

        // 2. Movement + collision
        player = MovementSystem.update(player, input, room, dt)

        // 3. Pickup / drop
        val (afterPickup, afterRoom) = PickupSystem.tryPickup(player, room, input)
        player = afterPickup; room = afterRoom
        val (afterDrop, afterRoom2) = PickupSystem.tryDrop(player, room, input)
        player = afterDrop; room = afterRoom2

        // 4. Quest deposit
        val cauldronPos = room.cauldronPosition
        if (cauldronPos != null) {
            val (q1, qstate) = QuestSystem.tryDeposit(player, cauldronPos, quest, input)
            player = q1; quest = qstate
        }

        // 5. Enemies
        enemies = EnemyAiSystem.update(enemies, player, dt)

        // 6. Health / damage
        player = HealthSystem.update(player, enemies, room)

        // 7. Room transition
        val transition = NavigationSystem.checkTransition(player, room.definition)
        if (transition != null) {
            room = RoomState.from(roomMap.roomById(transition.targetRoomId))
            player = player.copy(position = transition.entryPosition)
            enemies = room.definition.enemies.map { EnemyState.fromDef(it) }
        }

        // 8. Win/lose phase
        val phase = when {
            quest.complete -> GamePhase.WIN
            time.daysRemaining <= 0 -> GamePhase.GAME_OVER
            player.health <= 0 -> GamePhase.GAME_OVER
            else -> GamePhase.PLAYING
        }

        state = state.copy(
            player=player, currentRoom=room, quest=quest,
            time=time, enemies=enemies, phase=phase
        )
    }
}
```

Commit: `feat(domain): GameEngine orchestrates all systems`
```

---

## ════════════════════════════════════════
## PHASE 14 — CI & CODE QUALITY
## ════════════════════════════════════════

---

### ✅ PROMPT 14-A (existed): GitHub Actions CI + Detekt

```
Create: .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: ~/.gradle/caches
          key: gradle-${{ hashFiles('**/*.gradle.kts') }}
      - name: Detekt
        run: ./gradlew detekt
      - name: Unit Tests
        run: ./gradlew jvmTest
      - name: Build Debug
        run: ./gradlew assembleDebug
```

Also add detekt config: `config/detekt/detekt.yml`
- Disable `MagicNumber` for render/TileMetrics files
- Enable `ComplexMethod`, `LongParameterList`

Commit: `ci: GitHub Actions + detekt static analysis`
```

---

## TESTING CHECKLIST (Run After Each Phase)

### Phase 10.5 ✅
- [x] Room 1 exits = curved archways with dark void behind gap
- [x] Platforms have collectible items (crystal ball + gem on cauldron platform)
- [x] Depth sorting unified — blocks/actors/player interleave by depthKey
- [x] Human = pith helmet explorer, Wolf = hunched beast with ears
- [x] Walls = 3 blocks tall with top-edge highlight (was 2, isTop bug fixed)

### Phase 11 ✅ (already existed)
- [x] 60Hz physics update, smooth render interpolation
- [x] Jump tap = short hop, jump hold = full jump
- [x] Pick up item with action button
- [x] Walk to exit → triggers room transition

### Phase 12 ✅ (already existed)
- [x] Dawn/dusk timer visible in HUD
- [x] Night falls → character transforms
- [x] Drop item in cauldron → quest progress updates
- [x] 14 items deposited → WIN screen

### Phase 13 ✅ (already existed)
- [x] Patrol enemies chase when player nearby
- [x] Enemy contact → life lost → invincibility flash
- [x] Hazard contact → damage/respawn
- [x] Room navigation via exits

---

## SUMMARY TABLE

| Phase | Time | Milestone |
|-------|------|-----------|
| 10.5 | 1 hour | Rooms look and feel correct |
| 11 | 2 hours | Walk, jump, carry items, change rooms |
| 12 | 2 hours | Quest + win condition playable |
| 13 | 4 hours | Full faithful clone |
| 14 | 30 min | CI + code quality |

**Total**: ~10 hours Claude Code work across 4 sessions.
