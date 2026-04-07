# Knight Lore — Graphics Personality Overhaul
# ZX Spectrum Authentic Style — Claude Code Prompts

**Repo**: https://github.com/manuel-palacio/knight-lore
**Problem**: "Graphics have no personality. Flat, boring, soulless."
**Solution**: ZX Spectrum palette + dithering + outlines + shading + multi-part characters + environmental details.

Paste each STEP into Claude Code sequentially. Test after each one.

---

## STEP 1 — ZX Spectrum Palette (5 min)

```
File: core/src/commonMain/kotlin/com/palacesoft/knightlore/core/TileMetrics.kt

TASK: Add the authentic ZX Spectrum 15-color palette as a nested object.
Replace ALL magic color literals in the project with these constants.

```kotlin
object ZXPalette {
    // Standard colors
    const val BLACK    = 0xFF_000000.toInt()
    const val BLUE     = 0xFF_0000AA.toInt()
    const val RED      = 0xFF_AA0000.toInt()
    const val MAGENTA  = 0xFF_AA00AA.toInt()
    const val GREEN    = 0xFF_00AA00.toInt()
    const val CYAN     = 0xFF_00AAAA.toInt()
    const val YELLOW   = 0xFF_AA5500.toInt()
    const val WHITE    = 0xFF_AAAAAA.toInt()

    // BRIGHT variants
    const val B_BLUE    = 0xFF_0055FF.toInt()
    const val B_RED     = 0xFF_FF5555.toInt()
    const val B_MAGENTA = 0xFF_FF55FF.toInt()
    const val B_GREEN   = 0xFF_55FF55.toInt()
    const val B_CYAN    = 0xFF_55FFFF.toInt()
    const val B_YELLOW  = 0xFF_FFFF55.toInt()
    const val B_WHITE   = 0xFF_FFFFFF.toInt()

    // Semantic aliases for game use
    val STONE_DARK  = BLUE          // deep stone / shadow face
    val STONE_MID   = WHITE         // main stone face
    val STONE_LIGHT = B_WHITE       // highlight / top face
    val FLOOR_A     = BLACK         // floor checker tile A
    val FLOOR_B     = BLUE          // floor checker tile B
    val SKIN        = B_YELLOW      // Sabreman skin
    val CAPE        = RED           // Sabreman cape
    val METAL       = B_CYAN        // helmet, sword
    val WOLF_FUR    = YELLOW        // wolf body
    val WOLF_DARK   = RED           // wolf shadow
    val WOLF_EYE    = B_RED         // glowing wolf eyes
    val GOLD_ITEM   = B_YELLOW      // collectible items
    val CAULDRON    = CYAN          // cauldron
    val TORCH       = B_YELLOW      // torch flame
    val TORCH_BASE  = YELLOW        // torch bracket
}
```

Then do a project-wide search for hardcoded hex color literals (0xFF_...) in
RoomEntityFactory.kt and replace with ZXPalette.* constants.

Commit: `feat(core): authentic ZX Spectrum 15-color palette in ZXPalette`
```

---

## STEP 2 — Dithered Textures on All Surfaces (15 min)

```
File: render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt

TASK: Replace all flat ColorRect wall/floor blocks with DitheredPath for texture.
DitheredPath already exists in DrawPayload — use it.

Add this helper:

```kotlin
private fun isoDiamondPath(screenX: Float, screenY: Float, hw: Float, hh: Float): List<Vec2f> = listOf(
    Vec2f(screenX,        screenY - hh),   // top
    Vec2f(screenX + hw,   screenY),        // right
    Vec2f(screenX,        screenY + hh),   // bottom
    Vec2f(screenX - hw,   screenY),        // left
)

private fun isoTopFacePath(screenPos: Vec2f): List<Vec2f> {
    val hw = TileMetrics.HALF_TILE_WIDTH
    val hh = TileMetrics.HALF_TILE_HEIGHT
    return listOf(
        Vec2f(screenPos.x,      screenPos.y - hh),
        Vec2f(screenPos.x + hw, screenPos.y),
        Vec2f(screenPos.x,      screenPos.y + hh),
        Vec2f(screenPos.x - hw, screenPos.y),
    )
}
```

Then replace walls:

```kotlin
// OLD (boring):
DrawPayload.ColorRect(32f, 32f, 0xFF_666666.toInt())

