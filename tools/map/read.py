"""First-pass reading of one room off map.png: its colour, block columns and
spike cells. Rooms overlap on the map, so only things drawn in the room's
own colour and sitting on its lattice are kept. The result is a draft to
check against the map with crop.py, not something to paste blind.

usage: read.py X Y   (the room's origin)"""
import json
import sys
from collections import Counter
import numpy as np
from lattice import CELL_X, CELL_Y, HEIGHT
from tops import load, colour_codes, find_tops_in
from doors import arch_masks, arch_score_at, window, WEST_BOX, NORTH_BOX
from arches import THRESHOLD as ARCH_SCORE

# Spike beds show as vertical stripes a few pixels above their floor cell.
SPIKE_LIFT = 8
SPIKE_MIN_STRIPES = 45
# The floor is drawn this many pixels above the block lattice's floor.
FLOOR_LIFT = 3
# Pixels a top face may sit off the room's lattice.
SLACK = 2


def read_room(code, origin):
    colour = room_colour(code, origin)
    return {
        'origin': list(origin),
        'colour': colour,
        'blocks': read_blocks(code, origin, colour),
        'spikes': read_spikes(code, origin, colour),
    }


def room_colour(code, origin):
    """Commonest colour of the room's own arches or, failing those, of the
    brick corner above its far corner."""
    ox, oy = origin
    masks = arch_masks(code)
    lit = Counter()
    for edge, box in (('west', WEST_BOX), ('north', NORTH_BOX)):
        if arch_score_at(code, masks, ox, oy, edge) >= ARCH_SCORE:
            lit.update(int(c) for c in window(code, ox, oy, box)[masks[edge]] if c)
    if not lit:
        lit.update(int(c) for c in code[oy - 60:oy - 4, ox - 10:ox + 10].ravel() if c)
    return lit.most_common(1)[0][0] if lit else 0


def read_blocks(code, origin, colour):
    """Block columns (x, z, h) whose top face is fully visible."""
    ox, oy = origin
    found = []
    for px, py, top_colour in find_tops_in(code, (ox - 136, oy - 60, ox + 136, oy + 140)):
        across = round((px + 1 - ox) / CELL_X)
        if top_colour != colour or abs(px + 1 - ox - CELL_X * across) > SLACK:
            continue
        fits = []
        for h in range(1, 5):
            depth = py + 1 - oy + HEIGHT * h
            down = round(depth / CELL_Y)
            x, z = (down + across) // 2, (down - across) // 2
            if (down + across) % 2 == 0 and 0 <= x < 8 and 0 <= z < 8:
                fits.append((abs(depth - CELL_Y * down), [x, z, h]))
        best = min(fits, default=None)
        if best and best[0] <= SLACK:
            found.append(best[1])
    return found


def stripes(code, colour):
    """Pixels at the top of a short vertical stroke of the colour with a dark
    gap on one side: the look of a spike."""
    lit = code == colour
    dark = code == 0
    run = lit[:-2, 1:-1] & lit[1:-1, 1:-1] & lit[2:, 1:-1]
    v = run & ((dark[:-2, :-2] & dark[1:-1, :-2]) | (dark[:-2, 2:] & dark[1:-1, 2:]))
    out = np.zeros_like(lit)
    out[1:-1, 1:-1] = v
    return out


def read_spikes(code, origin, colour):
    if not colour:
        return []
    counts = spike_counts(code, origin, colour)
    return [[x, z] for x in range(8) for z in range(8) if counts[z][x] >= SPIKE_MIN_STRIPES]


def spike_counts(code, origin, colour):
    """Spike-like strokes over each floor cell, as rows of z."""
    ox, oy = origin
    feature = stripes(code, colour)
    counts = [[0] * 8 for _ in range(8)]
    for x in range(8):
        for z in range(8):
            cx = ox + CELL_X * (x - z)
            cy = oy - FLOOR_LIFT + CELL_Y * (x + z + 1) - SPIKE_LIFT
            for dy in range(-8, 9):
                half = 16 - 2 * abs(dy)
                counts[z][x] += int(feature[cy + dy, cx - half:cx + half].sum())
    return counts


if __name__ == '__main__':
    origin = (int(sys.argv[1]), int(sys.argv[2]))
    print(json.dumps(read_room(colour_codes(load()), origin)))
