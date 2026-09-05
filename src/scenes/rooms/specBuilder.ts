import { buildRoomShell, addExitArch, addPlatform, addPushBlock, addPatrolEnemy, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { MovingPlatform } from '../../game/MovingPlatform'
import { PathGuard } from '../../game/PathGuard'
import { addPickup } from './items'
import { entryFor, type RoomSpec } from './roomSpecs'
import type { RoomBuilder } from '../../game/RoomManager'

export function buildRoomFromSpec(spec: RoomSpec): RoomBuilder {
  return async (loader) => {
    const room = await buildRoomShell(spec.id, loader, spec.tint, spec.exits.map((e) => e.direction), spec.style)
    for (const p of spec.platforms ?? []) addPlatform(room, p.x, p.z, p.height)
    for (const b of spec.pushBlocks ?? []) addPushBlock(room, b.x, b.z)
    placeSpikes(room, spec.spikes ?? [])
    for (const g of spec.guards ?? []) {
      addPatrolEnemy(room, { x: tileCenter(g.from.x), z: tileCenter(g.from.z) }, { x: tileCenter(g.to.x), z: tileCenter(g.to.z) }, g.speed)
    }
    for (const g of spec.ghosts ?? []) room.add(new GhostEnemy(tileCenter(g.x), tileCenter(g.z)))
    for (const p of spec.pickups ?? []) addPickup(room, p.item, p.x, p.z)
    for (const m of spec.movingPlatforms ?? []) {
      room.add(new MovingPlatform(cellCentre(m.from), cellCentre(m.to), m.height))
    }
    for (const g of spec.pathGuards ?? []) room.add(new PathGuard(g.path.map(cellCentre)))
    for (const e of spec.exits) {
      const entry = entryFor(e.direction)
      room.addExit({ direction: e.direction, targetRoomId: e.target, entryX: entry.x, entryZ: entry.z })
      addExitArch(room, e.direction)
    }
    room.setSpawn(tileCenter(spec.spawn.x), tileCenter(spec.spawn.z))
    return room
  }
}

function cellCentre(cell: { x: number; z: number }): { x: number; z: number } {
  return { x: tileCenter(cell.x), z: tileCenter(cell.z) }
}
