"""Checks the sprite decoder on a hand-built record: python3 tools/rip/test_sprite.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sprite import decode  # noqa: E402


def test_mask_marks_the_shape_and_everything_else_is_transparent():
    memory = bytearray(16)
    memory[0:2] = bytes([1, 1])        # one byte wide, one row
    memory[2:4] = bytes([0xF0, 0xA0])  # mask: left four pixels opaque; pixels lit at 0 and 2
    image = decode(memory, 0)
    alpha = [image.getpixel((x, 0))[3] for x in range(8)]
    red = [image.getpixel((x, 0))[0] for x in range(8)]
    assert alpha == [255, 255, 255, 255, 0, 0, 0, 0], alpha
    assert red[:4] == [255, 0, 255, 0], red


if __name__ == '__main__':
    test_mask_marks_the_shape_and_everything_else_is_transparent()
    print('ok')
