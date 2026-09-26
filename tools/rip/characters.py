"""Compose Sabreman's, the wolf's and the guard's walk strips from the rip.

The original draws each of them as two sprites: an upper body (or the
guard's hood) over a pair of walking legs, four frames each, played
0 1 2 3 2 1 by the animation table at 0x7132-0x71b0. The legs are the strips
the first rip filed as creature1-* (the man's, and the guard's) and
creature2-* (the wolf's). Each view pairs with its own legs, and the legs sit
a fixed distance below the top of the body: measured by fitting both sprites
to frames of the original in motion (Sabreman and the wolf) and to the
guards on map.png. The body is drawn over the legs.

The transformation is the four full-body poses at 0xac28-0xae98 (the man
with arms raised, the man with his hat pulled down, the wolf in profile, the
wolf with arms raised), mirrored and ordered as frames of the original show
them, ending on the wolf walking away.

usage (from the repo root): uv run --with pillow python tools/rip/characters.py"""
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sprite import decode  # noqa: E402
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
OUT = 'public/sprites'
CELL_WIDTH = 24
MAN_LEGS_FRONT = [0x93b6, 0x9418, 0x947a, 0x94dc]
MAN_LEGS_BACK = [0x922e, 0x9290, 0x92f2, 0x9354]
WOLF_LEGS_FRONT = [0xa23c, 0xa29e, 0xa300, 0xa362]
WOLF_LEGS_BACK = [0xa0b4, 0xa116, 0xa178, 0xa1da]
# Strip file: (body frames, leg frames, legs' drop below the top of the body)
STRIPS = {
    'sabreman-front.png': ([0x9066, 0x8d80, 0x9196, 0x90fe], MAN_LEGS_FRONT, 19),
    'sabreman-back.png': ([0x8f42, 0x8fd4, 0x8cee, 0x8eb0], MAN_LEGS_BACK, 18),
    'sabrewulf-front.png': ([0xa684, 0xa73a, 0xa7f0, 0xa8a6], WOLF_LEGS_FRONT, 21),
    'sabrewulf-back.png': ([0xa3c4, 0xa474, 0xa524, 0xa5d4], WOLF_LEGS_BACK, 20),
    # The guard's hood seen from the front and from behind, over the man's legs.
    'rip/guard-left.png': ([0x75b0] * 4, MAN_LEGS_FRONT, 16),
    'rip/guard-right.png': ([0x763c] * 4, MAN_LEGS_BACK, 16),
}


# (pose address, mirrored) for each of the eleven stages, man to wolf.
TRANSFORM = [(0xadb2, True), (0xadb2, True), (0xac28, False), (0xae98, True), (0xacea, False),
             (0xadb2, True), (0xadb2, True), (0xae98, False), (0xac28, True), (0xadb2, False)]
TRANSFORM_LAST = (0xa524, 0xa178, 20)  # the wolf seen from behind, mid-stride


def compose(memory, body_address, legs_address, drop):
    body, legs = decode(memory, body_address), decode(memory, legs_address)
    cell = Image.new('RGBA', (CELL_WIDTH, max(body.height, drop + legs.height)), (0, 0, 0, 0))
    cell.paste(legs, (0, drop), legs)
    cell.paste(body, (0, 0), body)
    return cell


def write_strip(memory, name, bodies, legs, drop):
    save_strip([compose(memory, body, leg, drop) for body, leg in zip(bodies, legs)], name)


def write_transform(memory, name):
    cells = [decode(memory, pose).transpose(Image.FLIP_LEFT_RIGHT) if mirrored else decode(memory, pose)
             for pose, mirrored in TRANSFORM]
    save_strip(cells + [compose(memory, *TRANSFORM_LAST)], name)


def save_strip(cells, name):
    height = max(cell.height for cell in cells)
    strip = Image.new('RGBA', (CELL_WIDTH * len(cells), height), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        strip.paste(cell, (i * CELL_WIDTH, height - cell.height))
    strip.save(os.path.join(OUT, name))


if __name__ == '__main__':
    memory = load_memory(SNAPSHOT)
    for strip_name, (bodies, legs, drop) in STRIPS.items():
        write_strip(memory, strip_name, bodies, legs, drop)
    write_transform(memory, 'sabreman-transform.png')
