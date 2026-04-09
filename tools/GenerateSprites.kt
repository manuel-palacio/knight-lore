/**
 * Generates pixel art sprite sheets for Knight Lore.
 * Run: kotlinc -script tools/GenerateSprites.kt
 * Or: cd tools && kotlinc GenerateSprites.kt -include-runtime -d gen.jar && java -jar gen.jar
 *
 * Simpler: just run as a JVM main from desktop module.
 */
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

// ── Colors ──────────────────────────────────────────────────────────────
val HAT_MAIN = Color(0x8A, 0x68, 0x30)
val HAT_DARK = Color(0x5A, 0x44, 0x20)
val HAT_BAND = Color(0xB0, 0x88, 0x40)
val SKIN     = Color(0xE8, 0xC8, 0x80)
val EYE_W    = Color(0xFF, 0xFF, 0xFF)
val EYE_P    = Color(0x10, 0x10, 0x10)
val TUNIC    = Color(0x58, 0x88, 0xB8)
val TUNIC_D  = Color(0x3A, 0x60, 0x90)
val BOOTS    = Color(0x6A, 0x48, 0x28)
val BOOTS_D  = Color(0x4A, 0x30, 0x18)
val TRANS    = Color(0, 0, 0, 0)

// Wolf colors
val FUR      = Color(0x6A, 0x5A, 0x48)
val FUR_D    = Color(0x3A, 0x2E, 0x24)
val FUR_L    = Color(0x8A, 0x78, 0x60)
val WEYE     = Color(0xFF, 0x44, 0x00)
val FANG     = Color(0xE0, 0xD8, 0xC0)

fun BufferedImage.px(x: Int, y: Int, c: Color) {
    if (x in 0 until width && y in 0 until height) setRGB(x, y, c.rgb)
}
fun BufferedImage.rect(x: Int, y: Int, w: Int, h: Int, c: Color) {
    for (dy in 0 until h) for (dx in 0 until w) px(x + dx, y + dy, c)
}

fun drawHumanIdle(img: BufferedImage, ox: Int, oy: Int) {
    val cx = ox + 16  // center X within 32px frame
    val by = oy + 47  // bottom Y (feet level)

    // Boots — chunky, separated
    img.rect(cx - 11, by - 9, 8, 9, BOOTS)   // left boot
    img.rect(cx + 3,  by - 9, 8, 9, BOOTS)   // right boot
    img.rect(cx - 12, by - 2, 10, 2, BOOTS_D) // left sole
    img.rect(cx + 2,  by - 2, 10, 2, BOOTS_D) // right sole

    // Tunic body — rounded shape
    img.rect(cx - 10, by - 30, 20, 20, TUNIC)
    img.rect(cx - 8,  by - 34, 16, 4, TUNIC)   // shoulders
    img.rect(cx + 4,  by - 30, 6, 18, TUNIC_D) // shadow side

    // Arms — clearly separate from body
    img.rect(cx - 15, by - 30, 4, 14, TUNIC_D)  // left arm
    img.rect(cx + 11, by - 30, 4, 14, TUNIC_D)  // right arm
    // Hands
    img.rect(cx - 16, by - 18, 5, 4, SKIN)       // left hand
    img.rect(cx + 11, by - 18, 5, 4, SKIN)       // right hand

    // Face — dark under hat shadow, with eyes
    img.rect(cx - 7, by - 42, 14, 8, Color(0x1A, 0x14, 0x10))  // dark face
    // Eyes — white with pupil
    img.rect(cx - 5, by - 40, 3, 3, EYE_W)  // left eye white
    img.rect(cx + 2, by - 40, 3, 3, EYE_W)  // right eye white
    img.px(cx - 4, by - 39, EYE_P)           // left pupil
    img.px(cx + 3, by - 39, EYE_P)           // right pupil
    // Nose
    img.rect(cx - 1, by - 37, 2, 2, SKIN)

    // Hat — big explorer hat
    img.rect(cx - 8, by - 50, 16, 8, HAT_MAIN)  // crown
    img.rect(cx - 12, by - 43, 24, 3, HAT_MAIN)  // brim
    img.rect(cx - 8, by - 44, 16, 2, HAT_BAND)   // band
    // Hat highlight
    img.rect(cx - 5, by - 49, 10, 1, HAT_BAND)
}

