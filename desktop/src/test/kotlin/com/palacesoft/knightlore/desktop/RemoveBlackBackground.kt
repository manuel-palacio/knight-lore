package com.palacesoft.knightlore.desktop

import org.junit.jupiter.api.Test
import java.awt.image.BufferedImage
import java.io.File
import javax.imageio.ImageIO

/**
 * Converts black/near-black background pixels to transparent in all sprite PNGs.
 * Run as a JUnit test.
 */
class RemoveBlackBackground {

    @Test
    fun makeBlackTransparent() {
        val dir = File("src/main/resources/sprites")
        val threshold = 30 // pixels with R,G,B all below this become transparent

        dir.listFiles { f -> f.extension == "png" }?.forEach { file ->
            val img = ImageIO.read(file)
            val out = BufferedImage(img.width, img.height, BufferedImage.TYPE_INT_ARGB)

            for (y in 0 until img.height) {
                for (x in 0 until img.width) {
                    val rgb = img.getRGB(x, y)
                    val a = (rgb shr 24) and 0xFF
                    val r = (rgb shr 16) and 0xFF
                    val g = (rgb shr 8) and 0xFF
                    val b = rgb and 0xFF

                    if (a > 0 && r < threshold && g < threshold && b < threshold) {
                        // Near-black → transparent
                        out.setRGB(x, y, 0x00000000)
                    } else {
                        out.setRGB(x, y, rgb)
                    }
                }
            }

            ImageIO.write(out, "png", file)
            println("Processed: ${file.name} (${img.width}x${img.height})")
        }
    }
}