// NEW (textured stone):
DrawPayload.DitheredPath(
    points = isoTopFacePath(screenPos),
    color1 = ZXPalette.STONE_DARK,
    color2 = ZXPalette.STONE_MID,
    horizontal = true   // brick rows
)
```

Floor tiles — checkerboard:

```kotlin
val floorColor = if ((x.toInt() + y.toInt()) % 2 == 0) ZXPalette.FLOOR_A else ZXPalette.FLOOR_B
DrawPayload.DitheredPath(
    points = isoTopFacePath(screenPos),
    color1 = floorColor,
    color2 = ZXPalette.STONE_MID,
    horizontal = false  // checkerboard
)
```

Apply to ALL walls and ALL floor tiles.

Commit: `feat(render): dithered stone textures + checker floors`
```

---

## STEP 3 — 3-Face Block Shading (20 min)

```
File: RoomEntityFactory.kt

TASK: Every solid block emits 3 faces — top (bright), left (mid), right (dark).
This makes blocks look truly 3D, not flat.

Add helper:

```kotlin
private fun emitShadedBlock(
    commands: MutableList<DrawCommand>,
    worldX: Float, worldY: Float, worldZ: Float,
    roomOffset: Vec2f,
    colorTop: Int, colorLeft: Int, colorRight: Int
) {
    val hw = TileMetrics.HALF_TILE_WIDTH
    val hh = TileMetrics.HALF_TILE_HEIGHT
    val bh = TileMetrics.BLOCK_HEIGHT
    val s  = IsoProjector.toScreen(worldX, worldY, worldZ) + roomOffset
    val depth = IsoProjector.depthKey(Vec3f(worldX, worldY, worldZ))

    // TOP face (diamond) — lightest
    commands += DrawCommand(
        layer = DrawLayer.BLOCK, depthKey = depth, priority = 2,
        entityId = "block_${worldX}_${worldY}_${worldZ}_top",
        screenPos = s,
        payload = DrawPayload.DitheredPath(
            listOf(Vec2f(s.x, s.y-hh), Vec2f(s.x+hw, s.y), Vec2f(s.x, s.y+hh), Vec2f(s.x-hw, s.y)),
            colorTop, ZXPalette.B_WHITE, horizontal = false
        )
    )

    // LEFT face (parallelogram south-west) — mid
    commands += DrawCommand(
        layer = DrawLayer.BLOCK, depthKey = depth, priority = 1,
        entityId = "block_${worldX}_${worldY}_${worldZ}_left",
        screenPos = s,
        payload = DrawPayload.ColorPath(
            listOf(Vec2f(s.x-hw, s.y), Vec2f(s.x, s.y+hh), Vec2f(s.x, s.y+hh+bh), Vec2f(s.x-hw, s.y+bh)),
            colorLeft, shadowColorArgb = ZXPalette.BLACK
        )
    )

    // RIGHT face (parallelogram south-east) — darkest
    commands += DrawCommand(
        layer = DrawLayer.BLOCK, depthKey = depth, priority = 1,
        entityId = "block_${worldX}_${worldY}_${worldZ}_right",
        screenPos = s,
        payload = DrawPayload.ColorPath(
            listOf(Vec2f(s.x+hw, s.y), Vec2f(s.x, s.y+hh), Vec2f(s.x, s.y+hh+bh), Vec2f(s.x+hw, s.y+bh)),
            colorRight, shadowColorArgb = ZXPalette.BLACK
        )
    )
}
```

Usage for stone wall:
```kotlin
emitShadedBlock(commands, x, y, z, roomOffset,
    colorTop   = ZXPalette.STONE_LIGHT,
    colorLeft  = ZXPalette.STONE_MID,
    colorRight = ZXPalette.STONE_DARK
)
```

Replace ALL emitBlock() calls with emitShadedBlock().

Commit: `feat(render): 3-face shaded blocks (top/left/right lighting)`
```

---

## STEP 4 — Black Outlines on Everything (10 min)

