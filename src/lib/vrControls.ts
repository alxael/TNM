import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import type { SceneContext } from './sceneSetup';

// Module-level stub used when the host's real `XRWebGLBinding` constructor is
// broken (e.g. the Immersive Web Emulator). Its prototype intentionally lacks
// `createProjectionLayer`, which causes three.js to skip the projection-layer
// rendering path and use `XRWebGLLayer` instead.
function XRWebGLBindingStub(this: unknown) {
  throw new Error('XRWebGLBinding is unavailable in this environment');
}

export interface VRControlsOptions {
  /** Orbit radius around the scene center. */
  radius?: number;
  /** Eye height of the player above the scene center. */
  height?: number;
  /** Starting angle around the Y axis, in radians. */
  startAngle?: number;
  /** Radians per second at full thumbstick deflection. */
  rotateSpeed?: number;
  /** Thumbstick deadzone (0–1). */
  deadzone?: number;
  /** World point the player orbits around. Defaults to origin. */
  center?: THREE.Vector3;
  /**
   * Called when the user pulls a controller trigger. Receives the world-space
   * point where the controller's aim ray intersects the camera-facing plane
   * through the orbit center.
   */
  onSelect?: (worldPoint: THREE.Vector3) => void;
  /** Called when the user squeezes a controller grip. */
  onClear?: () => void;
  /** Maximum laser length in world units. Defaults to 200. */
  laserLength?: number;
}

export interface VRControls {
  /** Group containing the camera; positioned on the orbit circle. */
  dolly: THREE.Group;
  /** Call once per frame inside the XR animation loop. */
  update(delta: number): void;
  /** The DOM element the VRButton renders into. Append to your container. */
  button: HTMLElement;
  /** Tear down listeners, controllers, and remove the button. */
  dispose(): void;
}

/**
 * Sets up WebXR controls that lock the player to a horizontal circular orbit
 * around the scene center. Thumbstick X (either controller) rotates the orbit
 * angle. Height stays fixed — the user cannot dive under the attractor.
 */
export function setupVRControls(
  ctx: SceneContext,
  options: VRControlsOptions = {},
): VRControls {
  const center = options.center ?? new THREE.Vector3(0, 0, 0);
  const radius = options.radius ?? 50;
  const height = options.height ?? 15;
  const rotateSpeed = options.rotateSpeed ?? 1.2;
  const deadzone = options.deadzone ?? 0.15;
  const laserLength = options.laserLength ?? 200;
  const onSelect = options.onSelect;
  const onClear = options.onClear;
  let angle = options.startAngle ?? 0;

  // The dolly is the player's "feet" position. The camera is reparented onto
  // it ONLY while an XR session is active, so desktop OrbitControls keep
  // operating on a top-level camera with its original transform.
  const dolly = new THREE.Group();
  ctx.scene.add(dolly);

  // Remember the camera's pre-XR transform so we can restore it on exit.
  const savedCamPos = new THREE.Vector3();
  const savedCamQuat = new THREE.Quaternion();
  let savedCamParent: THREE.Object3D | null = null;

  function updateDollyTransform() {
    dolly.position.set(
      center.x + radius * Math.cos(angle),
      center.y + height,
      center.z + radius * Math.sin(angle),
    );
    // Face the scene center at eye level so "forward" in the headset looks at it.
    dolly.lookAt(center.x, center.y + height, center.z);
  }

  // Controllers — parented to the dolly so they orbit along with the player.
  const controllerModelFactory = new XRControllerModelFactory();
  const controllers: THREE.XRTargetRaySpace[] = [];
  const grips: THREE.XRGripSpace[] = [];
  const lasers: THREE.Line[] = [];

  // Shared aim-ray geometry: a unit line along -Z, scaled per-controller.
  const laserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const laserMat = new THREE.LineBasicMaterial({
    color: 0xff6030,
    transparent: true,
    opacity: 0.85,
  });

  // Reusable scratch objects to avoid per-frame / per-event allocations.
  const aimPlane = new THREE.Plane();
  const camDir = new THREE.Vector3();
  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  function fireSelectFromController(controller: THREE.XRTargetRaySpace) {
    if (!onSelect) return;
    // Plane through the orbit center, facing the user's head — matches the
    // desktop click handler so seed positions feel consistent.
    ctx.camera.getWorldDirection(camDir).negate();
    aimPlane.setFromNormalAndCoplanarPoint(camDir, center);

    controller.getWorldPosition(rayOrigin);
    rayDir.set(0, 0, -1).applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion()));
    raycaster.set(rayOrigin, rayDir);
    if (raycaster.ray.intersectPlane(aimPlane, hitPoint)) {
      onSelect(hitPoint.clone());
    }
  }

  for (let i = 0; i < 2; i++) {
    const controller = ctx.renderer.xr.getController(i);
    dolly.add(controller);
    controllers.push(controller);

    // Aim laser, drawn as a line along the controller's -Z (target ray) axis.
    const laser = new THREE.Line(laserGeo, laserMat);
    laser.scale.z = laserLength;
    laser.frustumCulled = false;
    controller.add(laser);
    lasers.push(laser);

    controller.addEventListener('selectstart', () => fireSelectFromController(controller));
    controller.addEventListener('squeezestart', () => {
      if (onClear) onClear();
    });

    const grip = ctx.renderer.xr.getControllerGrip(i);
    grip.add(controllerModelFactory.createControllerModel(grip));
    dolly.add(grip);
    grips.push(grip);
  }

  const onSessionStart = () => {
    savedCamParent = ctx.camera.parent;
    savedCamPos.copy(ctx.camera.position);
    savedCamQuat.copy(ctx.camera.quaternion);
    dolly.add(ctx.camera);
    ctx.camera.position.set(0, 0, 0);
    ctx.camera.quaternion.identity();
    updateDollyTransform();
  };

  const onSessionEnd = () => {
    if (savedCamParent) {
      savedCamParent.add(ctx.camera);
    } else {
      ctx.scene.add(ctx.camera);
    }
    ctx.camera.position.copy(savedCamPos);
    ctx.camera.quaternion.copy(savedCamQuat);
  };

  ctx.renderer.xr.addEventListener('sessionstart', onSessionStart);
  ctx.renderer.xr.addEventListener('sessionend', onSessionEnd);

  function update(delta: number) {
    if (!ctx.renderer.xr.isPresenting) return;
    const session = ctx.renderer.xr.getSession();
    if (!session) return;

    // Read the largest-magnitude thumbstick X across input sources.
    let stickX = 0;
    for (const source of session.inputSources) {
      const gp = source.gamepad;
      if (!gp || gp.axes.length < 4) continue;
      // Standard XR mapping: axes[2] is the thumbstick X on most controllers.
      const x = gp.axes[2];
      if (Math.abs(x) > Math.abs(stickX)) stickX = x;
    }

    if (Math.abs(stickX) > deadzone) {
      angle += stickX * rotateSpeed * delta;
      updateDollyTransform();
    }
  }

  const button = createVRButton(ctx.renderer);
  // Reset any inline positioning so the host container controls placement.
  button.style.position = 'static';
  button.style.left = '';
  button.style.right = '';
  button.style.bottom = '';
  button.style.top = '';
  button.style.transform = '';
  button.style.margin = '';

  function dispose() {
    ctx.renderer.xr.removeEventListener('sessionstart', onSessionStart);
    ctx.renderer.xr.removeEventListener('sessionend', onSessionEnd);
    for (const l of lasers) {
      if (l.parent) l.parent.remove(l);
    }
    laserGeo.dispose();
    laserMat.dispose();
    for (const c of controllers) dolly.remove(c);
    for (const g of grips) dolly.remove(g);
    if (ctx.camera.parent === dolly) dolly.remove(ctx.camera);
    ctx.scene.remove(dolly);
    if (button.parentElement) button.remove();
  }

  return { dolly, update, button, dispose };
}

