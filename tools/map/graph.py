"""Rooms and their doorways from the arches alone.

The map draws only a room's two back walls, so each arch sits in the west
or north wall of the room it belongs to, and that arch pins where the room
is drawn (its origin, the far floor corner). The arch is also the east or
south doorway of the neighbour one room step away.

The map is drawn in strips shifted up or down against each other (never
sideways), so a neighbour is looked for in the same map column (its x is
exact) at the drawn room nearest the lattice position, up to SHIFT px away.
Rooms are named by room steps from the cauldron room, walking the doorways
breadth first; a room reached at two different positions is reported.

usage: graph.py  -> prints JSON {room id: {origin, doors: {dir: id}}}"""
import json
import sys
from arches import find_arches
from lattice import ROOM_STEP_X, ROOM_STEP_Y, CAULDRON_ORIGIN
from tops import load, colour_codes

SNAP = 3
SHIFT = 60
# Doorways read by eye where the detector cannot pair the rooms: the
# neighbour is drawn further off than SHIFT, or its arch is half hidden.
# (room origin, direction, neighbour origin)
CONFIRMED = [
    ((2930, 1200), 'north', (3075, 1031)),
    ((1915, 1124), 'south', (1770, 1196)),
]
STEP = {'west': (-1, 0), 'east': (1, 0), 'north': (0, -1), 'south': (0, 1)}
OPPOSITE = {'west': 'east', 'east': 'west', 'north': 'south', 'south': 'north'}


def neighbour_origin(origin, direction):
    ox, oy = origin
    rx, rz = STEP[direction]
    return ox + ROOM_STEP_X * (rx - rz), oy + ROOM_STEP_Y * (rx + rz)


def drawn_rooms(arches):
    """Origins of the rooms whose own walls hold arches, with those arches."""
    rooms = {}
    for kind, x, y, score in arches:
        origin = next((o for o in rooms if abs(o[0] - x) <= SNAP and abs(o[1] - y) <= SNAP), (x, y))
        rooms.setdefault(origin, []).append((kind, score))
    return rooms


def link_rooms(rooms):
    """{origin: {direction: neighbour origin}}; a neighbour not drawn with
    arches of its own gets its lattice position."""
    links = {origin: {} for origin in rooms}
    for origin, kind, other in CONFIRMED:
        links[origin][kind] = other
        links[other][OPPOSITE[kind]] = origin
    wanted = []
    for origin, own in rooms.items():
        for kind, score in own:
            wanted.append((origin, kind, neighbour_origin(origin, kind)))
    # closest candidates first, so each doorway is claimed once
    candidates = []
    for origin, kind, target in wanted:
        for other in rooms:
            if other[0] == target[0] and abs(other[1] - target[1]) <= SHIFT:
                candidates.append((abs(other[1] - target[1]), origin, kind, other))
    for _, origin, kind, other in sorted(candidates):
        back = OPPOSITE[kind]
        if kind in links[origin] or back in links[other]:
            continue
        links[origin][kind] = other
        links[other][back] = origin
    for origin, kind, target in wanted:
        if kind not in links[origin]:
            target = next((o for o in links if o not in rooms and abs(o[0] - target[0]) <= SNAP
                           and abs(o[1] - target[1]) <= SNAP), target)
            links.setdefault(target, {})[OPPOSITE[kind]] = origin
            links[origin][kind] = target
    return links


def name_rooms(links):
    start = min(links, key=lambda o: abs(o[0] - CAULDRON_ORIGIN[0]) + abs(o[1] - CAULDRON_ORIGIN[1]))
    names = {start: (0, 0)}
    queue = [start]
    clashes = []
    while queue:
        origin = queue.pop(0)
        rx, rz = names[origin]
        for direction, other in links[origin].items():
            step = (rx + STEP[direction][0], rz + STEP[direction][1])
            if other not in names:
                if step in names.values():
                    clashes.append((step, other))
                names[other] = step
                queue.append(other)
            elif names[other] != step:
                clashes.append((step, other))
    return names, clashes


def room_id(step):
    return 'room-001' if step == (0, 0) else f'map-{step[0]}-{step[1]}'


if __name__ == '__main__':
    rooms = drawn_rooms(find_arches(colour_codes(load())))
    links = link_rooms(rooms)
    names, clashes = name_rooms(links)
    out = {}
    for origin, step in names.items():
        out[room_id(step)] = {
            'origin': list(origin),
            'drawn': origin in rooms,
            'doors': {d: room_id(names[o]) for d, o in links[origin].items()},
        }
    for step, origin in clashes:
        print('clash', room_id(step), origin, file=sys.stderr)
    print(json.dumps(out))