```
File: RoomEntityFactory.kt

TASK: Every block gets a 1px black outline for crisp ZX Spectrum pop.
Add outline ColorPath AFTER each block's 3 faces.

```kotlin
private fun emitBlockOutline(
    commands: MutableList<DrawCommand>,
    worldX: Float, worldY: Float, worldZ: Float,
    roomOffset: Vec2f
) {
    val hw = TileMetrics.HALF_TILE_WIDTH
    val hh = TileMetrics.HALF_TILE_HEIGHT
    val bh = TileMetrics.BLOCK_HEIGHT
    val s  = IsoProjector.toScreen(worldX, worldY, worldZ) + roomOffset
    val depth = IsoProjector.depthKey(Vec3f(worldX, worldY, worldZ))

    // Outline all 6 visible edges
    val edges = listOf(
        // Top diamond
        s.x to s.y - hh, s.x + hw to s.y,
        s.x to s.y + hh, s.x - hw to s.y,
        // Left side
        s.x - hw to s.y, s.x - hw to s.y + bh,
        s.x to s.y + hh + bh,
        // Right side
        s.x + hw to s.y, s.x + hw to s.y + bh,
        s.x to s.y + hh + bh
    )

    commands += DrawCommand(
        layer = DrawLayer.BLOCK, depthKey = depth + 1, priority = 10,
        entityId = "outline_${worldX}_${worldY}_${worldZ}",
        screenPos = s,
        payload = DrawPayload.ColorPath(
            edges.chunked(2).map { Vec2f(it[0].first, it[0].second) },
            ZXPalette.BLACK
        )
    )
}
```

Call emitBlockOutline() after every emitShadedBlock().

Commit: `feat(render): black outlines on all blocks — ZX Spectrum crisp look`
```

---

## STEP 5 — Multi-Part Sabreman + Wolf Character (20 min)

```
Find player DrawCommand emission code.

TASK: Replace single ColorRect with 5-part composed character.

HUMAN SABREMAN:
```kotlin
fun emitHumanPlayer(commands: MutableList<DrawCommand>, pos: Vec3f, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(pos) + roomOffset
    val d = IsoProjector.depthKey(pos.copy(z = 0f))
    val id = "player"

    // Cape (behind — emit first, lower priority)
    commands += cmd(d, id+"_cape", s.copy(x=s.x-6f, y=s.y-28f),
        DrawPayload.ColorRect(20f, 32f, ZXPalette.CAPE), DrawLayer.PLAYER, priority = 0)

    // Legs
    commands += cmd(d, id+"_legs", s.copy(x=s.x-8f, y=s.y-12f),
        DrawPayload.ColorRect(16f, 24f, ZXPalette.METAL), DrawLayer.PLAYER, priority = 1)

    // Body
    commands += cmd(d, id+"_body", s.copy(x=s.x-10f, y=s.y-40f),
        DrawPayload.ColorRect(20f, 28f, ZXPalette.B_CYAN), DrawLayer.PLAYER, priority = 2)

    // Helmet
    commands += cmd(d, id+"_helm", s.copy(x=s.x-12f, y=s.y-56f),
        DrawPayload.ColorRect(24f, 18f, ZXPalette.METAL), DrawLayer.PLAYER, priority = 3)

    // Eye slit
    commands += cmd(d, id+"_eye", s.copy(x=s.x-4f, y=s.y-50f),
        DrawPayload.ColorRect(8f, 4f, ZXPalette.BLACK), DrawLayer.PLAYER, priority = 4)

    // Sword
    commands += cmd(d, id+"_sword", s.copy(x=s.x+10f, y=s.y-44f),
        DrawPayload.ColorRect(4f, 36f, ZXPalette.B_WHITE), DrawLayer.PLAYER, priority = 5)
}
```

WOLF FORM:
```kotlin
fun emitWolfPlayer(commands: MutableList<DrawCommand>, pos: Vec3f, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(pos) + roomOffset
    val d = IsoProjector.depthKey(pos.copy(z = 0f))
    val id = "player"

    // Body (wide, crouched)
    commands += cmd(d, id+"_body", s.copy(x=s.x-16f, y=s.y-24f),
        DrawPayload.DitheredPath(
            rectPath(s.x-16f, s.y-24f, 36f, 32f),
            ZXPalette.WOLF_FUR, ZXPalette.WOLF_DARK, horizontal=false
        ), DrawLayer.PLAYER, priority = 1)

    // Head (snarling)
    commands += cmd(d, id+"_head", s.copy(x=s.x-10f, y=s.y-44f),
        DrawPayload.DitheredPath(
            rectPath(s.x-10f, s.y-44f, 24f, 22f),
            ZXPalette.WOLF_FUR, ZXPalette.WOLF_DARK, horizontal=false
        ), DrawLayer.PLAYER, priority = 2)

    // Glowing red eyes
    commands += cmd(d, id+"_eye_l", s.copy(x=s.x-6f, y=s.y-42f),
        DrawPayload.ColorOval(6f, 6f, ZXPalette.WOLF_EYE), DrawLayer.PLAYER, priority = 3)
    commands += cmd(d, id+"_eye_r", s.copy(x=s.x+2f, y=s.y-42f),
        DrawPayload.ColorOval(6f, 6f, ZXPalette.WOLF_EYE), DrawLayer.PLAYER, priority = 4)

    // Fangs
    commands += cmd(d, id+"_fang_l", s.copy(x=s.x-4f, y=s.y-30f),
        DrawPayload.ColorRect(4f, 8f, ZXPalette.B_WHITE), DrawLayer.PLAYER, priority = 5)
    commands += cmd(d, id+"_fang_r", s.copy(x=s.x+2f, y=s.y-30f),
        DrawPayload.ColorRect(4f, 8f, ZXPalette.B_WHITE), DrawLayer.PLAYER, priority = 6)

    // Claws (front)
    commands += cmd(d, id+"_claw_l", s.copy(x=s.x-14f, y=s.y-8f),
        DrawPayload.ColorPath(listOf(Vec2f(0f,0f), Vec2f(-4f,12f), Vec2f(4f,12f)),
            ZXPalette.B_WHITE), DrawLayer.PLAYER, priority = 7)
    commands += cmd(d, id+"_claw_r", s.copy(x=s.x+10f, y=s.y-8f),
        DrawPayload.ColorPath(listOf(Vec2f(0f,0f), Vec2f(-4f,12f), Vec2f(4f,12f)),
            ZXPalette.B_WHITE), DrawLayer.PLAYER, priority = 8)
}
```

Add helper:
```kotlin
private fun cmd(depth: Int, id: String, pos: Vec2f, payload: DrawPayload,
                layer: DrawLayer, priority: Int = 0) =
    DrawCommand(layer=layer, depthKey=depth, priority=priority, entityId=id, screenPos=pos, payload=payload)
