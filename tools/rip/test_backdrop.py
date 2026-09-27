"""Checks the reading of the original's room backgrounds: python3 tools/rip/test_backdrop.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from backdrop import backdrop_parts  # noqa: E402
from z80 import load_memory  # noqa: E402

MEMORY = load_memory('reference/KnightLore.z80')


def test_an_arch_is_two_halves_placed_and_offset_as_the_original_draws_them():
    # Background 3, the west arch: graphics 2 (near half) and 3 (far half),
    # not mirrored; their handlers (0xC73C, 0xC722) offset them by (-7, -3) and (-9, -3).
    near, far = backdrop_parts(MEMORY, [3])
    assert near == {'graphic': 2, 'x': 0x3b, 'y': 0x73, 'z': 0x80, 'flip': False, 'dx': -7, 'dy': -3}, near
    assert far == {'graphic': 3, 'x': 0x3b, 'y': 0x8d, 'z': 0x80, 'flip': False, 'dx': -9, 'dy': -3}, far


def test_a_mirrored_arch_half_takes_the_mirrored_offsets():
    # Background 0, the south arch: flags 0x50, bit 6 mirrors it.
    near, far = backdrop_parts(MEMORY, [0])
    assert (near['flip'], near['dx'], near['dy']) == (True, -17, -2), near
    assert (far['flip'], far['dx'], far['dy']) == (True, -7, -2), far


def test_a_full_room_s_walls_are_thirteen_parts_offset_by_their_handlers():
    walls = backdrop_parts(MEMORY, [12])
    assert len(walls) == 13
    # Graphic 0x0A, a long slab: its handler 0xC4E8 loads (-20, -1).
    slab = next(p for p in walls if p['graphic'] == 0x0A)
    assert (slab['dx'], slab['dy']) == (-20, -1), slab


if __name__ == '__main__':
    tests = [f for name, f in sorted(globals().items()) if name.startswith('test_')]
    for test in tests:
        test()
    print(f'{len(tests)} ok')
