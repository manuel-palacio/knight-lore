"""Checks the castle generator's rules on hand-built rooms: python3 tools/rip/test_castle.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from castle import RoomBuild, cells_between, Walkable, charm_spots, charm_table  # noqa: E402
from z80 import load_memory  # noqa: E402

PLACED = {'half_x': False, 'half_y': False, 'lift': 0}


FULL = 8


def thing(kind, x, z, level=0, **placement):
    """An object of the original's room table at our cell (x, z): its y runs the other way."""
    return {'type': kind, 'x': x, 'y': FULL - 1 - z, 'z': level, 'placement': {**PLACED, **placement}}


def test_the_originals_y_runs_the_other_way_to_our_z():
    # map--4-3, the start room: its four-high column is at y 4, which stands at
    # z 3, the back of the room, behind the blocks at y 2 (z 5) in front of it.
    room = build([{'type': 0, 'x': 3, 'y': 4, 'z': level, 'placement': PLACED} for level in range(4)])
    assert room.fields['platforms'] == [{'x': 3, 'z': 3, 'height': 4}], room.fields['platforms']


def build(objects, room_id=0x44, exits=None):
    room = RoomBuild(room_id, {'colour': 4, 'size': 0, 'background': [], 'objects': objects}, exits or {})
    room.finish()
    return room


def path_of(room):
    return [(c['x'], c['z']) for c in room.fields['pathGuards'][0]['path']]


def test_guard_8_walks_along_x_first_towards_minus_x_and_back_when_blocked():
    # 0xB73C: dx is -2 until the guard is blocked, then +2, and so on.
    room = build([thing(8, 4, 3), thing(0, 1, 3), thing(0, 6, 3)])
    assert path_of(room) == [(4, 3), (2, 3), (5, 3)], path_of(room)


def test_guard_8_on_a_half_row_is_stopped_by_a_block_in_either_row():
    # Half a cell up the original's y is half a cell back: rows 2 and 3.
    room = build([thing(8, 4, 3, half_y=True), thing(0, 2, 2)])
    assert path_of(room) == [(4, 2.5), (3, 2.5), (7, 2.5)], path_of(room)


def test_guard_13_turns_minus_x_plus_y_plus_x_minus_y_each_time_it_is_blocked():
    # 0xB9D8: the rectangle guard's four headings, taken in turn when blocked;
    # the original's +y is our -z. From (4,3): -x to (2,3), -z to (2,1), +x to
    # (5,1), +z to (5,4), -x to (2,4), -z back to (2,1): the loop it keeps to.
    blocks = [thing(0, 1, 3), thing(0, 2, 0), thing(0, 6, 1), thing(0, 5, 5), thing(0, 1, 4)]
    room = build([thing(13, 4, 3)] + blocks)
    assert path_of(room) == [(2, 1), (5, 1), (5, 4), (2, 4)], path_of(room)


def test_guard_13_in_an_empty_room_walks_round_its_edge():
    room = build([thing(13, 3, 3)])
    assert path_of(room) == [(0, 0), (7, 0), (7, 7), (0, 7)], path_of(room)


def test_a_guard_starts_clear_of_a_doorway_but_walks_its_whole_route_past_it():
    # The east door is at (7,4): the guard starts two cells in, then walks to the wall and back.
    room = build([thing(8, 3, 4)], exits={'east': 0x45})
    assert path_of(room) == [(3, 4), (0, 4), (7, 4)], path_of(room)


def test_a_moving_block_sways_half_a_cell_either_side_of_where_it_stands():
    # 0xB6B9: its target runs 0..15 px and back on the frame counter.
    room = build([thing(14, 3, 3)])
    assert room.fields['movingPlatforms'] == [{'from': {'x': 2.5, 'z': 3}, 'to': {'x': 3.5, 'z': 3}, 'height': 1}], room.fields['movingPlatforms']


def test_a_moving_block_sways_only_into_open_cells():
    room = build([thing(15, 3, 3), thing(0, 3, 4)])
    assert room.fields['movingPlatforms'] == [{'from': {'x': 3, 'z': 2.5}, 'to': {'x': 3, 'z': 3}, 'height': 1}], room.fields['movingPlatforms']


def test_a_guard_loop_begins_at_a_corner_clear_of_the_doorways():
    # map-0--1's loop came out beginning at (0,3), beside the west door at (0,4).
    room = build([], exits={'west': 0x43})
    assert room.clear_start([(0, 3), (2, 3), (2, 5), (0, 5)]) == [(2, 3), (2, 5), (0, 5), (0, 3)]