```

Dispatch in render:
```kotlin
when (player.transformState) {
    TransformState.HUMAN -> emitHumanPlayer(commands, player.position, roomOffset)
    TransformState.WOLF  -> emitWolfPlayer(commands, player.position, roomOffset)
    TransformState.TRANSFORMING -> {
        // Blend — emit both at 50% alpha
        emitHumanPlayer(commands, player.position, roomOffset)
    }
}
```

Commit: `feat(render): multi-part Sabreman human/wolf with ZX Spectrum aesthetic`
```

---

## STEP 6 — Environmental Details (30 min)

```
File: RoomEntityFactory.kt

TASK: Add environmental detail emitters. Call them from room definitions.

```kotlin
// Torch (flame + wall bracket)
private fun emitTorch(commands: MutableList<DrawCommand>, x: Float, y: Float, wallZ: Float, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(x, y, wallZ + 1.5f) + roomOffset
    val d = IsoProjector.depthKey(Vec3f(x, y, wallZ + 1.5f))

    // Wall bracket
    commands += DrawCommand(DrawLayer.BLOCK, d, 0, "torch_bracket_${x}_${y}",
        s.copy(y=s.y+8f), DrawPayload.ColorRect(6f, 12f, ZXPalette.TORCH_BASE))

    // Flame (teardrop shape)
    commands += DrawCommand(DrawLayer.EFFECT, d+1, 0, "torch_flame_outer_${x}_${y}",
        s, DrawPayload.ColorOval(12f, 20f, ZXPalette.TORCH))
    commands += DrawCommand(DrawLayer.EFFECT, d+2, 0, "torch_flame_inner_${x}_${y}",
        s.copy(y=s.y+4f), DrawPayload.ColorOval(6f, 10f, ZXPalette.B_WHITE))
}

// Floor crack (character, age)
private fun emitFloorCrack(commands: MutableList<DrawCommand>, x: Float, y: Float, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(x, y, 0f) + roomOffset
    val d = IsoProjector.depthKey(Vec3f(x, y, 0f))
    commands += DrawCommand(DrawLayer.FLOOR, d+1, 0, "crack_${x}_${y}", s,
        DrawPayload.Line(s.x-8f, s.y-4f, s.x+6f, s.y+6f, ZXPalette.BLACK, 1.5f))
    commands += DrawCommand(DrawLayer.FLOOR, d+1, 0, "crack2_${x}_${y}", s,
        DrawPayload.Line(s.x+6f, s.y+6f, s.x+10f, s.y+2f, ZXPalette.BLACK, 1.5f))
}

