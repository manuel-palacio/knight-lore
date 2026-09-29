import { Room, type Exit } from './Room'
import type { GameState } from './GameState'

export type RoomBuilder = (state: GameState) => Promise<Room>

// He goes through once he is under the arch, this far past the room's edge.
const UNDER_THE_ARCH = 0.75

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
    this.state.visitedRooms.add(roomId)
    this.active = room
    return room
  }

  exitAt(x: number, z: number): Exit | null {
    if (!this.active) return null
    const width = this.active.grid.width * this.active.tileSize
    const depth = this.active.grid.depth * this.active.tileSize
    const midX = width / 2
    const midZ = depth / 2
    // A doorway is the two cells beyond the middle of its edge (Grid.openDoorway):
    // anywhere in them leads out, however far to the side he came in.
    const doorHalfSpan = this.active.tileSize
    const inDoorX = Math.abs(x - midX) < doorHalfSpan
    const inDoorZ = Math.abs(z - midZ) < doorHalfSpan
    for (const exit of this.active.exits) {
      if (exit.direction === 'north' && z < -UNDER_THE_ARCH && inDoorX) return exit
      if (exit.direction === 'south' && z > depth + UNDER_THE_ARCH && inDoorX) return exit
      if (exit.direction === 'west' && x < -UNDER_THE_ARCH && inDoorZ) return exit
      if (exit.direction === 'east' && x > width + UNDER_THE_ARCH && inDoorZ) return exit
    }
    return null
  }
}
