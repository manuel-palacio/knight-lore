import { Pickup } from '../game/Pickup'
import { charmOverCauldron, Cauldron } from '../game/Cauldron'
import { MovingPlatform } from '../game/MovingPlatform'
import { PathGuard } from '../game/PathGuard'
import { Flame } from '../game/Flame'
import { BouncingBall } from '../game/BouncingBall'
import { GhostEnemy } from '../game/GhostEnemy'
import { HoppingBall } from '../game/HoppingBall'
import { SpikedBall } from '../game/SpikedBall'
import { PushableBox } from '../game/PushableBox'
import { FallingBlock } from '../game/FallingBlock'
import { Portcullis } from '../game/Portcullis'
import { SinkingCharm } from '../game/SinkingCharm'
import type { Entity } from '../game/Entity'
import type { GameState } from '../game/GameState'
import type { Player } from '../game/Player'
import type { Room } from '../game/Room'
import type { CharacterFrame } from '../game/CharacterFrame'

// What the hooks look at and drive.
export interface DebuggedGame {
  state: GameState
  player: Player
  activeRoom(): Room
  // Enters a room as through a door; without a position, by its north door.
  enterRoom(id: string, entryX?: number, entryZ?: number): void
  // The frame he is drawn in, and the form drawn (which lags through the transformation).
  look(): { frame: CharacterFrame; form: string }
  dying(): boolean
  itemImages: number
  // The transformation, as night falls or day breaks.
  transform(): void
}

// Dev hooks for verification, absent from production builds.
export function installDebugHooks(game: DebuggedGame): void {
  const { state, player } = game
  const hooks = window as unknown as Record<string, unknown>
  hooks.__t = () => { game.transform(); state.transformTimer = 9999 }
  hooks.__win = () => { state.won = true }
  hooks.__lose = () => { state.gameOver = true; state.gameOverReason = 'lives' }
  hooks.__timer = (seconds: number) => { state.transformTimer = seconds }
  hooks.__room = (id: string, entryX?: number, entryZ?: number) => game.enterRoom(id, entryX, entryZ)
  // Puts charms in his hands, as if carried in from other rooms.
  hooks.__give = (ids: string[]) => {
    for (const id of ids) player.tryPickup(new Pickup(id), () => {})
  }
  hooks.__pos = (x: number, y: number, z: number) => {
    player.position.set(x, y, z)
  }
  hooks.__dbg = () => snapshot(game)
}

function snapshot(game: DebuggedGame): Record<string, unknown> {
  const { state, player } = game
  const entities = game.activeRoom().entities
  const look = game.look()
  return {
    steps: player.stepsTaken,
    frame: look.frame,
    form: look.form,
    room: state.currentRoomId,
    wanted: state.wantedItem,
    overCauldron: charmOverCauldron(state.wantedItem, state.form),
    itemImages: game.itemImages,
    day: state.dayCount,
    state: player.state,
    dying: game.dying(),
    deal: state.charmDeal,
    facing: player.facing,
    pos: { x: Number(player.position.x.toFixed(2)), y: Number(player.position.y.toFixed(2)), z: Number(player.position.z.toFixed(2)) },
    platforms: entities.filter((e) => e instanceof MovingPlatform).map((e) => ({ x: e.position.x, z: e.position.z })),
    carrying: player.carrying,
    monsters: entities
      .filter((e) => e instanceof PathGuard || e instanceof Flame || e instanceof BouncingBall || e instanceof GhostEnemy || e instanceof HoppingBall)
      .map((e) => ({ kind: monsterKind(e), x: e.position.x, y: e.position.y, z: e.position.z })),
    spikedBalls: entities
      .filter((e) => e instanceof SpikedBall)
      .map((e) => ({ x: e.position.x, y: e.position.y, z: e.position.z })),
    boxes: entities
      .filter((e): e is PushableBox => e instanceof PushableBox)
      .map((e) => ({ kind: e.kind, x: e.position.x, bottom: e.bottom, z: e.position.z })),
    fallingBlocks: entities
      .filter((e): e is FallingBlock => e instanceof FallingBlock)
      .map((e) => ({ x: e.position.x, top: e.top, z: e.position.z })),
    gates: entities
      .filter((e): e is Portcullis => e instanceof Portcullis)
      .map((e) => ({ cells: e.cells, state: e.state, blocking: e.blocking, openFramesLeft: e.openFramesLeft })),
    delivered: state.cureProgress,
    delivering: entities.some((e) => e instanceof SinkingCharm),
    lives: state.lives,
    won: state.won,
    timer: state.transformTimer,
    // The form the game is in; `form` is the one drawn, which lags through the transformation.
    night: state.form === 'werewolf',
    pickups: entities
      .filter((e): e is Pickup => e instanceof Pickup && !e.collected)
      .map((e) => ({ id: e.id, x: e.position.x, y: e.position.y, z: e.position.z })),
    cauldron: entities
      .filter((e) => e instanceof Cauldron)
      .map((e) => ({ x: e.position.x, y: e.position.y, z: e.position.z }))[0] ?? null,
  }
}

// How a walker gets past it: behind a patrol, under a bounce, or away from a wanderer.
function monsterKind(e: Entity): 'patrols' | 'bounces' | 'roams' {
  if (e instanceof BouncingBall) return 'bounces'
  return e instanceof GhostEnemy || e instanceof HoppingBall ? 'roams' : 'patrols'
}
