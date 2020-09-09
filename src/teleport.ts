export class Teleport extends Entity {

  constructor(model: GLTFShape) {
    super()
    engine.addEntity(this)
    this.addComponent(model)
    this.addComponent(new Transform({ position: new Vector3(0, -0.5, 0) }))
    this.addComponent(new Animator())
    this.getComponent(Animator).addClip(new AnimationState("Teleport", { looping: false }))
    this.setParent(Attachable.AVATAR)
  }

  playAnimation() {
    this.getComponent(Animator).getClip("Teleport").stop() // Bug workaround
    this.getComponent(Animator).getClip("Teleport").play()
  }
}
