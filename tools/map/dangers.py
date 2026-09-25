"""List the red sprites drawn on each room's floor in map.png: the map draws
every moving danger (guards, balls, ghosts) and every flame in red. Each
sprite is placed on the floor cell under its lowest pixel, assuming it
stands on the floor, so a flame on a block or a ball in mid-bounce lands a
cell or two too far south-east. The list is a draft to check by eye with
crop.py, not a reading: which sprite is which kind of danger, and its route,
are decided by looking at the map.

usage: dangers.py [ROOM_ID ...]"""
import json
import os
import sys
import numpy as np
from scipy import ndimage
from lattice import CELL_X, CELL_Y
from tops import load, colour_codes

ROOMS = os.path.join(os.path.dirname(__file__), 'rooms.json')
RED = 4
MIN_PIXELS = 20
# A sprite standing on the floor has its lowest pixel at its cell's centre.
FEET_DROP = 0


def red_sprites(code):
    labels, count = ndimage.label(code == RED, structure=np.ones((3, 3)))
    boxes = ndimage.find_objects(labels)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    return [((b[1].start + b[1].stop - 1) / 2, b[0].stop - 1, b[1].stop - b[1].start, b[0].stop - b[0].start, int(n))
            for b, n in zip(boxes, sizes) if n >= MIN_PIXELS]


def cell_under(origin, px, py):
    """Floor cell whose centre is drawn at (px, py - FEET_DROP)."""
    u = (px - origin[0]) / CELL_X
    v = (py - FEET_DROP - origin[1]) / CELL_Y
    return (u + v) / 2 - 0.5, (v - u) / 2 - 0.5


def sprites_in(room, sprites):
    found = []
    for px, py, w, h, n in sprites:
        x, z = cell_under(room['origin'], px, py)
        if -0.6 <= x <= 7.6 and -0.6 <= z <= 7.6:
            found.append((round(x), round(z), f'at ({px:.0f},{py}) cell ({x:.1f},{z:.1f}) size {w}x{h} {n}px'))
    return found


if __name__ == '__main__':
    rooms = json.load(open(ROOMS))
    sprites = red_sprites(colour_codes(load()))
    for name in sys.argv[1:] or rooms:
        for x, z, note in sprites_in(rooms[name], sprites):
            print(name, x, z, note)
