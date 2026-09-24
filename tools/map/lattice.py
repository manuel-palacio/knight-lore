"""Isometric lattice of map.png.

A room's origin is its far (north-west) floor corner in map pixels. Moving
one cell east (+x) is (+16, +8) px, one cell south (+z) is (-16, +8) px,
one block of height is -HEIGHT px. On an undisturbed stretch of the map
rooms are ROOM_STEP px apart per room step; graph.py finds where each room
is really drawn."""

CELL_X, CELL_Y = 16, 8
HEIGHT = 12
ROOM_STEP_X, ROOM_STEP_Y = 145, 73
CAULDRON_ORIGIN = (2495, 981)


def room_origin(rx, rz):
    """Where room (rx, rz) would be drawn if the map had no shifted strips."""
    ox, oy = CAULDRON_ORIGIN
    return ox + ROOM_STEP_X * (rx - rz), oy + ROOM_STEP_Y * (rx + rz)
