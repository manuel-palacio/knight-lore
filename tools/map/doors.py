"""Door arches on map.png. Every doorway is one arch shared by the two rooms
it joins, drawn in the wall between them. A room's west arch and its north
arch sit at fixed offsets from its origin; its east and south arches are the
west and north arches of the neighbours. The templates are the cauldron
room's two back arches, cut out as lit/unlit masks."""
import numpy as np
from lattice import room_origin

# Bounding boxes of the cauldron room's back arches, relative to its origin.
WEST_BOX = (-88, -12, -50, 37)
NORTH_BOX = (48, -12, 86, 37)
YELLOW = 6


def arch_masks(code):
    ox, oy = room_origin(0, 0)
    return {edge: window(code, ox, oy, box) == YELLOW for edge, box in (('west', WEST_BOX), ('north', NORTH_BOX))}


def window(code, ox, oy, box):
    x0, y0, x1, y1 = box
    return code[oy + y0: oy + y1 + 1, ox + x0: ox + x1 + 1]


def arch_score_at(code, masks, ox, oy, edge):
    """Share of the arch's own pixels lit, and of the gaps between them (row
    by row, within the arch's outline) dark."""
    patch = window(code, ox, oy, WEST_BOX if edge == 'west' else NORTH_BOX)
    mask = masks[edge]
    if patch.shape != mask.shape:
        return 0.0
    care = outline(mask)
    return float(((patch > 0) == mask)[care].mean())


def outline(mask):
    """Pixels between the leftmost and rightmost arch pixel of each row."""
    care = np.zeros_like(mask)
    for row, line in enumerate(mask):
        cols = np.nonzero(line)[0]
        if cols.size:
            care[row, cols.min():cols.max() + 1] = True
    return care
