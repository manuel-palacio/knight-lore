"""Decode the original's room table.

The loader at 0xD3C6 walks records from 0x6251 to 0x6BD1: [room id][length]
then length-1 bytes, the length jumping to the next record. After the id:

  attributes   bits 0-2 the room's colour, bits 3-7 its size (table at
               0x6248: full, narrow in x, narrow in y)
  background   one byte per wall, arch or door piece, until 0xFF
  foreground   groups of [type << 3 | (count - 1)] then count position
               bytes zz yyy xxx: cell x and y 0-7 and a height 0-3

A foreground type points (table at 0x6BD1) to a template of parts, each
starting with its graphic number, which indexes the sprite table at 0x7100.

usage (from the repo root): python3 tools/rip/rooms.py [ROOM_ID ...]"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from z80 import load_memory  # noqa: E402

SNAPSHOT = 'reference/KnightLore.z80'
TABLE_START, TABLE_END = 0x6251, 0x6BD1
FOREGROUND_TYPES = 0x6BD1
SPRITES = 0x7112
TEMPLATE_PART = 6


def records(memory):
    address = TABLE_START
    while address < TABLE_END:
        room_id, length = memory[address], memory[address + 1]
        yield room_id, memory[address + 2:address + 1 + length]
        address += 1 + length


def decode_room(memory, body):
    attributes, rest = body[0], body[1:]
    # A room with nothing on its floor ends with its background, no 0xFF.
    end = rest.index(0xFF) if 0xFF in rest else len(rest)
    background, foreground = list(rest[:end]), rest[end + 1:]
    objects = []
    i = 0
    while i < len(foreground):
        kind, count = foreground[i] >> 3, (foreground[i] & 7) + 1
        for position in foreground[i + 1:i + 1 + count]:
            objects.append({'type': kind, 'graphics': graphics_of(memory, kind),
                            'x': position & 7, 'y': (position >> 3) & 7, 'z': position >> 6})
        i += 1 + count
    return {'colour': attributes & 7, 'size': attributes >> 3, 'background': background, 'objects': objects}


def graphics_of(memory, kind):
    template = memory[FOREGROUND_TYPES + 2 * kind] | memory[FOREGROUND_TYPES + 2 * kind + 1] << 8
    parts = []
    while True:
        parts.append(memory[template])
        template += TEMPLATE_PART
        if memory[template] == 0:
            return parts


def all_rooms(memory):
    return {room_id: decode_room(memory, body) for room_id, body in records(memory)}


if __name__ == '__main__':
    rooms = all_rooms(load_memory(SNAPSHOT))
    wanted = [int(a, 0) for a in sys.argv[1:]] or list(rooms)[:6]
    print(len(rooms), 'rooms')
    for room_id in wanted:
        print(hex(room_id), rooms[room_id])
