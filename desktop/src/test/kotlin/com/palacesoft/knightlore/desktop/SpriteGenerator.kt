package com.palacesoft.knightlore.desktop

import org.junit.jupiter.api.Test
import java.awt.Color
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * Generates pixel art sprite sheets. Run as a JUnit test.
 */
class SpriteGenerator {

    private val HAT = Color(0x8A, 0x68, 0x30)
    private val HAT_BAND = Color(0xB0, 0x88, 0x40)
    private val SKIN = Color(0xE8, 0xC8, 0x80)
    private val EYE_W = Color(0xFF, 0xFF, 0xFF)
    private val EYE_P = Color(0x10, 0x10, 0x10)
    private val TUNIC = Color(0x58, 0x88, 0xB8)
    private val TUNIC_D = Color(0x3A, 0x60, 0x90)
    private val BOOTS = Color(0x6A, 0x48, 0x28)
    private val BOOTS_D = Color(0x4A, 0x30, 0x18)
    private val FACE_SHADOW = Color(0x1A, 0x14, 0x10)

    private val FUR = Color(0x6A, 0x5A, 0x48)
    private val FUR_D = Color(0x3A, 0x2E, 0x24)
    private val FUR_L = Color(0x8A, 0x78, 0x60)
    private val WEYE = Color(0xFF, 0x44, 0x00)
    private val FANG = Color(0xE0, 0xD8, 0xC0)
    private val CLAW = Color(0xC8, 0xB8, 0x98)

    private fun BufferedImage.px(x: Int, y: Int, c: Color) {
        if (x in 0 until width && y in 0 until height) setRGB(x, y, c.rgb)
    }
    private fun BufferedImage.rect(x: Int, y: Int, w: Int, h: Int, c: Color) {
        for (dy in 0 until h) for (dx in 0 until w) px(x + dx, y + dy, c)
    }

    private fun drawHumanIdle(img: BufferedImage, ox: Int) {
        val c = ox + 16; val b = 47  // center X, bottom Y

        // ── BOOTS — rounded, separated ──
        // Left boot (rounded shape)
        img.rect(c-10, b-7, 6, 5, BOOTS)    // boot body
        img.rect(c-11, b-4, 8, 2, BOOTS)    // boot wider part
        img.rect(c-12, b-2, 9, 2, BOOTS_D)  // sole
        img.px(c-10, b-8, BOOTS)             // rounded top
        img.px(c-5, b-8, BOOTS)
        // Right boot
        img.rect(c+4, b-7, 6, 5, BOOTS)
        img.rect(c+3, b-4, 8, 2, BOOTS)
        img.rect(c+3, b-2, 9, 2, BOOTS_D)
        img.px(c+4, b-8, BOOTS)
        img.px(c+9, b-8, BOOTS)

        // ── BODY — organic tunic, widest at belly, narrower at shoulders ──
        img.rect(c-8, b-10, 16, 2, TUNIC)     // hip
        img.rect(c-9, b-14, 18, 4, TUNIC)     // lower belly
        img.rect(c-10, b-20, 20, 6, TUNIC)    // belly (widest)
        img.rect(c-9, b-26, 18, 6, TUNIC)     // chest
        img.rect(c-7, b-30, 14, 4, TUNIC)     // shoulders
        // Shadow side
        img.rect(c+4, b-26, 5, 16, TUNIC_D)

        // ── ARMS — clearly separated, hanging ──
        img.rect(c-14, b-28, 3, 12, TUNIC_D)  // left arm
        img.rect(c-15, b-18, 4, 4, SKIN)      // left hand
        img.rect(c+11, b-28, 3, 12, TUNIC_D)  // right arm
        img.rect(c+11, b-18, 4, 4, SKIN)      // right hand

        // ── FACE — rounded, with visible features under hat shadow ──
        // Face shape: wider in middle (rounded)
        img.rect(c-5, b-38, 10, 2, FACE_SHADOW)   // forehead
        img.rect(c-6, b-36, 12, 4, FACE_SHADOW)   // mid face (wider)
        img.rect(c-5, b-32, 10, 2, FACE_SHADOW)   // chin
        // Eyes — big, expressive, white with black pupil
        img.rect(c-5, b-37, 3, 3, EYE_W)    // left eye
        img.rect(c+2, b-37, 3, 3, EYE_W)    // right eye
        img.px(c-4, b-36, EYE_P)             // left pupil
        img.px(c+3, b-36, EYE_P)             // right pupil
        // Nose — small skin dot
        img.px(c-1, b-34, SKIN)
        img.px(c, b-34, SKIN)
        // Mouth
        img.rect(c-2, b-33, 4, 1, Color(0x30, 0x20, 0x18))

        // ── HAT — rounded dome shape ──
        // Brim — wide
        img.rect(c-12, b-40, 24, 2, HAT)
        // Crown — dome shape (wider in middle)
        img.rect(c-7, b-46, 14, 2, HAT)     // top (narrower)
        img.rect(c-8, b-44, 16, 2, HAT)     // upper
        img.rect(c-8, b-42, 16, 2, HAT)     // lower crown
        // Rounded top pixels
        img.px(c-6, b-47, HAT)
        img.px(c+5, b-47, HAT)
        // Hat band
        img.rect(c-8, b-41, 16, 1, HAT_BAND)
        // Highlight
        img.rect(c-4, b-45, 8, 1, HAT_BAND)
    }

