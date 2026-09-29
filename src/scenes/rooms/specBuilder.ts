import { buildRoomShell, addPlatform, tileCenter } from './shell'
import { placeSpikes } from '../../game/SpikeGrid'
import { GhostEnemy } from '../../game/GhostEnemy'
import { MovingPlatform } from '../../game/MovingPlatform'
import { PathGuard } from '../../game/PathGuard'
import { PushableBox } from '../../game/PushableBox'
import { VanishingBlock } from '../../game/VanishingBlock'
import { BouncingBall, BOUNCE_ABOVE_FIRST_PX } from '../../game/BouncingBall'
import { HoppingBall } from '../../game/HoppingBall'
import { FallingBlock } from '../../game/FallingBlock'
import { PIXELS_PER_BLOCK } from '../../game/Gravity'
import { Cauldron } from '../../game/Cauldron'
import { CauldronSpirit } from '../../game/CauldronSpirit'
import { Wizard } from '../../game/Wizard'
import { Gargoyle } from '../../game/Gargoyle'
import { Flame } from '../../game/Flame'
import { Portcullis } from '../../game/Portcullis'
import { DropTurn, SpikedBall } from '../../game/SpikedBall'
import { FloatingBlock } from '../../game/FloatingBlock'
import { addPickup } from './items'
import { itemAtSpot } from '../../game/GameState'
import { CHARM_HOVER } from '../../game/Pickup'
import { entryFor, type RoomSpec } from './roomSpecs'
import { FULL_ROOM_CELLS } from '../../engine/OriginalPixels'
import type { RoomBuilder } from '../../game/RoomManager'

export interface RoomSize {
  width: number
  depth: number
}

// sizeOf gives another room's size, so a door drops Sabreman on the door
// axis of the room it leads to.
export function buildRoomFromSpec(spec: RoomSpec, sizeOf: (id: string) => RoomSize = fullSize): RoomBuilder {
  return async (state) => {
    const room = buildRoomShell(spec.id, spec.tint, spec.width ?? FULL_ROOM_CELLS, spec.depth ?? FULL_ROOM_CELLS)
    for (const p of spec.platforms ?? []) addPlatform(room, p.x, p.z, p.height)
    room.backdrop = spec.backdrop ?? []
    for (const d of spec.decor ?? []) {
      room.addDecor(d.x, d.z, d.height, d.kind)
      if (d.kind === 'gargoyle') room.add(new Gargoyle(d.x, d.z, d.height, room.tileSize))
    }
    placeSpikes(room, spec.spikes ?? [])
    for (const g of spec.ghosts ?? []) room.add(new GhostEnemy(tileCenter(g.x), tileCenter(g.z)))
    for (const p of spec.pickups ?? []) addPickup(room, p.item, p.x, p.z, p.y)
    for (const s of spec.charmSpots ?? []) {
      if (!state.usedSpots.includes(s.spot)) addPickup(room, itemAtSpot(s.spot, state.charmDeal), s.x, s.z, s.height + CHARM_HOVER, s.spot)
    }
    for (const m of spec.movingPlatforms ?? []) {
      room.add(new MovingPlatform(cellCentre(m.from), cellCentre(m.to), m.height))
    }
    for (const g of spec.pathGuards ?? []) room.add(new PathGuard(g.path.map(cellCentre)))
    for (const p of spec.portcullises ?? []) room.add(new Portcullis(p.from, p.to, room.tileSize))
    const dropTurn = new DropTurn()
    for (const b of spec.spikedBalls ?? []) room.add(new SpikedBall(b, b.height, room.tileSize, { waits: b.waits, turn: dropTurn }))
    for (const b of spec.floatingBlocks ?? []) room.add(new FloatingBlock(b.x, b.z, b.bottom, room.tileSize))
    for (const b of spec.boxes ?? []) room.add(new PushableBox(b.kind, cellCentre(b), b.height))
    for (const v of spec.vanishing ?? []) room.add(new VanishingBlock(v.x, v.z, v.height, room.tileSize))
    for (const f of spec.fallingBlocks ?? []) room.add(new FallingBlock(f.x, f.z, f.height, room.tileSize))
    const bounceTop = ballTop(spec)
    for (const b of spec.balls ?? []) room.add(new BouncingBall(cellCentre(b), b.height, bounceTop))
    for (const h of spec.hoppers ?? []) room.add(new HoppingBall(cellCentre(h), h.height, { randomHops: h.randomHops }))
    if (spec.cauldron) {
      room.add(new Cauldron(spec.cauldron.x, spec.cauldron.z))
      room.add(new CauldronSpirit(spec.cauldron.x, spec.cauldron.z))
    }
    if (spec.wizard) room.add(new Wizard(spec.wizard.x, spec.wizard.z))
    for (const f of spec.flames ?? []) room.add(new Flame(tileCenter(f.x), f.height, tileCenter(f.z), f.axis))
    for (const e of spec.exits) {
      const target = sizeOf(e.target)
      const entry = entryFor(e.direction, target.width, target.depth)
      room.addExit({ direction: e.direction, targetRoomId: e.target, entryX: entry.x, entryZ: entry.z })
    }
    room.setSpawn(tileCenter(spec.spawn.x), tileCenter(spec.spawn.z))
    return room
  }
}

// Every ball in a room bounces up to 32 pixels over where the first one started (0xB86E).
export function ballTop(spec: RoomSpec): number {
  const first = spec.balls?.[0]
  return first ? first.height + BOUNCE_ABOVE_FIRST_PX / PIXELS_PER_BLOCK : 0
}

function cellCentre(cell: { x: number; z: number }): { x: number; z: number } {
  return { x: tileCenter(cell.x), z: tileCenter(cell.z) }
}

function fullSize(): RoomSize {
  return { width: FULL_ROOM_CELLS, depth: FULL_ROOM_CELLS }
}
