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
            cacheBust: false, // append ?v=timestamp to force refresh
            rotate180: false, // rotate texture 180 degrees
            flipVertical: false, // flip along Y in UV space
            flipHorizontal: false, // flip along X in UV space
            zoom: 1, // >1 to slightly zoom-in (overscan) to hide borders
            flipY: undefined, // if set, overrides tex.flipY
            ..._options
        }

        this.setModel()
    }

    setModel()
    {
        this.model = {}

        const isVideo = typeof this.sourcePath === 'string' && /\.(mp4|webm|ogg)$/i.test(this.sourcePath)
        const url = this.options.cacheBust && typeof this.sourcePath === 'string'
            ? `${this.sourcePath}${this.sourcePath.includes('?') ? '&' : '?'}v=${Date.now()}`
            : this.sourcePath

        if(isVideo)
        {
            // Video element
            this.model.element = document.createElement('video')
            this.model.element.muted = true
            this.model.element.loop = true
            this.model.element.controls = true
            this.model.element.playsInline = true
            this.model.element.autoplay = true
            this.model.element.src = url
            this.model.element.play()

            // Video texture
            this.model.texture = new THREE.VideoTexture(this.model.element)
            this.model.texture.encoding = THREE.sRGBEncoding
            if(typeof this.options.flipY === 'boolean') this.model.texture.flipY = this.options.flipY
            this.applyCroppingIfNeeded()
            this.applyFlipRotateIfNeeded()
        }
        else
        {
            // Image texture (load async and assign when ready)
            const loader = new THREE.TextureLoader()
            this.model.texture = new THREE.Texture()
            loader.load(
                url,
                (tex) => {
                    // Support both legacy and modern color space APIs
                    if ('SRGBColorSpace' in THREE) {
                        // three r152+
                        tex.colorSpace = THREE.SRGBColorSpace
                    } else {
                        tex.encoding = THREE.sRGBEncoding
                    }
                    // Respect explicit flipY option if provided; otherwise default to false to match GLTF UVs
                    tex.flipY = typeof this.options.flipY === 'boolean' ? this.options.flipY : false
                    // Improve readability on steep angles
                    tex.anisotropy = Math.min(16, this.experience.renderer.instance.capabilities.getMaxAnisotropy?.() || 8)
                    tex.minFilter = THREE.LinearFilter
                    tex.magFilter = THREE.LinearFilter
                    tex.generateMipmaps = false
                    tex.needsUpdate = true
                    this.model.texture = tex
                    this.applyCroppingIfNeeded()
                    this.applyFlipRotateIfNeeded()
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

    applyFlipRotateIfNeeded()
    {
        const tex = this.model.texture
        if(!tex) return

        // Default UV transform center is (0,0). Move to center for rotation.
        if(this.options.rotate180)
        {
            tex.center.set(0.5, 0.5)
            tex.rotation = Math.PI
        }

        // Apply flips by adjusting repeat/offset while preserving existing crop repeat/offset
        // Current repeat/offset (possibly set by cropping)
        let rX = tex.repeat.x
        let rY = tex.repeat.y
        let oX = tex.offset.x
        let oY = tex.offset.y

        if(this.options.flipHorizontal)
        {
            rX = -rX
            // When flipping, shift offset so the same area stays visible
            oX = oX + (1 - Math.abs(tex.repeat.x)) - (1 - Math.abs(rX))
            // Simpler central flip respecting crop:
            oX = 1 - (oX + Math.abs(rX))
        }

        if(this.options.flipVertical)
        {
            rY = -rY
            oY = 1 - (oY + Math.abs(rY))
        }

        tex.repeat.set(rX, rY)
        tex.offset.set(oX, oY)
        tex.needsUpdate = true
    }

    applyCroppingIfNeeded()
    {
        const tex = this.model.texture
        if(!tex) return
        const desired = this.options.cropAspect
        const hasImage = tex.image && tex.image.width && tex.image.height

        // Defaults: full image
        let repeatX = 1
        let repeatY = 1
        let offsetX = 0
        let offsetY = 0

        if(desired && hasImage)
        {
            const imgAspect = tex.image.width / tex.image.height
            if(desired > imgAspect)
            {
                // Desired is wider than the image => crop vertically (top/bottom)
                repeatY = imgAspect / desired
                offsetY = (1 - repeatY) * 0.5
            }
            else if(desired < imgAspect)
            {
                // Desired is narrower than the image => crop horizontally (left/right)
                repeatX = desired / imgAspect
                offsetX = (1 - repeatX) * 0.5
            }
            // else desired == imgAspect: no crop
        }

        // Apply zoom (overscan). Zoom>1 means view a smaller portion of the texture.
        const zoom = Math.max(0.5, this.options.zoom || 1)
        if(zoom !== 1)
        {
            const zX = repeatX / zoom
            const zY = repeatY / zoom
            // Re-center after zoom
            offsetX = offsetX + (repeatX - zX) * 0.5
            offsetY = offsetY + (repeatY - zY) * 0.5
            repeatX = zX
            repeatY = zY
        }

        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.repeat.set(repeatX, repeatY)
        tex.offset.set(offsetX, offsetY)
        tex.needsUpdate = true
    }

    update()
    {
        // this.model.group.rotation.y = Math.sin(this.time.elapsed * 0.0005) * 0.5
    }
}