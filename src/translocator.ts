export class Translocator extends Entity {
  isFired: boolean = false
  blueGlow = new Entity()
  orangeGlow = new Entity()

  constructor(transform: Transform) {
    super()
    engine.addEntity(this)
    this.addComponent(new GLTFShape("models/translocator.glb"))
    this.addComponent(transform)

    // Glow setup
    this.blueGlow.addComponent(new Transform())
    this.blueGlow.addComponent(new GLTFShape("models/blueGlow.glb"))
    this.blueGlow.setParent(this)

    this.orangeGlow.addComponent(new Transform())
    this.orangeGlow.addComponent(new GLTFShape("models/orangeGlow.glb"))
    this.orangeGlow.setParent(this)

    this.setGlow(false)
  }

  // Switches between the glows
  setGlow(isFired: boolean): void {
    if (isFired) {
      this.isFired = isFired
      this.blueGlow.getComponent(Transform).scale.setAll(0)
      this.orangeGlow.getComponent(Transform).scale.setAll(1)
    } else {
      this.isFired = isFired
      this.blueGlow.getComponent(Transform).scale.setAll(1)
      this.orangeGlow.getComponent(Transform).scale.setAll(0)
    }
  }
}
