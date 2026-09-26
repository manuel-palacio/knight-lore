"""Generate the castle, ROOM_SPECS in src/scenes/rooms/roomSpecs.ts, from the
original's room table (rooms.py decodes it).

A room id is (8 + rz) * 16 + (8 + rx): the room is map-<rx>-<rz>, and 0x88,
the cauldron's, is room-001. Doors are background bytes 0-3 (arches) and
4-7 (garden gates), south, east, north, west, leading to the room 16 on, 1
on, 16 back, 1 back; a door is kept when the room it leads to has the door
back. A room is 8 by 8 cells, or 4 across on one axis (its size byte; the
narrow axis keeps cells 2-5). Each object type maps onto the game's
entities; blocks stacked in a cell become one column as tall as the highest.

The charms are the game's, not the table's: each kind twice, three to eight
rooms from the cauldron and away from the start rooms, on the free floor
cell nearest the middle that can be walked to. Anything the generator has to drop or move is reported.

usage (from the repo root): python3 tools/rip/castle.py"""
import math
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
NEAR_ENOUGH = 8

# Type 16 zeroes its own velocity before it moves (0xC4AA): pushed, it never
# moves, a block like any other.
BLOCK_TYPES = {0, 3, 4, 11, 16}
SPIKES, GHOST, SPARKLE = 5, 9, 25
# Pushable (template flag bit 2): a table moves only while pushed (0xC4C3), a
# chest slides on until stopped (0xC4B6).
BOXES = {6: 'chest', 7: 'table'}
FLAMES = {10, 20}
# Guards: 8 walks back and forth along x (handler 0xB73C), 13 round a
# rectangle (0xB9A5). Balls bounce where they stand (0xB865); 23 hops after
# Sabreman (0xB5FF).
GUARDS = {8, 13}
BALLS = {2, 12, 24, 28}
HOPPER = 23
MOVERS = {14: 'x', 15: 'z'}
FALLING, CRUMBLING = 21, 22
SPIKED_BALLS = {18, 19}
GATES = {26: 'x', 27: 'z'}
PIXELS_PER_BLOCK = 12
# 0xB9D8: the rectangle guard turns -x, +y, +x, -y, each when it is blocked.
ROUND_TURNS = [(-1, 0), (0, 1), (1, 0), (0, -1)]

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
        # The original holds back some things in odd-numbered rooms (0xD20D).
        self.odd = bool(room_id & 1)
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
        if kind in BLOCK_TYPES:
            self.stacks.setdefault(cell, set()).add(level)
        elif kind == SPIKES:
            self.put('spikes', {'x': x, 'z': z, **({'height': level} if level else {})})
        elif kind in BOXES:
            self.put('boxes', {'x': x, 'z': z, 'height': level, 'kind': BOXES[kind]})
        elif kind == GHOST:
            self.put('ghosts', {'x': x, 'z': z})
        elif kind in FLAMES:
            self.put('flames', {'x': x, 'z': z, 'height': level})
        elif kind == CRUMBLING:
            self.put('vanishing', {'x': x, 'z': z, 'height': level + 1})
        elif kind == FALLING:
            self.put('fallingBlocks', {'x': x, 'z': z, 'height': level + 1})
        elif kind in SPIKED_BALLS:
            # Every spiked ball rolls the same random byte each frame, in table
            # order, and one that has landed takes the turn again (0xB7A9):
            # only the room's first ever drops.
            height = level + obj['placement']['lift'] // PIXELS_PER_BLOCK
            if 'spikedBalls' in self.fields:
                self.put('spikedBalls', {'x': x, 'z': z, 'height': height})
            else:
                self.put('spikedBalls', {'x': x, 'z': z, 'height': height, 'drops': True, **({'waits': True} if self.odd else {})})
        elif kind in GATES:
            self.put('_gates', (x, z, GATES[kind]))
        elif kind in GUARDS:
            self.put('_guards', (x, z, kind, obj['placement']['half_y']))
        elif kind in BALLS:
            self.put('_balls', (x, z, level, obj['placement']))
        elif kind == HOPPER:
            self.put('_hoppers', (x, z, level))
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
        for x, z, kind, half in self.fields.pop('_guards', []):
            x, z = self.inward(x, z)
            route = self.guard_route(kind, x, z, half)
            if len(route) > 1:
                self.put('pathGuards', {'path': [{'x': a, 'z': b + (0.5 if half else 0)} for a, b in route]})
            else:
                warn(f'{self.id}: guard at ({x},{z}) has nowhere to walk, dropped')
        for x, z, level, placement in self.fields.pop('_balls', []):
            x, z = self.inward(x, z)
            self.put('balls', {'x': x + 0.5 if placement['half_x'] else x, 'z': z + 0.5 if placement['half_y'] else z, 'height': level})
        for x, z, level in self.fields.pop('_hoppers', []):
            x, z = self.inward(x, z)
            self.put('hoppers', {'x': x, 'z': z, 'height': level, **({'randomHops': True} if self.odd else {})})
        for x, z, level, axis in self.fields.pop('_movers', []):
            line = self.free_line(x, z, axis)
            if line:
                self.put('movingPlatforms', {'from': {'x': line[0][0], 'z': line[0][1]}, 'to': {'x': line[1][0], 'z': line[1][1]}, 'height': level + 1})
            else:
                self.columns[(x, z)] = max(self.columns.get((x, z), 0), level + 1)
                warn(f'{self.id}: moving block at ({x},{z}) has nowhere to move, kept as a block')
        self.fields['platforms'] = [{'x': x, 'z': z, 'height': h} for (x, z), h in sorted(self.columns.items())]

    def guard_route(self, kind, x, z, half):
        """The corners a guard turns at, walking as its handler does: 8 along x,
        first towards -x, back whenever it is blocked; 13 round the turns of
        ROUND_TURNS. The loop it settles into, from where it starts."""
        if kind == 8:
            low = self.walk_until_blocked((x, z), (-1, 0), half)
            high = self.walk_until_blocked(low, (1, 0), half)
            return distinct_corners([(x, z), low, high])
        corners, seen, at, turn = [], {}, (x, z), 0
        while (at, turn) not in seen:
            seen[(at, turn)] = len(corners)
            corners.append(at)
            at = self.walk_until_blocked(at, ROUND_TURNS[turn], half)
            turn = (turn + 1) % 4
        loop_start = seen[(at, turn)]
        if corners[loop_start] != (x, z):
            warn(f'{self.id}: guard at ({x},{z}) starts at {corners[loop_start]}, where its loop begins')
        return distinct_corners(corners[loop_start:])

    def walk_until_blocked(self, at, step, half):
        x, z = at
        while self.guard_fits(x + step[0], z + step[1], half):
            x, z = x + step[0], z + step[1]
        return x, z

    def guard_fits(self, x, z, half):
        """A guard on a half cell (half) straddles this row and the next."""
        solid = {(p['x'], p['z']) for p in self.fields.get('boxes', [])}
        rows = (z, z + 1) if half else (z,)
        return all(0 <= x < self.width and 0 <= r < self.depth and not self.blocked(x, r) and (x, r) not in solid
                   and not self.near_door(x, r) for r in rows)

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
        """Blocks, floor spikes and grilles stop a guard or a ball: a guard in a
        cage walks between its grilles."""
        gates = set()
        for gate in self.fields.get('portcullises', []):
            gates |= set(cells_between(gate['from'], gate['to']))
        floor_spike = any(s['x'] == x and s['z'] == z and not s.get('height') for s in self.fields.get('spikes', []))
        return (x, z) in self.columns or (x, z) in gates or floor_spike

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
        for field in ('spikes', 'boxes', 'flames', 'vanishing', 'fallingBlocks', 'ghosts', 'spikedBalls', 'hoppers'):
            taken |= {(c['x'], c['z']) for c in self.fields.get(field, [])}
        for gate in self.fields.get('portcullises', []):
            taken |= set(cells_between(gate['from'], gate['to']))
        for line in self.fields.get('pathGuards', []):
            path = line['path']
            for a, b in zip(path, path[1:] + path[:1]):
                taken |= set(cells_between(a, b))
        for ball in self.fields.get('balls', []):
            taken |= set(covered_cells(ball))
        cx, cz = (self.width - 1) / 2, (self.depth - 1) / 2
        cells = [(x, z) for x in range(self.width) for z in range(self.depth) if (x, z) not in taken and not self.near_door(x, z)]
        return sorted(cells, key=lambda c: (abs(c[0] - cx) + abs(c[1] - cz), c))

    def spawn(self):
        for x, z in sorted(((x, z) for x in range(self.width) for z in range(self.depth)), key=lambda c: (c[1], abs(c[0] - self.width // 2))):
            if (x, z) not in self.columns and not self.blocked(x, z):
                return x, z
        return 0, 0


GHOST_LIKE = {GHOST} | set(SPIKED_BALLS) | FLAMES


def distinct_corners(corners):
    """Drops a corner the walk did not move from, and a last one back where it started."""
    out = []
    for c in corners:
        if not out or out[-1] != c:
            out.append(c)
    while len(out) > 1 and out[-1] == out[0]:
        out.pop()
    return out


def covered_cells(point):
    """The cells under something standing on a cell, or on the line between two."""
    xs = {math.floor(point['x']), math.ceil(point['x'])}
    zs = {math.floor(point['z']), math.ceil(point['z'])}
    return [(x, z) for x in sorted(xs) for z in sorted(zs)]


def cells_between(a, b):
    """Every cell from a to b, stepping one cell at a time, both cells of a half-cell line."""
    x, z = a['x'], a['z']
    out = covered_cells({'x': x, 'z': z})
    while (x, z) != (b['x'], b['z']):
        x += (b['x'] > x) - (b['x'] < x)
        z += (b['z'] > z) - (b['z'] < z)
        out += covered_cells({'x': x, 'z': z})
    return list(dict.fromkeys(out))


# A tapped jump rises a block; a held one two, but only with a run-up: the
# cell he jumps from entered from the one behind it, as high (see Player).
CLIMB, HIGH_CLIMB, HEADROOM = 1, 2, 2
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
        # Walkers take boxes as they stand, a pile of them as tall as it is.
        for b in sorted(f.get('boxes', []), key=lambda b: b['height']):
            cell = (b['x'], b['z'])
            self.columns[cell] = max(self.columns.get(cell, 0), b['height']) + 1
        self.hanging, self.floor_blocked, self.floor_spikes, self.hazards = {}, set(), set(), {}
        # A collapsing block is gone two frames after it is stood on: it can
        # be walked under, never stood on.
        self.overhead = {}
        for b in f.get('floatingBlocks', []):
            self.hanging.setdefault((b['x'], b['z']), []).append(b['bottom'])
        for v in f.get('fallingBlocks', []):
            self.hanging.setdefault((v['x'], v['z']), []).append(v['height'] - 1)
        for v in f.get('vanishing', []):
            self.overhead.setdefault((v['x'], v['z']), []).append(v['height'] - 1)
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
            # The one that drops lets go in the end, and lies where it lands.
            cell = (b['x'], b['z'])
            self.hazards.setdefault(cell, []).append(self.ground_under(cell, b['height']) if b.get('drops') else b['height'])

    def ground_under(self, cell, height):
        """What something falling from a height in this cell comes to rest on."""
        tops = [self.columns.get(cell, 0)] + [b + 1 for b in self.hanging.get(cell, []) if b + 1 <= height]
        return max(tops)

    def standings(self, c):
        column = self.columns.get(c)
        base = column or 0
        hanging = self.hanging.get(c, [])
        heights = []
        floor_ok = column is not None or (c not in self.floor_blocked and c not in self.floor_spikes)
        if floor_ok and all(b >= base + HEADROOM or b < base for b in hanging + self.overhead.get(c, [])):
            heights.append(base)
        heights += [b + 1 for b in hanging if b >= base]
        return [y for y in heights if not any(y <= h < y + HEADROOM for h in self.hazards.get(c, []))]

    def jumpable(self, c):
        """A floor cell whose dangers all lie on the floor (spikes, a spiked ball
        lying there), with nothing over them for a jump to run into."""
        low = self.hazards.get(c, [])
        clear = c not in self.columns and c not in self.hanging and c not in self.overhead
        return clear and (c in self.floor_spikes or bool(low)) and all(h == 0 for h in low)

    def inside(self, x, z):
        return 0 <= x < self.width and 0 <= z < self.depth

    def reaches(self, start, goal):
        first = ((start[0], start[1], self.columns.get(start, 0)), None)
        seen, queue = {first}, deque([first])
        while queue:
            (x, z, y), came = queue.popleft()
            if (x, z) == goal:
                return True
            nexts = []
            for dx, dz in STEPS:
                if self.inside(x + dx, z + dz):
                    reach = y + (HIGH_CLIMB if came == (x - dx, z - dz, y) else CLIMB)
                    nexts += [(x + dx, z + dz, t) for t in self.standings((x + dx, z + dz)) if t <= reach]
                # A held jump carries about five units: over one cell, or over two
                # of spikes (a spiked ball stands too tall for the ends of so long a jump).
                for span in (1, 2):
                    over = [(x + k * dx, z + k * dz) for k in range(1, span + 1)]
                    land = (x + (span + 1) * dx, z + (span + 1) * dz)
                    fits = all(self.jumpable(c) and (span == 1 or not self.hazards.get(c)) for c in over)
                    if y == 0 and fits and self.inside(*land) and 0 in self.standings(land):
                        nexts.append((land[0], land[1], 0))
            for n in nexts:
                state = (n, (x, z, y))
                if state not in seen:
                    seen.add(state)
                    queue.append(state)
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
    # A day's walk: far enough from the cauldron to matter, near enough that a
    # charm can be fetched and brought back within a day or so.
    near_enough = [r for r in candidates if from_cauldron[r] <= NEAR_ENOUGH]
    if len(near_enough) >= 16:
        candidates = near_enough
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


FIELD_ORDER = ['platforms', 'floatingBlocks', 'spikes', 'boxes', 'vanishing', 'fallingBlocks', 'movingPlatforms', 'portcullises',
               'pathGuards', 'balls', 'hoppers', 'ghosts', 'spikedBalls', 'flames', 'pickups']


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
