"""Crop one room off map.png, magnified, with its floor lattice drawn in and,
optionally, a reading of the room (blocks as wire cubes, spikes as crosses,
guard loops and ball lines as white and yellow lines through their cells,
ghosts and flames as rings on their cells) drawn over the map so the two
can be compared.

usage: crop.py ROOM_ID OUT.png [plain | draft [DY]]
  (no mode)  the reading in rooms.json over the map
  plain      the lattice only
  draft      the reader's (read.py) draft at the room's origin moved DY px
             down; ROOM_ID may then be any map-RX-RZ, placed on the lattice
Floor cell edges are grey, doorway cells white, cell (0,0) red: x runs
down-right, z runs down-left from the far corner."""
import json
import os
import sys
from PIL import Image, ImageDraw
from lattice import CELL_X, CELL_Y, HEIGHT
from tops import MAP

MARGIN_X, ABOVE, BELOW = 150, 120, 160
ZOOM = 3
DOORS = {'north': (4, 0), 'south': (4, 7), 'west': (0, 4), 'east': (7, 4)}
ROOMS = os.path.join(os.path.dirname(__file__), 'rooms.json')


def floor_point(origin, x, z, y=0.0):
    ox, oy = origin
    return ox + CELL_X * (x - z), oy + CELL_Y * (x + z) - y


def crop_room(img, room, show_reading=True):
    origin = tuple(room['origin'])
    ox, oy = origin
    left, top = ox - MARGIN_X, oy - ABOVE
    crop = img.crop((left, top, ox + MARGIN_X, oy + BELOW))
    crop = crop.resize((crop.width * ZOOM, crop.height * ZOOM), Image.NEAREST)
    draw = ImageDraw.Draw(crop, 'RGBA')

    def at(x, z, y=0.0):
        px, py = floor_point(origin, x, z, y)
        return (px - left) * ZOOM, (py - top) * ZOOM

    for i in range(9):
        draw.line([at(i, 0), at(i, 8)], fill=(128, 128, 128, 120))
        draw.line([at(0, i), at(8, i)], fill=(128, 128, 128, 120))
    draw.polygon(cell(at, 0, 0), outline=(255, 60, 60, 255))
    for direction, (x, z) in DOORS.items():
        width = 3 if direction in room.get('exits', {}) else 1
        draw.polygon(cell(at, x, z), outline=(255, 255, 255, 220), width=width)
    if show_reading:
        for x, z, h in room.get('blocks', []):
            draw_cube(draw, at, x, z, h)
        for x, z in room.get('spikes', []):
            draw.line([at(x, z), at(x + 1, z + 1)], fill=(255, 40, 40, 255), width=3)
            draw.line([at(x + 1, z), at(x, z + 1)], fill=(255, 40, 40, 255), width=3)
        draw_dangers(draw, at, room)
    return crop


def draw_dangers(draw, at, room):
    def centre(c, h=0):
        return at(c[0] + 0.5, c[1] + 0.5, HEIGHT * h)

    for path in room.get('pathGuards', []):
        draw.line([centre(c) for c in path + path[:1]], fill=(255, 255, 255, 255), width=4)
    for line in room.get('balls', []):
        draw.line([centre(c) for c in line], fill=(255, 255, 0, 255), width=4)
    for x, z in room.get('ghosts', []):
        ring(draw, centre((x, z)), (0, 255, 255, 255))
    for x, z, h in room.get('flames', []):
        ring(draw, centre((x, z), h), (255, 160, 0, 255))


def ring(draw, point, colour):
    px, py = point
    draw.ellipse([px - 18, py - 9, px + 18, py + 9], outline=colour, width=3)


def cell(at, x, z, y=0.0):
    return [at(x, z, y), at(x + 1, z, y), at(x + 1, z + 1, y), at(x, z + 1, y)]


def draw_cube(draw, at, x, z, h):
    """Wire outline of a column of h blocks standing on cell (x, z)."""
    colour = (255, 255, 255, 255)
    top = cell(at, x, z, HEIGHT * h)
    draw.polygon(top, outline=colour, width=2)
    for corner in ((x + 1, z), (x + 1, z + 1), (x, z + 1)):
        draw.line([at(*corner), at(*corner, HEIGHT * h)], fill=colour, width=2)
    draw.line([at(x + 1, z), at(x + 1, z + 1), at(x, z + 1)], fill=colour, width=2)


def room_or_draft(room_name, draft=False, dy=0):
    """The room's reading from rooms.json, or a fresh draft of it."""
    import re
    from read import read_room
    from lattice import room_origin
    from tops import load, colour_codes
    rooms = json.load(open(ROOMS))
    if room_name in rooms and not draft:
        return rooms[room_name]
    if room_name in rooms:
        ox, oy = rooms[room_name]['origin']
    else:
        m = re.fullmatch(r'map-(-?\d+)-(-?\d+)', room_name)
        ox, oy = room_origin(int(m.group(1)), int(m.group(2)))
    reading = read_room(colour_codes(load()), (ox, oy + dy))
    print(json.dumps(reading))
    return reading


if __name__ == '__main__':
    room_name, out = sys.argv[1], sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else ''
    dy = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    room = room_or_draft(room_name, mode == 'draft', dy)
    crop_room(Image.open(MAP).convert('RGB'), room, mode != 'plain').save(out)