def test_balls_bounce_where_they_stand_offset_by_their_template():
    room = build([thing(12, 3, 3, half_x=True, half_y=True), thing(24, 5, 5, 1)])
    assert room.fields['balls'] == [{'x': 3.5, 'z': 2.5, 'height': 0}, {'x': 5, 'z': 5, 'height': 1}]


def test_a_type_19_spiked_ball_hangs_four_blocks_above_its_level():
    room = build([thing(19, 3, 3, 2, lift=48), thing(18, 4, 3, 2)])
    assert room.fields['spikedBalls'] == [{'x': 3, 'z': 3, 'height': 6}, {'x': 4, 'z': 3, 'height': 2}]


def test_in_an_odd_room_the_spiked_balls_wait_and_the_hopper_springs_at_random():
    room = build([thing(19, 3, 3, 2, lift=48), thing(19, 4, 3, 2, lift=48), thing(23, 5, 5)], room_id=0x45)
    assert all(b['waits'] for b in room.fields['spikedBalls'])
    assert room.fields['hoppers'] == [{'x': 5, 'z': 5, 'height': 0, 'randomHops': True}]


def test_walkers_pass_under_hanging_spiked_balls_they_cross_before_the_balls_come_down():
    room = build([thing(19, 3, 3, 2, lift=48), thing(18, 4, 3, 0)])
    walk = Walkable(room)
    assert walk.standings((3, 3)) == [0]
    assert walk.standings((4, 3)) == []


def test_a_type_21_block_is_a_falling_block_not_a_collapsing_one():
    room = build([thing(21, 3, 3, 1), thing(22, 4, 3, 1)])
    assert room.fields['fallingBlocks'] == [{'x': 3, 'z': 3, 'height': 2}]
    assert room.fields['vanishing'] == [{'x': 4, 'z': 3, 'height': 2}]


def test_a_collapsing_block_is_walked_under_never_stood_on():
    # 0xB6A2 -> 0xBF2B -> 0xBF37: gone two frames after it is stood on.
    walk = Walkable(build([thing(22, 3, 3, 0), thing(22, 4, 3, 2)]))
    assert walk.standings((3, 3)) == []
    assert walk.standings((4, 3)) == [0]


def test_hedges_and_gargoyles_are_blocks_drawn_as_themselves():
    room = build([thing(0, 3, 3, 0), thing(4, 3, 3, 1), thing(3, 5, 5, 0)])
    assert room.fields['platforms'] == [{'x': 3, 'z': 3, 'height': 2}, {'x': 5, 'z': 5, 'height': 1}]
    assert room.fields['decor'] == [{'x': 3, 'z': 3, 'height': 1, 'kind': 'gargoyle'}, {'x': 5, 'z': 5, 'height': 0, 'kind': 'hedge'}]


def test_flames_move_along_our_z_for_type_10_and_along_x_for_type_20():
    room = build([thing(10, 2, 3), thing(20, 5, 3)])
    assert [f['axis'] for f in room.fields['flames']] == ['z', 'x'], room.fields['flames']


def test_the_charm_spots_are_the_originals_32_at_0x6ff2():
    memory = load_memory('reference/KnightLore.z80')
    assert len(charm_table(memory)) == 32
    spots = charm_spots(memory, {0xB4: build([], 0xB4), 0x5E: build([], 0x5E)})
    # Spot 26: x 0x78, y 0x88, z 0xB0 in room 0xB4 (map--4-3), on top of its
    # four-high column: cell (3, 4) of the original, our z 7 - 4 = 3, level 4.
    assert spots[0xB4] == [{'spot': 26, 'x': 3, 'z': 3, 'height': 4}], spots[0xB4]
    # x and y 0x80 lie half way between cells 3 and 4.
    assert spots[0x5E] == [{'spot': 25, 'x': 3.5, 'z': 3.5, 'height': 0}], spots[0x5E]


def test_cells_between_steps_short_to_an_end_half_way_between_cells():
    # map--4--3's moving block sways from z 4.5 to 5: rows 4 and 5, not on to 5.5 and past.
    assert cells_between({'x': 2, 'z': 4.5}, {'x': 2, 'z': 5}) == [(2, 4), (2, 5)]


if __name__ == '__main__':
    tests = [f for name, f in sorted(globals().items()) if name.startswith('test_')]
    for test in tests:
        test()
    print(f'{len(tests)} ok')
