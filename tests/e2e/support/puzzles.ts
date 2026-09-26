// The puzzle rooms (some door cannot be reached on foot: tools/rip/castle.py
// marks them), each with its solution played by tests/e2e/puzzles.spec.ts:
// no other room may have a door out of reach.
export const SOLVED_PUZZLES = ['map--5-4', 'map-5-6', 'map-7-1', 'map--1--3', 'map--5--8', 'map--4--5'] as const
