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
    this.imageUrl = options.imageUrl || null // optional poster image

    // Frame/border options
    this.enableBorder = options.enableBorder ?? true
    this.borderThickness = options.borderThickness ?? 0.02 // meters extra on each side
    this.borderColor = options.borderColor || '#111111'
    this.borderOpacity = options.borderOpacity ?? 0.8

    // Realism/placement options
    this.enableAutoFromImage = options.enableAutoFromImage ?? true // auto set width from image aspect keeping height (scale.y)
    this.fitMode = options.fitMode || 'height' // 'height' or 'width'
    this.tiltZ = options.tiltZ ?? 0 // slight rotation for realism (in radians)

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
    const build = (texture, imgAspect = null) => {
      // Poster material
      this.material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: this.opacity,
        depthWrite: false,
        toneMapped: false
      })

      // Group to hold poster and border for unified transform
      this.group = new THREE.Group()

      // Determine geometry size with optional auto aspect from image
      let width = this.scale.x
      let height = this.scale.y
      if (this.imageUrl && this.enableAutoFromImage && imgAspect) {
        if (this.fitMode === 'height') {
          height = this.scale.y
          width = height * imgAspect
        } else {
          width = this.scale.x
          height = width / imgAspect
        }
      }

      // Plane geometry sized by computed width/height (meters)
      this.geometry = new THREE.PlaneGeometry(width, height)
      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.mesh.renderOrder = 2
      this.mesh.position.z = 0.001 // in front of border to prevent z-fighting
      this.group.add(this.mesh)

      // Optional subtle border/frame
      if (this.enableBorder) {
        const bw = width + this.borderThickness * 2
        const bh = height + this.borderThickness * 2
        const borderGeometry = new THREE.PlaneGeometry(bw, bh)
        const borderMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(this.borderColor),
          transparent: true,
          opacity: this.borderOpacity,
          depthWrite: false,
          toneMapped: false
        })
        this.borderMesh = new THREE.Mesh(borderGeometry, borderMaterial)
        this.borderMesh.renderOrder = 1
        this.group.add(this.borderMesh)
      }

      // Align orientation to the screen and position slightly above it, pushed back to the wall
      const worldPos = new THREE.Vector3()
      const worldQuat = new THREE.Quaternion()

      this.screenMesh.getWorldPosition(worldPos)
      this.screenMesh.getWorldQuaternion(worldQuat)

      // Compute forward (normal) of the screen in world space
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat)

      // Set orientation on the group
      this.group.quaternion.copy(worldQuat)

      // Offset: up and back along the forward vector (negative to go towards wall)
      const pos = worldPos.clone()
      pos.y += this.yOffset
      pos.add(forward.clone().multiplyScalar(-this.backOffset))

      this.group.position.copy(pos)

      // Slight tilt for realism
      if (this.tiltZ) this.group.rotation.z += this.tiltZ

      this.scene.add(this.group)
      this.setupDebug(width, height)
    }

    // Create poster texture
    if (this.imageUrl) {
      const loader = new THREE.TextureLoader()
      loader.load(
        this.imageUrl,
        (tex) => {
          tex.encoding = THREE.sRGBEncoding
          const img = tex.image
          const aspect = img && img.width ? img.width / img.height : null
          build(tex, aspect)
        },
        undefined,
        () => {
          // Fallback to text if image fails
          const tex = this.createCanvasTexture(this.text)
          build(tex, null)
        }
      )
    } else {
      const texture = this.createCanvasTexture(this.text)
      build(texture, null)
    }
  }

  setupDebug(width, height) {
    // Debug controls
    if (this.debug) {
      const folder = this.debug.addFolder({ title: 'watermark', expanded: false })
      folder.addInput(this, 'opacity', { min: 0, max: 1, step: 0.01 }).on('change', () => {
        this.material.opacity = this.opacity
      })
      folder.addInput(this.scale, 'x', { label: 'scale.x', min: 0.1, max: 3, step: 0.05 }).on('change', () => {
        const w = this.enableAutoFromImage && this.imageUrl && this.fitMode === 'height' && this.mesh.material.map?.image
          ? this.scale.y * (this.mesh.material.map.image.width / this.mesh.material.map.image.height)
          : this.scale.x
        const h = this.enableAutoFromImage && this.imageUrl && this.fitMode === 'width' && this.mesh.material.map?.image
          ? this.scale.x / (this.mesh.material.map.image.width / this.mesh.material.map.image.height)
          : this.scale.y
        this.mesh.geometry.dispose()
        this.mesh.geometry = new THREE.PlaneGeometry(w, h)
        if (this.borderMesh) {
          const bw = w + this.borderThickness * 2
          const bh = h + this.borderThickness * 2
          this.borderMesh.geometry.dispose()
          this.borderMesh.geometry = new THREE.PlaneGeometry(bw, bh)
        }
      })
      folder.addInput(this.scale, 'y', { label: 'scale.y', min: 0.05, max: 2, step: 0.05 }).on('change', () => {
        const w = this.enableAutoFromImage && this.imageUrl && this.fitMode === 'height' && this.mesh.material.map?.image
          ? this.scale.y * (this.mesh.material.map.image.width / this.mesh.material.map.image.height)
          : this.scale.x
        const h = this.enableAutoFromImage && this.imageUrl && this.fitMode === 'width' && this.mesh.material.map?.image
          ? this.scale.x / (this.mesh.material.map.image.width / this.mesh.material.map.image.height)
          : this.scale.y
        this.mesh.geometry.dispose()
        this.mesh.geometry = new THREE.PlaneGeometry(w, h)
        if (this.borderMesh) {
          const bw = w + this.borderThickness * 2
          const bh = h + this.borderThickness * 2
          this.borderMesh.geometry.dispose()
          this.borderMesh.geometry = new THREE.PlaneGeometry(bw, bh)
        }
      })
      folder.addInput(this, 'yOffset', { min: -1, max: 2, step: 0.01 }).on('change', () => {
        const worldPos2 = new THREE.Vector3()
        const worldQuat2 = new THREE.Quaternion()
        this.screenMesh.getWorldPosition(worldPos2)
        this.screenMesh.getWorldQuaternion(worldQuat2)
        const forward2 = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat2)
        const pos2 = worldPos2.clone()
        pos2.y += this.yOffset
        pos2.add(forward2.clone().multiplyScalar(-this.backOffset))
        this.group.position.copy(pos2)
      })
      folder.addInput(this, 'backOffset', { min: -0.5, max: 0.5, step: 0.005 }).on('change', () => {
        const worldPos2 = new THREE.Vector3()
        const worldQuat2 = new THREE.Quaternion()
        this.screenMesh.getWorldPosition(worldPos2)
        this.screenMesh.getWorldQuaternion(worldQuat2)
        const forward2 = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat2)
        const pos2 = worldPos2.clone()
        pos2.y += this.yOffset
        pos2.add(forward2.clone().multiplyScalar(-this.backOffset))
        this.group.position.copy(pos2)
      })
      folder.addInput(this, 'enableBorder')
      folder.addInput(this, 'borderThickness', { min: 0, max: 0.2, step: 0.001 }).on('change', () => {
        if (this.borderMesh) {
          const params = this.mesh.geometry.parameters
          const bw = params.width + this.borderThickness * 2
          const bh = params.height + this.borderThickness * 2
          this.borderMesh.geometry.dispose()
          this.borderMesh.geometry = new THREE.PlaneGeometry(bw, bh)
        }
      })
      folder.addInput(this, 'tiltZ', { label: 'tiltZ(rad)', min: -0.3, max: 0.3, step: 0.005 }).on('change', () => {
        this.group.rotation.z = this.tiltZ
      })
    }
  }
}

