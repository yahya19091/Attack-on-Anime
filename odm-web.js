// odm-web.js
// Attack on Anime - ODM Hook / Grappling Component

AFRAME.registerComponent("web", {
  schema: {
    length: { type: "number", default: 0 },
    strength: { type: "number", default: 100 },
    lengthFactor: { type: "number", default: 0.4 },
    lengthFactorMaxBoost: { type: "number", default: 0.2 },
    maxLength: { type: "number", default: 250 },
    shootingVelocity: { type: "number", default: 200 },
    reduceWallDirForce: { type: "number", default: 0.5 }
  },

  init: function () {
    // Visual web
    this.model = document.createElement("a-box");
    this.model.setAttribute("color", "#e2e1dd");
    this.model.setAttribute("opacity", 0.8);
    this.model.setAttribute("visible", false);
    this.model.setAttribute("width", 0.01);
    this.model.setAttribute("height", 0.01);
    this.model.setAttribute("depth", 1);
    this.model.setAttribute("material", { shader: "flat" });
    this.el.appendChild(this.model);

    // Temp vectors
    this.handPos1 = new THREE.Vector3();
    this.handPos2 = new THREE.Vector3();
    this.handPos = this.handPos1;
    this.handDir = new THREE.Vector3();
    this.hipOffset = new THREE.Vector3();
    this.forceResult = new THREE.Vector3();
    this.zeroResult = new THREE.Vector3(0, 0, 0);

    // State
    this.state = "off";
    this.shootingPercent = 0;
    this.shootingVelocityPercent = 0;
    this.currentLengthFactor = this.data.lengthFactor;
    this.currentReduceWallDirForce = this.data.reduceWallDirForce;
  },

  toggleWeb: function (hand, value) {
    // Release web
    if ((this.state === "on" || this.state === "shooting") && value === 0) {
      this.model.object3D.visible = false;
      this.state = "off";
      return;
    }

    // Shoot new web
    if (this.state === "off" && value > 0) {
      let raycaster = hand.components.raycaster;
      raycaster.data.direction = new THREE.Vector3(0, 0, -1);
      raycaster.raycaster.far = this.data.maxLength;
      raycaster.checkIntersections();
      if (raycaster.intersections.length) {
        this.state = "shooting";
        this.data.length =
          raycaster.intersections[0].distance * this.currentLengthFactor;
        this.el.object3D.position.copy(raycaster.intersections[0].point);
        this.wallNormal = raycaster.intersections[0].face.normal;
        this.shootingVelocityPercent =
          this.data.shootingVelocity / raycaster.intersections[0].distance;
        this.shootingPercent = 0;
        return "shoot-web";
      }
      if (value === 1) return "no-web";
    }
  },

  changeLengthFactor: function (value) {
    this.currentLengthFactor =
      this.data.lengthFactor - value * this.data.lengthFactorMaxBoost;
  },

  changeReduceWallDirForce: function (value) {
    this.currentReduceWallDirForce = this.data.reduceWallDirForce * (1 - value);
  },

  updateWeb: function (hand, rigPos, deltaSec) {
    if (this.state === "off") return this.zeroResult;

    // Update hand position
    this.handPos =
      this.handPos === this.handPos1 ? this.handPos2 : this.handPos1;
    this.handPos.copy(hand.object3D.position);
    this.handPos.add(rigPos);

    // Apply hip offset (shoot from hips)
    this.hipOffset.set(0, 1, 0); // adjust height for hip
    this.handPos.add(this.hipOffset);

    // Hand direction
    this.handDir.copy(this.handPos).normalize();

    // Shooting animation
    if (this.state === "shooting") {
      this.shootingPercent += this.shootingVelocityPercent * deltaSec;
      if (this.shootingPercent >= 1) {
        this.state = "on";
        this.shootingPercent = 1;
      }
    }

    // Draw the web
    this.drawWeb();

    // Shooting: no force yet
    if (this.state === "shooting") return this.zeroResult;

    // Apply pull force
    let deltaLen = this.handPos.length() - this.data.length;
    if (deltaLen > 0) {
      this.forceResult.copy(this.handPos).setLength(-1 * this.data.strength * deltaLen);
      let p = this.forceResult.clone().projectOnVector(this.wallNormal);
      this.forceResult.addScaledVector(p, -1 * this.currentReduceWallDirForce);
    } else {
      this.forceResult.set(0, 0, 0);
    }

    return this.forceResult;
  },

  drawWeb: function () {
    let obj = this.model.object3D;
    obj.position.copy(this.handPos);
    obj.position.multiplyScalar(
      1 - 0.5 * this.shootingPercent * this.shootingPercent
    );
    obj.scale.z = this.handPos.length() * this.shootingPercent * this.shootingPercent;
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.handDir);
    if (!this.model.object3D.visible) this.model.object3D.visible = true;
  }
});
