"""Read the original's room backgrounds: walls, arches and garden gates.

Each background byte of a room (see rooms.py) indexes the table at 0x6CE2,
which points to a list of parts, 8 bytes each and ending in 0: graphic, x,
y, z (pixels, as the room's objects), width, depth, height and flags, bit 6
of which mirrors the sprite. The loader at 0xD41C makes each an object. The
graphic's handler (table at 0xB096) sets where the sprite is drawn from the
object's place: most load the offsets straight away (ld hl, then 0xC72B) or call or jump to
where they do;
the arch halves' (0xC722, 0xC73C) choose them by the mirror bit. The
original then draws it at x + y - 128 + dx across and (y - x + 128) / 2 +
z - 0x68 + dy up the screen (0xD6D1)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

BACKDROPS = 0x6CE2
PART = 8
HANDLERS = 0xB096
MIRRORED = 0x40
LD_HL, CALL, JUMP = 0x21, 0xCD, 0xC3
FAR_HALF, NEAR_HALF = 0xC722, 0xC73C
GATE = 4


def backdrop_parts(memory, background):
    parts = []
    for piece in background:
        at = word(memory, BACKDROPS + 2 * piece)
        while memory[at]:
            graphic, x, y, z = memory[at:at + 4]
            flip = bool(memory[at + PART - 1] & MIRRORED)
            dx, dy = draw_offsets(memory, graphic, flip)
            parts.append({'graphic': graphic, 'x': x, 'y': y, 'z': z, 'flip': flip, 'dx': dx, 'dy': dy})
            at += PART
    return parts


def draw_offsets(memory, graphic, flip):
    handler = word(memory, HANDLERS + 2 * graphic)
    if handler == FAR_HALF:
        return (-7, -2) if flip else (-9, -3)
    if handler == NEAR_HALF:
        return (-17, -2) if flip else ((1, -3) if graphic == GATE else (-7, -3))
    if memory[handler] in (CALL, JUMP):
        handler = word(memory, handler + 1)
    if memory[handler] != LD_HL:
        raise ValueError(f'graphic {graphic:#x}: handler {handler:#x} sets no draw offsets')
    return signed(memory[handler + 1]), signed(memory[handler + 2])


def word(memory, address):
    return memory[address] | memory[address + 1] << 8


def signed(byte):
    return byte - 256 if byte > 127 else byte
