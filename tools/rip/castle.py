"""Generate the castle, ROOM_SPECS in src/scenes/rooms/roomSpecs.ts, from the
original's room table (rooms.py decodes it).

A room id is (8 + rz) * 16 + (8 + rx): the room is map-<rx>-<rz>, and 0x88,
the cauldron's, is room-001. Doors are background bytes 0-3 (arches) and
4-7 (garden gates), south, east, north, west, leading to the room 16 on, 1
on, 16 back, 1 back; a door is kept when the room it leads to has the door
back. A room is 8 by 8 cells, or 4 across on one axis (its size byte; the
narrow axis keeps cells 2-5). Each object type maps onto the game's
entities; blocks stacked in a cell become one column as tall as the highest.

The charms are the game's, not the table's: each kind twice, in rooms far
from the cauldron and from the start rooms, on the free floor cell nearest
the middle. Anything the generator has to drop or move is reported.

usage (from the repo root): python3 tools/rip/castle.py"""
import os
import re
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(__file__))
from rooms import all_rooms  # noqa: E402
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
SPECS = 'src/scenes/rooms/roomSpecs.ts'
CAULDRON = 0x88
START_TABLE = 0xD1E2
FULL, NARROW, NARROW_FROM = 8, 4, 2
# 0-3 arches, 4-7 garden gates; a narrow room draws its east and north arches
# in two pieces, 20/22 and 21/23.
DOORS = {0: 'south', 1: 'east', 2: 'north', 3: 'west', 4: 'south', 5: 'east', 6: 'north', 7: 'west',
         20: 'east', 22: 'east', 21: 'north', 23: 'north'}
STEP = {'south': 16, 'east': 1, 'north': -16, 'west': -1}
OPPOSITE = {'south': 'north', 'north': 'south', 'east': 'west', 'west': 'east'}
TINT = {3: 'purple', 4: 'green', 5: 'cyan', 6: 'yellow'}
CHARMS = ['goblet', 'gem', 'wine-bottle', 'crystal-ball', 'boot', 'teacup', 'poison']

BLOCK_TYPES = {0, 3, 4, 11}
SPIKES, TABLE, GHOST, SPARKLE = 5, 7, 9, 25
PUSHABLE = {6, 16}
FLAMES = {10, 20}
GUARDS = {8, 13}
BALLS = {2: 'x', 12: 'x', 28: 'x', 23: None, 24: None}
MOVERS = {14: 'x', 15: 'z'}
CRUMBLING = {21, 22}
SPIKED_BALLS = {18: False, 19: True}
GATES = {26: 'x', 27: 'z'}

warnings = []


def warn(message):
    warnings.append(message)


def name_of(room_id):
    if room_id == CAULDRON:
        return 'room-001'
    return f'map-{(room_id & 15) - 8}-{(room_id >> 4) - 8}'


def size_of(room):
    return {0: (FULL, FULL), 1: (NARROW, FULL), 2: (FULL, NARROW)}[room['size']]


def exits_of(room_id, rooms):
    exits = {}
    for t in rooms[room_id]['background']:
        if t not in DOORS:
            continue
        direction = DOORS[t]
        target = room_id + STEP[direction]
        back = rooms.get(target)
        if back and OPPOSITE[direction] in {DOORS[b] for b in back['background'] if b in DOORS}:
            exits[direction] = target
        else:
            warn(f'{name_of(room_id)}: {direction} door leads nowhere, left shut')
    return exits


def reachable(rooms, exits, start):
    seen, queue = {start}, deque([start])
    while queue:
        room_id = queue.popleft()
        for target in exits[room_id].values():
            if target not in seen:
                seen.add(target)
                queue.append(target)
    return seen


def distances(exits, start):
    distance, queue = {start: 0}, deque([start])
    while queue:
        room_id = queue.popleft()
        for target in exits[room_id].values():
            if target not in distance:
                distance[target] = distance[room_id] + 1
                queue.append(target)
    return distance


