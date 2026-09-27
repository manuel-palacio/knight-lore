import { test, expect } from '@playwright/test'
import { pushEffect } from '../../src/engine/effects'
import { enterRoom, face, holdDaylight, standAt, startGame } from './support/game'
import { recordTones, recorded } from './support/audio'

// Pushing a table glides with the original's sound: a note on every frame it
// moves, its pitch from where the table then is (0xB467, from 0xC232).
test('pushing the table in map--4-3 plays the gliding push effect', async ({ page }) => {
  await recordTones(page)
  await startGame(page)
  await enterRoom(page, 'map--4-3')
  await holdDaylight(page)
  // The table stands in cell (6, 2), at x 13, z 5: he walks east into it.
  await standAt(page, { x: 11, y: 0, z: 5 })
  await face(page, 'east')
  const before = (await recorded(page)).played.length
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(1500)
  await page.keyboard.up('ArrowUp')
  const tones = (await recorded(page)).played.slice(before)
  const room = { width: 8, depth: 8 }
  // Wherever along the row it has slid to, on the lattice of his steps.
  const glide = Array.from({ length: 40 }, (_, k) => Math.round(pushEffect({ x: 13 + k / 8, y: 0, z: 5 }, room)[0]!.frequency * 10) / 10)
  const heard = tones.filter((f) => glide.includes(f))
  expect(new Set(heard).size).toBeGreaterThan(2)
})