fun drawHumanWalk0(img: BufferedImage, ox: Int, oy: Int) {
    val cx = ox + 16; val by = oy + 47
    // Boots with walk offset
    img.rect(cx - 13, by - 9, 8, 9, BOOTS)  // left boot forward
    img.rect(cx + 5,  by - 9, 8, 9, BOOTS)  // right boot back
    img.rect(cx - 14, by - 2, 10, 2, BOOTS_D)
    img.rect(cx + 4,  by - 2, 10, 2, BOOTS_D)
    // Body
    img.rect(cx - 10, by - 30, 20, 20, TUNIC)
    img.rect(cx - 8,  by - 34, 16, 4, TUNIC)
    img.rect(cx + 4,  by - 30, 6, 18, TUNIC_D)
    // Arms — countersweep (left forward, right back)
    img.rect(cx - 16, by - 28, 4, 14, TUNIC_D)  // left arm forward
    img.rect(cx + 12, by - 32, 4, 14, TUNIC_D)  // right arm back
    img.rect(cx - 17, by - 16, 5, 4, SKIN)
    img.rect(cx + 12, by - 20, 5, 4, SKIN)
    // Face
    img.rect(cx - 7, by - 42, 14, 8, Color(0x1A, 0x14, 0x10))
    img.rect(cx - 5, by - 40, 3, 3, EYE_W)
    img.rect(cx + 2, by - 40, 3, 3, EYE_W)
    img.px(cx - 4, by - 39, EYE_P)
    img.px(cx + 3, by - 39, EYE_P)
    img.rect(cx - 1, by - 37, 2, 2, SKIN)
    // Hat
    img.rect(cx - 8, by - 50, 16, 8, HAT_MAIN)
    img.rect(cx - 12, by - 43, 24, 3, HAT_MAIN)
    img.rect(cx - 8, by - 44, 16, 2, HAT_BAND)
    img.rect(cx - 5, by - 49, 10, 1, HAT_BAND)
}

fun drawHumanWalk1(img: BufferedImage, ox: Int, oy: Int) {
    val cx = ox + 16; val by = oy + 47
    // Mirror of walk0
    img.rect(cx + 5,  by - 9, 8, 9, BOOTS)  // right forward
    img.rect(cx - 13, by - 9, 8, 9, BOOTS)  // left back
    img.rect(cx + 4,  by - 2, 10, 2, BOOTS_D)
    img.rect(cx - 14, by - 2, 10, 2, BOOTS_D)
    img.rect(cx - 10, by - 30, 20, 20, TUNIC)
    img.rect(cx - 8,  by - 34, 16, 4, TUNIC)
    img.rect(cx + 4,  by - 30, 6, 18, TUNIC_D)
    img.rect(cx + 12, by - 28, 4, 14, TUNIC_D)
    img.rect(cx - 16, by - 32, 4, 14, TUNIC_D)
    img.rect(cx + 12, by - 16, 5, 4, SKIN)
    img.rect(cx - 17, by - 20, 5, 4, SKIN)
    img.rect(cx - 7, by - 42, 14, 8, Color(0x1A, 0x14, 0x10))
    img.rect(cx - 5, by - 40, 3, 3, EYE_W)
    img.rect(cx + 2, by - 40, 3, 3, EYE_W)
    img.px(cx - 4, by - 39, EYE_P)
    img.px(cx + 3, by - 39, EYE_P)
    img.rect(cx - 1, by - 37, 2, 2, SKIN)
    img.rect(cx - 8, by - 50, 16, 8, HAT_MAIN)
    img.rect(cx - 12, by - 43, 24, 3, HAT_MAIN)
    img.rect(cx - 8, by - 44, 16, 2, HAT_BAND)
    img.rect(cx - 5, by - 49, 10, 1, HAT_BAND)
}

