"""Checks the ripped object sprites against the snapshot: python3 tools/rip/test_objects.py
(needs pillow: uv run --with pillow python tools/rip/test_objects.py)"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from objects import OBJECTS, OUT, sprite_address  # noqa: E402
from sprite import decode  # noqa: E402
from z80 import load_memory  # noqa: E402

MEMORY = load_memory('reference/KnightLore.z80')


def pixels(image):
    """The sprite as rows of '#' (lit), '.' (black) and ' ' (see-through)."""
    px = image.convert('RGBA').load()
    return [''.join('#' if px[x, y][3] and px[x, y][0] else '.' if px[x, y][3] else ' ' for x in range(image.width))
            for y in range(image.height)]


def ripped(name):
    return pixels(Image.open(os.path.join(OUT, name)))


def test_the_hedge_is_graphic_6_a_bush_32_by_29():
    assert sprite_address(MEMORY, 6) == 0x77AA
    rows = ripped('hedge.png')
    assert (len(rows[0]), len(rows)) == (32, 29)
    assert sum(r.count('#') for r in rows) == 473
    assert rows[4] == '     .#####################..   ', rows[4]


def test_the_gargoyle_is_graphic_22_a_statue_24_by_24():
    assert sprite_address(MEMORY, 22) == 0x7894
    rows = ripped('gargoyle.png')
    assert (len(rows[0]), len(rows)) == (24, 24)
    assert sum(r.count('#') for r in rows) == 194
    assert rows[16] == ' .###..##..###.....####.', rows[16]


def test_every_ripped_object_is_the_snapshot_sprite_as_decoded():
    for name, graphic in OBJECTS.items():
        assert ripped(name) == pixels(decode(MEMORY, sprite_address(MEMORY, graphic))), name


if __name__ == '__main__':
    tests = [f for name, f in sorted(globals().items()) if name.startswith('test_')]
    for test in tests:
        test()
    print(f'{len(tests)} ok')
