import * as THREE from 'three'

// Owns WebGLRenderer, Scene, and the locked isometric OrthographicCamera.
// Honors ART_DIRECTION § fixed-camera demands by never moving the camera.
const CAMERA_DISTANCE = 30
const CAMERA_HEIGHT = 22
const VIEW_SIZE = 12

export class Renderer {
  readonly scene: THREE.Scene
  readonly camera: THREE.OrthographicCamera
  readonly webgl: THREE.WebGLRenderer

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0810)

    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.OrthographicCamera(
      -VIEW_SIZE * aspect,
      VIEW_SIZE * aspect,
      VIEW_SIZE,
      -VIEW_SIZE,
      0.1,
      200,
    )
    this.camera.position.set(CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_DISTANCE)
    this.camera.lookAt(8, 0, 8)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.webgl.outputColorSpace = THREE.SRGBColorSpace
    this.webgl.shadowMap.enabled = true
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.webgl.domElement)

    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    const aspect = window.innerWidth / window.innerHeight
    this.camera.left = -VIEW_SIZE * aspect
    this.camera.right = VIEW_SIZE * aspect
    this.camera.top = VIEW_SIZE
    this.camera.bottom = -VIEW_SIZE
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(window.innerWidth, window.innerHeight)
  }

  render(): void {
    this.webgl.render(this.scene, this.camera)
  }

  setEnvironment(hdr: THREE.Texture): void {
    this.scene.environment = hdr
  }
}
