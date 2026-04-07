# Player Character Redesign — Full Code Spec

Date: 2026-04-08  
Target file: `render/src/commonMain/kotlin/com/palacesoft/knightlore/render/scene/RoomEntityFactory.kt`  
Target function: `buildPlayerCommands()`

**Problem:** The character looks ridiculous. Specific issues:
- The **human form** reads as a floating yellow blob with a novelty hat. The pith-helmet explorer aesthetic clashes with the dark plague-castle setting. The body is a uniform flat rectangle. No silhouette reads at a glance.
- The **werewolf form** is oversized, the `ws=1.4f` scale multiplier makes everything disproportionately wide, the fur texture lines are invisible horizontal hairlines, and the tail is a disconnected triangle fragment.
- Both forms lack a readable **isometric silhouette** — the character should read as a small humanoid figure from a fixed 3/4 top-down view, not a flat stacked collection of rects and ovals.
- The **walk animation** barely moves anything visible.
- Colours are too saturated and light — they don't integrate with the dark stone castle environment.

**Goal:** A compact, readable plague-fantasy adventurer. Human form = hooded dark traveller, worn leather, visible sword pommel. Werewolf form = hunched beast that reads as dangerous and large relative to the human. Both forms share the same anchor point and screen footprint so transitions look intentional.

---

## Design Constraints

- All drawing uses existing `DrawPayload` primitives: `ColorPath`, `ColorRect`, `ColorOval`, `Line`.
- No new primitives.
- Character height: **human ~52px**, **werewolf ~60px** (taller/wider than human, not 2x).
- Anchor point: `screen` = feet position (bottom-centre of character).
- All coordinates relative to `cx = screen.x`, `cy = screen.y` (feet).
- The bob offset (`bob`) applies to the **entire character** — shift cy by bob rather than adding it to every individual line.
- Walk cycle uses the existing `walkFrame` and `leftLegFwd`/`rightLegFwd` values.

---

## Colour Palette

Add these to `CastleColors` (or keep in `buildPlayerCommands` as locals):

```kotlin
// Human form — dark plague traveller
val HUMAN_CLOAK_BASE    = 0xFF_2A2820.toInt()  // very dark brown-black cloak
val HUMAN_CLOAK_SHADOW  = 0xFF_161410.toInt()  // cloak shadow/fold
val HUMAN_CLOAK_EDGE    = 0xFF_3E3A30.toInt()  // cloak edge catch-light
val HUMAN_LEATHER       = 0xFF_3A2E1A.toInt()  // dark worn leather (belt, bracers)
val HUMAN_LEATHER_WORN  = 0xFF_5A4828.toInt()  // lighter worn patch
val HUMAN_SKIN          = 0xFF_C8A870.toInt()  // dusky warm skin
val HUMAN_METAL         = 0xFF_707880.toInt()  // dull iron (helmet, sword pommel)
val HUMAN_METAL_SHINE   = 0xFF_A8B0B8.toInt()  // specular catch
val HUMAN_SWORD_BLADE   = 0xFF_8A9298.toInt()  // short sword blade
val HUMAN_BLINK         = 0xFF_CC2200.toInt()  // damage flash (same as CastleColors.DANGER_RED)

// Werewolf form
val WOLF_FUR_MID        = 0xFF_5A5A68.toInt()  // grey wolf body
val WOLF_FUR_DARK       = 0xFF_383844.toInt()  // underbelly, deep shadow
val WOLF_FUR_LIGHT      = 0xFF_787888.toInt()  // shoulder/back highlight
val WOLF_CLAW           = 0xFF_C8C8B8.toInt()  // pale bone claws
val WOLF_EYE            = 0xFF_FF4400.toInt()  // burning amber-red
val WOLF_FANG           = 0xFF_E8E8D8.toInt()  // ivory fang
```

---

## Shared Setup (top of `buildPlayerCommands`)

Keep existing logic for:
- `player`, `screen`, `dk`, `blinking`, `isWerewulf`, `transforming`, `bob`
- `walkFrame`, `isMoving`, `isAirborne`, `leftLegFwd`, `rightLegFwd`, `legHeightMul`

Change:
```kotlin
// OLD: val ox = screen.x; val oy = screen.y
// NEW: anchor at feet, bob applied to whole character via cy offset
val cx = screen.x
val cy = screen.y - bob  // shift entire character up/down with breath/walk bob
```