def door_cells(width, depth, exits):
    cells = {'north': (width // 2, 0), 'south': (width // 2, depth - 1),
             'west': (0, depth // 2), 'east': (width - 1, depth // 2)}
    return {cells[d] for d in exits}


class RoomBuild:
    """One room's spec fields, in the room's own cells."""

    def __init__(self, room_id, room, exits):
        self.id = name_of(room_id)
        self.width, self.depth = size_of(room)
        self.dx = NARROW_FROM if self.width == NARROW else 0
        self.dz = NARROW_FROM if self.depth == NARROW else 0
        self.exits = exits
        self.doors = door_cells(self.width, self.depth, exits)
        self.fields = {}
        self.stacks = {}
        self.objects = room['objects']
        for obj in room['objects']:
            self.add(obj)
        self.columns = self.stand_columns()
        self.fields['platforms'] = [{'x': x, 'z': z, 'height': h} for (x, z), h in sorted(self.columns.items())]

    def stand_columns(self):
        """Blocks stacked up from the floor make a column; any block above a gap
        hangs in the air (a floating block)."""
        columns = {}
        for cell, levels in sorted(self.stacks.items()):
            height = 0
            while height in levels:
                height += 1
            if height:
                columns[cell] = height
            for level in sorted(levels - set(range(height))):
                self.put('floatingBlocks', {'x': cell[0], 'z': cell[1], 'bottom': level})
        return columns

    def cell(self, obj):
        x, z = obj['x'] - self.dx, obj['y'] - self.dz
        if not (0 <= x < self.width and 0 <= z < self.depth):
            warn(f'{self.id}: type {obj["type"]} at ({obj["x"]},{obj["y"]}) lies outside the room, dropped')
            return None
        return x, z

    def put(self, field, value):
        self.fields.setdefault(field, []).append(value)

    def add(self, obj):
        kind, level = obj['type'], obj['z']
        cell = self.cell(obj)
        if cell is None or kind == SPARKLE:
            return
        x, z = cell
        if cell in self.doors and level == 0 and kind not in GHOST_LIKE:
            warn(f'{self.id}: type {kind} on the doorway ({x},{z}), dropped')
            return
        if kind in BLOCK_TYPES or (kind in PUSHABLE and level > 0):
            self.stacks.setdefault(cell, set()).add(level)
        elif kind in PUSHABLE and any(o['x'] == obj['x'] and o['y'] == obj['y'] and o['z'] > 0 for o in self.objects):
            self.stacks.setdefault(cell, set()).add(level)  # a chest with something on it is part of the stack
        elif kind == SPIKES:
            self.put('spikes', {'x': x, 'z': z, **({'height': level} if level else {})})
        elif kind in PUSHABLE:
            self.put('pushBlocks', {'x': x, 'z': z})
        elif kind == TABLE:
            self.put('tables', {'x': x, 'z': z, 'height': level + 1})
        elif kind == GHOST:
            self.put('ghosts', {'x': x, 'z': z})
        elif kind in FLAMES:
            self.put('flames', {'x': x, 'z': z, 'height': level})
        elif kind in CRUMBLING:
            self.put('vanishing', {'x': x, 'z': z, 'height': level + 1})
        elif kind in SPIKED_BALLS:
            self.put('spikedBalls', {'x': x, 'z': z, 'height': level, **({'bobs': True} if SPIKED_BALLS[kind] else {})})
        elif kind in GATES:
            self.put('_gates', (x, z, GATES[kind]))
        elif kind in GUARDS:
            self.put('_guards', (x, z))
        elif kind in BALLS:
            self.put('_balls', (x, z, BALLS[kind]))
        elif kind in MOVERS:
            self.put('_movers', (x, z, level, MOVERS[kind]))
        else:
            warn(f'{self.id}: unknown type {kind}, dropped')

    def finish(self):
        """Lines for patrols, balls, moving blocks and gates, once every block is known."""
        self.fields['ghosts'] = [self.clear_of_doors(g) for g in self.fields.get('ghosts', [])]
        for x, z, axis in self.fields.pop('_gates', []):
            if axis == 'x':
                span = (0, self.width - 1) if self.width == NARROW else (x, min(x + 1, self.width - 1))
                self.put('portcullises', {'from': {'x': span[0], 'z': z}, 'to': {'x': span[1], 'z': z}})
            else:
                span = (0, self.depth - 1) if self.depth == NARROW else (z, min(z + 1, self.depth - 1))
                self.put('portcullises', {'from': {'x': x, 'z': span[0]}, 'to': {'x': x, 'z': span[1]}})
        for x, z in self.fields.pop('_guards', []):
            x, z = self.inward(x, z)
            line = self.free_line(x, z, 'x') or self.free_line(x, z, 'z')
            if line:
                self.put('pathGuards', {'path': [{'x': a, 'z': b} for a, b in line]})
            else:
                warn(f'{self.id}: guard at ({x},{z}) has nowhere to walk, dropped')
        for x, z, axis in self.fields.pop('_balls', []):
            x, z = self.inward(x, z)
            line = self.free_line(x, z, axis) if axis else None
            ends = line or [(x, z), (x, z)]
            self.put('balls', {'from': {'x': ends[0][0], 'z': ends[0][1]}, 'to': {'x': ends[1][0], 'z': ends[1][1]}})
        for x, z, level, axis in self.fields.pop('_movers', []):
            line = self.free_line(x, z, axis)
            if line:
                self.put('movingPlatforms', {'from': {'x': line[0][0], 'z': line[0][1]}, 'to': {'x': line[1][0], 'z': line[1][1]}, 'height': level + 1})
            else:
                self.columns[(x, z)] = max(self.columns.get((x, z), 0), level + 1)
                warn(f'{self.id}: moving block at ({x},{z}) has nowhere to move, kept as a block')
        self.fields['platforms'] = [{'x': x, 'z': z, 'height': h} for (x, z), h in sorted(self.columns.items())]

    def clear_of_doors(self, ghost):
        x, z = self.inward(ghost['x'], ghost['z'], 'ghost')
        return {'x': x, 'z': z}

    def inward(self, x, z, what='patrol'):
        """A monster beside a doorway is moved toward the middle of the room, so
        coming in through the door is never a death."""
        cx, cz = self.width // 2, self.depth // 2
        start = (x, z)
        while self.near_door(x, z) and (x, z) != (cx, cz):
            x += (cx > x) - (cx < x)
            z += (cz > z) - (cz < z)
        if (x, z) != start:
            warn(f'{self.id}: {what} at {start} moved to ({x},{z}), clear of a doorway')
        return x, z

    def blocked(self, x, z):
        return (x, z) in self.columns or any(s['x'] == x and s['z'] == z and not s.get('height') for s in self.fields.get('spikes', []))

    def near_door(self, x, z):
        return any(abs(x - dx) <= 1 and abs(z - dz) <= 1 for dx, dz in self.doors)

    def free_line(self, x, z, axis):
        """The free run of floor through (x, z) along an axis, kept a cell clear of the doorways."""
        step = (1, 0) if axis == 'x' else (0, 1)

        def ok(a, b):
            return 0 <= a < self.width and 0 <= b < self.depth and not self.blocked(a, b) and not self.near_door(a, b)

        lo = hi = (x, z)
        while ok(lo[0] - step[0], lo[1] - step[1]):
            lo = (lo[0] - step[0], lo[1] - step[1])
        while ok(hi[0] + step[0], hi[1] + step[1]):
            hi = (hi[0] + step[0], hi[1] + step[1])
        return [lo, hi] if lo != hi else None

    def free_cells(self):
        taken = set(self.columns) | self.doors
        for field in ('spikes', 'pushBlocks', 'tables', 'flames', 'vanishing', 'ghosts', 'spikedBalls'):
            taken |= {(c['x'], c['z']) for c in self.fields.get(field, [])}
        for gate in self.fields.get('portcullises', []):
            taken |= set(cells_between(gate['from'], gate['to']))
        for line in self.fields.get('pathGuards', []):
            path = line['path']
            for a, b in zip(path, path[1:] + path[:1]):
                taken |= set(cells_between(a, b))
        for ball in self.fields.get('balls', []):
            taken |= set(cells_between(ball['from'], ball['to']))
        cx, cz = (self.width - 1) / 2, (self.depth - 1) / 2
        cells = [(x, z) for x in range(self.width) for z in range(self.depth) if (x, z) not in taken and not self.near_door(x, z)]
        return sorted(cells, key=lambda c: (abs(c[0] - cx) + abs(c[1] - cz), c))

    def spawn(self):
        for x, z in sorted(((x, z) for x in range(self.width) for z in range(self.depth)), key=lambda c: (c[1], abs(c[0] - self.width // 2))):
            if (x, z) not in self.columns and not self.blocked(x, z):
                return x, z
        return 0, 0


GHOST_LIKE = {GHOST} | set(SPIKED_BALLS) | FLAMES


def cells_between(a, b):
    x, z = a['x'], a['z']
    out = [(x, z)]
    while (x, z) != (b['x'], b['z']):
        x += (b['x'] > x) - (b['x'] < x)
        z += (b['z'] > z) - (b['z'] < z)
        out.append((x, z))
    return out


CLIMB, HEADROOM = 1, 2
STEPS = ((1, 0), (-1, 0), (0, 1), (0, -1))


class Walkable:
    """Where a walker can stand in a built room, and how he moves: walk or drop
    to a neighbour, climb one block, jump one cell of floor spikes. The same
    rules as tests/e2e/support/roomPath.ts, so the castle the generator calls
    winnable is the one the tests walk."""

    def __init__(self, build):
        f = build.fields
        self.width, self.depth = build.width, build.depth
        self.columns = dict(build.columns)
        for p in f.get('pushBlocks', []):
            self.columns[(p['x'], p['z'])] = 1
        self.hanging, self.floor_blocked, self.floor_spikes, self.hazards = {}, set(), set(), {}
        for b in f.get('floatingBlocks', []):
            self.hanging.setdefault((b['x'], b['z']), []).append(b['bottom'])
        for v in f.get('vanishing', []):
            self.hanging.setdefault((v['x'], v['z']), []).append(v['height'] - 1)
        for t in f.get('tables', []):
            self.floor_blocked.add((t['x'], t['z']))
            self.hanging.setdefault((t['x'], t['z']), []).append(t['height'] - 1)
        if build.id == 'room-001':
            self.floor_blocked.add((4, 4))
        for sp in f.get('spikes', []):
            if sp.get('height'):
                self.hazards.setdefault((sp['x'], sp['z']), []).append(sp['height'])
            else:
                self.floor_spikes.add((sp['x'], sp['z']))
        for fl in f.get('flames', []):
            self.hazards.setdefault((fl['x'], fl['z']), []).append(fl['height'])
        for b in f.get('spikedBalls', []):
            self.hazards.setdefault((b['x'], b['z']), []).append(b['height'])

    def standings(self, c):
        column = self.columns.get(c)
        base = column or 0
        hanging = self.hanging.get(c, [])
        heights = []
        floor_ok = column is not None or (c not in self.floor_blocked and c not in self.floor_spikes)
        if floor_ok and all(b >= base + HEADROOM or b < base for b in hanging):
            heights.append(base)
        heights += [b + 1 for b in hanging if b >= base]
        return [y for y in heights if not any(y <= h < y + HEADROOM for h in self.hazards.get(c, []))]

    def inside(self, x, z):
        return 0 <= x < self.width and 0 <= z < self.depth

    def reaches(self, start, goal):
        first = (start[0], start[1], self.columns.get(start, 0))
        seen, queue = {first}, deque([first])
        while queue:
            x, z, y = queue.popleft()
            if (x, z) == goal:
                return True
            nexts = []
            for dx, dz in STEPS:
                if self.inside(x + dx, z + dz):
                    nexts += [(x + dx, z + dz, t) for t in self.standings((x + dx, z + dz)) if t <= y + CLIMB]
                over = (x + dx, z + dz)
                if y == 0 and over in self.floor_spikes and over not in self.hazards and self.inside(x + 2 * dx, z + 2 * dz) and 0 in self.standings((x + 2 * dx, z + 2 * dz)):
                    nexts.append((x + 2 * dx, z + 2 * dz, 0))
            for n in nexts:
                if n not in seen:
                    seen.add(n)
                    queue.append(n)
        return False


def crossings(build):
    """Which of a room's doors a walker can get between, and which doors lead to its charm."""
    walk = Walkable(build)
    cells = {d: c for d, c in zip(build.exits, door_list(build))}
    through = {(a, b) for a in cells for b in cells if a != b and walk.reaches(cells[a], cells[b])}
    return walk, cells, through


def door_list(build):
    order = {'north': (build.width // 2, 0), 'south': (build.width // 2, build.depth - 1),
             'west': (0, build.depth // 2), 'east': (build.width - 1, build.depth // 2)}
    return [order[d] for d in build.exits]


def walkable_rooms(builds, exits, start):
    """Rooms reached from a start room on foot: entering by a door, leaving by
    any door the walker can get to from it."""
    through = {room_id: crossings(build)[2] for room_id, build in builds.items()}
    seen = set()
    queue = deque((start, d) for d in exits[start])
    entered = {start}
    while queue:
        room_id, came_by = queue.popleft()
        for leave, target in exits[room_id].items():
            if leave != came_by and (came_by, leave) not in through[room_id] and room_id != start:
                continue
            state = (target, OPPOSITE[leave])
            if state not in seen:
                seen.add(state)
                entered.add(target)
                queue.append(state)
    return entered


def place_charms(builds, exits, starts):
    from_cauldron = distances(exits, CAULDRON)
    near_start = set()
    for start in starts:
        near_start |= {r for r, d in distances(exits, start).items() if d <= 1}
    on_foot = set.intersection(*(walkable_rooms(builds, exits, start) for start in starts))
    for start in starts:
        if CAULDRON not in walkable_rooms(builds, exits, start):
            raise SystemExit(f'the cauldron cannot be reached on foot from {name_of(start)}')
    candidates = [r for r in builds if r in on_foot and r != CAULDRON and r not in near_start and from_cauldron.get(r, 0) > 2 and reachable_cells(builds[r])]
    candidates.sort(key=lambda r: (-from_cauldron[r], r))
    items = [c for c in CHARMS for _ in range(2)] + ['life', 'life']
    # Spread: take every n-th of the far-first ordering so charms are not bunched.
    stride = max(1, len(candidates) // len(items))
    chosen = candidates[::stride][:len(items)]
    if len(chosen) < len(items):
        raise SystemExit(f'only {len(chosen)} rooms for {len(items)} pickups')
    order = [items[i] for i in (list(range(0, len(items), 2)) + list(range(1, len(items), 2)))]
    for room_id, item in zip(chosen, order):
        x, z = reachable_cells(builds[room_id])[0]
        builds[room_id].put('pickups', {'x': x, 'z': z, 'item': item})


def reachable_cells(build):
    """Free floor cells a walker can get to from every door of the room."""
    walk = Walkable(build)
    doors = door_list(build)
    return [c for c in build.free_cells() if 0 in walk.standings(c) and all(walk.reaches(d, c) for d in doors)]


def mark_puzzles(builds):
    """A room whose doors cannot all be reached from one another on foot needs a
    stepping stone or a push: a puzzle the walkers go round."""
    for build in builds.values():
        _, cells, through = crossings(build)
        if len(through) < len(cells) * (len(cells) - 1):
            build.puzzle = True
            warn(f'{build.id}: a puzzle room, not every door can be reached on foot')


def ts_value(value):
    if isinstance(value, dict):
        return '{ ' + ', '.join(f'{k}: {ts_value(v)}' for k, v in value.items()) + ' }'
    if isinstance(value, list):
        return '[' + ', '.join(ts_value(v) for v in value) + ']'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, str):
        return f"'{value}'"
    return str(value)


FIELD_ORDER = ['platforms', 'floatingBlocks', 'spikes', 'pushBlocks', 'tables', 'vanishing', 'movingPlatforms', 'portcullises',
               'pathGuards', 'balls', 'ghosts', 'spikedBalls', 'flames', 'pickups']


def spec_text(room_id, build):
    exits = ', '.join(f"{{ direction: '{d}', target: '{name_of(t)}' }}" for d, t in build.exits.items())
    head = f"    id: '{build.id}', tint: '{TINT[ROOMS[room_id]['colour']]}',"
    if build.width != FULL:
        head += f' width: {build.width},'
    if build.depth != FULL:
        head += f' depth: {build.depth},'
    sx, sz = build.spawn()
    lines = [head, f'    exits: [{exits}],', f'    spawn: {{ x: {sx}, z: {sz} }},']
    for field in FIELD_ORDER:
        values = build.fields.get(field)
        if values or field == 'platforms':
            lines.append(f'    {field}: {ts_value(values or [])},')
    if room_id == CAULDRON:
        lines += ['    cauldron: { x: 4, z: 4, height: 0 },', '    wizard: { x: 4, z: 2 },']
    if getattr(build, 'puzzle', False):
        lines.append('    puzzle: true,')
    return '  {\n' + '\n'.join(lines) + '\n  },'


def write_specs(entries, starts):
    source = open(SPECS).read()
    head = source[:source.index('export const ROOM_SPECS')]
    head = re.sub(r'// Generated by .*\n(//.*\n)*', '', head)
    head = re.sub(r'export const START_ROOMS = .*\n\n?', '', head)
    body = ('// Generated by tools/rip/castle.py from the original\'s room table. Do not\n'
            '// edit here: change the generator and run it again.\n'
            f"export const START_ROOMS = [{', '.join(repr(name_of(s)) for s in starts)}]\n\n"
            'export const ROOM_SPECS: RoomSpec[] = [\n' + '\n'.join(entries) + '\n]\n')
    open(SPECS, 'w').write(head + body)


if __name__ == '__main__':
    memory = load_memory(SNAPSHOT)
    ROOMS = all_rooms(memory)
    starts = [memory[START_TABLE + i] for i in range(4)]
    exits = {room_id: exits_of(room_id, ROOMS) for room_id in ROOMS}
    castle = reachable(ROOMS, exits, CAULDRON)
    for room_id in sorted(set(ROOMS) - castle):
        warn(f'{name_of(room_id)}: not reachable from the cauldron, left out')
    builds = {room_id: RoomBuild(room_id, ROOMS[room_id], exits[room_id]) for room_id in sorted(castle)}
    for build in builds.values():
        build.finish()
    mark_puzzles(builds)
    place_charms(builds, exits, starts)
    write_specs([spec_text(room_id, build) for room_id, build in builds.items()], starts)
    for message in warnings:
        print(message, file=sys.stderr)
    print(f'{len(builds)} rooms written, {len(warnings)} notes', file=sys.stderr)
