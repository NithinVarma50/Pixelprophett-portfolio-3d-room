import * as THREE from 'three'

import Experience from './Experience.js'

export default class Screen
{
    constructor(_mesh, _sourcePath, _options = {})
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.world = this.experience.world

        this.mesh = _mesh
        this.sourcePath = _sourcePath
        this.options = {
            cropAspect: null, // e.g., 16/10 for 16:10 crop; null to show full image
            coverToMesh: true, // when true, compute mesh aspect and crop to fill without distortion
            textureRotation: 0, // radians; set to Math.PI if texture appears upside down
            flipY: false, // force flipY setting on texture
            ..._options
        }

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
            this.model.texture.flipY = this.options.flipY === true
            this.applyCroppingAndTransforms()
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
                    tex.flipY = this.options.flipY === true ? true : false // default false to match GLTF UVs
                    // Improve readability on steep angles
                    tex.anisotropy = Math.min(16, this.experience.renderer.instance.capabilities.getMaxAnisotropy?.() || 8)
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    tex.needsUpdate = true
                    this.model.texture = tex
                    this.applyCroppingAndTransforms()
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
        this.model.material = new THREE.MeshBasicMaterial({ map: this.model.texture, toneMapped: false, side: THREE.DoubleSide })

        // Mesh
        this.model.mesh = this.mesh
        this.model.mesh.material = this.model.material
        this.scene.add(this.model.mesh)
    }

    getMeshAspect()
    {
        if(!this.mesh || !this.mesh.geometry) return null
        const geo = this.mesh.geometry
        if(!geo.boundingBox) geo.computeBoundingBox()
        const bb = geo.boundingBox
        if(!bb) return null
        const size = new THREE.Vector3()
        bb.getSize(size)
        // Use X (width) and Y (height) dimensions in local space
        const width = Math.abs(size.x) > 0 ? Math.abs(size.x) : 1
        const height = Math.abs(size.y) > 0 ? Math.abs(size.y) : 1
        return width / height
    }

    applyCroppingAndTransforms()
    {
        const tex = this.model.texture
        if(!tex) return

        // Determine desired aspect
        let desired = this.options.cropAspect
        if(this.options.coverToMesh)
        {
            const meshAspect = this.getMeshAspect()
            if(meshAspect) desired = meshAspect
        }

        // If we cannot determine desired or texture not ready, reset
        if(!desired || !tex.image || !tex.image.width || !tex.image.height)
        {
            tex.offset.set(0, 0)
            tex.repeat.set(1, 1)
            tex.wrapS = THREE.ClampToEdgeWrapping
            tex.wrapT = THREE.ClampToEdgeWrapping
            tex.center.set(0.5, 0.5)
            tex.rotation = this.options.textureRotation || 0
            tex.needsUpdate = true
            return
        }

        const imgAspect = tex.image.width / tex.image.height

        // Central crop to cover desired aspect
        let repeatX = 1
        let repeatY = 1
        let offsetX = 0
        let offsetY = 0

        if(desired > imgAspect)
        {
            // Crop top/bottom
            repeatY = imgAspect / desired
            offsetY = (1 - repeatY) * 0.5
        }
        else if(desired < imgAspect)
        {
            // Crop left/right
            repeatX = desired / imgAspect
            offsetX = (1 - repeatX) * 0.5
        }

        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.repeat.set(repeatX, repeatY)
        tex.offset.set(offsetX, offsetY)
        tex.center.set(0.5, 0.5)
        tex.rotation = this.options.textureRotation || 0 // allow forcing upright
        tex.needsUpdate = true
    }

    update()
    {
        // this.model.group.rotation.y = Math.sin(this.time.elapsed * 0.0005) * 0.5
    }
}