    private fun drawHumanWalk(img: BufferedImage, ox: Int, phase: Int) {
        val c = ox + 16; val b = 47
        val s = if (phase == 0) 3 else -3  // boot swing

        // Boots — swing apart when walking
        img.rect(c-10-s, b-7, 6, 5, BOOTS)
        img.rect(c-11-s, b-4, 8, 2, BOOTS)
        img.rect(c-12-s, b-2, 9, 2, BOOTS_D)
        img.rect(c+4+s, b-7, 6, 5, BOOTS)
        img.rect(c+3+s, b-4, 8, 2, BOOTS)
        img.rect(c+3+s, b-2, 9, 2, BOOTS_D)

        // Body — same organic shape
        img.rect(c-8, b-10, 16, 2, TUNIC)
        img.rect(c-9, b-14, 18, 4, TUNIC)
        img.rect(c-10, b-20, 20, 6, TUNIC)
        img.rect(c-9, b-26, 18, 6, TUNIC)
        img.rect(c-7, b-30, 14, 4, TUNIC)
        img.rect(c+4, b-26, 5, 16, TUNIC_D)

        // Arms countersweep
        img.rect(c-14+s, b-26, 3, 12, TUNIC_D)
        img.rect(c-15+s, b-16, 4, 4, SKIN)
        img.rect(c+11-s, b-30, 3, 12, TUNIC_D)
        img.rect(c+11-s, b-20, 4, 4, SKIN)

        // Face
        img.rect(c-5, b-38, 10, 2, FACE_SHADOW)
        img.rect(c-6, b-36, 12, 4, FACE_SHADOW)
        img.rect(c-5, b-32, 10, 2, FACE_SHADOW)
        img.rect(c-5, b-37, 3, 3, EYE_W)
        img.rect(c+2, b-37, 3, 3, EYE_W)
        img.px(c-4, b-36, EYE_P)
        img.px(c+3, b-36, EYE_P)
        img.px(c-1, b-34, SKIN)
        img.px(c, b-34, SKIN)
        img.rect(c-2, b-33, 4, 1, Color(0x30, 0x20, 0x18))

        // Hat
        img.rect(c-12, b-40, 24, 2, HAT)
        img.rect(c-7, b-46, 14, 2, HAT)
        img.rect(c-8, b-44, 16, 2, HAT)
        img.rect(c-8, b-42, 16, 2, HAT)
        img.px(c-6, b-47, HAT)
        img.px(c+5, b-47, HAT)
        img.rect(c-8, b-41, 16, 1, HAT_BAND)
        img.rect(c-4, b-45, 8, 1, HAT_BAND)
    }

    private fun drawWolfIdle(img: BufferedImage, ox: Int) {
        val cx = ox + 20; val by = 55
        img.rect(cx - 10, by - 14, 7, 14, FUR_D)
        img.rect(cx + 3, by - 14, 7, 14, FUR_D)
        img.rect(cx - 14, by - 38, 28, 24, FUR)
        img.rect(cx - 10, by - 28, 20, 10, FUR_L)
        img.rect(cx - 19, by - 36, 4, 18, FUR)
        img.rect(cx + 15, by - 36, 4, 18, FUR)
        img.rect(cx - 20, by - 20, 5, 3, CLAW)
        img.rect(cx + 15, by - 20, 5, 3, CLAW)
        img.rect(cx - 10, by - 50, 20, 12, FUR)
        img.rect(cx - 4, by - 46, 12, 5, FUR_D)
        img.rect(cx - 6, by - 49, 3, 2, WEYE)
        img.rect(cx + 3, by - 49, 3, 2, WEYE)
        img.rect(cx - 9, by - 55, 4, 5, FUR)
        img.rect(cx + 5, by - 55, 4, 5, FUR)
        img.rect(cx - 8, by - 57, 2, 2, FUR)
        img.rect(cx + 6, by - 57, 2, 2, FUR)
        img.rect(cx + 1, by - 42, 2, 3, FANG)
        img.rect(cx + 5, by - 42, 2, 3, FANG)
        img.rect(cx + 12, by - 24, 3, 8, FUR_D)
        img.rect(cx + 14, by - 30, 3, 6, FUR)
    }

    @Test
    fun generateSpriteSheets() {
        val outDir = File("src/main/resources/sprites")
        outDir.mkdirs()

        val human = BufferedImage(224, 48, BufferedImage.TYPE_INT_ARGB)
        drawHumanIdle(human, 0)
        drawHumanIdle(human, 32)
        drawHumanWalk(human, 64, 0)
        drawHumanWalk(human, 96, 1)
        drawHumanWalk(human, 128, 0)
        drawHumanWalk(human, 160, 1)
        drawHumanIdle(human, 192)
        ImageIO.write(human, "png", File(outDir, "player_human.png"))
        println("Generated player_human.png")

        val wolf = BufferedImage(240, 56, BufferedImage.TYPE_INT_ARGB)
        drawWolfIdle(wolf, 0)
        drawWolfIdle(wolf, 40)
        drawWolfIdle(wolf, 80)
        drawWolfIdle(wolf, 120)
        drawWolfIdle(wolf, 160)
        drawWolfIdle(wolf, 200)
        ImageIO.write(wolf, "png", File(outDir, "player_wolf.png"))
        println("Generated player_wolf.png")
    }
}
