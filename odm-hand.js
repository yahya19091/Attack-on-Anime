// odm-hand.js
// Attack on Anime - ODM Hand + Sword Component (Placeholder version)

AFRAME.registerComponent("odm-hand", {
  schema: { default: "left" },

  init: function () {
    var self = this;

    // Create hand mesh placeholder (will be overwritten in update)
    this.el.object3D.visible = true;

    // Event handlers
    this.onTriggerDown = () => self.fireHook();
    this.onTriggerUp = () => self.el.emit("hook-release");
    this.onGripDown = () => self.el.emit("hook-reel");
    this.onThumbstickDown = () => self.el.emit("hook-boost");

    // Add listeners
    this.el.addEventListener("triggerdown", this.onTriggerDown);
    this.el.addEventListener("triggerup", this.onTriggerUp);
    this.el.addEventListener("gripdown", this.onGripDown);
    this.el.addEventListener("thumbstickdown", this.onThumbstickDown);

    // Mobile support: tap to shoot
    this.el.addEventListener("click", () => self.fireHook());
  },

  update: function (prev) {
    var hand = this.data;
    if (hand !== prev) {
      // Remove previous mesh if any
      this.el.removeObject3D("mesh");

      // Create placeholder sword in hand
      var handObj = new THREE.Group();

      // Handle
      var handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x555555 })
      );
      handle.rotation.z = Math.PI / 2;
      handObj.add(handle);

      // Blade
      var blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
      );
      blade.position.y = 0.25;
      handObj.add(blade);

      this.el.setObject3D("mesh", handObj);

      // Position & rotation for left/right hand
      handObj.position.set(0, 0, 0);
      handObj.rotation.set(0, 0, hand === "left" ? 45 : -45);
    }
  },

  tick: function (time, delta) {
    var mesh = this.el.getObject3D("mesh");
    if (mesh && mesh.mixer) mesh.mixer.update(delta / 1000);
  },

  remove: function () {
    this.el.removeObject3D("mesh");
    this.el.removeEventListener("triggerdown", this.onTriggerDown);
    this.el.removeEventListener("triggerup", this.onTriggerUp);
    this.el.removeEventListener("gripdown", this.onGripDown);
    this.el.removeEventListener("thumbstickdown", this.onThumbstickDown);
    this.el.removeEventListener("click", () => this.fireHook());
  },

  fireHook: function () {
    // Find player entity
    var player = document.querySelector("[player]");
    if (!player) return;

    // Get hand position and forward direction
    var handPos = new THREE.Vector3();
    var handDir = new THREE.Vector3(0, 0, -1);
    this.el.object3D.getWorldPosition(handPos);
    this.el.object3D.getWorldDirection(handDir);

    // Emit event: start = hip, target = hand pointing direction
    this.el.emit("hook-shoot", {
      start: player.object3D.position.clone(), // you can adjust Y for hip height
      target: handPos.clone().add(handDir.multiplyScalar(5)), // point forward
      hand: this.data
    });
  }
});