This means **remove `+ bob`** from every individual DrawCommand below — it is now baked into `cy`.

---

## Shadow

Keep existing shadow logic, but update colours and make it slightly smaller:
```kotlin
val shadowW = if (isAirborne) 16f else 22f
val shadowH = if (isAirborne) 5f  else 7f
commands += DrawCommand(DrawLayer.FLOOR, dk, -1, "player_shadow",
    Vec2f(cx - shadowW / 2f, screen.y - shadowH / 2f),  // shadow stays at screen.y (no bob)
    DrawPayload.ColorOval(shadowW, shadowH, 0x44_000000.toInt()))
```

---

## Human Form — Plague Traveller

Remove the pith-helmet explorer entirely. Replace with a **hooded dark figure** wearing a
short iron sallet helmet (no plume, no wide brim), dark wool cloak, leather belt with
visible sword scabbard on the left hip.

All `y` coordinates are **relative to `cy` (feet)**. Negative = up.

```kotlin
if (!isWerewulf) {

    val blink = blinking
    val cloakBase   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_BASE
    val cloakEdge   = if (blink) HUMAN_BLINK else HUMAN_CLOAK_EDGE
    val cloakShadow = if (blink) HUMAN_BLINK else HUMAN_CLOAK_SHADOW
    val skinColor   = if (blink) HUMAN_BLINK else HUMAN_SKIN
    val metalColor  = if (blink) HUMAN_BLINK else HUMAN_METAL

    // ── LEGS (boots) ─────────────────────────────────────────────────────
    // Two dark boot rects, with walk-cycle fore/aft offset on Y
    // Boots are 7px wide, 11px tall — compact, not chunky office-block legs
    val bootColor = if (blink) HUMAN_BLINK else 0xFF_1E1A14.toInt()
    val legH = (11f * legHeightMul)
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
        Vec2f(cx - 9f, cy - legH + leftLegFwd),
        DrawPayload.ColorRect(7f, legH, bootColor))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
        Vec2f(cx + 2f, cy - legH + rightLegFwd),
        DrawPayload.ColorRect(7f, legH, bootColor))
    // Boot highlight — thin 1px lighter line on top edge of each boot
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_boot_l_hl",
        Vec2f(cx - 9f, cy - legH + leftLegFwd),
        DrawPayload.Line(cx - 9f, cy - legH + leftLegFwd, cx - 2f, cy - legH + leftLegFwd, 0xFF_3A3228.toInt(), 1f))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_boot_r_hl",
        Vec2f(cx + 2f, cy - legH + rightLegFwd),
        DrawPayload.Line(cx + 2f, cy - legH + rightLegFwd, cx + 9f, cy - legH + rightLegFwd, 0xFF_3A3228.toInt(), 1f))

    // ── CLOAK BODY ────────────────────────────────────────────────────────
    // The cloak is the dominant shape — a wide polygon that narrows at the shoulders.
    // It hides the body geometry underneath, which is correct for a cloaked figure.
    // Shape: trapezoidal — wider at hem (cy-12), narrower at shoulder (cy-44)
    val cloakHemL  = cx - 13f;  val cloakHemR  = cx + 13f
    val cloakShouL = cx - 9f;   val cloakShouR = cx + 9f
    val hemY       = cy - 12f
    val shouY      = cy - 44f
    val cloakPts = listOf(
        Vec2f(cloakHemL, hemY),
        Vec2f(cloakHemR, hemY),
        Vec2f(cloakShouR, shouY),
        Vec2f(cloakShouL, shouY),
    )
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_cloak",
        Vec2f(cloakHemL, hemY), DrawPayload.ColorPath(cloakPts, cloakBase))

    // Cloak centre fold — dark shadow line down the middle
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_fold",
        Vec2f(cx, hemY),
        DrawPayload.Line(cx, hemY, cx - 1f, shouY, cloakShadow, 1f))

    // Cloak left edge catch-light
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_cloak_edge_l",
        Vec2f(cloakHemL, hemY),
        DrawPayload.Line(cloakHemL, hemY, cloakShouL, shouY, cloakEdge, 0.8f))

    // ── BELT & SCABBARD ───────────────────────────────────────────────────
    val beltY = cy - 20f
    commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_belt",
        Vec2f(cx - 10f, beltY),
        DrawPayload.ColorRect(20f, 3f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
    // Buckle — small rect, left of centre
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_buckle",
        Vec2f(cx - 4f, beltY - 1f),
        DrawPayload.ColorRect(4f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER_WORN))
    // Scabbard — thin dark rectangle, angled left hip
    // Drawn from belt to leg level, 3px wide
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_scabbard",
        Vec2f(cx - 12f, beltY + 2f),
        DrawPayload.ColorRect(3f, 10f, if (blink) HUMAN_BLINK else 0xFF_1A1810.toInt()))
    // Sword pommel — small oval at top of scabbard (below belt)
    commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_pommel",
        Vec2f(cx - 14f, beltY + 1f),
        DrawPayload.ColorOval(5f, 4f, if (blink) HUMAN_BLINK else HUMAN_METAL))

    // ── ARMS ──────────────────────────────────────────────────────────────
    // Arms emerge from sides of cloak, cloak-coloured (same as body)
    // Left arm hangs slightly forward; right arm is partly behind cloak
    val armTopY = cy - 40f
    val armBotY = cy - 24f
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
        Vec2f(cx - 15f, armTopY + leftLegFwd * 0.4f),
        DrawPayload.ColorRect(5f, armBotY - armTopY, cloakBase))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
        Vec2f(cx + 10f, armTopY + rightLegFwd * 0.4f),
        DrawPayload.ColorRect(5f, armBotY - armTopY, cloakBase))
    // Gloved hand — dark leather oval at end of each arm
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_l",
        Vec2f(cx - 16f, armBotY + leftLegFwd * 0.4f),
        DrawPayload.ColorOval(6f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_hand_r",
        Vec2f(cx + 10f, armBotY + rightLegFwd * 0.4f),
        DrawPayload.ColorOval(6f, 4f, if (blink) HUMAN_BLINK else HUMAN_LEATHER))

    // ── NECK ──────────────────────────────────────────────────────────────
    commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_neck",
        Vec2f(cx - 3f, cy - 50f),
        DrawPayload.ColorRect(6f, 6f, skinColor))

    // ── FACE ──────────────────────────────────────────────────────────────
    // Small oval — the face is partially shadowed by helmet brim
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_face",
        Vec2f(cx - 6f, cy - 58f),
        DrawPayload.ColorOval(12f, 10f, skinColor))

    // Eyes — two small dark dots; facing direction shifts them L/R
    val facingShift = when (player.facing.name) {
        "WEST", "NORTHWEST", "SOUTHWEST" -> -2f
        "EAST", "NORTHEAST", "SOUTHEAST" ->  2f
        else -> 0f
    }
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
        Vec2f(cx - 3f + facingShift, cy - 55f),
        DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
        Vec2f(cx + 2f + facingShift, cy - 55f),
        DrawPayload.ColorOval(2f, 2f, 0xFF_1A1410.toInt()))

    // ── SALLET HELMET ─────────────────────────────────────────────────────
    // Iron bowl helmet — no plume, short rear neck guard.
    // Much smaller than the pith helmet. Reads as medieval, not colonial.
    //
    // Bowl: rounded rect/oval, 16px wide, 10px tall, sits at cy-66 to cy-56
    commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_helm_bowl",
        Vec2f(cx - 8f, cy - 66f),
        DrawPayload.ColorOval(16f, 11f, metalColor))
    // Helmet shade — darker oval on lower half of bowl (cast shadow from brim)
    commands += DrawCommand(DrawLayer.PLAYER, dk, 7, "player_helm_shade",
        Vec2f(cx - 6f, cy - 60f),
        DrawPayload.ColorOval(12f, 5f, if (blink) HUMAN_BLINK else 0xFF_404850.toInt()))
    // Helmet highlight — specular line across top
    commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_helm_hl",
        Vec2f(cx - 5f, cy - 65f),
        DrawPayload.Line(cx - 5f, cy - 65f, cx + 3f, cy - 65f, if (blink) HUMAN_BLINK else HUMAN_METAL_SHINE, 1.2f))
    // Neck guard — small dark rect below bowl at back
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_helm_guard",
        Vec2f(cx + 4f, cy - 59f),
        DrawPayload.ColorRect(5f, 5f, if (blink) HUMAN_BLINK else 0xFF_383E44.toInt()))
    // Visor slot — single pixel-wide horizontal slit; colour changes when damaged
    val visorColor = when {
        blink              -> 0xFF_FF4400.toInt()
        else               -> 0xFF_1A1E22.toInt()
    }
    commands += DrawCommand(DrawLayer.PLAYER, dk, 8, "player_visor",
        Vec2f(cx - 5f, cy - 59f),
        DrawPayload.Line(cx - 5f, cy - 59f, cx + 2f, cy - 59f, visorColor, 1f))
}
```

