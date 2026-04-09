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
        val cx = ox + 16; val by = 47
        img.rect(cx - 11, by - 9, 8, 9, BOOTS)
        img.rect(cx + 3, by - 9, 8, 9, BOOTS)
        img.rect(cx - 12, by - 2, 10, 2, BOOTS_D)
        img.rect(cx + 2, by - 2, 10, 2, BOOTS_D)
        img.rect(cx - 10, by - 30, 20, 20, TUNIC)
        img.rect(cx - 8, by - 34, 16, 4, TUNIC)
        img.rect(cx + 4, by - 30, 6, 18, TUNIC_D)
        img.rect(cx - 15, by - 30, 4, 14, TUNIC_D)
        img.rect(cx + 11, by - 30, 4, 14, TUNIC_D)
        img.rect(cx - 16, by - 18, 5, 4, SKIN)
        img.rect(cx + 11, by - 18, 5, 4, SKIN)
        img.rect(cx - 7, by - 42, 14, 8, FACE_SHADOW)
        img.rect(cx - 5, by - 40, 3, 3, EYE_W)
        img.rect(cx + 2, by - 40, 3, 3, EYE_W)
        img.px(cx - 4, by - 39, EYE_P)
        img.px(cx + 3, by - 39, EYE_P)
        img.rect(cx - 1, by - 37, 2, 2, SKIN)
        img.rect(cx - 8, by - 50, 16, 8, HAT)
        img.rect(cx - 12, by - 43, 24, 3, HAT)
        img.rect(cx - 8, by - 44, 16, 2, HAT_BAND)
        img.rect(cx - 5, by - 49, 10, 1, HAT_BAND)
    }

    private fun drawHumanWalk(img: BufferedImage, ox: Int, phase: Int) {
        val cx = ox + 16; val by = 47
        val shift = if (phase == 0) 2 else -2
        img.rect(cx - 11 - shift, by - 9, 8, 9, BOOTS)
        img.rect(cx + 3 + shift, by - 9, 8, 9, BOOTS)
        img.rect(cx - 12 - shift, by - 2, 10, 2, BOOTS_D)
        img.rect(cx + 2 + shift, by - 2, 10, 2, BOOTS_D)
        img.rect(cx - 10, by - 30, 20, 20, TUNIC)
        img.rect(cx - 8, by - 34, 16, 4, TUNIC)
        img.rect(cx + 4, by - 30, 6, 18, TUNIC_D)
        // Arms countersweep
        img.rect(cx - 16 + shift, by - 28, 4, 14, TUNIC_D)
        img.rect(cx + 12 - shift, by - 32, 4, 14, TUNIC_D)
        img.rect(cx - 17 + shift, by - 16, 5, 4, SKIN)
        img.rect(cx + 12 - shift, by - 20, 5, 4, SKIN)
        img.rect(cx - 7, by - 42, 14, 8, FACE_SHADOW)
        img.rect(cx - 5, by - 40, 3, 3, EYE_W)
        img.rect(cx + 2, by - 40, 3, 3, EYE_W)
        img.px(cx - 4, by - 39, EYE_P)
        img.px(cx + 3, by - 39, EYE_P)
        img.rect(cx - 1, by - 37, 2, 2, SKIN)
        img.rect(cx - 8, by - 50, 16, 8, HAT)
        img.rect(cx - 12, by - 43, 24, 3, HAT)
        img.rect(cx - 8, by - 44, 16, 2, HAT_BAND)
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
