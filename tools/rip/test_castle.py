"""Checks the castle generator's rules on hand-built rooms: python3 tools/rip/test_castle.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from castle import RoomBuild, Walkable  # noqa: E402

PLACED = {'half_x': False, 'half_y': False, 'lift': 0}


def thing(kind, x, y, z=0, **placement):
    return {'type': kind, 'x': x, 'y': y, 'z': z, 'placement': {**PLACED, **placement}}


def build(objects, room_id=0x44):
    room = RoomBuild(room_id, {'colour': 4, 'size': 0, 'background': [], 'objects': objects}, {})
    room.finish()
    return room


def path_of(room):
    return [(c['x'], c['z']) for c in room.fields['pathGuards'][0]['path']]


def test_guard_8_walks_along_x_first_towards_minus_x_and_back_when_blocked():
    # 0xB73C: dx is -2 until the guard is blocked, then +2, and so on.
    room = build([thing(8, 4, 3), thing(0, 1, 3), thing(0, 6, 3)])
    assert path_of(room) == [(4, 3), (2, 3), (5, 3)], path_of(room)


def test_guard_8_on_a_half_row_is_stopped_by_a_block_in_either_row():
    room = build([thing(8, 4, 3, half_y=True), thing(0, 2, 4)])
    assert path_of(room) == [(4, 3.5), (3, 3.5), (7, 3.5)], path_of(room)


def test_guard_13_turns_minus_x_plus_y_plus_x_minus_y_each_time_it_is_blocked():
    # 0xB9D8: the rectangle guard's four headings, taken in turn when blocked.
    # From (4,3): -x to (2,3), +y to (2,5), +x to (5,5), -y to (5,2), -x to
    # (2,2), +y back to (2,5): the loop it keeps to, without the lead-in.
    blocks = [thing(0, 1, 3), thing(0, 2, 6), thing(0, 6, 5), thing(0, 5, 1), thing(0, 1, 2)]
    room = build([thing(13, 4, 3)] + blocks)
    assert path_of(room) == [(2, 5), (5, 5), (5, 2), (2, 2)], path_of(room)


def test_guard_13_in_an_empty_room_walks_round_its_edge():
    room = build([thing(13, 3, 3)])
    assert path_of(room) == [(0, 7), (7, 7), (7, 0), (0, 0)], path_of(room)


def test_balls_bounce_where_they_stand_offset_by_their_template():
    room = build([thing(12, 3, 3, half_x=True, half_y=True), thing(24, 5, 5, 1)])
    assert room.fields['balls'] == [{'x': 3.5, 'z': 3.5, 'height': 0}, {'x': 5, 'z': 5, 'height': 1}]


def test_a_type_19_spiked_ball_hangs_four_blocks_above_its_level_and_only_the_first_drops():
    room = build([thing(19, 3, 3, 2, lift=48), thing(19, 4, 3, 2, lift=48)])
    assert room.fields['spikedBalls'] == [{'x': 3, 'z': 3, 'height': 6, 'drops': True}, {'x': 4, 'z': 3, 'height': 6}]


def test_in_an_odd_room_the_dropper_waits_and_the_hopper_springs_at_random():
    room = build([thing(19, 3, 3, 2, lift=48), thing(23, 5, 5)], room_id=0x45)
    assert room.fields['spikedBalls'][0]['waits'] is True
    assert room.fields['hoppers'] == [{'x': 5, 'z': 5, 'height': 0, 'randomHops': True}]


def test_the_dropper_lies_where_it_lands_and_the_others_hang_out_of_reach():
    room = build([thing(19, 3, 3, 2, lift=48), thing(19, 4, 3, 2, lift=48)])
    walk = Walkable(room)
    assert walk.standings((3, 3)) == []
    assert walk.standings((4, 3)) == [0]


def test_a_type_21_block_is_a_falling_block_not_a_collapsing_one():
    room = build([thing(21, 3, 3, 1), thing(22, 4, 3, 1)])
    assert room.fields['fallingBlocks'] == [{'x': 3, 'z': 3, 'height': 2}]
    assert room.fields['vanishing'] == [{'x': 4, 'z': 3, 'height': 2}]


def test_a_collapsing_block_is_walked_under_never_stood_on():
    # 0xB6A2 -> 0xBF2B -> 0xBF37: gone two frames after it is stood on.
    walk = Walkable(build([thing(22, 3, 3, 0), thing(22, 4, 3, 2)]))
    assert walk.standings((3, 3)) == []
    assert walk.standings((4, 3)) == [0]


if __name__ == '__main__':
    tests = [f for name, f in sorted(globals().items()) if name.startswith('test_')]
    for test in tests:
        test()
    print(f'{len(tests)} ok')
