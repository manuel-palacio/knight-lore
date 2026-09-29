"""The favicon: Sabreman's head from his front strip (characters.py), in the
title's gold on black, scaled up whole pixels so it stays crisp.

usage (from the repo root): uv run --with pillow python tools/rip/favicon.py"""
from PIL import Image

STRIP = 'public/sprites/sabreman-front.png'
OUT = 'public/favicon.png'
HEAD = (0, 0, 24, 24)
GOLD = (0xFF, 0xD9, 0x5A, 255)
SCALE = 4


def favicon():
    head = Image.open(STRIP).convert('RGBA').crop(HEAD)
    icon = Image.new('RGBA', head.size, (0, 0, 0, 255))
    for x in range(head.width):
        for y in range(head.height):
            r, g, b, a = head.getpixel((x, y))
            if a and (r, g, b) != (0, 0, 0):
                icon.putpixel((x, y), GOLD)
    return icon.resize((head.width * SCALE, head.height * SCALE), Image.NEAREST)


if __name__ == '__main__':
    favicon().save(OUT)
