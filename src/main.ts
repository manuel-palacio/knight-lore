import { Renderer } from './engine/Renderer'
import { GameLoop } from './engine/GameLoop'
import { Input } from './engine/Input'
import { AssetLoader } from './engine/AssetLoader'
import { DebugOverlay } from './engine/DebugOverlay'
import { GameState } from './game/GameState'
import { HUD } from './game/HUD'
import { Category } from './engine/categories'
import { Player } from './game/Player'
import { Pickup } from './game/Pickup'
import { PushBlock } from './game/PushBlock'
import { Cauldron } from './game/Cauldron'
import { Room } from './game/Room'
import { RoomManager } from './game/RoomManager'
import { ROOM_BUILDERS, START_ROOM } from './scenes/rooms/index'
import { CharacterVisual } from './game/characters/CharacterVisual'
import { ParticleBurst } from './game/ParticleBurst'
import type { Entity } from './game/Entity'

const PICKUP_RANGE = 1.6
const PICKUP_HEIGHT = 1.8
const CARRY_OFFSET_Y = 1.2
// Push trigger upper bound matches collision-pinned distance (half-tile + half-player + slack)
const PUSH_RANGE_MAX = 1.5
const PUSH_RANGE_MIN = 0.4

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app missing')

  const renderer = new Renderer(container)
  const input = new Input()
  const loader = new AssetLoader()
  const state = new GameState()
  const hud = new HUD()

  try {
    const hdr = await loader.loadHDR('/assets/textures/castle_dungeon.exr')
    renderer.setEnvironment(hdr)
  } catch {
    console.warn('HDR not present; skipping environment reflection')
  }

  const manager = new RoomManager(renderer.scene, ROOM_BUILDERS, loader, state)

  const player = new Player()
  const visual = new CharacterVisual()
  player.object3D = visual.group
  renderer.scene.add(visual.group)

  const burst = new ParticleBurst()
  renderer.scene.add(burst.mesh)

  let carriedPickup: Pickup | null = null
  let transitioning = false

  function activeRoom(): Room {
    const room = manager.active
    if (!room) throw new Error('No active room')
    return room
  }

  function placePlayerAtSpawn(room: Room): void {
    player.position.set(room.spawnX, 0, room.spawnZ)
    player.renderPosition.copy(player.position)
    player.state = 'grounded'
    visual.resetMotion()
  }

  function enterRoom(room: Room): void {
    placePlayerAtSpawn(room)
  }

  // Room 002's spawn is cell (2,2) — tileCenter(2) = 5 on both axes.
  const startRoom = await manager.transitionTo(START_ROOM, 5, 5)
  enterRoom(startRoom)

  const debug = new DebugOverlay(renderer.scene)
  const intro = document.getElementById('intro')
  window.addEventListener('keydown', (e) => {
    if (intro && intro.style.display !== 'none') {
      intro.style.display = 'none'
    }
    if (e.code === 'KeyD') debug.toggle()
    if (e.code === 'KeyR' && (state.gameOver || state.won)) location.reload()
  })

  // Test/debug hook (e2e playtest reads positions via window.__game.snapshot()).
  ;(window as unknown as { __game: unknown }).__game = {
    snapshot: () => ({
      player: { x: player.position.x, y: player.position.y, z: player.position.z, carrying: player.carrying, state: player.state },
      room: manager.active?.id,
      pickups: manager.active?.entities
        .filter((e): e is Pickup => e instanceof Pickup)
        .map((p) => ({ id: p.id, x: p.position.x, z: p.position.z, collected: p.collected, active: p.active })) ?? [],
      state: { form: state.form, lives: state.lives, dayCount: state.dayCount, cureProgress: state.cureProgress, wantedItem: state.wantedItem, gameOver: state.gameOver, won: state.won },
      transitioning,
      carriedPickup: carriedPickup ? { id: carriedPickup.id } : null,
    }),
    allPickups: () => {
      // Force-build all rooms by querying the manager's cache; we can't access private rooms, so look at scene children that belong to each room group
      return manager.active?.entities
        .filter((e): e is Pickup => e instanceof Pickup)
        .map((p) => ({ id: p.id, x: p.position.x, z: p.position.z, collected: p.collected, active: p.active })) ?? []
    },
    teleport: (x: number, z: number, y = 0) => {
      player.position.set(x, y, z)
      player.renderPosition.copy(player.position)
    },
    setForm: (f: 'human' | 'werewolf') => {
      if (state.form !== f) state.toggleForm()
    },
    pauseTimer: () => { state.transformTimer = 9999 },
  }

  state.onTransformed = () => {
    burst.burst(player.position)
    visual.startTransform(state.form)
  }

  state.onTransformWhileCarrying = () => dropCarried()

  state.onLifeLost = () => {
    placePlayerAtSpawn(activeRoom())
  }

  // Halo toggle: child meshes flagged with userData.halo are hidden while
  // the item is carried (otherwise the floor-glow wraps around the player).
  function setHaloVisible(obj: THREE.Object3D | null, visible: boolean): void {
    if (!obj) return
    obj.traverse((c) => {
      if (c.userData.halo) c.visible = visible
    })
  }

  function dropCarried(): void {
    const pickup = carriedPickup
    if (!pickup) return
    carriedPickup = null
    player.carrying = null
    if (pickup.object3D && player.object3D) player.object3D.remove(pickup.object3D)
    pickup.collected = false
    pickup.active = true
    pickup.position.set(player.position.x, 0.4, player.position.z)
    pickup.renderPosition.copy(pickup.position)
    if (pickup.object3D) pickup.object3D.position.copy(pickup.position)
    setHaloVisible(pickup.object3D, true)
    activeRoom().add(pickup) // items migrate to wherever they were dropped
  }

  function tryPickupPass(room: Room): void {
    if (!input.wasPressed('KeyE')) return
    for (const e of room.entities) {
      if (!(e instanceof Pickup) || e.collected) continue
      const near =
        Math.hypot(e.position.x - player.position.x, e.position.z - player.position.z) < PICKUP_RANGE &&
        Math.abs(e.position.y - player.position.y) < PICKUP_HEIGHT
      if (!near) continue
      player.tryPickup({ id: e.id, position: e.position }, state, () => {
        e.collect()
        room.remove(e)
        if (e.object3D && player.object3D) {
          player.object3D.add(e.object3D)
          e.object3D.position.set(0, CARRY_OFFSET_Y, 0)
          setHaloVisible(e.object3D, false)
        }
        carriedPickup = e
      })
      return
    }
  }

  function tryDeliverPass(room: Room): boolean {
    if (!input.wasPressed('KeyE')) return false
    const cauldron = room.entities.find((e): e is Cauldron => e instanceof Cauldron)
    if (!cauldron || !cauldron.isInRange(player.position)) return false
    if (!state.deliverCureItem(player.carrying)) return false
    const delivered = carriedPickup
    carriedPickup = null
    player.carrying = null
    if (delivered?.object3D && player.object3D) player.object3D.remove(delivered.object3D)
    return true
  }

  function touchesHazard(h: Entity): boolean {
    return (
      Math.abs(player.position.x - h.position.x) < (player.extents.x + h.extents.x) / 2 &&
      Math.abs(player.position.z - h.position.z) < (player.extents.z + h.extents.z) / 2 &&
      player.position.y - h.position.y < h.extents.y
    )
  }

  function hazardPass(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.HAZARD)) continue
      if (touchesHazard(e)) {
        state.loseLife()
        return
      }
    }
  }

  function exitPass(): void {
    if (transitioning) return
    const exit = manager.exitAt(player.position.x, player.position.z)
    if (!exit) return
    transitioning = true
    manager
      .transitionTo(exit.targetRoomId, exit.entryX, exit.entryZ)
      .then((room) => {
        enterRoom(room)
        transitioning = false
      })
      .catch((err) => {
        console.error(err)
        transitioning = false
      })
  }

  function handlePushAttempt(room: Room): void {
    for (const e of room.entities) {
      if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
      const block = e as PushBlock
      const dx = block.position.x - player.position.x
      const dz = block.position.z - player.position.z
      const dist = Math.hypot(dx, dz)
      if (dist <= PUSH_RANGE_MAX && dist > PUSH_RANGE_MIN) {
        const dir =
          Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'east' : 'west') : dz > 0 ? 'south' : 'north'
        block.tryPush(dir, room.grid, room.tileSize)
      }
    }
  }

  // Push player out of any ACTOR_BODY (patrol enemies) they overlap with —
  // they're solid bodies, not phasable. Run after movement; the hazard pass
  // still fires for damage. Skip ghosts and similar non-actor hazards.
  function resolveActorOverlap(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.ACTOR_BODY)) continue
      const dx = player.position.x - e.position.x
      const dz = player.position.z - e.position.z
      const overlapX = (player.extents.x + e.extents.x) / 2 - Math.abs(dx)
      const overlapZ = (player.extents.z + e.extents.z) / 2 - Math.abs(dz)
      if (overlapX <= 0 || overlapZ <= 0) continue
      // Push the player on whichever axis has the smaller overlap (so they
      // slide along the actor rather than teleporting across it).
      if (overlapX < overlapZ) {
        player.position.x += dx >= 0 ? overlapX : -overlapX
      } else {
        player.position.z += dz >= 0 ? overlapZ : -overlapZ
      }
    }
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()

    if (state.gameOver || state.won) {
      hud.render(state, player.carrying)
      return
    }
    if (transitioning) return

    const room = activeRoom()
    const sharedCtx = {
      input,
      state,
      playerPosition: player.position,
      onLanded: () => visual.notifyLanded(),
      onJumped: () => {},
    }

    player.update(dt, { ...sharedCtx, grid: room.grid, tileSize: room.tileSize })
    room.update(dt, sharedCtx)
    handlePushAttempt(room)
    resolveActorOverlap(room)

    if (!tryDeliverPass(room)) tryPickupPass(room)
    hazardPass(room)
    exitPass()

    state.tickTransform(dt)
    visual.update(dt, { playerState: player.state, position: player.position })
    burst.update(dt)

    hud.render(state, player.carrying)
  })

  loop.onRender(() => {
    const room = manager.active
    if (room) {
      room.updateRenderPositions(0.18)
      debug.refresh(room)
    }
    player.updateRenderPosition(0.18)
    renderer.render()
  })

  loop.start()
}

main().catch((err) => {
  console.error(err)
})
