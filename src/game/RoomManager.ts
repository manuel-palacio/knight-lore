import * as THREE from 'three'
import { Room, type Exit } from './Room'
import type { AssetLoader } from '../engine/AssetLoader'
import type { GameState } from './GameState'

export type RoomBuilder = (loader: AssetLoader, state: GameState) => Promise<Room>

const EDGE_MARGIN = 0.5

export class RoomManager {
  active: Room | null = null
  private readonly rooms = new Map<string, Room>()

  constructor(
    private readonly scene: THREE.Scene,
    private readonly builders: Map<string, RoomBuilder>,
    private readonly loader: AssetLoader,
    private readonly state: GameState,
  ) {}

  async transitionTo(roomId: string, entryX: number, entryZ: number): Promise<Room> {
    const builder = this.builders.get(roomId)
    if (!builder) throw new Error(`Unknown room: ${roomId}`)
    let room = this.rooms.get(roomId)
    if (!room) {
      room = await builder(this.loader, this.state)
      this.rooms.set(roomId, room)
    }
    if (this.active) this.scene.remove(this.active.group)
    this.scene.add(room.group)
    room.setSpawn(entryX, entryZ)
    this.state.currentRoomId = roomId
    this.active = room
    return room
  }

  exitAt(x: number, z: number): Exit | null {
    if (!this.active) return null
    const maxX = this.active.grid.width * this.active.tileSize - EDGE_MARGIN
    const maxZ = this.active.grid.depth * this.active.tileSize - EDGE_MARGIN
    for (const exit of this.active.exits) {
      if (exit.direction === 'north' && z < EDGE_MARGIN) return exit
      if (exit.direction === 'south' && z > maxZ) return exit
      if (exit.direction === 'west' && x < EDGE_MARGIN) return exit
      if (exit.direction === 'east' && x > maxX) return exit
    }
    return null
  }
}