// Spiderweb (corner detail)
private fun emitSpiderweb(commands: MutableList<DrawCommand>, cornerX: Float, cornerY: Float, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(cornerX, cornerY, 2.5f) + roomOffset
    val d = IsoProjector.depthKey(Vec3f(cornerX, cornerY, 2.5f))
    val spokes = (0..5).map { i ->
        val angle = i * Math.PI / 3
        Vec2f(s.x + (cos(angle) * 14).toFloat(), s.y + (sin(angle) * 10).toFloat())
    }
    spokes.forEach { spoke ->
        commands += DrawCommand(DrawLayer.FOREGROUND, d, 0, "web_${cornerX}_${cornerY}_${spoke.x}",
            s, DrawPayload.Line(s.x, s.y, spoke.x, spoke.y, ZXPalette.B_WHITE, 0.8f))
    }
}

// Puddle (moisture)
private fun emitPuddle(commands: MutableList<DrawCommand>, x: Float, y: Float, roomOffset: Vec2f) {
    val s = IsoProjector.toScreen(x, y, 0.01f) + roomOffset
    val d = IsoProjector.depthKey(Vec3f(x, y, 0f))
    commands += DrawCommand(DrawLayer.FLOOR, d+1, 0, "puddle_${x}_${y}", s,
        DrawPayload.ColorOval(22f, 10f, 0x55_0055AA.toInt()))  // semi-transparent
}
```

In room 1, add:
```kotlin
emitTorch(commands, 0f, 2f, 1f, roomOffset)
emitTorch(commands, 3f, 5f, 1f, roomOffset)
emitFloorCrack(commands, 1.5f, 1.5f, roomOffset)
emitFloorCrack(commands, 3f, 3f, roomOffset)
emitSpiderweb(commands, 0f, 0f, roomOffset)
emitPuddle(commands, 2f, 4f, roomOffset)
```

Commit: `feat(render): environmental details — torches, cracks, webs, puddles`
```

---

## STEP 7 — Screen Scanline Effect + Vignette (10 min)

```
Find the scene renderer (CanvasSceneRenderer or equivalent in app/desktop).

TASK: Add CRT scanline effect + vignette for retro personality.

```kotlin
// After all game DrawCommands, add HUD layer effects:

// Scanlines (every 2px horizontal line, 15% black)
for (lineY in 0 until viewportH.toInt() step 2) {
    commands += DrawCommand(
        layer = DrawLayer.HUD, depthKey = 999990, priority = 0,
        entityId = "scan_$lineY", screenPos = Vec2f(0f, lineY.toFloat()),
        payload = DrawPayload.Line(
            x1 = 0f, y1 = lineY.toFloat(),
            x2 = viewportW, y2 = lineY.toFloat(),
            colorArgb = 0x26_000000.toInt(),  // 15% black
            strokeWidth = 1f
        )
    )
}

// Vignette corners (ScreenFill gradient — use corner rects)
listOf(
    Vec2f(0f, 0f), Vec2f(viewportW - 60f, 0f),
    Vec2f(0f, viewportH - 60f), Vec2f(viewportW - 60f, viewportH - 60f)
).forEachIndexed { i, pos ->
    commands += DrawCommand(DrawLayer.HUD, 999995, 0, "vignette_$i", pos,
        DrawPayload.ColorRect(60f, 60f, 0x88_000000.toInt()))
}
```

Commit: `feat(render): CRT scanlines + vignette for retro ZX atmosphere`
```

---

## Visual Impact Per Step

| Step | Before | After | Time |
|------|--------|-------|------|
| 1 ZX Palette | Random grays | Authentic retro colors | 5 min |
| 2 Dithering | Flat fills | Textured stone + checker floors | 15 min |
| 3 3-Face Shading | Flat blocks | True 3D cubes | 20 min |
| 4 Outlines | Blurry edges | Crisp ZX pixel art look | 10 min |
| 5 Character Parts | Colored blob | Detailed Sabreman + menacing wolf | 20 min |
| 6 Environment | Empty rooms | Torches, webs, cracks, puddles | 30 min |
| 7 CRT Effect | Clean modern | Authentic retro feel | 10 min |

**Total: ~1h50min → From "soulless prototype" to "vibrant retro dungeon"**

## Commit Sequence
```
feat(core): authentic ZX Spectrum 15-color palette       [Step 1]
feat(render): dithered stone textures + checker floors   [Step 2]
feat(render): 3-face shaded blocks — true 3D cubes       [Step 3]
feat(render): black outlines — crisp ZX pixel art look   [Step 4]
feat(render): multi-part Sabreman human + wolf           [Step 5]
feat(render): torches, cracks, webs, puddles             [Step 6]
feat(render): CRT scanlines + vignette                   [Step 7]
```
