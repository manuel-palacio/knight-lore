"""Write the sprites of room objects the game draws that the first rip did
not name: the spiked ball (graphic 63, the room table's t18 and t19), the
hedge (graphic 6, t3), the gargoyle (graphic 22, t4) and the chest
(graphic 85, t6). Graphic numbers index the sprite table at 0x7112 (see
the draw routine at 0xD6F5). The room table's blocks (t0, t11, t14-t16,
t21, t22) all draw the one block sprite, graphic 7's. The table (graphic
84, t7) is ripped again: the first rip's was decoded before the mask was
put right.

The first rip lost every sprite's mask, the black rim the original draws
round each shape so that one thing stands clear of what is behind it. The
sprites of it the game still draws (MASKED_AGAIN) are ripped again, cell for
cell as index.json lays them out, their ink unchanged.

usage (from the repo root): uv run --with pillow python tools/rip/objects.py"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sprite import decode  # noqa: E402
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
OUT = 'public/sprites/rip'
SPRITE_TABLE = 0x7112
OBJECTS = {'spiked-ball.png': 63, 'hedge.png': 6, 'gargoyle.png': 22, 'chest.png': 85, 'table.png': 84}
MASKED_AGAIN = ['spikes', 'cage', 'ball', 'ghost', 'cauldron', 'stars']


def sprite_address(memory, graphic):
    entry = SPRITE_TABLE + 2 * graphic
    return memory[entry] | memory[entry + 1] << 8


def rip_again_with_mask(memory, name, entry):
    """A strip of the entry's cells, each sprite standing on the cell's bottom edge."""
    width, height = entry['cellWidth'], entry['cellHeight']
    strip = Image.new('RGBA', (width * len(entry['addresses']), height), (0, 0, 0, 0))
    for i, address in enumerate(entry['addresses']):
        cell = decode(memory, int(address, 16))
        strip.paste(cell, (i * width, height - cell.height), cell)
    strip.save(os.path.join(OUT, f'{name}.png'))


if __name__ == '__main__':
    memory = load_memory(SNAPSHOT)
    for name, graphic in OBJECTS.items():
        decode(memory, sprite_address(memory, graphic)).save(os.path.join(OUT, name))
    with open(os.path.join(OUT, 'index.json')) as f:
        index = json.load(f)
    for name in MASKED_AGAIN:
        rip_again_with_mask(memory, name, index[name])
