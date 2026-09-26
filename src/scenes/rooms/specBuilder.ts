import { buildRoomShell, addPlatform, addPushBlock, addPatrolEnemy, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { MovingPlatform } from '../../game/MovingPlatform'
import { PathGuard } from '../../game/PathGuard'
import { Table } from '../../game/Table'
import { VanishingBlock } from '../../game/VanishingBlock'
import { BouncingBall } from '../../game/BouncingBall'
import { Cauldron } from '../../game/Cauldron'
import { CauldronSpirit } from '../../game/CauldronSpirit'
import { Wizard } from '../../game/Wizard'
import { Flame } from '../../game/Flame'
import { Portcullis } from '../../game/Portcullis'
import { SpikedBall } from '../../game/SpikedBall'
import { FloatingBlock } from '../../game/FloatingBlock'
import { addPickup } from './items'
import { FULL_SIZE, entryFor, type RoomSpec } from './roomSpecs'
import type { RoomBuilder } from '../../game/RoomManager'

export interface RoomSize {
  width: number
  depth: number
}

// sizeOf gives another room's size, so a door drops Sabreman on the door
// axis of the room it leads to.
export function buildRoomFromSpec(spec: RoomSpec, sizeOf: (id: string) => RoomSize = fullSize): RoomBuilder {
  return async (state) => {
    const room = buildRoomShell(spec.id, spec.tint, spec.width ?? FULL_SIZE, spec.depth ?? FULL_SIZE)
    for (const p of spec.platforms ?? []) addPlatform(room, p.x, p.z, p.height)
    for (const b of spec.pushBlocks ?? []) addPushBlock(room, b.x, b.z)
    placeSpikes(room, spec.spikes ?? [])
    for (const g of spec.guards ?? []) {
      addPatrolEnemy(room, { x: tileCenter(g.from.x), z: tileCenter(g.from.z) }, { x: tileCenter(g.to.x), z: tileCenter(g.to.z) }, g.speed)
    }
    for (const g of spec.ghosts ?? []) room.add(new GhostEnemy(tileCenter(g.x), tileCenter(g.z)))
    if (!state.emptiedRooms.includes(spec.id)) {
      for (const p of spec.pickups ?? []) addPickup(room, p.item, p.x, p.z, p.y)
    }
    for (const m of spec.movingPlatforms ?? []) {
      room.add(new MovingPlatform(cellCentre(m.from), cellCentre(m.to), m.height))
    }
    for (const g of spec.pathGuards ?? []) room.add(new PathGuard(g.path.map(cellCentre)))
    for (const p of spec.portcullises ?? []) room.add(new Portcullis(p.from, p.to, room.tileSize))
    for (const b of spec.spikedBalls ?? []) room.add(new SpikedBall(b, b.height, b.bobs ?? false, room.tileSize))
    for (const b of spec.floatingBlocks ?? []) room.add(new FloatingBlock(b.x, b.z, b.bottom, room.tileSize))
    for (const t of spec.tables ?? []) room.add(new Table(t.x, t.z, t.height, room.tileSize))
    for (const v of spec.vanishing ?? []) room.add(new VanishingBlock(v.x, v.z, v.height, room.tileSize))
    for (const b of spec.balls ?? []) room.add(new BouncingBall(cellCentre(b.from), cellCentre(b.to)))
    if (spec.cauldron) {
      const cauldron = new Cauldron()
      cauldron.position.set(tileCenter(spec.cauldron.x), spec.cauldron.height, tileCenter(spec.cauldron.z))
      room.add(cauldron)
      room.add(new CauldronSpirit(tileCenter(spec.cauldron.x), tileCenter(spec.cauldron.z)))
    }
    if (spec.wizard) room.add(new Wizard(tileCenter(spec.wizard.x), tileCenter(spec.wizard.z)))
    for (const f of spec.flames ?? []) room.add(new Flame(tileCenter(f.x), f.height, tileCenter(f.z)))
    for (const e of spec.exits) {
      const target = sizeOf(e.target)
      const entry = entryFor(e.direction, target.width, target.depth)
      room.addExit({ direction: e.direction, targetRoomId: e.target, entryX: entry.x, entryZ: entry.z })
    }
    room.setSpawn(tileCenter(spec.spawn.x), tileCenter(spec.spawn.z))
    return room
  }
}

function cellCentre(cell: { x: number; z: number }): { x: number; z: number } {
  return { x: tileCenter(cell.x), z: tileCenter(cell.z) }
}

function fullSize(): RoomSize {
  return { width: FULL_SIZE, depth: FULL_SIZE }
}
