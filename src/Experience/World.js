import * as THREE from 'three'
import Experience from './Experience.js'
import Baked from './Baked.js'
import GoogleLeds from './GoogleLeds.js'
import LoupedeckButtons from './LoupedeckButtons.js'
import CoffeeSteam from './CoffeeSteam.js'
import TopChair from './TopChair.js'
import ElgatoLight from './ElgatoLight.js'
import BouncingLogo from './BouncingLogo.js'
import Screen from './Screen.js'
import Watermark from './Watermark.js'

export default class World
{
    constructor(_options)
    {
        this.experience = new Experience()
        this.config = this.experience.config
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        
        this.resources.on('groupEnd', (_group) =>
        {
            if(_group.name === 'base')
            {
                this.setBaked()
                this.setGoogleLeds()
                this.setLoupedeckButtons()
                this.setCoffeeSteam()
                this.setTopChair()
                this.setElgatoLight()
                this.setBouncingLogo()
                this.setScreens()
                this.setWatermark()
            }
        })
    }

    setBaked()
    {
        this.baked = new Baked()
    }

    setGoogleLeds()
    {
        this.googleLeds = new GoogleLeds()
    }

    setLoupedeckButtons()
    {
        this.loupedeckButtons = new LoupedeckButtons()
    }

    setCoffeeSteam()
    {
        this.coffeeSteam = new CoffeeSteam()
    }

    setTopChair()
    {
        this.topChair = new TopChair()
    }

    setElgatoLight()
    {
        this.elgatoLight = new ElgatoLight()
    }

    setBouncingLogo()
    {
        this.bouncingLogo = new BouncingLogo()
    }

    setScreens()
    {
        this.pcScreen = new Screen(
            this.resources.items.pcScreenModel.scene.children[0],
            '/assets/unnamed.png',
            { cacheBust: true, flipVertical: true }
        )
        this.macScreen = new Screen(
            this.resources.items.macScreenModel.scene.children[0],
            '/assets/unnamed.png',
            { cropAspect: 16 / 10, cacheBust: true, flipVertical: true }
        )
    }

    setWatermark()
    {
        // Ensure screens are initialized
        if(!this.pcScreen || !this.pcScreen.model || !this.pcScreen.model.mesh)
            return

        this.watermark = new Watermark({
            text: 'PixelProphett',
            imageUrl: '/assets/unnamed.png', // your uploaded poster image
            opacity: 0.95,
            scale: new THREE.Vector2(0.6, 0.24), // base size; width will auto-adjust from image aspect
            yOffset: 0.46, // place a little higher above the monitor
            backOffset: 0.032, // push slightly more towards the wall
            tiltZ: 0.02, // subtle tilt for realism
            enableAutoFromImage: true,
            fitMode: 'height',
            enableBorder: true,
            borderThickness: 0.02,
            borderColor: '#0b0b0b',
            borderOpacity: 0.9,
            screenMesh: this.pcScreen.model.mesh
        })
    }

    resize()
    {
    }

    update()
    {
        if(this.googleLeds)
            this.googleLeds.update()

        if(this.loupedeckButtons)
            this.loupedeckButtons.update()

        if(this.coffeeSteam)
            this.coffeeSteam.update()

        if(this.topChair)
            this.topChair.update()

        if(this.bouncingLogo)
            this.bouncingLogo.update()
    }

    destroy()
    {
    }
}