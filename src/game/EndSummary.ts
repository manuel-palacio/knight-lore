// The original's end screen (0xBA22), the same after a win or a loss: the
// days taken, how much of the quest is done, the charms collected and a
// rating. The quest done counts two for each charm and one for each room
// visited (the bitmap at 0x5BE8), 156 in all for 14 charms and 128 rooms,
// scaled by 0xA41A / 65536 with 0x28 for rounding (0xBC10). The rating
// counts the rooms visited in fours of 32, and four places up for a win.
export const RATINGS = ['POOR', 'AVERAGE', 'FAIR', 'GOOD', 'EXCELLENT', 'MARVELLOUS', 'HERO', 'ADVENTURER'] as const
export type Rating = (typeof RATINGS)[number]

// What the original shows first after a win (0xBAAB), before the summary.
export const POTION_VERSE = ['THE POTION CASTS', 'ITS MAGIC STRONG', 'ALL EVIL MUST BEWARE', 'THE SPELL HAS BROKEN', 'YOU ARE FREE', 'GO FORTH TO MIREMARE']

const QUEST_SCALE = 0xa41a
const QUEST_ROUNDING = 0x28
const ROOMS_A_RATING = 32

export interface EndResult {
  days: number
  charms: number
  roomsVisited: number
  won: boolean
}

export interface EndSummary {
  days: number
  percent: number
  charms: number
  rating: Rating
}

export function endSummary(result: EndResult): EndSummary {
  const done = 2 * result.charms + result.roomsVisited
  const percent = Math.floor((done * QUEST_SCALE + QUEST_ROUNDING) / 65536)
  const band = Math.floor((result.roomsVisited - 1) / ROOMS_A_RATING) & 3
  return { days: result.days, percent, charms: result.charms, rating: RATINGS[(result.won ? 4 : 0) + band]! }
}

// The summary's lines, as the original prints them (the strings at 0xBB5E).
export function summaryLines(summary: EndSummary): string[] {
  return [
    'GAME OVER',
    `TIME ${summary.days} DAYS`,
    `PERCENTAGE OF QUEST COMPLETED ${summary.percent}%`,
    `CHARMS COLLECTED ${summary.charms}`,
    `OVERALL RATING ${summary.rating}`,
  ]
}
