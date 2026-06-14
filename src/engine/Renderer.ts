import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { MonoTintShader } from './MonoTintShader'

const CAMERA_DISTANCE = 30
const CAMERA_HEIGHT = 22
const VIEW_SIZE = 12

// Bloom tuning. Strength = how intense the glow, radius = how spread out,
// threshold = luminance cutoff (only pixels brighter than this bloom).
// 0.85 threshold means the warm walls / floor stay calm; only the HDR
// torch flames and the particle burst on transformation glow.
const BLOOM_STRENGTH = 0.55
const BLOOM_RADIUS = 0.5
const BLOOM_THRESHOLD = 0.85

// Owns WebGLRenderer, Scene, OrthographicCamera, and the postprocessing
// pipeline. Honors ART_DIRECTION § fixed-camera demands.
export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.OrthographicCamera
  readonly webgl: THREE.WebGLRenderer
  private composer: EffectComposer
  private monoPass: ShaderPass

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0810)

    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect, VIEW_SIZE * aspect,
      VIEW_SIZE, -VIEW_SIZE,
      0.1, 200,
    )
    this.camera.position.set(CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_DISTANCE)
    this.camera.lookAt(8, 0, 8)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.outputColorSpace = THREE.SRGBColorSpace
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping
    // Lifted from 1.4 — players could barely see the room. The torch mood
    // survives; visibility comes first.
    this.webgl.toneMappingExposure = 2.2
    this.webgl.shadowMap.enabled = true
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.webgl.domElement)

    // Postprocessing pipeline:
    // 1. RenderPass — paint scene into the linear half-float target.
    // 2. UnrealBloomPass — glow on highlights (kept; the tint pass
    //    inherits its bloom).
    // 3. MonoTint ShaderPass — collapse RGB to luminance × room-tint, then
    //    quantise into N flat brightness bands. This is what makes the
    //    output read as "ZX Spectrum yellow on black" (or cyan, etc).
    // 4. OutputPass — tone mapping + sRGB conversion at the very end.
    this.composer = new EffectComposer(this.webgl)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD,
    )
    this.composer.addPass(bloom)
    this.monoPass = new ShaderPass(MonoTintShader)
    this.composer.addPass(this.monoPass)
    this.composer.addPass(new OutputPass())

    window.addEventListener('resize', this.handleResize)
  }

  // Switch the active room's primary colour. Called by RoomManager on
  // every transition.
  setTint(color: number): void {
    ;(this.monoPass.uniforms['uTint']!.value as THREE.Color).set(color)
  }

  private handleResize = (): void => {
    const aspect = window.innerWidth / window.innerHeight
    this.camera.left = -VIEW_SIZE * aspect
    this.camera.right = VIEW_SIZE * aspect
    this.camera.top = VIEW_SIZE
    this.camera.bottom = -VIEW_SIZE
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.composer.setSize(window.innerWidth, window.innerHeight)
  }

  render(): void {
    this.composer.render()
  }

  setEnvironment(hdr: THREE.Texture): void {
    this.scene.environment = hdr
  }
}
