import { test, expect, type Page } from '@playwright/test'
import { JUMP_EFFECT, PICK_UP_EFFECT, deliveryEffect, seizureEffect } from '../../src/engine/effects'
import { debug, enterRoom, give, holdDaylight, standAt, startGame } from './support/game'
import { recordTones, recorded } from './support/audio'

// The original's effects as the game plays them (effects.ts). The recorder
// hears each run of cycles as the pitch it starts at, the first one the
// speaker could sound (Beeper.playEffect leaves those above hearing silent).
const HIGHEST_HEARD = 16_000
const opening = (notes: { frequency: number }[]) => Math.round(notes.find((n) => n.frequency > 0 && n.frequency <= HIGHEST_HEARD)!.frequency * 10) / 10

async function heardSince(page: Page, before: number): Promise<number[]> {
  return (await recorded(page)).played.slice(before)
}

async function begin(page: Page): Promise<void> {
  await recordTones(page)
  await startGame(page)
  await enterRoom(page, 'map--4--4', { x: 8, z: 8 })
  await holdDaylight(page)
}

test('a jump sounds the original jump (0xB441)', async ({ page }) => {
  await begin(page)
  const before = (await recorded(page)).played.length
  await page.keyboard.press('Space')
  await expect.poll(() => heardSince(page, before)).toContain(opening(JUMP_EFFECT))
})

test('putting a charm down and picking it up each sound the original pick-up (0xB4A3)', async ({ page }) => {
  await begin(page)
  await give(page, ['gem'])
  let before = (await recorded(page)).played.length
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  await expect.poll(() => heardSince(page, before)).toContain(opening(PICK_UP_EFFECT))
  before = (await recorded(page)).played.length
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual(['gem'])
  await expect.poll(() => heardSince(page, before)).toContain(opening(PICK_UP_EFFECT))
})

test('changing form sounds the original seizure (0xB472)', async ({ page }) => {
  await begin(page)
  const before = (await recorded(page)).played.length
  await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
  const poses = [0, 1, 2, 3].map((pose) => opening(seizureEffect([pose])))
  await expect.poll(async () => (await heardSince(page, before)).some((f) => poses.includes(f))).toBe(true)
})

test('a charm going into the cauldron sounds the original delivery (0xC2A5)', async ({ page }) => {
  await recordTones(page)
  await startGame(page)
  const { wanted } = await debug(page)
  await give(page, [wanted!])
  const cauldronRoom = await enterRoom(page, 'room-001')
  await holdDaylight(page)
  await standAt(page, { ...cauldronRoom.cauldron!, z: cauldronRoom.cauldron!.z + 1.2 })
  const before = (await recorded(page)).played.length
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).delivered).toBe(1)
  await expect.poll(() => heardSince(page, before)).toContain(opening(deliveryEffect(wanted!)))
})

test('muted (M), none of them sounds', async ({ page }) => {
  await begin(page)
  await page.keyboard.press('KeyM')
  await give(page, ['gem'])
  const before = (await recorded(page)).played.length
  await page.keyboard.press('KeyE')
  await expect.poll(async () => (await debug(page)).carrying).toEqual([])
  await page.keyboard.press('Space')
  await page.evaluate(() => (window as unknown as { __t: () => void }).__t())
  await page.waitForTimeout(500)
  expect(await heardSince(page, before)).toEqual([])
})
