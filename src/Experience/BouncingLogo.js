import * as THREE from 'three'

import Experience from './Experience.js'

export default class BouncingLogo
{
    constructor()
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.world = this.experience.world
        this.time = this.experience.time

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder({
                title: 'bouncingLogo',
                expanded: false
            })
        }

        this.setModel()
        this.setAnimation()
    }

    createCanvasTexture(text) {
        const width = 2048
        const height = 512
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        // Background fully transparent
        ctx.clearRect(0, 0, width, height)

        // Optional subtle backdrop for visibility
        // ctx.fillStyle = 'rgba(0,0,0,0.15)'
        // ctx.fillRect(0, 0, width, height)

        // Text styling
        ctx.font = 'bold 220px Poppins, Arial, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Shadow for contrast
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = 20
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4

        ctx.fillText(text, width / 2, height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding
        texture.anisotropy = 8
        texture.needsUpdate = true
        return texture
    }

    setModel()
    {
        this.model = {}

        this.model.group = new THREE.Group()
        this.model.group.position.x = 4.2
        this.model.group.position.y = 2.717
        this.model.group.position.z = 1.630
        this.scene.add(this.model.group)

        // Use dynamic canvas texture that reads: 'PixelProphett digital studio'
        this.model.texture = this.createCanvasTexture('PixelProphett digital studio')

        this.model.geometry = new THREE.PlaneGeometry(4, 1, 1, 1)
        this.model.geometry.rotateY(- Math.PI * 0.5)

        this.model.material = new THREE.MeshBasicMaterial({
            transparent: true,
            premultipliedAlpha: true,
            map: this.model.texture
        })

        this.model.mesh = new THREE.Mesh(this.model.geometry, this.model.material)
        this.model.mesh.scale.y = 0.359
        this.model.mesh.scale.z = 0.424
        this.model.group.add(this.model.mesh)

        // Debug
        if(this.debug)
        {
            this.debugFolder.addInput(
                this.model.group.position,
                'x',
                {
                    label: 'positionX', min: - 5, max: 5, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.model.group.position,
                'y',
                {
                    label: 'positionY', min: - 5, max: 5, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.model.group.position,
                'z',
                {
                    label: 'positionZ', min: - 5, max: 5, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.model.mesh.scale,
                'z',
                {
                    label: 'scaleZ', min: 0.001, max: 1, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.model.mesh.scale,
                'y',
                {
                    label: 'scaleY', min: 0.001, max: 1, step: 0.001
                }
            )
        }
    }

    setAnimation()
    {
        this.animations = {}

        this.animations.z = 0
        this.animations.y = 0

        this.animations.limits = {}
        this.animations.limits.z = { min: -1.076, max: 1.454 }
        this.animations.limits.y = { min: -1.055, max: 0.947 }

        this.animations.speed = {}
        this.animations.speed.z = 0.00061
        this.animations.speed.y = 0.00037

        if(this.debug)
        {
            this.debugFolder.addInput(
                this.animations.limits.z,
                'min',
                {
                    label: 'limitZMin', min: - 3, max: 0, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.animations.limits.z,
                'max',
                {
                    label: 'limitZMax', min: 0, max: 3, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.animations.limits.y,
                'min',
                {
                    label: 'limitYMin', min: - 3, max: 0, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.animations.limits.y,
                'max',
                {
                    label: 'limitYMax', min: 0, max: 3, step: 0.001
                }
            )

            this.debugFolder.addInput(
                this.animations.speed,
                'z',
                {
                    label: 'speedZ', min: 0, max: 0.001, step: 0.00001
                }
            )

            this.debugFolder.addInput(
                this.animations.speed,
                'y',
                {
                    label: 'speedY', min: 0, max: 0.001, step: 0.00001
                }
            )
        }
    }

    update()
    {
        this.animations.z += this.animations.speed.z * this.time.delta
        this.animations.y += this.animations.speed.y * this.time.delta

        if(this.animations.z > this.animations.limits.z.max)
        {
            this.animations.z = this.animations.limits.z.max
            this.animations.speed.z *= -1
        }
        if(this.animations.z < this.animations.limits.z.min)
        {
            this.animations.z = this.animations.limits.z.min
            this.animations.speed.z *= -1
        }
        if(this.animations.y > this.animations.limits.y.max)
        {
            this.animations.y = this.animations.limits.y.max
            this.animations.speed.y *= -1
        }
        if(this.animations.y < this.animations.limits.y.min)
        {
            this.animations.y = this.animations.limits.y.min
            this.animations.speed.y *= -1
        }

        this.model.mesh.position.z = this.animations.z
        this.model.mesh.position.y = this.animations.y
    }
}