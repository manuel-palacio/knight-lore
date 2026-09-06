import { buildRoomShell, addPlatform, addPushBlock, addPatrolEnemy, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { MovingPlatform } from '../../game/MovingPlatform'
import { PathGuard } from '../../game/PathGuard'
import { Table } from '../../game/Table'
import { VanishingBlock } from '../../game/VanishingBlock'
import { BouncingBall } from '../../game/BouncingBall'
import { Cauldron } from '../../game/Cauldron'
import { Wizard } from '../../game/Wizard'
import { addPickup } from './items'
import { entryFor, type RoomSpec } from './roomSpecs'
import type { RoomBuilder } from '../../game/RoomManager'

export function buildRoomFromSpec(spec: RoomSpec): RoomBuilder {
  return async () => {
    const room = buildRoomShell(spec.id, spec.tint)
    for (const p of spec.platforms ?? []) addPlatform(room, p.x, p.z, p.height)
    for (const b of spec.pushBlocks ?? []) addPushBlock(room, b.x, b.z)
    placeSpikes(room, spec.spikes ?? [])
    for (const g of spec.guards ?? []) {
      addPatrolEnemy(room, { x: tileCenter(g.from.x), z: tileCenter(g.from.z) }, { x: tileCenter(g.to.x), z: tileCenter(g.to.z) }, g.speed)
    }
    for (const g of spec.ghosts ?? []) room.add(new GhostEnemy(tileCenter(g.x), tileCenter(g.z)))
    for (const p of spec.pickups ?? []) addPickup(room, p.item, p.x, p.z, p.y)
    for (const m of spec.movingPlatforms ?? []) {
      room.add(new MovingPlatform(cellCentre(m.from), cellCentre(m.to), m.height))
    }
    for (const g of spec.pathGuards ?? []) room.add(new PathGuard(g.path.map(cellCentre)))
    for (const t of spec.tables ?? []) room.add(new Table(t.x, t.z, t.height, room.tileSize))
    for (const v of spec.vanishing ?? []) room.add(new VanishingBlock(v.x, v.z, v.height, room.tileSize))
    for (const b of spec.balls ?? []) room.add(new BouncingBall(cellCentre(b.from), cellCentre(b.to)))
    if (spec.cauldron) {
      const cauldron = new Cauldron()
      cauldron.position.set(tileCenter(spec.cauldron.x), spec.cauldron.height, tileCenter(spec.cauldron.z))
      room.add(cauldron)
    }
    if (spec.wizard) room.add(new Wizard(tileCenter(spec.wizard.x), tileCenter(spec.wizard.z)))
    for (const e of spec.exits) {
      const entry = entryFor(e.direction)
      room.addExit({ direction: e.direction, targetRoomId: e.target, entryX: entry.x, entryZ: entry.z })
    }
    room.setSpawn(tileCenter(spec.spawn.x), tileCenter(spec.spawn.z))
    return room
  }
}

function cellCentre(cell: { x: number; z: number }): { x: number; z: number } {
  return { x: tileCenter(cell.x), z: tileCenter(cell.z) }
}
