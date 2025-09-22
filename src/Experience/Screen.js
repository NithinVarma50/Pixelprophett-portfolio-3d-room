import * as THREE from 'three'

import Experience from './Experience.js'

export default class Screen
{
    constructor(_mesh, _sourcePath)
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.world = this.experience.world

        this.mesh = _mesh
        this.sourcePath = _sourcePath

        this.setModel()
    }

    setModel()
    {
        this.model = {}

        const isVideo = typeof this.sourcePath === 'string' && /\.(mp4|webm|ogg)$/i.test(this.sourcePath)

        if(isVideo)
        {
            // Video element
            this.model.element = document.createElement('video')
            this.model.element.muted = true
            this.model.element.loop = true
            this.model.element.controls = true
            this.model.element.playsInline = true
            this.model.element.autoplay = true
            this.model.element.src = this.sourcePath
            this.model.element.play()

            // Video texture
            this.model.texture = new THREE.VideoTexture(this.model.element)
            this.model.texture.encoding = THREE.sRGBEncoding
        }
        else
        {
            // Image texture (load async and assign when ready)
            const loader = new THREE.TextureLoader()
            this.model.texture = new THREE.Texture()
            loader.load(
                this.sourcePath,
                (tex) => {
                    // Support both legacy and modern color space APIs
                    if ('SRGBColorSpace' in THREE) {
                        // three r152+
                        tex.colorSpace = THREE.SRGBColorSpace
                    } else {
                        tex.encoding = THREE.sRGBEncoding
                    }
                    tex.flipY = false // Match GLTF/video screen UVs
                    // Improve readability on steep angles
                    tex.anisotropy = Math.min(16, this.experience.renderer.instance.capabilities.getMaxAnisotropy?.() || 8)
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    tex.needsUpdate = true
                    this.model.texture = tex
                    if(this.model.material)
                    {
                        this.model.material.map = tex
                        this.model.material.needsUpdate = true
                    }
                },
                undefined,
                (err) => {
                    console.warn('Failed to load screen image:', this.sourcePath, err)
                }
            )
        }

        // Material
        this.model.material = new THREE.MeshBasicMaterial({ map: this.model.texture, toneMapped: false })

        // Mesh
        this.model.mesh = this.mesh
        this.model.mesh.material = this.model.material
        this.scene.add(this.model.mesh)
    }

    update()
    {
        // this.model.group.rotation.y = Math.sin(this.time.elapsed * 0.0005) * 0.5
    }
}