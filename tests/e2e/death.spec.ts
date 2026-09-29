import { test, expect } from '@playwright/test'
import { ROOM_SPECS, entryFor, oppositeOf } from '../../src/scenes/rooms/roomSpecs'
import { dissolveEffect, rematerialiseEffect } from '../../src/engine/effects'
import { debug, enterRoom, holdDaylight, standAt, startGame, tileCentre } from './support/game'
import { recordTones, recorded } from './support/audio'

// Losing a life, as the original shows it: Sabreman dissolves into a cloud of
// stars where he stands (0xBF2B), then comes back out of one at the door he
// came in by (0xBEFE), each step with its sound (0xB403, 0xB419).
const spec = ROOM_SPECS.find((s) => s.spikes?.some((p) => !p.height) && !s.ghosts?.length && !s.hoppers?.length && !s.pathGuards?.length)!
const spike = spec.spikes!.find((p) => !p.height)!
const heard = (notes: { frequency: number }[]) => Math.round(notes[0]!.frequency * 10) / 10

test(`stepping onto spikes in ${spec.id}: he dissolves into stars there and comes back out of them at the door`, async ({ page }) => {
  await recordTones(page)
  await startGame(page)
  const door = entryFor(oppositeOf(spec.exits[0]!.direction), spec.width ?? 8, spec.depth ?? 8)
  await enterRoom(page, spec.id, door)
  await holdDaylight(page)
  const where = { x: tileCentre(spike.x), y: 0, z: tileCentre(spike.z) }
  await standAt(page, where)

  await expect.poll(async () => (await debug(page)).dying).toBe(true)
  const dissolving = await debug(page)
  expect(dissolving.lives).toBe(4)
  expect([dissolving.pos.x, dissolving.pos.z]).toEqual([where.x, where.z])

  await expect.poll(async () => (await debug(page)).dying, { timeout: 10_000 }).toBe(false)
  const back = await debug(page)
  expect([back.pos.x, back.pos.z]).toEqual([door.x, door.z])
  expect(back.lives).toBe(4)

  const tones = (await recorded(page)).played
  expect(tones).toContain(heard(dissolveEffect(0x71)))
  expect(tones).toContain(heard(rematerialiseEffect(0x79)))
})
