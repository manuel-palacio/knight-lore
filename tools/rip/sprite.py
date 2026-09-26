"""Decode Knight Lore sprites from memory: a (width in bytes, height) header,
then height rows of width (mask, pixel) byte pairs, rows stored bottom-up.
A set mask bit is part of the sprite (lit if its pixel bit is set, black
if not); a clear mask bit is transparent."""
from PIL import Image


def decode(memory, address):
    width, height = memory[address], memory[address + 1]
    image = Image.new('RGBA', (width * 8, height), (0, 0, 0, 0))
    pos = address + 2
    for row in range(height):
        y = height - 1 - row
        for col in range(width):
            mask, pixels = memory[pos], memory[pos + 1]
            pos += 2
            for bit in range(8):
                x = col * 8 + bit
                lit = pixels >> (7 - bit) & 1
                opaque = mask >> (7 - bit) & 1
                if lit:
                    image.putpixel((x, y), (255, 255, 255, 255))
                elif opaque:
                    image.putpixel((x, y), (0, 0, 0, 255))
    return image