/**
 * Minimal replacement for three's VRButton that requests an immersive-vr
 * session WITHOUT the 'layers' optional feature. The Immersive Web Emulator
 * (and some early standalone browsers) advertises 'layers' support but cannot
 * construct a valid XRWebGLBinding, which crashes three's WebXRManager.
 */
function createVRButton(renderer: THREE.WebGLRenderer): HTMLButtonElement {
  const button = document.createElement('button');
  button.style.padding = '12px 18px';
  button.style.border = '1px solid #fff';
  button.style.borderRadius = '4px';
  button.style.background = 'rgba(0,0,0,0.5)';
  button.style.color = '#fff';
  button.style.font = 'normal 13px sans-serif';
  button.style.textAlign = 'center';
  button.style.opacity = '0.9';
  button.style.outline = 'none';
  button.style.cursor = 'pointer';

  let currentSession: XRSession | null = null;

  // Detect environments where XRWebGLBinding is exposed but broken (notably
  // the Immersive Web Emulator). If the binding constructor throws on a valid
  // session, swap the global for a stub class that lacks `createProjectionLayer`
  // — three.js then takes the legacy `XRWebGLLayer` base-layer rendering path
  // and never instantiates the broken binding.
  const neutraliseBrokenXRWebGLBinding = (session: XRSession): void => {
    const g = globalThis as typeof globalThis & {
      XRWebGLBinding?: new (s: XRSession, gl: WebGLRenderingContext) => unknown;
      __origXRWebGLBinding?: unknown;
    };
    if (!g.XRWebGLBinding || g.__origXRWebGLBinding) return;
    try {
      const gl = renderer.getContext() as WebGLRenderingContext;
      new g.XRWebGLBinding(session, gl);
    } catch {
      g.__origXRWebGLBinding = g.XRWebGLBinding;
      // Swap in a stub WITHOUT `createProjectionLayer` on its prototype, so
      // three's `'createProjectionLayer' in XRWebGLBinding.prototype` check
      // returns false and the legacy base-layer path is taken.
      g.XRWebGLBinding = XRWebGLBindingStub as unknown as typeof g.XRWebGLBinding;
    }
  };

  const onSessionEnded = () => {
    currentSession?.removeEventListener('end', onSessionEnded);
    currentSession = null;
    button.textContent = 'ENTER VR';
  };

  const onSessionStarted = async (session: XRSession) => {
    neutraliseBrokenXRWebGLBinding(session);
    session.addEventListener('end', onSessionEnded);
    await renderer.xr.setSession(session);
    button.textContent = 'EXIT VR';
    currentSession = session;
  };

  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) {
    button.textContent = 'WEBXR NOT AVAILABLE';
    button.disabled = true;
    button.style.opacity = '0.5';
    button.style.cursor = 'auto';
    return button;
  }

  xr.isSessionSupported('immersive-vr').then((supported) => {
    if (!supported) {
      button.textContent = 'VR NOT SUPPORTED';
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'auto';
      return;
    }

    button.textContent = 'ENTER VR';
    button.onclick = () => {
      if (currentSession) {
        currentSession.end();
        return;
      }
      xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
      })
        .then(onSessionStarted)
        .catch((err) => {
          console.error('Failed to start XR session', err);
        });
    };
  });

  return button;
}
