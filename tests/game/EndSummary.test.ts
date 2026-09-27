import { describe, it, expect } from 'vitest'
import { endSummary, summaryLines, RATINGS } from '../../src/game/EndSummary'

// The original's end screen: 0xBA22, the quest done at 0xBC10, the ratings at 0xBBB7.
describe('endSummary', () => {
  it('counts two for each charm and one for each room visited, 156 in all making 100%', () => {
    expect(endSummary({ days: 30, charms: 14, roomsVisited: 128, won: true }).percent).toBe(100)
    expect(endSummary({ days: 3, charms: 0, roomsVisited: 1, won: false }).percent).toBe(0)
    expect(endSummary({ days: 20, charms: 7, roomsVisited: 50, won: false }).percent).toBe(Math.floor((64 * 0xa41a + 0x28) / 65536))
    expect(endSummary({ days: 20, charms: 7, roomsVisited: 50, won: false }).percent).toBe(41)
  })

  it('rates the rooms visited in fours of 32, and four places up for a win', () => {
    const rate = (rooms: number, won: boolean) => endSummary({ days: 1, charms: 0, roomsVisited: rooms, won }).rating
    expect([1, 32, 33, 64, 65, 96, 97, 128].map((r) => rate(r, false))).toEqual(['POOR', 'POOR', 'AVERAGE', 'AVERAGE', 'FAIR', 'FAIR', 'GOOD', 'GOOD'])
    expect([1, 33, 65, 128].map((r) => rate(r, true))).toEqual(['EXCELLENT', 'MARVELLOUS', 'HERO', 'ADVENTURER'])
    expect(RATINGS).toHaveLength(8)
  })

  it('reads as the original prints it', () => {
    expect(summaryLines(endSummary({ days: 38, charms: 14, roomsVisited: 70, won: true }))).toEqual([
      'GAME OVER', 'TIME 38 DAYS', 'PERCENTAGE OF QUEST COMPLETED 62%', 'CHARMS COLLECTED 14', 'OVERALL RATING HERO',
    ])
  })
})
