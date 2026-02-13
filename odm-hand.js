// odm-hand.js
// Attack on Anime - Full VR Hand + Sword + ODM Hook Component

var MODEL_URLS = {
  left: "assets/odm_left_sword.glb",
  right: "assets/odm_right_sword.glb"
};

// Hand gestures
var ANIMATIONS = {
  open: "Open",
  point: "Point",
  fist: "Fist",
  hold: "Hook",
  thumbUp: "ThumbUp"
};

// Map animation to events
var EVENTS = {};
EVENTS[ANIMATIONS.fist] = "grip";
EVENTS[ANIMATIONS.thumbUp] = "boost";
EVENTS[ANIMATIONS.point] = "pointing";

AFRAME.registerComponent("odm-hand", {
  schema: { default: "left" },

  init: function () {
    var self = this;
    var el = this.el;

    this.gesture = ANIMATIONS.open;
    this.pressedButtons = {};
    this.touchedButtons = {};
    this.loader = new THREE.GLTFLoader();
    this.loader.setCrossOrigin("anonymous");

    // VR controller events
    this.onGripDown = () => self.handleButton("grip", "down");
    this.onGripUp = () => self.handleButton("grip", "up");
    this.onTriggerDown = () => self.handleButton("trigger", "down");
    this.onTriggerUp = () => self.handleButton("trigger", "up");
    this.onThumbstickDown = () => self.el.emit("hook-boost");

    // Listen to controller connect/disconnect
    el.addEventListener("controllerconnected", () => el.object3D.visible = true);
    el.addEventListener("controllerdisconnected", () => el.object3D.visible = false);

    // Add listeners
    this.addEventListeners();

    // Placeholder visible by default
    el.object3D.visible = true;
  },

  addEventListeners: function () {
    var el = this.el;
    el.addEventListener("gripdown", this.onGripDown);
    el.addEventListener("gripup", this.onGripUp);
    el.addEventListener("triggerdown", this.onTriggerDown);
    el.addEventListener("triggerup", this.onTriggerUp);
    el.addEventListener("thumbstickdown", this.onThumbstickDown);
    el.addEventListener("click", () => this.fireHook());
  },

  removeEventListeners: function () {
    var el = this.el;
    el.removeEventListener("gripdown", this.onGripDown);
    el.removeEventListener("gripup", this.onGripUp);
    el.removeEventListener("triggerdown", this.onTriggerDown);
    el.removeEventListener("triggerup", this.onTriggerUp);
    el.removeEventListener("thumbstickdown", this.onThumbstickDown);
    el.removeEventListener("click", () => this.fireHook());
  },

  update: function (prev) {
    var hand = this.data;
    var self = this;

    if (hand !== prev) {
      this.loader.load(MODEL_URLS[hand], function (gltf) {
        var mesh = gltf.scene.children[0];
        mesh.mixer = new THREE.AnimationMixer(mesh);
        self.clips = gltf.animations;
        self.el.setObject3D("mesh", mesh);
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, hand === "left" ? 45 : -45);
      });
    }
  },

  tick: function (time, delta) {
    var mesh = this.el.getObject3D("mesh");
    if (mesh && mesh.mixer) mesh.mixer.update(delta / 1000);
  },

  remove: function () {
    this.el.removeObject3D("mesh");
    this.removeEventListeners();
  },

  handleButton: function (button, evt) {
    // Track button state
    var isPressed = evt === "down";
    if (this.pressedButtons[button] === isPressed) return;
    this.pressedButtons[button] = isPressed;

    // Update gesture
    var lastGesture = this.gesture;
    this.gesture = this.determineGesture();
    if (lastGesture !== this.gesture) {
      this.animateGesture(this.gesture, lastGesture);
      this.emitGestureEvents(this.gesture, lastGesture);
    }

    // Shoot hook on trigger
    if (button === "trigger" && evt === "down") {
      this.fireHook();
    }
  },

  determineGesture: function () {
    var isGrip = this.pressedButtons["grip"];
    var isTrigger = this.pressedButtons["trigger"];
    if (isGrip && isTrigger) return ANIMATIONS.fist;
    if (isTrigger) return ANIMATIONS.hold;
    if (isGrip) return ANIMATIONS.thumbUp;
    return ANIMATIONS.open;
  },

  getClip: function (gesture) {
    if (!this.clips) return;
    for (var i = 0; i < this.clips.length; i++) {
      if (this.clips[i].name === gesture) return this.clips[i];
    }
  },

  animateGesture: function (gesture, lastGesture) {
    var mesh = this.el.getObject3D("mesh");
    if (!mesh || !mesh.mixer) return;

    var clip = this.getClip(gesture);
    var lastClip = this.getClip(lastGesture);

    var toAction = mesh.mixer.clipAction(clip);
    toAction.reset().play();
    if (lastClip && lastGesture !== gesture) {
      var fromAction = mesh.mixer.clipAction(lastClip);
      fromAction.crossFadeTo(toAction, 0.15, false);
    }
  },

  emitGestureEvents: function (gesture, lastGesture) {
    var el = this.el;
    var lastEvent = EVENTS[lastGesture];
    var newEvent = EVENTS[gesture];
    if (lastEvent) el.emit(lastEvent + "end");
    if (newEvent) el.emit(newEvent + "start");
  },

  fireHook: function () {
    var player = document.querySelector("[player]");
    if (!player) return;

    var handPos = new THREE.Vector3();
    var handDir = new THREE.Vector3(0, 0, -1);
    this.el.object3D.getWorldPosition(handPos);
    this.el.object3D.getWorldDirection(handDir);

    this.el.emit("hook-shoot", {
      start: player.object3D.position.clone(), // hip position
      target: handPos.clone().add(handDir.multiplyScalar(5)),
      hand: this.data
    });
  }
});
