import { Room, type Exit } from './Room'
import type { GameState } from './GameState'

export type RoomBuilder = (state: GameState) => Promise<Room>

const EDGE_MARGIN = 0.5
// Doorways sit mid-edge; only that span leads out, the rest of the edge is wall.
const DOOR_HALF_SPAN = 1.4

export class RoomManager {
  active: Room | null = null
  private readonly rooms = new Map<string, Room>()

  constructor(
    private readonly builders: Map<string, RoomBuilder>,
    private readonly state: GameState,
  ) {}

  async transitionTo(roomId: string, entryX: number, entryZ: number): Promise<Room> {
    const builder = this.builders.get(roomId)
    if (!builder) throw new Error(`Unknown room: ${roomId}`)
    let room = this.rooms.get(roomId)
    if (!room) {
      room = await builder(this.state)
      this.rooms.set(roomId, room)
    }
    room.setSpawn(entryX, entryZ)
    this.state.currentRoomId = roomId
    this.active = room
    return room
  }

  exitAt(x: number, z: number): Exit | null {
    if (!this.active) return null
    const width = this.active.grid.width * this.active.tileSize
    const depth = this.active.grid.depth * this.active.tileSize
    const midX = Math.floor(this.active.grid.width / 2) * this.active.tileSize + this.active.tileSize / 2
    const midZ = Math.floor(this.active.grid.depth / 2) * this.active.tileSize + this.active.tileSize / 2
    const inDoorX = Math.abs(x - midX) <= DOOR_HALF_SPAN
    const inDoorZ = Math.abs(z - midZ) <= DOOR_HALF_SPAN
    for (const exit of this.active.exits) {
      if (exit.direction === 'north' && z < EDGE_MARGIN && inDoorX) return exit
      if (exit.direction === 'south' && z > depth - EDGE_MARGIN && inDoorX) return exit
      if (exit.direction === 'west' && x < EDGE_MARGIN && inDoorZ) return exit
      if (exit.direction === 'east' && x > width - EDGE_MARGIN && inDoorZ) return exit
    }
    return null
  }
}
