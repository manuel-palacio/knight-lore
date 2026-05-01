import * as THREE from 'three'
import { Renderer } from './engine/Renderer'
import { GameLoop } from './engine/GameLoop'
import { Input } from './engine/Input'
import { AssetLoader } from './engine/AssetLoader'
import { DebugOverlay } from './engine/DebugOverlay'
import { buildTheHall, type HallBuild } from './scenes/TheHall'
import { GameState } from './game/GameState'
import { HUD } from './game/HUD'
import { Category } from './engine/categories'
import { Player } from './game/Player'
import { PushBlock } from './game/PushBlock'
import { Room } from './game/Room'

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

  const build: HallBuild = await buildTheHall(renderer.scene, loader, state)
  const { room, player, enemy, door, goblet } = build

  const debug = new DebugOverlay(renderer.scene)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') debug.toggle()
  })

  state.onTransformed = () => {
    build.burst.burst(player.position)
  }

  state.onTransformWhileCarrying = (id) => {
    if (id === 'goblet') {
      goblet.collected = false
      if (goblet.object3D && player.object3D) {
        player.object3D.remove(goblet.object3D)
        goblet.object3D.position.copy(player.position)
        goblet.object3D.position.y = 0.5
        renderer.scene.add(goblet.object3D)
      }
      goblet.position.copy(player.position)
      goblet.position.y = 0.5
    }
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()

    room.update(dt, {
      input,
      state,
      onLanded: () => {},
      onJumped: () => {},
    })

    handlePushAttempt(player, room)

    if (overlapsActor(player.position, enemy.position)) {
      player.position.x = room.spawnX
      player.position.z = room.spawnZ
      player.position.y = 0
      player.state = 'grounded'
    }

    if (
      !goblet.collected &&
      Math.hypot(goblet.position.x - player.position.x, goblet.position.z - player.position.z) < 1.0 &&
      Math.abs(goblet.position.y - player.position.y) < 1.5 &&
      input.wasPressed('KeyE')
    ) {
      player.tryPickup(
        { id: goblet.id, position: goblet.position },
        state,
        () => {
          goblet.collect()
          if (goblet.object3D && player.object3D) {
            player.object3D.add(goblet.object3D)
            goblet.object3D.position.set(0, 1.2, 0)
          }
        },
      )
    }

    state.tickTransform(dt)
    build.burst.update(dt)

    if (door.open && player.position.z > 15.5) {
      state.won = true
    }

    hud.render(state, player.carrying)
  })

  loop.onRender(() => {
    room.updateRenderPositions(0.18)
    debug.refresh(room)
    renderer.render()
  })

  loop.start()
}

function handlePushAttempt(player: Player, room: Room): void {
  for (const e of room.entities) {
    if (!e.hasCategory(Category.SOLID_DYNAMIC)) continue
    const block = e as PushBlock
    const dx = block.position.x - player.position.x
    const dz = block.position.z - player.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 1.4 && dist > 0.4) {
      let dir: 'east' | 'west' | 'north' | 'south'
      if (Math.abs(dx) > Math.abs(dz)) {
        dir = dx > 0 ? 'east' : 'west'
      } else {
        dir = dz > 0 ? 'south' : 'north'
      }
      block.tryPush(dir, room.grid, room.tileSize)
    }
  }
}

function overlapsActor(a: THREE.Vector3, b: THREE.Vector3): boolean {
  return (
    Math.abs(a.x - b.x) < 0.9 &&
    Math.abs(a.z - b.z) < 0.9 &&
    Math.abs(a.y - b.y) < 1.5
  )
}

main().catch((err) => {
  console.error(err)
})
