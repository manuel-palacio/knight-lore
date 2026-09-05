import type { SavedGame } from '../game/GameState'

// One save slot in localStorage. Every access is guarded: storage can be
// missing, full, or blocked, and the game must run the same without it.
const KEY = 'knight-lore.save'

export function loadSave(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  } catch {
    return null
  }
}

export function writeSave(saved: SavedGame): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // no storage: play on without saving
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
