// Knight Lore: the Filmation simulation drawn by IsoRenderer onto a canvas.
import { Input } from './engine/Input'
import { GameLoop } from './engine/GameLoop'
import { GameState, type SavedGame } from './game/GameState'
import { CanvasHud, HUD_HEIGHT } from './game/CanvasHud'
import { Overlays } from './game/Overlays'
import { Portcullis } from './game/Portcullis'
import { hazardHunts, touchesHazard } from './game/Hazards'
import { Player, type Facing, type PlayerCtx } from './game/Player'
import { FACING_VECTOR } from './game/Facing'
import { STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from './engine/StepClock'
import { EPS } from './engine/epsilons'
import { seizureEffect, dissolveEffect, pushEffect, rematerialiseEffect } from './engine/effects'
import { TouchPad } from './engine/TouchPad'
import { bindTouchControls, showTouchControlsWhenTouched } from './engine/TouchControls'
import { charmOverCauldron } from './game/Cauldron'
import { PushableBox } from './game/PushableBox'
import { Category } from './engine/categories'
import { Room } from './game/Room'
import { RoomManager } from './game/RoomManager'
import { ROOM_BUILDERS, pickStartRoom } from './scenes/rooms/index'
import { IsoRenderer } from './engine/IsoRenderer'
import { Transition } from './game/Transition'
import { loadSave, writeSave, clearSave } from './engine/SaveSlot'
import { Beeper, footstepSound } from './engine/Beeper'
import { Sparkle } from './game/Sparkle'
import { CharmHands } from './game/CharmHands'
import { blockFillsAt } from './game/BlockSolids'
import { shovedClearOf } from './game/Shove'
import { FULL_ROOM_CELLS } from './engine/OriginalPixels'
import { isHolder } from './game/Holding'
import { loadSprites, Tints } from './view/Sprites'
import { SceneDynamics } from './view/SceneDynamics'
import { CharacterLook, seizurePoses } from './view/CharacterLook'
import { TitleScreen } from './view/TitleScreen'
import { installDebugHooks } from './view/debugHooks'

const DEATH_FLASH_FRAMES = 2
const WIPE_SECONDS = 0.25
const ROOM_CENTRE = (FULL_ROOM_CELLS * 2) / 2
const SCREEN_W = 256
const SCREEN_H = 192
const PIXEL_SCALE = 4
const NO_INPUT = { isDown: () => false, wasPressed: () => false }

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app missing')

  const input = new Input()
  const saved = loadSave()
  const state = new GameState()
  const overlays = new Overlays()
  const renderer = new IsoRenderer(container, SCREEN_W, SCREEN_H, PIXEL_SCALE)
  const sprites = await loadSprites()
  renderer.setBackdropSprites(sprites.backdrop)
  const tints = new Tints()
  const scene = new SceneDynamics(sprites, tints)
  const hud = new CanvasHud({ scroll: sprites.hud.scroll, day: sprites.hud.day, hero: sprites.hud.hero, items: sprites.items }, (hue) => tints.inHue(sprites.hud.frame, hue))

  const manager = new RoomManager(ROOM_BUILDERS, state)
  const player = new Player()
  const beeper = new Beeper()
  const wipe = new Transition(WIPE_SECONDS)
  let paused = false
  let lastStepCount = 0
  let lastFrameWalked = 0
  let transitioning = false

  const look = new CharacterLook(sprites, tints)

  function activeRoom(): Room {
    const room = manager.active
    if (!room) throw new Error('no active room')
    return room
  }

  let entryFacing: Facing = 'south'
  let flashFrames = 0

  // What he moves through and stands on in a room, and what he hears doing it.
  function playerContext(room: Room): PlayerCtx & { playerPosition: THREE.Vector3; playerExtents: THREE.Vector3; boxes: PushableBox[]; carrying: string[] } {
    return {
      input,
      state,
      grid: room.grid,
      tileSize: room.tileSize,
      playerPosition: player.position,
      playerExtents: player.extents,
      dynamicSupport: (x: number, z: number, y: number) => dynamicSupportAt(room, x, z, y),
      dynamicSolid: (x: number, z: number, from: number, to: number) => blockFillsAt(room.entities, x, z, from, to),
      boxes: room.entities.filter((e): e is PushableBox => e instanceof PushableBox),
      carrying: player.carrying,
      onLanded: () => beeper.play('land'),
      onJumped: () => beeper.play('jump'),
    }
  }

  function placePlayerAtSpawn(room: Room): void {
    player.respawnAt(room.spawnX, room.spawnZ, entryFacing)
    player.standOnWhatIsUnder(playerContext(room))
  }

  const startRoomId = pickStartRoom(Math.random())
  // The original starts him in the middle of the room, where four cells meet.
  const startRoom = await manager.transitionTo(startRoomId, ROOM_CENTRE, ROOM_CENTRE)
  placePlayerAtSpawn(startRoom)

  const title = new TitleScreen(beeper)
  if (saved) title.offerContinue()
  title.playTune()
  // True when this began the game.
  const begin = (resume: boolean): boolean => {
    if (!title.close()) return false
    if (resume && saved) resumeSavedGame(saved)
    else clearSave()
    return true
  }
  window.addEventListener('keydown', (e) => {
    // The key that began the game is not also a jump or a step.
    if (begin(e.code === 'KeyC')) input.forget(e.code)
    if (e.code === 'KeyR' && (state.gameOver || state.won)) location.reload()
  })

  // On a touch screen: the on-screen controls, a button to begin (or to go on
  // with a saved game), and a tap on the end screen to play again.
  showTouchControlsWhenTouched(renderer.refit)
  bindTouchControls(document.getElementById('touch')!, new TouchPad(input))
  document.getElementById('begin')?.addEventListener('click', () => begin(false))
  document.getElementById('continue')?.addEventListener('click', () => begin(true))
  for (const id of ['win', 'gameover']) document.getElementById(id)?.addEventListener('pointerdown', () => location.reload())

  function resumeSavedGame(save: SavedGame): void {
    state.apply(save)
    // Drawn in the form the game is in.
    look.showAs(state.form)
    transitioning = true
    entryFacing = state.entry.facing
    manager.transitionTo(save.currentRoomId, state.entry.x, state.entry.z).then((room) => {
      placePlayerAtSpawn(room)
      transitioning = false
    })
  }

  state.onTransformed = () => {
    look.transformInto(state.form)
    beeper.playEffect(seizureEffect(seizurePoses()))
    if (state.form === 'human') beeper.play('day')
  }

  if (import.meta.env.DEV) {
    installDebugHooks({
      state,
      player,
      activeRoom,
      enterRoom: (id, entryX, entryZ) => {
        transitioning = true
        manager.transitionTo(id, entryX ?? 0, entryZ ?? 0).then((room) => {
          room.reset()
          if (entryX === undefined) room.setSpawn((room.grid.width * room.tileSize) / 2, 1)
          placePlayerAtSpawn(room)
          transitioning = false
        })
      },
      look: () => ({ frame: look.frame(player), form: look.form }),
      dying,
      itemImages: sprites.items.size,
      transform: () => { state.toggleForm(); state.onTransformed() },
    })
  }

  const hands = new CharmHands(player, state, beeper)
  // Death: white flash, and Sabreman dissolves into a cloud of stars where
  // he stood; then the room's movers go back to their starts, and he comes
  // back out of the stars at the door he came in through (see Sparkle).
  const sparkle = new Sparkle()
  state.onLifeLost = () => {
    flashFrames = DEATH_FLASH_FRAMES
    sparkle.dissolve()
  }

  function sparklePass(): void {
    const event = sparkle.update()
    if (event?.kind === 'step') {
      beeper.playEffect(sparkle.phase === 'dissolving' ? dissolveEffect(event.graphic) : rematerialiseEffect(event.graphic))
    } else if (event?.kind === 'dissolved' && !state.gameOver) {
      activeRoom().reset()
      placePlayerAtSpawn(activeRoom())
      sparkle.rematerialise()
    }
  }

  function dying(): boolean {
    return sparkle.phase !== 'idle'
  }

  // The original's results-screen tune, once, when the last life or the last
  // day is gone. A win has its own tune, played at the delivery.
  let gameOverTunePlayed = false
  function playGameOverTuneOnce(): void {
    if (!state.gameOver || gameOverTunePlayed) return
    gameOverTunePlayed = true
    beeper.play('title')
  }

  function hazardPass(room: Room): void {
    if (dying() || state.won) return
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.HAZARD) || !hazardHunts(e)) continue
      if (touchesHazard(player, e)) {
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
    wipe.start()
    wipe.holdUntilLoaded()
    beeper.play('door')
    manager
      .transitionTo(exit.targetRoomId, exit.entryX, exit.entryZ)
      .then((room) => {
        entryFacing = exit.direction
        state.entry = { x: exit.entryX, z: exit.entryZ, facing: exit.direction }
        room.reset()
        placePlayerAtSpawn(room)
        wipe.loaded()
        transitioning = false
        writeSave(state.serialize())
      })
      .catch((err) => {
        console.error(err)
        transitioning = false
      })
  }

  // Walking into a table or a chest pushes it (0xCBCD): it takes his pace
  // (three pixels a frame of the original's), and he follows it.
  function pushPass(room: Room): void {
    if (player.state !== 'grounded') return
    const ahead = FACING_VECTOR[player.facing]
    const reach = player.extents.x / 2 + STEP_LENGTH
    // Across his leading edge, not just his middle: he may walk into two boxes at once.
    const half = player.extents.x / 2 - EPS.OVERLAP
    const edge = [-half, 0, half].map((side) => ({
      x: player.position.x + ahead.x * reach + ahead.z * side,
      z: player.position.z + ahead.z * reach + ahead.x * side,
    }))
    const pace = (STEP_LENGTH * TICKS_PER_FRAME) / TICKS_PER_STEP
    for (const e of room.entities) {
      const inTheWay = e instanceof PushableBox && edge.some((p) => e.covers(p.x, p.z)) &&
        e.top > player.position.y + EPS.STEP && e.bottom < player.position.y + player.extents.y
      if (inTheWay) e.push({ x: ahead.x * pace, z: ahead.z * pace })
    }
  }

  // A table or chest glides with a sound on every frame it moves (0xC232).
  function boxSoundPass(room: Room): void {
    for (const e of room.entities) {
      if (e instanceof PushableBox && e.consumeMoved()) beeper.playEffect(pushEffect(e.position, room.grid))
    }
  }

  function dynamicSupportAt(room: Room, x: number, z: number, y: number): number | null {
    let best: number | null = null
    for (const e of room.entities) {
      if (!isHolder(e)) continue
      const h = e.supportAt(x, z, y)
      if (h !== null && (best === null || h > best)) best = h
    }
    return best
  }

  function resolveActorOverlap(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.ACTOR_BODY)) continue
      if (e instanceof Portcullis && !e.blocking) continue
      const to = shovedClearOf(player, e, room)
      if (to) player.position.set(to.x, player.position.y, to.z)
    }
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()
    // Nothing happens behind the title screen.
    if (title.showing) return
    if (input.wasPressed('KeyP')) paused = !paused
    if (input.wasPressed('KeyM')) beeper.toggleMute()
    if (paused) return
    if ((state.gameOver || state.won) && !dying()) {
      // The game is over: there is nothing to go on with.
      clearSave()
      playGameOverTuneOnce()
      overlays.render(state)
      return
    }
    wipe.tick(dt)
    if (transitioning || wipe.active) return
    const room = activeRoom()
    // While a charm goes into the cauldron he stands, whatever is pressed (0xD022).
    const ctx = hands.delivering(room) ? { ...playerContext(room), input: NO_INPUT } : playerContext(room)
    if (!look.morphing && !dying()) player.update(dt, ctx)
    const stepped = player.stepsTaken !== lastStepCount
    lastStepCount = player.stepsTaken
    if (player.framesWalked !== lastFrameWalked) {
      lastFrameWalked = player.framesWalked
      const footstep = footstepSound(player.framesWalked)
      if (footstep) beeper.play(footstep)
    }
    room.update(dt, ctx)
    boxSoundPass(room)
    if (stepped) pushPass(room)
    resolveActorOverlap(room)
    if (!dying() && !look.morphing && !hands.delivering(room) && input.wasPressed('KeyE')) hands.use(room)
    hands.settleDeliveries(room)
    if (!dying()) hands.takeLifeTouched(room)
    hazardPass(room)
    if (!dying()) exitPass()
    sparklePass()
    // Night falls, or day breaks, only once he is on the ground: never
    // frozen in mid-air through the seizure.
    if (player.state === 'grounded' && !dying()) state.tickTransform(dt)
    look.update(dt, input.isDown('ArrowUp') && player.state === 'grounded')
    overlays.render(state)
  })

  loop.onRender(() => {
    const room = manager.active
    if (!room) return
    if (wipe.active) {
      renderer.clear()
      return
    }
    renderer.render(room, [...scene.of(room, charmOverCauldron(state.wantedItem, state.form)), look.dynamic(player, sparkle, room.tint)])
    const ctx = renderer.canvas.getContext('2d')
    if (ctx) hud.draw(ctx, SCREEN_H - HUD_HEIGHT, state, player.satchelSlots, room.tint)
    if (paused) drawPaused()
    if (state.isDusk && !look.morphing) drawDusk()
    if (flashFrames > 0) {
      flashFrames--
      drawFlash()
    }
  })

  function drawPaused(): void {
    const ctx = renderer.canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height)
    ctx.fillStyle = '#ffefc4'
    ctx.font = '16px "Courier New", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('PAUSED', renderer.canvas.width / 2, renderer.canvas.height / 2)
  }

  function drawFlash(): void {
    const ctx = renderer.canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height)
  }

  // The last seconds before a transform: the room flickers dark, as a warning.
  function drawDusk(): void {
    const ctx = renderer.canvas.getContext('2d')
    if (!ctx) return
    const flicker = Math.floor(performance.now() / 120) % 2 === 0
    ctx.fillStyle = flicker ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, renderer.canvas.width, renderer.canvas.height)
  }

  loop.start()
}

main().catch((err) => console.error(err))
