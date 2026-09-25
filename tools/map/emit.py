"""Turn the map reading (rooms.json) into the ROOM_SPECS entries of
src/scenes/rooms/roomSpecs.ts, applying the game's rules on the way:

- spike cells and floor flames within a cell of a doorway are dropped, and
  ghosts and the waypoints of guards and balls there are moved further in
  (the game keeps doorways safe to walk into); every change is reported on
  stderr, and so is a patrol line that still passes beside a doorway;
- every door and pickup must be reachable over floor cells from the first
  door without crossing a guard's or a ball's line (the clear lane that
  tests/e2e/support/roomPath.ts walks); a room that fails is reported and
  emitted anyway, so the failure is seen, not hidden.

Charms are game design, not map reading: CHARM_ROOMS says which room holds
which charm (each kind twice, away from the cauldron and the start), and the
charm goes on the free floor cell nearest the middle of the room, off every
patrol line. Of each pair, one room is nearer both the cauldron and the
start room than the other; rooms are emitted nearest the cauldron first.

usage: emit.py > entries.ts"""
import json
import os
import sys
from collections import deque

ROOMS = os.path.join(os.path.dirname(__file__), 'rooms.json')
DOOR_CELL = {'north': (4, 0), 'south': (4, 7), 'west': (0, 4), 'east': (7, 4)}
TINT = {6: 'yellow', 3: 'blue', 1: 'blue', 2: 'green', 5: 'purple', 4: 'red'}
CAULDRON_ROOM = {'cauldron': '{ x: 4, z: 4, height: 0 }', 'wizard': '{ x: 4, z: 2 }'}
CHARM_ROOMS = {
    'map--1-3': 'goblet', 'map-7--1': 'goblet',
    'map--3-1': 'gem', 'map-7--3': 'gem',
    'map--1-4': 'wine-bottle', 'map-6-0': 'wine-bottle',
    'map--4-1': 'crystal-ball', 'map-4--2': 'crystal-ball',
    'map--2-4': 'boot', 'map--8-6': 'boot',
    'map--4-2': 'teacup', 'map--8-4': 'teacup',
    'map--1-5': 'poison', 'map--6-6': 'poison',
    'map--1-6': 'life', 'map-4-2': 'life',
}


def emit(rooms):
    entries = []
    steps = steps_from('room-001', rooms)
    for room_id, room in sorted(rooms.items(), key=lambda kv: (steps[kv[0]], kv[0])):
        room = clear_doorways(room_id, room)
        blocked = {tuple(c[:2]) for key in ('blocks', 'tables', 'flames', 'spikes') for c in room.get(key, [])}
        if room_id == 'room-001':
            blocked.add((4, 4))
        lanes_blocked = blocked | patrolled_cells(room)
        pickup = place_pickup(room_id, room, lanes_blocked)
        check_reachable(room_id, room['exits'], lanes_blocked, pickup)
        entries.append(spec_text(room_id, room, lanes_blocked, pickup))
    return ',\n'.join(entries)


def steps_from(origin, rooms):
    steps = {origin: 0}
    queue = deque([origin])
    while queue:
        room_id = queue.popleft()
        for target in rooms[room_id]['exits'].values():
            if target not in steps:
                steps[target] = steps[room_id] + 1
                queue.append(target)
    return steps


def clear_doorways(room_id, room):
    """The room with its doorways kept safe: spikes and floor flames beside
    a door dropped, ghosts and patrol waypoints moved further in."""
    exits = room['exits']
    room = dict(room)
    room['spikes'] = [s for s in room.get('spikes', []) if not dropped_beside_door(room_id, 'spike', s, exits)]
    room['flames'] = [f for f in room.get('flames', []) if f[2] > 0 or not dropped_beside_door(room_id, 'flame', f, exits)]
    room['ghosts'] = [clear_of_doors(room_id, 'ghost', g, exits) for g in room.get('ghosts', [])]
    room['pathGuards'] = [[clear_of_doors(room_id, 'guard waypoint', c, exits) for c in path]
                          for path in room.get('pathGuards', [])]
    room['balls'] = [[clear_of_doors(room_id, 'ball end', c, exits) for c in line] for line in room.get('balls', [])]
    for cell in sorted(patrolled_cells(room)):
        door = door_beside(cell, exits)
        if door:
            print(f'{room_id}: a patrol passes {cell}, beside the {door} door', file=sys.stderr)
    return room


def dropped_beside_door(room_id, kind, cell, exits):
    door = door_beside(cell, exits)
    if door:
        print(f'{room_id}: {kind} {tuple(cell[:2])} dropped, beside the {door} door', file=sys.stderr)
    return door is not None


def door_beside(cell, exits):
    for direction in exits:
        dx, dz = DOOR_CELL[direction]
        if abs(cell[0] - dx) <= 1 and abs(cell[1] - dz) <= 1:
            return direction
    return None


INWARD = {'north': (0, 1), 'south': (0, -1), 'west': (1, 0), 'east': (-1, 0)}


