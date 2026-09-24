"""Height of the stack standing on one floor cell, measured along the stack's
front edge: the vertical run of one colour rising from the cell's front
floor vertex. Useful where a statue or an item hides the top face.

usage: column.py OX OY X,Z [X,Z ...]"""
import sys
from lattice import CELL_X, CELL_Y, HEIGHT
from tops import load, colour_codes

FLOOR_LIFT = 3
TOP_AND_OUTLINE = 13


def stack_height(code, origin, x, z):
    ox, oy = origin
    px = ox + CELL_X * (x - z)
    py = oy + CELL_Y * (x + z + 2) - FLOOR_LIFT
    best = None
    for start in range(py - 3, py + 4):
        colour = code[start, px]
        if colour == 0:
            continue
        top = start
        gap = 0
        while top > 0 and gap <= 2:
            top -= 1
            gap = gap + 1 if code[top, px] != colour else 0
        rise = start - top - gap
        best = max(best or 0, rise)
    # a column of h blocks rises about 12h px along its front edge, plus
    # the top face's lower half and the outline (13 px, measured on the
    # cauldron room's blocks)
    return None if best is None else round((best - TOP_AND_OUTLINE) / HEIGHT, 1)


if __name__ == '__main__':
    code = colour_codes(load())
    origin = int(sys.argv[1]), int(sys.argv[2])
    for cell in sys.argv[3:]:
        x, z = map(int, cell.split(','))
        print(cell, stack_height(code, origin, x, z))
