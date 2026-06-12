import * as THREE from 'three'
import { KnightRig } from '../game/characters/KnightRig'
import { WerewolfRig } from '../game/characters/WerewolfRig'
import { CharacterAnimator } from '../game/characters/CharacterAnimator'

// Dev-only close-up viewer for art iteration: knight and werewolf side by
// side, game-like lighting, ?pose=walk|idle and ?spin=1 via query params.

const params = new URLSearchParams(window.location.search)
const poseName = params.get('pose') ?? 'idle'
const spin = params.get('spin') === '1'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x181420)

const camera = new THREE.OrthographicCamera(-2.6, 2.6, 2.0, -0.9, 0.1, 100)
camera.position.set(6, 4.5, 6)
camera.lookAt(0, 0.8, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.4
document.body.appendChild(renderer.domElement)

scene.add(new THREE.HemisphereLight(0x6080a0, 0x4a2818, 1.3))
scene.add(new THREE.AmbientLight(0x404858, 0.5))
const key = new THREE.DirectionalLight(0xfff0d8, 1.6)
key.position.set(4, 6, 3)
scene.add(key)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  new THREE.MeshLambertMaterial({ color: 0x2a2433 }),
)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const knight = new KnightRig()
knight.root.position.x = -1.2
scene.add(knight.root)

const werewolf = new WerewolfRig()
werewolf.root.position.x = 1.2
scene.add(werewolf.root)

const animator = new CharacterAnimator()
const clock = new THREE.Clock()

function frame(): void {
  requestAnimationFrame(frame)
  const dt = Math.min(clock.getDelta(), 0.05)
  const moving = poseName === 'walk'
  animator.update(dt, {
    playerState: 'grounded',
    moveX: moving ? 4 : 0,
    moveZ: 0,
    speed: moving ? 4 : 0,
  })
  const knightPose = animator.pose('human')
  const wolfPose = animator.pose('werewolf')
  const yaw = spin ? clock.elapsedTime * 0.6 : 0
  knightPose.yaw = yaw
  wolfPose.yaw = yaw
  knight.applyPose(knightPose)
  werewolf.applyPose(wolfPose)
  knight.root.position.x = -1.2
  werewolf.root.position.x = 1.2
  renderer.render(scene, camera)
}
frame()