def clear_of_doors(room_id, kind, cell, exits):
    """A ghost or a patrol waypoint within a cell of a doorway is moved
    further in, so nobody entering is caught on the threshold."""
    x, z = cell
    for d in exits:
        dx, dz = DOOR_CELL[d]
        while abs(x - dx) <= 1 and abs(z - dz) <= 1:
            x, z = x + INWARD[d][0], z + INWARD[d][1]
    if (x, z) != tuple(cell):
        print(f'{room_id}: {kind} at {tuple(cell)} moved to {(x, z)}, clear of a doorway', file=sys.stderr)
    return (x, z)


def patrolled_cells(room):
    """Every cell a guard or a ball passes through."""
    return {cell for route in room['pathGuards'] + room['balls'] for cell in route_cells(route)}


def route_cells(route):
    """Cells along a closed loop of waypoints (a ball's line is a loop of
    two), stepping one cell at a time towards the next waypoint on each axis
    as the ball does; a guard walks the same cells on a straight row or
    column."""
    cells = set()
    for (x, z), end in zip(route, route[1:] + route[:1]):
        cells.add((x, z))
        while (x, z) != tuple(end):
            x, z = x + sign(end[0] - x), z + sign(end[1] - z)
            cells.add((x, z))
    return cells


def sign(v):
    return (v > 0) - (v < 0)


def place_pickup(room_id, room, blocked):
    item = CHARM_ROOMS.get(room_id)
    if not item:
        return None
    start = DOOR_CELL[next(iter(room['exits']))]
    doors = [DOOR_CELL[d] for d in room['exits']]
    free = [c for c in floor_reach(start, blocked)
            if all(max(abs(c[0] - d[0]), abs(c[1] - d[1])) > 1 for d in doors)]
    cell = min(free, key=lambda c: (abs(c[0] - 3.5) + abs(c[1] - 3.5), c))
    return {'x': cell[0], 'z': cell[1], 'item': item}


def floor_reach(start, blocked):
    seen = {start}
    queue = deque([start])
    while queue:
        x, z = queue.popleft()
        for n in ((x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)):
            if 0 <= n[0] < 8 and 0 <= n[1] < 8 and n not in seen and n not in blocked:
                seen.add(n)
                queue.append(n)
    return seen


def check_reachable(room_id, exits, blocked, pickup):
    reach = floor_reach(DOOR_CELL[next(iter(exits))], blocked)
    targets = [DOOR_CELL[d] for d in exits] + ([(pickup['x'], pickup['z'])] if pickup else [])
    for t in targets:
        if t not in reach:
            print(f'{room_id}: {t} cannot be reached over the floor clear of patrols', file=sys.stderr)


def spec_text(room_id, room, blocked, pickup):
    tint = TINT.get(room.get('colour'), 'yellow')
    exits = ', '.join(f"{{ direction: '{d}', target: '{t}' }}" for d, t in room['exits'].items())
    lines = [f"    id: '{room_id}', tint: '{tint}'" + ('' if room_id == 'room-001' else ', mapped: true') + ',',
             f'    exits: [{exits}],',
             f'    spawn: {cell_text(spawn_cell(blocked))},']
    lines.append(f"    platforms: [{', '.join(block_text(b) for b in room.get('blocks', []))}],")
    if room['spikes']:
        lines.append(f"    spikes: [{', '.join(cell_text(s) for s in room['spikes'])}],")
    for key in ('tables', 'flames'):
        if room.get(key):
            lines.append(f"    {key}: [{', '.join(block_text(c) for c in room[key])}],")
    if room['ghosts']:
        lines.append(f"    ghosts: [{', '.join(cell_text(c) for c in room['ghosts'])}],")
    if room['pathGuards']:
        guards = ', '.join(f"{{ path: [{', '.join(cell_text(c) for c in path)}] }}" for path in room['pathGuards'])
        lines.append(f'    pathGuards: [{guards}],')
    if room['balls']:
        balls = ', '.join(f'{{ from: {cell_text(a)}, to: {cell_text(b)} }}' for a, b in room['balls'])
        lines.append(f'    balls: [{balls}],')
    if pickup:
        lines.append(f"    pickups: [{{ x: {pickup['x']}, z: {pickup['z']}, item: '{pickup['item']}' }}],")
    if room_id == 'room-001':
        lines += [f'    {k}: {v},' for k, v in CAULDRON_ROOM.items()]
    return '  {\n' + '\n'.join(lines) + '\n  }'


def spawn_cell(blocked):
    return min(((x, z) for x in range(8) for z in range(8) if (x, z) not in blocked),
               key=lambda c: (abs(c[0] - 4) + abs(c[1] - 1), c))


def cell_text(c):
    return f'{{ x: {c[0]}, z: {c[1]} }}'


def block_text(b):
    return f'{{ x: {b[0]}, z: {b[1]}, height: {b[2]} }}'


if __name__ == '__main__':
    print(emit(json.load(open(ROOMS))))
