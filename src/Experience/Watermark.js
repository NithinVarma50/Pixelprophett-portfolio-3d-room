import * as THREE from 'three'
import Experience from './Experience.js'

export default class Watermark {
  constructor(options = {}) {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.debug = this.experience.debug

    // Options
    this.text = options.text || 'PixelProphett'
    this.opacity = options.opacity ?? 0.35
    this.scale = options.scale || new THREE.Vector2(0.6, 0.2) // meters
    this.yOffset = options.yOffset ?? 0.35 // meters above the screen
    this.backOffset = options.backOffset ?? 0.02 // push towards the wall along screen normal

    this.screenMesh = options.screenMesh // required

    if (!this.screenMesh) {
      // No screen provided; do nothing
      return
    }

    this.setWatermark()
  }

  createCanvasTexture(text) {
    const width = 1024
    const height = 340
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // Transparent background
    ctx.clearRect(0, 0, width, height)

    // Text styling
    ctx.font = 'bold 140px Poppins, Arial, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Optional subtle shadow for legibility
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 2

    ctx.fillText(text, width / 2, height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.encoding = THREE.sRGBEncoding
    texture.needsUpdate = true
    return texture
  }

  setWatermark() {
    // Build material with transparent texture
    const texture = this.createCanvasTexture(this.text)

    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      depthWrite: false
    })

    // Plane geometry sized by provided scale (meters)
    this.geometry = new THREE.PlaneGeometry(this.scale.x, this.scale.y)
    this.mesh = new THREE.Mesh(this.geometry, this.material)

    // Align orientation to the screen and position slightly above it, pushed back to the wall
    const worldPos = new THREE.Vector3()
    const worldQuat = new THREE.Quaternion()

    this.screenMesh.getWorldPosition(worldPos)
    this.screenMesh.getWorldQuaternion(worldQuat)

    // Compute forward (normal) of the screen in world space
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat)

    // Set orientation
    this.mesh.quaternion.copy(worldQuat)

    // Offset: up and back along the forward vector (negative to go towards wall)
    const pos = worldPos.clone()
    pos.y += this.yOffset
    pos.add(forward.clone().multiplyScalar(-this.backOffset))

    this.mesh.position.copy(pos)

    // Slightly reduce reflectance with tone mapping
    this.material.toneMapped = false

    this.scene.add(this.mesh)

    // Debug controls
    if (this.debug) {
      const folder = this.debug.addFolder({ title: 'watermark', expanded: false })
      folder.addInput(this, 'opacity', { min: 0, max: 1, step: 0.01 }).on('change', () => {
        this.material.opacity = this.opacity
      })
      folder.addInput(this.scale, 'x', { label: 'scale.x', min: 0.1, max: 3, step: 0.05 }).on('change', () => {
        this.mesh.scale.x = this.scale.x / (this.geometry.parameters.width || 1)
      })
      folder.addInput(this.scale, 'y', { label: 'scale.y', min: 0.05, max: 2, step: 0.05 }).on('change', () => {
        this.mesh.scale.y = this.scale.y / (this.geometry.parameters.height || 1)
      })
      folder.addInput(this, 'yOffset', { min: -1, max: 2, step: 0.01 }).on('change', () => {
        const base = this.screenMesh.position.clone()
        this.mesh.position.y = base.y + this.yOffset
      })
      folder.addInput(this, 'backOffset', { min: -0.5, max: 0.5, step: 0.005 })
    }
  }
}
