// Knight Lore: the Filmation simulation drawn by IsoRenderer onto a canvas.
import { Input } from './engine/Input'
import { GameLoop } from './engine/GameLoop'
import { GameState, ALL_ITEMS, type SavedGame } from './game/GameState'
import { CanvasHud, HUD_HEIGHT } from './game/CanvasHud'
import { Overlays } from './game/Overlays'
import { Wizard } from './game/Wizard'
import { Flame } from './game/Flame'
import { Portcullis } from './game/Portcullis'
import { SpikedBall } from './game/SpikedBall'
import { FloatingBlock } from './game/FloatingBlock'
import { hazardHunts, touchesHazard } from './game/Hazards'
import { Player, type Facing } from './game/Player'
import { FACING_VECTOR } from './game/Facing'
import { STEP_LENGTH, TICKS_PER_FRAME, TICKS_PER_STEP } from './engine/StepClock'
import { EPS } from './engine/epsilons'
import { TouchPad } from './engine/TouchPad'
import { bindTouchControls, showTouchControlsWhenTouched } from './engine/TouchControls'
import { CHARM_HEIGHT, CHARM_HOVER, Pickup } from './game/Pickup'
import { CHARM_OVER_CAULDRON, Cauldron, charmOverCauldron } from './game/Cauldron'
import { Spike } from './game/SpikeGrid'
import { PatrolEnemy } from './game/PatrolEnemy'
import { GhostEnemy } from './game/GhostEnemy'
import { CauldronSpirit } from './game/CauldronSpirit'
import { MovingPlatform } from './game/MovingPlatform'
import { PathGuard } from './game/PathGuard'
import { PushableBox } from './game/PushableBox'
import { VanishingBlock } from './game/VanishingBlock'
import { BouncingBall } from './game/BouncingBall'
import type { Entity } from './game/Entity'
import { HoppingBall } from './game/HoppingBall'
import { FallingBlock } from './game/FallingBlock'
import { Category } from './engine/categories'
import { Room } from './game/Room'
import { RoomManager } from './game/RoomManager'
import { ROOM_BUILDERS, pickStartRoom } from './scenes/rooms/index'
import { IsoRenderer, spriteDynamic, boxDynamic, type Dynamic, type SpriteDraw } from './engine/IsoRenderer'
import { selectCharacterFrame, STRIP_CELLS } from './game/CharacterFrame'
import { Transition } from './game/Transition'
import { loadSave, writeSave, clearSave } from './engine/SaveSlot'
import { Beeper, footstepSound } from './engine/Beeper'
import { dissolveEffect, pushEffect, rematerialiseEffect } from './engine/effects'
import { Sparkle } from './game/Sparkle'
import { projectToScreen, isoDepth, FULL_ROOM_CELLS } from './engine/IsoProjection'

