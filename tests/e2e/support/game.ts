import { expect, type Page } from '@playwright/test'
import { isJump } from './roomPath'

// Drives the dev build through its window hooks (__dbg, __room, __pos,
// __timer) and the real keyboard. Only `vite` dev exposes the hooks.

export interface Debug {
  room: string
  form: string
  facing: string
  state: string
  pos: { x: number; y: number; z: number }
  wanted: string | null
  carrying: string | null
  delivered: number
  lives: number
  day: number
  won: boolean
  timer: number
  gates: { cells: Cell[]; state: string; blocking: boolean }[]
  pickups: { id: string; x: number; y: number; z: number }[]
  cauldron: { x: number; y: number; z: number } | null
}

export interface Cell {
  x: number
  z: number
}

type Hooks = {
  __dbg: () => Debug
  __room: (id: string, x?: number, z?: number) => void
  __pos: (x: number, y: number, z: number) => void
  __timer: (seconds: number) => void
}

const TILE = 2
const NO_NIGHTFALL = 99_999
const STEP_TOLERANCE = 0.4

export function tileCentre(cell: number): number {
  return cell * TILE + TILE / 2
}

export function debug(page: Page): Promise<Debug> {
  return page.evaluate(() => (window as unknown as Hooks).__dbg())
}

export async function startGame(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('#intro')).toBeVisible()
  await page.waitForFunction(() => '__dbg' in window)
  await page.keyboard.press('Enter')
  await expect(page.locator('#intro')).toBeHidden()
}

export async function holdDaylight(page: Page): Promise<void> {
  await page.evaluate((seconds) => (window as unknown as Hooks).__timer(seconds), NO_NIGHTFALL)
}

export async function enterRoom(page: Page, id: string, at?: { x: number; z: number }): Promise<Debug> {
  await page.evaluate(
    ({ room, x, z }) => (window as unknown as Hooks).__room(room, x, z),
    { room: id, x: at?.x, z: at?.z },
  )
  await expect.poll(async () => (await debug(page)).room).toBe(id)
  return debug(page)
}

export async function standAt(page: Page, at: { x: number; y: number; z: number }): Promise<void> {
  await page.evaluate(({ x, y, z }) => (window as unknown as Hooks).__pos(x, y, z), at)
}

// Turns are dropped while the transformation or a door's wipe plays, so
// keep turning until the facing is right rather than for a fixed count.
export async function face(page: Page, facing: string): Promise<void> {
  await expect
    .poll(async () => {
      const current = (await debug(page)).facing
      if (current !== facing) await page.keyboard.press('ArrowLeft')
      return current
    }, { timeout: 5_000, intervals: [150] })
    .toBe(facing)
}

export async function walkUntil(page: Page, arrived: (state: Debug) => boolean): Promise<void> {
  await page.keyboard.down('ArrowUp')
  try {
    await expect.poll(async () => arrived(await debug(page)), { timeout: 10_000, intervals: [20] }).toBe(true)
  } finally {
    await page.keyboard.up('ArrowUp')
  }
}

// Walks cell to cell along a path of orthogonal neighbours: first onto the
// centre of the cell it starts in, then one straight run per corner. Where
// the path skips a cell (a spike row, see roomPath.ts) it jumps it from the
// tile before.
export async function walkPath(page: Page, path: Cell[]): Promise<void> {
  const gates = (await debug(page)).gates
  const gateAt = (c: Cell) => gates.findIndex((g) => g.cells.some((gc) => gc.x === c.x && gc.z === c.z))
  let start = 0
  for (let i = 1; i <= path.length; i++) {
    const intoGate = i < path.length && gateAt(path[i]!) >= 0 && gateAt(path[i - 1]!) < 0
    if (i < path.length && !isJump(path[i - 1]!, path[i]!) && !intoGate) continue
    await walkRun(page, path.slice(start, i))
    if (intoGate) {
      await waitForGateOpen(page, gateAt(path[i]!))
      start = i - 1
      continue
    }
    if (i < path.length) await jumpTo(page, path[i - 1]!, path[i]!)
    start = i
  }
}

// A portcullis is crossed only once it has risen all the way: it stays up
// long enough to walk under, and a gate still rising may fall on the way.
async function waitForGateOpen(page: Page, gate: number): Promise<void> {
  await expect.poll(async () => (await debug(page)).gates[gate]!.state, { timeout: 30_000, intervals: [50] }).toBe('open')
}

async function walkRun(page: Page, run: Cell[]): Promise<void> {
  for (const corner of cornersOf(run)) {
    await walkAxisTo(page, 'x', tileCentre(corner.x))
    await walkAxisTo(page, 'z', tileCentre(corner.z))
  }
}

// A jump is committed: hold forward, press jump, and let go once landed.
async function jumpTo(page: Page, from: Cell, to: Cell): Promise<void> {
  const facing = to.x > from.x ? 'east' : to.x < from.x ? 'west' : to.z > from.z ? 'south' : 'north'
  await face(page, facing)
  await page.keyboard.down('ArrowUp')
  await page.keyboard.press('Space')
  try {
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).not.toBe('grounded')
    await expect.poll(async () => (await debug(page)).state, { intervals: [20] }).toBe('grounded')
  } finally {
    await page.keyboard.up('ArrowUp')
  }
}

async function walkAxisTo(page: Page, axis: 'x' | 'z', target: number): Promise<void> {
  const delta = target - (await debug(page)).pos[axis]
  if (Math.abs(delta) <= STEP_TOLERANCE) return
  const forward = delta > 0
  await face(page, axis === 'x' ? (forward ? 'east' : 'west') : (forward ? 'south' : 'north'))
  await walkUntil(page, (s) => (forward ? s.pos[axis] >= target - STEP_TOLERANCE : s.pos[axis] <= target + STEP_TOLERANCE))
}

function cornersOf(path: Cell[]): Cell[] {
  return path.filter((cell, i) => {
    if (i === 0 || i === path.length - 1) return true
    const before = path[i - 1]!
    const after = path[i + 1]!
    return (before.x === cell.x) !== (cell.x === after.x)
  })
}