---

## Werewolf Form — Hunched Grey Beast

Remove the `ws = 1.4f` scale multiplier entirely. It causes everything to be 40% too wide.
Instead, use **absolute pixel coordinates** scaled to produce a figure ~24px wide, ~60px tall.
The beast should be **clearly larger** than the human but not comically oversized.

The key visual read: broad sloped shoulders, head low and forward, haunches high, tail curved.

```kotlin
} else {
    // WEREWOLF FORM
    val blink = blinking
    val furMid   = if (blink) HUMAN_BLINK else WOLF_FUR_MID
    val furDark  = if (blink) HUMAN_BLINK else WOLF_FUR_DARK
    val furLight = if (blink) HUMAN_BLINK else WOLF_FUR_LIGHT
    val clawCol  = if (blink) HUMAN_BLINK else WOLF_CLAW
    val eyeCol   = if (blink) HUMAN_BLINK else WOLF_EYE
    val fangCol  = if (blink) HUMAN_BLINK else WOLF_FANG

    val legH = (10f * legHeightMul)

    // ── HIND LEGS ─────────────────────────────────────────────────────────
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_l",
        Vec2f(cx - 9f, cy - legH + leftLegFwd),
        DrawPayload.ColorRect(6f, legH, furDark))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_boot_r",
        Vec2f(cx + 3f, cy - legH + rightLegFwd),
        DrawPayload.ColorRect(6f, legH, furDark))
    // Foot claws — 3 small lines at base of each leg
    for (ci in 0..2) {
        val footX = cx - 10f + ci * 3f
        commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_claw_l_$ci",
            Vec2f(footX, cy),
            DrawPayload.Line(footX, cy, footX - 1f + ci * 0.5f, cy + 3f, clawCol, 0.8f))
    }
    for (ci in 0..2) {
        val footX = cx + 3f + ci * 3f
        commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_claw_r_$ci",
            Vec2f(footX, cy),
            DrawPayload.Line(footX, cy, footX - 1f + ci * 0.5f, cy + 3f, clawCol, 0.8f))
    }

    // ── BODY — hunched trapezoid ──────────────────────────────────────────
    // Wide at haunches (bottom), slightly narrower at upper back.
    // Haunches sit higher than a human hip — the beast is crouched.
    val haunchY = cy - 14f  // bottom of torso
    val backY   = cy - 42f  // top of back (shoulder blades)
    val bodyPts = listOf(
        Vec2f(cx - 14f, haunchY),   // haunch left
        Vec2f(cx + 14f, haunchY),   // haunch right
        Vec2f(cx + 11f, backY),     // shoulder right
        Vec2f(cx -  7f, backY),     // shoulder left (asymmetric — body faces right)
    )
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_body",
        Vec2f(cx - 14f, haunchY), DrawPayload.ColorPath(bodyPts, furMid))

    // Body shadow — darker panel on right flank
    val shadowPts = listOf(
        Vec2f(cx + 5f,  haunchY),
        Vec2f(cx + 14f, haunchY),
        Vec2f(cx + 11f, backY),
        Vec2f(cx +  5f, backY),
    )
    commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_body_shadow",
        Vec2f(cx + 5f, haunchY), DrawPayload.ColorPath(shadowPts, furDark))

    // Back highlight — 3 short diagonal fur-stroke lines across top of body
    // These replace the invisible horizontal hairlines. They follow the spine angle.
    for (fi in 0..2) {
        val fy  = backY + fi * 7f
        val fx  = cx - 5f + fi * 1.5f
        commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_fur_$fi",
            Vec2f(fx, fy),
            DrawPayload.Line(fx - 3f, fy, fx + 6f, fy + 2f, furLight, 0.9f))
    }

    // ── FRONT LEGS / ARMS ─────────────────────────────────────────────────
    // Arms reach forward slightly — the beast is mid-lunge
    val armTopY = cy - 38f
    val armBotY = cy - 24f
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_l",
        Vec2f(cx - 16f, armTopY + leftLegFwd * 0.5f),
        DrawPayload.ColorRect(5f, armBotY - armTopY, furMid))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 1, "player_arm_r",
        Vec2f(cx + 11f, armTopY + rightLegFwd * 0.5f),
        DrawPayload.ColorRect(5f, armBotY - armTopY, furMid))
    // Front claws — 3 lines each
    for (ci in 0..2) {
        val handX = cx - 18f + ci * 3f
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fclaw_l_$ci",
            Vec2f(handX, armBotY + leftLegFwd * 0.5f),
            DrawPayload.Line(handX, armBotY + leftLegFwd * 0.5f,
                handX - 2f + ci, armBotY + leftLegFwd * 0.5f + 4f, clawCol, 0.9f))
    }
    for (ci in 0..2) {
        val handX = cx + 11f + ci * 3f
        commands += DrawCommand(DrawLayer.PLAYER, dk, 2, "player_fclaw_r_$ci",
            Vec2f(handX, armBotY + rightLegFwd * 0.5f),
            DrawPayload.Line(handX, armBotY + rightLegFwd * 0.5f,
                handX - 2f + ci, armBotY + rightLegFwd * 0.5f + 4f, clawCol, 0.9f))
    }

    // ── HEAD — low and forward ────────────────────────────────────────────
    // The head sits LOW (not high and proud) — the beast crouches.
    // Head centre at cy-50, offset forward (cx+2) to show predatory lean.
    val headCX = cx + 2f
    val headCY = cy - 50f
    commands += DrawCommand(DrawLayer.PLAYER, dk, 3, "player_head",
        Vec2f(headCX - 9f, headCY - 7f),
        DrawPayload.ColorOval(18f, 14f, furMid))

    // Facing direction
    val facingShift = when (player.facing.name) {
        "WEST", "NORTHWEST", "SOUTHWEST" -> -3f
        "EAST", "NORTHEAST", "SOUTHEAST" ->  3f
        else -> 0f
    }

    // Snout — elongated oval, projects out from head
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_snout",
        Vec2f(headCX - 5f + facingShift, headCY - 2f),
        DrawPayload.ColorOval(12f, 7f, furDark))
    // Snout tip — slightly lighter (damp nose)
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_nose",
        Vec2f(headCX + 3f + facingShift, headCY - 1f),
        DrawPayload.ColorOval(4f, 3f, 0xFF_1A1A22.toInt()))

    // Eyes — burning amber-red, small but vivid against fur
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_l",
        Vec2f(headCX - 5f + facingShift, headCY - 6f),
        DrawPayload.ColorOval(3f, 3f, eyeCol))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_eye_r",
        Vec2f(headCX + 1f + facingShift, headCY - 6f),
        DrawPayload.ColorOval(3f, 3f, eyeCol))
    // Eye glow — very faint orange halo around each eye
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_l_glow",
        Vec2f(headCX - 7f + facingShift, headCY - 8f),
        DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_eye_r_glow",
        Vec2f(headCX - 1f + facingShift, headCY - 8f),
        DrawPayload.ColorOval(7f, 6f, 0x22_FF4400.toInt()))

    // Ears — two pointed triangles, upright and close together
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_l",
        Vec2f(headCX - 9f, headCY - 14f),
        DrawPayload.ColorPath(listOf(
            Vec2f(headCX - 9f,  headCY - 7f),
            Vec2f(headCX - 4f,  headCY - 7f),
            Vec2f(headCX - 7f,  headCY - 17f),
        ), furMid))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 4, "player_ear_r",
        Vec2f(headCX + 4f, headCY - 14f),
        DrawPayload.ColorPath(listOf(
            Vec2f(headCX + 3f,  headCY - 7f),
            Vec2f(headCX + 8f,  headCY - 7f),
            Vec2f(headCX + 6f,  headCY - 17f),
        ), furMid))
    // Inner ear — darker triangle inside each ear
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_l_in",
        Vec2f(headCX - 8f, headCY - 13f),
        DrawPayload.ColorPath(listOf(
            Vec2f(headCX - 8f, headCY - 9f),
            Vec2f(headCX - 5f, headCY - 9f),
            Vec2f(headCX - 7f, headCY - 14f),
        ), furDark))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 5, "player_ear_r_in",
        Vec2f(headCX + 4f, headCY - 13f),
        DrawPayload.ColorPath(listOf(
            Vec2f(headCX + 4f, headCY - 9f),
            Vec2f(headCX + 7f, headCY - 9f),
            Vec2f(headCX + 6f, headCY - 14f),
        ), furDark))

    // Fangs — two small downward rects below snout
    commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_l",
        Vec2f(headCX - 2f + facingShift, headCY + 2f),
        DrawPayload.ColorRect(2f, 4f, fangCol))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 6, "player_fang_r",
        Vec2f(headCX + 2f + facingShift, headCY + 2f),
        DrawPayload.ColorRect(2f, 4f, fangCol))

    // ── TAIL — curved arc (3 line segments) ──────────────────────────────
    // The tail curves UP and LEFT behind the body, not a flat fragment triangle.
    // Animated with tick for a subtle living sway.
    val tailSway = (kotlin.math.sin(state.time.tick.toDouble() * 0.08) * 3.0).toFloat()
    val t0 = Vec2f(cx + 12f,  cy - 18f)               // base at haunch
    val t1 = Vec2f(cx + 20f,  cy - 28f + tailSway)    // mid-curve
    val t2 = Vec2f(cx + 16f,  cy - 38f + tailSway * 1.5f) // tip
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_1",
        t0, DrawPayload.Line(t0.x, t0.y, t1.x, t1.y, furDark, 2.5f))
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_2",
        t1, DrawPayload.Line(t1.x, t1.y, t2.x, t2.y, furMid, 1.8f))
    // Tail tip tuft — small oval
    commands += DrawCommand(DrawLayer.PLAYER, dk, 0, "player_tail_tip",
        Vec2f(t2.x - 3f, t2.y - 3f),
        DrawPayload.ColorOval(6f, 5f, furLight))
}
```