const DEATH_FLASH_FRAMES = 2
const GHOST_DRAW_HEIGHT = 0.3
const WIPE_SECONDS = 0.25
const STAR_CELLS = 6
const ROOM_CENTRE = (FULL_ROOM_CELLS * 2) / 2
// Character strips are native ZX resolution, 24x36 cells per pose, drawn at
// 1:1 canvas pixels so the sprite stays crisp. Cells per form: STRIP_CELLS.
const TRANSFORM_FRAMES = 11
const TRANSFORM_DURATION = 2.2 // 11 morph stages at the original's ~0.2s each
const CHAR_SCALE = 1

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load ${url}`))
    img.src = url
  })
}

// Recolour a sprite sheet to a flat tint (keeps alpha) so both forms read as one
// bright silhouette — the ZX monochrome character look, regardless of the
// source capture's colour (the wolf was extracted from a green recording).
const SCREEN_W = 256
const SCREEN_H = 192
const PIXEL_SCALE = 4
function tintImage(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const x = c.getContext('2d')
  if (!x) throw new Error('2D context unavailable')
  x.drawImage(img, 0, 0)
  // Multiply keeps the sprite's black interior (its mask) black and colours the lit pixels.
  x.globalCompositeOperation = 'multiply'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'destination-in'
  x.drawImage(img, 0, 0)
  return c
}

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app missing')

  const input = new Input()
  const saved = loadSave()
  const state = new GameState()
  const overlays = new Overlays()
  const renderer = new IsoRenderer(container, SCREEN_W, SCREEN_H, PIXEL_SCALE)

  // Everything in the play area is drawn in the room's one colour, as on the
  // Spectrum; each sprite is tinted per room hue on first use.
  const tintedByHue = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>()
  const inHue = (source: HTMLImageElement, hue: number): HTMLCanvasElement => {
    let byHue = tintedByHue.get(source)
    if (!byHue) tintedByHue.set(source, (byHue = new Map()))
    let img = byHue.get(hue)
    if (!img) byHue.set(hue, (img = tintImage(source, `#${hue.toString(16).padStart(6, '0')}`)))
    return img
  }
  const transformStrip = await loadImage('/sprites/sabreman-transform.png')
  const strips = {
    human: {
      front: await loadImage('/sprites/sabreman-front.png'),
      back: await loadImage('/sprites/sabreman-back.png'),
    },
    werewolf: {
      front: await loadImage('/sprites/sabrewulf-front.png'),
      back: await loadImage('/sprites/sabrewulf-back.png'),
    },
  }
  spikesImage = await loadImage('/sprites/rip/spikes.png')
  // Set pieces ripped from the original's memory (public/sprites/rip/index.json).
  const setPieces = {
    cauldron: await loadImage('/sprites/rip/cauldron.png'),
    wizard: await loadImage('/sprites/wizard.png'),
    flame: await loadImage('/sprites/flame.png'),
    stars: await loadImage('/sprites/rip/stars.png'),
  }
  const monsterSources = {
    ghost: await loadImage('/sprites/rip/ghost.png'),
    grille: await loadImage('/sprites/rip/cage.png'),
    spikedBall: await loadImage('/sprites/rip/spiked-ball.png'),
    guardLeft: await loadImage('/sprites/rip/guard-left.png'),
    guardRight: await loadImage('/sprites/rip/guard-right.png'),
    ball: await loadImage('/sprites/rip/ball.png'),
    hedge: await loadImage('/sprites/rip/hedge.png'),
    gargoyle: await loadImage('/sprites/rip/gargoyle.png'),
    chest: await loadImage('/sprites/rip/chest.png'),
    table: await loadImage('/sprites/rip/table.png'),
  }
  const monster = (kind: keyof typeof monsterSources, hue: number): HTMLCanvasElement => inHue(monsterSources[kind], hue)
  const hudLayers = {
    frame: await loadImage('/sprites/hud-frame.png'),
    scroll: tintImage(await loadImage('/sprites/hud-scroll.png'), '#ff3030'),
    day: tintImage(await loadImage('/sprites/hud-day.png'), '#40ff40'),
    hero: tintImage(await loadImage('/sprites/hud-hero.png'), '#ffffff'),
  }
  const tintedFrames = new Map<number, HTMLCanvasElement>()
  const tintFrame = (hue: number): HTMLCanvasElement => {
    let frame = tintedFrames.get(hue)
    if (!frame) {
      frame = tintImage(hudLayers.frame, `#${hue.toString(16).padStart(6, '0')}`)
      tintedFrames.set(hue, frame)
    }
    return frame
  }
  const itemImages = new Map<string, HTMLImageElement>()
  for (const id of ALL_ITEMS) {
    itemImages.set(id, await loadImage(`/sprites/items/${id}.png`))
  }
  const hud = new CanvasHud({ scroll: hudLayers.scroll, day: hudLayers.day, hero: hudLayers.hero, items: itemImages }, tintFrame)

  const manager = new RoomManager(ROOM_BUILDERS, state)
  const player = new Player()
  const beeper = new Beeper()
  const wipe = new Transition(WIPE_SECONDS)
  let paused = false
  let lastStepCount = 0
  let transitioning = false

  // Character visual state (2D): form lags state.form across a short flicker.
  let visualForm: 'human' | 'werewolf' = 'human'
  let transformElapsed = TRANSFORM_DURATION
  let transformTarget: 'human' | 'werewolf' = 'human'
  let charMoving = false

  function activeRoom(): Room {
    const room = manager.active
    if (!room) throw new Error('no active room')
    return room
  }

  let entryFacing: Facing = 'south'
  let flashFrames = 0

  function placePlayerAtSpawn(room: Room): void {
    player.respawnAt(room.spawnX, room.spawnZ, entryFacing)
  }

  const startRoomId = pickStartRoom(Math.random())
  // The original starts him in the middle of the room, where four cells meet.
  const startRoom = await manager.transitionTo(startRoomId, ROOM_CENTRE, ROOM_CENTRE)
  placePlayerAtSpawn(startRoom)

  const intro = document.getElementById('intro')
  const continueHint = document.getElementById('continue-hint')
  if (continueHint && saved) continueHint.style.display = 'block'
  playTitleTune()
  const begin = (resume: boolean): void => {
    if (!intro || intro.style.display === 'none') return
    intro.style.display = 'none'
    hideSoundHint()
    beeper.stop()
    beeper.play('gameStart')
    if (resume && saved) resumeSavedGame(saved)
    else clearSave()
  }
  window.addEventListener('keydown', (e) => {
    begin(e.code === 'KeyC')
    if (e.code === 'KeyR' && (state.gameOver || state.won)) location.reload()
  })

  // On a touch screen: the on-screen controls, a button to begin (or to go on
  // with a saved game), and a tap on the end screen to play again.
  showTouchControlsWhenTouched(renderer.refit)
  bindTouchControls(document.getElementById('touch')!, new TouchPad(input))
  document.getElementById('begin')?.addEventListener('click', () => begin(false))
  const continueButton = document.getElementById('continue')
  if (continueButton && saved) continueButton.style.display = ''
  continueButton?.addEventListener('click', () => begin(true))
  for (const id of ['win', 'gameover']) document.getElementById(id)?.addEventListener('pointerdown', () => location.reload())

  // The original's title tune. Browsers hold sound back until the page has
  // had a click or a key, and a key starts the game, so when sound is held
  // back a click on the title screen plays the tune instead. Whichever comes
  // first, the click or the browser's yes, starts it once.
  function playTitleTune(): void {
    let started = false
    const start = (): void => {
      if (started || !titleShowing()) return
      started = true
      hideSoundHint()
      beeper.play('title')
    }
    window.addEventListener('pointerdown', start, { once: true })
    void beeper.soundAllowed().then((allowed) => {
      if (allowed) start()
      else if (!started && titleShowing()) showSoundHint()
    })
  }

  function showSoundHint(): void {
    const hint = document.getElementById('sound-hint')
    if (hint) hint.style.display = 'block'
  }

  function titleShowing(): boolean {
    return intro !== null && intro.style.display !== 'none'
  }

  function hideSoundHint(): void {
    const hint = document.getElementById('sound-hint')
    if (hint) hint.style.display = 'none'
  }

  function resumeSavedGame(save: SavedGame): void {
    state.apply(save)
    transitioning = true
    manager.transitionTo(save.currentRoomId, 9, 1).then((room) => {
      placePlayerAtSpawn(room)
      transitioning = false
    })
  }

  state.onTransformed = () => {
    transformElapsed = 0
    transformTarget = state.form
    beeper.play('transform')
    if (state.form === 'human') beeper.play('day')
  }

  // Dev hooks for verification, absent from production builds.
  if (import.meta.env.DEV) {
    const hooks = window as unknown as Record<string, unknown>
    hooks.__t = () => { state.toggleForm(); state.onTransformed(); state.transformTimer = 9999 }
    hooks.__win = () => { state.won = true }
    hooks.__lose = () => { state.gameOver = true; state.gameOverReason = 'lives' }
    hooks.__timer = (seconds: number) => { state.transformTimer = seconds }
    // Without a position, enters by the north door of whatever size the room is.
    // As through a door, the room's movers start afresh.
    hooks.__room = (id: string, entryX?: number, entryZ?: number) => {
      transitioning = true
      manager.transitionTo(id, entryX ?? 0, entryZ ?? 0).then((room) => {
        room.reset()
        if (entryX === undefined) room.setSpawn((room.grid.width * room.tileSize) / 2, 1)
        placePlayerAtSpawn(room)
        transitioning = false
      })
    }
    // Puts charms in his hands, as if carried in from other rooms.
    hooks.__give = (ids: string[]) => {
      for (const id of ids) player.tryPickup(new Pickup(id, state.currentRoomId), state, () => {})
    }
    hooks.__pos = (x: number, y: number, z: number) => {
      player.position.set(x, y, z)
    }
    hooks.__dbg = () => ({
      steps: player.stepsTaken,
      frame: selectCharacterFrame(player.facing, player.stepsTaken, charMoving, player.state !== 'grounded', visualForm),
      form: visualForm,
      room: state.currentRoomId,
    wanted: state.wantedItem,
    overCauldron: charmOverCauldron(state.wantedItem, state.form),
    itemImages: itemImages.size,
      day: state.dayCount,
      state: player.state,
      dying: dying(),
      facing: player.facing,
      pos: { x: Number(player.position.x.toFixed(2)), y: Number(player.position.y.toFixed(2)), z: Number(player.position.z.toFixed(2)) },
      platforms: activeRoom().entities.filter((e) => e instanceof MovingPlatform).map((e) => ({ x: e.position.x, z: e.position.z })),
      carrying: player.carrying,
      monsters: activeRoom().entities
        .filter((e) => e instanceof PathGuard || e instanceof Flame || e instanceof BouncingBall || e instanceof PatrolEnemy || e instanceof GhostEnemy || e instanceof HoppingBall)
        .map((e) => ({ kind: monsterKind(e), x: e.position.x, y: e.position.y, z: e.position.z })),
      spikedBalls: activeRoom().entities
        .filter((e) => e instanceof SpikedBall)
        .map((e) => ({ x: e.position.x, y: e.position.y, z: e.position.z })),
      fallingBlocks: activeRoom().entities
        .filter((e): e is FallingBlock => e instanceof FallingBlock)
        .map((e) => ({ x: e.position.x, top: e.top, z: e.position.z })),
      gates: activeRoom().entities
        .filter((e): e is Portcullis => e instanceof Portcullis)
        .map((e) => ({ cells: e.cells, state: e.state, blocking: e.blocking, openFramesLeft: e.openFramesLeft })),
      delivered: state.cureProgress,
      lives: state.lives,
      won: state.won,
      timer: state.transformTimer,
      // The form the game is in; `form` is the one drawn, which lags through the transformation.
      night: state.form === 'werewolf',
      pickups: activeRoom().entities
        .filter((e): e is Pickup => e instanceof Pickup && !e.collected)
        .map((e) => ({ id: e.id, x: e.position.x, y: e.position.y, z: e.position.z })),
      cauldron: activeRoom().entities
        .filter((e) => e instanceof Cauldron)
        .map((e) => ({ x: e.position.x, y: e.position.y, z: e.position.z }))[0] ?? null,
    })
  }

  // The wolf can carry nothing: at nightfall what the man carried falls at his feet.
  state.onTransformWhileCarrying = (id) => {
    const charm = player.satchel.handOver(id)
    if (charm) layCharm(charm, player.position)
    beeper.play('drop')
  }
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

  // E with nothing in reach to pick up puts down the charm carried longest,
  // under his feet: he stands on it, a block higher (see Player).
  function tryPutDownPass(room: Room): void {
    const feet = player.position.clone()
    const charm = player.putDownUnderFoot(state, hasHeadroom(room, feet))
    if (!charm) return
    layCharm(charm, feet)
    beeper.play('drop')
  }

  // Nothing may hang in the block over his head that he is lifted into.
  function hasHeadroom(room: Room, feet: THREE.Vector3): boolean {
    const from = feet.y + CHARM_HEIGHT
    const to = from + player.extents.y
    return !room.entities.some((e) => {
      if (e === player || !e.active) return false
      const over = Math.abs(e.position.x - feet.x) < (e.extents.x + player.extents.x) / 2 &&
        Math.abs(e.position.z - feet.z) < (e.extents.z + player.extents.z) / 2
      if (!over) return false
      const top = 'supportAt' in e ? (e as { supportAt: (x: number, z: number, y: number) => number | null }).supportAt(feet.x, feet.z, Infinity) : null
      const bottom = top !== null ? top - 1 : e.position.y
      const height = top !== null ? 1 : e.extents.y
      return bottom < to && bottom + height > from + 1e-6
    })
  }

  function layCharm(charm: Pickup, at: THREE.Vector3): void {
    charm.dropAt(at.x, at.y + CHARM_HOVER, at.z)
    activeRoom().add(charm)
  }

  // E by a charm picks it up; with his hands full, the charm carried longest
  // is left where the new one lay. True when there was a charm to pick up.
  function tryPickupPass(room: Room): boolean {
    for (const e of room.entities) {
      if (!(e instanceof Pickup) || e.collected) continue
      if (!e.isWithinReachOf(player.position)) continue
      if (e.id === 'life') {
        takeExtraLife(room, e)
        return true
      }
      const where = e.position.clone().setY(e.position.y - CHARM_HOVER)
      player.tryPickup(e, state, (letGo) => {
        beeper.play('pickup')
        e.collect()
        room.remove(e)
        if (letGo) layCharm(letGo, where)
      })
      return true
    }
    return false
  }

  function takeExtraLife(room: Room, life: Pickup): void {
    state.gainLife()
    state.emptiedRooms.push(life.homeRoomId)
    life.collect()
    room.remove(life)
    beeper.play('pickup')
  }

  function tryDeliverPass(room: Room): boolean {
    const cauldron = room.entities.find((e): e is Cauldron => e instanceof Cauldron)
    if (!cauldron || !cauldron.isInRange(player.position)) return false
    const wanted = state.wantedItem
    const charm = wanted ? player.satchel.handOver(wanted) : undefined
    if (!charm || !state.deliverCureItem(charm.id)) {
      if (charm) player.satchel.take(charm)
      if (!player.satchel.isEmpty) beeper.play('wrong')
      return false
    }
    state.emptiedRooms.push(charm.homeRoomId)
    beeper.play(state.won ? 'win' : 'deliver')
    return true
  }

  function hazardPass(room: Room): void {
    if (player.isInvulnerable || dying()) return
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.HAZARD) || !hazardHunts(e, state.form)) continue
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
    const x = player.position.x + ahead.x * reach
    const z = player.position.z + ahead.z * reach
    const box = room.entities.find((e): e is PushableBox =>
      e instanceof PushableBox && e.covers(x, z) && e.top > player.position.y + EPS.STEP && e.bottom < player.position.y + player.extents.y)
    if (!box) return
    const pace = (STEP_LENGTH * TICKS_PER_FRAME) / TICKS_PER_STEP
    box.push({ x: ahead.x * pace, z: ahead.z * pace })
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
      if (!(e instanceof MovingPlatform || e instanceof PushableBox || e instanceof VanishingBlock || e instanceof Pickup || e instanceof FloatingBlock || e instanceof FallingBlock)) continue
      const h = e.supportAt(x, z, y)
      if (h !== null && (best === null || h > best)) best = h
    }
    return best
  }

  function resolveActorOverlap(room: Room): void {
    for (const e of room.entities) {
      if (!e.active || !e.hasCategory(Category.ACTOR_BODY)) continue
      if (e instanceof Portcullis && !e.blocking) continue
      const dx = player.position.x - e.position.x
      const dz = player.position.z - e.position.z
      const overlapX = (player.extents.x + e.extents.x) / 2 - Math.abs(dx)
      const overlapZ = (player.extents.z + e.extents.z) / 2 - Math.abs(dz)
      if (overlapX <= 0 || overlapZ <= 0) continue
      if (overlapX < overlapZ) player.position.x += dx >= 0 ? overlapX : -overlapX
      else player.position.z += dz >= 0 ? overlapZ : -overlapZ
    }
  }

  function updateCharacter(dt: number): void {
    charMoving = input.isDown('ArrowUp') && player.state === 'grounded'
    if (transformElapsed < TRANSFORM_DURATION) {
      transformElapsed += dt
      if (transformElapsed >= TRANSFORM_DURATION) visualForm = transformTarget
    }
  }

  function morphing(): boolean {
    return transformElapsed < TRANSFORM_DURATION
  }

  function starsSprite(): SpriteDraw {
    const stars = inHue(setPieces.stars, activeRoom().tint)
    const frameW = stars.width / STAR_CELLS
    return { image: stars, frameX: sparkle.starCell * frameW, frameW, frameH: stars.height, scale: CHAR_SCALE, flip: false, x: player.position.x, y: player.position.y, z: player.position.z }
  }

  // The morph strip was captured facing west; mirror it for the east-ish facings.
  function transformSprite(): SpriteDraw {
    const progress = transformElapsed / TRANSFORM_DURATION
    const stage = Math.min(TRANSFORM_FRAMES - 1, Math.floor(progress * TRANSFORM_FRAMES))
    const frame = transformTarget === 'werewolf' ? stage : TRANSFORM_FRAMES - 1 - stage
    const frameW = transformStrip.width / TRANSFORM_FRAMES
    return {
      image: inHue(transformStrip, activeRoom().tint),
      frameX: frame * frameW,
      frameW,
      frameH: transformStrip.height,
      scale: CHAR_SCALE,
      flip: player.facing === 'north' || player.facing === 'east',
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    }
  }

  function characterDynamic(): Dynamic {
    if (dying()) return spriteDynamic(starsSprite())
    if (morphing()) return spriteDynamic(transformSprite())
    const selected = selectCharacterFrame(player.facing, player.stepsTaken, charMoving, player.state !== 'grounded', visualForm)
    const sheet = inHue(strips[visualForm][selected.view], activeRoom().tint)
    const frameW = sheet.width / STRIP_CELLS[visualForm]
    const sprite: SpriteDraw = {
      image: sheet,
      frameX: selected.frame * frameW,
      frameW,
      frameH: sheet.height,
      scale: CHAR_SCALE,
      flip: selected.flip,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    }
    return spriteDynamic(sprite)
  }

  // Hedges and gargoyles, in the room's hue like everything in it, each on
  // its level of a column (see IsoRenderer, which leaves those levels out).
  function decorDynamics(room: Room): Dynamic[] {
    return [...room.decor].map(([cell, kind]) => {
      const [gx, gz, level] = cell.split(',').map(Number) as [number, number, number]
      return setPieceSprite(monster(kind, room.tint), (gx + 0.5) * room.tileSize, level, (gz + 0.5) * room.tileSize)
    })
  }

  function entityDynamics(room: Room): Dynamic[] {
    const out: Dynamic[] = [...decorDynamics(room)]
    for (const e of room.entities) {
      if (e instanceof Pickup) {
        if (e.collected || !e.active) continue
        const source = itemImages.get(e.id)
        if (!source) continue
        const img = inHue(source, room.tint)
        out.push(
          spriteDynamic({
            image: img,
            frameX: 0,
            frameW: img.width,
            frameH: img.height,
            scale: 1,
            flip: false,
            x: e.position.x,
            y: e.position.y + e.bobOffset,
            z: e.position.z,
          }),
        )
      } else if (e instanceof Cauldron) {
        // Rests on a platform: lift to its real height and sort in front of it.
        const depth = isoDepth(e.position.x, e.position.y, e.position.z) + 6
        out.push({ ...setPieceSprite(inHue(setPieces.cauldron, room.tint), e.position.x, e.position.y, e.position.z), depth })
        const charm = charmOverCauldron(state.wantedItem, state.form)
        const source = charm ? itemImages.get(charm) : undefined
        const img = source ? inHue(source, room.tint) : undefined
        if (img) out.push({ ...spriteDynamic({ image: img, frameX: 0, frameW: img.width, frameH: img.height, scale: 1, flip: false, x: e.position.x, y: e.position.y + CHARM_OVER_CAULDRON, z: e.position.z }), depth: depth + 1 })
      } else if (e instanceof Spike) {
        out.push(spikeBedDynamic(e.position.x, e.position.y, e.position.z))
      } else if (e instanceof GhostEnemy || e instanceof CauldronSpirit) {
        if (e instanceof CauldronSpirit && !e.risen) continue
        out.push(stripFrame(monster('ghost', room.tint), 4, Math.floor(performance.now() / 150) % 4, e.position.x, GHOST_DRAW_HEIGHT, e.position.z))
      } else if (e instanceof PatrolEnemy) {
        out.push(stripFrame(monster('guardLeft', room.tint), 4, Math.floor(performance.now() / 120) % 4, e.position.x, 0, e.position.z))
      } else if (e instanceof PathGuard) {
        const leftward = e.facing === 'south' || e.facing === 'west'
        out.push(stripFrame(monster(leftward ? 'guardLeft' : 'guardRight', room.tint), 4, e.stepsTaken % 4, e.position.x, 0, e.position.z))
      } else if (e instanceof MovingPlatform) {
        const half = e.extents.x / 2
        out.push(boxDynamic({ x0: e.position.x - half, x1: e.position.x + half, z0: e.position.z - half, z1: e.position.z + half, y0: e.bottom, y1: e.height }))
      } else if (e instanceof PushableBox) {
        out.push(setPieceSprite(monster(e.kind, room.tint), e.position.x, e.bottom, e.position.z))
      } else if (e instanceof VanishingBlock) {
        if (e.present) out.push(vanishingDynamic(e))
      } else if (e instanceof BouncingBall) {
        out.push(stripFrame(monster('ball', room.tint), 2, e.position.y > 0.5 ? 1 : 0, e.position.x, e.position.y, e.position.z))
      } else if (e instanceof HoppingBall) {
        out.push(stripFrame(monster('ball', room.tint), 2, e.speedPx > 0 ? 1 : 0, e.position.x, e.position.y, e.position.z))
      } else if (e instanceof FallingBlock) {
        const half = room.tileSize / 2
        out.push(boxDynamic({ x0: e.position.x - half, x1: e.position.x + half, z0: e.position.z - half, z1: e.position.z + half, y0: e.top - 1, y1: e.top }))
      } else if (e instanceof Wizard) {
        out.push(setPieceSprite(inHue(setPieces.wizard, room.tint), e.position.x, 0, e.position.z))
      } else if (e instanceof Portcullis) {
        // One grille per cell of its line, mirrored when the line runs north-south.
        const acrossZ = e.cells[0]!.x === e.cells.at(-1)!.x && e.cells.length > 1
        const grille = monster('grille', room.tint)
        for (const c of e.cells) {
          out.push(setPieceSprite(grille, c.x * room.tileSize + room.tileSize / 2, e.bottom, c.z * room.tileSize + room.tileSize / 2, acrossZ))
        }
      } else if (e instanceof FloatingBlock) {
        const half = room.tileSize / 2
        if (room.decorAt(Math.floor(e.position.x / room.tileSize), Math.floor(e.position.z / room.tileSize), e.bottom)) continue
        out.push(boxDynamic({ x0: e.position.x - half, x1: e.position.x + half, z0: e.position.z - half, z1: e.position.z + half, y0: e.bottom, y1: e.top }))
      } else if (e instanceof SpikedBall) {
        out.push(setPieceSprite(monster('spikedBall', room.tint), e.position.x, e.position.y, e.position.z))
      } else if (e instanceof Flame) {
        const flame = inHue(setPieces.flame, room.tint)
        const frameW = flame.width / 3
        out.push(spriteDynamic({ image: flame, frameX: e.frame * frameW, frameW, frameH: flame.height, scale: 1, flip: false, x: e.position.x, y: e.position.y, z: e.position.z }))
      }
    }
    return out
  }

  const loop = new GameLoop()
  loop.onUpdate((dt) => {
    input.update()
    if (input.wasPressed('KeyP')) paused = !paused
    if (input.wasPressed('KeyM')) beeper.toggleMute()
    if (paused) return
    if ((state.gameOver || state.won) && !dying()) {
      playGameOverTuneOnce()
      overlays.render(state)
      return
    }
    wipe.tick(dt)
    if (transitioning || wipe.active) return
    const room = activeRoom()
    const ctx = {
      input,
      state,
      grid: room.grid,
      tileSize: room.tileSize,
      playerPosition: player.position,
      playerExtents: player.extents,
      dynamicSupport: (x: number, z: number, y: number) => dynamicSupportAt(room, x, z, y),
      boxes: room.entities.filter((e) => e instanceof PushableBox),
      onLanded: () => beeper.play('land'),
      onJumped: () => beeper.play('jump'),
    }
    if (!morphing() && !dying()) player.update(dt, ctx)
    const stepped = player.stepsTaken !== lastStepCount
    if (stepped) {
      lastStepCount = player.stepsTaken
      const footstep = footstepSound(player.stepsTaken)
      if (footstep) beeper.play(footstep)
    }
    room.update(dt, ctx)
    boxSoundPass(room)
    if (stepped) pushPass(room)
    resolveActorOverlap(room)
    if (!dying() && input.wasPressed('KeyE') && !tryDeliverPass(room) && !tryPickupPass(room)) tryPutDownPass(room)
    hazardPass(room)
    if (!dying()) exitPass()
    sparklePass()
    state.tickTransform(dt)
    updateCharacter(dt)
    overlays.render(state)
  })

  loop.onRender(() => {
    const room = manager.active
    if (!room) return
    if (wipe.active) {
      renderer.clear()
      return
    }
    renderer.render(room, [...entityDynamics(room), characterDynamic()])
    const ctx = renderer.canvas.getContext('2d')
    if (ctx) hud.draw(ctx, SCREEN_H - HUD_HEIGHT, state, player.carrying, room.tint)
    if (paused) drawPaused()
    if (state.isDusk && !morphing()) drawDusk()
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

// --- Set-piece drawing ---


// A slab on four legs: the slab is one box, each leg a thin box at a corner.
// How a walker gets past it: behind a patrol, under a bounce, or away from a wanderer.
function monsterKind(e: Entity): 'patrols' | 'bounces' | 'roams' {
  if (e instanceof BouncingBall) return 'bounces'
  return e instanceof GhostEnemy || e instanceof HoppingBall ? 'roams' : 'patrols'
}

// Crumbling blocks flicker in their last steps before vanishing.
function vanishingDynamic(v: VanishingBlock): Dynamic {
  const half = v.extents.x / 2
  const box = boxDynamic({ x0: v.position.x - half, x1: v.position.x + half, z0: v.position.z - half, z1: v.position.z + half, y0: 0, y1: v.height })
  const crumbling = v.framesUntilVanish >= 0
  if (!crumbling) return box
  return { ...box, draw: (ctx, cfg, shades) => { if (Math.floor(performance.now() / 80) % 2 === 0) box.draw(ctx, cfg, shades) } }
}

function stripFrame(image: HTMLCanvasElement, cells: number, frame: number, x: number, y: number, z: number, flip = false): Dynamic {
  const frameW = image.width / cells
  return spriteDynamic({ image, frameX: frame * frameW, frameW, frameH: image.height, scale: 1, flip, x, y, z })
}

function setPieceSprite(image: HTMLCanvasElement, x: number, y: number, z: number, flip = false): Dynamic {
  return spriteDynamic({ image, frameX: 0, frameW: image.width, frameH: image.height, scale: 1, flip, x, y, z })
}

// The original's spike bed: a slab of teeth drawn in the room hue, anchored
// at the tile's near corner like a block top.
const spikeTinted = new Map<string, HTMLCanvasElement>()
let spikesImage: HTMLImageElement

function spikeBedDynamic(x: number, y: number, z: number): Dynamic {
  return {
    x,
    y,
    z,
    draw: (ctx, cfg, shades) => {
      const key = shades.top
      let img = spikeTinted.get(key)
      if (!img) {
        img = tintImage(spikesImage, shades.top)
        spikeTinted.set(key, img)
      }
      const p = projectToScreen(x, y, z + cfg.tile / 2, cfg)
      ctx.drawImage(img, Math.round(p.sx - img.width / 2), Math.round(p.sy - img.height))
    },
  }
}

// A bed of thin needles across the tile, like the original's spike pits:
// 1px verticals of varied height on a fixed pseudo-random spread per tile.

main().catch((err) => console.error(err))
