"""Compose the castle guard's walk strips from the memory rip.

The original draws a guard as two sprites: a hood (0x75b0 seen from the
front, 0x763c from behind) over a pair of walking legs, the same legs as
Sabreman's (the four-frame strips at 0x922e and 0x93b6, which the first rip
took for a creature of their own). The legs sit 16 px below the top of the
hood and the hood is drawn over them; measured against the guards on
map.png.

usage (from the repo root): uv run --with pillow python tools/rip/guards.py"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sprite import decode  # noqa: E402
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
OUT = 'public/sprites/rip'
LEGS_BELOW_HOOD = 16
CELL_WIDTH = 24
# Walking toward the viewer (south or west) shows the face; away, the back.
STRIPS = {
    'guard-left.png': (0x75b0, [0x922e, 0x9290, 0x92f2, 0x9354]),
    'guard-right.png': (0x763c, [0x93b6, 0x9418, 0x947a, 0x94dc]),
}


def compose(memory, hood_address, leg_address):
    hood, legs = decode(memory, hood_address), decode(memory, leg_address)
    cell = Image.new('RGBA', (CELL_WIDTH, max(hood.height, LEGS_BELOW_HOOD + legs.height)), (0, 0, 0, 0))
    cell.paste(legs, (0, LEGS_BELOW_HOOD), legs)
    cell.paste(hood, (0, 0), hood)
    return cell


def write_strip(memory, name, hood_address, leg_addresses):
    cells = [compose(memory, hood_address, leg) for leg in leg_addresses]
    strip = Image.new('RGBA', (CELL_WIDTH * len(cells), cells[0].height), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        strip.paste(cell, (i * CELL_WIDTH, 0))
    strip.save(os.path.join(OUT, name))


if __name__ == '__main__':
    memory = load_memory(SNAPSHOT)
    for strip_name, (hood, legs) in STRIPS.items():
        write_strip(memory, strip_name, hood, legs)
