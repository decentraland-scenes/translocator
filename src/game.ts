import { Sound } from "./sound"
import { Translocator } from "./translocator"
import { Teleport } from "./teleport"

// Create base scene
const base = new Entity()
base.addComponent(new GLTFShape("models/baseLight.glb"))
base.addComponent(new Transform({ scale: new Vector3(3, 1, 3) }))
engine.addEntity(base)

// Teleport effect (not the actual translocator)
const teleport = new Teleport(new GLTFShape("models/teleport.glb"))

// Translocator and setting
const X_OFFSET = 0
const Y_OFFSET = 0.5
const Z_OFFSET = 1

const translocator = new Translocator(new Transform({ position: new Vector3(X_OFFSET, Y_OFFSET, Z_OFFSET) }))
translocator.setParent(Attachable.FIRST_PERSON_CAMERA)

// Sounds
const teleportSound = new Sound(new AudioClip("sounds/teleport.mp3"))
const shootSound = new Sound(new AudioClip("sounds/shoot.mp3"))
const recallSound = new Sound(new AudioClip("sounds/recall.mp3"))

// Setup our CANNON world
const world = new CANNON.World()
world.quatNormalizeSkip = 0
world.quatNormalizeFast = false
world.gravity.set(0, -9.82, 0) // m/s²

const groundMaterial = new CANNON.Material("groundMaterial")
const groundContactMaterial = new CANNON.ContactMaterial(groundMaterial, groundMaterial, { friction: 0, restitution: 0.33 })
world.addContactMaterial(groundContactMaterial)

// Create a ground plane and apply physics material
const groundShape = new CANNON.Plane()
const groundBody = new CANNON.Body({ mass: 0 })
groundBody.addShape(groundShape)
groundBody.material = groundMaterial
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) // Reorient ground plane to be in the y-axis
world.addBody(groundBody)

// Invisible walls
//#region
const wallShape = new CANNON.Box(new CANNON.Vec3(24, 50, 0.5))
const wallNorth = new CANNON.Body({
  mass: 0,
  shape: wallShape,
  position: new CANNON.Vec3(24, 49.5, 48),
})
world.addBody(wallNorth)

const wallSouth = new CANNON.Body({
  mass: 0,
  shape: wallShape,
  position: new CANNON.Vec3(24, 49.5, 0),
})
world.addBody(wallSouth)

const wallEast = new CANNON.Body({
  mass: 0,
  shape: wallShape,
  position: new CANNON.Vec3(48, 49.5, 24),
})
wallEast.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2)
world.addBody(wallEast)

const wallWest = new CANNON.Body({
  mass: 0,
  shape: wallShape,
  position: new CANNON.Vec3(0, 49.5, 24),
})
wallWest.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2)
world.addBody(wallWest)
//#endregion

// Create translocator physics
let translocatorTransform = translocator.getComponent(Transform)

const translocatorBody: CANNON.Body = new CANNON.Body({
  mass: 3, // kg
  position: new CANNON.Vec3(translocatorTransform.position.x, translocatorTransform.position.y, translocatorTransform.position.z), // m
  shape: new CANNON.Sphere(0.2), // m (Create sphere shaped body with a radius of 0.2)
})

const translocatorPhysicsMaterial: CANNON.Material = new CANNON.Material("translocatorMaterial")
const translocatorPhysicsContactMaterial = new CANNON.ContactMaterial(groundMaterial, translocatorPhysicsMaterial, {
  friction: 0.0,
  restitution: 0.8,
})
world.addContactMaterial(translocatorPhysicsContactMaterial)

translocatorBody.material = translocatorPhysicsMaterial // Add bouncy material to translocator body
translocatorBody.linearDamping = 0.4 // Round bodies will keep translating even with friction so you need linearDamping
translocatorBody.angularDamping = 0.4 // Round bodies will keep rotating even with friction so you need angularDamping

world.addBody(translocatorBody) // Add body to the world

// Config
const SHOOT_VELOCITY = 100
const FIXED_TIME_STEPS = 1.0 / 60.0 // seconds
const MAX_TIME_STEPS = 3
const RECALL_SPEED = 10

// Intermediate variables
const player = Camera.instance
const transform = translocator.getComponent(Transform)

class shootDiscSystem implements ISystem {
  update(dt: number): void {
    if (translocator.isFired) {
      world.step(FIXED_TIME_STEPS, dt, MAX_TIME_STEPS)
      transform.position.copyFrom(translocatorBody.position)
    } else {
      engine.removeSystem(this)
    }
  }
}

// Recall translocator disc
class recallDiscSystem implements ISystem {
  update(dt: number): void {
    if (!translocator.isFired) {
      let playerForwardVector = transform.position.subtract(new Vector3(player.position.x, player.position.y - Y_OFFSET, player.position.z))
      let increment = playerForwardVector.scale(-dt * RECALL_SPEED)
      transform.translate(increment)
      let distance = Vector3.DistanceSquared(transform.position, player.position) // Check distance squared as it's more optimized
      // Note: Distance is squared so a value of 2 is when the translocator is ~1.4m away
      if (distance <= 2) {
        engine.removeSystem(this)
        resetDisc()
      }
    }
  }
}

// Controls
const input = Input.instance

// Shoot / recall translocator disc
input.subscribe("BUTTON_DOWN", ActionButton.POINTER, false, (e) => {
  if (!translocator.isFired) {
    engine.addSystem(new shootDiscSystem())
    shootSound.getComponent(AudioSource).playOnce()
    translocator.setGlow(true)
    translocator.setParent(null)

    let shootDirection = Vector3.Forward().rotate(Camera.instance.rotation) // Camera's forward vector
    translocatorBody.position.set(
      Camera.instance.feetPosition.x + shootDirection.x,
      shootDirection.y + Camera.instance.position.y,
      Camera.instance.feetPosition.z + shootDirection.z
    )

    // Shoot
    translocatorBody.applyImpulse(
      new CANNON.Vec3(shootDirection.x * SHOOT_VELOCITY, shootDirection.y * SHOOT_VELOCITY, shootDirection.z * SHOOT_VELOCITY),
      new CANNON.Vec3(translocatorBody.position.x, translocatorBody.position.y, translocatorBody.position.z)
    )
  } else {
    // Recall
    engine.addSystem(new recallDiscSystem())
    recallSound.getComponent(AudioSource).playOnce()
    translocator.setGlow(false)
  }
})

// Teleport with the E key
input.subscribe("BUTTON_DOWN", ActionButton.PRIMARY, false, (e) => {
  if (translocator.isFired) {
    translocator.setGlow(false)
    teleportSound.getComponent(AudioSource).playOnce()
    movePlayerTo(translocatorBody.position)
    resetDisc()
    teleport.playAnimation()
  }
})

function resetDisc(): void {
  translocatorBody.velocity.setZero()
  translocatorBody.angularVelocity.setZero()
  translocator.setParent(Attachable.FIRST_PERSON_CAMERA)
  translocator.getComponent(Transform).position.set(X_OFFSET, Y_OFFSET, Z_OFFSET)
}