fun drawWolfIdle(img: BufferedImage, ox: Int, oy: Int) {
    val cx = ox + 20; val by = oy + 55
    // Legs
    img.rect(cx - 10, by - 14, 7, 14, FUR_D)
    img.rect(cx + 3,  by - 14, 7, 14, FUR_D)
    // Body — wide, muscular
    img.rect(cx - 14, by - 38, 28, 24, FUR)
    img.rect(cx - 10, by - 28, 20, 10, FUR_L) // chest
    // Arms — thick, hanging
    img.rect(cx - 19, by - 36, 4, 18, FUR)
    img.rect(cx + 15, by - 36, 4, 18, FUR)
    // Claws
    img.rect(cx - 20, by - 20, 5, 3, Color(0xC8, 0xB8, 0x98))
    img.rect(cx + 15, by - 20, 5, 3, Color(0xC8, 0xB8, 0x98))
    // Head — big
    img.rect(cx - 10, by - 50, 20, 12, FUR)
    // Snout
    img.rect(cx - 4, by - 46, 12, 5, FUR_D)
    // Eyes — red-orange
    img.rect(cx - 6, by - 49, 3, 2, WEYE)
    img.rect(cx + 3, by - 49, 3, 2, WEYE)
    // Ears — triangular (drawn as rectangles narrowing up)
    img.rect(cx - 9, by - 55, 4, 5, FUR)
    img.rect(cx + 5, by - 55, 4, 5, FUR)
    img.rect(cx - 8, by - 57, 2, 2, FUR)
    img.rect(cx + 6, by - 57, 2, 2, FUR)
    // Fangs
    img.rect(cx + 1, by - 42, 2, 3, FANG)
    img.rect(cx + 5, by - 42, 2, 3, FANG)
    // Tail
    img.rect(cx + 12, by - 24, 3, 8, FUR_D)
    img.rect(cx + 14, by - 30, 3, 6, FUR)
}

fun main() {
    val outDir = File("desktop/src/main/resources/sprites")
    outDir.mkdirs()

    // Human: 7 frames at 32x48
    val humanSheet = BufferedImage(224, 48, BufferedImage.TYPE_INT_ARGB)
    drawHumanIdle(humanSheet, 0, 0)       // idle_se
    drawHumanIdle(humanSheet, 32, 0)      // idle_sw (same for now)
    drawHumanWalk0(humanSheet, 64, 0)     // walk_se_0
    drawHumanWalk1(humanSheet, 96, 0)     // walk_se_1
    drawHumanWalk0(humanSheet, 128, 0)    // walk_sw_0
    drawHumanWalk1(humanSheet, 160, 0)    // walk_sw_1
    drawHumanIdle(humanSheet, 192, 0)     // jump_se
    ImageIO.write(humanSheet, "png", File(outDir, "player_human.png"))
    println("Generated player_human.png (${humanSheet.width}x${humanSheet.height})")

    // Wolf: 6 frames at 40x56
    val wolfSheet = BufferedImage(240, 56, BufferedImage.TYPE_INT_ARGB)
    drawWolfIdle(wolfSheet, 0, 0)         // idle_se
    drawWolfIdle(wolfSheet, 40, 0)        // idle_sw
    drawWolfIdle(wolfSheet, 80, 0)        // walk_se_0
    drawWolfIdle(wolfSheet, 120, 0)       // walk_se_1
    drawWolfIdle(wolfSheet, 160, 0)       // walk_sw_0
    drawWolfIdle(wolfSheet, 200, 0)       // walk_sw_1
    ImageIO.write(wolfSheet, "png", File(outDir, "player_wolf.png"))
    println("Generated player_wolf.png (${wolfSheet.width}x${wolfSheet.height})")
}

main()