---

## Transformation Effect — keep, minor colour update

Keep the existing ring burst and screen flash logic. Update ring colour from `0x8844CC` to
`0x6622AA` (slightly darker purple — less magenta, more sinister):

```kotlin
// Change:
val ringColor = (ringAlpha shl 24) or 0x8844CC
// To:
val ringColor = (ringAlpha shl 24) or 0x6622AA

// Change:
DrawPayload.ScreenFill((flashAlpha shl 24) or 0x8844CC)
// To:
DrawPayload.ScreenFill((flashAlpha shl 24) or 0x6622AA)
```

---

## Implementation Notes for Claude

1. Replace the entire `if (!isWerewulf) { ... } else { ... }` block inside `buildPlayerCommands()` with the new code above.
2. Change the `val cx = ox; val oy` anchor to `val cx = screen.x; val cy = screen.y - bob`.
3. Remove all `+ bob` occurrences from individual draw commands inside `buildPlayerCommands()`.
4. Shadow command stays at `screen.y` (not bobbing) for grounding effect.
5. Add colour constants at top of function (or into `CastleColors` object).
6. Keep the `buildPlayerCommands` function signature unchanged.
7. Keep all transformation ring/flash logic — only update the hex colour literals.
8. The `state.time.tick` reference in the tail sway requires `state` to be in scope — it already is via function parameter.
9. Run search after change: confirm zero occurrences of `tunicColor`, `hatColor`, `WOLF_FUR`, `legHeightMul.*ws`.

---

## Visual Effect Summary

| Before | After |
|--------|-------|
| Yellow-green blob with pith helmet | Dark cloaked figure with iron sallet helmet |
| Warm skin-coloured body rect | Cloak silhouette dominates — figure reads as dark |
| Wide pith helmet brim (colonial explorer) | Low iron bowl helm with visor slit (plague knight) |
| `ws=1.4f` causing 40%-too-wide werewolf | Absolute coordinates — proportioned ~24×60px beast |
| Invisible horizontal fur hairlines | 3 diagonal fur-stroke lines on back — visible texture |
| Disconnected tail triangle fragment | 3-segment animated curved tail with tuft tip |
| Flat uniform body rectangle | Hunched trapezoid body with shadow flank panel |
| Claws were ovals | Claw = 3 thin line-strokes per hand/foot — sharper |
| Bob offset added to every single command | Single `cy = screen.y - bob` — clean, consistent |
