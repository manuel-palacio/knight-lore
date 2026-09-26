"""Write the sprites of room objects the game draws that the first rip did
not name: the spiked ball (graphic 63, the room table's t18 and t19).
Graphic numbers index the sprite table at 0x7112 (see the draw routine at
0xD6F5).

usage (from the repo root): uv run --with pillow python tools/rip/objects.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from sprite import decode  # noqa: E402
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
OUT = 'public/sprites/rip'
SPRITE_TABLE = 0x7112
OBJECTS = {'spiked-ball.png': 63}


def sprite_address(memory, graphic):
    entry = SPRITE_TABLE + 2 * graphic
    return memory[entry] | memory[entry + 1] << 8


if __name__ == '__main__':
    memory = load_memory(SNAPSHOT)
    for name, graphic in OBJECTS.items():
        decode(memory, sprite_address(memory, graphic)).save(os.path.join(OUT, name))
